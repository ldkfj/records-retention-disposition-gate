import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EIP6963ProviderDetail } from '../types/domain.ts';
import { walletService } from '../services/walletService.ts';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setError(null);
      setConnecting(false);
      setProviders(walletService.getDiscoveredProviders());

      // Inert background elements
      const appRoot = document.querySelector('.app-container');
      if (appRoot) {
        appRoot.setAttribute('aria-hidden', 'true');
        (appRoot as any).inert = true;
      }

      // Focus modal first interactive element
      setTimeout(() => {
        const firstBtn = modalRef.current?.querySelector('button') as HTMLButtonElement;
        firstBtn?.focus();
      }, 50);
    } else {
      const appRoot = document.querySelector('.app-container');
      if (appRoot) {
        appRoot.removeAttribute('aria-hidden');
        (appRoot as any).inert = false;
      }
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      const appRoot = document.querySelector('.app-container');
      if (appRoot) {
        appRoot.removeAttribute('aria-hidden');
        (appRoot as any).inert = false;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectProvider = async (detail: EIP6963ProviderDetail) => {
    try {
      setConnecting(true);
      setError(null);
      await walletService.connectProvider(detail);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
      >
        <div className="modal-header">
          <h2 id="wallet-modal-title" className="modal-title">
            Connect Supported Wallet
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Select a verified EIP-6963 wallet extension. RRDG supports MetaMask, OKX Wallet, and Rabby.
        </p>

        {error && (
          <div className="alert-banner alert-error" role="alert" style={{ marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <div className="wallet-list">
          {providers.length > 0 ? (
            providers.map((detail) => (
              <button
                key={detail.info.uuid || detail.info.rdns}
                type="button"
                className="wallet-option"
                onClick={() => handleSelectProvider(detail)}
                disabled={connecting}
              >
                <div>
                  <div className="wallet-option-name">{detail.info.name}</div>
                  <div className="wallet-option-rdns">{detail.info.rdns}</div>
                </div>
                <div>
                  {connecting ? 'Connecting...' : 'Connect'}
                </div>
              </button>
            ))
          ) : (
            <div className="alert-banner alert-warning">
              No supported wallet detected. Please install or enable MetaMask, OKX Wallet, or Rabby in your browser.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
