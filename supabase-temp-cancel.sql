-- Run once in Supabase SQL Editor for project rebjcoazabhkcobjjzkj.
-- Pending reports remain public for 7 days. Only the confirmed recipient account can approve.
begin;
create extension if not exists pgcrypto with schema extensions;
alter table public.temporary_reports
  add column if not exists cancel_token_hash text,
  add column if not exists approved_at timestamptz;
revoke all on public.temporary_reports from anon, authenticated;
grant insert(id,latitude,longitude,accuracy_m,cancel_token_hash) on public.temporary_reports to anon, authenticated;
drop policy if exists temporary_report_insert on public.temporary_reports;
create policy temporary_report_insert on public.temporary_reports for insert to anon, authenticated
  with check(approved_at is null and expires_at > now() and expires_at <= now() + interval '7 days');
grant select(id,latitude,longitude,accuracy_m,submitted_at,expires_at,approved_at)
  on public.temporary_reports to anon, authenticated;
-- Do not expose cancellation hashes or grant direct UPDATE/DELETE to visitors.
revoke update, delete on public.temporary_reports from anon, authenticated;
drop policy if exists temporary_report_read_live on public.temporary_reports;
create policy temporary_report_read_live on public.temporary_reports for select to anon, authenticated
  using(expires_at > now());

create or replace function public.cancel_temporary_report(p_id uuid, p_token text)
returns boolean language plpgsql security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from public.temporary_reports
  where id=p_id and expires_at > pg_catalog.now() and approved_at is null
    and cancel_token_hash=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256'),'hex');
  return found;
end;
$$;

-- Remove the earlier client-generated approval-token design if it was installed.
drop function if exists public.approve_temporary_report(uuid,text);
create or replace function public.approve_temporary_report(p_id uuid)
returns boolean language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or pg_catalog.lower(coalesce(auth.jwt()->>'email','')) <> 'sj240324@outlook.kr' then
    raise exception 'Only the receiving administrator may approve a location' using errcode='42501';
  end if;
  update public.temporary_reports
  set approved_at=pg_catalog.now(), expires_at='infinity', cancel_token_hash=null
  where id=p_id and expires_at > pg_catalog.now() and approved_at is null;
  return found;
end;
$$;
revoke all on function public.cancel_temporary_report(uuid,text) from public;
grant execute on function public.cancel_temporary_report(uuid,text) to anon, authenticated;
revoke all on function public.approve_temporary_report(uuid) from public, anon;
grant execute on function public.approve_temporary_report(uuid) to authenticated;
commit;
