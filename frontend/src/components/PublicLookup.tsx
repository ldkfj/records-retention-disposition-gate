import React, { useEffect, useState, useRef } from 'react';
import { contractService, createEmptyMappingRecord, createEmptyReviewRecord } from '../services/contractService.ts';
import {
  ProfileRecord,
  MappingRecord,
  ReviewRecord,
  EventRecord,
  ProfileState,
} from '../types/domain.ts';
import { OFFICIAL_NARA_SOURCES } from '../config/chain.ts';
import { formatShortAddress } from '../utils/formatters.ts';

const PAGE_SIZE = 8;
const MAX_DOSSIER_EVENTS = 16;
const EVENT_READ_CONCURRENCY = 4;

interface PublicLookupProps {
  onSelectProfile?: (profileId: number) => void;
}

export const PublicLookup: React.FC<PublicLookupProps> = ({ onSelectProfile }) => {
  const [profileCount, setProfileCount] = useState<number>(0);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [searchId, setSearchId] = useState<string>('');
  const [searchNonce, setSearchNonce] = useState<string>('');
  const [searchOwner, setSearchOwner] = useState<string>('');
  const [searchFingerprint, setSearchFingerprint] = useState<string>('');

  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);
  const [selectedMapping, setSelectedMapping] = useState<MappingRecord | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [effectiveStatus, setEffectiveStatus] = useState<ProfileState | null>(null);
  const [profileEvents, setProfileEvents] = useState<EventRecord[]>([]);
  const [dossierLoading, setDossierLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const idInputRef = useRef<HTMLInputElement>(null);
  const ownerInputRef = useRef<HTMLInputElement>(null);
  const nonceInputRef = useRef<HTMLInputElement>(null);
  const fpInputRef = useRef<HTMLInputElement>(null);

  const fetchProfilePage = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const count = await contractService.getProfileCount();
      setProfileCount(count);

      if (count === 0) {
        setProfiles([]);
        return;
      }

      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      const targetPage = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(targetPage);

      const startId = (targetPage - 1) * PAGE_SIZE + 1;
      const endId = Math.min(targetPage * PAGE_SIZE, count);
      const pageIds = Array.from({ length: endId - startId + 1 }, (_, idx) => startId + idx);

      const pageProfiles = await Promise.all(
        pageIds.map(async (id) => {
          try {
            return await contractService.getProfile(id);
          } catch {
            return null;
          }
        })
      );

      setProfiles(pageProfiles.filter((p): p is ProfileRecord => p !== null));
    } catch (err: any) {
      setError(err?.message || 'Failed to load profile page');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfilePage(1);
  }, []);

  const loadDossier = async (id: number) => {
    try {
      setDossierLoading(true);
      setError(null);
      setSelectedProfileId(id);

      // 1. Authoritatively fetch profile record first
      const profile = await contractService.getProfile(id, true);

      // 2. Only fetch mapping if attempts > 0, otherwise create explicit empty mapping
      let mapping: MappingRecord;
      if (profile.mapping_attempts > 0) {
        mapping = await contractService.getMapping(id, true);
      } else {
        mapping = createEmptyMappingRecord(id);
      }

      // 3. Only fetch review if requested or decided, otherwise create explicit empty review
      let review: ReviewRecord;
      if (profile.review_requested || profile.review_decided) {
        review = await contractService.getReview(id, true);
      } else {
        review = createEmptyReviewRecord(id);
      }

      const evCount = await contractService.getEventCount(true);
      const todayIso = new Date().toISOString().slice(0, 10);
      const eff = await contractService.getEffectiveStatus(id, todayIso, true);

      // Bounded event lookup: fetch only the most recent MAX_DOSSIER_EVENTS
      const evs: EventRecord[] = [];
      const startEvId = Math.max(1, evCount - MAX_DOSSIER_EVENTS + 1);
      const evIds = Array.from({ length: evCount - startEvId + 1 }, (_, i) => startEvId + i);

      const fetchedEvs: Array<EventRecord | null> = [];
      for (let offset = 0; offset < evIds.length; offset += EVENT_READ_CONCURRENCY) {
        const batch = evIds.slice(offset, offset + EVENT_READ_CONCURRENCY);
        fetchedEvs.push(
          ...(await Promise.all(
            batch.map(async (eId) => {
              try {
                return await contractService.getEvent(eId);
              } catch {
                return null;
              }
            })
          ))
        );
      }

      for (const e of fetchedEvs) {
        if (e && e.profile_id === id) {
          evs.push(e);
        }
      }

      setSelectedProfile(profile);
      setSelectedMapping(mapping);
      setSelectedReview(review);
      setEffectiveStatus(eff);
      setProfileEvents(evs);
      onSelectProfile?.(id);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dossier');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleSearchById = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(searchId.trim(), 10);
    if (isNaN(id) || id <= 0) {
      setError('Please enter a valid positive profile ID.');
      idInputRef.current?.focus();
      return;
    }
    await loadDossier(id);
  };

  const handleSearchByNonce = async (e: React.FormEvent) => {
    e.preventDefault();
    const owner = searchOwner.trim();
    const nonce = searchNonce.trim();
    if (!owner) {
      setError('Custodian Address is required.');
      ownerInputRef.current?.focus();
      return;
    }
    if (!nonce) {
      setError('Client Nonce is required.');
      nonceInputRef.current?.focus();
      return;
    }
    try {
      setDossierLoading(true);
      setError(null);
      const id = await contractService.getProfileIdByNonce(owner, nonce, true);
      if (id === 0) {
        setError(`No profile found for owner ${owner} and nonce ${nonce}.`);
        nonceInputRef.current?.focus();
        return;
      }
      await loadDossier(id);
    } catch (err: any) {
      setError(err?.message || 'Nonce lookup failed');
    } finally {
      setDossierLoading(false);
    }
  };

  const handleSearchByFingerprint = async (e: React.FormEvent) => {
    e.preventDefault();
    const fp = searchFingerprint.trim();
    if (!fp) {
      setError('Fingerprint is required.');
      fpInputRef.current?.focus();
      return;
    }
    try {
      setDossierLoading(true);
      setError(null);
      const id = await contractService.getProfileIdByFingerprint(fp, true);
      if (id === 0) {
        setError(`No profile found matching fingerprint ${fp}.`);
        fpInputRef.current?.focus();
        return;
      }
      await loadDossier(id);
    } catch (err: any) {
      setError(err?.message || 'Fingerprint lookup failed');
    } finally {
      setDossierLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(profileCount / PAGE_SIZE));

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Public Dossier Audit & Profile Lookup</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchProfilePage(currentPage)}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Records'}
          </button>
        </div>
        <p className="card-desc">
          Wallet-free public audit ledger. Search existing records by Profile ID, Client Nonce, or Profile Fingerprint.
        </p>

        {error && (
          <div className="alert-banner alert-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <div className="workbench-grid" style={{ marginBottom: '16px' }}>
          <div>
            <form onSubmit={handleSearchById}>
              <div className="form-group">
                <label htmlFor="search-profile-id" className="form-label">
                  Lookup by Profile ID
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="search-profile-id"
                    ref={idInputRef}
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 1"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Search
                  </button>
                </div>
              </div>
            </form>

            <form onSubmit={handleSearchByFingerprint} style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label htmlFor="search-fingerprint" className="form-label">
                  Lookup by Consequential Fingerprint
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="search-fingerprint"
                    ref={fpInputRef}
                    type="text"
                    className="form-input mono"
                    placeholder="64-hex character sha256 hash"
                    value={searchFingerprint}
                    onChange={(e) => setSearchFingerprint(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm">
                    Search
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div>
            <form onSubmit={handleSearchByNonce}>
              <div className="form-group">
                <label htmlFor="search-owner" className="form-label">
                  Lookup by Custodian & Client Nonce
                </label>
                <input
                  id="search-owner"
                  ref={ownerInputRef}
                  type="text"
                  className="form-input mono"
                  placeholder="Custodian 0x... address"
                  value={searchOwner}
                  onChange={(e) => setSearchOwner(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="search-nonce"
                    ref={nonceInputRef}
                    type="text"
                    className="form-input"
                    placeholder="Client Nonce (e.g. FY24-PROC-001)"
                    value={searchNonce}
                    onChange={(e) => setSearchNonce(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Search
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Profile Registry Table with Bounded Pagination */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
              Registered Record Profiles ({profileCount} Total, Page {currentPage} of {totalPages})
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fetchProfilePage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
              >
                &larr; Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fetchProfilePage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                Next &rarr;
              </button>
            </div>
          </div>

          {profiles.length > 0 ? (
            <div
              tabIndex={0}
              role="region"
              aria-label="Registered Record Profiles Table"
              style={{ overflowX: 'auto' }}
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Template</th>
                    <th>Nonce</th>
                    <th>Status</th>
                    <th>Effective</th>
                    <th>Hold</th>
                    <th>Custodian</th>
                    <th>Officer</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.profile_id}>
                      <td className="mono">#{p.profile_id}</td>
                      <td>{p.template === 'PROCUREMENT_WORKING_FILES' ? 'GRS 1.1 Procurement' : 'GRS 5.1 Policy'}</td>
                      <td className="mono">{p.client_nonce}</td>
                      <td>
                        <span className={`status-badge status-${p.state}`}>{p.state}</span>
                      </td>
                      <td>
                        {selectedProfileId === p.profile_id && effectiveStatus ? (
                          <span className={`status-badge status-${effectiveStatus}`}>{effectiveStatus}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{p.audit_hold_active ? <span className="status-badge status-HOLD">HOLD</span> : 'No'}</td>
                      <td className="mono" title={p.custodian}>
                        {formatShortAddress(p.custodian)}
                      </td>
                      <td className="mono" title={p.officer}>
                        {formatShortAddress(p.officer)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => loadDossier(p.profile_id)}
                        >
                          View Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {loading ? 'Loading profiles from Studionet...' : 'No profiles created yet in this contract.'}
            </p>
          )}
        </div>
      </div>

      {/* Selected Dossier Detailed View */}
      {dossierLoading && (
        <div className="card" aria-live="polite">
          <p>Loading authoritative dossier from on-chain storage...</p>
        </div>
      )}

      {selectedProfile && selectedMapping && selectedReview && !dossierLoading && (
        <div className="card" style={{ borderTop: '4px solid var(--navy-primary)' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title serif-title">
                Record Series Disposition Dossier: Profile #{selectedProfile.profile_id}
              </h2>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Nonce: {selectedProfile.client_nonce} | Fingerprint: {selectedProfile.fingerprint}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`status-badge status-${selectedProfile.state}`}>
                State: {selectedProfile.state}
              </span>
              {effectiveStatus && (
                <span className={`status-badge status-${effectiveStatus}`}>
                  Effective: {effectiveStatus}
                </span>
              )}
            </div>
          </div>

          <div className="workbench-grid">
            {/* Left Column: Profile & Attributes */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginBottom: '8px' }}>
                Profile Specification & Timeline
              </h3>
              <div className="dossier-grid">
                <span className="dossier-label">Template:</span>
                <span className="dossier-value">
                  {selectedProfile.template} ({selectedProfile.grs_family})
                </span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Creation Date:</span>
                <span className="dossier-value mono">{selectedProfile.creation_date || '—'}</span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Cutoff Date:</span>
                <span className="dossier-value mono">
                  {selectedProfile.cutoff_date || '—'}
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Trigger semantics: {selectedProfile.template === 'PROCUREMENT_WORKING_FILES' ? 'Final Payment or Contract Cancellation' : 'Business-Use Cessation'}
                  </span>
                </span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Custodian (Owner):</span>
                <span className="dossier-value mono">{selectedProfile.custodian || '—'}</span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Records Officer:</span>
                <span className="dossier-value mono">{selectedProfile.officer || '—'}</span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Mapping Attempts:</span>
                <span className="dossier-value">
                  {selectedProfile.mapping_attempts} / 3
                  {selectedProfile.last_attempt_timestamp && (
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Last Attempt: {selectedProfile.last_attempt_timestamp}
                    </span>
                  )}
                </span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Audit Hold:</span>
                <span className="dossier-value">
                  {selectedProfile.audit_hold_active ? (
                    <span style={{ color: 'var(--amber-primary)', fontWeight: 600 }}>
                      ACTIVE (Reason: {selectedProfile.audit_hold_reason || 'None specified'})
                    </span>
                  ) : (
                    'None active'
                  )}
                </span>
              </div>
              {selectedProfile.successor_id > 0 && (
                <div className="dossier-grid">
                  <span className="dossier-label">Superseded By:</span>
                  <span className="dossier-value mono" style={{ color: 'var(--badge-super-txt)', fontWeight: 600 }}>
                    Profile #{selectedProfile.successor_id}
                  </span>
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Canonical Attributes JSON:
                </h4>
                <pre
                  className="mono"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    padding: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedProfile.attributes_json}
                </pre>
              </div>
            </div>

            {/* Right Column: Consensus Mapping & Officer Review */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginBottom: '8px' }}>
                Validator Consensus & NARA Schedule Mapping
              </h3>

              <div className="dossier-grid">
                <span className="dossier-label">Mapping Outcome:</span>
                <span className="dossier-value">
                  {selectedProfile.mapping_attempts > 0 ? (
                    <>
                      <strong>{selectedMapping.outcome}</strong>
                      {selectedMapping.reason_code && (
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>
                          Reason: {selectedMapping.reason_code}
                        </span>
                      )}
                    </>
                  ) : (
                    'Not mapped yet'
                  )}
                </span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Schedule Authority:</span>
                <span className="dossier-value">
                  {selectedProfile.mapping_attempts > 0 && selectedMapping.schedule_number ? (
                    <>
                      {selectedMapping.schedule_number} - {selectedMapping.schedule_title} ({selectedMapping.schedule_version})
                      {selectedMapping.pdf_url && (
                        <>
                          <br />
                          <a
                            href={selectedMapping.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--navy-primary)', fontSize: '12px' }}
                          >
                            View Official NARA Source CSV &rarr;
                          </a>
                        </>
                      )}
                    </>
                  ) : (
                    'Not mapped yet'
                  )}
                </span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Matched Item & Authority:</span>
                <span className="dossier-value">
                  {selectedProfile.mapping_attempts > 0 && selectedMapping.item ? (
                    <>
                      Item {selectedMapping.item} (Authority: <span className="mono">{selectedMapping.disposition_authority || '—'}</span>{selectedMapping.page ? `, Page ${selectedMapping.page}` : ''})
                    </>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Disposition Class:</span>
                <span className="dossier-value">
                  {selectedProfile.mapping_attempts > 0 && selectedMapping.disposition_class !== 'NOT_APPLICABLE' ? (
                    `${selectedMapping.disposition_class} (Retention: ${selectedMapping.retention_months} Months)`
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Earliest Review Date:</span>
                <span className="dossier-value mono" style={{ fontWeight: 600 }}>
                  {selectedProfile.mapping_attempts > 0 && selectedMapping.earliest_review_date ? selectedMapping.earliest_review_date : 'N/A'}
                </span>
              </div>
              <div className="dossier-grid">
                <span className="dossier-label">Officer Acceptance:</span>
                <span className="dossier-value">
                  {selectedProfile.mapping_attempts > 0 ? (
                    selectedMapping.is_accepted ? (
                      <span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
                        ACCEPTED {selectedMapping.accepted_timestamp ? `on ${selectedMapping.accepted_timestamp}` : '(Timestamp not exposed by contract)'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--amber-primary)' }}>
                        Pending Records Officer Acceptance
                      </span>
                    )
                  ) : (
                    'Not mapped yet'
                  )}
                </span>
              </div>

              {/* Disposition Review Sub-section */}
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginBottom: '8px' }}>
                  Disposition Review Status
                </h3>
                <div className="dossier-grid">
                  <span className="dossier-label">Review Request:</span>
                  <span className="dossier-value">
                    {selectedProfile.review_requested || selectedReview.review_requested ? (
                      selectedReview.requested_timestamp
                        ? `Requested on ${selectedReview.requested_timestamp}`
                        : 'Requested (Timestamp not exposed by contract)'
                    ) : (
                      'No review requested yet'
                    )}
                  </span>
                </div>
                <div className="dossier-grid">
                  <span className="dossier-label">Officer Decision:</span>
                  <span className="dossier-value">
                    {selectedProfile.review_decided || selectedReview.is_decided ? (
                      <span style={{ fontWeight: 600, color: selectedReview.action.includes('AUTHORIZE') ? 'var(--green-primary)' : 'var(--text-main)' }}>
                        {selectedReview.action} {selectedReview.reason_code ? `(Reason: ${selectedReview.reason_code})` : ''}
                        <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                          {selectedReview.decided_timestamp
                            ? `Decided on ${selectedReview.decided_timestamp}`
                            : 'Decided (Timestamp not exposed by contract)'}
                        </span>
                      </span>
                    ) : selectedProfile.review_requested || selectedReview.review_requested ? (
                      'Pending Review Decision'
                    ) : (
                      'No review requested yet'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Source Evidence Cross-Reference */}
          <div style={{ marginTop: '24px', backgroundColor: 'var(--bg-surface)', padding: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Official NARA Schedule Evidence Reference
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {selectedProfile.template === 'PROCUREMENT_WORKING_FILES' ? (
                <>
                  <strong>{OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.scheduleNumber}</strong>: {OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.scheduleTitle} ({OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.scheduleVersion}).
                  Official records (Item 010) are retained for 72 months after final payment/cancellation. Administrative reference copies (Item 011) are retained until business use ceases (0 additional months).
                </>
              ) : (
                <>
                  <strong>{OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.scheduleNumber}</strong>: {OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.scheduleTitle} ({OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.scheduleVersion}).
                  Office/unit administrative policies (Item 010) are retained until business use ceases (0 additional months).
                </>
              )}
            </p>
          </div>

          {/* Profile Event Timeline with visible audit range */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
              Immutable Audit Event History ({profileEvents.length} Events)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              Showing matching profile events from the most recent {MAX_DOSSIER_EVENTS} global ledger events.
            </span>
            {profileEvents.length > 0 ? (
              <div tabIndex={0} role="region" aria-label="Profile Event History Table" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event #</th>
                      <th>Type</th>
                      <th>Actor</th>
                      <th>Details</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileEvents.map((ev) => (
                      <tr key={ev.event_id}>
                        <td className="mono">#{ev.event_id}</td>
                        <td>
                          <strong>{ev.event_type}</strong>
                        </td>
                        <td className="mono" title={ev.actor}>
                          {formatShortAddress(ev.actor)}
                        </td>
                        <td className="mono" style={{ fontSize: '12px' }}>
                          {ev.details}
                        </td>
                        <td className="mono" style={{ fontSize: '12px' }}>
                          {ev.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                No events recorded in the recent audit window for this profile.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
