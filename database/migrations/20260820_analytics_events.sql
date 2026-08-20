-- Anonymous public-menu analytics for restaurant owners.
-- No diner accounts or PII: restaurant_id + hashed-free session_id only.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.profiles (id) on delete cascade,
  menu_item_id uuid,
  entity_kind text not null default 'menu_item'
    check (entity_kind in ('menu_item', 'happy_hour', 'pre_fixe')),
  event_type text not null
    check (event_type in ('profile_view', 'item_click', 'share')),
  session_id text not null
    check (char_length(session_id) between 8 and 64),
  source text
    check (source in ('instagram', 'google', 'qr', 'discover', 'direct', 'other')),
  created_at timestamptz not null default now(),
  day date generated always as ((timezone('utc', created_at))::date) stored
);

comment on table public.analytics_events is
  'Anonymous diner interactions on public menus. No names, emails, IPs, or precise locations.';

create index if not exists analytics_events_restaurant_day_idx
  on public.analytics_events (restaurant_id, day);

create index if not exists analytics_events_restaurant_type_day_idx
  on public.analytics_events (restaurant_id, event_type, day);

create index if not exists analytics_events_restaurant_item_idx
  on public.analytics_events (restaurant_id, menu_item_id, day)
  where menu_item_id is not null;

-- One profile view per anonymous session per restaurant per UTC day.
create unique index if not exists analytics_events_profile_view_session_day
  on public.analytics_events (restaurant_id, session_id, day)
  where event_type = 'profile_view';

create table if not exists public.analytics_daily_rollups (
  restaurant_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  profile_views integer not null default 0,
  item_clicks integer not null default 0,
  shares integer not null default 0,
  primary key (restaurant_id, day)
);

comment on table public.analytics_daily_rollups is
  'Per-restaurant daily totals, maintained by trigger from analytics_events.';

create or replace function public.analytics_bump_daily_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_daily_rollups (
    restaurant_id,
    day,
    profile_views,
    item_clicks,
    shares
  )
  values (
    new.restaurant_id,
    (timezone('utc', new.created_at))::date,
    case when new.event_type = 'profile_view' then 1 else 0 end,
    case when new.event_type = 'item_click' then 1 else 0 end,
    case when new.event_type = 'share' then 1 else 0 end
  )
  on conflict (restaurant_id, day) do update set
    profile_views = public.analytics_daily_rollups.profile_views + excluded.profile_views,
    item_clicks = public.analytics_daily_rollups.item_clicks + excluded.item_clicks,
    shares = public.analytics_daily_rollups.shares + excluded.shares;
  return new;
end;
$$;

drop trigger if exists analytics_events_bump_daily_rollup on public.analytics_events;
create trigger analytics_events_bump_daily_rollup
  after insert on public.analytics_events
  for each row
  execute procedure public.analytics_bump_daily_rollup();

alter table public.analytics_events enable row level security;
alter table public.analytics_daily_rollups enable row level security;

drop policy if exists "Owners can read own analytics events" on public.analytics_events;
create policy "Owners can read own analytics events"
  on public.analytics_events
  for select
  to authenticated
  using (restaurant_id = auth.uid());

drop policy if exists "Owners can read own analytics rollups" on public.analytics_daily_rollups;
create policy "Owners can read own analytics rollups"
  on public.analytics_daily_rollups
  for select
  to authenticated
  using (restaurant_id = auth.uid());

revoke all on table public.analytics_events from anon, authenticated;
revoke all on table public.analytics_daily_rollups from anon, authenticated;
grant select on table public.analytics_events to authenticated;
grant select on table public.analytics_daily_rollups to authenticated;
grant all on table public.analytics_events to service_role;
grant all on table public.analytics_daily_rollups to service_role;
