begin;
insert into auth.users(id,email,raw_app_meta_data) values
('00000000-0000-4000-8000-000000000093','kc.test@users.kc.invalid','{"managed_by":"740c74de-438f-4a23-8111-74ba2a882ab0"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','740c74de-438f-4a23-8111-74ba2a882ab0',true);
select public.provision_managed_member('00000000-0000-4000-8000-000000000093','kc.test','Test managed','marketing',null);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000093',true);
do $$
begin
 if private.staff_role() is not null or exists(select 1 from public.units) then raise exception 'Password gate bypassed'; end if;
 begin
  update public.members set must_change_password=false where user_id=auth.uid();
  raise exception 'Client cleared gate';
 exception when insufficient_privilege then null; end;
 begin
  perform public.complete_initial_password(auth.uid());
  raise exception 'Client called completion';
 exception when insufficient_privilege then null; end;
 begin
  perform public.provision_managed_member(auth.uid(),'kc.test','Bad','admin',null);
  raise exception 'Nonadmin provisioned';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
select public.complete_initial_password('00000000-0000-4000-8000-000000000093');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000093',true);
do $$ begin
 if private.staff_role() is distinct from 'marketing' then raise exception 'Completion failed'; end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.audit_log where entity_id='00000000-0000-4000-8000-000000000093' and action='insert' and actor_id='740c74de-438f-4a23-8111-74ba2a882ab0') then raise exception 'Creator audit missing'; end if;
end $$;
rollback;
select 'PASS: admin-only provisioning, password gate enforced in RLS, client bypass denied, service completion, audit; fixtures rolled back' as result;
