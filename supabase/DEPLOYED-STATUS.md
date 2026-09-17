# GesPro database status — 2026-09-15

Project: iusxjafiwpcpjothftyr. The other populated Supabase project was not modified.

Applied remote migrations: gespro_identity_tenant_foundation and gespro_restrict_rls_trigger_execution.
Reproducible DDL: identity-foundation.sql. Tests: tests/identity-isolation.sql (transaction rolls back fixtures).

Six gespro_* tables hold profiles, platform administrators, banks, memberships, points of sale and assignments. All enable RLS. Authenticated clients have SELECT only; anonymous clients have no table privileges. Role provisioning requires a trusted operator. Memberships do not use user-editable JWT metadata. Composite foreign keys prevent assignments crossing bank boundaries.

Owner sees own bank POS; supervisor/seller sees assigned POS; platform administrator sees all; disabled profiles lose bank access. Identity test passed owner/supervisor/unassigned/platform-admin/disabled-admin isolation, anonymous denial and no client membership INSERT. No permanent accounts or banks seeded.

The original schema.sql is an UNAPPLIED historical draft, not the deployed schema. Do not run it on this project: it models single-draw tickets and has not been reviewed for the current requirements.

Website v20 still uses session demonstration data. Login, profile provisioning, bank administration writes, durable ticket sales, limit enforcement and payouts are NOT connected yet. No real-money readiness claim. First administrator email remains to be supplied by the owner; no password should be shared in chat.
