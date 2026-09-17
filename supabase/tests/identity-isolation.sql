begin;
select set_config('test.owner',gen_random_uuid()::text,true),
set_config('test.supervisor',gen_random_uuid()::text,true),
set_config('test.stranger',gen_random_uuid()::text,true),
set_config('test.bank',gen_random_uuid()::text,true),
set_config('test.otherbank',gen_random_uuid()::text,true),
set_config('test.pos',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('test.owner')::uuid),(current_setting('test.supervisor')::uuid),(current_setting('test.stranger')::uuid);
insert into public.gespro_profiles(user_id) select id from auth.users;
insert into public.gespro_banks(id,name) values(current_setting('test.bank')::uuid,'Test A'),(current_setting('test.otherbank')::uuid,'Test B');
insert into public.gespro_memberships(bank_id,user_id,role) values
(current_setting('test.bank')::uuid,current_setting('test.owner')::uuid,'owner'),
(current_setting('test.bank')::uuid,current_setting('test.supervisor')::uuid,'supervisor');
insert into public.gespro_points_of_sale(id,bank_id,name) values(current_setting('test.pos')::uuid,current_setting('test.bank')::uuid,'Assigned');
insert into public.gespro_points_of_sale(bank_id,name) values(current_setting('test.bank')::uuid,'Not assigned'),(current_setting('test.otherbank')::uuid,'Other bank');
insert into public.gespro_pos_assignments values(current_setting('test.bank')::uuid,current_setting('test.pos')::uuid,current_setting('test.supervisor')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
do $$ begin
 if (select count(*) from public.gespro_banks)<>1 or (select count(*) from public.gespro_points_of_sale)<>2 then raise exception 'owner isolation failed'; end if;
 if has_table_privilege(current_user,'public.gespro_memberships','INSERT') then raise exception 'self escalation allowed'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.supervisor'),true);
do $$ begin
 if (select count(*) from public.gespro_banks)<>1 or (select count(*) from public.gespro_points_of_sale)<>1 then raise exception 'supervisor isolation failed'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.stranger'),true);
do $$ begin
 if (select count(*) from public.gespro_banks)<>0 or (select count(*) from public.gespro_points_of_sale)<>0 then raise exception 'unassigned user isolation failed'; end if;
end $$;
reset role;
insert into public.gespro_platform_admins values(current_setting('test.stranger')::uuid);
set local role authenticated;
do $$ begin
 if (select count(*) from public.gespro_banks)<>2 then raise exception 'platform admin access failed'; end if;
end $$;
reset role;
update public.gespro_profiles set active=false where user_id=current_setting('test.stranger')::uuid;
set local role authenticated;
do $$ begin
 if (select count(*) from public.gespro_banks)<>0 then raise exception 'paused admin access failed'; end if;
end $$;
set local role anon;
do $$ begin
 if has_table_privilege(current_user,'public.gespro_banks','SELECT') then raise exception 'anonymous access allowed'; end if;
end $$;
reset role;
select 'PASS: owner, supervisor, unassigned, admin, paused admin, anonymous, role escalation' as result;
rollback;
