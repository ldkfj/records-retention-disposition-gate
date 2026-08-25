import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sharedRpc } from '../services/rpcClient.ts';

describe('RpcClient (Read Cache, In-Flight Dedupe, 429 Retry-After & Shared Cooldown)', () => {
  beforeEach(() => {
    sharedRpc.clearCache();
    sharedRpc.resetJourneyMetrics();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('caches readContract calls for 10 seconds and tracks call counts per journey', async () => {
    const rawClient = sharedRpc.getRawClient();
    const readSpy = vi.spyOn(rawClient, 'readContract').mockResolvedValue('32');

    // First call: cache miss
    const res1 = await sharedRpc.readContract('get_profile_count', [], 'public_lookup', false, '0x1111111111111111111111111111111111111111');
    expect(res1).toBe('32');
    expect(readSpy).toHaveBeenCalledTimes(1);

    // Second call: cache hit within 10s
    const res2 = await sharedRpc.readContract('get_profile_count', [], 'public_lookup', false, '0x1111111111111111111111111111111111111111');
    expect(res2).toBe('32');
    expect(readSpy).toHaveBeenCalledTimes(1);

    // Skip cache explicitly
    const res3 = await sharedRpc.readContract('get_profile_count', [], 'public_lookup', true, '0x1111111111111111111111111111111111111111');
    expect(res3).toBe('32');
    expect(readSpy).toHaveBeenCalledTimes(2);

    const metrics = sharedRpc.getJourneyMetrics();
    expect(metrics.journeys['public_lookup']).toBe(2);
  });

  it('deduplicates simultaneous in-flight readContract promises', async () => {
    const rawClient = sharedRpc.getRawClient();
    let resolveRead: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveRead = resolve;
    });

    const readSpy = vi.spyOn(rawClient, 'readContract').mockImplementation(() => pendingPromise);

    const p1 = sharedRpc.readContract('get_profile', [1], 'dossier', false, '0x1111111111111111111111111111111111111111');
    const p2 = sharedRpc.readContract('get_profile', [1], 'dossier', false, '0x1111111111111111111111111111111111111111');
    const p3 = sharedRpc.readContract('get_profile', [1], 'dossier', false, '0x1111111111111111111111111111111111111111');

    resolveRead!({ profile_id: 1, state: 'FROZEN' });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toEqual({ profile_id: 1, state: 'FROZEN' });
    expect(r2).toEqual({ profile_id: 1, state: 'FROZEN' });
    expect(r3).toEqual({ profile_id: 1, state: 'FROZEN' });
    expect(readSpy).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache entries by method name', async () => {
    const rawClient = sharedRpc.getRawClient();
    const readSpy = vi.spyOn(rawClient, 'readContract').mockResolvedValue('10');

    await sharedRpc.readContract('get_profile_count', [], 'public_lookup', false, '0x1111111111111111111111111111111111111111');
    expect(readSpy).toHaveBeenCalledTimes(1);

    sharedRpc.invalidateMethod('get_profile_count');

    await sharedRpc.readContract('get_profile_count', [], 'public_lookup', false, '0x1111111111111111111111111111111111111111');
    expect(readSpy).toHaveBeenCalledTimes(2);
  });

  it('parses Retry-After header and sets shared cooldown across calls', async () => {
    const rawClient = sharedRpc.getRawClient();
    let callCount = 0;

    vi.spyOn(rawClient, 'readContract').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        const err: any = new Error('Too Many Requests');
        err.status = 429;
        err.headers = { 'retry-after': '1' }; // 1 second
        throw err;
      }
      return 'DATA_AFTER_RETRY';
    });

    const res = await sharedRpc.readContract('get_auditor', [], 'auditor_view', false, '0x1111111111111111111111111111111111111111');
    expect(res).toBe('DATA_AFTER_RETRY');
    expect(callCount).toBe(2);
  });

  it('aborts rpc execution when AbortSignal is triggered', async () => {
    const rawClient = sharedRpc.getRawClient();
    vi.spyOn(rawClient, 'readContract').mockImplementation(() => new Promise((r) => setTimeout(r, 2000)));

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);

    await expect(
      sharedRpc.readContract('get_profile_count', [], 'public_lookup', true, '0x1111111111111111111111111111111111111111', controller.signal)
    ).rejects.toThrow(/ABORTED/);
  });
});
