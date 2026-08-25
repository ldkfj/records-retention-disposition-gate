import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { contractService } from '../services/contractService.ts';
import { sharedRpc } from '../services/rpcClient.ts';
import { walletService } from '../services/walletService.ts';
import { journalService } from '../services/journalService.ts';

describe('ContractService (Exact ABI Parity, Return ID Decoding, Error Rejections & Reads)', () => {
  const dummyContract = '0x1234567890123456789012345678901234567890';
  const dummyAccount = '0x9999999999999999999999999999999999999999';

  beforeEach(() => {
    sharedRpc.clearCache();
    walletService.disconnect();
    journalService.clearLock();
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    journalService.clearLock();
    vi.restoreAllMocks();
  });

  it('binds exact contract ABI methods matching Python source and excludes upgrade', () => {
    // Assert exact ABI write methods exposed
    expect(typeof contractService.createProfile).toBe('function');
    expect(typeof contractService.freezeProfile).toBe('function');
    expect(typeof contractService.assessMapping).toBe('function');
    expect(typeof contractService.retryUnresolved).toBe('function');
    expect(typeof contractService.acceptMapping).toBe('function');
    expect(typeof contractService.requestDispositionReview).toBe('function');
    expect(typeof contractService.decideReview).toBe('function');
    expect(typeof contractService.placeAuditHold).toBe('function');
    expect(typeof contractService.clearAuditHold).toBe('function');
    expect(typeof contractService.supersedeProfile).toBe('function');

    // Assert exact view methods exposed
    expect(typeof contractService.getProfile).toBe('function');
    expect(typeof contractService.getProfileCount).toBe('function');
    expect(typeof contractService.getProfileIdByNonce).toBe('function');
    expect(typeof contractService.isNonceUsed).toBe('function');
    expect(typeof contractService.getMapping).toBe('function');
    expect(typeof contractService.getReview).toBe('function');
    expect(typeof contractService.getEvent).toBe('function');
    expect(typeof contractService.getEventCount).toBe('function');
    expect(typeof contractService.getSourceMetadata).toBe('function');
    expect(typeof contractService.getAuditor).toBe('function');
    expect(typeof contractService.getEffectiveStatus).toBe('function');

    // Upgrade must NOT be exposed to judges/users
    expect((contractService as any).upgrade).toBeUndefined();
  });

  it('reads profile, mapping, review, is_nonce_used, and source metadata correctly', async () => {
    vi.spyOn(contractService, 'getConfiguredContractAddress').mockReturnValue(dummyContract);
    const rawClient = sharedRpc.getRawClient();
    vi.spyOn(rawClient, 'readContract').mockImplementation(async (args: any) => {
      const functionName = args?.functionName;
      if (functionName === 'get_profile_count') return '1';
      if (functionName === 'is_nonce_used') return true;
      if (functionName === 'get_profile') {
        return {
          profile_id: 1,
          client_nonce: 'FY24-001',
          template: 'PROCUREMENT_WORKING_FILES',
          attributes_json: '{"record_copy_status":"OFFICIAL_RECORD"}',
          creation_date: '2024-01-01',
          cutoff_date: '2024-06-01',
          grs_family: 'GRS_1_1',
          custodian: dummyAccount,
          officer: '0x8888888888888888888888888888888888888888',
          state: 'FROZEN',
          mapping_attempts: 1,
          last_attempt_timestamp: '2024-06-01T12:00:00Z',
          successor_id: 0,
          audit_hold_active: false,
          audit_hold_reason: '',
          audit_hold_timestamp: '',
          fingerprint: 'fp123',
        };
      }
      if (functionName === 'get_mapping') {
        return {
          profile_id: 1,
          outcome: 'TEMPORARY_ITEM_MATCH',
          schedule_number: 'GRS 1.1',
          schedule_title: 'Financial Management and Reporting Records',
          schedule_version: 'Transmittal 31 / April 2020',
          pdf_url: 'https://www.archives.gov/files/records-mgmt/grs/grs01-1.pdf',
          pdf_fingerprint: 'pdf_fp',
          item: '010',
          disposition_authority: 'DAA-GRS-2013-0003-0001',
          page: '3',
          is_included: true,
          is_excluded: false,
          disposition_class: 'TEMPORARY',
          cutoff_trigger: 'FINAL_PAYMENT_OR_CANCELLATION',
          retention_months: 72,
          consequential_fingerprint: 'cq_fp',
          reason_code: 'UNIQUE_MATCH',
          earliest_review_date: '2030-06-01',
          is_accepted: false,
          accepted_by: '',
          accepted_timestamp: '',
        };
      }
      if (functionName === 'get_review') {
        return {
          profile_id: 1,
          review_requested: false,
          requested_by: '',
          requested_timestamp: '',
          is_decided: false,
          action: 'NONE',
          reason_code: '',
          decided_by: '',
          decided_timestamp: '',
        };
      }
      if (functionName === 'get_source_metadata') {
        return {
          template: 'PROCUREMENT_WORKING_FILES',
          grs_family: 'GRS_1_1',
          schedule_number: 'GRS 1.1',
          schedule_title: 'Financial Management and Reporting Records',
          schedule_version: 'Transmittal 31 / April 2020',
          pdf_url: 'https://www.archives.gov/files/records-mgmt/grs/grs01-1.pdf',
        };
      }
      return null;
    });

    const count = await contractService.getProfileCount(true);
    expect(count).toBe(1);

    const isUsed = await contractService.isNonceUsed(dummyAccount, 'FY24-001', true);
    expect(isUsed).toBe(true);

    const profile = await contractService.getProfile(1, true);
    expect(profile.client_nonce).toBe('FY24-001');
    expect(profile.state).toBe('FROZEN');

    const mapping = await contractService.getMapping(1, true);
    expect(mapping.item).toBe('010');
    expect(mapping.retention_months).toBe(72);

    const review = await contractService.getReview(1, true);
    expect(review.is_decided).toBe(false);

    const meta = await contractService.getSourceMetadata('PROCUREMENT_WORKING_FILES', true);
    expect(meta.schedule_number).toBe('GRS 1.1');
  });

  it('executes createProfile with return ID decoding and double cross-check verification', async () => {
    const mockRequest = vi.fn().mockImplementation(async ({ method }) => {
      if (method === 'eth_requestAccounts') return [dummyAccount];
      if (method === 'eth_chainId') return '0xf22f';
      return null;
    });

    const mockProvider = {
      info: { uuid: 'uuid-test', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
      provider: { request: mockRequest, on: vi.fn(), removeListener: vi.fn() },
    };
    await walletService.connectProvider(mockProvider as any);
    vi.spyOn(contractService, 'getConfiguredContractAddress').mockReturnValue(dummyContract);

    const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash123');
    vi.spyOn(contractService, 'createWriteClient').mockReturnValue({
      writeContract: mockWriteContract,
    } as any);

    // Mock waitForFinalizedTransaction returning decoded profile ID = 5 in receipt
    vi.spyOn(contractService, 'waitForFinalizedTransaction').mockResolvedValue({
      status: 'FINALIZED',
      executionResult: 'FINISHED_WITH_RETURN',
      returnData: 5,
    });

    // Mock cross-check get_profile_id_by_nonce returning 5
    vi.spyOn(contractService, 'getProfileIdByNonce').mockResolvedValue(5);
    vi.spyOn(contractService, 'getProfile').mockResolvedValue({
      profile_id: 5,
      client_nonce: 'FY24-001',
    } as any);

    const stepChanges: string[] = [];
    const res = await contractService.createProfile(
      'FY24-001',
      'PROCUREMENT_WORKING_FILES',
      '{"record_copy_status":"OFFICIAL_RECORD"}',
      '2024-01-01',
      '2024-06-01',
      'GRS_1_1',
      '0x8888888888888888888888888888888888888888',
      (step) => stepChanges.push(step)
    );

    expect(res.profileId).toBe(5);
    expect(res.txHash).toBe('0xtxhash123');
    expect(stepChanges).toEqual(['SIGNING', 'SUBMITTED', 'CONSENSUS_POLLING', 'READBACK', 'SUCCESS']);
  });

  it('fails hard when createProfile return ID does not match nonce lookup', async () => {
    const mockRequest = vi.fn().mockImplementation(async ({ method }) => {
      if (method === 'eth_requestAccounts') return [dummyAccount];
      if (method === 'eth_chainId') return '0xf22f';
      return null;
    });

    const mockProvider = {
      info: { uuid: 'uuid-test', name: 'MetaMask', icon: '', rdns: 'io.metamask' },
      provider: { request: mockRequest, on: vi.fn(), removeListener: vi.fn() },
    };
    await walletService.connectProvider(mockProvider as any);
    vi.spyOn(contractService, 'getConfiguredContractAddress').mockReturnValue(dummyContract);

    vi.spyOn(contractService, 'createWriteClient').mockReturnValue({
      writeContract: vi.fn().mockResolvedValue('0xtxhashmismatch'),
    } as any);

    // Return ID in receipt is 5, but nonce lookup returns 6
    vi.spyOn(contractService, 'waitForFinalizedTransaction').mockResolvedValue({
      status: 'FINALIZED',
      executionResult: 'FINISHED_WITH_RETURN',
      returnData: 5,
    });
    vi.spyOn(contractService, 'getProfileIdByNonce').mockResolvedValue(6);

    await expect(
      contractService.createProfile(
        'FY24-001',
        'PROCUREMENT_WORKING_FILES',
        '{"record_copy_status":"OFFICIAL_RECORD"}',
        '2024-01-01',
        '2024-06-01',
        'GRS_1_1',
        '0x8888888888888888888888888888888888888888'
      )
    ).rejects.toThrow(/CREATE_RETURN_ID_MISMATCH/);
  });

  it('rejects hostile, errored, or non-finalized receipts in waitForFinalizedTransaction', async () => {
    const rawClient = sharedRpc.getRawClient();

    // 1. FINISHED_WITH_ERROR
    vi.spyOn(rawClient, 'getTransaction').mockResolvedValueOnce({
      hash: '0xerrtx',
      status: 7,
      statusName: 'FINALIZED',
      txExecutionResult: 1,
      txExecutionResultName: 'FINISHED_WITH_ERROR',
      resultName: 'AGREE',
    });

    await expect(
      contractService.waitForFinalizedTransaction('0xerrtx')
    ).rejects.toThrow(/TRANSACTION_EXECUTION_FAILED/);

    // 2. Contradictory / Disagreement consensus
    vi.spyOn(rawClient, 'getTransaction').mockResolvedValueOnce({
      hash: '0xdistx',
      status: 7,
      statusName: 'FINALIZED',
      txExecutionResult: 0,
      txExecutionResultName: 'FINISHED_WITH_RETURN',
      resultName: 'DISAGREE',
    });

    await expect(
      contractService.waitForFinalizedTransaction('0xdistx')
    ).rejects.toThrow(/CONSENSUS_DISAGREEMENT/);

    // 3. Numeric status 6 is UNDETERMINED, never FINALIZED. Abort proves it keeps polling.
    vi.spyOn(rawClient, 'getTransaction').mockResolvedValue({
      hash: '0xundetermined',
      status: 6,
      txExecutionResult: 1,
      txExecutionResultName: 'FINISHED_WITH_RETURN',
      resultName: 'AGREE',
    });
    const abortController = new AbortController();
    setTimeout(() => abortController.abort(), 0);
    await expect(
      contractService.waitForFinalizedTransaction('0xundetermined', 10_000, abortController.signal)
    ).rejects.toThrow(/OPERATION_ABORTED/);

    // 4. Finalized execution without an affirmative consensus result fails closed.
    vi.spyOn(rawClient, 'getTransaction').mockResolvedValueOnce({
      hash: '0xmissing-consensus',
      status: 7,
      statusName: 'FINALIZED',
      txExecutionResult: 1,
      txExecutionResultName: 'FINISHED_WITH_RETURN',
    });
    await expect(
      contractService.waitForFinalizedTransaction('0xmissing-consensus')
    ).rejects.toThrow(/CONSENSUS_DISAGREEMENT/);
  });
});
