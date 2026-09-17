# GesPro admin and POS review — 2026-09-16

## Result

Suitable for continued demonstration testing, **not approved for real-money operation**.
This is a source review and automated regression check, not a penetration test or
an authenticated end-to-end acceptance test. No live database settings, users,
permissions, payment services or result feeds were changed.

## Corrections in this review

- Duplicate now chooses the newest non-cancelled ticket by creation time in the
  current demo bank and point of sale. Previously newest-first storage plus
  `.at(-1)` selected the oldest ticket.
- POS Monitoring receives only tickets belonging to JP Bòlèt / jp-pos-1, consistent
  with View Sales. This is UI scoping, not server authorization.
- POS menu Logout submits the existing protected logout endpoint instead of
  opening an unavailable-feature dialog.
- Settings no longer describes operational role separation as ready.
- Dashboard date conversion and auth-response object narrowing fix application
  TypeScript errors without changing authentication rules.
- App TypeScript configuration excludes Supabase Edge Functions, which run in
  Deno and require their own Deno check. Those functions were not changed or
  deployed; their runtime validation remains outstanding.

## Blocking operational gaps

| Area | Evidence and consequence |
| --- | --- |
| Persistence / sync | `components/demo-storage.tsx` stores records in localStorage under one demo account prefix. Admin and POS share React state in one browser; separate devices do not share a transactional database. Browser data deletion loses demonstration records. GitHub backs up source, not these records. |
| Accounts / roles | `lib/gespro-auth.ts` gates the workspace on an active platform admin. Owner/supervisor previews and created POS records are local demonstrations, not separate authenticated sales accounts. POS identity remains JP Bòlèt / Jean Pierre / jp-pos-1. |
| Limits / payouts | `lottery-bulk.tsx` saves settings, but POS does not enforce `lotteryState.limits`, and no settlement service applies payout rates to tickets. Concurrent sales / exposure limits are not protected server-side. |
| Results / payment | Draw entry saves local results. Ticket creation always sets pending and prize zero. No automatic winner/loser settlement, payment ledger, double-payment protection, or result-correction audit workflow is connected. |
| Balance | POS displays fixed $285.50; refresh explicitly reports unavailable. View Sales leaves balances and commissions unavailable. Demo Cash calculations do not constitute a connected financial ledger. |
| Draw time | Closing checks work with configured schedules using the device clock. Unconfigured schedules do not close sales. No server-authoritative draw instance or sale cutoff exists. |
| Sessions | Login session cookie expires after at most one hour; no token-refresh flow is implemented. Draft data persists locally, but a page reload after expiry can require login again. |

## Incomplete user-facing workflows

- Admin Vandè, Tikè, Tiraj and Rapò still route to placeholder sections.
- Admin search and notification icon are not connected to a search/notification service.
- POS Pending for payment, Sales history, Play monitor, Pay and Authorize strikeout
  open the same Monitoring dialog, without dedicated initial filters/payment flows.
- Schedules dialog remains placeholder text; Random plays generator is inactive.
- Discount switch does not alter ticket totals and says so.
- Owner creation accepts names locally and does not provision login credentials.
- Monetary entry in POS still uses JavaScript numbers; a production sale service
  should validate supported currency precision and store integer minor units.

## Verification

- 13 automated tests passed: draw modes and leading zeros; 6/3/1 Cash 3 combos;
  invalid games/amounts; timezone/cutoff boundaries; original/copy artwork and
  multi-lottery receipts; print readiness; demo cash; newest scoped duplication;
  cancellation boundary; monitoring totals excluding cancelled tickets.
- Application `tsc --noEmit --incremental false`: passed after corrections.
- Production build checked before publication.
- Public entry page rendered the GesPro login form. No authenticated browser
  session was available; admin/POS interaction and responsive visual QA remain
  unverified this turn. No authentication bypass was introduced for testing.
- Physical desktop printers, Android/SUNMI and iOS share-sheet behavior were not
  hardware-tested in this review.

## Next acceptance gate

Complete the authenticated demo walkthrough on desktop and mobile first. Then,
under a separately scoped backend integration task, connect persistent records,
role isolation, atomic sale/limit checks, authoritative draw closure, result
settlement, audited payment/cancellation, and backup/restore. Keep all data and
transactions in test mode until those gates are verified.
