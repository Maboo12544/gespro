-- GesPro Supabase foundation
-- Run in a new Supabase project's SQL editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.gespro_role as enum ('super_admin', 'owner', 'supervisor', 'seller');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.account_status as enum ('active', 'paused');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.draw_status as enum ('open', 'closed', 'settled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.ticket_status as enum ('valid', 'winner', 'loser', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  status public.account_status not null default 'active',
  cancellation_minutes integer not null default 5 check (cancellation_minutes between 0 and 120),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.gespro_role not null,
  status public.account_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.points_of_sale (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.lotteries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  timezone text not null default 'America/New_York',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  lottery_id uuid not null references public.lotteries(id),
  name text not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status public.draw_status not null default 'open',
  result jsonb,
  result_source text check (result_source in ('api', 'super_admin')),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.play_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  draw_id uuid not null references public.draws(id) on delete cascade,
  play_type text not null,
  number text not null default '*',
  max_amount numeric(14,2) not null check (max_amount >= 0),
  created_at timestamptz not null default now(),
  unique (organization_id, draw_id, play_type, number)
);

create table if not exists public.number_exposure (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  draw_id uuid not null references public.draws(id) on delete cascade,
  play_type text not null,
  number text not null,
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, draw_id, play_type, number)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  organization_id uuid not null references public.organizations(id),
  point_of_sale_id uuid not null references public.points_of_sale(id),
  seller_id uuid not null references public.profiles(id),
  draw_id uuid not null references public.draws(id),
  total numeric(14,2) not null check (total > 0),
  status public.ticket_status not null default 'valid',
  client_request_id text,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancellation_reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists tickets_request_once
  on public.tickets (organization_id, client_request_id)
  where client_request_id is not null;
create index if not exists tickets_org_created_idx on public.tickets (organization_id, created_at desc);
create index if not exists tickets_draw_status_idx on public.tickets (draw_id, status);
create index if not exists tickets_seller_created_idx on public.tickets (seller_id, created_at desc);

create table if not exists public.ticket_plays (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  play_type text not null,
  number text not null check (number ~ '^[0-9-]{1,21}$'),
  amount numeric(14,2) not null check (amount > 0),
  payout_amount numeric(14,2) not null default 0 check (payout_amount >= 0),
  is_winner boolean,
  created_at timestamptz not null default now()
);
create index if not exists ticket_plays_ticket_idx on public.ticket_plays (ticket_id);
create index if not exists ticket_plays_number_idx on public.ticket_plays (play_type, number);

create table if not exists public.payout_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  play_type text not null,
  multiplier numeric(14,2) not null check (multiplier >= 0),
  status public.account_status not null default 'active',
  unique (organization_id, play_type)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null unique references public.tickets(id),
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  paid_by uuid references public.profiles(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

create table if not exists public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_admin_id uuid not null references public.platform_admins(user_id),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reason text not null default 'Configuration assistance',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
create index if not exists support_sessions_org_started_idx on public.support_sessions (organization_id, started_at desc);

create or replace function public.current_user_is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins a
    join public.profiles p on p.id = a.user_id
    where a.user_id = auth.uid() and p.status = 'active'
  );
$$;

create or replace function public.is_active_org_member(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.current_user_is_super_admin() or exists (
    select 1 from public.organization_members
    where user_id = auth.uid() and organization_id = target_org and status = 'active'
  );
$$;

create or replace function public.can_manage_org(target_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.current_user_is_super_admin() or exists (
    select 1 from public.organization_members
    where user_id = auth.uid() and organization_id = target_org
      and role in ('owner', 'supervisor') and status = 'active'
  );
$$;

create or replace function public.can_manage_member(target_org uuid, target_role public.gespro_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select (
    public.current_user_is_super_admin() and target_role <> 'super_admin'
  ) or exists (
    select 1 from public.organization_members
    where user_id = auth.uid() and organization_id = target_org
      and role = 'owner' and status = 'active'
      and target_role in ('supervisor', 'seller')
  );
$$;

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.points_of_sale enable row level security;
alter table public.lotteries enable row level security;
alter table public.draws enable row level security;
alter table public.play_limits enable row level security;
alter table public.number_exposure enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_plays enable row level security;
alter table public.payout_rules enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.support_sessions enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (
  id = auth.uid() or public.current_user_is_super_admin() or exists (
    select 1 from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id and mine.status = 'active'
  )
);

drop policy if exists platform_admins_read_self on public.platform_admins;
create policy platform_admins_read_self on public.platform_admins for select to authenticated
using (user_id = auth.uid());

drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations for select to authenticated
using (public.is_active_org_member(id));
drop policy if exists organizations_admin_write on public.organizations;
create policy organizations_admin_write on public.organizations for all to authenticated
using (public.current_user_is_super_admin()) with check (public.current_user_is_super_admin());

drop policy if exists members_read on public.organization_members;
create policy members_read on public.organization_members for select to authenticated
using (public.is_active_org_member(organization_id));
drop policy if exists members_manage on public.organization_members;
create policy members_manage on public.organization_members for all to authenticated
using (public.can_manage_member(organization_id, role))
with check (public.can_manage_member(organization_id, role));

drop policy if exists pos_read on public.points_of_sale;
create policy pos_read on public.points_of_sale for select to authenticated
using (public.is_active_org_member(organization_id));
drop policy if exists pos_manage on public.points_of_sale;
create policy pos_manage on public.points_of_sale for all to authenticated
using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

drop policy if exists lotteries_read on public.lotteries;
create policy lotteries_read on public.lotteries for select to authenticated using (true);
drop policy if exists lotteries_admin_write on public.lotteries;
create policy lotteries_admin_write on public.lotteries for all to authenticated
using (public.current_user_is_super_admin()) with check (public.current_user_is_super_admin());

drop policy if exists draws_read on public.draws;
create policy draws_read on public.draws for select to authenticated using (true);
drop policy if exists draws_admin_write on public.draws;
create policy draws_admin_write on public.draws for all to authenticated
using (public.current_user_is_super_admin()) with check (public.current_user_is_super_admin());

drop policy if exists limits_read on public.play_limits;
create policy limits_read on public.play_limits for select to authenticated
using (public.is_active_org_member(organization_id));
drop policy if exists limits_manage on public.play_limits;
create policy limits_manage on public.play_limits for all to authenticated
using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

drop policy if exists exposure_read on public.number_exposure;
create policy exposure_read on public.number_exposure for select to authenticated
using (public.is_active_org_member(organization_id));

drop policy if exists tickets_read on public.tickets;
create policy tickets_read on public.tickets for select to authenticated
using (public.is_active_org_member(organization_id));

drop policy if exists plays_read on public.ticket_plays;
create policy plays_read on public.ticket_plays for select to authenticated
using (exists (
  select 1 from public.tickets t
  where t.id = ticket_plays.ticket_id and public.is_active_org_member(t.organization_id)
));

drop policy if exists payout_rules_read on public.payout_rules;
create policy payout_rules_read on public.payout_rules for select to authenticated
using (public.is_active_org_member(organization_id));
drop policy if exists payout_rules_manage on public.payout_rules;
create policy payout_rules_manage on public.payout_rules for all to authenticated
using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to authenticated
using (exists (
  select 1 from public.tickets t
  where t.id = payments.ticket_id and public.is_active_org_member(t.organization_id)
));

drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated
using (organization_id is null and public.current_user_is_super_admin()
  or organization_id is not null and public.can_manage_org(organization_id));

drop policy if exists support_sessions_super_admin on public.support_sessions;
create policy support_sessions_super_admin on public.support_sessions for all to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin() and platform_admin_id = auth.uid());

create or replace function public.sell_ticket(
  p_point_of_sale_id uuid,
  p_draw_id uuid,
  p_plays jsonb,
  p_client_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
  v_ticket uuid;
  v_ticket_code text;
  v_total numeric(14,2);
  v_draw public.draws%rowtype;
  v_item record;
  v_limit numeric(14,2);
  v_new_exposure numeric(14,2);
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_plays) <> 'array' or jsonb_array_length(p_plays) = 0 then
    raise exception 'EMPTY_TICKET';
  end if;

  select organization_id into v_org from public.points_of_sale
  where id = p_point_of_sale_id and status = 'active';
  if v_org is null or not public.is_active_org_member(v_org) then
    raise exception 'POINT_OF_SALE_DENIED';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = v_org and user_id = v_user and status = 'active'
      and role in ('owner', 'supervisor', 'seller')
  ) and not public.current_user_is_super_admin() then
    raise exception 'SELLER_DENIED';
  end if;

  select * into v_draw from public.draws where id = p_draw_id for update;
  if not found or v_draw.status <> 'open' or v_draw.closes_at <= now() then
    raise exception 'DRAW_CLOSED';
  end if;

  if p_client_request_id is not null then
    select id into v_ticket from public.tickets
    where organization_id = v_org and client_request_id = p_client_request_id;
    if v_ticket is not null then return v_ticket; end if;
  end if;

  select sum((item->>'amount')::numeric) into v_total
  from jsonb_array_elements(p_plays) item;
  if v_total is null or v_total <= 0 then raise exception 'INVALID_TOTAL'; end if;

  v_ticket_code := 'GP-' || to_char(clock_timestamp(), 'YYMMDDHH24MISSMS') || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));
  insert into public.tickets(code, organization_id, point_of_sale_id, seller_id, draw_id, total, client_request_id)
  values(v_ticket_code, v_org, p_point_of_sale_id, v_user, p_draw_id, v_total, p_client_request_id)
  returning id into v_ticket;

  for v_item in
    select item->>'play_type' as play_type, item->>'number' as number,
           sum((item->>'amount')::numeric) as requested
    from jsonb_array_elements(p_plays) item
    where item->>'number' ~ '^[0-9-]{1,21}$'
      and (item->>'amount')::numeric > 0
    group by item->>'play_type', item->>'number'
  loop
    select max_amount into v_limit from public.play_limits
    where organization_id = v_org and draw_id = p_draw_id
      and play_type = v_item.play_type and number in (v_item.number, '*')
    order by case when number = v_item.number then 0 else 1 end limit 1;
    v_limit := coalesce(v_limit, 999999999);
    if v_item.requested > v_limit then raise exception 'NUMBER_LIMIT_REACHED:%', v_item.number; end if;

    v_new_exposure := null;
    insert into public.number_exposure(organization_id, draw_id, play_type, number, total_amount)
    values(v_org, p_draw_id, v_item.play_type, v_item.number, v_item.requested)
    on conflict (organization_id, draw_id, play_type, number)
    do update set total_amount = public.number_exposure.total_amount + excluded.total_amount,
                  updated_at = now()
    where public.number_exposure.total_amount + excluded.total_amount <= v_limit
    returning total_amount into v_new_exposure;
    if v_new_exposure is null then raise exception 'NUMBER_LIMIT_REACHED:%', v_item.number; end if;
  end loop;

  if jsonb_array_length(p_plays) <> (
    select count(*) from jsonb_array_elements(p_plays) item
    where item->>'number' ~ '^[0-9-]{1,21}$'
      and coalesce(item->>'play_type','') <> ''
      and (item->>'amount')::numeric > 0
  ) then raise exception 'INVALID_PLAY'; end if;

  insert into public.ticket_plays(ticket_id, play_type, number, amount)
  select v_ticket, item->>'play_type', item->>'number', (item->>'amount')::numeric
  from jsonb_array_elements(p_plays) item;

  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_data)
  values(v_org, v_user, 'ticket.created', 'ticket', v_ticket::text,
    jsonb_build_object('code', v_ticket_code, 'total', v_total));
  return v_ticket;
end;
$$;

create or replace function public.cancel_ticket(p_ticket_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_ticket public.tickets%rowtype; v_minutes integer;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found or not public.can_manage_org(v_ticket.organization_id) then raise exception 'CANCEL_DENIED'; end if;
  select cancellation_minutes into v_minutes from public.organizations where id = v_ticket.organization_id;
  if v_ticket.status <> 'valid' or now() > v_ticket.created_at + make_interval(mins => v_minutes) then
    raise exception 'CANCELLATION_WINDOW_CLOSED';
  end if;
  update public.tickets set status='cancelled', cancelled_at=now(), cancelled_by=auth.uid(), cancellation_reason=p_reason where id=p_ticket_id;
  update public.number_exposure e set total_amount = greatest(0, e.total_amount - x.amount), updated_at=now()
  from (
    select t.organization_id, t.draw_id, p.play_type, p.number, sum(p.amount) amount
    from public.tickets t join public.ticket_plays p on p.ticket_id=t.id
    where t.id=p_ticket_id group by t.organization_id,t.draw_id,p.play_type,p.number
  ) x
  where e.organization_id=x.organization_id and e.draw_id=x.draw_id and e.play_type=x.play_type and e.number=x.number;
  insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,before_data,after_data)
  values(v_ticket.organization_id,auth.uid(),'ticket.cancelled','ticket',p_ticket_id::text,
    jsonb_build_object('status','valid'),jsonb_build_object('status','cancelled','reason',p_reason));
  return true;
end;
$$;

create or replace function public.close_expired_draws()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.draws set status='closed'
  where status='open' and closes_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.settle_draw(
  p_draw_id uuid,
  p_result jsonb,
  p_source text default 'super_admin'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  if not public.current_user_is_super_admin() then raise exception 'SUPER_ADMIN_REQUIRED'; end if;
  if jsonb_typeof(p_result) <> 'object' then raise exception 'INVALID_RESULT'; end if;
  if p_source not in ('api', 'super_admin') then raise exception 'INVALID_RESULT_SOURCE'; end if;

  update public.draws
  set result = p_result, result_source = p_source, status = 'settled', settled_at = now()
  where id = p_draw_id and status in ('open', 'closed');
  if not found then raise exception 'DRAW_NOT_SETTLEABLE'; end if;

  update public.ticket_plays p
  set is_winner = coalesce((p_result -> p.play_type) ? p.number, false),
      payout_amount = case
        when coalesce((p_result -> p.play_type) ? p.number, false)
        then p.amount * coalesce((
          select r.multiplier from public.payout_rules r
          where r.organization_id = t.organization_id
            and r.play_type = p.play_type and r.status = 'active'
          limit 1
        ), 0)
        else 0
      end
  from public.tickets t
  where p.ticket_id = t.id and t.draw_id = p_draw_id and t.status = 'valid';

  update public.tickets t
  set status = case when exists (
    select 1 from public.ticket_plays p where p.ticket_id = t.id and p.is_winner
  ) then 'winner'::public.ticket_status else 'loser'::public.ticket_status end
  where t.draw_id = p_draw_id and t.status = 'valid';

  insert into public.payments(ticket_id, amount)
  select t.id, sum(p.payout_amount)
  from public.tickets t join public.ticket_plays p on p.ticket_id = t.id
  where t.draw_id = p_draw_id and t.status = 'winner'
  group by t.id
  on conflict (ticket_id) do update set amount = excluded.amount, status = 'pending';
  get diagnostics v_count = row_count;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, after_data)
  values(auth.uid(), 'draw.settled', 'draw', p_draw_id::text,
    jsonb_build_object('source', p_source, 'result', p_result));
  return v_count;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, phone)
  values(
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1), 'GesPro User'),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

revoke all on function public.sell_ticket(uuid,uuid,jsonb,text) from public;
revoke all on function public.cancel_ticket(uuid,text) from public;
revoke all on function public.close_expired_draws() from public;
revoke all on function public.settle_draw(uuid,jsonb,text) from public;
grant execute on function public.sell_ticket(uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.cancel_ticket(uuid,text) to authenticated;
grant execute on function public.close_expired_draws() to service_role;
grant execute on function public.settle_draw(uuid,jsonb,text) to authenticated;
