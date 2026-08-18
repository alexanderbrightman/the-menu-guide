-- Variants (pick one price) and add-ons (additional charge) for a dish.
-- Display-only: this is not a POS modifier engine.

create table if not exists public.menu_item_extras (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  kind text not null check (kind in ('variant', 'addon')),
  name text not null,
  price numeric(10, 2) not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_menu_item_extras_menu_item_id
  on public.menu_item_extras (menu_item_id);

comment on table public.menu_item_extras is
  'Printed extra prices for a dish. variant = mutually exclusive full prices; addon = additional charge.';

alter table public.menu_item_extras enable row level security;

drop policy if exists "Users can manage extras for their menu items" on public.menu_item_extras;
create policy "Users can manage extras for their menu items"
  on public.menu_item_extras
  for all
  to authenticated
  using (
    exists (
      select 1 from public.menu_items i
      where i.id = menu_item_extras.menu_item_id
        and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.menu_items i
      where i.id = menu_item_extras.menu_item_id
        and i.user_id = auth.uid()
    )
  );

drop policy if exists "Public can view extras on published menus" on public.menu_item_extras;
create policy "Public can view extras on published menus"
  on public.menu_item_extras
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.menu_items i
      join public.profiles p on p.id = i.user_id
      where i.id = menu_item_extras.menu_item_id
        and p.is_public = true
        and (p.subscription_status = 'pro' or p.is_complimentary = true)
    )
  );

grant select on table public.menu_item_extras to anon, authenticated;
grant insert, update, delete on table public.menu_item_extras to authenticated;
