# Server-backed test tickets

Applied migration: `gespro_test_ticket_sync` to `iusxjafiwpcpjothftyr`.

Use `/access` (Kont ak dwa reyèl), choose a bank and open an assigned POS. The original root workspace remains a local demonstration. Existing local tickets are not imported. No real balances, money, settlement or commissions are enabled. Configured bank limits and server draw cutoffs are now enforced; see ACTIVATED-CONFIGURATION.md.

Authenticated owners and platform admins see bank reports; supervisors see assigned POS only and cannot mutate tickets. Sellers create at assigned POS only and cancel their own pending tickets. Owners can cancel bank tickets. All cancellations have a five-minute server deadline and retain ticket/audit history. No hard-delete endpoint exists.

The browser sends plays and a UUID request key; the database verifies identity, assignments, game formats and cents, derives totals and timestamps, and records audit entries atomically. Same-key retries return the same ticket; different payloads cannot reuse the key. An uncertain request is persisted synchronously per user/bank/POS before sending. Its recovery button confirms the original request and puts it in ticket history for reprinting; it does not erase a newer draft. The operator must check the draft before selling another ticket. Browser storage is required for safe retry recovery. Independent tabs are independent drafts.

Reports poll every 15 seconds while visible and on focus, with manual refresh. This is periodic synchronization, not websocket realtime. Keyset pages are 250 rows; the 10,000-row guard reports an explicit error instead of silently claiming complete totals. Date filters operate on loaded records. Amounts remain test values. Catalog comes from the saved bank configuration. Local demonstration configuration does not configure the server catalog.

Validation: transaction-based database fixtures in `tests/test-ticket-sync.sql` (rolled back); API caller-token/forged-fields/transient-error test; existing regression suite; TypeScript and production build. No end-user credential sign-in, physical printer or real-money acceptance test performed.
