import React from 'react';
import { TxStep } from '../types/domain.ts';

interface TransactionTrackerProps {
  step: TxStep;
  txHash: string | null;
  error: string | null;
  detail: any;
  onClear: () => void;
  onRetry?: () => void;
}

export const TransactionTracker: React.FC<TransactionTrackerProps> = ({
  step,
  txHash,
  error,
  detail,
  onClear,
  onRetry,
}) => {
  if (step === 'IDLE') return null;

  const steps: { key: TxStep; label: string }[] = [
    { key: 'SIGNING', label: '1. Wallet Sign' },
    { key: 'SUBMITTED', label: '2. Submitted' },
    { key: 'CONSENSUS_POLLING', label: '3. GenLayer Consensus' },
    { key: 'READBACK', label: '4. Contract Readback' },
    { key: 'SUCCESS', label: '5. Finalized' },
  ];

  const getStepClass = (sKey: TxStep) => {
    if (step === 'ERROR') return 'tx-step-badge';
    if (step === sKey) return 'tx-step-badge active';

    const order = ['SIGNING', 'SUBMITTED', 'CONSENSUS_POLLING', 'READBACK', 'SUCCESS'];
    const currentIndex = order.indexOf(step);
    const stepIndex = order.indexOf(sKey);

    if (currentIndex > stepIndex) return 'tx-step-badge completed';
    return 'tx-step-badge';
  };

  return (
    <div className="tx-tracker" aria-live="polite">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Transaction Status: {step}</strong>
        {step === 'SUCCESS' || step === 'ERROR' ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClear}>
            Dismiss
          </button>
        ) : null}
      </div>

      <div className="tx-step-list">
        {steps.map((s) => (
          <span key={s.key} className={getStepClass(s.key)}>
            {s.label}
          </span>
        ))}
      </div>

      {txHash && (
        <div style={{ marginTop: '8px', fontSize: '13px' }}>
          <span>Tx Hash: </span>
          <span className="mono">{txHash}</span>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-error" role="alert" style={{ marginTop: '8px' }}>
          <strong>Error:</strong> {error}
          {onRetry && (
            <div style={{ marginTop: '6px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
                Retry Action
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'SUCCESS' && (
        <div className="alert-banner alert-success" style={{ marginTop: '8px' }}>
          Transaction finalized on-chain and verified via authoritative readback!
          {detail?.profileId && <span> Profile ID: #{detail.profileId}</span>}
          {detail?.outcome && <span> (Outcome: {detail.outcome})</span>}
        </div>
      )}
    </div>
  );
};
