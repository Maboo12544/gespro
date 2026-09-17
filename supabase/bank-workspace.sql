begin;
create table public.gespro_bank_configuration(
 bank_id uuid primary key references public.gespro_banks(id),
 configuration jsonb not null check(jsonb_typeof(configuration)='object' and octet_length(configuration::text)<=500000 and jsonb_typeof(configuration->'items')='array' and jsonb_typeof(configuration->'rates')='object' and jsonb_typeof(configuration->'removed')='object'),
 version bigint not null default 1,updated_at timestamptz not null default clock_timestamp(),updated_by uuid not null default auth.uid()
);
alter table public.gespro_bank_configuration enable row level security;
revoke all on public.gespro_bank_configuration from public,anon,authenticated;
grant select,insert,update on public.gespro_bank_configuration to authenticated;
create policy bank_configuration_read on public.gespro_bank_configuration for select to authenticated using(exists(select 1 from public.gespro_banks b where b.id=bank_id and b.active) and (gespro_private.is_platform_admin() or gespro_private.bank_role(bank_id)='owner'));
create policy bank_configuration_create on public.gespro_bank_configuration for insert to authenticated with check(exists(select 1 from public.gespro_banks b where b.id=bank_id and b.active) and (gespro_private.is_platform_admin() or gespro_private.bank_role(bank_id)='owner'));
create policy bank_configuration_update on public.gespro_bank_configuration for update to authenticated using(gespro_private.is_platform_admin() or gespro_private.bank_role(bank_id)='owner') with check(exists(select 1 from public.gespro_banks b where b.id=bank_id and b.active) and (gespro_private.is_platform_admin() or gespro_private.bank_role(bank_id)='owner'));
create function gespro_private.stamp_bank_configuration() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Access denied' using errcode='42501';end if;
 if TG_OP='UPDATE' then
 if new.bank_id<>old.bank_id then raise exception 'Cannot move bank configuration';end if;
 new.version=old.version+1;
 else new.version=1;end if;
 new.updated_by=auth.uid();new.updated_at=clock_timestamp();return new;
end $$;
revoke all on function gespro_private.stamp_bank_configuration() from public,anon,authenticated;
create trigger stamp_bank_configuration before insert or update on public.gespro_bank_configuration for each row execute function gespro_private.stamp_bank_configuration();
create function public.gespro_save_bank_configuration(target_bank uuid,expected_version bigint,settings jsonb) returns public.gespro_bank_configuration language plpgsql security invoker set search_path='' as $$
declare saved public.gespro_bank_configuration;
begin
 if expected_version=0 then
 insert into public.gespro_bank_configuration(bank_id,configuration) values(target_bank,settings) on conflict(bank_id) do nothing returning * into saved;
 else
 update public.gespro_bank_configuration set configuration=settings where bank_id=target_bank and version=expected_version returning * into saved;
 end if;
 if saved.bank_id is null then raise exception 'Configuration changed; reload first' using errcode='40001';end if;
 return saved;
end $$;
revoke all on function public.gespro_save_bank_configuration(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.gespro_save_bank_configuration(uuid,bigint,jsonb) to authenticated;
commit;
