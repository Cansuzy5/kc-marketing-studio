begin;
alter table public.content_items add constraint content_id_unit_unique unique(id,unit_id);
create table public.leads(
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.units,
 content_id uuid,
 customer text not null check(length(trim(customer)) between 1 and 140),
 contact text not null default '' check(length(contact)<=300),
 product text not null default '', need text not null default '',
 source text not null default 'ยังไม่ทราบ',
 attribution text not null default 'ยังไม่ทราบ' check(attribution in ('ยืนยันจากโพสต์','ลูกค้าแจ้ง','รอยืนยัน','ยังไม่ทราบ')),
 received_on date not null default current_date,
 status text not null default 'ใหม่' check(status in ('ใหม่','ติดต่อแล้ว','สนใจ','เสนอราคาแล้ว','รอติดตาม','ปิดการขายสำเร็จ','ไม่สนใจ','ติดต่อไม่ได้')),
 owner text not null default '', next_followup date,
 sale_value numeric(14,2) check(sale_value>=0),
 consent text not null default 'ไม่ทราบ' check(consent in ('ยินยอม','ไม่ยินยอม','ไม่ทราบ')),
 version integer not null default 1, deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references auth.users,updated_by uuid references auth.users,
 unique(id,unit_id),
 foreign key(content_id,unit_id) references public.content_items(id,unit_id) on update restrict,
 check(status='ปิดการขายสำเร็จ' or sale_value is null),
 check(length(need)<=8000 and length(product)<=200 and length(owner)<=100)
);
create table public.lead_followups(
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null,unit_id uuid not null,
 note text not null check(length(trim(note)) between 1 and 8000),
 status text not null,next_followup date,sale_value numeric(14,2),
 created_at timestamptz not null default now(),created_by uuid not null default auth.uid(),
 foreign key(lead_id,unit_id) references public.leads(id,unit_id)
);
create index leads_content_idx on public.leads(content_id,unit_id);
create index leads_unit_due_idx on public.leads(unit_id,next_followup);
create index followup_lead_idx on public.lead_followups(lead_id,unit_id,created_at);
create index leads_creator_idx on public.leads(created_by);
create index leads_updater_idx on public.leads(updated_by);
create index followup_creator_idx on public.lead_followups(created_by);
alter table public.leads enable row level security;
alter table public.lead_followups enable row level security;
revoke all on public.leads,public.lead_followups from anon,authenticated;
grant select on public.leads,public.lead_followups to authenticated;
grant insert(id,unit_id,content_id,customer,contact,product,need,source,attribution,received_on,status,owner,next_followup,sale_value,consent),
 update(content_id,customer,contact,product,need,source,attribution,received_on,status,owner,next_followup,sale_value,consent,deleted_at)
 on public.leads to authenticated;
grant insert(lead_id,unit_id,note,status,next_followup,sale_value) on public.lead_followups to authenticated;
create policy leads_read on public.leads for select to authenticated using(private.can_access(unit_id));
create policy leads_insert on public.leads for insert to authenticated with check(private.can_access(unit_id));
create policy leads_update on public.leads for update to authenticated using(private.can_access(unit_id)) with check(private.can_access(unit_id));
create policy followups_read on public.lead_followups for select to authenticated using(private.can_access(unit_id));
create policy followups_insert on public.lead_followups for insert to authenticated with check(private.can_access(unit_id) and created_by=(select auth.uid()) and exists(select 1 from public.leads l where l.id=lead_id and l.deleted_at is null));
create trigger stamp_leads before insert or update on public.leads for each row execute function private.stamp_content();
create function private.audit_lead() returns trigger language plpgsql security definer set search_path='' as $$
declare before_row jsonb;after_row jsonb;event text:=lower(TG_OP);actor uuid:=auth.uid();who text;
begin
 if actor is null and current_setting('role',true) not in ('none','postgres','service_role') then raise exception 'Actor required'; end if;
 if TG_OP<>'INSERT' then before_row:=to_jsonb(old);end if;
 after_row:=to_jsonb(new);
 if TG_TABLE_NAME='leads' and TG_OP='UPDATE' then
  if old.deleted_at is null and new.deleted_at is not null then event:='trash';end if;
  if old.deleted_at is not null and new.deleted_at is null then event:='restore';end if;
 end if;
 select display_name into who from public.members where user_id=actor;
 insert into public.audit_log(actor_id,actor_name,action,entity_table,entity_id,unit_id,before_data,after_data)
 values(actor,coalesce(who,'System administrator'),event,TG_TABLE_NAME,new.id::text,new.unit_id,before_row,after_row);
 return new;
end $$;
revoke all on function private.audit_lead() from public,anon,authenticated;
create trigger audit_leads after insert or update on public.leads for each row execute function private.audit_lead();
create trigger audit_followups after insert on public.lead_followups for each row execute function private.audit_lead();
-- Invoker rights retain RLS. A stale write rolls back both status and timeline entry.
create function public.record_lead_followup(p_id uuid,p_version integer,p_note text,p_status text,p_next date,p_value numeric)
returns public.leads language plpgsql security invoker set search_path='' as $$
declare saved public.leads;
begin
 update public.leads set status=p_status,next_followup=p_next,sale_value=case when p_status='ปิดการขายสำเร็จ' then p_value else null end
 where id=p_id and version=p_version and deleted_at is null returning * into saved;
 if not found then raise exception 'ข้อมูลเปลี่ยนแปลงหรือไม่มีสิทธิ์ กรุณาโหลดใหม่ก่อนบันทึก';end if;
 insert into public.lead_followups(lead_id,unit_id,note,status,next_followup,sale_value)
 values(saved.id,saved.unit_id,p_note,saved.status,saved.next_followup,saved.sale_value);
 return saved;
end $$;
revoke all on function public.record_lead_followup(uuid,integer,text,text,date,numeric) from public,anon;
grant execute on function public.record_lead_followup(uuid,integer,text,text,date,numeric) to authenticated;
commit;
