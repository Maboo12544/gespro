begin;
create or replace function gespro_private.recalculate_test_ticket(ticket_key bigint) returns void
language plpgsql security definer set search_path='' as $$
declare t public.gespro_test_tickets;e jsonb;item jsonb;r public.gespro_test_results;details jsonb='[]';matches jsonb;rate text;label text;amount numeric;total bigint=0;line_total numeric;i integer;position integer;all_done boolean=true;review boolean=false;day date;
begin
 if auth.uid() is null or not gespro_private.is_platform_admin() then raise exception 'Access denied' using errcode='42501';end if;
 select * into t from public.gespro_test_tickets where id=ticket_key for update;
 if not found or t.status='cancelled' then return;end if;
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

select set_config('test.admin',gen_random_uuid()::text,true),set_config('test.owner',gen_random_uuid()::text,true),set_config('test.other',gen_random_uuid()::text,true),set_config('test.supervisor',gen_random_uuid()::text,true),set_config('test.seller',gen_random_uuid()::text,true),set_config('test.new',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('test.admin')::uuid),(current_setting('test.owner')::uuid),(current_setting('test.other')::uuid),(current_setting('test.supervisor')::uuid),(current_setting('test.seller')::uuid),(current_setting('test.new')::uuid);
insert into public.gespro_profiles(user_id,username) select current_setting('test.'||v)::uuid,'test-'||left(current_setting('test.'||v),20) from unnest(array['admin','owner','other','supervisor','seller']) v;
insert into public.gespro_platform_admins values(current_setting('test.admin')::uuid);
select set_config('test.bank',(public.gespro_manage_access(current_setting('test.admin')::uuid,'create_bank','{"name":"Access test A"}') ->> 'id'),true);
select set_config('test.bank2',(public.gespro_manage_access(current_setting('test.admin')::uuid,'create_bank','{"name":"Access test B"}') ->> 'id'),true);
insert into public.gespro_memberships(bank_id,user_id,role) values(current_setting('test.bank')::uuid,current_setting('test.owner')::uuid,'owner'),(current_setting('test.bank2')::uuid,current_setting('test.other')::uuid,'owner'),(current_setting('test.bank')::uuid,current_setting('test.supervisor')::uuid,'supervisor'),(current_setting('test.bank')::uuid,current_setting('test.seller')::uuid,'seller');
select set_config('test.pos',(public.gespro_manage_access(current_setting('test.owner')::uuid,'create_pos',jsonb_build_object('bank_id',current_setting('test.bank'),'name','Assigned test')) ->> 'id'),true);
select set_config('test.pos2',(public.gespro_manage_access(current_setting('test.owner')::uuid,'create_pos',jsonb_build_object('bank_id',current_setting('test.bank'),'name','Unassigned test')) ->> 'id'),true);
select set_config('test.foreignpos',(public.gespro_manage_access(current_setting('test.other')::uuid,'create_pos',jsonb_build_object('bank_id',current_setting('test.bank2'),'name','Foreign test')) ->> 'id'),true);
insert into public.gespro_pos_assignments values(current_setting('test.bank')::uuid,current_setting('test.pos')::uuid,current_setting('test.supervisor')::uuid),(current_setting('test.bank')::uuid,current_setting('test.pos')::uuid,current_setting('test.seller')::uuid);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
insert into public.gespro_bank_configuration(bank_id,configuration) values(current_setting('test.bank')::uuid,jsonb_build_object('items',jsonb_build_array(jsonb_build_object('id','fl','name','SETTLEMENT QA ONLY','bank',null)),'removed','{}'::jsonb,'rates','{}'::jsonb,'closingTimes',jsonb_build_object('["fl","Access test A","closing"]',jsonb_build_object('time','23:59','zone','America/New_York')),'limits',jsonb_build_array(jsonb_build_object('lottery','fl','bank','Access test A','scope','bank','game','Directo','number','','days','["5.00","5.00","5.00","5.00","5.00","5.00","5.00"]'::jsonb))));

-- Enable the paused entry points only inside this rolled-back fixture transaction.
create trigger snapshot_test_rates before insert on public.gespro_test_tickets for each row execute function gespro_private.snapshot_test_rates();
grant execute on function public.gespro_publish_test_result(uuid,text,date,jsonb,integer,text),gespro_private.publish_test_result(uuid,text,date,jsonb,integer,text) to authenticated;
select set_config('test.day',((clock_timestamp() at time zone 'America/New_York')::date-1)::text,true);
update public.gespro_bank_configuration set configuration=jsonb_set(jsonb_set(configuration,'{items}',configuration->'items'||'[{"id":"fl2","name":"SETTLEMENT QA SECOND","bank":null}]'::jsonb),'{closingTimes}',configuration->'closingTimes'||'{"[\"fl2\",\"Access test A\",\"closing\"]":{"time":"23:59","zone":"America/New_York"}}'::jsonb) where bank_id=current_setting('test.bank')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.seller'),true);
select set_config('test.win',(public.gespro_create_test_ticket(current_setting('test.pos')::uuid,gen_random_uuid(),'[{"lottery":"SETTLEMENT QA ONLY","type":"DIRECTO","number":"00","amount":2}]')).id::text,true);
select set_config('test.lose',(public.gespro_create_test_ticket(current_setting('test.pos')::uuid,gen_random_uuid(),'[{"lottery":"SETTLEMENT QA ONLY","type":"DIRECTO","number":"99","amount":1}]')).id::text,true);
select set_config('test.review',(public.gespro_create_test_ticket(current_setting('test.pos')::uuid,gen_random_uuid(),'[{"lottery":"SETTLEMENT QA ONLY","type":"PALÉ","number":"00-99","amount":1}]')).id::text,true);
select set_config('test.straight',(public.gespro_create_test_ticket(current_setting('test.pos')::uuid,gen_random_uuid(),'[{"lottery":"SETTLEMENT QA ONLY","type":"CASH 3 STRAIGHT","number":"100","amount":2}]')).id::text,true);
select set_config('test.cancelled',(public.gespro_create_test_ticket(current_setting('test.pos')::uuid,gen_random_uuid(),'[{"lottery":"SETTLEMENT QA ONLY","type":"DIRECTO","number":"00","amount":1}]')).id::text,true);
select public.gespro_cancel_test_ticket(current_setting('test.cancelled')::bigint);
select set_config('test.multi',(public.gespro_create_test_ticket(current_setting('test.pos')::uuid,gen_random_uuid(),'[{"lottery":"SETTLEMENT QA ONLY","type":"DIRECTO","number":"00","amount":1},{"lottery":"SETTLEMENT QA SECOND","type":"DIRECTO","number":"00","amount":1}]')).id::text,true);
reset role;
-- Changing current tariffs must not change accepted tickets.
update public.gespro_bank_configuration set configuration=jsonb_set(configuration,'{rates}','{"[\"fl\",\"Access test A\",\"bank\"]":{"1st — Premye lo":"999","2nd — Dezyèm lo":"999","3rd — Twazyèm lo":"999"}}'::jsonb) where bank_id=current_setting('test.bank')::uuid;
-- Simulate yesterday's accepted tickets; no production row is selected.
update public.gespro_test_tickets set created_at=(current_setting('test.day')::date+time '12:00') at time zone 'America/New_York',configuration_snapshot=jsonb_set(configuration_snapshot,'{lotteries}',(select jsonb_agg(value||jsonb_build_object('drawDate',current_setting('test.day'))) from jsonb_array_elements(configuration_snapshot->'lotteries'))) where bank_id=current_setting('test.bank')::uuid;
set local role authenticated;
do $$ begin
 begin perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'["100","00","00"]',0,'');raise exception 'seller published';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
select public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'["100","00","00"]',0,'');
do $$ declare t public.gespro_test_tickets;begin
 select * into t from public.gespro_test_tickets where id=current_setting('test.win')::bigint;
 if t.status<>'winner' or t.prize_cents<>18000 then raise exception 'additive three positions failed: %, %',t.status,t.prize_cents;end if;
 if (select prize_cents from public.gespro_test_tickets where id=current_setting('test.straight')::bigint)<>140000 then raise exception 'straight failed';end if;
 if (select status from public.gespro_test_tickets where id=current_setting('test.lose')::bigint)<>'loser' then raise exception 'loser failed';end if;
 if not (select review_required and status='pending' and prize_cents=0 from public.gespro_test_tickets where id=current_setting('test.review')::bigint) then raise exception 'review failed';end if;
 if (select status from public.gespro_test_tickets where id=current_setting('test.cancelled')::bigint)<>'cancelled' then raise exception 'cancelled changed';end if;
 if not (select status='pending' and prize_cents=0 from public.gespro_test_tickets where id=current_setting('test.multi')::bigint) then raise exception 'multi settled before all draws';end if;
 perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl2',current_setting('test.day')::date,'["100","88","77"]',0,'');
 if not (select status='winner' and prize_cents=15500 from public.gespro_test_tickets where id=current_setting('test.multi')::bigint) then raise exception 'multi final total failed';end if;
 -- Retry must not create another result revision or add winnings twice.
 perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'["100","00","00"]',0,'');
 if (select count(*) from public.gespro_test_result_audit where lottery='SETTLEMENT QA ONLY')<>1 then raise exception 'retry duplicated result';end if;
 begin perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'["199","00","00"]',0,'Correction test');raise exception 'version accepted';exception when serialization_failure then null;end;
 perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'["199","00","00"]',1,'Correction test');
 if (select prize_cents from public.gespro_test_tickets where id=current_setting('test.win')::bigint)<>5000 then raise exception 'second plus third failed';end if;
 perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'["100","00","77"]',2,'Correction test');
 if (select prize_cents from public.gespro_test_tickets where id=current_setting('test.win')::bigint)<>16000 then raise exception 'first plus second failed';end if;
 perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'["100","77","00"]',3,'Correction test');
 if (select prize_cents from public.gespro_test_tickets where id=current_setting('test.win')::bigint)<>15000 then raise exception 'first plus third failed';end if;
 begin perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date+2,'["100","00","77"]',0,'');raise exception 'early result accepted';exception when raise_exception then if sqlerrm<>'Draw still open' then raise;end if;end;
 begin perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'[100,"00","77"]',4,'Invalid numeric input');raise exception 'numeric number accepted';exception when raise_exception then if sqlerrm<>'Invalid result' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.other'),true);
do $$ begin
 if exists(select 1 from public.gespro_test_tickets where bank_id=current_setting('test.bank')::uuid) then raise exception 'foreign bank ticket leaked';end if;
 begin perform public.gespro_publish_test_result(current_setting('test.bank')::uuid,'fl',current_setting('test.day')::date,'["100","00","77"]',4,'Foreign owner');raise exception 'owner published';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
update public.gespro_test_tickets set plays='[{"lottery":"SETTLEMENT QA ONLY","type":"DIRECTO","number":"00","amount":0.01}]',configuration_snapshot=jsonb_set(configuration_snapshot,'{lotteries,0,effectiveRates}','{"1st — Premye lo":"0.50","2nd — Dezyèm lo":"0","3rd — Twazyèm lo":"0.50"}') where id=current_setting('test.lose')::bigint;
select gespro_private.recalculate_test_ticket(current_setting('test.lose')::bigint);
do $$ begin
 if (select prize_cents from public.gespro_test_tickets where id=current_setting('test.lose')::bigint)<>2 then raise exception 'per position rounding failed';end if;
end $$;
update public.gespro_test_tickets set configuration_snapshot=configuration_snapshot #- '{lotteries,0,effectiveRates}' where id=current_setting('test.lose')::bigint;
select gespro_private.recalculate_test_ticket(current_setting('test.lose')::bigint);
do $$ begin
 if not (select review_required and status='pending' and prize_cents=0 from public.gespro_test_tickets where id=current_setting('test.lose')::bigint) then raise exception 'legacy rates guessed';end if;
end $$;
do $$ begin
 if gespro_private.derive_test_result('massachusetts4','["0007"]')<>'["00","00","07","000","0007","","007"]'::jsonb then raise exception 'MA leading zeros';end if;
 if gespro_private.derive_test_result('pick2','["00"]')<>'["00"]'::jsonb then raise exception 'Pick2 zeros';end if;
 if gespro_private.derive_test_result('dominican3','["00","01","02"]')<>'["00","01","02"]'::jsonb then raise exception 'Dominican zeros';end if;
end $$;
select 'PASS: additive positions, leading zeros, straight, cancelled/loser/review, retry, correction/version, early result, role guards, per-position rounding, legacy rate review, multilot finalization, immutable tariffs, bank isolation and MA/Pick2/Dominican zero formats' as result;
rollback;
