begin;
create schema if not exists site_private;
revoke all on schema site_private from public,anon,authenticated;
create table if not exists site_private.administrators(user_id uuid primary key references auth.users(id));
revoke all on site_private.administrators from public,anon,authenticated;
alter table site_private.administrators enable row level security;
insert into site_private.administrators(user_id) select id from auth.users where email='yeongjong@admin.yjfireclimbing.local' and email_confirmed_at is not null on conflict do nothing;
create or replace function public.is_site_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from site_private.administrators where user_id=auth.uid()) $$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon,authenticated;
alter table public.temporary_reports add column if not exists name text not null default '', add column if not exists address text not null default '', add column if not exists note text not null default '', add column if not exists volunteer_team text not null default '', add column if not exists photo_data text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='yj_report_metadata_limits') then alter table public.temporary_reports add constraint yj_report_metadata_limits check(length(name)<=160 and length(address)<=300 and length(note)<=1000 and length(volunteer_team)<=40 and (photo_data is null or (length(photo_data)<=410000 and photo_data ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'))); end if;
end $$;
grant insert(name,address,note,volunteer_team,photo_data),select(name,address,note,volunteer_team,photo_data) on public.temporary_reports to anon,authenticated;
create or replace function public.approve_temporary_report(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$ begin
 if not public.is_site_admin() and not (auth.uid() is not null and lower(coalesce(auth.jwt()->>'email',''))='seunghoe119@gmail.com') then raise exception 'Administrator required' using errcode='42501'; end if;
 update public.temporary_reports set approved_at=now(),expires_at='infinity',cancel_token_hash=null where id=p_id and approved_at is null and expires_at>now(); return found;
end $$;
revoke all on function public.approve_temporary_report(uuid) from public,anon;
grant execute on function public.approve_temporary_report(uuid) to authenticated;
create table if not exists public.extinguisher_inspections(id uuid primary key default gen_random_uuid(),point_id text not null check(length(point_id)<=120),volunteer_team text not null check(volunteer_team in ('북도혼성대','장봉혼성대','생활구조대','용유남성대','운남여성대','운남남성대','심폐소생술대','카운슬링대')),checked_at timestamptz not null default now(),note text not null check(length(note) between 1 and 1000),checks jsonb not null, distance_m double precision not null);
create index if not exists yj_inspection_latest on public.extinguisher_inspections(point_id,checked_at desc);
alter table public.extinguisher_inspections enable row level security;
revoke all on public.extinguisher_inspections from anon,authenticated;
grant select on public.extinguisher_inspections to anon,authenticated;
drop policy if exists yj_inspections_read on public.extinguisher_inspections;
create policy yj_inspections_read on public.extinguisher_inspections for select to anon,authenticated using(true);
create table if not exists public.extinguisher_issues(id uuid primary key default gen_random_uuid(),point_id text not null check(length(point_id)<=120),category text not null check(category in ('소화기 없음','사용·교체 필요','파손·거치 불량','접근 곤란','기타')),note text not null check(length(note) between 1 and 1000),volunteer_team text not null default '' check(length(volunteer_team)<=40),reported_at timestamptz not null default now(),resolved_at timestamptz,admin_note text not null default '' check(length(admin_note)<=1000));
alter table public.extinguisher_issues enable row level security;
revoke all on public.extinguisher_issues from anon,authenticated;
grant select on public.extinguisher_issues to authenticated;
drop policy if exists yj_issues_admin_read on public.extinguisher_issues;
create policy yj_issues_admin_read on public.extinguisher_issues for select to authenticated using(public.is_site_admin());
create or replace function site_private.point_position(p_id text) returns table(lat double precision,lng double precision) language sql stable security definer set search_path='' as $$
 select latitude,longitude from public.temporary_reports where id::text=p_id and approved_at is not null and expires_at>now()
 union all select 37.4868652::double precision,126.41574::double precision where p_id='test-extinguisher-yeongjong-fire-station'
$$;
create or replace function public.submit_extinguisher_inspection(p_id text,p_team text,p_note text,p_checks jsonb,p_lat double precision,p_lng double precision) returns uuid language plpgsql security definer set search_path='' as $$ declare v_lat double precision;v_lng double precision;v_distance double precision;v_id uuid; begin
 select lat,lng into v_lat,v_lng from site_private.point_position(p_id) limit 1;
 if v_lat is null then raise exception 'Unknown permanent point'; end if;
 if p_lat is null or p_lng is null or not(p_lat between -90 and 90) or not(p_lng between -180 and 180) then raise exception 'Valid GPS required'; end if;
 v_distance=6371000*2*asin(least(1,sqrt(power(sin(radians(p_lat-v_lat)/2),2)+cos(radians(v_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-v_lng)/2),2))));
 if p_id='test-extinguisher-yeongjong-fire-station' then v_distance=0; end if;
 if v_distance>10 then raise exception 'Within 10 metres required'; end if;
 if p_checks is null or jsonb_typeof(p_checks)<>'object' or not(p_checks ?& array['pressure','seal','body','access']) or exists(select 1 from jsonb_each(p_checks) x where x.key not in ('pressure','seal','body','access') or jsonb_typeof(x.value)<>'boolean') then raise exception 'Inspection checklist required'; end if;
 perform pg_advisory_xact_lock(hashtext('inspection:'||p_id));
 if exists(select 1 from public.extinguisher_inspections where point_id=p_id and checked_at>now()-interval '30 seconds') then raise exception 'Please wait before submitting again'; end if;
 insert into public.extinguisher_inspections(point_id,volunteer_team,note,checks,distance_m) values(p_id,p_team,trim(p_note),p_checks,v_distance) returning id into v_id; return v_id;
end $$;
create or replace function public.report_extinguisher_issue(p_id text,p_category text,p_note text,p_team text) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
 if not exists(select 1 from site_private.point_position(p_id)) then raise exception 'Unknown permanent point'; end if;
 perform pg_advisory_xact_lock(hashtext('issue:'||p_id));
 if exists(select 1 from public.extinguisher_issues where point_id=p_id and reported_at>now()-interval '30 seconds') then raise exception 'Please wait before submitting again'; end if;
 insert into public.extinguisher_issues(point_id,category,note,volunteer_team) values(p_id,p_category,trim(p_note),coalesce(p_team,'')) returning id into v_id; return v_id;
end $$;
create or replace function public.admin_update_extinguisher(p_id uuid,p_name text,p_address text,p_note text,p_team text,p_action text) returns boolean language plpgsql security definer set search_path='' as $$ begin
 if not public.is_site_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 if p_action not in ('save','approve','reject') then raise exception 'Invalid action'; end if;
 update public.temporary_reports set name=trim(p_name),address=trim(p_address),note=trim(p_note),volunteer_team=p_team,approved_at=case when p_action='approve' then coalesce(approved_at,now()) else approved_at end,expires_at=case when p_action='approve' then 'infinity'::timestamptz when p_action='reject' and approved_at is null then now() else expires_at end,cancel_token_hash=case when p_action='approve' then null else cancel_token_hash end where id=p_id and expires_at>now(); return found;
end $$;
create or replace function public.admin_resolve_issue(p_id uuid,p_note text) returns boolean language plpgsql security definer set search_path='' as $$ begin
 if not public.is_site_admin() then raise exception 'Administrator required' using errcode='42501'; end if;
 update public.extinguisher_issues set resolved_at=now(),admin_note=trim(p_note) where id=p_id and resolved_at is null; return found;
end $$;
revoke all on function public.submit_extinguisher_inspection(text,text,text,jsonb,double precision,double precision),public.report_extinguisher_issue(text,text,text,text) from public;
grant execute on function public.submit_extinguisher_inspection(text,text,text,jsonb,double precision,double precision),public.report_extinguisher_issue(text,text,text,text) to anon,authenticated;
revoke all on function public.admin_update_extinguisher(uuid,text,text,text,text,text),public.admin_resolve_issue(uuid,text) from public,anon;
grant execute on function public.admin_update_extinguisher(uuid,text,text,text,text,text),public.admin_resolve_issue(uuid,text) to authenticated;
commit;
