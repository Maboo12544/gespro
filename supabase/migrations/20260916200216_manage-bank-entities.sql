-- Manage bank entities: rename/activate banks and POS
create or replace function gespro_private.update_bank_entity(target_bank uuid,entity_id uuid,entity_kind text,title text,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid();old_title text;c jsonb;field text;rewritten jsonb;k text;v jsonb;parts jsonb;compact text;
begin
 if actor is null or enabled is null or title is null or length(trim(title)) not between 1 and 120 then raise exception 'Invalid input';end if;
 if not gespro_private.is_platform_admin() and (entity_kind='bank' or gespro_private.bank_role(target_bank) is distinct from 'owner') then raise exception 'Access denied' using errcode='42501';end if;
 select name into old_title from public.gespro_banks where id=target_bank for update;
 if not found then raise exception 'Access denied' using errcode='42501';end if;
 if entity_kind='bank' and entity_id=target_bank then
  if old_title<>trim(title) then
   select configuration into c from public.gespro_bank_configuration where bank_id=target_bank for update;
   if found then
    c=jsonb_set(c,'{items}',coalesce((select jsonb_agg(case when item->>'bank'=old_title then jsonb_set(item,'{bank}',to_jsonb(trim(title))) else item end) from jsonb_array_elements(c->'items') item),'[]'::jsonb));
    if c ? 'limits' then c=jsonb_set(c,'{limits}',coalesce((select jsonb_agg(case when item->>'bank'=old_title then jsonb_set(item,'{bank}',to_jsonb(trim(title))) else item end) from jsonb_array_elements(c->'limits') item),'[]'::jsonb));end if;
    foreach field in array array['removed','rates','closingTimes'] loop
     if not(c ? field) then continue;end if;
     rewritten='{}'::jsonb;
     for k,v in select key,value from jsonb_each(c->field) loop
      parts=k::jsonb;
      if jsonb_typeof(parts)='array' and parts->>1=old_title then
       parts=jsonb_set(parts,'{1}',to_jsonb(trim(title)));
       select '['||string_agg(value::text,',' order by ordinality)||']' into compact from jsonb_array_elements(parts) with ordinality;
       k=compact;
      end if;
      rewritten=rewritten||jsonb_build_object(k,v);
     end loop;
     c=jsonb_set(c,array[field],rewritten);
    end loop;
    update public.gespro_bank_configuration set configuration=c where bank_id=target_bank;
   end if;
  end if;
  update public.gespro_banks set name=trim(title),active=enabled where id=target_bank;
 elsif entity_kind='pos' then
  update public.gespro_points_of_sale set name=trim(title),active=enabled where id=entity_id and bank_id=target_bank;
  if not found then raise exception 'Access denied' using errcode='42501';end if;
 else raise exception 'Invalid entity';end if;
 insert into public.gespro_access_audit(actor_id,bank_id,action,target_id) values(actor,target_bank,'update_'||entity_kind,entity_id);
end $$;
revoke all on function gespro_private.update_bank_entity(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function gespro_private.update_bank_entity(uuid,uuid,text,text,boolean) to authenticated;
create or replace function public.gespro_update_bank_entity(target_bank uuid,entity_id uuid,entity_kind text,title text,enabled boolean) returns void language sql security invoker set search_path='' as $$select gespro_private.update_bank_entity(target_bank,entity_id,entity_kind,title,enabled)$$;
revoke all on function public.gespro_update_bank_entity(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.gespro_update_bank_entity(uuid,uuid,text,text,boolean) to authenticated;