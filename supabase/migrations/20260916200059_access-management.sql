-- Real identity management only; ticket/payment operations remain disabled.
grant select,insert,update,delete on public.gespro_banks,public.gespro_memberships,public.gespro_points_of_sale,public.gespro_pos_assignments to service_role;
create table if not exists public.gespro_access_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 bank_id uuid references public.gespro_banks(id), action text not null,
 target_id uuid, created_at timestamptz not null default now()
);
alter table public.gespro_access_audit enable row level security;
revoke all on public.gespro_access_audit from public,anon,authenticated;
grant select on public.gespro_access_audit to authenticated;
grant all on public.gespro_access_audit to service_role;
create policy access_audit_read on public.gespro_access_audit for select to authenticated
 using(gespro_private.is_platform_admin() or gespro_private.bank_role(bank_id)='owner');
-- Managers may read names only for members of their own banks.
create policy profile_bank_manager_read on public.gespro_profiles for select to authenticated
 using(exists(select 1 from public.gespro_memberships m where m.user_id=gespro_profiles.user_id and gespro_private.bank_role(m.bank_id)='owner'));

create or replace function public.gespro_manage_access(actor uuid, operation text, data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 super boolean; actor_role text; bank uuid; target uuid; member_role text; member_active boolean;
 point uuid; points uuid[]; title text; uname text;
begin
 -- Locks make suspension and management decisions atomic with this operation.
 perform 1 from public.gespro_profiles where user_id=actor and active for share;
 if not found then raise exception 'Access denied' using errcode='42501'; end if;
 select exists(select 1 from public.gespro_platform_admins where user_id=actor) into super;
 if operation='create_bank' then
   if not super then raise exception 'Access denied' using errcode='42501'; end if;
   title=trim(data->>'name');
   if title is null or length(title) not between 1 and 120 then raise exception 'Invalid name'; end if;
   insert into public.gespro_banks(name) values(title) returning id into bank;
   insert into public.gespro_access_audit(actor_id,bank_id,action,target_id) values(actor,bank,operation,bank);
   return jsonb_build_object('id',bank);
 end if;
 bank=(data->>'bank_id')::uuid;
 perform 1 from public.gespro_banks where id=bank and active for share;
 if not found then raise exception 'Access denied' using errcode='42501'; end if;
 select role into actor_role from public.gespro_memberships where bank_id=bank and user_id=actor and active for share;
 if not super and actor_role is distinct from 'owner' then raise exception 'Access denied' using errcode='42501'; end if;
 if operation='create_pos' then
   title=trim(data->>'name');
   if title is null or length(title) not between 1 and 120 then raise exception 'Invalid name'; end if;
   insert into public.gespro_points_of_sale(bank_id,name) values(bank,title) returning id into target;
 elsif operation in ('check_member','create_member','update_member') then
   member_role=data->>'role';
   if member_role is null or member_role not in ('owner','supervisor','seller') or (member_role='owner' and not super) then raise exception 'Access denied' using errcode='42501'; end if;
   select coalesce(array_agg(distinct value::uuid),'{}'::uuid[]) into points from jsonb_array_elements_text(coalesce(data->'pos_ids','[]'::jsonb));
   if member_role='seller' and cardinality(points)<>1 then raise exception 'Seller needs exactly one point of sale'; end if;
   foreach point in array points loop
     perform 1 from public.gespro_points_of_sale where id=point and bank_id=bank and active for share;
     if not found then raise exception 'Invalid point of sale'; end if;
   end loop;
   if operation='check_member' then return jsonb_build_object('ok',true); end if;
   target=(data->>'user_id')::uuid;
   if target=actor or exists(select 1 from public.gespro_platform_admins where user_id=target) then raise exception 'Access denied' using errcode='42501'; end if;
   if operation='create_member' then
     uname=lower(trim(data->>'username'));title=trim(data->>'display_name');
     if uname is null or uname !~ '^[a-z0-9][a-z0-9._-]{2,31}$' or title is null or length(title) not between 1 and 120 then raise exception 'Invalid profile'; end if;
     insert into public.gespro_profiles(user_id,username,display_name) values(target,uname,title);
     insert into public.gespro_memberships(bank_id,user_id,role) values(bank,target,member_role);
   else
     perform 1 from public.gespro_memberships where bank_id=bank and user_id=target and (super or role<>'owner') for update;
     if not found then raise exception 'Access denied' using errcode='42501'; end if;
     member_active=coalesce((data->>'active')::boolean,true);
     update public.gespro_memberships set role=member_role,active=member_active where bank_id=bank and user_id=target;
   end if;
   delete from public.gespro_pos_assignments where bank_id=bank and user_id=target;
   insert into public.gespro_pos_assignments(bank_id,pos_id,user_id) select bank,unnest(points),target;
 else raise exception 'Invalid operation';
 end if;
 insert into public.gespro_access_audit(actor_id,bank_id,action,target_id) values(actor,bank,operation,target);
 return jsonb_build_object('id',target);
end $$;
revoke all on function public.gespro_manage_access(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gespro_manage_access(uuid,text,jsonb) to service_role;