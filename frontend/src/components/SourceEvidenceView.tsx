import React, { useEffect, useState } from 'react';
import { contractService } from '../services/contractService.ts';
import { SourceMetadata } from '../types/domain.ts';
import { OFFICIAL_NARA_SOURCES } from '../config/chain.ts';

export const SourceEvidenceView: React.FC = () => {
  const [procurementMeta, setProcurementMeta] = useState<SourceMetadata | null>(null);
  const [policyMeta, setPolicyMeta] = useState<SourceMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [pMeta, polMeta] = await Promise.all([
          contractService.getSourceMetadata('PROCUREMENT_WORKING_FILES'),
          contractService.getSourceMetadata('ADMINISTRATIVE_POLICY_FILES'),
        ]);
        setProcurementMeta(pMeta);
        setPolicyMeta(polMeta);
      } catch (err: any) {
        setError(err?.message || 'Failed to load source metadata');
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Official NARA General Records Schedules (GRS) Evidence</h2>
      </div>
      <p className="card-desc">
        RRDG validators independently fetch and verify rows from the allowlisted official National Archives and Records Administration (NARA) schedule CSV. Linked PDFs are provenance references only. {loading && '(Loading metadata...)'}
      </p>

      {error && (
        <div className="alert-banner alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="workbench-grid">
        {/* GRS 1.1 Card */}
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--navy-primary)', marginBottom: '8px' }}>
            {OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.scheduleNumber}: {OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.scheduleTitle}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Version: {OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.scheduleVersion}
          </p>

          <div className="dossier-grid">
            <span className="dossier-label">Template ID:</span>
            <span className="dossier-value mono">PROCUREMENT_WORKING_FILES</span>
          </div>
          <div className="dossier-grid">
            <span className="dossier-label">Authoritative NARA CSV URL:</span>
            <span className="dossier-value">
              <a
                href={OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.csvUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--navy-primary)' }}
              >
                {OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.csvUrl} &rarr;
              </a>
            </span>
          </div>
          <div className="dossier-grid">
            <span className="dossier-label">Provenance PDF (reference only):</span>
            <span className="dossier-value">
              <a
                href={OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.pdfUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--navy-primary)' }}
              >
                {OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.pdfUrl} &rarr;
              </a>
            </span>
          </div>
          {procurementMeta && (
            <div className="dossier-grid">
              <span className="dossier-label">On-Chain Parity:</span>
              <span className="dossier-value" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
                VERIFIED ({procurementMeta.schedule_number} {procurementMeta.schedule_version})
              </span>
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Allowlisted Schedule Items:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {OFFICIAL_NARA_SOURCES.PROCUREMENT_WORKING_FILES.items.map((item) => (
                <div
                  key={item.item}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    padding: '8px 10px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>Item {item.item}: {item.dispositionAuthority}</strong>
                    <span className="status-badge status-DRAFT">{item.dispositionClass}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{item.description}</p>
                  <div>
                    <strong>Trigger:</strong> <span className="mono">{item.trigger}</span> ({item.retentionMonths} Months)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GRS 5.1 Card */}
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--navy-primary)', marginBottom: '8px' }}>
            {OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.scheduleNumber}: {OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.scheduleTitle}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Version: {OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.scheduleVersion}
          </p>

          <div className="dossier-grid">
            <span className="dossier-label">Template ID:</span>
            <span className="dossier-value mono">ADMINISTRATIVE_POLICY_FILES</span>
          </div>
          <div className="dossier-grid">
            <span className="dossier-label">Authoritative NARA CSV URL:</span>
            <span className="dossier-value">
              <a
                href={OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.csvUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--navy-primary)' }}
              >
                {OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.csvUrl} &rarr;
              </a>
            </span>
          </div>
          <div className="dossier-grid">
            <span className="dossier-label">Provenance PDF (reference only):</span>
            <span className="dossier-value">
              <a
                href={OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.pdfUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--navy-primary)' }}
              >
                {OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.pdfUrl} &rarr;
              </a>
            </span>
          </div>
          {policyMeta && (
            <div className="dossier-grid">
              <span className="dossier-label">On-Chain Parity:</span>
              <span className="dossier-value" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
                VERIFIED ({policyMeta.schedule_number} {policyMeta.schedule_version})
              </span>
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Allowlisted Schedule Items:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {OFFICIAL_NARA_SOURCES.ADMINISTRATIVE_POLICY_FILES.items.map((item) => (
                <div
                  key={item.item}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    padding: '8px 10px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong>Item {item.item}: {item.dispositionAuthority}</strong>
                    <span className="status-badge status-DRAFT">{item.dispositionClass}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{item.description}</p>
                  <div>
                    <strong>Trigger:</strong> <span className="mono">{item.trigger}</span> ({item.retentionMonths} Months)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
