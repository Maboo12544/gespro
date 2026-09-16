-- Keep the unconnected result workflow disabled until UI integration is complete.
drop trigger if exists snapshot_test_rates on public.gespro_test_tickets;
revoke all on function public.gespro_publish_test_result(uuid,text,date,jsonb,integer,text) from authenticated;
revoke all on function gespro_private.publish_test_result(uuid,text,date,jsonb,integer,text) from authenticated;