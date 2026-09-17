-- Test-only records. No balances, settlement or payment writes.
create table if not exists public.gespro_test_games(name text primary key,mode text not null check(mode in ('bolet3','pick2','massachusetts4','dominican3')));
insert into public.gespro_test_games values
('FL PICK 2 AM','pick2'),('FL PICK 2 PM','pick2'),('FLORIDA AM','bolet3'),('FLORIDA PM','bolet3'),('NEW YORK AM','bolet3'),('NEW YORK PM','bolet3'),('GEORGIA EVENING','bolet3'),('GEORGIA MIDDAY','bolet3'),('MASSACHUSETTS EVENING','massachusetts4'),
('NACIONAL — QUINIELA','dominican3'),('NACIONAL — GANA MÁS','dominican3'),('LEIDSA — QUINIELA','dominican3'),('LOTEKA — QUINIELA','dominican3'),('LOTERÍA REAL — QUINIELA','dominican3'),('LA PRIMERA — QUINIELA','dominican3'),('LA SUERTE — QUINIELA','dominican3')
on conflict (name) do nothing;
alter table public.gespro_test_games enable row level security;
revoke all on public.gespro_test_games from public,anon,authenticated;
grant select on public.gespro_test_games to authenticated;
create policy test_games_read on public.gespro_test_games for select to authenticated using(auth.uid() is not null);
create table if not exists public.gespro_test_tickets(
 id bigint generated always as identity(start with 10000001) primary key,
 request_id uuid not null,bank_id uuid not null references public.gespro_banks(id),pos_id uuid not null,
 seller_id uuid not null references public.gespro_profiles(user_id),seller_name text not null,bank_name text not null,pos_name text not null,
 created_at timestamptz not null default clock_timestamp(),cancel_until timestamptz not null,
 amount_cents bigint not null check(amount_cents>0),plays jsonb not null,
 status text not null default 'pending' check(status in ('pending','cancelled')),
 cancelled_at timestamptz,cancelled_by uuid references public.gespro_profiles(user_id),cancelled_name text,
 unique(seller_id,request_id),foreign key(bank_id,pos_id) references public.gespro_points_of_sale(bank_id,id)
);
create index if not exists gespro_test_tickets_scope on public.gespro_test_tickets(bank_id,pos_id,created_at desc,id desc);
create table if not exists public.gespro_test_ticket_audit(
 id bigint generated always as identity primary key,ticket_id bigint not null references public.gespro_test_tickets(id),
 actor_id uuid not null,action text not null check(action in ('created','cancelled')),created_at timestamptz not null default clock_timestamp()
);
alter table public.gespro_test_tickets enable row level security;
alter table public.gespro_test_ticket_audit enable row level security;
revoke all on public.gespro_test_tickets,public.gespro_test_ticket_audit from public,anon,authenticated;
grant select on public.gespro_test_tickets,public.gespro_test_ticket_audit to authenticated;
create policy test_ticket_read on public.gespro_test_tickets for select to authenticated using(
 gespro_private.can_read_pos(bank_id,pos_id) and exists(select 1 from public.gespro_banks b where b.id=bank_id and b.active)
 and exists(select 1 from public.gespro_points_of_sale p where p.id=pos_id and p.active));
create policy test_ticket_audit_read on public.gespro_test_ticket_audit for select to authenticated using(
 exists(select 1 from public.gespro_test_tickets t where t.id=ticket_id and (gespro_private.is_platform_admin() or gespro_private.bank_role(t.bank_id)='owner')));
-- Mutations are internal, with a verified auth.uid(), locked assignments and no table write grants.
create or replace function gespro_private.require_test_pos(target uuid) returns public.gespro_points_of_sale
language plpgsql security definer set search_path='' as $$
declare p public.gespro_points_of_sale; r text; actor uuid=auth.uid();
begin
 if actor is null then raise exception 'Access denied' using errcode='42501';end if;
 perform 1 from public.gespro_profiles where user_id=actor and active for share;
 if not found then raise exception 'Access denied' using errcode='42501';end if;
 select * into p from public.gespro_points_of_sale where id=target and active for share;
 if not found then raise exception 'Access denied' using errcode='42501';end if;
 perform 1 from public.gespro_banks where id=p.bank_id and active for share;
 if not found then raise exception 'Access denied' using errcode='42501';end if;
 if gespro_private.is_platform_admin() then return p;end if;
 select role into r from public.gespro_memberships where bank_id=p.bank_id and user_id=actor and active for share;
 if r='owner' then return p;end if;
 if r is distinct from 'seller' then raise exception 'Access denied' using errcode='42501';end if;
 perform 1 from public.gespro_pos_assignments where bank_id=p.bank_id and pos_id=p.id and user_id=actor for share;
 if not found then raise exception 'Access denied' using errcode='42501';end if;
 return p;
end $$;
create or replace function gespro_private.create_test_ticket(target_pos uuid,request_key uuid,entries jsonb) returns public.gespro_test_tickets
language plpgsql security definer set search_path='' as $$
declare p public.gespro_points_of_sale;t public.gespro_test_tickets;e jsonb;canonical jsonb='[]';mode text;kind text;num text;cash numeric;total bigint=0;actor uuid=auth.uid();stamp timestamptz;
begin
 p=gespro_private.require_test_pos(target_pos);
 if request_key is null or jsonb_typeof(entries) is distinct from 'array' or jsonb_array_length(entries) not between 1 and 500 then raise exception 'Invalid ticket';end if;
 for e in select value from jsonb_array_elements(entries) loop
  if jsonb_typeof(e->'amount') is distinct from 'number' or jsonb_typeof(e->'number') is distinct from 'string' then raise exception 'Invalid play';end if;
  select g.mode into mode from public.gespro_test_games g where g.name=e->>'lottery';
  if not found then raise exception 'Unknown test lottery';end if;
  kind=e->>'type';num=e->>'number';cash=(e->>'amount')::numeric;
  if cash<=0 or cash>100000 or cash<>round(cash,2) then raise exception 'Invalid amount';end if;
  if kind is null or kind not in ('DIRECTO','REVÈ','BOUL PÈ','PALÉ','TRIPLETA','CASH 3 STRAIGHT','CASH 3 BOX','PLAY 4 STRAIGHT','PLAY 4 BOX','PICK 5 STRAIGHT','PICK 5 BOX') then raise exception 'Invalid play';end if;
  if not(case when kind in ('DIRECTO','REVÈ','BOUL PÈ') then num~'^[0-9]{2}$' when kind='PALÉ' then num~'^[0-9]{2}-[0-9]{2}$' when kind='TRIPLETA' then num~'^[0-9]{2}-[0-9]{2}-[0-9]{2}$' when kind like 'CASH 3%' then num~'^[0-9]{3}$' when kind like 'PLAY 4%' then num~'^[0-9]{4}$' else num~'^[0-9]{5}$' end) then raise exception 'Invalid number';end if;
  if (mode='pick2' and kind not in ('DIRECTO','REVÈ','BOUL PÈ')) or (mode='dominican3' and kind not in ('DIRECTO','REVÈ','BOUL PÈ','PALÉ','TRIPLETA')) or (mode<>'dominican3' and kind='TRIPLETA') or (mode='massachusetts4' and kind like 'PICK 5%') then raise exception 'Invalid lottery game';end if;
  canonical=canonical||jsonb_build_array(jsonb_build_object('lottery',e->>'lottery','type',kind,'number',num,'amount',cash));total=total+(cash*100)::bigint;
 end loop;
 if exists(select 1 from jsonb_array_elements(canonical) x group by x->>'lottery',case when x->>'type' in ('DIRECTO','REVÈ','BOUL PÈ') then 'DIRECTO' else x->>'type' end,x->>'number' having count(*)>1) then raise exception 'Duplicate play';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||request_key::text,0));
 select * into t from public.gespro_test_tickets where seller_id=actor and request_id=request_key;
 if found then
  if t.pos_id<>p.id or t.plays<>canonical then raise exception 'Request already used';end if;
  return t;
 end if;
 stamp=clock_timestamp();
 insert into public.gespro_test_tickets(request_id,bank_id,pos_id,seller_id,seller_name,bank_name,pos_name,created_at,cancel_until,amount_cents,plays)
 values(request_key,p.bank_id,p.id,actor,(select coalesce(nullif(display_name,''),username) from public.gespro_profiles where user_id=actor),(select name from public.gespro_banks where id=p.bank_id),p.name,stamp,stamp+interval '5 minutes',total,canonical) returning * into t;
 insert into public.gespro_test_ticket_audit(ticket_id,actor_id,action) values(t.id,actor,'created');
 return t;
end $$;
create or replace function gespro_private.cancel_test_ticket(ticket_key bigint) returns public.gespro_test_tickets
language plpgsql security definer set search_path='' as $$
declare t public.gespro_test_tickets;p public.gespro_points_of_sale;actor uuid=auth.uid();
begin
 select * into t from public.gespro_test_tickets where id=ticket_key;
 if not found then raise exception 'Access denied' using errcode='42501';end if;
 p=gespro_private.require_test_pos(t.pos_id);
 if not gespro_private.is_platform_admin() and gespro_private.bank_role(t.bank_id)<>'owner' and t.seller_id<>actor then raise exception 'Access denied' using errcode='42501';end if;
 select * into t from public.gespro_test_tickets where id=ticket_key for update;
 if t.status='cancelled' then return t;end if;
 if t.status<>'pending' or clock_timestamp()>=t.cancel_until then raise exception 'Cancellation expired';end if;
 update public.gespro_test_tickets set status='cancelled',cancelled_at=clock_timestamp(),cancelled_by=actor,cancelled_name=(select coalesce(nullif(display_name,''),username) from public.gespro_profiles where user_id=actor) where id=t.id returning * into t;
 insert into public.gespro_test_ticket_audit(ticket_id,actor_id,action) values(t.id,actor,'cancelled');return t;
end $$;
revoke all on function gespro_private.require_test_pos(uuid),gespro_private.create_test_ticket(uuid,uuid,jsonb),gespro_private.cancel_test_ticket(bigint) from public,anon,authenticated;
grant execute on function gespro_private.create_test_ticket(uuid,uuid,jsonb),gespro_private.cancel_test_ticket(bigint) to authenticated;
create or replace function public.gespro_create_test_ticket(target_pos uuid,request_key uuid,entries jsonb) returns public.gespro_test_tickets language sql security invoker set search_path='' as $$select gespro_private.create_test_ticket(target_pos,request_key,entries)$$;
create or replace function public.gespro_cancel_test_ticket(ticket_key bigint) returns public.gespro_test_tickets language sql security invoker set search_path='' as $$select gespro_private.cancel_test_ticket(ticket_key)$$;
revoke all on function public.gespro_create_test_ticket(uuid,uuid,jsonb),public.gespro_cancel_test_ticket(bigint) from public,anon,authenticated;
grant execute on function public.gespro_create_test_ticket(uuid,uuid,jsonb),public.gespro_cancel_test_ticket(bigint) to authenticated;