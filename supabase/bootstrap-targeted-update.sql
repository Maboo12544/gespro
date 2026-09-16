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
