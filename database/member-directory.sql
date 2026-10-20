-- Refresh the approval directory from confirmed Auth users.
-- Does not grant access, activate accounts, or change existing roles.
begin;
create or replace function private.sync_pending_members()
returns integer language plpgsql security definer set search_path='' as $$
declare added integer;
begin
 if auth.uid() is null or private.staff_role() is distinct from 'admin' then
  raise exception 'Administrator required' using errcode='42501';
 end if;
 insert into public.members(user_id,display_name,email,role,active)
 select u.id,left(coalesce(nullif(u.raw_user_meta_data->>'display_name',''),u.email,''),200),
 coalesce(u.email,''),'pending',false
 from auth.users u where u.email_confirmed_at is not null and u.deleted_at is null
 and not exists(select 1 from public.members m where m.user_id=u.id)
 on conflict(user_id) do nothing;
 get diagnostics added=row_count;
 return added;
end $$;
revoke all on function private.sync_pending_members() from public,anon,authenticated;
grant execute on function private.sync_pending_members() to authenticated;
create or replace function public.sync_pending_members()
returns integer language sql security invoker set search_path='' as $$
 select private.sync_pending_members();
$$;
revoke all on function public.sync_pending_members() from public,anon,authenticated;
grant execute on function public.sync_pending_members() to authenticated;
-- The server-controlled email trigger also permits the guarded administrator
-- sync. Client INSERT policy still only permits a pending profile for oneself.
create or replace function private.member_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and auth.uid()<>new.user_id
 and private.staff_role() is distinct from 'admin' then
  raise exception 'Cannot create another member';
 end if;
 select email into new.email from auth.users where id=new.user_id;
 return new;
end $$;
commit;
