-- Applied migration: add_public_site_skin. Existing content and RLS policies are unchanged.
alter table public.site_content add column site_skin text not null default 'orange' check (site_skin in ('orange','neon'));
