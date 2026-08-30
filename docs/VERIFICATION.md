# Verification

Status: `LIVE VERIFIED — POST_DEPLOY_TEST APPROVED; USER-RUN VERCEL E2E AND FINAL REVIEW PENDING`

## Live Vercel E2E repair and rerun — 2026-08-28

- Exact tested release commit: `b1b0c01c1d11eb3833971d0ad436a99fcc6159a7`.
- Exact tested production deployment: `dpl_6QxkxwNfxHFxBxjhogajvxxHk4nM`; canonical URL `https://records-retention-disposition-gate.vercel.app` loaded bundle `/assets/index-BHLzXCPn.js`.
- Independent browser wallet: OKX Wallet `0x00870443049CB1D4A9a0F51913885433c701E01f` on Studionet chain `61999`; the human user approved wallet connection and each signature while the primary AI operated the visible E2E steps under the Task-local instruction.
- Profile creation tx `0xfbbb02e5bfd46584d57aca9568435cd40bff3cd2361dac1ee34c48b342351aa5`, profile freeze tx `0x6c7b6d7fc07e6d4a3fb76817c8e89b7d9300f70391c7abd46c71f4348d4b99b5`, and mapping assessment tx `0x77f9ab2ce51de2cbcd34df7f0c637d40702331626352387d92af80bc0e7aad09` all reached `FINALIZED`, `MAJORITY_AGREE`, leader execution `SUCCESS`, and authoritative readback.
- Readback: profile `4`, nonce `vercel-e2e-20260828-2242`, owner `0x0087...e01f`, state `MAPPED`, mapping outcome `TEMPORARY_ITEM_MATCH`, GRS 1.1 item `010`, authority `DAA-GRS-2013-0003-0001`, retention `72` months, earliest review `2032-08-28`.
- Immutable events `16` (`PROFILE_CREATED`), `17` (`PROFILE_FROZEN`), and `18` (`MAPPING_ASSESSED`) display in both the global event ledger and the profile dossier after bounded event-read repair.
- Fresh reload starts disconnected. The wallet chooser separately exposed OKX Wallet and MetaMask and issued no account request until explicit OKX selection. Reconnect restored the same external account. Connected and disconnected officer/auditor checks correctly disabled unauthorized actions and displayed the assigned officer/configured auditor addresses.
- Public profile-ID, owner-plus-nonce, and consequential-fingerprint discovery all resolved profile `4`; the NARA source view displayed on-chain parity and the no-automated-deletion/no-legal-advice notice remained visible.
- Regression after both repair batches: `47/47` tests PASS; lint PASS; TypeScript PASS; production build PASS; `git diff --check` PASS.

## Reviewer correction: micro-purchase creation path — 2026-08-30

- Exact tested frontend release commit: `3c088d34cddee52ee0ed8d5cf20d100a33a875f8`.
- Exact tested production deployment: `dpl_7KDhbKJCmErxtmdT13NrT6Ftmdt1`; canonical URL `https://records-retention-disposition-gate.vercel.app`.
- Assisted browser observation used OKX Wallet `0x00870443049CB1D4A9a0F51913885433c701E01f` on Studionet chain `61999`; this observation is not claimed as the mandatory user-run Vercel gate.
- Creation path: the user selected `PROCUREMENT_WORKING_FILES`, `MICROPURCHASE`, `OFFICIAL_RECORD`, and the assigned records officer, then submitted the form once.
- Finalized receipt: [`0x8ac37d48...e9295520`](https://explorer-studio.genlayer.com/tx/0x8ac37d48014180008fdf15b8dfcf95e1371917b0fbfcc0ae08a84feae9295520) is `FINALIZED`, consensus `Accepted`, GenVM execution `SUCCESS`, and returns profile `5`.
- Authoritative readback: profile `5`, nonce `MICRO-E2E-20260830-01`, owner `0x00870443049CB1D4A9a0F51913885433c701E01f`, state `DRAFT`, and event `19` `PROFILE_CREATED`.
- Canonical attributes read from the on-chain dossier include `"procurement_type":"MICROPURCHASE"`; this closes the frontend/contract enum mismatch identified by the reviewer.
- Regression after the correction: `48/48` frontend tests PASS; lint PASS; TypeScript PASS; production build PASS; `38` contract tests PASS; `git diff --check` PASS.

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

## Public release artifacts

- GitHub repository: https://github.com/ldkfj/records-retention-disposition-gate
- Final GitHub HEAD: `f7581aa9ccf5a8af04e615d6637193ff779da794`
- Final GitHub HEAD tree: `dd21f3f8606b0127baf9682dee4d2d649a2d52f7`
- Tested/deployed behavior parent: `3c088d34cddee52ee0ed8d5cf20d100a33a875f8`, tree `e619c2d0361f7427ba987f5269de642dd4c7b26d`; final HEAD is a documentation-only wrapper.
- Vercel project: https://vercel.com/gam9/records-retention-disposition-gate
- Production URL: https://records-retention-disposition-gate.vercel.app
- Deployment inspection: https://vercel.com/gam9/records-retention-disposition-gate/7KDhbKJCmErxtmdT13NrT6Ftmdt1
- Deployment ID: `dpl_7KDhbKJCmErxtmdT13NrT6Ftmdt1`; target `production`; status `READY`
- Exact-release assisted observation: the production page passed the OKX-wallet creation path and authoritative readback documented above, with on-chain `MICROPURCHASE` attributes. Mandatory user-run full lifecycle E2E on this exact release remains pending.

## Evidence-based scorecard — current checkpoint

```text
GENLAYER SUBMISSION CATEGORY AND SCORECARD
Category: PROJECT
Validity gate: PASS

GenLayer fit: 5/5
Evidence: The deployed Intelligent Contract performs consensus-critical bounded NARA evidence matching; live Studio rows include finalized accepted and disagreement outcomes.
Exact evidence: principal contract 0xE679b4345BF5AB03105A51Ef41743545139cD61C; docs/VERIFICATION.md Live Studio proof highlights.
Weakness/blocker: Final user-run Vercel lifecycle proof is pending.

Contract quality: 5/5
Evidence: Closed schemas, fail-closed unresolved outcomes, role separation, lifecycle guards, upgrade controls, 38 contract tests, and finalized Studio matrix/readbacks.
Exact evidence: contracts/records_retention_disposition_gate.py; tests/direct/; docs/VERIFICATION.md consolidated ledger.
Weakness/blocker: None identified in the reviewed contract gate.

Engineering: 4/5
Evidence: Reproducible React/TypeScript and Python project, 48 frontend tests, 38 contract tests, lint/typecheck/build PASS, exact GitHub HEAD/tree and Vercel deployment identity.
Exact evidence: final HEAD f7581aa9ccf5a8af04e615d6637193ff779da794; deployment dpl_7KDhbKJCmErxtmdT13NrT6Ftmdt1.
Weakness/blocker: Final package still needs the mandatory user-run Vercel E2E and same-release full-lifecycle evidence.

Frontend / UX: 3/5
Evidence: Live workbenches connect to the deployed contract, expose provider selection, and the corrected MICROPURCHASE creation path reached finalized readback.
Exact evidence: https://records-retention-disposition-gate.vercel.app; receipt 0x8ac37d48...e9295520; profile 5 readback.
Weakness/blocker: Full advertised lifecycle has not yet been user-run and evidenced on the current production release.

Overall evidence-based assessment: Strong valid PROJECT with a tested contract and corrected creation path, but the final user-operated release evidence is incomplete.
Submission recommendation: NOT READY
```

## Live Studio proof highlights

All listed writes used Normal / Full Consensus. Required successful transactions reached `FINALIZED`, `MAJORITY_AGREE`, execution `SUCCESS`, and were followed by authoritative finalized-state reads.

- Procurement profile: create/freeze/assess produced `TEMPORARY_ITEM_MATCH` for GRS 1.1.010; audit hold and hold clearing succeeded. An earlier malformed acceptance call, `0x763be832877f479391d78bb021720c913153336cc48391a5fc2d68ba676e2486`, finalized with execution `ERROR` / `PROFILE_NOT_FOUND` and made no state change.
- Correct officer acceptance: `0x0b52ec29ff869c50cd40fa61b0a8b98c7d696effae976b2c2bdd937faf0a681c` called `accept_mapping(1)` and reached `FINALIZED`, `MAJORITY_AGREE`, leader execution `SUCCESS`. Finalized `get_mapping(1)` returned `is_accepted=true`, `accepted_at=2026-08-26T18:23:04.504969Z`; finalized `get_profile(1)` returned `is_mapping_accepted=true` and state `MAPPED`.
- Duplicate acceptance guard: `0xdf03df963bca0866581f3b736632f6c5c7e71a9626e2c9e98272664a5cfdca8b` called `accept_mapping(1)` after acceptance and reached `FINALIZED`, `MAJORITY_AGREE` with 5 initial validators and rotation 0, but execution `ERROR` / rollback `PROFILE_NOT_IN_MAPPED_STATE`. Finalized `get_profile(1)` remained `MAPPED`, `is_mapping_accepted=true`, `mapping_attempts=1`; finalized `get_mapping(1)` retained `is_accepted=true`, the same acceptance timestamp, item `010`, and retention `72`. Explorer consensus data also reports the same post-acceptance state hash `3a6aad0a22d6ece79f2559f19621af6f1e32719b90c47919a5d448bb8282b3cc` as the valid acceptance transaction.
- Office-policy retry `0x0fd0094a684a6cd8da4303ea29dcb4162f03401b22958893a0dfe4546553ede5` produced attempt 2 `TEMPORARY_ITEM_MATCH`, GRS 5.1.010, authority `DAA-GRS-2016-0016-0001`.
- Officer acceptance: `0xa3ab359700a5ef1d543da31a5ed77f3e7ec8a15d7a1a4354530d9961ecd37c7c`.
- Wrong-role/order guards: officer request `0x7135ea6accd0b18410d6badf008aa47a01a295c0ba8ff4be5315e6b9172bdcc3` and premature decision `0x67b3f98ec7ad82cfd5dc6590e8376173259f3751b55ead00c28f2f41b790feaa` finalized without mutation.
- Owner request: `0x2091a48476df9b8b7b50233f0be794dbf04488d78e2339f1454fafa0b6c59cd6`.
- Officer authorization: `0xa95e0862487280c3fb5636e6d48ea4fbfa6e1228a26d4cfa1245722fe99c970e`; finalized readback showed `AUTHORIZE_DISPOSITION`.
- Successor creation: `0x3cac24a3640311df2310588e6acf388c096bce0d9014e3cfd6cb998aae7a5582` returned profile 3.
- Supersession: `0x37317cf890fc97056ab2f142f30d674096837cce409294a44b043a84d43d6f5a`; profile 2 became `SUPERSEDED`, `superseded_by=3`, while retaining its review record.

## Consolidated row-level Studio evidence ledger

The following ledger is the complete principal-contract Studio write matrix. It retains the initial consensus disagreement, the unresolved-to-retry path, both invalid acceptance attempts, the first valid acceptance, the duplicate acceptance rollback, and every successful lifecycle write. Every row records the exact principal contract, reviewed source commit/blob/SHA-256 identity, actor address and role, method arguments, finalized consensus/execution result, and authoritative readback. All rows were run in Normal / Full Consensus mode; the transaction URL is the authoritative receipt link. `PASS (negative)` means the contract correctly rejected the attempted write and the readback confirmed no mutation.

| # | Case / lifecycle | Actor and role | Contract/source identity | Exact method and arguments | Finalized receipt, consensus, execution | Authoritative readback | Status |
|---:|---|---|---|---|---|---|---|
| 1 | Principal deployment | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` deployer/upgrader; constructor auditor `0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1` | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `deploy(auditor_address=0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1, upgrader_address=0x34b92E6553eaCA11A00A9d86d75d8a7881779D78)` | [`0x27c9128e...647a4d7`](https://explorer-studio.genlayer.com/tx/0x27c9128e80a02066a75d682fac25835a9ed46d59f850a0adc5dd1e390647a4d7) · `FINALIZED` · `MAJORITY_AGREE` · execution `SUCCESS` (deploy) | `gen_getContractCode`: 67,927 bytes; SHA-256 `be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | PASS |
| 2 | Create procurement profile 1 | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `create_profile("live2-proc-001", "PROCUREMENT_WORKING_FILES", {record_copy_status:OFFICIAL_RECORD, procurement_type:FORMAL_CONTRACT, is_formal_contract:true, contract_concluded:true, includes_unsuccessful_bids:false, scope_level:WORKING_PAPERS}, "2024-01-15", "2024-06-30", "GRS_1_1", officer=0x34b92E6553eaCA11A00A9d86d75d8a7881779D78)` | [`0x55911295...4f6ca`](https://explorer-studio.genlayer.com/tx/0x55911295f37bddf306552ac4a48e7ef640e3b5dbde0b059482903242e4f4f6ca) · `FINALIZED` · `MAJORITY_AGREE` · execution `SUCCESS`; leader returned profile `1` | `get_profile(1)`: `DRAFT`, owner `0xef5d2119416a2f5afa35dcfa209766efc1be5902`, officer `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` | PASS |
| 3 | Freeze profile 1 | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `freeze_profile(1)` | [`0x74f93b6c...d7120`](https://explorer-studio.genlayer.com/tx/0x74f93b6cd1c5db0c4a4f980ac812e228e6a064dc612c4ce854dcc400150d7120) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(1)`: `is_frozen=true`, state `FROZEN` | PASS |
| 4 | Procurement mapping | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `assess_mapping(1)` | [`0x7349f1d3...f7211`](https://explorer-studio.genlayer.com/tx/0x7349f1d3f34eb73c4a3aca347311e85c3c5cc3968139f4a608ea9f4cddbf7211) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 disagree; rotation 1) · execution `SUCCESS`; leader returned `TEMPORARY_ITEM_MATCH` | `get_profile(1)`: `MAPPED`, attempt `1`; `get_mapping(1)`: item `010`, `TEMPORARY`, retention `72`, accepted `false` | PASS |
| 5 | Invalid acceptance: nonexistent profile | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` records officer | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `accept_mapping(0)` | [`0x763be832...e2486`](https://explorer-studio.genlayer.com/tx/0x763be832877f479391d78bb021720c913153336cc48391a5fc2d68ba676e2486) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `ERROR` / rollback `PROFILE_NOT_FOUND` | `get_profile(1)` / `get_mapping(1)`: unchanged; mapping remained `is_accepted=false` | PASS (negative) |
| 6 | Invalid acceptance from auditor account | `0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1` fixed auditor | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `accept_mapping(0)` | [`0xcb3acfe3...acfdb`](https://explorer-studio.genlayer.com/tx/0xcb3acfe3b4d6d141887f192f5220bca63cc08f5034c5162115ad508e3cdacfdb) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `ERROR` / rollback `PROFILE_NOT_FOUND` | Principal state unchanged; no profile `0` was created or mutated | PASS (negative) |
| 7 | Place audit hold | `0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1` fixed auditor | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `place_audit_hold(1, "LIVE_AUDIT_HOLD")` | [`0xb796a8ce...8d730`](https://explorer-studio.genlayer.com/tx/0xb796a8ce8537e18b5ccc7547375aeb0a8bb90943f198bfa79afb3436a8b8d730) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(1)`: `audit_hold=true`, reason `LIVE_AUDIT_HOLD` | PASS |
| 8 | Clear audit hold | `0x22A2906BB59A1DFaEEAD6148eba7dB24d6F22FB1` fixed auditor | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `clear_audit_hold(1)` | [`0x713b1de8...3fb2`](https://explorer-studio.genlayer.com/tx/0x713b1de849d4b1c04e920e7d3f85df8e329ad99486c59b71d57b6671bda83fb2) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(1)`: `audit_hold=false`; mapping still not accepted at this point | PASS |
| 9 | Create administrative profile 2 | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `create_profile("live2-office-001", "ADMINISTRATIVE_POLICY_FILES", {policy_scope:OFFICE_UNIT_LEVEL, record_level:OFFICE_UNIT, is_agency_directive:false, is_routine_administrative:true}, "2024-02-01", "2024-08-31", "GRS_5_1", officer=0x34b92E6553eaCA11A00A9d86d75d8a7881779D78)` | [`0xa13d344c...63f67f`](https://explorer-studio.genlayer.com/tx/0xa13d344c8684389cdb93655d2b5999693c44d905abff0356b73029608163f67f) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned profile `2` | `get_profile(2)`: `DRAFT`, correct GRS 5.1 family and assigned officer | PASS |
| 10 | Freeze profile 2 | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `freeze_profile(2)` | [`0xa6ffab89...d7a4e`](https://explorer-studio.genlayer.com/tx/0xa6ffab89a884c273177218113354ad5aa962c5a7653f35c7f1e44db6862d7a4e) · `FINALIZED` · `MAJORITY_AGREE` (4 agree, 1 idle) · execution `SUCCESS`; leader returned null | `get_profile(2)`: `is_frozen=true`, state `FROZEN` | PASS |
| 11 | Initial mapping disagreement | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `assess_mapping(2)` | [`0xc7aa373a...a70f1`](https://explorer-studio.genlayer.com/tx/0xc7aa373a1d1ef424e074ddc6db21a16552fae3fec7897c0de06109d5f6ca70f1) · `FINALIZED` · `MAJORITY_DISAGREE` (3 disagree, 2 agree; rotation 3) · execution result `MAJORITY_DISAGREE`; no commit | `get_profile(2)` remained `FROZEN`, attempts `0`; no mapping mutation | PASS (disagreement handled) |
| 12 | Unresolved mapping lifecycle | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `assess_mapping(2)` | [`0xc211f722...b682978`](https://explorer-studio.genlayer.com/tx/0xc211f72267c3c2a2aadae6f3f9d24307a4929faa8fc114a8bf68f3f43b682978) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 disagree; rotation 1) · execution `SUCCESS`; leader returned `UNRESOLVED` | `get_profile(2)`: `HOLD_UNRESOLVED`, attempts `1`; `get_mapping(2)`: `UNRESOLVED`, `NONE`, retention `0`, accepted `false` | PASS |
| 13 | Retry unresolved mapping | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` records officer | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `retry_unresolved(2)` | [`0x0fd0094a...3ede5`](https://explorer-studio.genlayer.com/tx/0x0fd0094a684a6cd8da4303ea29dcb4162f03401b22958893a0dfe4546553ede5) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 disagree; rotation 3) · execution `SUCCESS`; leader returned `TEMPORARY_ITEM_MATCH` | `get_profile(2)`: `MAPPED`, attempts `2`; `get_mapping(2)`: item `010`, GRS 5.1, retention `0`, accepted `false` | PASS |
| 14 | Accept mapping 2 | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` records officer | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `accept_mapping(2)` | [`0xa3ab3597...d37c7c`](https://explorer-studio.genlayer.com/tx/0xa3ab359700a5ef1d543da31a5ed77f3e7ec8a15d7a1a4354530d9961ecd37c7c) · `FINALIZED` · `MAJORITY_AGREE` (4 agree, 1 idle) · execution `SUCCESS`; leader returned null | `get_mapping(2)`: `is_accepted=true`, `accepted_at=2026-08-26T17:42:19.586946Z` | PASS |
| 15 | Wrong-role review request | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` records officer | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `request_disposition_review(2)` | [`0x7135ea6a...2bdcc3`](https://explorer-studio.genlayer.com/tx/0x7135ea6accd0b18410d6badf008aa47a01a295c0ba8ff4be5315e6b9172bdcc3) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `ERROR` / rollback `UNAUTHORIZED_NOT_OWNER` | `get_profile(2)`: review remained not requested | PASS (negative) |
| 16 | Premature review decision | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` records officer | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `decide_review(2, "AUTHORIZE_DISPOSITION", "RETENTION_COMPLETE_AND_NO_ACTIVE_HOLD")` | [`0x67b3f98e...0feaa`](https://explorer-studio.genlayer.com/tx/0x67b3f98ec7ad82cfd5dc6590e8376173259f3751b55ead00c28f2f41b790feaa) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `ERROR` / rollback `REVIEW_NOT_REQUESTED` | `get_review(2)` absent/not requested; no decision mutation | PASS (negative) |
| 17 | Owner requests disposition review | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `request_disposition_review(2)` | [`0x2091a484...59cd6`](https://explorer-studio.genlayer.com/tx/0x2091a48476df9b8b7b50233f0be794dbf04488d78e2339f1454fafa0b6c59cd6) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(2)`: review requested; `requested_at=2026-08-26T17:45:19.511692Z` | PASS |
| 18 | Officer authorizes disposition | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` records officer | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `decide_review(2, "AUTHORIZE_DISPOSITION", "RETENTION_COMPLETE_AND_NO_ACTIVE_HOLD")` | [`0xa95e0862...c970e`](https://explorer-studio.genlayer.com/tx/0xa95e0862487280c3fb5636e6d48ea4fbfa6e1228a26d4cfa1245722fe99c970e) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_review(2)`: decided `true`, action `AUTHORIZE_DISPOSITION`, `decided_at=2026-08-26T18:00:05.761088Z`; profile disposition authorized before supersession | PASS |
| 19 | Create successor profile 3 | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `create_profile("live3-successor-001", "ADMINISTRATIVE_POLICY_FILES", {is_agency_directive:false, is_routine_administrative:true, policy_scope:OFFICE_UNIT_LEVEL, record_level:OFFICE_UNIT}, "2025-01-01", "2025-12-31", "GRS_5_1", officer=0x34b92E6553eaCA11A00A9d86d75d8a7881779D78)` | [`0x3cac24a3...a5582`](https://explorer-studio.genlayer.com/tx/0x3cac24a3640311df2310588e6acf388c096bce0d9014e3cfd6cb998aae7a5582) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned profile `3` | `get_profile(3)`: `DRAFT`, attempts `0`, no mapping/review | PASS |
| 20 | Supersede profile 2 with 3 | `0xef5d2119416a2f5afa35dcfa209766efc1be5902` custodian/owner | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `supersede_profile(2, 3)` | [`0x37317cf8...d6f5a`](https://explorer-studio.genlayer.com/tx/0x37317cf890fc97056ab2f142f30d674096837cce409294a44b043a84d43d6f5a) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_profile(2)`: `SUPERSEDED`, `superseded_by=3`; `get_profile(3)`: `supersedes=2`; review 2 retained | PASS |
| 21 | First valid acceptance for profile 1 | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` records officer | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `accept_mapping(1)` | [`0x0b52ec29...a681c`](https://explorer-studio.genlayer.com/tx/0x0b52ec29ff869c50cd40fa61b0a8b98c7d696effae976b2c2bdd937faf0a681c) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle) · execution `SUCCESS`; leader returned null | `get_mapping(1)`: `is_accepted=true`, `accepted_at=2026-08-26T18:23:04.504969Z`; `get_profile(1)`: state `MAPPED`, accepted `true` | PASS |
| 22 | Duplicate acceptance after profile 1 was accepted | `0x34b92E6553eaCA11A00A9d86d75d8a7881779D78` records officer | `contract=0xE679b4345BF5AB03105A51Ef41743545139cD61C; source_commit=d4ffc520c54690324e17a5cf919fcc20e28bea77; blob=bf09388c6b621d4381c2bebc64ffa6175c41d63d; sha256=be5b05ffad44a76c79555d270d1961001bc680644e71053cf4c0718da5609525` | `accept_mapping(1)` | [`0xdf03df96...fca8b`](https://explorer-studio.genlayer.com/tx/0xdf03df963bca0866581f3b736632f6c5c7e71a9626e2c9e98272664a5cfdca8b) · `FINALIZED` · `MAJORITY_AGREE` (3 agree, 2 idle; 5 initial validators; rotation 0) · leader execution `ERROR` / rollback `PROFILE_NOT_IN_MAPPED_STATE` | Post-transaction `get_profile(1)` (latest-final): state `MAPPED`, `is_mapping_accepted=true`, `mapping_attempts=1`; `get_mapping(1)` (latest-final): `is_accepted=true`, `accepted_at=2026-08-26T18:23:04.504969Z`, item `010`, retention `72`; Explorer state hash `3a6aad0a22d6ece79f2559f19621af6f1e32719b90c47919a5d448bb8282b3cc`, identical to row 21 | PASS (negative) |

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
