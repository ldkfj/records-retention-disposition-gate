import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { journalService } from '../services/journalService.ts';
import { sharedRpc } from '../services/rpcClient.ts';

describe('JournalService (Durable Storage Probing, Single-Flight Locking & Reconciliation)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    journalService.clearLock();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    journalService.clearLock();
    vi.restoreAllMocks();
  });

  it('probes storage capabilities (set/get/remove) before saving operations', () => {
    expect(journalService.probeStorage()).toBe(true);
  });

  it('fails closed when storage probing fails before signing', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(journalService.probeStorage()).toBe(false);

    const op = {
      id: 'op-fail-probe',
      type: 'create_profile' as const,
      timestamp: Date.now(),
      params: { clientNonce: 'NONCE-FAIL' },
      status: 'PRE_SIGN' as const,
    };

    expect(() => journalService.savePendingOperation(op)).toThrow(/STORAGE_CAPABILITY_PROBE_FAILED/);
    setItemSpy.mockRestore();
  });

  it('acquires single-flight volatile lock and prevents concurrent conflicting writes', () => {
    const op1 = {
      id: 'op-1',
      type: 'create_profile' as const,
      timestamp: Date.now(),
      params: { clientNonce: 'NONCE-1' },
      status: 'PRE_SIGN' as const,
    };

    journalService.savePendingOperation(op1);

    const op2 = {
      id: 'op-2',
      type: 'freeze_profile' as const,
      timestamp: Date.now(),
      params: { profileId: 1 },
      status: 'PRE_SIGN' as const,
    };

    expect(() => journalService.savePendingOperation(op2)).toThrow(/CONCURRENT_WRITE_LOCKED/);

    journalService.removeOperation('op-1');
    expect(() => journalService.savePendingOperation(op2)).not.toThrow();
    journalService.removeOperation('op-2');
  });

  it('handles storage persistence failure after hash by keeping volatile lock & in-memory hash', () => {
    const op = {
      id: 'op-persist-fail',
      type: 'create_profile' as const,
      timestamp: Date.now(),
      params: { clientNonce: 'NONCE-PF' },
      status: 'PRE_SIGN' as const,
    };

    journalService.savePendingOperation(op);

    // Mock storage write failure during updateHash
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage write failed after hash');
    });

    // updateHash should not throw, should retain in memory and preserve lock
    journalService.updateHash('op-persist-fail', '0xpersisthash');

    const pending = journalService.getPendingOperations();
    expect(pending.some((p) => p.txHash === '0xpersisthash')).toBe(true);

    setItemSpy.mockRestore();

    // Verify lock is still active, preventing duplicate submission
    const opDuplicate = {
      id: 'op-duplicate',
      type: 'create_profile' as const,
      timestamp: Date.now(),
      params: { clientNonce: 'NONCE-PF' },
      status: 'PRE_SIGN' as const,
    };
    expect(() => journalService.savePendingOperation(opDuplicate)).toThrow(/CONCURRENT_WRITE_LOCKED/);

    journalService.removeOperation('op-persist-fail');
  });

  it('updates transaction hash and reconciles finalized transactions via getTransaction', async () => {
    const op = {
      id: 'op-recon-1',
      type: 'create_profile' as const,
      timestamp: Date.now(),
      params: { clientNonce: 'NONCE-REC' },
      status: 'PRE_SIGN' as const,
    };

    journalService.savePendingOperation(op);
    journalService.updateHash('op-recon-1', '0xhash123');

    const ops = journalService.getPendingOperations();
    expect(ops[0].txHash).toBe('0xhash123');
    expect(ops[0].status).toBe('SUBMITTED');

    const rawClient = sharedRpc.getRawClient();
    vi.spyOn(rawClient, 'getTransaction').mockResolvedValue({
      hash: '0xhash123',
      status: 7, // FINALIZED
      statusName: 'FINALIZED',
      txExecutionResult: 0,
      txExecutionResultName: 'FINISHED_WITH_RETURN',
      resultName: 'AGREE',
    });

    const verifyMock = vi.fn().mockResolvedValue(true);
    const result = await journalService.reconcilePendingOperations(undefined, verifyMock);

    expect(result.finalized).toContain('op-recon-1');
    expect(journalService.getPendingOperations().length).toBe(0);
    expect(verifyMock).toHaveBeenCalled();
  });

  it('preserves unsubmitted draft operations without losing them as chain failures', async () => {
    const draftOp = {
      id: 'op-draft-1',
      type: 'create_profile' as const,
      timestamp: Date.now(),
      params: { clientNonce: 'DRAFT-NONCE' },
      status: 'PRE_SIGN' as const,
    };
    journalService.savePendingOperation(draftOp);

    const result = await journalService.reconcilePendingOperations();
    expect(result.unsubmittedDrafts).toContain('op-draft-1');
    expect(result.failed.length).toBe(0);
  });

  it('aborts reconciliation when AbortSignal is triggered', async () => {
    const op = {
      id: 'op-abort',
      type: 'create_profile' as const,
      timestamp: Date.now(),
      params: { clientNonce: 'NONCE-ABORT' },
      status: 'PRE_SIGN' as const,
    };
    journalService.savePendingOperation(op);
    journalService.updateHash('op-abort', '0xhashabort');

    const controller = new AbortController();
    controller.abort();

    await expect(
      journalService.reconcilePendingOperations(undefined, undefined, controller.signal)
    ).rejects.toThrow(/OPERATION_ABORTED/);
  });
});
