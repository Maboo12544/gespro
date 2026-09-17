/* Ensure the public POS configuration RPC exposes the saved bank posLayout. */
CREATE OR REPLACE FUNCTION public.gespro_pos_configuration(target_pos uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT gespro_private.pos_configuration(target_pos);
$$;

REVOKE ALL ON FUNCTION public.gespro_pos_configuration(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gespro_pos_configuration(uuid) TO authenticated;
