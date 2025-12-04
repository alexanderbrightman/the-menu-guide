-- Drop existing functions to ensure clean slate
DROP FUNCTION IF EXISTS update_menu_category_order(JSONB);
DROP FUNCTION IF EXISTS update_menu_item_order(JSONB);

-- Function to update menu category order
CREATE OR REPLACE FUNCTION update_menu_category_order(payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT * FROM jsonb_to_recordset(payload) AS x(id UUID, sort_order INT)
  LOOP
    UPDATE menu_categories
    SET sort_order = item.sort_order
    WHERE id = item.id AND user_id = auth.uid();
  END LOOP;
END;
$$;

-- Function to update menu item order
CREATE OR REPLACE FUNCTION update_menu_item_order(payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN SELECT * FROM jsonb_to_recordset(payload) AS x(id UUID, sort_order INT)
  LOOP
    UPDATE menu_items
    SET sort_order = item.sort_order
    WHERE id = item.id AND user_id = auth.uid();
  END LOOP;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_menu_category_order(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_menu_category_order(JSONB) TO service_role;

GRANT EXECUTE ON FUNCTION update_menu_item_order(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_menu_item_order(JSONB) TO service_role;
