# Verification

Status: `LIVE VERIFIED — POST_DEPLOY_TEST REVIEW PENDING`

## Exact source and deployment

- Source commit: `d4ffc520c54690324e17a5cf919fcc20e28bea77`
- Contract Git blob: `bf09388c6b621d4381c2bebc64ffa6175c41d63d`
- Contract SHA-256: `be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525`
- Network: GenLayer Studionet (`61999`)
- Principal contract: `0xE679b4345BF5AB03105A51Ef41743545139cD61C`
- Deployment transaction: `0x27c9128e80a02066a75d682fac25835a9ed46d59f850a0adc5dd1e390647a4d7`
- Explorer: https://explorer-studio.genlayer.com/address/0xE679b4345BF5AB03105A51Ef41743545139cD61C
- Deployer/upgrader: `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78`
- Auditor: `0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1`

Direct `gen_getContractCode` readback returned 67,927 bytes with SHA-256 `be5b05ff...5609525`, exactly matching the reviewed local source.

## Live Studio proof highlights

All listed writes used Normal / Full Consensus. Required successful transactions reached `FINALIZED`, `MAJORITY_AGREE`, execution `SUCCESS`, and were followed by authoritative finalized-state reads.

- Procurement profile: create/freeze/assess produced `TEMPORARY_ITEM_MATCH` for GRS 1.1.010; officer acceptance, audit hold, and hold clearing succeeded.
- Office-policy retry `0x0fd0094a684a6cd8da4303ea29dcb4162f03401b22958893a0dfe4546553ede5` produced attempt 2 `TEMPORARY_ITEM_MATCH`, GRS 5.1.010, authority `DAA-GRS-2016-0016-0001`.
- Officer acceptance: `0xa3ab359700a5ef1d543da31a5ed77f3e7ec8a15d7a1a4354530d9961ecd37c7c`.
- Wrong-role/order guards: officer request `0x7135ea6accd0b18410d6badf008aa47a01a295c0ba8ff4be5315e6b9172bdcc3` and premature decision `0x67b3f98ec7ad82cfd5dc6590e8376173259f3751b55ead00c28f2f41b790feaa` finalized without mutation.
- Owner request: `0x2091a48476df9b8b7b50233f0be794dbf04488d78e2339f1454fafa0b6c59cd6`.
- Officer authorization: `0xa95e0862487280c3fb5636e6d48ea4fbfa6e1228a26d4cfa1245722fe99c970e`; finalized readback showed `AUTHORIZE_DISPOSITION`.
- Successor creation: `0x3cac24a3640311df2310588e6acf388c096bce0d9014e3cfd6cb998aae7a5582` returned profile 3.
- Supersession: `0x37317cf890fc97056ab2f142f30d674096837cce409294a44b043a84d43d6f5a`; profile 2 became `SUPERSEDED`, `superseded_by=3`, while retaining its review record.

## Recovery rehearsal

- Separate address: `0x77ae5d47Da146024a7C45039155781A1eF4af224`
- Deployment: `0xa97ba3d1c10cc749900a168d78973dd7b9e3735ac700661aed5bd27f6faf7f53`
- Canary state: `0xed433bbe3df2fcd5196b09fd78acfc5b44745c6eb4bfded8dd06f4f709dad491`
- Authorized same-source upgrade: `0x8e9b8c1ab6aecb33201339b8de4bff96bef7198988a32acded431fd46989df19`

All three transactions finalized. Post-upgrade readback retained profile count 1 and the complete `rehearsal-state-001` profile; upgrader remained `0x34b9...9D78`. Direct code readback from principal and rehearsal returned the same 67,927-byte source and SHA-256 `be5b05ff...5609525`.

## Local regression baseline

- Official-source real-network preflight: 5/5
- Contract Direct Mode: 38 passed
- Ruff and GenVM lint/semantic validation: passed
- Python dependency integrity: passed
- Frontend Vitest: 33 passed
- Frontend typecheck/static lint/build: passed

Anonymous `POST_DEPLOY_TEST` approval is still required before GitHub/Vercel release.
