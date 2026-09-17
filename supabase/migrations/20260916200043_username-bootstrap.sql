alter table public.gespro_profiles add column if not exists username text unique check(username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');
create table if not exists gespro_private.bootstrap (
 singleton boolean primary key default true check(singleton),
 username text not null, token_hash text not null,
 expires_at timestamptz not null, used_at timestamptz
);
alter table gespro_private.bootstrap enable row level security;
revoke all on gespro_private.bootstrap from public,anon,authenticated;
grant usage on schema gespro_private to service_role;
grant all on gespro_private.bootstrap to service_role;
grant all on public.gespro_profiles,public.gespro_platform_admins to service_role;
create or replace function public.gespro_bootstrap_allowed(token text) returns boolean language sql security invoker set search_path='' as $$
 select exists(select 1 from gespro_private.bootstrap where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and used_at is null and expires_at>now())
 and not exists(select 1 from public.gespro_platform_admins);
$$;
create or replace function public.gespro_finish_bootstrap(token text, target_user uuid) returns void language plpgsql security invoker set search_path='' as $$
declare configured_username text;
begin
 select username into configured_username from gespro_private.bootstrap
 where singleton=true and token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and used_at is null and expires_at>now() for update;
 if configured_username is null or exists(select 1 from public.gespro_platform_admins) then raise exception 'Setup unavailable'; end if;
 insert into public.gespro_profiles(user_id,username,display_name) values(target_user,configured_username,'Gespro123');
 insert into public.gespro_platform_admins(user_id) values(target_user);
 update gespro_private.bootstrap set used_at=now()
 where singleton=true and token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and used_at is null;
end $$;
revoke all on function public.gespro_bootstrap_allowed(text),public.gespro_finish_bootstrap(text,uuid) from public,anon,authenticated;
grant execute on function public.gespro_bootstrap_allowed(text),public.gespro_finish_bootstrap(text,uuid) to service_role;