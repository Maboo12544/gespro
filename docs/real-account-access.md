# Real account access — 2026-09-16

## Scope and use

Open **Kont ak dwa reyèl** from the Super Admin workspace (`/access`).
Create a bank, then a point of sale, then its accounts. Account credentials are
entered directly in the secure form; do not share passwords in chat. New accounts
use a unique username and a password of 12–128 characters. No accounts are created
by this deployment, and no invitation email is sent. Existing username sign-in is
preserved. The internal `@login.gespro.lol` alias is not a recovery inbox.

| Role | Real server permissions |
| --- | --- |
| Super Admin | All banks; create banks, POS and owner/supervisor/seller accounts; edit bank memberships/assignments and suspend memberships. Existing platform administrator cannot be changed through this interface. |
| Admin bank (owner) | Own bank only; create POS, supervisors and sellers; change their assignments or suspend them. Cannot create owners or platform administrators, edit other owners, or edit self. |
| Supervisor | Read own bank and assigned POS only; no account-management writes or sales action. Central sales reports remain unconnected. |
| Seller | Read own bank and assigned POS; provisioning requires exactly one assigned POS. Can open the isolated demo sale interface. No admin toggle. |

The old root workspace is still the Super Admin demonstration, with its clearly
separate role previews. Real non-admin accounts are redirected to `/access`.
Creating owners in the old demonstration does not create real accounts. The new
access screen is the authoritative account-management interface.

## Enforcement

- Existing identity tables and RLS are reused. Verified Auth identity, active
  profile, active bank and active membership control access, not browser storage
  or user-editable metadata.
- Every management request validates the session server-side. The Edge Function
  validates its bearer with Auth again; it never accepts a client-supplied actor.
- The management RPC is SECURITY INVOKER and executable only by service_role.
  Authenticated/anonymous clients cannot call it or directly write role tables.
  It explicitly rechecks active actors, bank ownership, target roles and POS-bank
  relationships in the transaction. Row locks protect active profile/membership
  decisions. Owner creation is platform-admin-only. Assignment changes and the
  access audit record commit together.
- Account provisioning prechecks authority before creating an Auth identity and
  rechecks when inserting its profile/membership. Passwords go only to Auth and
  are excluded from database RPC payloads. A definitive provisioning failure
  attempts deletion only of the identity just created. An ambiguous network
  failure is not retried/deleted automatically; inspect the account list first.
- The browser rechecks access every minute and on focus. Revoked writes are denied
  on their next request; previously rendered data cannot be recalled. Session
  expiry remains one hour with re-login (no refresh-token flow introduced).
- No service credential is sent to the browser. Writes use the existing strict
  same-origin web endpoint and secure HttpOnly session cookie.

## Explicit remaining limits

Real permissions protect **identity and assignment records**. Ticket entry,
lotteries, financial balances, payouts and reports remain demonstrations. Scoped
POS drafts use a local namespace per authenticated user/bank/POS, which prevents
accidental mixing but is NOT a security boundary against someone with access to
that browser. There is no cross-device ticket synchronization or server-side sale,
limit enforcement, settlement or payment authorization yet. Do not use real money.
No recovery/password-reset/mandatory-first-login-password-change flow is added.

## Validation and deployed changes

- Applied remote migration `gespro_access_management` to `iusxjafiwpcpjothftyr`;
  reproducible source: `supabase/access-management.sql`.
- Edge Function `gespro-access` version 2 deployed with JWT verification enabled.
- Transactional database test `supabase/tests/access-management.sql` passed and
  rolled back every fixture. Covers cross-bank reads/writes, seller/supervisor
  write denial, owner escalation denial, foreign POS assignment rejection,
  creation/update/auditing, suspension, disabled profile and anonymous denial.
- 17 Node regression tests passed, including verified-actor enforcement,
  password exclusion from RPC, preflight denial before Auth creation, and
  fail-closed session resolution. Application and Edge-source TypeScript checks
  passed; production build checked before publication.
- No permanent test accounts, bank or POS records created. Interactive sign-in and
  account creation with real user-entered credentials still require acceptance
  testing; this deployment does not claim those browser flows were exercised.

Security advisor reports the existing private bootstrap table without policies
(intentional: no client grants, service-only bootstrap) and disabled compromised
password screening. See [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and [RLS advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
These settings were not silently changed or upgraded to a paid plan.
