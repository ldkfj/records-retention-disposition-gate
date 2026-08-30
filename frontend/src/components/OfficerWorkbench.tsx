import React, { useEffect, useState, useRef } from 'react';
import { contractService, createEmptyMappingRecord, createEmptyReviewRecord } from '../services/contractService.ts';
import { walletService } from '../services/walletService.ts';
import {
  ProfileRecord,
  MappingRecord,
  ReviewRecord,
  ReviewAction,
  TxStep,
  ProfileState,
} from '../types/domain.ts';
import { formatShortAddress } from '../utils/formatters.ts';

const MAX_SELECTABLE_PROFILES = 16;

interface OfficerWorkbenchProps {
  onStepChange: (step: TxStep, detail?: any) => void;
  selectedProfileId?: number | null;
}

export const OfficerWorkbench: React.FC<OfficerWorkbenchProps> = ({
  onStepChange,
  selectedProfileId,
}) => {
  const [walletState, setWalletState] = useState(walletService.getState());
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | ''>(selectedProfileId || '');
  const [directIdInput, setDirectIdInput] = useState<string>('');
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [mapping, setMapping] = useState<MappingRecord | null>(null);
  const [review, setReview] = useState<ReviewRecord | null>(null);
  const [effectiveStatus, setEffectiveStatus] = useState<ProfileState | null>(null);

  // Review Decision Form State
  const [decisionAction, setDecisionAction] = useState<ReviewAction>('AUTHORIZE_DISPOSITION');
  const [reasonCode, setReasonCode] = useState<string>('OFFICER_APPROVED');
  const [actionError, setActionError] = useState<string | null>(null);

  const reasonInputRef = useRef<HTMLInputElement>(null);
  const directIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return walletService.subscribe((s) => setWalletState(s));
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [walletState.address]);

  useEffect(() => {
    if (selectedProfileId) {
      setSelectedId(selectedProfileId);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (selectedId && typeof selectedId === 'number') {
        try {
          const p = await contractService.getProfile(selectedId, true);

          let m: MappingRecord;
          if (p.mapping_attempts > 0) {
            m = await contractService.getMapping(selectedId, true);
          } else {
            m = createEmptyMappingRecord(selectedId);
          }

          let r: ReviewRecord;
          if (p.review_requested || p.review_decided) {
            r = await contractService.getReview(selectedId, true);
          } else {
            r = createEmptyReviewRecord(selectedId);
          }

          const todayIso = new Date().toISOString().slice(0, 10);
          const eff = await contractService.getEffectiveStatus(selectedId, todayIso, true);
          setProfile(p);
          setMapping(m);
          setReview(r);
          setEffectiveStatus(eff);

          // Default sensible action based on disposition class
          if (m.disposition_class === 'PERMANENT') {
            setDecisionAction('AUTHORIZE_TRANSFER');
          } else {
            setDecisionAction('AUTHORIZE_DISPOSITION');
          }
        } catch {
          setProfile(null);
          setMapping(null);
          setReview(null);
          setEffectiveStatus(null);
        }
      } else {
        setProfile(null);
        setMapping(null);
        setReview(null);
        setEffectiveStatus(null);
      }
    };
    fetchDetails();
  }, [selectedId]);

  const handleAcceptMapping = async () => {
    if (!selectedId) return;
    try {
      setActionError(null);
      await contractService.acceptMapping(Number(selectedId), onStepChange);
      await loadProfiles();
      const m = await contractService.getMapping(Number(selectedId), true);
      setMapping(m);
    } catch (err: any) {
      setActionError(err?.message || 'Accept mapping failed');
    }
  };

  const handleDecideReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!reasonCode.trim()) {
      setActionError('Reason code / justification is required.');
      reasonInputRef.current?.focus();
      return;
    }

    try {
      setActionError(null);
      await contractService.decideReview(Number(selectedId), decisionAction, reasonCode.trim(), onStepChange);
      await loadProfiles();
      const r = await contractService.getReview(Number(selectedId), true);
      const p = await contractService.getProfile(Number(selectedId), true);
      setReview(r);
      setProfile(p);
    } catch (err: any) {
      setActionError(err?.message || 'Decide review failed');
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
    setSelectedId(id);
    setActionError(null);
  };

  const isAssignedOfficer =
    walletState.connected &&
    profile &&
    walletState.address &&
    profile.officer.toLowerCase() === walletState.address.toLowerCase();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Records Officer Workbench</h2>
      </div>
      <p className="card-desc">
        Authorized Records Officers review validator consensus mappings, execute formal acceptance, and render disposition authorization decisions.
      </p>

      {actionError && (
        <div className="alert-banner alert-error" role="alert" aria-live="assertive">
          {actionError}
        </div>
      )}

      <div className="workbench-grid" style={{ maxWidth: '800px', marginBottom: '16px' }}>
        <div className="form-group">
          <label htmlFor="officer-select-profile" className="form-label">
            Recent Profiles {loading && '(Loading...)'}
          </label>
          <select
            id="officer-select-profile"
            className="form-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">-- Choose Profile to Review --</option>
            {profiles.map((p) => (
              <option key={p.profile_id} value={p.profile_id}>
                #{p.profile_id} - {p.client_nonce} [{p.state}] (Officer: {formatShortAddress(p.officer)})
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleDirectLookup}>
          <div className="form-group">
            <label htmlFor="officer-direct-id" className="form-label">
              Or Lookup by Direct Profile ID
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="officer-direct-id"
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

      {profile && mapping && review && (
        <div className="workbench-grid" style={{ marginTop: '20px' }}>
          {/* Left Column: Mapping Acceptance */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
              1. Consensus Mapping Review & Acceptance
            </h3>

            <div className="dossier-grid">
              <span className="dossier-label">Profile:</span>
              <span className="dossier-value mono">#{profile.profile_id} ({profile.client_nonce})</span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Assigned Officer:</span>
              <span className="dossier-value mono">{profile.officer}</span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Outcome:</span>
              <span className="dossier-value">
                {profile.mapping_attempts > 0 ? (
                  <strong>{mapping.outcome}</strong>
                ) : (
                  'Not mapped yet'
                )}
              </span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Schedule & Item:</span>
              <span className="dossier-value">
                {profile.mapping_attempts > 0 && mapping.schedule_number
                  ? `${mapping.schedule_number} Item ${mapping.item || '—'} (${mapping.disposition_authority || '—'})`
                  : 'Not mapped'}
              </span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Disposition Class:</span>
              <span className="dossier-value">
                {profile.mapping_attempts > 0 && mapping.disposition_class !== 'NOT_APPLICABLE'
                  ? `${mapping.disposition_class} (${mapping.retention_months} Months retention)`
                  : 'N/A'}
              </span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Earliest Review Date:</span>
              <span className="dossier-value mono">
                {profile.mapping_attempts > 0 && mapping.earliest_review_date ? mapping.earliest_review_date : 'N/A'}
              </span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Effective Status:</span>
              <span className="dossier-value">
                <span className="badge badge-subtle">{effectiveStatus || profile.state}</span>
              </span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Acceptance Status:</span>
              <span className="dossier-value">
                {profile.mapping_attempts > 0 ? (
                  mapping.is_accepted ? (
                    <span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
                      ACCEPTED {mapping.accepted_timestamp ? `on ${mapping.accepted_timestamp}` : '(Timestamp not exposed by contract)'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--amber-primary)', fontWeight: 600 }}>
                      PENDING ACCEPTANCE
                    </span>
                  )
                ) : (
                  'Not mapped yet'
                )}
              </span>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAcceptMapping}
                disabled={mapping.is_accepted || !mapping.outcome.includes('ITEM_MATCH') || !isAssignedOfficer}
                style={{ width: '100%' }}
              >
                {mapping.is_accepted ? 'Mapping Already Accepted' : 'Accept Consensus Mapping'}
              </button>
              {!isAssignedOfficer && (
                <span className="form-hint" style={{ color: 'var(--amber-primary)' }}>
                  Connected wallet must match the assigned Records Officer address ({formatShortAddress(profile.officer)}).
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Review Decision */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
              2. Formal Disposition Decision
            </h3>

            <div className="dossier-grid">
              <span className="dossier-label">Review Request:</span>
              <span className="dossier-value">
                {profile.review_requested || review.review_requested
                  ? review.requested_timestamp
                    ? `REQUESTED on ${review.requested_timestamp}`
                    : 'REQUESTED (Timestamp not exposed by contract)'
                  : 'Not requested yet'}
              </span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Decision Status:</span>
              <span className="dossier-value">
                {profile.review_decided || review.is_decided ? (
                  <span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
                    DECIDED: {review.action} (Reason: {review.reason_code || '—'})
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {review.decided_timestamp
                        ? `Decided on ${review.decided_timestamp}`
                        : 'Decided (Timestamp not exposed by contract)'}
                    </span>
                  </span>
                ) : profile.review_requested || review.review_requested ? (
                  'Pending Officer Review'
                ) : (
                  'Not requested yet'
                )}
              </span>
            </div>
            <div className="dossier-grid">
              <span className="dossier-label">Audit Hold:</span>
              <span className="dossier-value">
                {profile.audit_hold_active ? (
                  <span style={{ color: 'var(--amber-primary)', fontWeight: 600 }}>
                    BLOCKED: Audit Hold Active
                  </span>
                ) : (
                  'Clear'
                )}
              </span>
            </div>

            <form onSubmit={handleDecideReview} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label htmlFor="officer-decision-action" className="form-label">
                  Disposition Decision Action
                </label>
                <select
                  id="officer-decision-action"
                  className="form-select"
                  value={decisionAction}
                  onChange={(e) => setDecisionAction(e.target.value as ReviewAction)}
                >
                  {mapping.disposition_class === 'TEMPORARY' && (
                    <option value="AUTHORIZE_DISPOSITION">
                      AUTHORIZE_DISPOSITION (Approve destruction/disposition)
                    </option>
                  )}
                  {mapping.disposition_class === 'PERMANENT' && (
                    <option value="AUTHORIZE_TRANSFER">
                      AUTHORIZE_TRANSFER (Approve transfer to National Archives)
                    </option>
                  )}
                  <option value="HOLD">HOLD (Place Operational Hold)</option>
                  <option value="RECLASSIFY">RECLASSIFY (Require Reclassification)</option>
                </select>
                <span className="form-hint">
                  {mapping.disposition_class === 'TEMPORARY'
                    ? 'Temporary records can only receive AUTHORIZE_DISPOSITION, HOLD, or RECLASSIFY.'
                    : 'Permanent records can only receive AUTHORIZE_TRANSFER, HOLD, or RECLASSIFY.'}
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="officer-reason-code" className="form-label">
                  Officer Reason Code / Justification
                </label>
                <input
                  id="officer-reason-code"
                  ref={reasonInputRef}
                  type="text"
                  className="form-input"
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  placeholder="e.g. OFFICER_APPROVED"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-success"
                disabled={
                  effectiveStatus !== 'REVIEW_REQUESTED' ||
                  review.is_decided ||
                  profile.audit_hold_active ||
                  !isAssignedOfficer
                }
                style={{ width: '100%' }}
              >
                {review.is_decided ? 'Review Already Decided' : 'Submit Formal Disposition Decision'}
              </button>
              {effectiveStatus !== 'REVIEW_REQUESTED' && !review.is_decided && (
                <span className="form-hint" style={{ color: 'var(--text-muted)' }}>
                  Profile must be in REVIEW_REQUESTED state before officer decision can be rendered.
                </span>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
