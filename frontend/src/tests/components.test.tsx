import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Header } from '../components/Header.tsx';
import { DeploymentBanner } from '../components/DeploymentBanner.tsx';
import { WalletModal } from '../components/WalletModal.tsx';
import { TransactionTracker } from '../components/TransactionTracker.tsx';
import { PublicLookup } from '../components/PublicLookup.tsx';
import { CustodianWorkbench } from '../components/CustodianWorkbench.tsx';
import { OfficerWorkbench } from '../components/OfficerWorkbench.tsx';
import { AuditorWorkbench } from '../components/AuditorWorkbench.tsx';
import { SourceEvidenceView } from '../components/SourceEvidenceView.tsx';
import { EventTimeline } from '../components/EventTimeline.tsx';
import { walletService } from '../services/walletService.ts';
import { contractService } from '../services/contractService.ts';
import { sharedRpc } from '../services/rpcClient.ts';
import { journalService } from '../services/journalService.ts';

// Configure act environment for React 19 testing in JSDOM
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const setInputValue = (input: HTMLInputElement, value: string) => {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const setSelectValue = (select: HTMLSelectElement, value: string) => {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('UI Components & Screen Journeys', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    walletService.disconnect();
    journalService.clearLock();
    sharedRpc.clearCache();
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    if (root && container) {
      await act(async () => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    journalService.clearLock();
    vi.restoreAllMocks();
  });

  const renderComponent = async (node: React.ReactNode) => {
    await act(async () => {
      root?.render(node);
    });
  };

  it('renders DeploymentBanner when contract address is missing', async () => {
    vi.spyOn(contractService, 'getConfiguredContractAddress').mockReturnValue('');
    await renderComponent(<DeploymentBanner />);
    expect(container?.textContent).toContain('Configuration Required: VITE_CONTRACT_ADDRESS');
  });

  it('renders Header with federal title, network badge, and wallet connect button', async () => {
    const mockOpenModal = vi.fn();
    const mockDisconnect = vi.fn();

    await renderComponent(
      <Header
        walletState={walletService.getState()}
        onOpenWalletModal={mockOpenModal}
        onDisconnect={mockDisconnect}
      />
    );

    expect(container?.textContent).toContain('Records Retention Disposition Gate');
    expect(container?.textContent).toContain('GenLayer Studionet');

    const connectBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Connect Wallet')
    );
    expect(connectBtn).toBeDefined();

    await act(async () => {
      connectBtn?.click();
    });
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
  });

  it('renders WalletModal with accessibility attributes and handles Escape key', async () => {
    const handleClose = vi.fn();
    await renderComponent(<WalletModal isOpen={true} onClose={handleClose} />);

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeDefined();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(document.body.textContent).toContain('Connect Supported Wallet');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders TransactionTracker showing multi-step lifecycle states', async () => {
    const handleClear = vi.fn();
    const handleRetry = vi.fn();

    await renderComponent(
      <TransactionTracker
        step="SIGNING"
        txHash={null}
        error={null}
        detail={null}
        onClear={handleClear}
        onRetry={handleRetry}
      />
    );

    expect(container?.textContent).toContain('Transaction Status: SIGNING');

    await renderComponent(
      <TransactionTracker
        step="ERROR"
        txHash="0xfailedtx"
        error="TRANSACTION_REVERTED"
        detail={null}
        onClear={handleClear}
        onRetry={handleRetry}
      />
    );

    expect(container?.textContent).toContain('TRANSACTION_REVERTED');
    const retryBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Retry Action')
    );
    expect(retryBtn).toBeDefined();

    await act(async () => {
      retryBtn?.click();
    });
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders PublicLookup search and displays profile registry and detailed dossier', async () => {
    vi.spyOn(contractService, 'getProfileCount').mockResolvedValue(1);
    vi.spyOn(contractService, 'getProfile').mockResolvedValue({
      profile_id: 1,
      client_nonce: 'FY24-TEST-001',
      template: 'PROCUREMENT_WORKING_FILES',
      attributes_json: '{"record_copy_status":"OFFICIAL_RECORD"}',
      creation_date: '2024-01-01',
      cutoff_date: '2024-06-01',
      grs_family: 'GRS_1_1',
      custodian: '0x1111111111111111111111111111111111111111',
      officer: '0x2222222222222222222222222222222222222222',
      state: 'MAPPED',
      mapping_attempts: 1,
      last_attempt_timestamp: '2024-06-01T12:00:00Z',
      successor_id: 0,
      audit_hold_active: false,
      audit_hold_reason: '',
      audit_hold_timestamp: '',
      fingerprint: 'test_fp',
    });
    vi.spyOn(contractService, 'getMapping').mockResolvedValue({
      profile_id: 1,
      outcome: 'TEMPORARY_ITEM_MATCH',
      schedule_number: 'GRS 1.1',
      schedule_title: 'Financial Management and Reporting Records',
      schedule_version: 'Transmittal 31 / April 2020',
      pdf_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
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
    });
    vi.spyOn(contractService, 'getReview').mockResolvedValue({
      profile_id: 1,
      review_requested: false,
      requested_by: '',
      requested_timestamp: '',
      is_decided: false,
      action: 'NONE',
      reason_code: '',
      decided_by: '',
      decided_timestamp: '',
    });
    vi.spyOn(contractService, 'getEffectiveStatus').mockResolvedValue('RETAINING');
    vi.spyOn(contractService, 'getEventCount').mockResolvedValue(18);
    vi.spyOn(contractService, 'getEvent').mockImplementation(async (id) => ({
      event_id: id,
      profile_id: id === 18 ? 1 : 2,
      event_type: id === 18 ? 'MAPPING_ASSESSED' : 'OTHER_PROFILE_EVENT',
      actor: '0x1111111111111111111111111111111111111111',
      details: id === 18 ? 'outcome=TEMPORARY_ITEM_MATCH;attempt=1' : '',
      timestamp: '2024-06-01T12:00:00Z',
    }));

    await renderComponent(<PublicLookup />);

    // Wait for registry to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container?.textContent).toContain('FY24-TEST-001');

    const viewDossierBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('View Dossier')
    );
    expect(viewDossierBtn).toBeDefined();

    await act(async () => {
      viewDossierBtn?.click();
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container?.textContent).toContain('Record Series Disposition Dossier: Profile #1');
    expect(container?.textContent).toContain('TEMPORARY_ITEM_MATCH');
    expect(container?.textContent).toContain('View Official NARA Source CSV');
    expect(container?.textContent).toContain('Immutable Audit Event History (1 Events)');
    expect(container?.textContent).toContain('MAPPING_ASSESSED');
  });

  it('renders CustodianWorkbench with closed attribute options and creates profile', async () => {
    const handleStepChange = vi.fn();

    vi.spyOn(walletService, 'getState').mockReturnValue({
      connected: true,
      address: '0x1111111111111111111111111111111111111111',
      chainId: 61999,
      provider: {},
      providerName: 'MetaMask',
      isCorrectChain: true,
    });

    vi.spyOn(contractService, 'getProfileCount').mockResolvedValue(0);
    const createSpy = vi.spyOn(contractService, 'createProfile').mockResolvedValue({
      profileId: 1,
      txHash: '0xcreatetx',
    });

    await renderComponent(<CustodianWorkbench onStepChange={handleStepChange} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const nonceInput = container?.querySelector('#form-nonce') as HTMLInputElement;
    expect(nonceInput).toBeDefined();
    await act(async () => {
      setInputValue(nonceInput, 'FY24-CUST-001');
    });

    const creationInput = container?.querySelector('#form-creation-date') as HTMLInputElement;
    expect(creationInput).toBeDefined();
    await act(async () => {
      setInputValue(creationInput, '2024-01-01');
    });

    const cutoffInput = container?.querySelector('#form-cutoff-date') as HTMLInputElement;
    expect(cutoffInput).toBeDefined();
    await act(async () => {
      setInputValue(cutoffInput, '2024-06-01');
    });

    const officerInput = container?.querySelector('#form-officer') as HTMLInputElement;
    expect(officerInput).toBeDefined();
    await act(async () => {
      setInputValue(officerInput, '0x2222222222222222222222222222222222222222');
    });

    const form = container?.querySelector('form');
    expect(form).toBeDefined();

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    expect(createSpy).toHaveBeenCalledWith(
      'FY24-CUST-001',
      'PROCUREMENT_WORKING_FILES',
      expect.stringContaining('"record_copy_status":"OFFICIAL_RECORD"'),
      '2024-01-01',
      '2024-06-01',
      'GRS_1_1',
      '0x2222222222222222222222222222222222222222',
      handleStepChange
    );
  });

  it('submits the contract-compatible MICROPURCHASE value through the creation path', async () => {
    const handleStepChange = vi.fn();

    vi.spyOn(walletService, 'getState').mockReturnValue({
      connected: true,
      address: '0x1111111111111111111111111111111111111111',
      chainId: 61999,
      provider: {},
      providerName: 'MetaMask',
      isCorrectChain: true,
    });
    vi.spyOn(contractService, 'getProfileCount').mockResolvedValue(0);
    const createSpy = vi.spyOn(contractService, 'createProfile').mockResolvedValue({
      profileId: 1,
      txHash: '0xmicropurchasetx',
    });

    await renderComponent(<CustodianWorkbench onStepChange={handleStepChange} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    setInputValue(container?.querySelector('#form-nonce') as HTMLInputElement, 'MICRO-CUST-001');
    setInputValue(container?.querySelector('#form-officer') as HTMLInputElement, '0x2222222222222222222222222222222222222222');
    setSelectValue(container?.querySelector('#attr-proc-type') as HTMLSelectElement, 'MICROPURCHASE');

    await act(async () => {
      container?.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });

    expect(createSpy).toHaveBeenCalledWith(
      'MICRO-CUST-001',
      'PROCUREMENT_WORKING_FILES',
      expect.stringContaining('"procurement_type":"MICROPURCHASE"'),
      expect.any(String),
      expect.any(String),
      'GRS_1_1',
      '0x2222222222222222222222222222222222222222',
      handleStepChange
    );
  });

  it('renders OfficerWorkbench with acceptance and disposition review controls', async () => {
    const handleStepChange = vi.fn();
    const officerAddr = '0x2222222222222222222222222222222222222222';

    vi.spyOn(walletService, 'getState').mockReturnValue({
      connected: true,
      address: officerAddr,
      chainId: 61999,
      provider: {},
      providerName: 'MetaMask',
      isCorrectChain: true,
    });

    vi.spyOn(contractService, 'getProfileCount').mockResolvedValue(1);
    vi.spyOn(contractService, 'getProfile').mockResolvedValue({
      profile_id: 1,
      client_nonce: 'FY24-OFFICER-001',
      template: 'PROCUREMENT_WORKING_FILES',
      attributes_json: '{"record_copy_status":"OFFICIAL_RECORD"}',
      creation_date: '2024-01-01',
      cutoff_date: '2024-06-01',
      grs_family: 'GRS_1_1',
      custodian: '0x1111111111111111111111111111111111111111',
      officer: officerAddr,
      state: 'MAPPED',
      mapping_attempts: 1,
      last_attempt_timestamp: '2024-06-01T12:00:00Z',
      successor_id: 0,
      audit_hold_active: false,
      audit_hold_reason: '',
      audit_hold_timestamp: '',
      fingerprint: 'fp_off',
    });
    vi.spyOn(contractService, 'getMapping').mockResolvedValue({
      profile_id: 1,
      outcome: 'TEMPORARY_ITEM_MATCH',
      schedule_number: 'GRS 1.1',
      schedule_title: 'Financial Management',
      schedule_version: 'Transmittal 31 / April 2020',
      pdf_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
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
      reason_code: 'MATCH',
      earliest_review_date: '2030-06-01',
      is_accepted: true,
      accepted_by: officerAddr,
      accepted_timestamp: '2024-06-02',
    });
    vi.spyOn(contractService, 'getReview').mockResolvedValue({
      profile_id: 1,
      review_requested: true,
      requested_by: '0x1111111111111111111111111111111111111111',
      requested_timestamp: '2030-06-01',
      is_decided: false,
      action: 'NONE',
      reason_code: '',
      decided_by: '',
      decided_timestamp: '',
    });
    vi.spyOn(contractService, 'getEffectiveStatus').mockResolvedValue('REVIEW_REQUESTED');

    const decideSpy = vi.spyOn(contractService, 'decideReview').mockResolvedValue({ txHash: '0xdecidetx' });

    await renderComponent(<OfficerWorkbench onStepChange={handleStepChange} selectedProfileId={1} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container?.textContent).toContain('FY24-OFFICER-001');
    expect(container?.textContent).toContain('Mapping Already Accepted');

    const submitBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Submit Formal Disposition Decision')
    );
    expect(submitBtn).toBeDefined();

    await act(async () => {
      submitBtn?.click();
    });

    expect(decideSpy).toHaveBeenCalledWith(
      1,
      'AUTHORIZE_DISPOSITION',
      'OFFICER_APPROVED',
      handleStepChange
    );
  });

  it('renders AuditorWorkbench with hold placement and clearing', async () => {
    const handleStepChange = vi.fn();
    const auditorAddr = '0x3333333333333333333333333333333333333333';

    vi.spyOn(walletService, 'getState').mockReturnValue({
      connected: true,
      address: auditorAddr,
      chainId: 61999,
      provider: {},
      providerName: 'MetaMask',
      isCorrectChain: true,
    });

    vi.spyOn(contractService, 'getAuditor').mockResolvedValue(auditorAddr);
    vi.spyOn(contractService, 'getProfileCount').mockResolvedValue(1);
    vi.spyOn(contractService, 'getProfile').mockResolvedValue({
      profile_id: 1,
      client_nonce: 'FY24-AUDIT-001',
      template: 'PROCUREMENT_WORKING_FILES',
      attributes_json: '{"record_copy_status":"OFFICIAL_RECORD"}',
      creation_date: '2024-01-01',
      cutoff_date: '2024-06-01',
      grs_family: 'GRS_1_1',
      custodian: '0x1111111111111111111111111111111111111111',
      officer: '0x2222222222222222222222222222222222222222',
      state: 'FROZEN',
      mapping_attempts: 0,
      last_attempt_timestamp: '',
      successor_id: 0,
      audit_hold_active: false,
      audit_hold_reason: '',
      audit_hold_timestamp: '',
      fingerprint: 'fp_aud',
    });

    const holdSpy = vi.spyOn(contractService, 'placeAuditHold').mockResolvedValue({ txHash: '0xholdtx' });

    await renderComponent(<AuditorWorkbench onStepChange={handleStepChange} selectedProfileId={1} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container?.textContent).toContain('FY24-AUDIT-001');

    const placeHoldBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Place Audit Hold')
    );
    expect(placeHoldBtn).toBeDefined();

    await act(async () => {
      placeHoldBtn?.click();
    });

    expect(holdSpy).toHaveBeenCalledWith(
      1,
      'PENDING_AUDIT_INVESTIGATION',
      handleStepChange
    );
  });

  it('renders SourceEvidenceView with authoritative NARA CSV and provenance PDF URLs', async () => {
    vi.spyOn(contractService, 'getSourceMetadata').mockImplementation(async (tpl) => {
      if (tpl === 'PROCUREMENT_WORKING_FILES') {
        return {
          template: tpl,
          grs_family: 'GRS_1_1',
          schedule_number: 'GRS 1.1',
          schedule_title: 'Financial Management and Reporting Records',
          schedule_version: 'Transmittal 31 / April 2020',
          source_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
          csv_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
          pdf_url: 'https://www.archives.gov/files/records-mgmt/grs/grs01-1.pdf',
        };
      }
      return {
        template: tpl,
        grs_family: 'GRS_5_1',
        schedule_number: 'GRS 5.1',
        schedule_title: 'Common Office Records',
        schedule_version: 'Transmittal 28 / July 2017',
        source_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
        csv_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
        pdf_url: 'https://www.archives.gov/files/records-mgmt/grs/grs05-1.pdf',
      };
    });

    await renderComponent(<SourceEvidenceView />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container?.textContent).toContain('GRS 1.1: Financial Management and Reporting Records');
    expect(container?.textContent).toContain('GRS 5.1: Common Office Records');
    expect(container?.textContent).toContain('Transmittal 31 / April 2020');
    expect(container?.textContent).toContain('Transmittal 28 / July 2017');
    expect(container?.textContent).toContain('Authoritative NARA CSV URL:');
    expect(container?.textContent).toContain('Provenance PDF (reference only):');
    expect(container?.textContent).not.toContain('validators independently fetch and verify allowlisted official National Archives and Records Administration (NARA) schedule PDFs');
  });

  it('renders EventTimeline with filterable table', async () => {
    vi.spyOn(contractService, 'getEventCount').mockResolvedValue(2);
    vi.spyOn(contractService, 'getEvent').mockImplementation(async (id) => {
      if (id === 1) {
        return {
          event_id: 1,
          profile_id: 1,
          event_type: 'PROFILE_CREATED',
          actor: '0x1111111111111111111111111111111111111111',
          details: 'Nonce: FY24-001',
          timestamp: '2024-01-01T00:00:00Z',
        };
      }
      return {
        event_id: 2,
        profile_id: 1,
        event_type: 'MAPPING_ACCEPTED',
        actor: '0x2222222222222222222222222222222222222222',
        details: 'Accepted Item 010',
        timestamp: '2024-01-02T00:00:00Z',
      };
    });

    await renderComponent(<EventTimeline />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(container?.textContent).toContain('PROFILE_CREATED');
    expect(container?.textContent).toContain('MAPPING_ACCEPTED');
  });

  describe('Live Contract Schema Multi-Profile Robustness (Profile 1, 2, and 3)', () => {
    const rawProfile1 = {
      profile_id: 1,
      client_nonce: 'LIVE-P1-001',
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
      fingerprint: 'fp1',
      review_requested: false,
      review_requested_at: '',
      review_decided: false,
      review_action: '',
      review_reason: '',
    };

    const rawMapping1 = {
      profile_id: 1,
      attempt: 1,
      outcome: 'TEMPORARY_ITEM_MATCH',
      schedule_number: 'GRS 1.1',
      schedule_title: 'Financial Management and Reporting Records',
      schedule_version: 'Transmittal 31 / April 2020',
      source_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
      pdf_fingerprint: 'pdf_fp1',
      item_number: '010',
      disposition_authority: 'DAA-GRS-2013-0003-0001',
      page_or_section: '3',
      is_included: true,
      is_excluded: false,
      disposition_class: 'TEMPORARY',
      cutoff_trigger: 'FINAL_PAYMENT_OR_CANCELLATION',
      retention_months: 72,
      consequential_fingerprint: 'cq_fp1',
      reason_code: 'UNIQUE_MATCH',
      earliest_review_date: '2030-06-01',
      assessed_at: '2024-06-01T12:00:00Z',
      is_accepted: true,
      accepted_at: '2024-06-02T10:00:00Z',
    };

    const rawProfile2 = {
      profile_id: 2,
      client_nonce: 'live2-office-001',
      template: 'ADMINISTRATIVE_POLICY_FILES',
      attributes_json: '{"policy_scope":"OFFICE_UNIT_LEVEL"}',
      creation_date: '2020-01-01',
      cutoff_date: '2020-06-01',
      grs_family: 'GRS_5_1',
      owner: '0x34b92E6553eaCA11A00A9d86d75d8a7881779D78',
      officer: '0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1',
      state: 'SUPERSEDED',
      is_frozen: true,
      mapping_attempts: 2,
      mapping_outcome: 'TEMPORARY_ITEM_MATCH',
      is_mapping_accepted: true,
      last_attempt_timestamp: '2020-06-01T12:00:00Z',
      superseded_by: 3,
      supersedes: 0,
      audit_hold: false,
      audit_hold_reason: '',
      audit_hold_timestamp: '',
      fingerprint: 'fp2',
      review_requested: true,
      review_requested_at: '2026-06-01T08:00:00Z',
      review_decided: true,
      review_action: 'AUTHORIZE_DISPOSITION',
      review_reason: 'RETENTION_COMPLETE_AND_NO_ACTIVE_HOLD',
    };

    const rawMapping2 = {
      profile_id: 2,
      attempt: 2,
      outcome: 'TEMPORARY_ITEM_MATCH',
      schedule_number: 'GRS 5.1',
      schedule_title: 'Common Office Records',
      schedule_version: 'Transmittal 28 / July 2017',
      source_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
      pdf_fingerprint: 'pdf_fp2',
      item_number: '010',
      disposition_authority: 'DAA-GRS-2016-0016-0001',
      page_or_section: '3',
      is_included: true,
      is_excluded: false,
      disposition_class: 'TEMPORARY',
      cutoff_trigger: 'BUSINESS_USE_CEASES',
      retention_months: 0,
      consequential_fingerprint: 'cq_fp2',
      reason_code: 'EXACT_MATCH',
      earliest_review_date: '2020-06-01',
      assessed_at: '2020-06-01T12:00:00Z',
      is_accepted: true,
      accepted_at: '2020-06-02T10:00:00Z',
    };

    const rawReview2 = {
      profile_id: 2,
      epoch: 1,
      review_requested: true,
      requested_at: '2026-06-01T08:00:00Z',
      decided: true,
      decided_at: '2026-06-02T10:00:00Z',
      officer: '0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1',
      action: 'AUTHORIZE_DISPOSITION',
      reason_code: 'RETENTION_COMPLETE_AND_NO_ACTIVE_HOLD',
      audit_hold_active: false,
    };

    const rawProfile3 = {
      profile_id: 3,
      client_nonce: 'live3-successor-001',
      template: 'ADMINISTRATIVE_POLICY_FILES',
      attributes_json: '{"policy_scope":"OFFICE_UNIT_LEVEL"}',
      creation_date: '2025-01-01',
      cutoff_date: '2025-06-01',
      grs_family: 'GRS_5_1',
      owner: '0x34b92E6553eaCA11A00A9d86d75d8a7881779D78',
      officer: '0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1',
      state: 'DRAFT',
      is_frozen: false,
      mapping_attempts: 0,
      mapping_outcome: '',
      is_mapping_accepted: false,
      last_attempt_timestamp: '',
      superseded_by: 0,
      supersedes: 2,
      audit_hold: false,
      audit_hold_reason: '',
      audit_hold_timestamp: '',
      fingerprint: 'fp3',
      review_requested: false,
      review_requested_at: '',
      review_decided: false,
      review_action: '',
      review_reason: '',
    };

    it('renders PublicLookup dossier cleanly for Profile 1 (has mapping, no review)', async () => {
      vi.spyOn(contractService, 'getConfiguredContractAddress').mockReturnValue('0x1234567890123456789012345678901234567890');
      const rawClient = sharedRpc.getRawClient();
      const readSpy = vi.spyOn(rawClient, 'readContract').mockImplementation(async (args: any) => {
        const fn = args?.functionName;
        if (fn === 'get_profile_count') return '1';
        if (fn === 'get_profile') return rawProfile1;
        if (fn === 'get_mapping') return rawMapping1;
        if (fn === 'get_effective_status') return 'MAPPED';
        if (fn === 'get_event_count') return '0';
        return null;
      });

      await renderComponent(<PublicLookup />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container?.textContent).toContain('LIVE-P1-001');
      expect(container?.textContent).toContain('0x34b9...9D78');

      const viewDossierBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
        b.textContent?.includes('View Dossier')
      );
      expect(viewDossierBtn).toBeDefined();

      await act(async () => {
        viewDossierBtn?.click();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container?.textContent).toContain('Record Series Disposition Dossier: Profile #1');
      expect(container?.textContent).toContain('TEMPORARY_ITEM_MATCH');
      expect(container?.textContent).toContain('010');
      expect(container?.textContent).toContain('View Official NARA Source CSV');
      expect(container?.textContent).toContain('No review requested yet');

      // get_review should NOT have been called on raw client because profile 1 has no review requested or decided
      const reviewCalls = readSpy.mock.calls.filter((c: any) => c[0]?.functionName === 'get_review');
      expect(reviewCalls.length).toBe(0);
    });

    it('renders PublicLookup dossier cleanly for Profile 2 (has mapping and decided review)', async () => {
      vi.spyOn(contractService, 'getConfiguredContractAddress').mockReturnValue('0x1234567890123456789012345678901234567890');
      const rawClient = sharedRpc.getRawClient();
      vi.spyOn(rawClient, 'readContract').mockImplementation(async (args: any) => {
        const fn = args?.functionName;
        if (fn === 'get_profile_count') return '1';
        if (fn === 'get_profile') return rawProfile2;
        if (fn === 'get_mapping') return rawMapping2;
        if (fn === 'get_review') return rawReview2;
        if (fn === 'get_effective_status') return 'SUPERSEDED';
        if (fn === 'get_event_count') return '0';
        return null;
      });

      await renderComponent(<PublicLookup />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container?.textContent).toContain('live2-office-001');

      const viewDossierBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
        b.textContent?.includes('View Dossier')
      );
      expect(viewDossierBtn).toBeDefined();

      await act(async () => {
        viewDossierBtn?.click();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container?.textContent).toContain('Record Series Disposition Dossier: Profile #2');
      expect(container?.textContent).toContain('AUTHORIZE_DISPOSITION');
      expect(container?.textContent).toContain('RETENTION_COMPLETE_AND_NO_ACTIVE_HOLD');
      expect(container?.textContent).toContain('Superseded By:');
      expect(container?.textContent).toContain('Profile #3');
    });

    it('renders PublicLookup dossier cleanly for Profile 3 (draft, neither mapping nor review)', async () => {
      vi.spyOn(contractService, 'getConfiguredContractAddress').mockReturnValue('0x1234567890123456789012345678901234567890');
      const rawClient = sharedRpc.getRawClient();
      const readSpy = vi.spyOn(rawClient, 'readContract').mockImplementation(async (args: any) => {
        const fn = args?.functionName;
        if (fn === 'get_profile_count') return '1';
        if (fn === 'get_profile') return rawProfile3;
        if (fn === 'get_effective_status') return 'DRAFT';
        if (fn === 'get_event_count') return '0';
        return null;
      });

      await renderComponent(<PublicLookup />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container?.textContent).toContain('live3-successor-001');
      expect(container?.textContent).toContain('DRAFT');

      const viewDossierBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
        b.textContent?.includes('View Dossier')
      );
      expect(viewDossierBtn).toBeDefined();

      await act(async () => {
        viewDossierBtn?.click();
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(container?.textContent).toContain('Record Series Disposition Dossier: Profile #3');
      expect(container?.textContent).toContain('Not mapped yet');
      expect(container?.textContent).toContain('No review requested yet');

      // Neither get_mapping nor get_review should be called for Profile 3
      const mappingCalls = readSpy.mock.calls.filter((c: any) => c[0]?.functionName === 'get_mapping');
      const reviewCalls = readSpy.mock.calls.filter((c: any) => c[0]?.functionName === 'get_review');
      expect(mappingCalls.length).toBe(0);
      expect(reviewCalls.length).toBe(0);
    });
  });
});
