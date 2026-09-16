# Operational bank configuration (test tickets)

Applied to `iusxjafiwpcpjothftyr`: `gespro_activate_bank_configuration` and `gespro_manage_bank_entities`.

## Working functions
- Bank catalog, custom lottery format, removed lotteries, closing schedule and per-number limits are read during ticket creation. Bank configuration must exist; no schedule means no sale. Server clock/timezone controls the daily cutoff, checked again immediately before insertion.
- A bank advisory transaction lock serializes ticket creation while checking cumulative caps. All applicable bank, assigned active supervisor, and POS limits apply. Within the same scope/game, a number-specific limit replaces its wildcard. Limits accumulate by exact play number/type and the schedule's local calendar date, exclude cancelled tickets, and apply across sellers within the scope. No configured limit means no cap at that scope. Assignment changes affect which POS contribute to supervisor caps. Palé order and BOX permutations currently remain distinct cap keys.
- Replay keys are checked before current configuration/cutoff rules, so retrying a previously committed ticket still returns that ticket after closure or configuration changes.
- Each ticket records the configuration version, lottery mode/schedule and payout-rate snapshot. Snapshot storage does not activate settlement.
- POS fetches a sanitized bank catalog every 15 seconds; bank/owner configuration writes remain separate. Authoritative server rejection handles stale browser state.
- Super admin can rename, suspend and reactivate banks. Owner/super admin can rename, suspend and reactivate POS. Changes are audited and do not erase historical tickets. Bank renames rewrite bank-name configuration keys atomically. Reports use current bank/POS display names; persisted ticket snapshots retain their original names.

## Still incomplete
This is still a test-ticket workflow. Winner settlement, automatic payouts, real-money balances, remittances, commissions, external result API integration and end-user/physical-printer acceptance are not activated. Resolve payout ambiguity (including repeated winning numbers across prize positions and ordered/unordered Palé/BOX treatment) before implementing financial settlement. Existing `/demo` remains local-only.

## Verification
TypeScript/build, 20 application regressions, rolled-back DB tests: `activate-bank-configuration.sql`, `manage-bank-entities.sql`, and updated `test-ticket-sync.sql`. Covered cumulative cap, cancellation capacity release, cutoff rejection, replay after closure, unavailable lottery, sanitized configuration, rename key continuity, suspension/reactivation and access isolation. No real user credentials used; no live bets or payouts created.
