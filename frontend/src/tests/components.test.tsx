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
    vi.spyOn(contractService, 'getEventCount').mockResolvedValue(0);

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
    expect(container?.textContent).toContain('View Official NARA PDF Source');
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
      state: 'REVIEW_REQUESTED',
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

  it('renders SourceEvidenceView with official NARA PDF URLs and parity cards', async () => {
    vi.spyOn(contractService, 'getSourceMetadata').mockImplementation(async (tpl) => {
      if (tpl === 'PROCUREMENT_WORKING_FILES') {
        return {
          template: tpl,
          grs_family: 'GRS_1_1',
          schedule_number: 'GRS 1.1',
          schedule_title: 'Financial Management and Reporting Records',
          schedule_version: 'Transmittal 31 / April 2020',
          pdf_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
        };
      }
      return {
        template: tpl,
        grs_family: 'GRS_5_1',
        schedule_number: 'GRS 5.1',
        schedule_title: 'Common Office Records',
        schedule_version: 'Transmittal 28 / July 2017',
        pdf_url: 'https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv',
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
});
