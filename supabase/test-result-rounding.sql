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

commit;
