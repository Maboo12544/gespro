-- Activate bank configuration: enhanced test ticket creation with limit enforcement
alter table public.gespro_test_tickets add column if not exists configuration_snapshot jsonb;
create or replace function gespro_private.create_test_ticket(target_pos uuid,request_key uuid,entries jsonb) returns public.gespro_test_tickets
language plpgsql security definer set search_path='' as $$
declare p public.gespro_points_of_sale;t public.gespro_test_tickets;e jsonb;canonical jsonb='[]';mode text;kind text;num text;cash numeric;total bigint=0;actor uuid=auth.uid();stamp timestamptz;cfg jsonb;cfg_version bigint;item jsonb;schedule jsonb;rule jsonb;limit_value numeric;used numeric;game text;scope text;day_index integer;zone text;day_start timestamptz;day_end timestamptz;limit_number text;applied jsonb='[]';
begin
 p=gespro_private.require_test_pos(target_pos);
 if request_key is null or jsonb_typeof(entries) is distinct from 'array' or jsonb_array_length(entries) not between 1 and 500 then raise exception 'Invalid ticket';end if;
 for e in select value from jsonb_array_elements(entries) loop
  if jsonb_typeof(e->'amount') is distinct from 'number' or jsonb_typeof(e->'number') is distinct from 'string' then raise exception 'Invalid play';end if;
  kind=e->>'type';num=e->>'number';cash=(e->>'amount')::numeric;
  if cash<=0 or cash>100000 or cash<>round(cash,2) then raise exception 'Invalid amount';end if;
  if kind is null or kind not in ('DIRECTO','REVÈ','BOUL PÈ','PALÉ','TRIPLETA','CASH 3 STRAIGHT','CASH 3 BOX','PLAY 4 STRAIGHT','PLAY 4 BOX','PICK 5 STRAIGHT','PICK 5 BOX') then raise exception 'Invalid play';end if;
  if not(case when kind in ('DIRECTO','REVÈ','BOUL PÈ') then num~'^[0-9]{2}$' when kind='PALÉ' then num~'^[0-9]{2}-[0-9]{2}$' when kind='TRIPLETA' then num~'^[0-9]{2}-[0-9]{2}-[0-9]{2}$' when kind like 'CASH 3%' then num~'^[0-9]{3}$' when kind like 'PLAY 4%' then num~'^[0-9]{4}$' else num~'^[0-9]{5}$' end) then raise exception 'Invalid number';end if;

  canonical=canonical||jsonb_build_array(jsonb_build_object('lottery',e->>'lottery','type',kind,'number',num,'amount',cash));total=total+(cash*100)::bigint;
 end loop;
 if exists(select 1 from jsonb_array_elements(canonical) x group by x->>'lottery',case when x->>'type' in ('DIRECTO','REVÈ','BOUL PÈ') then 'DIRECTO' else x->>'type' end,x->>'number' having count(*)>1) then raise exception 'Duplicate play';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||request_key::text,0));
 select * into t from public.gespro_test_tickets where seller_id=actor and request_id=request_key;
 if found then
  if t.pos_id<>p.id or t.plays<>canonical then raise exception 'Request already used';end if;
  return t;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('bank-sales:'||p.bank_id::text,0));
 select configuration,version into cfg,cfg_version from public.gespro_bank_configuration where bank_id=p.bank_id for share;
 if not found then raise exception 'Configure bank lotteries and closing times first';end if;
 stamp=clock_timestamp();
 for e in select value from jsonb_array_elements(canonical) loop
  select value into item from jsonb_array_elements(cfg->'items') where value->>'name'=e->>'lottery';
  if item is null then raise exception 'Lottery unavailable';end if;
  if exists(select 1 from jsonb_each(cfg->'removed') kv where kv.value='true'::jsonb and (kv.key::jsonb)->>0=item->>'id' and (kv.key::jsonb)->>2='removed') then raise exception 'Lottery unavailable';end if;
  if item->>'bank' is not null and item->>'bank'<>(select name from public.gespro_banks where id=p.bank_id) then raise exception 'Lottery unavailable';end if;
  mode=coalesce(item->>'resultMode',case when item->>'name' like 'FL PICK 2 %' then 'pick2' else 'bolet3' end);
  if mode not in ('pick2','massachusetts4','dominican3','bolet3') then raise exception 'Lottery rules unconfirmed';end if;
  kind=e->>'type';num=e->>'number';cash=(e->>'amount')::numeric;
  if (mode='pick2' and kind not in ('DIRECTO','REVÈ','BOUL PÈ')) or (mode='dominican3' and kind not in ('DIRECTO','REVÈ','BOUL PÈ','PALÉ','TRIPLETA')) or (mode<>'dominican3' and kind='TRIPLETA') or (mode='massachusetts4' and kind like 'PICK 5%') then raise exception 'Invalid lottery game';end if;
  select kv.value into schedule from jsonb_each(coalesce(cfg->'closingTimes','{}'::jsonb)) kv where (kv.key::jsonb)->>0=item->>'id' and (kv.key::jsonb)->>2='closing' order by ((kv.key::jsonb)->>1='*') asc limit 1;
  if schedule is null or coalesce(schedule->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Closing time not configured';end if;
  zone=schedule->>'zone';
  if zone is null or zone not in ('America/Santo_Domingo','America/New_York','America/Port-au-Prince','America/Chicago') then raise exception 'Invalid closing timezone';end if;
  if (stamp at time zone zone)::time >= (schedule->>'time')::time then raise exception 'Lottery closed';end if;
  day_index=extract(isodow from stamp at time zone zone)::integer-1;
  day_start=date_trunc('day',stamp at time zone zone) at time zone zone;day_end=(date_trunc('day',stamp at time zone zone)+interval '1 day') at time zone zone;
  game=case when kind in ('DIRECTO','REVÈ','BOUL PÈ') then 'Directo' when kind='PALÉ' then 'Palé' when kind='TRIPLETA' then 'Tripleta' else initcap(replace(kind,'PICK 5','PICK 5')) end;
  for rule in select value from jsonb_array_elements(coalesce(cfg->'limits','[]'::jsonb)) where value->>'lottery'=item->>'id' and lower(value->>'game')=lower(game) and (value->>'number'='' or value->>'number'=replace(num,'-','')) loop
   scope=rule->>'scope';
   if scope='bank' or scope='pos:'||p.id::text or (left(scope,11)='supervisor:' and exists(select 1 from public.gespro_pos_assignments a join public.gespro_memberships m on m.bank_id=a.bank_id and m.user_id=a.user_id where a.bank_id=p.bank_id and a.pos_id=p.id and a.user_id::text=substring(scope from 12) and m.active and m.role='supervisor')) then
    if rule->>'number'='' and exists(select 1 from jsonb_array_elements(coalesce(cfg->'limits','[]'::jsonb)) specific where specific->>'lottery'=item->>'id' and specific->>'scope'=scope and specific->>'game'=rule->>'game' and specific->>'number'=replace(num,'-','')) then continue;end if;
    if coalesce(rule->'days'->>day_index,'') !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception 'Invalid limit';end if;
    limit_value=(rule->'days'->>day_index)::numeric;
    select coalesce(sum((play->>'amount')::numeric),0) into used from public.gespro_test_tickets old cross join lateral jsonb_array_elements(old.plays) play where old.bank_id=p.bank_id and old.status<>'cancelled' and old.created_at>=day_start and old.created_at<day_end and play->>'lottery'=e->>'lottery' and play->>'number'=num and (case when play->>'type' in ('DIRECTO','REVÈ','BOUL PÈ') then 'DIRECTO' else play->>'type' end)=(case when kind in ('DIRECTO','REVÈ','BOUL PÈ') then 'DIRECTO' else kind end) and (scope='bank' or scope='pos:'||old.pos_id::text or (left(scope,11)='supervisor:' and exists(select 1 from public.gespro_pos_assignments a where a.bank_id=p.bank_id and a.pos_id=old.pos_id and a.user_id::text=substring(scope from 12))));
    if used+cash>limit_value then raise exception 'Number limit exceeded';end if;
   end if;
  end loop;
  applied=applied||jsonb_build_array(jsonb_build_object('lotteryId',item->>'id','lottery',item->>'name','mode',mode,'schedule',schedule));
 end loop;
 for item in select value from jsonb_array_elements(applied) loop
  if (clock_timestamp() at time zone (item->'schedule'->>'zone'))::time >= (item->'schedule'->>'time')::time then raise exception 'Lottery closed';end if;
 end loop;
 insert into public.gespro_test_tickets(request_id,bank_id,pos_id,seller_id,seller_name,bank_name,pos_name,created_at,cancel_until,amount_cents,plays,configuration_snapshot)
 values(request_key,p.bank_id,p.id,actor,(select coalesce(nullif(display_name,''),username) from public.gespro_profiles where user_id=actor),(select name from public.gespro_banks where id=p.bank_id),p.name,stamp,stamp+interval '5 minutes',total,canonical,jsonb_build_object('version',cfg_version,'lotteries',applied,'rates',cfg->'rates')) returning * into t;
 insert into public.gespro_test_ticket_audit(ticket_id,actor_id,action) values(t.id,actor,'created');
 return t;
end $$;

create or replace function gespro_private.pos_configuration(target_pos uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.gespro_points_of_sale;c jsonb;
begin p=gespro_private.require_test_pos(target_pos);select configuration into c from public.gespro_bank_configuration where bank_id=p.bank_id;if not found then return null;end if;return jsonb_build_object('items',c->'items','removed',c->'removed','rates','{}'::jsonb,'closingTimes',c->'closingTimes');end $$;
revoke all on function gespro_private.pos_configuration(uuid) from public,anon,authenticated;
grant execute on function gespro_private.pos_configuration(uuid) to authenticated;
create or replace function public.gespro_pos_configuration(target_pos uuid) returns jsonb language sql security invoker set search_path='' as $$select gespro_private.pos_configuration(target_pos)$$;
revoke all on function public.gespro_pos_configuration(uuid) from public,anon,authenticated;
grant execute on function public.gespro_pos_configuration(uuid) to authenticated;