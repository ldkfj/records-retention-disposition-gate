import React, { useEffect, useState } from 'react';
import { walletService } from './services/walletService.ts';
import { journalService } from './services/journalService.ts';
import { contractService } from './services/contractService.ts';
import { WalletState, TxStep } from './types/domain.ts';
import { Header } from './components/Header.tsx';
import { DeploymentBanner } from './components/DeploymentBanner.tsx';
import { WalletModal } from './components/WalletModal.tsx';
import { TransactionTracker } from './components/TransactionTracker.tsx';
import { PublicLookup } from './components/PublicLookup.tsx';
import { CustodianWorkbench } from './components/CustodianWorkbench.tsx';
import { OfficerWorkbench } from './components/OfficerWorkbench.tsx';
import { AuditorWorkbench } from './components/AuditorWorkbench.tsx';
import { SourceEvidenceView } from './components/SourceEvidenceView.tsx';
import { EventTimeline } from './components/EventTimeline.tsx';

type TabKey = 'PUBLIC_LOOKUP' | 'CUSTODIAN' | 'OFFICER' | 'AUDITOR' | 'EVIDENCE' | 'EVENTS';

export const App: React.FC = () => {
  const [walletState, setWalletState] = useState<WalletState>(walletService.getState());
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>('PUBLIC_LOOKUP');
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  // Global Transaction Tracker State
  const [txStep, setTxStep] = useState<TxStep>('IDLE');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txDetail, setTxDetail] = useState<any>(null);

  useEffect(() => {
    // EIP-6963 discovery initialization
    const cleanupEip = walletService.initEIP6963();
    const unsubWallet = walletService.subscribe((s) => setWalletState(s));

    // Reload reconciliation of pending operations with AbortSignal teardown
    const abortController = new AbortController();
    journalService
      .reconcilePendingOperations(
        undefined,
        async (op) => {
          return await contractService.verifyPendingOperation(op);
        },
        abortController.signal
      )
      .catch(() => {});

    return () => {
      abortController.abort();
      cleanupEip();
      unsubWallet();
    };
  }, []);

  const handleTxStepChange = (step: TxStep, detail?: any) => {
    setTxStep(step);
    setTxDetail(detail);

    if (step === 'SUBMITTED' || step === 'CONSENSUS_POLLING' || step === 'READBACK') {
      if (detail?.txHash) setTxHash(detail.txHash);
    } else if (step === 'SUCCESS') {
      if (detail?.txHash) setTxHash(detail.txHash);
      setTxError(null);
    } else if (step === 'ERROR') {
      setTxError(detail?.error || 'Transaction encountered an error.');
    }
  };

  const handleClearTx = () => {
    setTxStep('IDLE');
    setTxHash(null);
    setTxError(null);
    setTxDetail(null);
  };

  return (
    <div className="app-container">
      <Header
        walletState={walletState}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onDisconnect={() => walletService.disconnect()}
      />

      <DeploymentBanner />

      <TransactionTracker
        step={txStep}
        txHash={txHash}
        error={txError}
        detail={txDetail}
        onClear={handleClearTx}
      />

      {/* Navigation Tabs */}
      <nav className="nav-tabs" aria-label="Workbench sections">
        <button
          type="button"
          className={`nav-tab ${activeTab === 'PUBLIC_LOOKUP' ? 'active' : ''}`}
          onClick={() => setActiveTab('PUBLIC_LOOKUP')}
        >
          Public Lookup & Audit
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'CUSTODIAN' ? 'active' : ''}`}
          onClick={() => setActiveTab('CUSTODIAN')}
        >
          Custodian Workbench
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'OFFICER' ? 'active' : ''}`}
          onClick={() => setActiveTab('OFFICER')}
        >
          Records Officer Workbench
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'AUDITOR' ? 'active' : ''}`}
          onClick={() => setActiveTab('AUDITOR')}
        >
          Auditor Workbench
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'EVIDENCE' ? 'active' : ''}`}
          onClick={() => setActiveTab('EVIDENCE')}
        >
          NARA Source Evidence
        </button>
        <button
          type="button"
          className={`nav-tab ${activeTab === 'EVENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('EVENTS')}
        >
          Immutable Event Log
        </button>
      </nav>

      {/* Tab Content Panes */}
      <main>
        {activeTab === 'PUBLIC_LOOKUP' && (
          <PublicLookup
            onSelectProfile={(id) => {
              setSelectedProfileId(id);
            }}
          />
        )}

        {activeTab === 'CUSTODIAN' && (
          <CustodianWorkbench
            onStepChange={handleTxStepChange}
            selectedProfileId={selectedProfileId}
          />
        )}

        {activeTab === 'OFFICER' && (
          <OfficerWorkbench
            onStepChange={handleTxStepChange}
            selectedProfileId={selectedProfileId}
          />
        )}

        {activeTab === 'AUDITOR' && (
          <AuditorWorkbench
            onStepChange={handleTxStepChange}
            selectedProfileId={selectedProfileId}
          />
        )}

        {activeTab === 'EVIDENCE' && <SourceEvidenceView />}

        {activeTab === 'EVENTS' && <EventTimeline />}
      </main>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </div>
  );
};
export default App;
