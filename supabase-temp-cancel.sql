-- Run once in Supabase SQL Editor. Enables secure cancellation and one-click email approval
-- of temporary locations. Approval links are bearer tokens delivered only to the configured recipient.
create extension if not exists pgcrypto with schema extensions;

alter table public.temporary_reports
  add column if not exists cancel_token_hash text,
  add column if not exists approval_token_hash text,
  add column if not exists approved_at timestamptz;

grant insert(cancel_token_hash, approval_token_hash) on public.temporary_reports to anon, authenticated;
grant select(id,latitude,longitude,accuracy_m,submitted_at,expires_at,approved_at)
  on public.temporary_reports to anon, authenticated;

drop policy if exists temporary_report_read_live on public.temporary_reports;
create policy temporary_report_read_live on public.temporary_reports for select to anon, authenticated
  using(expires_at > now() or approved_at is not null);

create or replace function public.cancel_temporary_report(p_id uuid, p_token text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if p_token is null or length(p_token) <> 64 then return false; end if;
  delete from public.temporary_reports
  where id=p_id and expires_at > pg_catalog.now()
    and approved_at is null
    and cancel_token_hash=encode(extensions.digest(convert_to(p_token,'UTF8'),'sha256'),'hex');
  return found;
end;
$$;

create or replace function public.approve_temporary_report(p_id uuid, p_token text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if p_token is null or length(p_token) <> 64 then return false; end if;
  update public.temporary_reports
  set approved_at=pg_catalog.now(), expires_at='infinity', approval_token_hash=null, cancel_token_hash=null
  where id=p_id and expires_at > pg_catalog.now() and approved_at is null
    and approval_token_hash=encode(extensions.digest(convert_to(p_token,'UTF8'),'sha256'),'hex');
  return found;
end;
$$;

revoke all on function public.cancel_temporary_report(uuid,text) from public;
revoke all on function public.approve_temporary_report(uuid,text) from public;
grant execute on function public.cancel_temporary_report(uuid,text) to anon, authenticated;
grant execute on function public.approve_temporary_report(uuid,text) to anon, authenticated;
