-- Test result publication and settlement system
create table if not exists public.gespro_test_results (
 lottery text not null, mode text not null check(mode in ('bolet3','pick2','massachusetts4','dominican3')),
 draw_date date not null, numbers jsonb not null, derived jsonb not null,
 version integer not null default 1, updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null references public.gespro_profiles(user_id),
 primary key(lottery,mode,draw_date)
);
create table if not exists public.gespro_test_result_audit (
 id bigint generated always as identity primary key, lottery text not null, mode text not null, draw_date date not null,
 version integer not null, before_numbers jsonb, numbers jsonb not null, reason text not null,
 actor_id uuid not null, created_at timestamptz not null default clock_timestamp()
);
alter table public.gespro_test_results enable row level security;
alter table public.gespro_test_result_audit enable row level security;
revoke all on public.gespro_test_results,public.gespro_test_result_audit from public,anon,authenticated;
grant select on public.gespro_test_results,public.gespro_test_result_audit to authenticated;
create policy test_results_read on public.gespro_test_results for select to authenticated using (
 gespro_private.is_platform_admin() or exists(select 1 from public.gespro_memberships m join public.gespro_banks b on b.id=m.bank_id join public.gespro_profiles p on p.user_id=m.user_id where m.user_id=auth.uid() and m.active and b.active and p.active)
);
create policy test_result_audit_read on public.gespro_test_result_audit for select to authenticated using(gespro_private.is_platform_admin());
alter table public.gespro_test_tickets drop constraint if exists gespro_test_tickets_status_check;
alter table public.gespro_test_tickets add constraint gespro_test_tickets_status_check check(status in ('pending','cancelled','winner','loser'));
alter table public.gespro_test_tickets add column if not exists prize_cents bigint not null default 0 check(prize_cents>=0),
 add column if not exists settlement jsonb not null default '[]', add column if not exists review_required boolean not null default false;

create or replace function gespro_private.derive_test_result(mode text,numbers jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare widths integer[];i integer;a text;b text;c text;
begin
 widths=case mode when 'pick2' then array[2] when 'massachusetts4' then array[4] when 'dominican3' then array[2,2,2] when 'bolet3' then array[3,2,2] else null end;
 if widths is null or jsonb_typeof(numbers) is distinct from 'array' or jsonb_array_length(numbers)<>array_length(widths,1) then raise exception 'Invalid result';end if;
 for i in 1..array_length(widths,1) loop
  if jsonb_typeof(numbers->(i-1)) is distinct from 'string' or (numbers->>(i-1)) !~ ('^[0-9]{'||widths[i]||'}$') then raise exception 'Invalid result';end if;
 end loop;
 a=numbers->>0;b=numbers->>1;c=numbers->>2;
 if mode in ('pick2','dominican3') then return numbers;end if;
 if mode='massachusetts4' then return jsonb_build_array(left(a,2),substring(a from 2 for 2),right(a,2),left(a,3),a,'',right(a,3));end if;
 return jsonb_build_array(right(a,2),b,c,a,b||c,a||b);
end $$;

create or replace function gespro_private.snapshot_test_rates() returns trigger
language plpgsql security definer set search_path='' as $$
declare item jsonb;items jsonb='[]';rates jsonb;candidate jsonb;k text;super_count integer;day date;
begin
 if auth.uid() is null then raise exception 'Access denied' using errcode='42501';end if;
 for item in select value from jsonb_array_elements(new.configuration_snapshot->'lotteries') order by value->>'lottery',value->>'mode' loop
  day=(new.created_at at time zone (item->'schedule'->>'zone'))::date;
  perform pg_advisory_xact_lock(hashtextextended('result:'||jsonb_build_array(item->>'lottery',item->>'mode',day)::text,0));
  if exists(select 1 from public.gespro_test_results r where r.lottery=item->>'lottery' and r.mode=item->>'mode' and r.draw_date=day) then raise exception 'Result already published';end if;
  rates=null;super_count=0;
  select value into rates from jsonb_each(new.configuration_snapshot->'rates') where key::jsonb=jsonb_build_array(item->>'lotteryId',new.bank_name,'pos:'||new.pos_id::text);
  if rates is null then
   select count(distinct kv.value),min(kv.value::text)::jsonb into super_count,candidate
   from jsonb_each(new.configuration_snapshot->'rates') kv
   join public.gespro_pos_assignments a on a.bank_id=new.bank_id and a.pos_id=new.pos_id
   join public.gespro_memberships m on m.bank_id=a.bank_id and m.user_id=a.user_id and m.active and m.role='supervisor'
   where kv.key::jsonb=jsonb_build_array(item->>'lotteryId',new.bank_name,'supervisor:'||a.user_id::text);
   if super_count=1 then rates=candidate;end if;
  end if;
  if super_count<=1 then
   foreach k in array array['admin','bank'] loop
    if rates is null then select value into rates from jsonb_each(new.configuration_snapshot->'rates') where key::jsonb=jsonb_build_array(item->>'lotteryId',new.bank_name,k);end if;
   end loop;
   if rates is null then select value into rates from jsonb_each(new.configuration_snapshot->'rates') where key::jsonb=jsonb_build_array(item->>'lotteryId','*','bank');end if;
   if rates is null then rates=case when item->>'mode'='dominican3' then '{"1st — Premye lo":"0","2nd — Dezyèm lo":"0","3rd — Twazyèm lo":"0"}'::jsonb else '{"1st — Premye lo":"65","2nd — Dezyèm lo":"15","3rd — Twazyèm lo":"10","Pick3 Straight":"700","Pick4 Straight":"4000","Pick5 Straight":"0"}'::jsonb end;end if;
  end if;
  items=items||jsonb_build_array(item||jsonb_build_object('drawDate',day,'effectiveRates',rates));
 end loop;
 new.configuration_snapshot=jsonb_set(new.configuration_snapshot,'{lotteries}',items);
 return new;
end $$;

create or replace function gespro_private.recalculate_test_ticket(ticket_key bigint) returns void
language plpgsql security definer set search_path='' as $$
declare t public.gespro_test_tickets;e jsonb;item jsonb;r public.gespro_test_results;details jsonb='[]';matches jsonb;rate text;label text;amount numeric;total bigint=0;line_total numeric;i integer;position integer;all_done boolean=true;review boolean=false;day date;
begin
 if auth.uid() is null or not gespro_private.is_platform_admin() then raise exception 'Access denied' using errcode='42501'; end if;
 select * into t from public.gespro_test_tickets where id=ticket_key for update;
 if not found or t.status='cancelled' then return; end if;
 for e in select value from jsonb_array_elements(t.plays) loop
  select value into item from jsonb_array_elements(t.configuration_snapshot->'lotteries') where value->>'lottery'=e->>'lottery' limit 1;
  if item is null or item->'effectiveRates' is null or item->'effectiveRates'='null'::jsonb then
   all_done=false;review=true;details=details||jsonb_build_array(e||jsonb_build_object('state','review','reason','Tarif istorik pa disponib oswa plizyè tarif sipèvizè an konfli.'));continue;
  end if;
  day=(item->>'drawDate')::date;
  select * into r from public.gespro_test_results where lottery=e->>'lottery' and mode=item->>'mode' and draw_date=day;
  if not found then all_done=false;details=details||jsonb_build_array(e||jsonb_build_object('state','waiting','reason','Rezilta poko pibliye.'));continue;end if;
  if e->>'type' not in ('DIRECTO','REVÈ','BOUL PÈ','CASH 3 STRAIGHT','PLAY 4 STRAIGHT','PICK 5 STRAIGHT') then
   all_done=false;review=true;details=details||jsonb_build_array(e||jsonb_build_object('state','review','reason','Règ kalite jwèt sa a poko konfime.','resultVersion',r.version));continue;
  end if;
  matches='[]';line_total=0;
  for i in 0..(case when e->>'type' in ('DIRECTO','REVÈ','BOUL PÈ') then least(2,jsonb_array_length(r.derived)-1) else 0 end) loop
   if e->>'type' in ('DIRECTO','REVÈ','BOUL PÈ') then
    position=i;label=(array['1st — Premye lo','2nd — Dezyèm lo','3rd — Twazyèm lo'])[i+1];
   else
    position=case e->>'type' when 'CASH 3 STRAIGHT' then 3 when 'PLAY 4 STRAIGHT' then 4 else 5 end;
    label=case position when 3 then 'Pick3 Straight' when 4 then 'Pick4 Straight' else 'Pick5 Straight' end;
   end if;
   if r.derived->>position=e->>'number' then
    rate=item->'effectiveRates'->>label;
    if rate is null or rate !~ '^[0-9]+(\.[0-9]{1,2})?$' then review=true;all_done=false;matches=matches||jsonb_build_array(jsonb_build_object('label',label,'missingRate',true));continue;end if;
    amount=round((e->>'amount')::numeric*rate::numeric*100);
    line_total=line_total+amount;
    matches=matches||jsonb_build_array(jsonb_build_object('label',label,'rate',rate,'prizeCents',round(amount)));
   end if;
  end loop;
  total=total+round(line_total)::bigint;
  details=details||jsonb_build_array(e||jsonb_build_object('state','calculated','matches',matches,'prizeCents',round(line_total),'resultVersion',r.version));
 end loop;
 update public.gespro_test_tickets set status=case when not all_done then 'pending' when total>0 then 'winner' else 'loser' end,
 prize_cents=case when all_done then total else 0 end,settlement=details,review_required=review where id=t.id;
end $$;

create or replace function gespro_private.publish_test_result(target_bank uuid,lottery_id text,result_date date,numbers jsonb,expected_version integer,reason text) returns public.gespro_test_results
language plpgsql security definer set search_path='' as $$
declare cfg jsonb;item jsonb;draw_mode text;derived jsonb;old public.gespro_test_results;r public.gespro_test_results;s jsonb;t record;saw_schedule boolean=false;
begin
 if auth.uid() is null or not gespro_private.is_platform_admin() then raise exception 'Access denied' using errcode='42501'; end if;
 select configuration into cfg from public.gespro_bank_configuration c join public.gespro_banks b on b.id=c.bank_id where c.bank_id=target_bank and b.active;
 select value into item from jsonb_array_elements(cfg->'items') where value->>'id'=lottery_id;
 if item is null or result_date is null or expected_version is null or expected_version<0 then raise exception 'Invalid result';end if;
 draw_mode=coalesce(item->>'resultMode',case when item->>'name' like 'FL PICK 2 %' then 'pick2' else 'bolet3' end);
 derived=gespro_private.derive_test_result(draw_mode,numbers);
 perform pg_advisory_xact_lock(hashtextextended('result:'||jsonb_build_array(item->>'name',draw_mode,result_date)::text,0));
 select * into old from public.gespro_test_results x where x.lottery=item->>'name' and x.mode=draw_mode and x.draw_date=result_date for update;
 if old.lottery is not null and old.numbers=numbers then return old;end if;
 if coalesce(old.version,0)<>expected_version then raise exception 'Result conflict' using errcode='40001';end if;
 if old.lottery is not null and length(trim(coalesce(reason,'')))<5 then raise exception 'Correction reason required';end if;
 if length(coalesce(reason,''))>500 then raise exception 'Invalid result';end if;
 for s in select kv.value from public.gespro_bank_configuration c join public.gespro_banks b on b.id=c.bank_id and b.active cross join lateral jsonb_array_elements(c.configuration->'items') it cross join lateral jsonb_each(c.configuration->'closingTimes') kv where it->>'name'=item->>'name' and coalesce(it->>'resultMode',case when it->>'name' like 'FL PICK 2 %' then 'pick2' else 'bolet3' end)=draw_mode and kv.key::jsonb->>0=it->>'id' and kv.key::jsonb->>2='closing' and coalesce(kv.value->>'time','')<>'' loop
  saw_schedule=true;
  if clock_timestamp()<((result_date+(s->>'time')::time) at time zone (s->>'zone')) then raise exception 'Draw still open';end if;
 end loop;
 if not saw_schedule then raise exception 'Closing time not configured';end if;
 for t in select x.id,snap.value snapshot from public.gespro_test_tickets x cross join lateral jsonb_array_elements(x.configuration_snapshot->'lotteries') snap where x.status<>'cancelled' and snap.value->>'lottery'=item->>'name' and snap.value->>'mode'=draw_mode and (x.created_at at time zone (snap.value->'schedule'->>'zone'))::date=result_date loop
  if clock_timestamp()<((result_date+(t.snapshot->'schedule'->>'time')::time) at time zone (t.snapshot->'schedule'->>'zone')) then raise exception 'Draw still open';end if;
 end loop;
 insert into public.gespro_test_results(lottery,mode,draw_date,numbers,derived,version,updated_by)
 values(item->>'name',draw_mode,result_date,numbers,derived,coalesce(old.version,0)+1,auth.uid())
 on conflict(lottery,mode,draw_date) do update set numbers=excluded.numbers,derived=excluded.derived,version=excluded.version,updated_by=excluded.updated_by,updated_at=clock_timestamp() returning * into r;
 insert into public.gespro_test_result_audit(lottery,mode,draw_date,version,before_numbers,numbers,reason,actor_id) values(r.lottery,r.mode,r.draw_date,r.version,old.numbers,r.numbers,coalesce(reason,''),auth.uid());
 for t in select distinct x.id from public.gespro_test_tickets x cross join lateral jsonb_array_elements(x.configuration_snapshot->'lotteries') snap where x.status<>'cancelled' and snap.value->>'lottery'=r.lottery and snap.value->>'mode'=r.mode and (x.created_at at time zone (snap.value->'schedule'->>'zone'))::date=r.draw_date order by x.id loop
  perform gespro_private.recalculate_test_ticket(t.id);
 end loop;
 return r;
end $$;
revoke all on function gespro_private.derive_test_result(text,jsonb),gespro_private.snapshot_test_rates(),gespro_private.recalculate_test_ticket(bigint),gespro_private.publish_test_result(uuid,text,date,jsonb,integer,text) from public,anon,authenticated;
grant execute on function gespro_private.publish_test_result(uuid,text,date,jsonb,integer,text) to authenticated;
create or replace function public.gespro_publish_test_result(target_bank uuid,lottery_id text,result_date date,numbers jsonb,expected_version integer,reason text) returns public.gespro_test_results
language sql security invoker set search_path='' as $$select gespro_private.publish_test_result(target_bank,lottery_id,result_date,numbers,expected_version,reason)$$;
revoke all on function public.gespro_publish_test_result(uuid,text,date,jsonb,integer,text) from public,anon,authenticated;
grant execute on function public.gespro_publish_test_result(uuid,text,date,jsonb,integer,text) to authenticated;
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
 if t.status<>'pending' or jsonb_array_length(t.settlement)>0 or clock_timestamp()>=t.cancel_until then raise exception 'Cancellation expired';end if;
 update public.gespro_test_tickets set status='cancelled',cancelled_at=clock_timestamp(),cancelled_by=actor,cancelled_name=(select coalesce(nullif(display_name,''),username) from public.gespro_profiles where user_id=actor) where id=t.id returning * into t;
 insert into public.gespro_test_ticket_audit(ticket_id,actor_id,action) values(t.id,actor,'cancelled');return t;
end $$;