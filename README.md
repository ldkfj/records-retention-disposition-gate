# Records Retention Disposition Gate

Records Retention Disposition Gate (RRDG) is a GenLayer PROJECT that turns a frozen, bounded records profile into a source-grounded NARA General Records Schedule mapping, then requires a distinct records officer to accept that mapping and authorize the appropriate review outcome.

GenLayer validators independently render the exact allowlisted NARA PDF and must agree on the normalized consequential fields before a mapping can advance. Missing, conflicting, unavailable, or non-unique evidence fails safely to `UNRESOLVED`. The Intelligent Contract owns the authoritative profile, mapping, review, hold, supersession, and event state.

RRDG is an application-local authorization ledger. It does not delete or transfer records, replace agency-specific schedules, resolve legal holds, or provide legal advice.

## Project structure

- `contracts/records_retention_disposition_gate.py` — upgradable Intelligent Contract.
- `tests/direct/` — Direct Mode contract regression suite.
- `frontend/` — static React/TypeScript workbench using `genlayer-js` and EIP-6963.
- `docs/DEPLOYMENT.md` — Studionet deployment and recovery manifest.
- `docs/VERIFICATION.md` — exact-revision verification evidence.

## Local verification

```text
python -m pytest -q
python -m ruff check contracts tests
PYTHONUTF8=1 genvm-lint contracts/records_retention_disposition_gate.py
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test -- --run
npm --prefix frontend run build
```

The frontend requires `VITE_CONTRACT_ADDRESS` to be a real deployed Studionet contract address. Copy `frontend/.env.example` to a local untracked environment file only after deployment.

## Trust model

The custodian controls the submitted profile and could seek a shorter or inappropriate retention mapping. A records officer could accept an unsupported item. RRDG freezes closed-schema inputs before GenLayer consensus, binds consensus to exact allowlisted NARA source identity and consequential fields, and permits only a distinct assigned officer to accept or decide the resulting review. The configured auditor can place or clear a hold but cannot choose the mapping or review outcome.

## Limitations

- Studionet is a development network and may reset.
- Source interpretation is limited to the two exact allowlisted GRS PDFs and closed profile templates in the contract.
- Upgrade authority is recoverable only while the recorded Studio upgrader account remains accessible and Studionet state persists.
- Live deployment, Studio proof, public repository, and Vercel evidence remain pending until their governed checkpoints are completed.
