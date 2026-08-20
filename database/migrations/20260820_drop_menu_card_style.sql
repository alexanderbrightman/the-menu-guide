-- Rounded photos are the only menu item layout.
alter table profiles
  drop column if exists menu_card_style;
