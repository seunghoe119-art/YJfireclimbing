-- Shared issue indicators and moderation using the existing site administrator credentials.
-- The map only receives point IDs and counts; issue details require administrator credentials.
begin;
create or replace function site_private.frontend_issue_admin_ok(p_username text,p_password text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(p_username='yeongjong' and pg_catalog.encode(extensions.digest(p_password,'sha256'),'hex')='19537fd6648f287f93a13d3dc9db0692a80cd779498f4470001cca3b2d923052',false);
$$;
revoke all on function site_private.frontend_issue_admin_ok(text,text) from public,anon,authenticated;
create or replace function public.get_extinguisher_issue_states()
returns table(point_id text,open_count bigint) language sql stable security definer set search_path='' as $$
 select i.point_id,count(*) from public.extinguisher_issues i where i.resolved_at is null group by i.point_id;
$$;
create or replace function public.frontend_admin_list_issues(p_username text,p_password text)
returns setof public.extinguisher_issues language plpgsql stable security definer set search_path='' as $$
begin
 if not site_private.frontend_issue_admin_ok(p_username,p_password) then raise exception 'Administrator credentials required' using errcode='42501'; end if;
 return query select * from public.extinguisher_issues order by (resolved_at is null) desc,reported_at desc limit 1000;
end;$$;
create or replace function public.frontend_admin_resolve_issue(p_username text,p_password text,p_id uuid,p_note text default '')
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not site_private.frontend_issue_admin_ok(p_username,p_password) then raise exception 'Administrator credentials required' using errcode='42501'; end if;
 if length(coalesce(p_note,''))>1000 then raise exception 'Note too long'; end if;
 update public.extinguisher_issues set resolved_at=coalesce(resolved_at,now()),admin_note=coalesce(nullif(trim(p_note),''),admin_note) where id=p_id;
 return found;
end;$$;
revoke all on function public.get_extinguisher_issue_states(),public.frontend_admin_list_issues(text,text),public.frontend_admin_resolve_issue(text,text,uuid,text) from public;
grant execute on function public.get_extinguisher_issue_states(),public.frontend_admin_list_issues(text,text),public.frontend_admin_resolve_issue(text,text,uuid,text) to anon,authenticated;
commit;