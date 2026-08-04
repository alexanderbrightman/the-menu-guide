-- Rounded (minimal) menu cards are the product default.
alter table profiles
  alter column menu_card_style set default 'minimal';

comment on column profiles.menu_card_style is
  'Menu item card shape: minimal = rounded (default), classic = square bordered';
