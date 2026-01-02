-- Enable the pg_trgm extension for similarity search and GIN indexing
create extension if not exists pg_trgm;

-- Add GIN indexes for fast partial text matching (ilike '%query%')
create index if not exists profiles_username_trgm_idx on profiles using gin (username gin_trgm_ops);
create index if not exists profiles_display_name_trgm_idx on profiles using gin (display_name gin_trgm_ops);
