import React, { useEffect, useState, useRef } from 'react';
import { contractService } from '../services/contractService.ts';
import { walletService } from '../services/walletService.ts';
import {
  ProfileRecord,
  TemplateType,
  ProcurementAttributes,
  AdministrativePolicyAttributes,
  TxStep,
  ProfileState,
} from '../types/domain.ts';

const MAX_SELECTABLE_PROFILES = 16;

interface CustodianWorkbenchProps {
  onStepChange: (step: TxStep, detail?: any) => void;
  selectedProfileId?: number | null;
}

export const CustodianWorkbench: React.FC<CustodianWorkbenchProps> = ({
  onStepChange,
  selectedProfileId,
}) => {
  const [walletState, setWalletState] = useState(walletService.getState());
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [actionProfileId, setActionProfileId] = useState<number | ''>(selectedProfileId || '');
  const [directIdInput, setDirectIdInput] = useState<string>('');
  const [currentProfile, setCurrentProfile] = useState<ProfileRecord | null>(null);
  const [effectiveStatus, setEffectiveStatus] = useState<ProfileState | null>(null);

  // Form State
  const [template, setTemplate] = useState<TemplateType>('PROCUREMENT_WORKING_FILES');
  const [clientNonce, setClientNonce] = useState<string>('');
  const [creationDate, setCreationDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [cutoffDate, setCutoffDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [officerAddress, setOfficerAddress] = useState<string>('');

  // Procurement closed attributes
  const [recordCopyStatus, setRecordCopyStatus] = useState<'OFFICIAL_RECORD' | 'ADMIN_REFERENCE_COPY'>('OFFICIAL_RECORD');
  const [procurementType, setProcurementType] = useState<'FORMAL_CONTRACT' | 'SIMPLIFIED_ACQUISITION' | 'MICRO_PURCHASE'>('FORMAL_CONTRACT');
  const [isFormalContract, setIsFormalContract] = useState<boolean>(true);
  const [contractConcluded, setContractConcluded] = useState<boolean>(true);
  const [includesUnsuccessfulBids, setIncludesUnsuccessfulBids] = useState<boolean>(false);
  const [scopeLevel, setScopeLevel] = useState<'WORKING_PAPERS' | 'ADMINISTRATIVE'>('WORKING_PAPERS');

  // Administrative Policy closed attributes
  const [policyScope, setPolicyScope] = useState<'OFFICE_UNIT_LEVEL'>('OFFICE_UNIT_LEVEL');
  const [recordLevel, setRecordLevel] = useState<'OFFICE_UNIT'>('OFFICE_UNIT');
  const [isAgencyDirective, setIsAgencyDirective] = useState<boolean>(false);
  const [isRoutineAdministrative, setIsRoutineAdministrative] = useState<boolean>(true);

  // Supersede state
  const [successorIdInput, setSuccessorIdInput] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const nonceInputRef = useRef<HTMLInputElement>(null);
  const officerInputRef = useRef<HTMLInputElement>(null);
  const creationDateRef = useRef<HTMLInputElement>(null);
  const successorInputRef = useRef<HTMLInputElement>(null);
  const directIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return walletService.subscribe((state) => {
      setWalletState(state);
    });
  }, []);

  const loadOwnedProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const count = await contractService.getProfileCount();
      const startId = Math.max(1, count - MAX_SELECTABLE_PROFILES + 1);
      const ids = Array.from({ length: count - startId + 1 }, (_, i) => startId + i);

      const items = await Promise.all(
        ids.map(async (id) => {
          try {
            return await contractService.getProfile(id);
          } catch {
            return null;
          }
        })
      );
      setProfiles(items.filter((p): p is ProfileRecord => p !== null));
    } catch (err: any) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    loadOwnedProfiles();
  }, [walletState.address]);

  useEffect(() => {
    if (selectedProfileId) {
      setActionProfileId(selectedProfileId);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    const fetchSelected = async () => {
      if (actionProfileId && typeof actionProfileId === 'number') {
        try {
          const p = await contractService.getProfile(actionProfileId, true);
          const todayIso = new Date().toISOString().slice(0, 10);
          const eff = await contractService.getEffectiveStatus(actionProfileId, todayIso, true);
          setCurrentProfile(p);
          setEffectiveStatus(eff);
        } catch {
          setCurrentProfile(null);
          setEffectiveStatus(null);
        }
      } else {
        setCurrentProfile(null);
        setEffectiveStatus(null);
      }
    };
    fetchSelected();
  }, [actionProfileId]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!walletState.connected || !walletState.address) {
      setFormError('Please connect your wallet first.');
      return;
    }

    const nonce = clientNonce.trim();
    if (!nonce) {
      setFormError('Client Nonce is required.');
      nonceInputRef.current?.focus();
      return;
    }

    const officer = officerAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(officer)) {
      setFormError('Records Officer must be a valid 40-character hex address (0x...).');
      officerInputRef.current?.focus();
      return;
    }

    if (officer.toLowerCase() === walletState.address.toLowerCase()) {
      setFormError('Records Officer address must be distinct from the Custodian address.');
      officerInputRef.current?.focus();
      return;
    }

    if (creationDate > cutoffDate) {
      setFormError('Creation date cannot be later than Cutoff date.');
      creationDateRef.current?.focus();
      return;
    }

    let attributesObj: any = {};
    let grsFamily = 'GRS_1_1';

    if (template === 'PROCUREMENT_WORKING_FILES') {
      grsFamily = 'GRS_1_1';
      const attr: ProcurementAttributes = {
        record_copy_status: recordCopyStatus,
        procurement_type: procurementType,
        is_formal_contract: isFormalContract,
        contract_concluded: contractConcluded,
        includes_unsuccessful_bids: includesUnsuccessfulBids,
        scope_level: scopeLevel,
      };
      attributesObj = attr;
    } else {
      grsFamily = 'GRS_5_1';
      const attr: AdministrativePolicyAttributes = {
        policy_scope: policyScope,
        record_level: recordLevel,
        is_agency_directive: isAgencyDirective,
        is_routine_administrative: isRoutineAdministrative,
      };
      attributesObj = attr;
    }

    const attributesJson = JSON.stringify(attributesObj);

    try {
      const res = await contractService.createProfile(
        nonce,
        template,
        attributesJson,
        creationDate,
        cutoffDate,
        grsFamily,
        officer,
        onStepChange
      );
      setClientNonce('');
      await loadOwnedProfiles();
      setActionProfileId(res.profileId);
    } catch (err: any) {
      setFormError(err?.message || 'Create profile failed');
    }
  };

  const handleFreeze = async () => {
    if (!actionProfileId) return;
    try {
      setActionError(null);
      await contractService.freezeProfile(Number(actionProfileId), onStepChange);
      await loadOwnedProfiles();
      const p = await contractService.getProfile(Number(actionProfileId), true);
      setCurrentProfile(p);
    } catch (err: any) {
      setActionError(err?.message || 'Freeze failed');
    }
  };

  const handleAssess = async () => {
    if (!actionProfileId) return;
    try {
      setActionError(null);
      await contractService.assessMapping(Number(actionProfileId), onStepChange);
      await loadOwnedProfiles();
      const p = await contractService.getProfile(Number(actionProfileId), true);
      setCurrentProfile(p);
    } catch (err: any) {
      setActionError(err?.message || 'Assessment failed');
    }
  };

  const handleRetry = async () => {
    if (!actionProfileId) return;
    try {
      setActionError(null);
      await contractService.retryUnresolved(Number(actionProfileId), onStepChange);
      await loadOwnedProfiles();
      const p = await contractService.getProfile(Number(actionProfileId), true);
      setCurrentProfile(p);
    } catch (err: any) {
      setActionError(err?.message || 'Retry failed');
    }
  };

  const handleRequestReview = async () => {
    if (!actionProfileId) return;
    try {
      setActionError(null);
      await contractService.requestDispositionReview(Number(actionProfileId), onStepChange);
      await loadOwnedProfiles();
      const p = await contractService.getProfile(Number(actionProfileId), true);
      setCurrentProfile(p);
    } catch (err: any) {
      setActionError(err?.message || 'Request review failed');
    }
  };

  const handleSupersede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionProfileId) return;
    const succId = parseInt(successorIdInput.trim(), 10);
    if (isNaN(succId) || succId <= 0 || succId === Number(actionProfileId)) {
      setActionError('Please enter a valid distinct successor profile ID.');
      successorInputRef.current?.focus();
      return;
    }
    try {
      setActionError(null);
      await contractService.supersedeProfile(Number(actionProfileId), succId, onStepChange);
      setSuccessorIdInput('');
      await loadOwnedProfiles();
      const p = await contractService.getProfile(Number(actionProfileId), true);
      setCurrentProfile(p);
    } catch (err: any) {
      setActionError(err?.message || 'Supersede failed');
    }
  };

  const handleDirectLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(directIdInput.trim(), 10);
    if (isNaN(id) || id <= 0) {
      setActionError('Please enter a valid positive profile ID.');
      directIdRef.current?.focus();
      return;
    }
    setActionProfileId(id);
    setActionError(null);
  };

  return (
    <div className="workbench-grid">
      {/* Left Column: Create Profile Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">1. Create Record Series Profile</h2>
        </div>
        <p className="card-desc">
          Declare a structured record series profile using closed allowlisted attributes. Free-text and PII are strictly prohibited.
        </p>

        {formError && (
          <div className="alert-banner alert-error" role="alert" aria-live="assertive">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateProfile}>
          <div className="form-group">
            <label htmlFor="form-template" className="form-label">
              NARA Schedule Template
            </label>
            <select
              id="form-template"
              className="form-select"
              value={template}
              onChange={(e) => setTemplate(e.target.value as TemplateType)}
            >
              <option value="PROCUREMENT_WORKING_FILES">
                GRS 1.1: Financial Management & Procurement Working Files
              </option>
              <option value="ADMINISTRATIVE_POLICY_FILES">
                GRS 5.1: Common Office Administrative Policy Files
              </option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="form-nonce" className="form-label">
              Client Nonce (Unique Identifier)
            </label>
            <input
              id="form-nonce"
              ref={nonceInputRef}
              type="text"
              className="form-input"
              placeholder="e.g. FY24-RRDG-001"
              value={clientNonce}
              onChange={(e) => setClientNonce(e.target.value)}
              required
            />
            <span className="form-hint">
              Alphanumeric identifier unique to your custodian address.
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="form-creation-date" className="form-label">
                Creation Date (ISO)
              </label>
              <input
                id="form-creation-date"
                ref={creationDateRef}
                type="date"
                className="form-input"
                value={creationDate}
                onChange={(e) => setCreationDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="form-cutoff-date" className="form-label">
                Cutoff Date (ISO)
              </label>
              <input
                id="form-cutoff-date"
                type="date"
                className="form-input"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                required
              />
            </div>
          </div>
          <span className="form-hint" style={{ marginBottom: '16px', display: 'block' }}>
            {template === 'PROCUREMENT_WORKING_FILES'
              ? 'Cutoff date represents the date of Final Payment or Contract Cancellation for official procurement records.'
              : 'Cutoff date represents the date when Business Use Ceases for office/unit administrative policies.'}
          </span>

          <div className="form-group">
            <label htmlFor="form-officer" className="form-label">
              Assigned Records Officer Address (0x...)
            </label>
            <input
              id="form-officer"
              ref={officerInputRef}
              type="text"
              className="form-input mono"
              placeholder="0x..."
              value={officerAddress}
              onChange={(e) => setOfficerAddress(e.target.value)}
              required
            />
            <span className="form-hint">
              Must be a distinct human official address authorized to accept mappings and make review decisions.
            </span>
          </div>

          {/* Closed Attribute Controls */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              Closed Attribute Specification ({template === 'PROCUREMENT_WORKING_FILES' ? 'GRS 1.1' : 'GRS 5.1'})
            </h3>

            {template === 'PROCUREMENT_WORKING_FILES' ? (
              <>
                <div className="form-group">
                  <label htmlFor="attr-copy-status" className="form-label">
                    Record Copy Status (Required)
                  </label>
                  <select
                    id="attr-copy-status"
                    className="form-select"
                    value={recordCopyStatus}
                    onChange={(e) => setRecordCopyStatus(e.target.value as any)}
                  >
                    <option value="OFFICIAL_RECORD">OFFICIAL_RECORD (Item 010: 72 months after payment)</option>
                    <option value="ADMIN_REFERENCE_COPY">ADMIN_REFERENCE_COPY (Item 011: when business use ceases)</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="attr-proc-type" className="form-label">
                      Procurement Type
                    </label>
                    <select
                      id="attr-proc-type"
                      className="form-select"
                      value={procurementType}
                      onChange={(e) => setProcurementType(e.target.value as any)}
                    >
                      <option value="FORMAL_CONTRACT">FORMAL_CONTRACT</option>
                      <option value="SIMPLIFIED_ACQUISITION">SIMPLIFIED_ACQUISITION</option>
                      <option value="MICRO_PURCHASE">MICRO_PURCHASE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="attr-scope" className="form-label">
                      Scope Level
                    </label>
                    <select
                      id="attr-scope"
                      className="form-select"
                      value={scopeLevel}
                      onChange={(e) => setScopeLevel(e.target.value as any)}
                    >
                      <option value="WORKING_PAPERS">WORKING_PAPERS</option>
                      <option value="ADMINISTRATIVE">ADMINISTRATIVE</option>
                    </select>
                  </div>
                </div>

                <label className="form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isFormalContract}
                    onChange={(e) => setIsFormalContract(e.target.checked)}
                  />
                  <span>Formal Contract Record</span>
                </label>
                <label className="form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={contractConcluded}
                    onChange={(e) => setContractConcluded(e.target.checked)}
                  />
                  <span>Contract Concluded / Closed</span>
                </label>
                <label className="form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={includesUnsuccessfulBids}
                    onChange={(e) => setIncludesUnsuccessfulBids(e.target.checked)}
                  />
                  <span>Includes Unsuccessful Bids</span>
                </label>
              </>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="attr-pol-scope" className="form-label">
                      Policy Scope
                    </label>
                    <select
                      id="attr-pol-scope"
                      className="form-select"
                      value={policyScope}
                      onChange={(e) => setPolicyScope(e.target.value as any)}
                    >
                      <option value="OFFICE_UNIT_LEVEL">OFFICE_UNIT_LEVEL</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="attr-rec-level" className="form-label">
                      Record Level
                    </label>
                    <select
                      id="attr-rec-level"
                      className="form-select"
                      value={recordLevel}
                      onChange={(e) => setRecordLevel(e.target.value as any)}
                    >
                      <option value="OFFICE_UNIT">OFFICE_UNIT</option>
                    </select>
                  </div>
                </div>

                <label className="form-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isRoutineAdministrative}
                    onChange={(e) => setIsRoutineAdministrative(e.target.checked)}
                  />
                  <span>Routine Internal Administrative Procedure</span>
                </label>
                <label className="form-checkbox-label" style={{ color: isAgencyDirective ? 'var(--danger-primary)' : 'inherit' }}>
                  <input
                    type="checkbox"
                    checked={isAgencyDirective}
                    onChange={(e) => setIsAgencyDirective(e.target.checked)}
                  />
                  <span>Is Agency-Wide Directive (Warning: Agency directives are excluded from GRS 5.1 and fail closed)</span>
                </label>
              </>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!walletState.connected}
            style={{ width: '100%' }}
          >
            Create Profile On-Chain
          </button>
        </form>
      </div>

      {/* Right Column: Custodian Action Panel */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">2. Custodian Action Workbench</h2>
        </div>
        <p className="card-desc">
          Manage lifecycle state transitions for your record series profiles.
        </p>

        {actionError && (
          <div className="alert-banner alert-error" role="alert" aria-live="assertive">
            {actionError}
          </div>
        )}

        <div className="workbench-grid" style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label htmlFor="select-action-profile" className="form-label">
              Recent Record Profiles {loadingProfiles && '(Loading...)'}
            </label>
            <select
              id="select-action-profile"
              className="form-select"
              value={actionProfileId}
              onChange={(e) => setActionProfileId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">-- Choose Profile --</option>
              {profiles.map((p) => (
                <option key={p.profile_id} value={p.profile_id}>
                  #{p.profile_id} - {p.client_nonce} [{p.state}] (Custodian: {p.custodian.slice(0, 6)}...)
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleDirectLookup}>
            <div className="form-group">
              <label htmlFor="custodian-direct-id" className="form-label">
                Or Lookup by Direct Profile ID
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="custodian-direct-id"
                  ref={directIdRef}
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="e.g. 1"
                  value={directIdInput}
                  onChange={(e) => setDirectIdInput(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary btn-sm">
                  Load
                </button>
              </div>
            </div>
          </form>
        </div>

        {currentProfile && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '15px' }}>Profile #{currentProfile.profile_id} ({currentProfile.client_nonce})</strong>
                <span className={`status-badge status-${currentProfile.state}`}>
                  {currentProfile.state}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Template: {currentProfile.template} | Attempts: {currentProfile.mapping_attempts}/3
                {effectiveStatus && <span> | Effective: <strong>{effectiveStatus}</strong></span>}
                {currentProfile.audit_hold_active && <span style={{ color: 'var(--amber-primary)', fontWeight: 600 }}> | AUDIT HOLD ACTIVE</span>}
              </p>
            </div>

            {/* Step-by-step custodian actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Freeze action */}
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleFreeze}
                  disabled={currentProfile.state !== 'DRAFT'}
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>Freeze Profile (Lock Attributes)</span>
                  <span className="mono" style={{ fontSize: '12px' }}>DRAFT &rarr; FROZEN</span>
                </button>
                <span className="form-hint">
                  Freezing locks attributes immutably and prepares the profile for validator consensus.
                </span>
              </div>

              {/* Assess Mapping */}
              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAssess}
                  disabled={currentProfile.state !== 'FROZEN'}
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>Assess Mapping (GenLayer Consensus)</span>
                  <span className="mono" style={{ fontSize: '12px' }}>FROZEN &rarr; MAPPED</span>
                </button>
                <span className="form-hint">
                  Triggers GenLayer AI validator consensus to fetch NARA PDF and determine GRS item and retention.
                </span>
              </div>

              {/* Retry Unresolved */}
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRetry}
                  disabled={currentProfile.state !== 'HOLD_UNRESOLVED' && currentProfile.state !== 'RECLASSIFY_REQUIRED'}
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>Retry Unresolved Assessment</span>
                  <span className="mono" style={{ fontSize: '12px' }}>UNRESOLVED &rarr; FROZEN</span>
                </button>
                <span className="form-hint">
                  Enforces 60-second cooldown between completed attempts. Max 3 attempts total.
                </span>
              </div>

              {/* Request Disposition Review */}
              <div>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleRequestReview}
                  disabled={effectiveStatus !== 'REVIEW_ELIGIBLE' || currentProfile.audit_hold_active}
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>Request Disposition Review</span>
                  <span className="mono" style={{ fontSize: '12px' }}>ELIGIBLE &rarr; REQUESTED</span>
                </button>
                <span className="form-hint">
                  Available once retention period has elapsed and earliest review date is reached. Blocked if audit hold is active.
                </span>
              </div>

              {/* Supersession Linking */}
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <form onSubmit={handleSupersede}>
                  <label htmlFor="successor-input" className="form-label">
                    Supersede Profile with Successor
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="successor-input"
                      ref={successorInputRef}
                      type="number"
                      min="1"
                      className="form-input"
                      placeholder="Successor Profile ID"
                      value={successorIdInput}
                      onChange={(e) => setSuccessorIdInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn btn-secondary btn-sm"
                      disabled={currentProfile.successor_id > 0}
                    >
                      Supersede
                    </button>
                  </div>
                  <span className="form-hint">
                    Permanently marks this record series as superseded by a successor profile.
                  </span>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
