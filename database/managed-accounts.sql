begin;
alter table public.members add column if not exists username text unique;
alter table public.members add column if not exists must_change_password boolean not null default false;
create or replace function private.staff_role() returns text language sql stable security definer set search_path='' as $$
 select m.role from public.members m where m.user_id=(select auth.uid()) and m.active and not m.must_change_password and auth.uid() is not null;
$$;
create or replace function private.can_access(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.members m where m.user_id=(select auth.uid()) and auth.uid() is not null and m.active and not m.must_change_password and (m.role in ('admin','marketing') or (m.role='branch' and m.unit_id=target)));
$$;
create or replace function private.provision_managed_member(target uuid, login_name text, full_name text, assigned_role text, assigned_unit uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.staff_role() is distinct from 'admin' then raise exception 'Administrator required' using errcode='42501'; end if;
 if login_name !~ '^[a-z0-9][a-z0-9._-]{2,31}$' or assigned_role not in ('admin','marketing','branch') then raise exception 'Invalid account'; end if;
 if not exists(select 1 from auth.users u where u.id=target and u.email=login_name||'@users.kc.invalid' and u.raw_app_meta_data->>'managed_by'=auth.uid()::text) then raise exception 'Account creator mismatch'; end if;
 if assigned_role='branch' and not exists(select 1 from public.units where id=assigned_unit) then raise exception 'Choose a branch'; end if;
 insert into public.members(user_id,display_name,username,role,unit_id,active,must_change_password)
 values(target,left(full_name,200),login_name,assigned_role,case when assigned_role='branch' then assigned_unit else null end,true,true);
end $$;
revoke all on function private.provision_managed_member(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function private.provision_managed_member(uuid,text,text,text,uuid) to authenticated;
create or replace function public.provision_managed_member(target uuid, login_name text, full_name text, assigned_role text, assigned_unit uuid)
returns void language sql security invoker set search_path='' as $$
 select private.provision_managed_member(target,login_name,full_name,assigned_role,assigned_unit);
$$;
revoke all on function public.provision_managed_member(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.provision_managed_member(uuid,text,text,text,uuid) to authenticated;
-- Service-only completion: clients cannot clear the password-change gate.
create or replace function public.complete_initial_password(target uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true) <> 'service_role' then raise exception 'Service required' using errcode='42501'; end if;
 perform set_config('request.jwt.claim.sub',target::text,true);
 update public.members set must_change_password=false where user_id=target and active and must_change_password;
end $$;
revoke all on function public.complete_initial_password(uuid) from public,anon,authenticated;
grant execute on function public.complete_initial_password(uuid) to service_role;
commit;
