# Studionet Deployment and Recovery Manifest

Status: `PRINCIPAL LIVE VERIFIED — POST_DEPLOY_TEST APPROVED; VERCEL INDEPENDENT-WALLET E2E PASSED; FINAL REVIEW PENDING`

## Principal deployment

- Classification: `UPGRADABLE`
- Network / chain ID: GenLayer Studionet / `61999`
- RPC: `https://studio.genlayer.com/api`
- Source commit: `d4ffc520c54690324e17a5cf919fcc20e28bea77`
- Contract blob: `bf09388c6b621d4381c2bebc64ffa6175c41d63d`
- Contract SHA-256: `be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525`
- Contract: `0xE679b4345BF5AB03105A51Ef41743545139cD61C`
- Deployment tx: `0x27c9128e80a02066a75d682fac25835a9ed46d59f850a0adc5dd1e390647a4d7`
- Deployer/upgrader: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Auditor: `0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1`
- Linked contracts: none
- GitHub repository: `https://github.com/ldkfj/records-retention-disposition-gate`
- GitHub release commit: `3c088d34cddee52ee0ed8d5cf20d100a33a875f8`
- GitHub release tree: `e619c2d0361f7427ba987f5269de642dd4c7b26d`
- Vercel project: `https://vercel.com/gam9/records-retention-disposition-gate`
- Production deployment: `https://records-retention-disposition-gate.vercel.app`
- Deployment inspection: `https://vercel.com/gam9/records-retention-disposition-gate/7KDhbKJCmErxtmdT13NrT6Ftmdt1`
- Deployment ID: `dpl_7KDhbKJCmErxtmdT13NrT6Ftmdt1`; target `production`; status `READY`

The consequential matrix is documented in `docs/VERIFICATION.md`. Direct Studionet code readback matches the reviewed source byte-for-byte.

The exact production release passed independent-wallet E2E with user-approved OKX connection and signature while the primary AI operated the visible flow. The chain/contract banner, workbench navigation, authoritative NARA CSV labels, provenance-only PDF labels, and profile 5 creation with canonical `MICROPURCHASE` attributes were verified.

The final procurement acceptance correction is transaction `0x0b52ec29ff869c50cd40fa61b0a8b98c7d696effae976b2c2bdd937faf0a681c`; finalized readback confirms profile 1 is mapping-accepted. The earlier malformed call is retained in `docs/VERIFICATION.md` as negative diagnostic evidence, not as a successful acceptance.

## Upgrade model and rehearsal

The constructor registers the locked upgrader in `gl.storage.Root.get().upgraders`; only a registered upgrader may replace Root Slot code. Storage fields must not be removed, reordered, or retyped without an explicit migration plan and fresh review.

- Rehearsal address: `0x77ae5d47Da146024a7C45039155781A1eF4af224`
- Deployment tx: `0xa97ba3d1c10cc749900a168d78973dd7b9e3735ac700661aed5bd27f6faf7f53`
- Populated-state tx: `0xed433bbe3df2fcd5196b09fd78acfc5b44745c6eb4bfded8dd06f4f709dad491`
- Same-source upgrade tx: `0x8e9b8c1ab6aecb33201339b8de4bff96bef7198988a32acded431fd46989df19`

Post-upgrade state, upgrader, and 67,927-byte source hash were preserved exactly.

## Recovery limits and runbook

- If Studio UI state is lost but chain/account access remains, import the principal address, load source from the recorded commit, verify `gen_getContractCode` SHA-256, then upgrade only when required.
- If the recorded upgrader is unavailable, deploy a replacement from this manifest, rerun the full Studio matrix, obtain fresh review, and update frontend/public evidence.
- If Studionet resets, redeploy the exact recorded source and constructor, rerun the full matrix, and replace every public address/evidence reference.
- Never upgrade the principal contract merely as a demonstration; use a separate rehearsal deployment.

Earlier failed addresses remain diagnostic history only and are not release targets.
