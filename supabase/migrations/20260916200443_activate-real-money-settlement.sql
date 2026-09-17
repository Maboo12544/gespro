/*
# Re-activate settlement system and add real-money tables

## Purpose
Un-pauses the test result settlement system and adds real-money tables for
bank balances, prize payments, and daily cash closings.

## New Tables
- `gespro_balances` — per-bank running totals (sales, cancelled, prizes, commission, remitted)
- `gespro_payments` — individual prize payment records linked to tickets
- `gespro_cash_closings` — daily cash closing/remittance records

## Security
- All new tables have RLS, owner/admin read only
- All mutations through SECURITY DEFINER functions only
- Balance updates use FOR UPDATE row locks
*/

-- Re-activate settlement: re-create trigger and re-grant publish function
drop trigger if exists snapshot_test_rates on public.gespro_test_tickets;
create trigger snapshot_test_rates before insert on public.gespro_test_tickets for each row execute function gespro_private.snapshot_test_rates();
revoke all on function public.gespro_publish_test_result(uuid,text,date,jsonb,integer,text) from public,anon,authenticated;
grant execute on function public.gespro_publish_test_result(uuid,text,date,jsonb,integer,text) to authenticated;

-- Real-money: bank balances table
create table if not exists public.gespro_balances (
  bank_id uuid primary key references public.gespro_banks(id) on delete cascade,
  total_sales_cents bigint not null default 0,
  total_cancelled_cents bigint not null default 0,
  total_prizes_paid_cents bigint not null default 0,
  total_commission_cents bigint not null default 0,
  total_remitted_cents bigint not null default 0,
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.gespro_balances enable row level security;
revoke all on public.gespro_balances from public,anon,authenticated;
grant select on public.gespro_balances to authenticated;
drop policy if exists balances_read on public.gespro_balances;
create policy balances_read on public.gespro_balances for select to authenticated
  using(gespro_private.is_platform_admin() or gespro_private.bank_role(bank_id)='owner');
grant all on public.gespro_balances to service_role;

-- Real-money: prize payments log
create table if not exists public.gespro_payments (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.gespro_test_tickets(id),
  bank_id uuid not null references public.gespro_banks(id),
  amount_cents bigint not null check(amount_cents > 0),
  paid_by uuid not null references public.gespro_profiles(user_id),
  paid_at timestamptz not null default clock_timestamp(),
  unique(ticket_id)
);
alter table public.gespro_payments enable row level security;
revoke all on public.gespro_payments from public,anon,authenticated;
grant select on public.gespro_payments to authenticated;
drop policy if exists payments_read on public.gespro_payments;
create policy payments_read on public.gespro_payments for select to authenticated
  using(gespro_private.is_platform_admin() or gespro_private.bank_role(bank_id)='owner');
grant all on public.gespro_payments to service_role;

-- Real-money: daily cash closings
create table if not exists public.gespro_cash_closings (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.gespro_banks(id),
  seller_id uuid references public.gespro_profiles(user_id),
  closing_date date not null,
  gross_cents bigint not null default 0,
  cancelled_cents bigint not null default 0,
  net_cents bigint not null default 0,
  commission_cents bigint not null default 0,
  prizes_paid_cents bigint not null default 0,
  remitted_cents bigint not null default 0,
  balance_cents bigint not null default 0,
  rate_bps integer not null default 0,
  closed_by uuid not null references public.gespro_profiles(user_id),
  closed_at timestamptz not null default clock_timestamp(),
  unique(bank_id, seller_id, closing_date)
);
alter table public.gespro_cash_closings enable row level security;
revoke all on public.gespro_cash_closings from public,anon,authenticated;
grant select on public.gespro_cash_closings to authenticated;
drop policy if exists cash_closings_read on public.gespro_cash_closings;
create policy cash_closings_read on public.gespro_cash_closings for select to authenticated
  using(gespro_private.is_platform_admin() or gespro_private.bank_role(bank_id)='owner');
grant all on public.gespro_cash_closings to service_role;

-- Function: pay a winning ticket (owner/admin only)
create or replace function gespro_private.pay_winning_ticket(ticket_key bigint) returns public.gespro_payments
language plpgsql security definer set search_path='' as $$
declare t public.gespro_test_tickets; actor uuid=auth.uid(); bal public.gespro_balances; p public.gespro_payments;
begin
  if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
  select * into t from public.gespro_test_tickets where id=ticket_key for update;
  if not found then raise exception 'Ticket not found'; end if;
  if t.status <> 'winner' then raise exception 'Ticket is not a winner'; end if;
  if not gespro_private.is_platform_admin() and gespro_private.bank_role(t.bank_id) <> 'owner' then
    raise exception 'Access denied' using errcode='42501';
  end if;
  if exists(select 1 from public.gespro_payments where ticket_id=ticket_key) then
    raise exception 'Ticket already paid';
  end if;
  select * into bal from public.gespro_balances where bank_id=t.bank_id for update;
  if not found then
    insert into public.gespro_balances(bank_id) values(t.bank_id) returning * into bal;
    select * into bal from public.gespro_balances where bank_id=t.bank_id for update;
  end if;
  insert into public.gespro_payments(ticket_id, bank_id, amount_cents, paid_by)
  values(t.id, t.bank_id, t.prize_cents, actor) returning * into p;
  update public.gespro_balances
  set total_prizes_paid_cents = total_prizes_paid_cents + t.prize_cents,
      updated_at = clock_timestamp()
  where bank_id = t.bank_id;
  return p;
end $$;
revoke all on function gespro_private.pay_winning_ticket(bigint) from public,anon,authenticated;
grant execute on function gespro_private.pay_winning_ticket(bigint) to authenticated;

create or replace function public.gespro_pay_winning_ticket(ticket_key bigint) returns public.gespro_payments
language sql security invoker set search_path='' as $$select gespro_private.pay_winning_ticket(ticket_key)$$;
revoke all on function public.gespro_pay_winning_ticket(bigint) from public,anon,authenticated;
grant execute on function public.gespro_pay_winning_ticket(bigint) to authenticated;

-- Function: record a cash closing (remittance)
create or replace function gespro_private.record_cash_closing(
  target_bank uuid, target_seller uuid, closing_date date,
  rate_bps integer, remitted_cents bigint
) returns public.gespro_cash_closings
language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); bal public.gespro_balances; c public.gespro_cash_closings;
  gross bigint; cancelled bigint; net bigint; commission bigint; prizes_paid bigint;
begin
  if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
  if not gespro_private.is_platform_admin() and gespro_private.bank_role(target_bank) <> 'owner' then
    raise exception 'Access denied' using errcode='42501';
  end if;
  if rate_bps < 0 or rate_bps > 10000 then raise exception 'Invalid commission rate'; end if;
  if remitted_cents < 0 then raise exception 'Invalid remittance'; end if;
  select * into bal from public.gespro_balances where bank_id=target_bank for update;
  if not found then
    insert into public.gespro_balances(bank_id) values(target_bank) returning * into bal;
    select * into bal from public.gespro_balances where bank_id=target_bank for update;
  end if;
  gross := bal.total_sales_cents;
  cancelled := bal.total_cancelled_cents;
  net := gross - cancelled;
  commission := round(net * rate_bps / 10000.0)::bigint;
  prizes_paid := bal.total_prizes_paid_cents;
  if remitted_cents > (net - commission - prizes_paid - bal.total_remitted_cents) then
    raise exception 'Remittance exceeds available balance';
  end if;
  insert into public.gespro_cash_closings(
    bank_id, seller_id, closing_date,
    gross_cents, cancelled_cents, net_cents, commission_cents,
    prizes_paid_cents, remitted_cents, balance_cents, rate_bps, closed_by
  ) values(
    target_bank, target_seller, closing_date,
    gross, cancelled, net, commission,
    prizes_paid, remitted_cents,
    net - commission - prizes_paid - remitted_cents,
    rate_bps, actor
  )
  on conflict (bank_id, seller_id, closing_date) do update set
    gross_cents=excluded.gross_cents, cancelled_cents=excluded.cancelled_cents,
    net_cents=excluded.net_cents, commission_cents=excluded.commission_cents,
    prizes_paid_cents=excluded.prizes_paid_cents, remitted_cents=excluded.remitted_cents,
    balance_cents=excluded.balance_cents, rate_bps=excluded.rate_bps,
    closed_by=excluded.closed_by, closed_at=clock_timestamp()
  returning * into c;
  update public.gespro_balances
  set total_remitted_cents = total_remitted_cents + remitted_cents,
      total_commission_cents = total_commission_cents + commission,
      updated_at = clock_timestamp()
  where bank_id = target_bank;
  return c;
end $$;
revoke all on function gespro_private.record_cash_closing(uuid,uuid,date,integer,bigint) from public,anon,authenticated;
grant execute on function gespro_private.record_cash_closing(uuid,uuid,date,integer,bigint) to authenticated;

create or replace function public.gespro_record_cash_closing(
  target_bank uuid, target_seller uuid, closing_date date,
  rate_bps integer, remitted_cents bigint
) returns public.gespro_cash_closings
language sql security invoker set search_path='' as $$
select gespro_private.record_cash_closing(target_bank, target_seller, closing_date, rate_bps, remitted_cents)
$$;
revoke all on function public.gespro_record_cash_closing(uuid,uuid,date,integer,bigint) from public,anon,authenticated;
grant execute on function public.gespro_record_cash_closing(uuid,uuid,date,integer,bigint) to authenticated;

-- Function: get bank balance summary
create or replace function public.gespro_bank_balance(target_bank uuid) returns jsonb
language sql security invoker set search_path='' as $$
select coalesce((
  select jsonb_build_object(
    'total_sales', total_sales_cents,
    'total_cancelled', total_cancelled_cents,
    'total_prizes_paid', total_prizes_paid_cents,
    'total_commission', total_commission_cents,
    'total_remitted', total_remitted_cents,
    'net_sales', total_sales_cents - total_cancelled_cents,
    'balance', (total_sales_cents - total_cancelled_cents) - total_commission_cents - total_prizes_paid_cents - total_remitted_cents
  )
  from public.gespro_balances where bank_id = target_bank
), jsonb_build_object(
  'total_sales', 0, 'total_cancelled', 0, 'total_prizes_paid', 0,
  'total_commission', 0, 'total_remitted', 0, 'net_sales', 0, 'balance', 0
))
$$;
revoke all on function public.gespro_bank_balance(uuid) from public,anon,authenticated;
grant execute on function public.gespro_bank_balance(uuid) to authenticated;