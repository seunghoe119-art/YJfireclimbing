-- Run once in the Supabase SQL Editor.
create extension if not exists pg_cron with schema pg_catalog;
create table if not exists public.temporary_reports (
  id uuid primary key,
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  accuracy_m integer not null check(accuracy_m >= 0),
  submitted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
create index if not exists temporary_reports_expiry_idx on public.temporary_reports(expires_at);
alter table public.temporary_reports enable row level security;
grant insert(id,latitude,longitude,accuracy_m) on public.temporary_reports to anon;
grant select(id,latitude,longitude,accuracy_m,submitted_at,expires_at) on public.temporary_reports to anon, authenticated;
create policy temporary_report_insert on public.temporary_reports for insert to anon
  with check(expires_at > now() and expires_at <= now() + interval '7 days');
create policy temporary_report_read_live on public.temporary_reports for select to anon, authenticated
  using(expires_at > now());
alter publication supabase_realtime add table public.temporary_reports;
select cron.schedule('remove-expired-temporary-reports','*/15 * * * *',
  $$delete from public.temporary_reports where expires_at <= now()$$);
