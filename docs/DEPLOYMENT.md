# Studionet Deployment and Recovery Manifest

Status: `PRE_DEPLOY DRAFT — NO DEPLOYMENT TRANSACTION SENT`

## Locked deployment configuration

- Classification: `UPGRADABLE`
- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Contract/frontend implementation commit: `58d7372f5d6fdb3c6d8e6af3f475bf9b278beda3`
- Exact review package commit: recorded in the checkpoint package after this draft is committed
- Contract source SHA-256: `1a409329e1e385b5331e92f6c738a5c9756d010bd4139059125991341b133063`
- Contract Git blob: `fe8836bacbff48e26cb77737a3326236c906e9e9`
- Locked Studio deployer/upgrader: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Constructor `auditor_address`: `0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1`
- Constructor `upgrader_address`: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Linked contracts: none
- Contract address: pending PRE_DEPLOY approval and deployment
- Deployment transaction: pending PRE_DEPLOY approval and deployment
- Explorer: `https://explorer-studio.genlayer.com/` (specific address pending)

The primary AI selected the locked account directly in GenLayer Studio without sending a signature, deployment transaction, or contract write. Changing the deployer/upgrader, constructor values, contract source, or material configuration invalidates PRE_DEPLOY approval.

## Upgrade model

The constructor appends the locked upgrader to `gl.storage.Root.get().upgraders`. Public `upgrade(new_code: bytes)` replaces Root Slot code. Contract tests cover intended upgrader registration, authorized replacement, unauthorized rejection, and storage compatibility. Storage fields must not be reordered, removed, or retyped without an explicit migration plan and fresh review.

## Recovery limits and runbook

Upgrade authority can be permanently lost if the recorded Studio account becomes unavailable. Studionet reset can erase both address and state. No stronger recoverability is claimed.

- Studio UI/local data resets but chain state and account remain: reconnect the recorded upgrader, import the contract by address, load source from the recorded commit, verify code/source parity, then upgrade only if required.
- Recorded upgrader becomes unavailable: the old contract may remain readable but is not recoverable through the lost authority. Deploy a replacement from this manifest, rerun the complete Studio matrix, and update the frontend and public evidence only after the replacement passes.
- Studionet resets: redeploy from the recorded commit and constructor values, rerun the complete Studio matrix, and update all public addresses and evidence.
- Safe upgrade rehearsal: required on a separate test deployment before POST_DEPLOY acceptance.

This file will be updated after deployment with the actual contract address, transaction hash, finality/execution/consensus evidence, exact deployed-source readback, and configuration ledger.
