-- GesPro identity and tenant foundation. No ticket/payment writes enabled.
create schema if not exists gespro_private;
revoke all on schema gespro_private from public, anon, authenticated;
grant usage on schema gespro_private to authenticated;

create table public.gespro_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.gespro_platform_admins (
 user_id uuid primary key references public.gespro_profiles(user_id) on delete cascade
);
create table public.gespro_banks (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 120),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.gespro_memberships (
 bank_id uuid not null references public.gespro_banks(id) on delete cascade,
 user_id uuid not null references public.gespro_profiles(user_id) on delete cascade,
 role text not null check(role in ('owner','supervisor','seller')),
 active boolean not null default true,
 primary key(bank_id,user_id)
);
create index gespro_memberships_user_idx on public.gespro_memberships(user_id,bank_id);
create table public.gespro_points_of_sale (
 id uuid primary key default gen_random_uuid(),
 bank_id uuid not null references public.gespro_banks(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120),
 active boolean not null default true,
 unique(bank_id,id)
);
create table public.gespro_pos_assignments (
 bank_id uuid not null,
 pos_id uuid not null,
 user_id uuid not null,
 primary key(bank_id,pos_id,user_id),
 foreign key(bank_id,pos_id) references public.gespro_points_of_sale(bank_id,id) on delete cascade,
 foreign key(bank_id,user_id) references public.gespro_memberships(bank_id,user_id) on delete cascade
);
create index gespro_assignments_member_idx on public.gespro_pos_assignments(bank_id,user_id);

-- Internal lookups bypass recursive membership RLS; never accept a caller-supplied user.
create function gespro_private.is_platform_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
 select auth.uid() is not null and exists(
 select 1 from public.gespro_platform_admins a
 join public.gespro_profiles p on p.user_id=a.user_id
 where a.user_id=auth.uid() and p.active);
$$;
create function gespro_private.bank_role(target_bank uuid) returns text
language sql stable security definer set search_path = ''
as $$
 select m.role from public.gespro_memberships m
 join public.gespro_profiles p on p.user_id=m.user_id
 join public.gespro_banks b on b.id=m.bank_id
 where auth.uid() is not null and m.user_id=auth.uid()
 and m.bank_id=target_bank and m.active and p.active and b.active;
$$;
create function gespro_private.can_read_pos(target_bank uuid,target_pos uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
 select auth.uid() is not null and (
 gespro_private.is_platform_admin()
 or gespro_private.bank_role(target_bank)='owner'
 or (gespro_private.bank_role(target_bank) in ('supervisor','seller') and exists(
 select 1 from public.gespro_pos_assignments a where a.bank_id=target_bank
 and a.pos_id=target_pos and a.user_id=auth.uid())));
$$;
revoke all on all functions in schema gespro_private from public,anon,authenticated;
grant execute on function gespro_private.is_platform_admin() to authenticated;
grant execute on function gespro_private.bank_role(uuid) to authenticated;
grant execute on function gespro_private.can_read_pos(uuid,uuid) to authenticated;

alter table public.gespro_profiles enable row level security;
alter table public.gespro_platform_admins enable row level security;
alter table public.gespro_banks enable row level security;
alter table public.gespro_memberships enable row level security;
alter table public.gespro_points_of_sale enable row level security;
alter table public.gespro_pos_assignments enable row level security;
revoke all on public.gespro_profiles,public.gespro_platform_admins,public.gespro_banks,
 public.gespro_memberships,public.gespro_points_of_sale,public.gespro_pos_assignments from public,anon,authenticated;
grant select on public.gespro_profiles,public.gespro_platform_admins,public.gespro_banks,
 public.gespro_memberships,public.gespro_points_of_sale,public.gespro_pos_assignments to authenticated;
create policy profile_read on public.gespro_profiles for select to authenticated
 using(user_id=(select auth.uid()) or (select gespro_private.is_platform_admin()));
create policy admin_read on public.gespro_platform_admins for select to authenticated
 using((select gespro_private.is_platform_admin()));
create policy bank_read on public.gespro_banks for select to authenticated
 using((select gespro_private.is_platform_admin()) or gespro_private.bank_role(id) is not null);
create policy membership_read on public.gespro_memberships for select to authenticated
 using((select gespro_private.is_platform_admin()) or gespro_private.bank_role(bank_id)='owner'
 or (user_id=(select auth.uid()) and gespro_private.bank_role(bank_id) is not null));
create policy pos_read on public.gespro_points_of_sale for select to authenticated
 using(gespro_private.can_read_pos(bank_id,id));
create policy assignment_read on public.gespro_pos_assignments for select to authenticated
 using((select gespro_private.is_platform_admin()) or gespro_private.bank_role(bank_id)='owner'
 or (user_id=(select auth.uid()) and gespro_private.bank_role(bank_id) is not null));
-- Provisioning remains trusted-server only. No self-registration can grant a role.