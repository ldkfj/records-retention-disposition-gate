import React from 'react';
import {
  CONTRACT_ADDRESS,
  IS_CONTRACT_ADDRESS_VALID,
  RAW_CONTRACT_ADDRESS,
  STUDIONET_CONFIG,
} from '../config/chain.ts';

export const DeploymentBanner: React.FC = () => {
  if (!RAW_CONTRACT_ADDRESS) {
    return (
      <div className="alert-banner alert-error" role="alert">
        <strong>Configuration Required:</strong> <code>VITE_CONTRACT_ADDRESS</code> is not set in the environment.
        Please configure a valid GenLayer Studionet contract address in <code>.env</code>.
      </div>
    );
  }

  if (!IS_CONTRACT_ADDRESS_VALID) {
    return (
      <div className="alert-banner alert-error" role="alert">
        <strong>Invalid Contract Address:</strong> <code>{RAW_CONTRACT_ADDRESS}</code> is not a valid hex address.
        A 40-hex-character address starting with <code>0x</code> is required.
      </div>
    );
  }

  return (
    <div className="disclaimer-banner">
      <strong>Operational Ledger Notice:</strong> RRDG operates on {STUDIONET_CONFIG.chainName} (Chain ID: {STUDIONET_CONFIG.chainId}).
      Contract: <span className="mono">{CONTRACT_ADDRESS}</span>.
      All disposition decisions are application-local authorizations. RRDG performs no automated deletion or file transfer, and is not legal advice.
    </div>
  );
};
