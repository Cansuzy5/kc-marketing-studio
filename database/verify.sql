-- Transactional checks: all fixtures are rolled back. No real accounts are altered.
begin;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000001','kc-test-admin@example.invalid'),('00000000-0000-4000-8000-000000000002','kc-test-branch@example.invalid'),('00000000-0000-4000-8000-000000000003','kc-test-pending@example.invalid');
insert into public.members(user_id,display_name,role,active,unit_id) values
('00000000-0000-4000-8000-000000000001','Test Admin','admin',true,null),
('00000000-0000-4000-8000-000000000002','Test Branch','branch',true,(select id from public.units where bu_id=0 and name='วัสดุก่อสร้าง')),
('00000000-0000-4000-8000-000000000003','Test Pending','pending',false,null);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
set local role authenticated;
insert into public.content_items(id,unit_id,payload) select '00000000-0000-4000-8000-000000000010',id,'{"title":"Audit test","files":[]}' from public.units where bu_id=0 and name='วัสดุก่อสร้าง';
insert into public.content_items(id,unit_id,payload) select '00000000-0000-4000-8000-000000000011',id,'{"title":"Other branch test","files":[]}' from public.units where bu_id=2 and name='พูลวิลล่า';
update public.content_items set payload='{"title":"Edited","files":[]}' where id='00000000-0000-4000-8000-000000000010' and version=1;
update public.content_items set deleted_at=now() where id='00000000-0000-4000-8000-000000000010' and version=2;
update public.content_items set deleted_at=null where id='00000000-0000-4000-8000-000000000010' and version=3;
do $$ begin
 if (select version from public.content_items where id='00000000-0000-4000-8000-000000000010')<>4 then raise exception 'version check failed'; end if;
 if (select count(*) from public.audit_log where entity_id='00000000-0000-4000-8000-000000000010')<>4 then raise exception 'audit count failed'; end if;
 if not exists(select 1 from public.audit_log where action='restore' and actor_id=auth.uid()) then raise exception 'restore audit missing'; end if;
 if has_table_privilege('authenticated','public.audit_log','UPDATE') or has_table_privilege('authenticated','public.content_items','DELETE') then raise exception 'unsafe privileges'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from public.content_items)<>1 then raise exception 'branch isolation failed'; end if;
 if (select count(*) from public.audit_log)<>0 then raise exception 'history isolation failed'; end if;
 update public.content_items set payload='{"title":"forbidden"}' where id='00000000-0000-4000-8000-000000000011';
 if found then raise exception 'cross branch update succeeded'; end if;
 begin
  update public.content_items set unit_id=(select id from public.units where bu_id=2) where id='00000000-0000-4000-8000-000000000010';
  raise exception 'cross branch reassignment succeeded';
 exception when not_null_violation or insufficient_privilege then null; end;
 update public.members set role='admin' where user_id=auth.uid();
 if found then raise exception 'self escalation succeeded'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from public.content_items) then raise exception 'pending account can read'; end if;
 if exists(select 1 from public.units) then raise exception 'pending account sees units'; end if;
end $$;
reset role;
rollback;
select 'PASS: audit snapshots, actor, trash, restore, version, branch isolation, pending denial, privilege escalation denial; fixtures rolled back' as result;
