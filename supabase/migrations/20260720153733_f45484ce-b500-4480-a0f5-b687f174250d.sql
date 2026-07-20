create table if not exists public.branding_settings (
  id text primary key default 'global',
  logo_path text,
  logo_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint branding_settings_singleton check (id = 'global')
);
grant select, insert, update, delete on public.branding_settings to authenticated;
grant all on public.branding_settings to service_role;
alter table public.branding_settings enable row level security;
insert into public.branding_settings (id) values ('global') on conflict do nothing;