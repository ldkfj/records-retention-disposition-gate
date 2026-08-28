# Records Retention Disposition Gate

Records Retention Disposition Gate is a GenLayer application that maps frozen records profiles to bounded NARA General Records Schedule evidence, then enforces distinct custodian, records-officer, and auditor actions before disposition can be authorized.

## Verified links

- Studionet contract: [`0xE679...D61C`](https://explorer-studio.genlayer.com/address/0xE679b4345BF5AB03105A51Ef41743545139cD61C)
- Deployment and recovery manifest: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Live proof: [`docs/VERIFICATION.md`](docs/VERIFICATION.md)
- GitHub revision: [`a61ba14`](https://github.com/ldkfj/records-retention-disposition-gate/commit/a61ba14bb41bbcdec7756e8090fe2c8a61ab5152)
- Live web application: [`records-retention-disposition-gate.vercel.app`](https://records-retention-disposition-gate.vercel.app)

## Trust problem

A custodian could seek an inappropriately short retention mapping, while a records officer could accept an unsupported schedule item. The application freezes closed-schema inputs before assessment, binds decisions to an allowlisted NARA source and consequential fields, and separates owner, officer, and auditor authority.

## Why GenLayer is essential

The Intelligent Contract fetches the official NARA Transmittal 36 CSV, deterministically validates the required schedule rows, and asks validators to agree on the bounded mapping outcome. Consensus controls consequential on-chain state. Missing, malformed, conflicting, or ambiguous evidence fails closed as `UNRESOLVED`.

## How it works

1. A custodian creates a closed-schema profile and freezes it.
2. GenLayer validators assess it against the allowlisted NARA schedule evidence.
3. If evidence is unresolved, the custodian may retry within the bounded policy.
4. A distinct assigned records officer accepts a supported mapping.
5. The owner requests review; the officer authorizes disposition, transfer, hold, or reclassification as permitted by the mapped class.
6. The configured auditor can place or clear an audit hold. Owners can link a successor without erasing prior state.
7. Anyone can inspect profiles, mappings, reviews, source metadata, and the event log.

## Architecture

- `contracts/records_retention_disposition_gate.py`: authoritative profiles, mappings, reviews, holds, supersession links, events, evidence bounds, and upgrade authorization.
- `frontend/`: React/TypeScript workbench using `genlayer-js`; wallet discovery is restricted to available MetaMask, OKX Wallet, and Rabby EIP-6963 providers.
- `tests/direct/`: Direct Mode contract regression suite.
- `scripts/preflight_nara_sources.py`: official-source reachability and row-validation preflight.

Chain state is authoritative. The frontend keeps only bounded reconciliation metadata and verifies consequential writes through finality, execution result, and post-transaction readback.

## Intelligent Contract

Actors are profile owner/custodian, assigned records officer, configured auditor, and locked upgrader. Core states include `DRAFT`, `FROZEN`, `MAPPED`, `HOLD_UNRESOLVED`, authorization outcomes, and `SUPERSEDED`. Key methods include profile creation/freezing, assessment/retry, officer acceptance, audit holds, disposition review, and supersession.

Validator equivalence is bounded to normalized consequential fields after deterministic CSV validation. The contract derives the consequential fingerprint deterministically; it never asks an LLM to calculate a cryptographic digest.

## Transaction lifecycle

The frontend connects only after explicit provider selection, switches/adds Studionet when needed, prevents duplicate submission, and journals pending writes for reload reconciliation. A write is not successful until it reaches `FINALIZED`, execution succeeds, and authoritative readback confirms expected state. Rate-limit retries are bounded.

## Run locally

Prerequisites: Python 3.13, Node.js/npm, and dependencies declared in `pyproject.toml` and `frontend/package-lock.json`.

```text
python -m pytest -q
python -m ruff check .
cd frontend
npm ci
copy .env.example .env.local
npm run dev
```

`frontend/.env.example` contains the verified Studionet contract address. Never replace it with a placeholder or another project/network address.

## Tests and verification

```text
python -m pytest -q
python -m ruff check .
python scripts/preflight_nara_sources.py
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

Current baseline: 38 contract tests and 42 frontend tests pass; Ruff, typecheck, lint, and production build pass. Studionet transactions/readbacks are in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).

## Deployment

The principal release uses Studionet chain ID `61999` and contract `0xE679b4345BF5AB03105A51Ef41743545139cD61C`. Direct `gen_getContractCode` readback matches the reviewed 67,927-byte source and SHA-256. Recovery was rehearsed separately with populated-state preservation; see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Security and trust boundaries

- Owner and officer must be distinct; role and ordering violations fail without mutation.
- Evidence URLs, templates, rows, byte size, fields, and mapping attempts are bounded.
- Auditor authority cannot select or approve a mapping.
- Upgrade authority is limited to the recorded upgrader.
- Browser state and screenshots are not authoritative evidence; finalized chain state is.

## Known limitations

- This ledger does not delete or transfer records.
- It does not replace agency-specific schedules, resolve legal holds, or provide legal advice.
- Interpretation is limited to closed templates and exact NARA rows encoded by the contract.
- Studionet may reset; recovery depends on recorded source/constructor values and upgrader access.
- Independent-wallet Vercel E2E passed on the exact public release; final anonymous checkpoint approval remains pending. See [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
