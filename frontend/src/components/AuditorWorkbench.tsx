import React, { useEffect, useState, useRef } from 'react';
import { contractService } from '../services/contractService.ts';
import { walletService } from '../services/walletService.ts';
import { ProfileRecord, TxStep } from '../types/domain.ts';
import { formatShortAddress } from '../utils/formatters.ts';

const MAX_SELECTABLE_PROFILES = 16;

interface AuditorWorkbenchProps {
  onStepChange: (step: TxStep, detail?: any) => void;
  selectedProfileId?: number | null;
}

export const AuditorWorkbench: React.FC<AuditorWorkbenchProps> = ({
  onStepChange,
  selectedProfileId,
}) => {
  const [walletState, setWalletState] = useState(walletService.getState());
  const [auditorAddress, setAuditorAddress] = useState<string>('');
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>(selectedProfileId || '');
  const [directIdInput, setDirectIdInput] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);
  const [holdReason, setHoldReason] = useState<string>('PENDING_AUDIT_INVESTIGATION');
  const [actionError, setActionError] = useState<string | null>(null);

  const holdReasonRef = useRef<HTMLInputElement>(null);
  const directIdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return walletService.subscribe((s) => setWalletState(s));
  }, []);

  const loadAuditorData = async () => {
    try {
      const [aud, count] = await Promise.all([
        contractService.getAuditor(true),
        contractService.getProfileCount(true),
      ]);
      setAuditorAddress(aud);

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
      console.error('Failed to load auditor data:', err);
    }
  };

  useEffect(() => {
    loadAuditorData();
  }, [walletState.address]);

  useEffect(() => {
    if (selectedProfileId) {
      setSelectedId(selectedProfileId);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (selectedId && typeof selectedId === 'number') {
        try {
          const p = await contractService.getProfile(selectedId, true);
          setSelectedProfile(p);
        } catch {
          setSelectedProfile(null);
        }
      } else {
        setSelectedProfile(null);
      }
    };
    fetchProfile();
  }, [selectedId]);

  const handlePlaceHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!holdReason.trim()) {
      setActionError('Hold reason is required.');
      holdReasonRef.current?.focus();
      return;
    }

    try {
      setActionError(null);
      await contractService.placeAuditHold(Number(selectedId), holdReason.trim(), onStepChange);
      await loadAuditorData();
      const p = await contractService.getProfile(Number(selectedId), true);
      setSelectedProfile(p);
    } catch (err: any) {
      setActionError(err?.message || 'Place audit hold failed');
    }
  };

  const handleClearHold = async () => {
    if (!selectedId) return;
    try {
      setActionError(null);
      await contractService.clearAuditHold(Number(selectedId), onStepChange);
      await loadAuditorData();
      const p = await contractService.getProfile(Number(selectedId), true);
      setSelectedProfile(p);
    } catch (err: any) {
      setActionError(err?.message || 'Clear audit hold failed');
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

  const isConfiguredAuditor =
    walletState.connected &&
    walletState.address &&
    auditorAddress &&
    walletState.address.toLowerCase() === auditorAddress.toLowerCase();

  const isTerminal =
    selectedProfile?.state === 'TRANSFER_AUTHORIZED' ||
    selectedProfile?.state === 'DISPOSITION_AUTHORIZED' ||
    selectedProfile?.state === 'SUPERSEDED';

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Auditor Workbench & Inspection Holds</h2>
        <span className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Configured Auditor: {formatShortAddress(auditorAddress, 'Loading...')}
        </span>
      </div>
      <p className="card-desc">
        Independent audit authorities can inspect record profiles and place or clear audit holds prior to terminal disposition authorization.
      </p>

      {!isConfiguredAuditor && (
        <div className="alert-banner alert-warning">
          <strong>Auditor Role Notice:</strong> Your connected wallet ({formatShortAddress(walletState.address, 'Disconnected')}) does not match the configured contract auditor address (<span className="mono">{auditorAddress || '—'}</span>). Audit hold actions will fail authorization.
        </div>
      )}

      {actionError && (
        <div className="alert-banner alert-error" role="alert" aria-live="assertive">
          {actionError}
        </div>
      )}

      <div className="workbench-grid" style={{ maxWidth: '800px', marginBottom: '16px' }}>
        <div className="form-group">
          <label htmlFor="auditor-select-profile" className="form-label">
            Recent Record Profiles
          </label>
          <select
            id="auditor-select-profile"
            className="form-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">-- Choose Profile --</option>
            {profiles.map((p) => (
              <option key={p.profile_id} value={p.profile_id}>
                #{p.profile_id} - {p.client_nonce} [{p.state}] {p.audit_hold_active ? '(HOLD ACTIVE)' : ''}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleDirectLookup}>
          <div className="form-group">
            <label htmlFor="auditor-direct-id" className="form-label">
              Or Lookup by Direct Profile ID
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="auditor-direct-id"
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

      {selectedProfile && (
        <div style={{ marginTop: '20px', backgroundColor: 'var(--bg-surface)', padding: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              Profile #{selectedProfile.profile_id} ({selectedProfile.client_nonce})
            </h3>
            <span className={`status-badge status-${selectedProfile.state}`}>
              {selectedProfile.state}
            </span>
          </div>

          <div className="workbench-grid">
            <div>
              <div className="dossier-grid">
                <span className="dossier-label">Template:</span>
                <span className="dossier-value">{selectedProfile.template}</span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Creation / Cutoff:</span>
                <span className="dossier-value mono">{(selectedProfile.creation_date || '—')} &rarr; {(selectedProfile.cutoff_date || '—')}</span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Custodian:</span>
                <span className="dossier-value mono">{selectedProfile.custodian || '—'}</span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Records Officer:</span>
                <span className="dossier-value mono">{selectedProfile.officer || '—'}</span>
              </div>
            </div>

            <div>
              <div className="dossier-grid">
                <span className="dossier-label">Audit Hold Status:</span>
                <span className="dossier-value">
                  {selectedProfile.audit_hold_active ? (
                    <span style={{ color: 'var(--amber-primary)', fontWeight: 600 }}>
                      ACTIVE (Reason: {selectedProfile.audit_hold_reason || 'None specified'})
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Placed on: {selectedProfile.audit_hold_timestamp || 'Timestamp not exposed by contract'}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--green-primary)' }}>No active audit hold</span>
                  )}
                </span>
              </div>

              {isTerminal && (
                <div className="alert-banner alert-warning" style={{ marginTop: '12px' }}>
                  <strong>Terminal State Locked:</strong> This profile has achieved terminal status ({selectedProfile.state}). Audit holds cannot be placed or cleared after terminal authorization.
                </div>
              )}

              {/* Action Controls */}
              {!isTerminal && (
                <div style={{ marginTop: '16px' }}>
                  {!selectedProfile.audit_hold_active ? (
                    <form onSubmit={handlePlaceHold}>
                      <div className="form-group">
                        <label htmlFor="auditor-hold-reason" className="form-label">
                          Audit Hold Justification Code
                        </label>
                        <input
                          id="auditor-hold-reason"
                          ref={holdReasonRef}
                          type="text"
                          className="form-input"
                          value={holdReason}
                          onChange={(e) => setHoldReason(e.target.value)}
                          placeholder="e.g. COMPLIANCE_INVESTIGATION"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-danger"
                        disabled={!isConfiguredAuditor}
                        style={{ width: '100%' }}
                      >
                        Place Audit Hold
                      </button>
                    </form>
                  ) : (
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleClearHold}
                        disabled={!isConfiguredAuditor}
                        style={{ width: '100%' }}
                      >
                        Clear Active Audit Hold
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
