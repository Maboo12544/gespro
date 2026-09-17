# GesPro Supabase setup

This folder contains the production-oriented database foundation for GesPro.

## Initial setup

1. Create a Supabase project.
2. Open the SQL Editor and run schema.sql.
3. Create the first user in Supabase Auth.
4. Copy that user's UUID and bootstrap the platform administrator with:

       insert into public.platform_admins(user_id) values ('USER_UUID');

5. Configure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY as hosted secrets. Never expose the service-role key to browser code.

## Core RPC functions

- sell_ticket: creates a complete ticket in one transaction, checks the seller, draw closing time, idempotency key, and number exposure limits before confirming the sale.
- cancel_ticket: enforces the organization's cancellation window and releases number exposure.
- close_expired_draws: closes open draws when their deadline passes; call it from a scheduled server job.
- settle_draw: restricted to the platform administrator; records a result, calculates winners and payouts, creates pending payments, and writes an audit entry.

Example result object for settle_draw:

    {
      "BOLET": ["23", "88"],
      "LOTTO 3": ["177", "077"],
      "LOTTO 4": ["1773"],
      "LOTTO 5": ["17732"],
      "MARYAJ": ["23-32"]
    }

All user-facing tables use Row Level Security. The platform administrator lives in platform_admins, while owner, supervisor, and seller memberships live in organization_members.
