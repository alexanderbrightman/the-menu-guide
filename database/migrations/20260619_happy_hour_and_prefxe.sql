-- Happy Hour menus and photos
create table if not exists happy_hour_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  start_time time not null default '16:00',
  end_time time not null default '18:00',
  days_of_week integer[] not null default '{1,2,3,4,5}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists happy_hour_photos (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references happy_hour_menus(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_happy_hour_menus_user on happy_hour_menus(user_id);
create index if not exists idx_happy_hour_photos_menu on happy_hour_photos(menu_id);

alter table happy_hour_menus enable row level security;
alter table happy_hour_photos enable row level security;

create policy "Owners manage happy hour menus"
  on happy_hour_menus for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public read active happy hour menus from pro public profiles"
  on happy_hour_menus for select
  using (
    is_active = true
    and exists (
      select 1 from profiles p
      where p.id = happy_hour_menus.user_id
        and p.is_public = true
        and p.subscription_status = 'pro'
    )
  );

create policy "Owners manage happy hour photos"
  on happy_hour_photos for all
  using (
    exists (
      select 1 from happy_hour_menus m
      where m.id = happy_hour_photos.menu_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from happy_hour_menus m
      where m.id = happy_hour_photos.menu_id and m.user_id = auth.uid()
    )
  );

create policy "Public read happy hour photos"
  on happy_hour_photos for select
  using (
    exists (
      select 1 from happy_hour_menus m
      join profiles p on p.id = m.user_id
      where m.id = happy_hour_photos.menu_id
        and m.is_active = true
        and p.is_public = true
        and p.subscription_status = 'pro'
    )
  );

-- Pre Fixe menus, courses, items
create table if not exists prefxe_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price numeric(10,2),
  start_time time,
  end_time time,
  days_of_week integer[] default '{0,1,2,3,4,5,6}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists prefxe_courses (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references prefxe_menus(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists prefxe_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references prefxe_courses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists prefxe_item_tags (
  item_id uuid not null references prefxe_items(id) on delete cascade,
  tag_id integer not null references tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

create index if not exists idx_prefxe_menus_user on prefxe_menus(user_id);
create index if not exists idx_prefxe_courses_menu on prefxe_courses(menu_id);
create index if not exists idx_prefxe_items_course on prefxe_items(course_id);

alter table prefxe_menus enable row level security;
alter table prefxe_courses enable row level security;
alter table prefxe_items enable row level security;
alter table prefxe_item_tags enable row level security;

create policy "Owners manage prefxe menus"
  on prefxe_menus for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public read active prefxe menus"
  on prefxe_menus for select
  using (
    is_active = true
    and exists (
      select 1 from profiles p
      where p.id = prefxe_menus.user_id
        and p.is_public = true
        and p.subscription_status = 'pro'
    )
  );

create policy "Owners manage prefxe courses"
  on prefxe_courses for all
  using (
    exists (select 1 from prefxe_menus m where m.id = prefxe_courses.menu_id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from prefxe_menus m where m.id = prefxe_courses.menu_id and m.user_id = auth.uid())
  );

create policy "Public read prefxe courses"
  on prefxe_courses for select
  using (
    exists (
      select 1 from prefxe_menus m
      join profiles p on p.id = m.user_id
      where m.id = prefxe_courses.menu_id and m.is_active = true
        and p.is_public = true and p.subscription_status = 'pro'
    )
  );

create policy "Owners manage prefxe items"
  on prefxe_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public read prefxe items"
  on prefxe_items for select
  using (
    is_available = true
    and exists (
      select 1 from prefxe_courses c
      join prefxe_menus m on m.id = c.menu_id
      join profiles p on p.id = m.user_id
      where c.id = prefxe_items.course_id and m.is_active = true
        and p.is_public = true and p.subscription_status = 'pro'
    )
  );

create policy "Owners manage prefxe item tags"
  on prefxe_item_tags for all
  using (
    exists (
      select 1 from prefxe_items i
      where i.id = prefxe_item_tags.item_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from prefxe_items i
      where i.id = prefxe_item_tags.item_id and i.user_id = auth.uid()
    )
  );

create policy "Public read prefxe item tags"
  on prefxe_item_tags for select
  using (
    exists (
      select 1 from prefxe_items i
      join prefxe_courses c on c.id = i.course_id
      join prefxe_menus m on m.id = c.menu_id
      join profiles p on p.id = m.user_id
      where i.id = prefxe_item_tags.item_id and i.is_available = true
        and m.is_active = true and p.is_public = true and p.subscription_status = 'pro'
    )
  );
