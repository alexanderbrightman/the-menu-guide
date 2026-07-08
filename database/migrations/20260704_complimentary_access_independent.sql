-- =============================================================================
-- Migration: Make is_complimentary an independent premium grant
--
-- HOW TO GRANT A FREE SUBSCRIPTION:
--   Supabase Dashboard -> Table Editor -> profiles -> find the user
--   -> set is_complimentary to TRUE -> save. That's it.
--
-- Design change from 20260703_complimentary_accounts.sql:
--   * subscription_status is now owned exclusively by Stripe sync code.
--     Flipping is_complimentary no longer rewrites it (the old
--     handle_complimentary_change trigger is dropped).
--   * Premium access = subscription_status = 'pro' OR is_complimentary = true.
--     All public-read RLS policies are updated to match, so complimentary
--     menus are publicly visible without faking a paid status.
--   * is_complimentary remains protected from client writes by the
--     protect_billing_columns trigger (unchanged).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop the trigger that rewrote subscription_status when the flag flipped
-- -----------------------------------------------------------------------------
drop trigger if exists handle_complimentary_change on public.profiles;
drop function if exists public.handle_complimentary_change();

-- -----------------------------------------------------------------------------
-- 2. Recreate public-read RLS policies to accept complimentary accounts
-- -----------------------------------------------------------------------------

drop policy if exists "Public can view published profiles" on public.profiles;
create policy "Public can view published profiles"
  on public.profiles for select
  using (
    is_public = true
    and (subscription_status = 'pro' or is_complimentary = true)
  );

drop policy if exists "Public can view published menu categories" on public.menu_categories;
create policy "Public can view published menu categories"
  on public.menu_categories for select
  using (
    user_id in (
      select id from public.profiles
      where is_public = true
        and (subscription_status = 'pro' or is_complimentary = true)
    )
  );

drop policy if exists "Public can view published menu items" on public.menu_items;
create policy "Public can view published menu items"
  on public.menu_items for select
  using (
    user_id in (
      select id from public.profiles
      where is_public = true
        and (subscription_status = 'pro' or is_complimentary = true)
    )
  );

drop policy if exists "Public can view published menu item tags" on public.menu_item_tags;
create policy "Public can view published menu item tags"
  on public.menu_item_tags for select
  using (
    menu_item_id in (
      select id from public.menu_items
      where user_id in (
        select id from public.profiles
        where is_public = true
          and (subscription_status = 'pro' or is_complimentary = true)
      )
    )
  );

drop policy if exists "Public can view published favorites" on public.user_favorites;
create policy "Public can view published favorites"
  on public.user_favorites for select
  using (
    user_id in (
      select id from public.profiles
      where is_public = true
        and (subscription_status = 'pro' or is_complimentary = true)
    )
  );

drop policy if exists "Public read active happy hour menus from pro public profiles" on public.happy_hour_menus;
create policy "Public read active happy hour menus from pro public profiles"
  on public.happy_hour_menus for select
  using (
    is_active = true
    and exists (
      select 1 from public.profiles p
      where p.id = happy_hour_menus.user_id
        and p.is_public = true
        and (p.subscription_status = 'pro' or p.is_complimentary = true)
    )
  );

drop policy if exists "Public read happy hour photos" on public.happy_hour_photos;
create policy "Public read happy hour photos"
  on public.happy_hour_photos for select
  using (
    exists (
      select 1
      from public.happy_hour_menus m
      join public.profiles p on p.id = m.user_id
      where m.id = happy_hour_photos.menu_id
        and m.is_active = true
        and p.is_public = true
        and (p.subscription_status = 'pro' or p.is_complimentary = true)
    )
  );

drop policy if exists "Public read active prefxe menus" on public.prefxe_menus;
create policy "Public read active prefxe menus"
  on public.prefxe_menus for select
  using (
    is_active = true
    and exists (
      select 1 from public.profiles p
      where p.id = prefxe_menus.user_id
        and p.is_public = true
        and (p.subscription_status = 'pro' or p.is_complimentary = true)
    )
  );

drop policy if exists "Public read prefxe courses" on public.prefxe_courses;
create policy "Public read prefxe courses"
  on public.prefxe_courses for select
  using (
    exists (
      select 1
      from public.prefxe_menus m
      join public.profiles p on p.id = m.user_id
      where m.id = prefxe_courses.menu_id
        and m.is_active = true
        and p.is_public = true
        and (p.subscription_status = 'pro' or p.is_complimentary = true)
    )
  );

drop policy if exists "Public read prefxe items" on public.prefxe_items;
create policy "Public read prefxe items"
  on public.prefxe_items for select
  using (
    is_available = true
    and exists (
      select 1
      from public.prefxe_courses c
      join public.prefxe_menus m on m.id = c.menu_id
      join public.profiles p on p.id = m.user_id
      where c.id = prefxe_items.course_id
        and m.is_active = true
        and p.is_public = true
        and (p.subscription_status = 'pro' or p.is_complimentary = true)
    )
  );

drop policy if exists "Public read prefxe item tags" on public.prefxe_item_tags;
create policy "Public read prefxe item tags"
  on public.prefxe_item_tags for select
  using (
    exists (
      select 1
      from public.prefxe_items i
      join public.prefxe_courses c on c.id = i.course_id
      join public.prefxe_menus m on m.id = c.menu_id
      join public.profiles p on p.id = m.user_id
      where i.id = prefxe_item_tags.item_id
        and i.is_available = true
        and m.is_active = true
        and p.is_public = true
        and (p.subscription_status = 'pro' or p.is_complimentary = true)
    )
  );
