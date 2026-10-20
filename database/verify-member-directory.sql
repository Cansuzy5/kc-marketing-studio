begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-8000-000000000091','kc-confirmed-test@example.invalid',now()),
('00000000-0000-4000-8000-000000000092','kc-unconfirmed-test@example.invalid',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','740c74de-438f-4a23-8111-74ba2a882ab0',true);
select public.sync_pending_members();
do $$
begin
 if not exists(select 1 from public.members where user_id='00000000-0000-4000-8000-000000000091' and role='pending' and not active and unit_id is null) then raise exception 'Confirmed member missing or activated'; end if;
 if exists(select 1 from public.members where user_id='00000000-0000-4000-8000-000000000092') then raise exception 'Unconfirmed member included'; end if;
end $$;
select public.sync_pending_members();
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
do $$
begin
 begin
  perform public.sync_pending_members();
  raise exception 'Pending user was allowed';
 exception when insufficient_privilege then null;
 end;
 if exists(select 1 from public.content_items) then raise exception 'Pending user has content access'; end if;
end $$;
reset role;
do $$
begin
 if not exists(select 1 from public.audit_log where entity_table='members' and entity_id='00000000-0000-4000-8000-000000000091' and actor_id='740c74de-438f-4a23-8111-74ba2a882ab0') then raise exception 'Audit missing'; end if;
 if has_function_privilege('anon','public.sync_pending_members()','execute') then raise exception 'Anon has execute'; end if;
end $$;
rollback;
select 'PASS: confirmed only, pending inactive, idempotent, non-admin denied, no content access, audit recorded; fixtures rolled back' as result;
