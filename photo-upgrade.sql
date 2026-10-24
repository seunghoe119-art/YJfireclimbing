begin;
create or replace function site_private.valid_photo(p text) returns boolean language sql immutable set search_path='' as $$ select case when p is null then true when length(p)>666690 or p !~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' then false else octet_length(decode(split_part(p,',',2),'base64'))<500000 end $$;
alter table public.temporary_reports add column if not exists photo_before_data text,add column if not exists photo_after_data text;
alter table public.temporary_reports drop constraint if exists yj_report_metadata_limits;
alter table public.temporary_reports add constraint yj_report_metadata_limits check(length(name)<=160 and length(address)<=300 and length(note)<=1000 and length(volunteer_team)<=40 and site_private.valid_photo(photo_data) and site_private.valid_photo(photo_before_data) and site_private.valid_photo(photo_after_data));
-- Constraint helpers must be callable by clients checking their own INSERTs.
grant usage on schema site_private to anon,authenticated;
revoke all on function site_private.point_position(text) from public,anon,authenticated;
revoke all on function site_private.valid_photo(text) from public;
grant execute on function site_private.valid_photo(text) to anon,authenticated;
grant insert(photo_before_data,photo_after_data),select(photo_before_data,photo_after_data) on public.temporary_reports to anon,authenticated;
alter table public.extinguisher_inspections add column if not exists photo_data text;
alter table public.extinguisher_inspections drop constraint if exists yj_inspection_photo_limit;
alter table public.extinguisher_inspections add constraint yj_inspection_photo_limit check(site_private.valid_photo(photo_data));
create or replace function public.submit_extinguisher_inspection_photo(p_id text,p_team text,p_note text,p_checks jsonb,p_lat double precision,p_lng double precision,p_photo_data text default null) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid;begin
 if not site_private.valid_photo(p_photo_data) then raise exception 'Photo must be below 500KB';end if;
 v_id=public.submit_extinguisher_inspection(p_id,p_team,p_note,p_checks,p_lat,p_lng);
 update public.extinguisher_inspections set photo_data=p_photo_data where id=v_id;
 return v_id;
end $$;
revoke all on function public.submit_extinguisher_inspection_photo(text,text,text,jsonb,double precision,double precision,text) from public;
grant execute on function public.submit_extinguisher_inspection_photo(text,text,text,jsonb,double precision,double precision,text) to anon,authenticated;
commit;
