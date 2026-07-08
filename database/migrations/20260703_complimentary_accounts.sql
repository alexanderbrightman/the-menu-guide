-- =============================================================================
-- Migration: Complimentary (free premium) accounts
--
-- NOTE: Partially superseded by 20260704_complimentary_access_independent.sql,
-- which drops the handle_complimentary_change trigger (section 2 below).
-- is_complimentary no longer rewrites subscription_status; it grants premium
-- access on its own.
--
-- HOW TO GRANT A FREE SUBSCRIPTION:
--   Supabase Dashboard -> Table Editor -> profiles -> find the user
--   -> set is_complimentary to TRUE -> save.
--
-- A trigger then automatically sets subscription_status = 'pro'. Unchecking
-- the box reverts the user to 'free' (and unpublishes their menu) unless
-- they have a real paid Stripe subscription on file.
--
-- Application code treats is_complimentary = true as always-valid premium:
-- the expiry cron, Stripe webhooks, and sync endpoints will never downgrade
-- a complimentary account. Clients cannot set this flag themselves - it is
-- protected by the protect_billing_columns trigger below.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. The flag
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_complimentary boolean not null default false;

comment on column public.profiles.is_complimentary is
  'Admin-granted free premium. Set via Supabase dashboard; clients cannot modify it.';

-- -----------------------------------------------------------------------------
-- 2. Convenience trigger: flipping the flag updates subscription status
--    (runs before protect_billing_columns alphabetically; both allow
--    service-role/dashboard writes)
-- -----------------------------------------------------------------------------
create or replace function public.handle_complimentary_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_complimentary and not old.is_complimentary then
    -- Granting: give premium immediately
    new.subscription_status := 'pro';
  elsif old.is_complimentary and not new.is_complimentary then
    -- Revoking: fall back to the paid subscription if one exists,
    -- otherwise downgrade to free and unpublish
    if new.stripe_subscription_id is null then
      new.subscription_status := 'free';
      new.is_public := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists handle_complimentary_change on public.profiles;

create trigger handle_complimentary_change
  before update on public.profiles
  for each row
  when (old.is_complimentary is distinct from new.is_complimentary)
  execute function public.handle_complimentary_change();

-- -----------------------------------------------------------------------------
-- 3. Extend the billing-column guard so clients cannot grant themselves
--    a complimentary subscription
-- -----------------------------------------------------------------------------
create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_role text;
begin
  -- auth.role() returns 'service_role' for the service key,
  -- 'authenticated' / 'anon' for client requests, and NULL for direct
  -- database access (psql, dashboard SQL editor, migrations).
  requester_role := coalesce(auth.role(), 'service_role');

  if requester_role = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- New profiles always start as free, regardless of what the client sends.
    new.subscription_status := 'free';
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.subscription_current_period_end := null;
    new.subscription_cancel_at_period_end := false;
    new.subscription_canceled_at := null;
    new.is_complimentary := false;
    return new;
  end if;

  -- UPDATE: reject any client-side change to billing columns.
  if new.subscription_status is distinct from old.subscription_status
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.subscription_current_period_end is distinct from old.subscription_current_period_end
     or new.subscription_cancel_at_period_end is distinct from old.subscription_cancel_at_period_end
     or new.subscription_canceled_at is distinct from old.subscription_canceled_at
     or new.is_complimentary is distinct from old.is_complimentary
  then
    raise exception 'Subscription fields can only be modified by the server'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
