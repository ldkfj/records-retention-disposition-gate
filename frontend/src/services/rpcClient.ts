import { createClient } from 'genlayer-js';
import { CONTRACT_ADDRESS, STUDIONET_CONFIG } from '../config/chain.ts';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

export class RpcClient {
  private static instance: RpcClient;
  private client: any;
  private cache: Map<string, CacheEntry> = new Map();
  private inFlight: Map<string, Promise<any>> = new Map();
  private sharedCooldownUntil = 0;
  private journeyCallCounts: Record<string, number> = {};

  private constructor() {
    this.client = createClient({
      endpoint: STUDIONET_CONFIG.rpcUrl,
    });
  }

  public static getInstance(): RpcClient {
    if (!RpcClient.instance) {
      RpcClient.instance = new RpcClient();
    }
    return RpcClient.instance;
  }

  public getRawClient(): any {
    return this.client;
  }

  public clearCache(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.sharedCooldownUntil = 0;
  }

  public invalidateMethod(methodName: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${methodName}:`)) {
        this.cache.delete(key);
      }
    }
  }

  public invalidateAddress(address: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${address}:`)) {
        this.cache.delete(key);
      }
    }
  }

  public setSharedCooldown(durationMs: number): void {
    this.sharedCooldownUntil = Math.max(this.sharedCooldownUntil, Date.now() + durationMs);
  }

  public getSharedCooldownUntil(): number {
    return this.sharedCooldownUntil;
  }

  public trackJourneyCall(journey: string): void {
    this.journeyCallCounts[journey] = (this.journeyCallCounts[journey] || 0) + 1;
  }

  public getJourneyMetrics(): { journeys: Record<string, number>; total: number } {
    const total = Object.values(this.journeyCallCounts).reduce((a, b) => a + b, 0);
    return {
      journeys: { ...this.journeyCallCounts },
      total,
    };
  }

  public resetJourneyMetrics(): void {
    this.journeyCallCounts = {};
  }

  public parseRetryAfter(err: any): number | null {
    if (!err) return null;
    try {
      // 1. Axios / Fetch response headers
      const headers = err.response?.headers || err.headers;
      if (headers) {
        const rawHeader =
          typeof headers.get === 'function'
            ? headers.get('retry-after') || headers.get('Retry-After')
            : headers['retry-after'] || headers['Retry-After'];

        if (rawHeader) {
          const sec = Number(rawHeader);
          if (!isNaN(sec) && sec >= 0) {
            return sec * 1000;
          }
          const dateMs = new Date(rawHeader).getTime();
          if (!isNaN(dateMs)) {
            return Math.max(0, dateMs - Date.now());
          }
        }
      }

      // 2. Error object custom retryAfter property
      if (err.retryAfter !== undefined) {
        const sec = Number(err.retryAfter);
        if (!isNaN(sec) && sec >= 0) return sec * 1000;
      }

      // 3. String message parsing (e.g. "Retry-After: 5" or "retry after 5s")
      const msg = String(err.message || err);
      const match = msg.match(/retry[- ]after[:\s]+(\d+)/i);
      if (match && match[1]) {
        const sec = Number(match[1]);
        if (!isNaN(sec)) {
          return sec * 1000;
        }
      }
    } catch {
      // ignore parse failures
    }
    return null;
  }

  public async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    signal?: AbortSignal
  ): Promise<T> {
    let attempt = 0;

    while (attempt < maxRetries) {
      if (signal?.aborted) {
        throw new Error('OPERATION_ABORTED');
      }

      // Wait if shared cooldown is currently active
      const now = Date.now();
      if (this.sharedCooldownUntil > now) {
        const waitMs = this.sharedCooldownUntil - now;
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(resolve, waitMs);
          if (signal) {
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timeout);
                reject(new Error('OPERATION_ABORTED'));
              },
              { once: true }
            );
          }
        });
      }

      if (signal?.aborted) {
        throw new Error('OPERATION_ABORTED');
      }

      try {
        if (!signal) {
          return await fn();
        }

        const abortPromise = new Promise<never>((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('OPERATION_ABORTED')), { once: true });
        });

        return await Promise.race([fn(), abortPromise]);
      } catch (err: any) {
        attempt++;
        if (signal?.aborted || err?.message === 'OPERATION_ABORTED') {
          throw new Error('OPERATION_ABORTED');
        }

        const msg = String(err?.message || err);
        const isRateLimit =
          err?.status === 429 ||
          err?.statusCode === 429 ||
          err?.response?.status === 429 ||
          msg.includes('429') ||
          msg.toLowerCase().includes('rate limit');
        const isServerError =
          err?.status >= 500 ||
          err?.statusCode >= 500 ||
          err?.response?.status >= 500 ||
          msg.includes('500') ||
          msg.includes('502') ||
          msg.includes('503') ||
          msg.includes('504');

        if ((isRateLimit || isServerError) && attempt < maxRetries) {
          let delayMs = this.parseRetryAfter(err);
          if (delayMs === null) {
            // Bounded exponential backoff + jitter
            delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 200), 10000);
          } else {
            delayMs = Math.min(delayMs, 30000);
          }

          this.setSharedCooldown(delayMs);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, delayMs);
            if (signal) {
              signal.addEventListener(
                'abort',
                () => {
                  clearTimeout(timeout);
                  reject(new Error('OPERATION_ABORTED'));
                },
                { once: true }
              );
            }
          });
          continue;
        }
        throw err;
      }
    }
    throw new Error('RPC_MAX_RETRIES_EXCEEDED');
  }

  private generateCacheKey(method: string, args: any[], address = CONTRACT_ADDRESS): string {
    const normArgs = JSON.stringify(args || []);
    return `${STUDIONET_CONFIG.chainId}:${address}:${method}:${normArgs}`;
  }

  public async readContract(
    method: string,
    args: any[] = [],
    journey = 'public_read',
    skipCache = false,
    address = CONTRACT_ADDRESS,
    signal?: AbortSignal
  ): Promise<any> {
    const targetAddress = address || CONTRACT_ADDRESS;
    if (!targetAddress) {
      throw new Error('CONTRACT_NOT_CONFIGURED');
    }

    const key = this.generateCacheKey(method, args, targetAddress);
    const now = Date.now();

    if (!skipCache) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > now) {
        return cached.data;
      }
    }

    // In-flight deduplication
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const fetchPromise = this.executeWithRetry(
      async () => {
        this.trackJourneyCall(journey);
        const res = await this.client.readContract({
          address: targetAddress,
          functionName: method,
          args,
        });
        return res;
      },
      3,
      signal
    )
      .then((data) => {
        this.cache.set(key, { data, expiresAt: Date.now() + 10_000 });
        this.inFlight.delete(key);
        return data;
      })
      .catch((err) => {
        this.inFlight.delete(key);
        throw err;
      });

    this.inFlight.set(key, fetchPromise);
    return fetchPromise;
  }

  // Authoritative transaction inspection via SDK getTransaction
  public async getTransaction(hash: string, signal?: AbortSignal): Promise<any> {
    return this.executeWithRetry(
      async () => {
        return await this.client.getTransaction({ hash });
      },
      3,
      signal
    );
  }

  // Authoritative trace inspection via SDK debugTraceTransaction
  public async debugTraceTransaction(hash: string, options?: any, signal?: AbortSignal): Promise<any> {
    return this.executeWithRetry(
      async () => {
        if (typeof this.client.debugTraceTransaction === 'function') {
          return await this.client.debugTraceTransaction({ hash, ...options });
        }
        return null;
      },
      3,
      signal
    );
  }
}

export const sharedRpc = RpcClient.getInstance();
