import { PendingOperation } from '../types/domain.ts';
import { sharedRpc } from './rpcClient.ts';

const STORAGE_KEY = 'rrdg_pending_operations_v2';
const STORAGE_PROBE_KEY = 'rrdg_storage_probe_check';

export class JournalService {
  private static instance: JournalService;
  private writeLock: string | null = null;
  private signingLock: string | null = null;
  private inMemoryFallback: Map<string, PendingOperation> = new Map();

  public static getInstance(): JournalService {
    if (!JournalService.instance) {
      JournalService.instance = new JournalService();
    }
    return JournalService.instance;
  }

  // --- STORAGE PROBING & FAIL-CLOSED CAPABILITY CHECK ---

  public probeStorage(): boolean {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage || !window.localStorage) {
        return false;
      }
      const probeVal = `probe-${Date.now()}`;
      sessionStorage.setItem(STORAGE_PROBE_KEY, probeVal);
      const readVal = sessionStorage.getItem(STORAGE_PROBE_KEY);
      sessionStorage.removeItem(STORAGE_PROBE_KEY);

      localStorage.setItem(STORAGE_PROBE_KEY, probeVal);
      const readLocal = localStorage.getItem(STORAGE_PROBE_KEY);
      localStorage.removeItem(STORAGE_PROBE_KEY);

      return readVal === probeVal && readLocal === probeVal;
    } catch {
      return false;
    }
  }

  // --- SINGLE-FLIGHT VOLATILE WRITE LOCKING ---

  public acquireWriteLock(operationId: string): void {
    if (this.writeLock && this.writeLock !== operationId) {
      throw new Error(
        `CONCURRENT_WRITE_LOCKED: Another transaction operation (${this.writeLock}) is actively being processed. Duplicate submission rejected.`
      );
    }
    this.writeLock = operationId;
  }

  public acquireSigningLock(operationId: string): void {
    if ((this.signingLock && this.signingLock !== operationId) || this.writeLock) {
      throw new Error('CONCURRENT_WRITE_LOCKED: Another transaction is signing or already submitted.');
    }
    this.signingLock = operationId;
  }

  public releaseWriteLock(operationId?: string): void {
    if (!operationId || this.writeLock === operationId) {
      this.writeLock = null;
    }
    if (!operationId || this.signingLock === operationId) {
      this.signingLock = null;
    }
  }

  public isLocked(): boolean {
    return this.writeLock !== null || this.signingLock !== null;
  }

  public clearLock(): void {
    this.writeLock = null;
    this.signingLock = null;
    this.inMemoryFallback.clear();
  }

  public getPendingOperations(): PendingOperation[] {
    const map = new Map<string, PendingOperation>();

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: PendingOperation[] = JSON.parse(raw);
        for (const op of parsed) {
          map.set(op.id, op);
        }
      }
    } catch {
      // Storage read failed, fallback to in-memory
    }

    // Merge in-memory fallback items
    for (const [id, op] of this.inMemoryFallback.entries()) {
      map.set(id, op);
    }

    return Array.from(map.values());
  }

  public savePendingOperation(op: PendingOperation): void {
    if (!this.probeStorage()) {
      throw new Error('STORAGE_CAPABILITY_PROBE_FAILED: Storage is disabled, restricted, or quota exceeded.');
    }
    this.acquireSigningLock(op.id);
    const list = this.getPendingOperations().filter((item) => item.id !== op.id);
    list.push(op);
    this.persist(list);
  }

  public updateHash(id: string, txHash: string): void {
    // Acquire/re-assert volatile single-flight lock immediately upon receiving hash
    if (this.signingLock === id) this.signingLock = null;
    this.acquireWriteLock(id);

    const list = this.getPendingOperations();
    const target = list.find((item) => item.id === id);
    if (target) {
      target.txHash = txHash;
      target.status = 'SUBMITTED';
    } else {
      const newOp: PendingOperation = {
        id,
        type: 'unknown',
        timestamp: Date.now(),
        params: {},
        txHash,
        status: 'SUBMITTED',
      };
      list.push(newOp);
    }

    // Always keep volatile in-memory copy in case persistence fails
    const updatedOp = target || list[list.length - 1];
    this.inMemoryFallback.set(id, updatedOp);

    try {
      this.persist(list);
    } catch (persistErr: any) {
      // Storage failed, but DO NOT lose hash and DO NOT resubmit!
      // In-memory fallback and lock remain active.
      console.warn(
        `STORAGE_PERSIST_FAILED: Transaction was submitted on-chain (hash: ${txHash}) but failed to persist to browser storage. Retaining in-memory hash.`,
        persistErr
      );
    }
  }

  public updateStatus(id: string, status: PendingOperation['status'], error?: string): void {
    const list = this.getPendingOperations();
    const target = list.find((item) => item.id === id);
    if (target) {
      target.status = status;
      if (error) (target as any).error = error;
      this.inMemoryFallback.set(id, target);
      try {
        this.persist(list);
      } catch {
        // In-memory updated
      }
    }
  }

  public removeOperation(id: string): void {
    this.releaseWriteLock(id);
    this.inMemoryFallback.delete(id);
    const list = this.getPendingOperations().filter((item) => item.id !== id);
    try {
      this.persist(list);
    } catch {
      // In-memory removed
    }
  }

  private persist(list: PendingOperation[]): void {
    try {
      const serialized = JSON.stringify(list, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
      sessionStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      throw new Error(`STORAGE_PERSIST_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Bounded reload reconciliation against RPC receipts using genlayer-js SDK
  public async reconcilePendingOperations(
    onProgress?: (reconciled: number, total: number) => void,
    verifyEffect?: (operation: PendingOperation) => Promise<boolean>,
    signal?: AbortSignal
  ): Promise<{
    reconciled: PendingOperation[];
    finalized: string[];
    failed: string[];
    stillPending: string[];
    unsubmittedDrafts: string[];
  }> {
    const pending = this.getPendingOperations();
    const finalized: string[] = [];
    const failed: string[] = [];
    const stillPending: string[] = [];
    const unsubmittedDrafts: string[] = [];
    const client = sharedRpc.getRawClient();

    let count = 0;
    for (const op of pending) {
      if (signal?.aborted) {
        throw new Error('OPERATION_ABORTED');
      }

      count++;
      onProgress?.(count, pending.length);

      if (!op.txHash) {
        // Do NOT silently delete or claim chain failure! Keep in a safe deliberate retry draft state
        unsubmittedDrafts.push(op.id);
        continue;
      }

      try {
        // Must use getTransaction from genlayer-js SDK (not nonexistent getTransactionReceipt)
        const tx = await client.getTransaction({ hash: op.txHash });
        if (tx) {
          const status = (tx.statusName || tx.transactionStatusName || tx.status || '').toString().toUpperCase();
          const execRes = (tx.txExecutionResultName || tx.execution_result || tx.executionResult || '').toString().toUpperCase();

          if (status === 'FINALIZED' || status === '7') {
            const consensus = (tx.resultName || '').toString().toUpperCase();
            const isSuccess =
              (execRes === 'FINISHED_WITH_RETURN' || tx.txExecutionResult === 1) &&
              (consensus === 'AGREE' || consensus === 'MAJORITY_AGREE');

            if (isSuccess) {
              if (verifyEffect) {
                const verified = await verifyEffect(op);
                if (verified) {
                  this.removeOperation(op.id);
                  finalized.push(op.id);
                  continue;
                }
              } else {
                this.removeOperation(op.id);
                finalized.push(op.id);
                continue;
              }
            } else {
              this.removeOperation(op.id);
              failed.push(op.id);
              continue;
            }
          }

          if (status === 'CANCELED' || status === 'ERROR' || status === 'REVERTED') {
            this.removeOperation(op.id);
            failed.push(op.id);
            continue;
          }
        }
        stillPending.push(op.id);
      } catch (err: any) {
        if (err?.message && err.message.includes('not found')) {
          this.removeOperation(op.id);
          failed.push(op.id);
        } else {
          stillPending.push(op.id);
        }
      }
    }

    return {
      reconciled: pending,
      finalized,
      failed,
      stillPending,
      unsubmittedDrafts,
    };
  }
}

export const journalService = JournalService.getInstance();
