begin;
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
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
select public.gespro_save_bank_configuration(current_setting('test.bank')::uuid,0,'{"items":[],"rates":{},"removed":{}}');
do $$ begin
 if (select version from public.gespro_bank_configuration where bank_id=current_setting('test.bank')::uuid)<>1 then raise exception 'initial version';end if;
 perform public.gespro_save_bank_configuration(current_setting('test.bank')::uuid,1,'{"items":[],"rates":{},"removed":{}}');
 begin perform public.gespro_save_bank_configuration(current_setting('test.bank')::uuid,1,'{"items":[],"rates":{},"removed":{}}');raise exception 'stale allowed';exception when serialization_failure then null;end;
 begin perform public.gespro_save_bank_configuration(current_setting('test.bank2')::uuid,0,'{"items":[],"rates":{},"removed":{}}');raise exception 'cross bank allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.seller'),true);
do $$ begin
 if (select count(*) from public.gespro_bank_configuration)<>0 then raise exception 'seller config exposed';end if;
 begin perform public.gespro_save_bank_configuration(current_setting('test.bank')::uuid,0,'{"items":[],"rates":{},"removed":{}}');raise exception 'seller write';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
do $$ begin
 if (select count(*) from public.gespro_bank_configuration)<>1 then raise exception 'super read';end if;
 perform public.gespro_save_bank_configuration(current_setting('test.bank')::uuid,2,'{"items":[],"rates":{},"removed":{}}');
 if (select updated_by from public.gespro_bank_configuration where bank_id=current_setting('test.bank')::uuid)<>current_setting('test.admin')::uuid then raise exception 'actor stamp';end if;
end $$;
reset role;
select 'PASS: bank-isolated configuration, super admin access, seller denial, concurrency protection, verified actor' as result;
rollback;
