# Studionet Deployment and Recovery Manifest

Status: `DEPLOYED — POST_DEPLOY_TEST BLOCKED BY LIVE SOURCE RENDER FAILURE (REVISION IN PROGRESS)`

## Defect diagnosis and revised source model

The prior production deployment (`0x527d82829088d2555373675B875Ab10380F40862`) passed deployment and basic state transitions, but failed live assessment because GenLayer Studionet's text rendering sandbox (`gl.nondet.web.render(url, mode="text")`) returns empty string `""` when pointed at binary PDF URLs (`grs01-1.pdf`, `grs05-1.pdf`), triggering `SOURCE_RENDER_EMPTY` on-chain.

**Revised Authoritative Source Model (Attempt 2 Correction):**
- Replaced non-renderable binary PDF fetch with real, reachable official NARA machine-readable schedule CSV:
  - Master Schedule CSV: `https://www.archives.gov/files/records-mgmt/grs/grs-csv-transmittal36.csv`
  - Provenance Schedule PDFs (retained for metadata provenance): `grs01-1.pdf`, `grs05-1.pdf`
- Reverted finite evidence caps to strictly measured bounds: `MAX_EVIDENCE_BYTES = 350_000` and `MAX_RENDERED_TEXT_CHARS = 350_000` (measured real CSV is 89,237 bytes).
- Implemented deterministic pre-LLM CSV parser (`csv.reader(csv_text.splitlines())`) validating header columns, exact target GRS IDs (`GRS 1.1.010`, `GRS 1.1.011`, `GRS 5.1.010`), dispositions (`Temporary`), retention years (`6`, `0`, `0`), and authorities (`DAA-GRS-2013-0003-0001`, `DAA-GRS-2013-0003-0002`, `DAA-GRS-2016-0016-0001`).
- Preserved strict fail-closed validation, SHA-256 evidence digests, consequential fingerprints, storage layout, and ABI compatibility.
- **Critical Notice:** The prior deployment at `0x527d82829088d2555373675B875Ab10380F40862` remains failed POST_DEPLOY evidence and cannot be reused as approval evidence. This corrected revision is prepared for evaluation; no claim of PRE_DEPLOY approval or live deployment is made for this corrected code.

## Prior deployment reference (Failed POST_DEPLOY evidence — Obsolete)

- Classification: `UPGRADABLE`
- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Contract/frontend implementation commit: `58d7372f5d6fdb3c6d8e6af3f475bf9b278beda3`
- Exact review package commit: recorded in the checkpoint package after this draft is committed
- Prior deployed contract source SHA-256: `1a409329e1e385b5331e92f6c738a5c9756d010bd4139059125991341b133063`
- Prior deployed contract Git blob: `fe8836bacbff48e26cb77737a3326236c906e9e9`
- Corrected candidate source SHA-256: `a05bae44b175be424d018712b1713ec3860d7fbff5d7316a9f3b2c8c00cda447`
- Corrected candidate Git blob: `155e02b1e8250e3653a2221c3449f53e9ecc8a97`
- Locked Studio deployer/upgrader: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Constructor `auditor_address`: `0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1`
- Constructor `upgrader_address`: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Linked contracts: none
- Contract address: `0x527d82829088d2555373675B875Ab10380F40862`
- Deployment transaction: `0x1460b8dd8d2ae38a0173fd2f5959ea739011023d14ee30e50f88b1bbf1c6d7e8`
- Explorer: `https://explorer-studio.genlayer.com/address/0x527d82829088d2555373675B875Ab10380F40862`

The production deployment is `FINALIZED` with `MAJORITY_AGREE`; deployed transaction code decodes to SHA-256 `1a409329e1e385b5331e92f6c738a5c9756d010bd4139059125991341b133063`. Constructor readbacks match the locked auditor and upgrader. Changing the deployer/upgrader, constructor values, contract source, or material configuration invalidates the reviewed package.

## Upgrade model

The constructor appends the locked upgrader to `gl.storage.Root.get().upgraders`. Public `upgrade(new_code: bytes)` replaces Root Slot code. Contract tests cover intended upgrader registration, authorized replacement, unauthorized rejection, and storage compatibility. Storage fields must not be reordered, removed, or retyped without an explicit migration plan and fresh review.

## Recovery limits and runbook

Upgrade authority can be permanently lost if the recorded Studio account becomes unavailable. Studionet reset can erase both address and state. No stronger recoverability is claimed.

- Studio UI/local data resets but chain state and account remain: reconnect the recorded upgrader, import the contract by address, load source from the recorded commit, verify code/source parity, then upgrade only if required.
- Recorded upgrader becomes unavailable: the old contract may remain readable but is not recoverable through the lost authority. Deploy a replacement from this manifest, rerun the complete Studio matrix, and update the frontend and public evidence only after the replacement passes.
- Studionet resets: redeploy from the recorded commit and constructor values, rerun the complete Studio matrix, and update all public addresses and evidence.
- Safe upgrade rehearsal: completed on separate address `0x9a129486bB0840184ACFc3B3Ed97a08619a60D3C`; deployment tx `0xc931f68a393e6b5fac5b75a8f699fac7e3a42183d7129ad28e68188d0920e6c8`, exact-source upgrade tx `0x30009c32c63c393c6381a311ea3d3d8c2242e884488282d22f651cd4af92a050`, both `FINALIZED`.

The detailed transaction matrix and current blocker are retained in `internal/RESUME-CHECKPOINT-2026-08-26-POST-DEPLOY-BLOCKED.md`.
