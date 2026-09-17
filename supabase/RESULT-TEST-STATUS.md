# Result settlement verification — 2026-09-16

This is a tested, **paused** test-ledger implementation, not an activated financial workflow. The live website remains v71. No result or payment screen has been connected to the live navigation, and the existing ticket mapper still reports the pre-settlement model. Do not claim real payouts or end-to-end UI acceptance.

## Persisted database changes

1. `gespro_test_result_settlement`: result/audit tables, snapshot helper, additive direct/straight calculation and controlled result publication.
2. `gespro_pause_unverified_result_settlement`: removed the insert trigger and revoked authenticated result-publication execution after the workspace disconnected. Corresponding source: `pause-test-result-settlement.sql`.
3. `gespro_test_result_position_rounding`: corrected rounding to cents for each winning prize position so detailed amounts sum to the total. Corresponding source: `test-result-rounding.sql`.

The trigger and publication grants remain disabled. Adding tables/functions does not activate settlement. Ordinary test-ticket creation continues using the previous configuration snapshot. Tickets without frozen effective tariffs are deliberately held for review when evaluated; they are not assigned invented historical rates.

## Verified

- 21 application tests pass; TypeScript and production build pass.
- `tests/result-route.test.cjs`: session, origin, platform-admin and active-bank checks; caller bearer forwarding; client-supplied actor/prize ignored; leading zeros; conflict response.
- `supabase/tests/test-result-settlement.sql`: rolled-back fixtures temporarily enable the disabled hooks and create isolated test identities, banks, tickets and results. Covers first+second, first+third, second+third and all three positions; zeros; straight winnings; loser/cancelled/review states; idempotent publication; corrected result/version conflict; publication before close denied; seller/owner publication denied; bank ticket isolation; a multi-draw ticket remains pending until all results and then receives the summed prize; frozen tariffs survive current tariff edits; per-position rounding; missing historical tariffs require review; Massachusetts/Pick2/Dominican result shapes. Fixture rows are rolled back. Identity sequences may advance.
- Security advisors: only the two pre-existing findings remain (private bootstrap RLS with no policies, and disabled leaked-password protection).

## Before activation

Connect the result component to authenticated bank navigation and map server prize/review/settlement details to the ticket UI; verify those flows in an authenticated browser. Address stale-response handling in the draft results component. Complete game semantics for Palé, Tripleta and BOX (currently explicit pending/review). Real balances, paid-ticket handling, remittances and commissions remain outside this implementation. Keep test-mode receipt wording.

No real customer tickets/results were altered by the verification, no payouts were sent, and no application version was published as part of this test-only pass.
