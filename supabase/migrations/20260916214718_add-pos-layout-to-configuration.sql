/*
# Add posLayout to bank configuration and POS configuration output

1. Changes
- Update `gespro_private.pos_configuration` to include `posLayout` from the bank configuration JSON in its output.
- This lets the POS screen know which layout model (option1/option2/option3) the admin assigned to the bank.
2. Security
- No new tables or policies. The function is SECURITY DEFINER, already restricted to authenticated.
- posLayout is a read-only value extracted from the existing configuration JSON.
3. Notes
- The column `gespro_bank_configuration.configuration` is jsonb and already accepts the new `posLayout` key without schema changes.
- If `posLayout` is absent in older configurations, it defaults to 'option1' (Klasik) in the application layer.
*/

CREATE OR REPLACE FUNCTION gespro_private.pos_configuration(target_pos uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.gespro_points_of_sale; c jsonb;
BEGIN
  p = gespro_private.require_test_pos(target_pos);
  SELECT configuration INTO c FROM public.gespro_bank_configuration WHERE bank_id = p.bank_id;
  IF NOT found THEN RETURN null; END IF;
  RETURN jsonb_build_object(
    'items', c->'items',
    'removed', c->'removed',
    'rates', '{}'::jsonb,
    'closingTimes', c->'closingTimes',
    'posLayout', coalesce(c->'posLayout', 'option1')
  );
END $$;

REVOKE ALL ON FUNCTION gespro_private.pos_configuration(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION gespro_private.pos_configuration(uuid) TO authenticated;
