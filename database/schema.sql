-- KC Marketing Studio. Apply once to the empty KC project, inside one transaction.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.business_units (id smallint primary key, name text not null);
create table public.units (id uuid primary key default gen_random_uuid(), bu_id smallint not null references public.business_units, name text not null, unique(bu_id,name));
create table public.members (
 user_id uuid primary key references auth.users(id) on delete restrict,
 display_name text not null default '', email text not null default '', role text not null default 'pending' check(role in ('pending','admin','marketing','branch')),
 unit_id uuid references public.units, active boolean not null default false,
 created_at timestamptz not null default now(),
 check(role <> 'branch' or unit_id is not null)
);
create index members_unit_idx on public.members(unit_id);
create function private.member_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and auth.uid()<>new.user_id then raise exception 'Cannot create another member'; end if;
 select email into new.email from auth.users where id=new.user_id;
 return new;
end $$;
revoke all on function private.member_email() from public,anon,authenticated;
create trigger member_email before insert on public.members for each row execute function private.member_email();
create table public.content_items (
 id uuid primary key default gen_random_uuid(), unit_id uuid not null references public.units,
 payload jsonb not null check(jsonb_typeof(payload)='object' and length(payload->>'title') between 1 and 140),
 version integer not null default 1, deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create index content_unit_updated_idx on public.content_items(unit_id,updated_at desc);
create index content_created_by_idx on public.content_items(created_by);
create index content_updated_by_idx on public.content_items(updated_by);
create table public.audit_log (
 id bigint generated always as identity primary key, happened_at timestamptz not null default now(),
 actor_id uuid, actor_name text not null, action text not null,
 entity_table text not null, entity_id text not null, unit_id uuid,
 before_data jsonb, after_data jsonb
);
create index audit_entity_idx on public.audit_log(entity_table,entity_id,happened_at desc);
create index audit_unit_time_idx on public.audit_log(unit_id,happened_at desc);

create function private.staff_role() returns text language sql stable security definer set search_path='' as $$
 select m.role from public.members m where m.user_id=(select auth.uid()) and m.active and auth.uid() is not null;
$$;
create function private.can_access(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.members m where m.user_id=(select auth.uid()) and auth.uid() is not null and m.active and (m.role in ('admin','marketing') or (m.role='branch' and m.unit_id=target)));
$$;
revoke all on function private.staff_role(),private.can_access(uuid) from public,anon;
grant execute on function private.staff_role(),private.can_access(uuid) to authenticated;

create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare a uuid := auth.uid(); old_json jsonb; new_json jsonb; event text; scope uuid; ident text; who text;
begin
 if a is null and current_setting('role',true) not in ('none','postgres','service_role') then raise exception 'Actor required'; end if;
 if TG_OP <> 'INSERT' then old_json:=to_jsonb(old); end if;
 if TG_OP <> 'DELETE' then new_json:=to_jsonb(new); end if;
 event:=lower(TG_OP);
 if TG_TABLE_NAME='content_items' then
  ident:=coalesce(new_json->>'id',old_json->>'id');
  scope:=coalesce(new_json->>'unit_id',old_json->>'unit_id')::uuid;
  if TG_OP='UPDATE' and old.deleted_at is null and new.deleted_at is not null then event:='trash'; end if;
  if TG_OP='UPDATE' and old.deleted_at is not null and new.deleted_at is null then event:='restore'; end if;
 else ident:=coalesce(new_json->>'user_id',old_json->>'user_id'); end if;
 select display_name into who from public.members where user_id=a;
 insert into public.audit_log(actor_id,actor_name,action,entity_table,entity_id,unit_id,before_data,after_data)
 values(a,coalesce(nullif(who,''),'System administrator'),event,TG_TABLE_NAME,ident,scope,old_json,new_json);
 return coalesce(new,old);
end $$;
create function private.stamp_content() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then new.version:=1; new.created_at:=now(); new.created_by:=auth.uid();
 else new.version:=old.version+1; new.created_at:=old.created_at; new.created_by:=old.created_by;
 end if;
 new.updated_at:=now(); new.updated_by:=auth.uid(); return new;
end $$;
revoke all on function private.audit_change(),private.stamp_content() from public,anon,authenticated;
create trigger stamp_content before insert or update on public.content_items for each row execute function private.stamp_content();
create trigger audit_content after insert or update or delete on public.content_items for each row execute function private.audit_change();
create trigger audit_members after insert or update or delete on public.members for each row execute function private.audit_change();

alter table public.business_units enable row level security;
alter table public.units enable row level security;
alter table public.members enable row level security;
alter table public.content_items enable row level security;
alter table public.audit_log enable row level security;
revoke all on public.business_units,public.units,public.members,public.content_items,public.audit_log from anon,authenticated;
grant select on public.business_units,public.units,public.members,public.content_items,public.audit_log to authenticated;
grant insert(user_id,display_name) on public.members to authenticated;
grant update(role,unit_id,active,display_name) on public.members to authenticated;
grant insert(id,unit_id,payload),update(unit_id,payload,deleted_at) on public.content_items to authenticated;
create policy bu_read on public.business_units for select to authenticated using ((select private.staff_role()) in ('admin','marketing','branch'));
create policy unit_read on public.units for select to authenticated using (private.can_access(id));
create policy member_read on public.members for select to authenticated using (user_id=(select auth.uid()) or (select private.staff_role())='admin');
create policy member_request on public.members for insert to authenticated with check(user_id=(select auth.uid()) and role='pending' and active=false and unit_id is null);
create policy member_admin on public.members for update to authenticated using ((select private.staff_role())='admin' and user_id<>(select auth.uid())) with check((select private.staff_role())='admin' and user_id<>(select auth.uid()));
create policy content_read on public.content_items for select to authenticated using(private.can_access(unit_id));
create policy content_create on public.content_items for insert to authenticated with check(private.can_access(unit_id));
create policy content_edit on public.content_items for update to authenticated using(private.can_access(unit_id)) with check(private.can_access(unit_id));
create policy history_read on public.audit_log for select to authenticated using((select private.staff_role()) in ('admin','marketing'));

insert into public.business_units values (0,'เค.ซี.โฮมมาร์ท'),(1,'เค.ซี.ปิโตรเลียม'),(2,'บ้านโฮม'),(3,'เค.ซี.คอร์ปอเรชั่น');
insert into public.units(bu_id,name) values (0,'วัสดุก่อสร้าง'),(0,'คอนกรีตผสมเสร็จ'),(0,'โซลาร์เซลล์'),(1,'สาขายางตลาด'),(1,'สาขากระนวน'),(1,'สาขานิคมคำสร้อย'),(1,'สาขาวานรนิวาส'),(2,'สวนอาหาร'),(2,'รีสอร์ท'),(2,'พูลวิลล่า'),(3,'ระดับ BU');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('kc-files','kc-files',false,5242880,array['image/jpeg','image/png','image/webp','image/gif','application/pdf']);
create policy kc_file_read on storage.objects for select to authenticated using(bucket_id='kc-files' and private.can_access((storage.foldername(name))[1]::uuid));
create policy kc_file_upload on storage.objects for insert to authenticated with check(bucket_id='kc-files' and private.can_access((storage.foldername(name))[1]::uuid));
-- No client DELETE on records, audit history, or files. Removed assets remain recoverable.
commit;
