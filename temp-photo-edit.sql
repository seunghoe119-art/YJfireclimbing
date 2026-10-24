create or replace function public.update_temporary_report_photos(p_id uuid,p_token text,p_before text default null,p_after text default null) returns boolean language plpgsql security definer set search_path='' as $$ begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' or (p_before is null and p_after is null) then return false;end if;
 if not site_private.valid_photo(p_before) or not site_private.valid_photo(p_after) then raise exception 'Photos must be below 500KB';end if;
 update public.temporary_reports set photo_before_data=coalesce(p_before,photo_before_data),photo_after_data=coalesce(p_after,photo_after_data) where id=p_id and approved_at is null and expires_at>now() and cancel_token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 return found;
end $$;
revoke all on function public.update_temporary_report_photos(uuid,text,text,text) from public;
grant execute on function public.update_temporary_report_photos(uuid,text,text,text) to anon,authenticated;
