import React from 'react';
import { WalletState } from '../types/domain.ts';
import { STUDIONET_CONFIG } from '../config/chain.ts';

interface HeaderProps {
  walletState: WalletState;
  onOpenWalletModal: () => void;
  onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  walletState,
  onOpenWalletModal,
  onDisconnect,
}) => {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-section">
          <h1 className="brand-title">Records Retention Disposition Gate</h1>
          <p className="brand-subtitle">
            U.S. National Archives (NARA) GRS Consensus Mapping & Disposition Authorization Ledger
          </p>
        </div>

        <div className="header-actions">
          <div className="network-badge">
            <span className={`network-dot ${walletState.connected && !walletState.isCorrectChain ? 'invalid' : ''}`} />
            <span>{STUDIONET_CONFIG.chainName} ({STUDIONET_CONFIG.chainId})</span>
          </div>

          {walletState.connected && walletState.address ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mono" style={{ fontSize: '13px', padding: '4px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                {walletState.providerName || 'Wallet'}: {walletState.address.slice(0, 6)}...{walletState.address.slice(-4)}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onDisconnect}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenWalletModal}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
