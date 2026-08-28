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

- Procurement profile: create/freeze/assess produced `TEMPORARY_ITEM_MATCH` for GRS 1.1.010; audit hold and hold clearing succeeded. An earlier malformed acceptance call, `0x763be832877f479391d78bb021720c913153336cc48391a5fc2d68ba676e2486`, finalized with execution `ERROR` / `PROFILE_NOT_FOUND` and made no state change.
- Correct officer acceptance: `0x0b52ec29ff869c50cd40fa61b0a8b98c7d696effae976b2c2bdd937faf0a681c` called `accept_mapping(1)` and reached `FINALIZED`, `MAJORITY_AGREE`, leader execution `SUCCESS`. Finalized `get_mapping(1)` returned `is_accepted=true`, `accepted_at=2026-08-26T18:23:04.504969Z`; finalized `get_profile(1)` returned `is_mapping_accepted=true` and state `MAPPED`.
- Office-policy retry `0x0fd0094a684a6cd8da4303ea29dcb4162f03401b22958893a0dfe4546553ede5` produced attempt 2 `TEMPORARY_ITEM_MATCH`, GRS 5.1.010, authority `DAA-GRS-2016-0016-0001`.
- Officer acceptance: `0xa3ab359700a5ef1d543da31a5ed77f3e7ec8a15d7a1a4354530d9961ecd37c7c`.
- Wrong-role/order guards: officer request `0x7135ea6accd0b18410d6badf008aa47a01a295c0ba8ff4be5315e6b9172bdcc3` and premature decision `0x67b3f98ec7ad82cfd5dc6590e8376173259f3751b55ead00c28f2f41b790feaa` finalized without mutation.
- Owner request: `0x2091a48476df9b8b7b50233f0be794dbf04488d78e2339f1454fafa0b6c59cd6`.
- Officer authorization: `0xa95e0862487280c3fb5636e6d48ea4fbfa6e1228a26d4cfa1245722fe99c970e`; finalized readback showed `AUTHORIZE_DISPOSITION`.
- Successor creation: `0x3cac24a3640311df2310588e6acf388c096bce0d9014e3cfd6cb998aae7a5582` returned profile 3.
- Supersession: `0x37317cf890fc97056ab2f142f30d674096837cce409294a44b043a84d43d6f5a`; profile 2 became `SUPERSEDED`, `superseded_by=3`, while retaining its review record.

## Consolidated row-level Studio evidence ledger

The following ledger is the complete principal-contract Studio write matrix. It retains the initial consensus disagreement, the unresolved-to-retry path, both invalid acceptance attempts, and every successful lifecycle write. Every row was run against `0xE679b4345BF5AB03105A51Ef41743545139cD61C` in Normal / Full Consensus mode; the transaction URL is the authoritative receipt link. `PASS (negative)` means the contract correctly rejected the attempted write and the readback confirmed no mutation.

| # | Case / lifecycle | Actor and role | Exact method and arguments | Finalized receipt, consensus, execution | Authoritative readback | Status |
|---:|---|---|---|---|---|---|
| 1 | Principal deployment | `0x34b9...9D78` deployer/upgrader; constructor auditor `0x22A2...2FB1` | `deploy(auditor_address=0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1, upgrader_address=0x34b92E6553eaCA11A00A9d86d75d8a7881779D78)` | [`0x27c9128e...647a4d7`](https://explorer-studio.genlayer.com/tx/0x27c9128e80a02066a75d682fac25835a9ed46d59f850a0adc5dd1e390647a4d7) · `FINALIZED` · `MAJORITY_AGREE` · execution `SUCCESS` (deploy) | `gen_getContractCode`: 67,927 bytes; SHA-256 `be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | PASS |
| 2 | Create procurement profile 1 | `0xeF5D...5902` custodian/owner | `create_profile("live2-proc-001", "PROCUREMENT_WORKING_FILES", {record_copy_status:OFFICIAL_RECORD, procurement_type:FORMAL_CONTRACT, is_formal_contract:true, contract_concluded:true, includes_unsuccessful_bids:false, scope_level:WORKING_PAPERS}, "2024-01-15", "2024-06-30", "GRS_1_1", officer=0x34b92E6553eaCA11A00A9d86d75d8a7881779D78)` | [`0x55911295...4f6ca`](https://explorer-studio.genlayer.com/tx/0x55911295f37bddf306552ac4a48e7ef640e3b5dbde0b059482903242e4f4f6ca) · `FINALIZED` · `MAJORITY_AGREE` · execution `SUCCESS`; leader returned profile `1` | `get_profile(1)`: `DRAFT`, owner `0xeF5D...5902`, officer `0x34b9...9D78` | PASS |
| 3 | Freeze profile 1 | `0xeF5D...5902` custodian/owner | `freeze_profile(1)` | [`0x74f93b6c...d7120`](https://explorer-studio.genlayer.com/tx/0x74f93b6cd1c5db0c4a4f980ac812e228e6a064dc612c4ce854dcc400150d7120) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(1)`: `is_frozen=true`, state `FROZEN` | PASS |
| 4 | Procurement mapping | `0xeF5D...5902` custodian/owner | `assess_mapping(1)` | [`0x7349f1d3...f7211`](https://explorer-studio.genlayer.com/tx/0x7349f1d3f34eb73c4a3aca347311e85c3c5cc3968139f4a608ea9f4cddbf7211) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 disagree; rotation 1) · execution `SUCCESS`; leader returned `TEMPORARY_ITEM_MATCH` | `get_profile(1)`: `MAPPED`, attempt `1`; `get_mapping(1)`: item `010`, `TEMPORARY`, retention `72`, accepted `false` | PASS |
| 5 | Invalid acceptance replay | `0x34b9...9D78` records officer | `accept_mapping(0)` | [`0x763be832...e2486`](https://explorer-studio.genlayer.com/tx/0x763be832877f479391d78bb021720c913153336cc48391a5fc2d68ba676e2486) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `ERROR` / rollback `PROFILE_NOT_FOUND` | `get_profile(1)` / `get_mapping(1)`: unchanged; mapping remained `is_accepted=false` | PASS (negative) |
| 6 | Invalid acceptance from auditor account | `0x22A2...2FB1` fixed auditor | `accept_mapping(0)` | [`0xcb3acfe3...acfdb`](https://explorer-studio.genlayer.com/tx/0xcb3acfe3b4d6d141887f192f5220bca63cc08f5034c5162115ad508e3cdacfdb) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `ERROR` / rollback `PROFILE_NOT_FOUND` | Principal state unchanged; no profile `0` was created or mutated | PASS (negative) |
| 7 | Place audit hold | `0x22A2...2FB1` fixed auditor | `place_audit_hold(1, "LIVE_AUDIT_HOLD")` | [`0xb796a8ce...8d730`](https://explorer-studio.genlayer.com/tx/0xb796a8ce8537e18b5ccc7547375aeb0a8bb90943f198bfa79afb3436a8b8d730) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(1)`: `audit_hold=true`, reason `LIVE_AUDIT_HOLD` | PASS |
| 8 | Clear audit hold | `0x22A2...2FB1` fixed auditor | `clear_audit_hold(1)` | [`0x713b1de8...3fb2`](https://explorer-studio.genlayer.com/tx/0x713b1de849d4b1c04e920e7d3f85df8e329ad99486c59b71d57b6671bda83fb2) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(1)`: `audit_hold=false`; mapping still not accepted at this point | PASS |
| 9 | Create administrative profile 2 | `0xeF5D...5902` custodian/owner | `create_profile("live2-office-001", "ADMINISTRATIVE_POLICY_FILES", {policy_scope:OFFICE_UNIT_LEVEL, record_level:OFFICE_UNIT, is_agency_directive:false, is_routine_administrative:true}, "2024-02-01", "2024-08-31", "GRS_5_1", officer=0x34b92E6553eaCA11A00A9d86d75d8a7881779D78)` | [`0xa13d344c...63f67f`](https://explorer-studio.genlayer.com/tx/0xa13d344c8684389cdb93655d2b5999693c44d905abff0356b73029608163f67f) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned profile `2` | `get_profile(2)`: `DRAFT`, correct GRS 5.1 family and assigned officer | PASS |
| 10 | Freeze profile 2 | `0xeF5D...5902` custodian/owner | `freeze_profile(2)` | [`0xa6ffab89...d7a4e`](https://explorer-studio.genlayer.com/tx/0xa6ffab89a884c273177218113354ad5aa962c5a7653f35c7f1e44db6862d7a4e) · `FINALIZED` · `MAJORITY_AGREE` (4 agree, 1 idle) · execution `SUCCESS`; leader returned null | `get_profile(2)`: `is_frozen=true`, state `FROZEN` | PASS |
| 11 | Initial mapping disagreement | `0xeF5D...5902` custodian/owner | `assess_mapping(2)` | [`0xc7aa373a...a70f1`](https://explorer-studio.genlayer.com/tx/0xc7aa373a1d1ef424e074ddc6db21a16552fae3fec7897c0de06109d5f6ca70f1) · `FINALIZED` · `MAJORITY_DISAGREE` (3 disagree, 2 agree; rotation 3) · execution result `MAJORITY_DISAGREE`; no commit | `get_profile(2)` remained `FROZEN`, attempts `0`; no mapping mutation | PASS (disagreement handled) |
| 12 | Unresolved mapping lifecycle | `0xeF5D...5902` custodian/owner | `assess_mapping(2)` | [`0xc211f722...b682978`](https://explorer-studio.genlayer.com/tx/0xc211f72267c3c2a2aadae6f3f9d24307a4929faa8fc114a8bf68f3f43b682978) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 disagree; rotation 1) · execution `SUCCESS`; leader returned `UNRESOLVED` | `get_profile(2)`: `HOLD_UNRESOLVED`, attempts `1`; `get_mapping(2)`: `UNRESOLVED`, `NONE`, retention `0`, accepted `false` | PASS |
| 13 | Retry unresolved mapping | `0x34b9...9D78` records officer | `retry_unresolved(2)` | [`0x0fd0094a...3ede5`](https://explorer-studio.genlayer.com/tx/0x0fd0094a684a6cd8da4303ea29dcb4162f03401b22958893a0dfe4546553ede5) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 disagree; rotation 3) · execution `SUCCESS`; leader returned `TEMPORARY_ITEM_MATCH` | `get_profile(2)`: `MAPPED`, attempts `2`; `get_mapping(2)`: item `010`, GRS 5.1, retention `0`, accepted `false` | PASS |
| 14 | Accept mapping 2 | `0x34b9...9D78` records officer | `accept_mapping(2)` | [`0xa3ab3597...d37c7c`](https://explorer-studio.genlayer.com/tx/0xa3ab359700a5ef1d543da31a5ed77f3e7ec8a15d7a1a4354530d9961ecd37c7c) · `FINALIZED` · `MAJORITY_AGREE` (4 agree, 1 idle) · execution `SUCCESS`; leader returned null | `get_mapping(2)`: `is_accepted=true`, `accepted_at=2026-08-26T17:42:19.586946Z` | PASS |
| 15 | Wrong-role review request | `0x34b9...9D78` records officer | `request_disposition_review(2)` | [`0x7135ea6a...2bdcc3`](https://explorer-studio.genlayer.com/tx/0x7135ea6accd0b18410d6badf008aa47a01a295c0ba8ff4be5315e6b9172bdcc3) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `ERROR` / rollback `UNAUTHORIZED_NOT_OWNER` | `get_profile(2)`: review remained not requested | PASS (negative) |
| 16 | Premature review decision | `0x34b9...9D78` records officer | `decide_review(2, "AUTHORIZE_DISPOSITION", "RETENTION_COMPLETE_AND_NO_ACTIVE_HOLD")` | [`0x67b3f98e...0feaa`](https://explorer-studio.genlayer.com/tx/0x67b3f98ec7ad82cfd5dc6590e8376173259f3751b55ead00c28f2f41b790feaa) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `ERROR` / rollback `REVIEW_NOT_REQUESTED` | `get_review(2)` absent/not requested; no decision mutation | PASS (negative) |
| 17 | Owner requests disposition review | `0xeF5D...5902` custodian/owner | `request_disposition_review(2)` | [`0x2091a484...59cd6`](https://explorer-studio.genlayer.com/tx/0x2091a48476df9b8b7b50233f0be794dbf04488d78e2339f1454fafa0b6c59cd6) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(2)`: review requested; `requested_at=2026-08-26T17:45:19.511692Z` | PASS |
| 18 | Officer authorizes disposition | `0x34b9...9D78` records officer | `decide_review(2, "AUTHORIZE_DISPOSITION", "RETENTION_COMPLETE_AND_NO_ACTIVE_HOLD")` | [`0xa95e0862...c970e`](https://explorer-studio.genlayer.com/tx/0xa95e0862487280c3fb5636e6d48ea4fbfa6e1228a26d4cfa1245722fe99c970e) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_review(2)`: decided `true`, action `AUTHORIZE_DISPOSITION`, `decided_at=2026-08-26T18:00:05.761088Z`; profile disposition authorized before supersession | PASS |
| 19 | Create successor profile 3 | `0xeF5D...5902` custodian/owner | `create_profile("live3-successor-001", "ADMINISTRATIVE_POLICY_FILES", {is_agency_directive:false, is_routine_administrative:true, policy_scope:OFFICE_UNIT_LEVEL, record_level:OFFICE_UNIT}, "2025-01-01", "2025-12-31", "GRS_5_1", officer=0x34b92E6553eaCA11A00A9d86d75d8a7881779D78)` | [`0x3cac24a3...a5582`](https://explorer-studio.genlayer.com/tx/0x3cac24a3640311df2310588e6acf388c096bce0d9014e3cfd6cb998aae7a5582) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned profile `3` | `get_profile(3)`: `DRAFT`, attempts `0`, no mapping/review | PASS |
| 20 | Supersede profile 2 with 3 | `0xeF5D...5902` custodian/owner | `supersede_profile(2, 3)` | [`0x37317cf8...d6f5a`](https://explorer-studio.genlayer.com/tx/0x37317cf890fc97056ab2f142f30d674096837cce409294a44b043a84d43d6f5a) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(2)`: `SUPERSEDED`, `superseded_by=3`; `get_profile(3)`: `supersedes=2`; review 2 retained | PASS |
| 21 | Correct replayed acceptance for profile 1 | `0x34b9...9D78` records officer | `accept_mapping(1)` | [`0x0b52ec29...a681c`](https://explorer-studio.genlayer.com/tx/0x0b52ec29ff869c50cd40fa61b0a8b98c7d696effae976b2c2bdd937faf0a681c) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_mapping(1)`: `is_accepted=true`, `accepted_at=2026-08-26T18:23:04.504969Z`; `get_profile(1)`: state `MAPPED`, accepted `true` | PASS |

The earlier `0x3AB51774b34F973a556B22c944892B3E403bb8B9` instance is a discarded pre-principal Studio instance; its transactions are intentionally excluded from this principal ledger because their `to_address` is not the reviewed principal. The separate recovery rehearsal is recorded below and is not mixed into the principal lifecycle.

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
- Frontend Vitest: 42 passed
- Frontend typecheck/static lint/build: passed

Anonymous `POST_DEPLOY_TEST` approval is still required before GitHub/Vercel release.
