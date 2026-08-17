-- Contact details and per-day opening hours for restaurant profiles.
-- 0 = Sunday … 6 = Saturday (same as JavaScript Date#getDay()).
-- Example: {"1":{"closed":false,"open":"11:00","close":"22:00"}, ...}

alter table public.profiles
  add column if not exists phone text,
  add column if not exists reservation_url text,
  add column if not exists opening_hours jsonb;

comment on column public.profiles.phone is 'Tap-to-call number shown on the public menu and discover cards';
comment on column public.profiles.reservation_url is 'External reservation link (Resy, OpenTable, etc.)';
comment on column public.profiles.opening_hours is 'Per-weekday hours keyed 0-6 (Sun-Sat): {closed, open, close}';
