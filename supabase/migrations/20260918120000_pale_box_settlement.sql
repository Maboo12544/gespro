begin;

create or replace function gespro_private.box_way_count(num text) returns integer
language plpgsql immutable set search_path='' as $$
declare n integer:=length(num); ways integer:=1; rec record;
begin
 if num is null or num !~ '^[0-9]+$' or n not between 3 and 5 then return null;end if;
 ways=case n when 3 then 6 when 4 then 24 when 5 then 120 end;
 for rec in select ch,count(*) c from regexp_split_to_table(num,'') ch group by ch loop
  if rec.c=2 then ways=ways/2;
  elsif rec.c=3 then ways=ways/6;
  elsif rec.c=4 then ways=ways/24;
  elsif rec.c=5 then ways=ways/120;
  end if;
 end loop;
 return ways;
end $$;

create or replace function gespro_private.recalculate_test_ticket(ticket_key bigint) returns void
language plpgsql security definer set search_path='' as $$
declare t public.gespro_test_tickets;e jsonb;item jsonb;r public.gespro_test_results;details jsonb='[]';matches jsonb;rate text;label text;amount numeric;total bigint=0;line_total numeric;i integer;position integer;all_done boolean=true;review boolean=false;day date;parts text[];p1 integer;p2 integer;target text;actual text;ways integer;
begin
 if auth.uid() is null or not gespro_private.is_platform_admin() then raise exception 'Access denied' using errcode='42501';end if;
 select * into t from public.gespro_test_tickets where id=ticket_key for update;
 if not found or t.status='cancelled' then return;end if;
 for e in select value from jsonb_array_elements(t.plays) loop
  select value into item from jsonb_array_elements(t.configuration_snapshot->'lotteries') where value->>'lottery'=e->>'lottery' limit 1;
  if item is null or item->'effectiveRates' is null or item->'effectiveRates'='null'::jsonb then all_done=false;review=true;details=details||jsonb_build_array(e||jsonb_build_object('state','review','reason','Tarif istorik pa disponib oswa plizyè tarif sipèvizè an konfli.'));continue;end if;
  day=(item->>'drawDate')::date;
  select * into r from public.gespro_test_results where lottery=e->>'lottery' and mode=item->>'mode' and draw_date=day;
  if not found then all_done=false;details=details||jsonb_build_array(e||jsonb_build_object('state','waiting','reason','Rezilta poko pibliye.'));continue;end if;
  if e->>'type'='TRIPLETA' then all_done=false;review=true;details=details||jsonb_build_array(e||jsonb_build_object('state','review','reason','Tripleta pa aktive pou kalkil otomatik.','resultVersion',r.version));continue;end if;
  if e->>'type' not in ('DIRECTO','REVÈ','BOUL PÈ','PALÉ','CASH 3 STRAIGHT','PLAY 4 STRAIGHT','PICK 5 STRAIGHT','CASH 3 BOX','PLAY 4 BOX','PICK 5 BOX') then all_done=false;review=true;details=details||jsonb_build_array(e||jsonb_build_object('state','review','reason','Règ kalite jwèt sa a poko konfime.','resultVersion',r.version));continue;end if;
  matches='[]';line_total=0;
  if e->>'type'='PALÉ' then
   parts=string_to_array(e->>'number','-');p1=null;p2=null;
   for i in 0..least(2,jsonb_array_length(r.derived)-1) loop
    if p1 is null and r.derived->>i=parts[1] then p1=i+1;end if;
    if p2 is null and r.derived->>i=parts[2] then p2=i+1;end if;
   end loop;
   if p1 is not null and p2 is not null and (parts[1]<>parts[2] or p1<>p2) then
    label='Palé '||p1||'-'||p2;rate=item->'effectiveRates'->>label;
    if rate is null or rate !~ '^[0-9]+(\.[0-9]{1,2})?$' then review=true;all_done=false;matches=matches||jsonb_build_array(jsonb_build_object('label',label,'missingRate',true));
    else amount=round((e->>'amount')::numeric*rate::numeric*100);line_total=amount;matches=matches||jsonb_build_array(jsonb_build_object('label',label,'rate',rate,'prizeCents',amount));end if;
   end if;
  elsif e->>'type' like '% BOX' then
   position=case e->>'type' when 'CASH 3 BOX' then 3 when 'PLAY 4 BOX' then 4 else 5 end;actual=r.derived->>position;target=e->>'number';ways=gespro_private.box_way_count(target);
   if ways=1 then label=case position when 3 then 'Pick3 Straight' when 4 then 'Pick4 Straight' else 'Pick5 Straight' end;
   else label='Pick'||position||' Box '||ways||'way';end if;
   if (select string_agg(ch,'' order by ch) from regexp_split_to_table(actual,'') ch)=(select string_agg(ch,'' order by ch) from regexp_split_to_table(target,'') ch) then
    rate=item->'effectiveRates'->>label;
    if rate is null or rate !~ '^[0-9]+(\.[0-9]{1,2})?$' then review=true;all_done=false;matches=matches||jsonb_build_array(jsonb_build_object('label',label,'missingRate',true));
    else amount=round((e->>'amount')::numeric*rate::numeric*100);line_total=amount;matches=matches||jsonb_build_array(jsonb_build_object('label',label,'rate',rate,'ways',ways,'prizeCents',amount));end if;
   end if;
  else
   for i in 0..(case when e->>'type' in ('DIRECTO','REVÈ','BOUL PÈ') then least(2,jsonb_array_length(r.derived)-1) else 0 end) loop
    if e->>'type' in ('DIRECTO','REVÈ','BOUL PÈ') then position=i;label=(array['1st — Premye lo','2nd — Dezyèm lo','3rd — Twazyèm lo'])[i+1];
    else position=case e->>'type' when 'CASH 3 STRAIGHT' then 3 when 'PLAY 4 STRAIGHT' then 4 else 5 end;label=case position when 3 then 'Pick3 Straight' when 4 then 'Pick4 Straight' else 'Pick5 Straight' end;end if;
    if r.derived->>position=e->>'number' then rate=item->'effectiveRates'->>label;if rate is null or rate !~ '^[0-9]+(\.[0-9]{1,2})?$' then review=true;all_done=false;matches=matches||jsonb_build_array(jsonb_build_object('label',label,'missingRate',true));continue;end if;amount=round((e->>'amount')::numeric*rate::numeric*100);line_total=line_total+amount;matches=matches||jsonb_build_array(jsonb_build_object('label',label,'rate',rate,'prizeCents',amount));end if;
   end loop;
  end if;
  total=total+round(line_total)::bigint;details=details||jsonb_build_array(e||jsonb_build_object('state','calculated','matches',matches,'prizeCents',round(line_total),'resultVersion',r.version));
 end loop;
 update public.gespro_test_tickets set status=case when not all_done then 'pending' when total>0 then 'winner' else 'loser' end,prize_cents=case when all_done then total else 0 end,settlement=details,review_required=review where id=t.id;
end $$;

revoke all on function gespro_private.box_way_count(text) from public,anon,authenticated;
commit;
