# GesPro draw audit — 2026-09-16

Status: demonstration only. This is an implementation audit, not certification of operator rules or real-money readiness.

## Catalog coverage

| Catalog | Current result input | Audit conclusion |
| --- | --- | --- |
| FL PICK 2 AM / PM | One two-digit result | Corrected: no generated Cash 3, Pick 4 or Pick 5; only two-digit plays accepted. Official Florida wager types/prices/Fireball are not implemented. |
| FLORIDA AM / PM; NEW YORK AM / PM; GEORGIA MIDDAY / EVENING | Three digits + two digits + two digits | User-defined bòlèt formula preserved. Example 746,20,10 produces 46,20,10,746,2010,74620. Derived values are not independent official Pick 4/5 results. |
| MASSACHUSETTS EVENING | Four-digit string | User-defined overlapping slices preserved; 0017 produces 00,01,17,001,0017 and Back 017. No Pick 5 result: Pick 5 wagers now rejected. This is not certification of official Mass 4 settlement. |
| Nacional Quiniela / Gana Más; Leidsa; Loteka; Real; La Primera; La Suerte | Three separate two-digit strings | Width and leading zeros validated; US Cash 3/4/5 rejected. Individual operator/session mappings, schedules and payout tiers remain unverified. |
| Nueva Yol Real | Pending | Results and POS availability remain blocked. |
| User-created draws | Legacy custom bòlèt formula unless explicit mode exists | Require per-draw review; do not infer official rules from the name. |

## Corrections and tests

- Shared result derivation validates exact count/width, retaining leading zeros.
- Pick 2 recognizes existing saved catalog names without deleting or rewriting historical results.
- POS validates game compatibility both when adding/duplicating and immediately before ticket creation.
- Configured closing time now blocks entry and creation at or after closing, using configured timezone. Invalid nonempty schedules fail closed. Empty schedules remain demo-only/unconfigured; they are not certified sale windows.
- Duplicate failures surface the error instead of swallowing it.
- Existing historical results are preserved, including any previously entered invalid Pick 2 results; these need review before any migration/settlement.
- Tests: `node --test tests/draw-rules.test.cjs`: result slots/zeros, invalid widths, incompatible games, invalid amounts, combo cardinality 6/3/1, timezone/DST and exact closing boundary.

## Remaining blockers

1. No automatic winner/loser evaluation: tickets remain pending with prize zero. Saving a result does not settle a ticket.
2. Payout and exposure limits are stored configuration, not enforced settlement/risk controls. Exact/any-order Palé, Tripleta partial prizes and each operator's tiers need explicit modeling. Do not assume one universal Dominican payout table.
3. Browser-local state and browser time are not authoritative. No server-side atomic acceptance, shared balances or live admin/POS synchronization.
4. Each play needs an immutable lottery ID, draw session/date, accepted rules version and payout snapshot. Current ticket timestamp/name alone is insufficient, especially stale drafts crossing midnight.
5. Official result provenance, correction audit trail and result-provider connection are absent. No API or real-money connection was enabled.
6. Closing times are manually configured daily windows, not verified official schedules, holidays or opening windows. Dates for manual test results are calendar-validated but may be future dates in demo.
7. Formal operator support requires distinctions between sessions and games. Generic brand-level RD catalog names do not establish all draws for that brand.

## Sources checked

- Florida Lottery Pick 2: https://floridalottery.com/games/draw-games/pick-2 — two digits, multiple wager types, cutoff times distinct from draw times. Official price rules are not substituted for bank-specific demonstration payouts.
- Loteka Quiniela: https://loteka.com.do/quiniela/ — three drums numbered 00–99, ordered prize positions.
- Loteka Palé: https://loteka.com.do/pale-loteka/ — any-order pairs. Page wording references Quiniela Nacional despite Loteka title; do not infer provider mapping without clarification.
- Loteka Tripleta: https://loteka.com.do/tripleta-loteka/ — mentions prizes for three or two hits; current single Tripleta payout field is insufficient for full support.
- Massachusetts official Mass 4 page: https://www.masslottery.com/games/draw-and-instants/mass-4 — client-rendered rules were not available to verify; custom bank formula is retained, not certified.
