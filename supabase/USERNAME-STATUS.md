# Username login preparation

Requested display username: Gespro123; canonical username: gespro123.
Applied migration gespro_username_secure_bootstrap adds unique usernames and a service-only, single-use bootstrap mechanism. Bootstrap token is hashed with SHA-256 and expires after 24 hours; plaintext token is not committed.

After the owner explicitly authorized the single-use public activation flow, the native Supabase deployment was approved. Function gespro-setup is ACTIVE, version 1. No Auth account or password exists until the owner submits the setup form.

Sites runtime environment revision 1 configures Supabase URL and publishable key. The accompanying website adds /setup and /login plus same-origin POST routes. Setup token travels in the URL fragment, is removed from browser history on load, and is never committed. A server-only HttpOnly Secure SameSite=Strict cookie holds the access token, capped at one hour (re-login then required). The root page checks Supabase Auth and active platform-admin membership before rendering the existing workspace. Other roles are not enabled in the workspace yet. All sales/configuration screens still operate on demonstration state, not real-money records.

Flow: owner receives 256-bit single-use setup link, enters a 12–128 character password directly on a secure page; token-authorized Edge Function uses Supabase Admin Auth to create an internal email identity without sending mail, then atomically creates the username profile and platform-admin role. Invalid/expired/used tokens cannot provision. The internal alias is gespro123@login.gespro.lol; it is not a recovery inbox. Database transaction tests passed invalid-token rejection, valid bootstrap profile/admin creation and replay denial; fixtures rolled back. The owner must perform actual password setup and the first real login; these were not simulated as completed.
