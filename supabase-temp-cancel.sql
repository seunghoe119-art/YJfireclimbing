-- Install once in Supabase SQL Editor to enable cancellation of a visitor's own temporary point.
-- This stores only a SHA-256 digest of a random per-submission token. There is no public DELETE grant.
create extension if not exists pgcrypto with schema extensions;
alter table public.temporary_reports add column if not exists cancel_token_hash text;

grant insert(cancel_token_hash) on public.temporary_reports to anon, authenticated;

create or replace function public.cancel_temporary_report(p_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if p_token is null or length(p_token) <> 64 then
    return false;
  end if;

  delete from public.temporary_reports
  where id = p_id
    and expires_at > pg_catalog.now()
    and cancel_token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  return found;
end;
$$;

revoke all on function public.cancel_temporary_report(uuid, text) from public;
grant execute on function public.cancel_temporary_report(uuid, text) to anon, authenticated;
