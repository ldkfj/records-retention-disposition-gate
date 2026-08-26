# Verification

Status: `CORRECTED PRE_DEPLOY CANDIDATE — FRESH REVIEW REQUIRED`

## Exact revision

- Contract/frontend implementation commit: recorded after this correction is committed
- Exact review package commit: recorded in the PRE_DEPLOY review package
- Contract source SHA-256: `a05bae44b175be424d018712b1713ec3860d7fbff5d7316a9f3b2c8c00cda447`
- Contract Git blob: `155e02b1e8250e3653a2221c3449f53e9ecc8a97`
- Network: Studionet (`61999`)
- Deployment: prior revision deployed but failed `POST_DEPLOY_TEST`; corrected revision not deployed

## Verified local checks

- Official-source real-network preflight: 5/5 reachable; production CSV `HTTP 200`, `text/csv`, 89,237 bytes, exact consequential rows validated
- Contract Direct Mode: `38 passed`
- Ruff: passed
- GenVM lint and semantic validation: passed (`3 checks`; 26 methods: 15 view, 11 write)
- Python dependency integrity: passed
- Frontend Vitest: `33 passed` across 5 files
- Frontend typecheck: passed
- Frontend static lint check: passed
- Frontend production build: passed
- Browser inspection: missing/invalid contract configuration fails visibly; wallet chooser opens without requesting accounts; modal remains interactive while the background is hidden from accessibility and interaction.

Local tests and source preflight are not live Studionet proof. The corrected revision still requires fresh anonymous `PRE_DEPLOY`, exact-source deployment, complete primary-AI Studio matrix, and `POST_DEPLOY_TEST`. GitHub/Vercel and user web E2E remain later checkpoints.

## PRE_DEPLOY Codex verdict

`READY FOR FRESH ANONYMOUS PRE_DEPLOY REVIEW` — the invalid PDF-render path was replaced by bounded deterministic parsing of the reachable official NARA Transmittal 36 CSV. The prior deployment is diagnostic evidence only and does not authorize deployment of this corrected revision.
