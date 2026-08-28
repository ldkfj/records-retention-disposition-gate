import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  contractService,
  normalizeProfileRecord,
  normalizeMappingRecord,
  normalizeReviewRecord,
  createEmptyMappingRecord,
  createEmptyReviewRecord,
} from '../services/contractService.ts';
import { sharedRpc } from '../services/rpcClient.ts';
import { walletService } from '../services/walletService.ts';
import { journalService } from '../services/journalService.ts';

describe('ContractService (Exact ABI Parity, Live Schema Normalization & Pipeline Verification)', () => {
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

  describe('Live Schema Normalization Helpers', () => {
    it('normalizes live on-chain profile dictionary with field aliases', () => {
      // Live on-chain profile shape returns `owner`, `superseded_by`, and `audit_hold`
      const rawLiveProfile = {
        profile_id: 1,
        client_nonce: 'FY24-PROC-001',
        template: 'PROCUREMENT_WORKING_FILES',
        attributes_json: '{"record_copy_status":"OFFICIAL_RECORD"}',
        creation_date: '2024-01-01',
        cutoff_date: '2024-06-01',
        grs_family: 'GRS_1_1',
        owner: '0x34b92E6553eaCA11A00A9d86d75d8a7881779D78',
        officer: '0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1',
        state: 'MAPPED',
        is_frozen: true,
        mapping_attempts: 1,
        mapping_outcome: 'TEMPORARY_ITEM_MATCH',
        is_mapping_accepted: true,
        last_attempt_timestamp: '2024-06-01T12:00:00Z',
        superseded_by: 0,
        supersedes: 0,
        audit_hold: false,
        audit_hold_reason: '',
        audit_hold_timestamp: '',
        fingerprint: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        review_requested: false,
        review_requested_at: '',
        review_decided: false,
        review_action: '',
        review_reason: '',
      };

      const normalized = normalizeProfileRecord(rawLiveProfile);
      expect(normalized.profile_id).toBe(1);
      expect(normalized.custodian).toBe('0x34b92E6553eaCA11A00A9d86d75d8a7881779D78');
      expect(normalized.owner).toBe('0x34b92E6553eaCA11A00A9d86d75d8a7881779D78');
      expect(normalized.officer).toBe('0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1');
      expect(normalized.successor_id).toBe(0);
      expect(normalized.audit_hold_active).toBe(false);
      expect(normalized.is_mapping_accepted).toBe(true);
      expect(normalized.mapping_attempts).toBe(1);
    });

    it('normalizes live on-chain mapping dictionary with field aliases', () => {
      // Live on-chain mapping returns `item_number`, `page_or_section`, `source_url`, `accepted_at`
      const rawLiveMapping = {
        profile_id: 1,
        attempt: 1,
        outcome: 'TEMPORARY_ITEM_MATCH',
        schedule_number: 'GRS 1.1',
        schedule_title: 'Financial Management and Reporting Records',
        schedule_version: 'Transmittal 31 / April 2020',
        source_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
        pdf_fingerprint: '3b0ac8c2810a9a13a7c6a992ac4ad87f7a7da09f7a7ea391be0ff3cc6cff87aa',
        item_number: '010',
        disposition_authority: 'DAA-GRS-2013-0003-0001',
        page_or_section: '3',
        is_included: true,
        is_excluded: false,
        disposition_class: 'TEMPORARY',
        cutoff_trigger: 'FINAL_PAYMENT_OR_CANCELLATION',
        retention_months: 72,
        consequential_fingerprint: 'a6c8e312f10b0d35...',
        reason_code: 'EXACT_MATCH',
        earliest_review_date: '2030-06-01',
        assessed_at: '2024-06-01T12:00:00Z',
        is_accepted: true,
        accepted_at: '2024-06-02T09:30:00Z',
      };

      const normalized = normalizeMappingRecord(rawLiveMapping);
      expect(normalized.profile_id).toBe(1);
      expect(normalized.item).toBe('010');
      expect(normalized.item_number).toBe('010');
      expect(normalized.page).toBe('3');
      expect(normalized.page_or_section).toBe('3');
      expect(normalized.pdf_url).toBe('https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv');
      expect(normalized.source_url).toBe('https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv');
      expect(normalized.accepted_timestamp).toBe('2024-06-02T09:30:00Z');
      expect(normalized.accepted_by).toBe('');
      expect(normalized.is_accepted).toBe(true);
    });

    it('normalizes live on-chain review dictionary with field aliases', () => {
      // Live on-chain review returns `requested_at`, `decided`, `decided_at`
      const rawLiveReview = {
        profile_id: 2,
        epoch: 1,
        requested_at: '2030-06-01T08:00:00Z',
        decided: true,
        decided_at: '2030-06-02T10:00:00Z',
        officer: '0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1',
        action: 'AUTHORIZE_DISPOSITION',
        reason_code: 'OFFICER_APPROVED',
        audit_hold_active: false,
      };

      const normalized = normalizeReviewRecord(rawLiveReview);
      expect(normalized.profile_id).toBe(2);
      expect(normalized.review_requested).toBe(true);
      expect(normalized.requested_timestamp).toBe('2030-06-01T08:00:00Z');
      expect(normalized.is_decided).toBe(true);
      expect(normalized.decided).toBe(true);
      expect(normalized.decided_timestamp).toBe('2030-06-02T10:00:00Z');
      expect(normalized.action).toBe('AUTHORIZE_DISPOSITION');
      expect(normalized.requested_by).toBe('');
      expect(normalized.decided_by).toBe('');
    });

    it('creates accurate explicit empty mapping and review records', () => {
      const emptyMapping = createEmptyMappingRecord(3);
      expect(emptyMapping.profile_id).toBe(3);
      expect(emptyMapping.outcome).toBe('UNRESOLVED');
      expect(emptyMapping.is_accepted).toBe(false);
      expect(emptyMapping.schedule_number).toBe('');

      const emptyReview = createEmptyReviewRecord(3);
      expect(emptyReview.profile_id).toBe(3);
      expect(emptyReview.review_requested).toBe(false);
      expect(emptyReview.is_decided).toBe(false);
      expect(emptyReview.action).toBe('NONE');
    });

    it('throws a typed error when raw response is null, undefined, or non-object', () => {
      expect(() => normalizeProfileRecord(null)).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeProfileRecord(undefined)).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeProfileRecord('not-valid-json')).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);

      expect(() => normalizeMappingRecord(null)).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeMappingRecord(undefined)).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);

      expect(() => normalizeReviewRecord(null)).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeReviewRecord(undefined)).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
    });

    it('rejects incomplete, mistyped, conflicting, and unknown-enum records without defaults', () => {
      const validProfile = {
        profile_id: 1,
        client_nonce: 'FY24-PROC-001',
        template: 'PROCUREMENT_WORKING_FILES',
        attributes_json: '{"record_copy_status":"OFFICIAL_RECORD"}',
        creation_date: '2024-01-01',
        cutoff_date: '2024-06-01',
        grs_family: 'GRS_1_1',
        owner: '0x1111111111111111111111111111111111111111',
        officer: '0x2222222222222222222222222222222222222222',
        state: 'MAPPED',
        is_frozen: true,
        mapping_attempts: 1,
        mapping_outcome: 'TEMPORARY_ITEM_MATCH',
        is_mapping_accepted: true,
        audit_hold: false,
        audit_hold_reason: '',
        review_requested: false,
        review_requested_at: '',
        review_decided: false,
        review_action: '',
        review_reason: '',
        superseded_by: 0,
        supersedes: 0,
        fingerprint: 'profile-fingerprint',
      };
      const validMapping = {
        profile_id: 1,
        attempt: 1,
        outcome: 'TEMPORARY_ITEM_MATCH',
        schedule_number: 'GRS 1.1',
        schedule_title: 'Financial Management and Reporting Records',
        schedule_version: 'Transmittal 31 / April 2020',
        source_url: 'https://www.archives.gov/source.csv',
        pdf_fingerprint: 'pdf-fingerprint',
        item_number: '010',
        disposition_authority: 'DAA-GRS-2013-0003-0001',
        page_or_section: '3',
        is_included: true,
        is_excluded: false,
        disposition_class: 'TEMPORARY',
        cutoff_trigger: 'FINAL_PAYMENT_OR_CANCELLATION',
        retention_months: 72,
        earliest_review_date: '2030-06-01',
        consequential_fingerprint: 'consequential-fingerprint',
        reason_code: 'EXACT_MATCH',
        assessed_at: '2024-06-01T12:00:00Z',
        is_accepted: true,
        accepted_at: '2024-06-02T09:30:00Z',
      };
      const validReview = {
        profile_id: 1,
        epoch: 1,
        requested_at: '2030-06-01T08:00:00Z',
        decided: true,
        decided_at: '2030-06-02T10:00:00Z',
        officer: '0x2222222222222222222222222222222222222222',
        action: 'AUTHORIZE_DISPOSITION',
        reason_code: 'OFFICER_APPROVED',
        audit_hold_active: false,
      };

      expect(() => normalizeProfileRecord({})).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeMappingRecord({})).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeReviewRecord({})).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeProfileRecord({ ...validProfile, is_frozen: 'true' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeProfileRecord({ ...validProfile, state: 'NOT_A_STATE' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeProfileRecord({ ...validProfile, attributes_json: '{' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeProfileRecord({ ...validProfile, owner: 'owner-a', custodian: 'owner-b' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeMappingRecord({ ...validMapping, outcome: 'NOT_A_RESULT' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeMappingRecord({ ...validMapping, retention_months: '72' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeMappingRecord({ ...validMapping, is_accepted: true, accepted_at: '' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeReviewRecord({ ...validReview, decided: 'true' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
      expect(() => normalizeReviewRecord({ ...validReview, action: 'NOT_A_REVIEW_ACTION' })).toThrow(/INVALID_CONTRACT_READ_RESPONSE/);
    });
  });

  it('reads profile, mapping, review, is_nonce_used, and source metadata through normalized public boundary', async () => {
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
          owner: dummyAccount,
          officer: '0x8888888888888888888888888888888888888888',
          state: 'FROZEN',
          is_frozen: true,
          mapping_attempts: 1,
          mapping_outcome: 'TEMPORARY_ITEM_MATCH',
          is_mapping_accepted: false,
          last_attempt_timestamp: '2024-06-01T12:00:00Z',
          superseded_by: 0,
          supersedes: 0,
          audit_hold: false,
          audit_hold_reason: '',
          audit_hold_timestamp: '',
          fingerprint: 'fp123',
          review_requested: false,
          review_requested_at: '',
          review_decided: false,
          review_action: '',
          review_reason: '',
        };
      }
      if (functionName === 'get_mapping') {
        return {
          profile_id: 1,
          attempt: 1,
          outcome: 'TEMPORARY_ITEM_MATCH',
          schedule_number: 'GRS 1.1',
          schedule_title: 'Financial Management and Reporting Records',
          schedule_version: 'Transmittal 31 / April 2020',
          source_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
          pdf_fingerprint: 'pdf_fp',
          item_number: '010',
          disposition_authority: 'DAA-GRS-2013-0003-0001',
          page_or_section: '3',
          is_included: true,
          is_excluded: false,
          disposition_class: 'TEMPORARY',
          cutoff_trigger: 'FINAL_PAYMENT_OR_CANCELLATION',
          retention_months: 72,
          consequential_fingerprint: 'cq_fp',
          reason_code: 'UNIQUE_MATCH',
          earliest_review_date: '2030-06-01',
          assessed_at: '2024-06-01T12:00:00Z',
          is_accepted: false,
          accepted_at: '',
        };
      }
      if (functionName === 'get_review') {
        return {
          profile_id: 1,
          epoch: 1,
          review_requested: true,
          requested_at: '2024-06-01T08:00:00Z',
          decided: false,
          decided_at: '',
          officer: '0x8888888888888888888888888888888888888888',
          action: 'NONE',
          reason_code: '',
          audit_hold_active: false,
        };
      }
      if (functionName === 'get_source_metadata') {
        return {
          template: 'PROCUREMENT_WORKING_FILES',
          grs_family: 'GRS_1_1',
          schedule_number: 'GRS 1.1',
          schedule_title: 'Financial Management and Reporting Records',
          schedule_version: 'Transmittal 31 / April 2020',
          source_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
          csv_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
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
    expect(profile.custodian).toBe(dummyAccount);
    expect(profile.state).toBe('FROZEN');

    const mapping = await contractService.getMapping(1, true);
    expect(mapping.item).toBe('010');
    expect(mapping.retention_months).toBe(72);
    expect(mapping.pdf_url).toBe('https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv');

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
