-- =============================================================================
-- Migration: Protect subscription columns + persistent webhook idempotency
--
-- Problem: The "Users can manage their own profile" RLS policy grants FOR ALL
-- on the entire profiles row, which lets any authenticated user set their own
-- subscription_status = 'pro' (and other billing fields) directly through the
-- Supabase client, bypassing Stripe entirely.
--
-- Fix: A trigger that rejects changes to billing columns unless the request
-- comes from the service role (server-side API routes / webhooks). Regular
-- profile edits (bio, colors, username, is_public, ...) are unaffected.
--
-- Also adds a stripe_webhook_events table so webhook idempotency survives
-- serverless cold starts (previously in-memory only).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger function guarding billing columns on profiles
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
    return new;
  end if;

  -- UPDATE: reject any client-side change to billing columns.
  if new.subscription_status is distinct from old.subscription_status
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.subscription_current_period_end is distinct from old.subscription_current_period_end
     or new.subscription_cancel_at_period_end is distinct from old.subscription_cancel_at_period_end
     or new.subscription_canceled_at is distinct from old.subscription_canceled_at
  then
    raise exception 'Subscription fields can only be modified by the server'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return new;
end;
$$;

drop trigger if exists protect_billing_columns on public.profiles;

create trigger protect_billing_columns
  before insert or update on public.profiles
  for each row
  execute function public.protect_billing_columns();

-- -----------------------------------------------------------------------------
-- 2. Persistent webhook idempotency store
-- -----------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamp with time zone default now()
);

alter table public.stripe_webhook_events enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) may
-- read or write this table.

-- Housekeeping index so old events can be pruned efficiently if needed.
create index if not exists idx_stripe_webhook_events_processed_at
  on public.stripe_webhook_events (processed_at);
