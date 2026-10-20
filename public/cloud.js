'use strict';
const KC = (() => {
 const demo = new URLSearchParams(location.search).get('demo') === '1';
 const url='https://rsxqdbygcbautctfuzlj.supabase.co';
 const key='sb_publishable_KAbo5KTqcPA2MbDoESvpmw_IYsDJoGQ';
 let client, member, session, units=[], rows=[], busy=false, recovery=false;
 const q=s=>document.querySelector(s);
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const check=r=>{if(r.error)throw Error(r.error.message);return r.data;};
 const roleLabel={admin:'ผู้ดูแลระบบ',marketing:'ทีมการตลาด',branch:'ประจำสาขา',pending:'รออนุมัติ'};
 function gate(message='') {q('.app').hidden=true;q('#auth-screen').hidden=false;q('#auth-message').textContent=message;}
 function clear(){if(typeof LeadUI!=='undefined')LeadUI.reset();tasks=[];rows=[];member=null;units=[];q('#view').replaceChildren();document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
 function snapshot(row){if(!row)return '<p>—</p>';if(row.customer||row.note){const labels={customer:'ลูกค้า',contact:'ช่องทางติดต่อ',need:'ความต้องการ',source:'ที่มา',attribution:'การยืนยันที่มา',status:'สถานะ',note:'ผลติดตาม',next_followup:'นัดถัดไป',sale_value:'ยอดปิดการขาย',owner:'ผู้ดูแล',consent:'ยินยอมให้ติดต่อ',deleted_at:'ย้ายลงถังขยะ'};return '<dl>'+Object.entries(labels).filter(([k])=>row[k]!==undefined).map(([k,label])=>'<dt>'+label+'</dt><dd>'+safe(row[k]??'—')+'</dd>').join('')+'</dl>';}const p=row.payload;if(!p)return '<p>หน้าที่: '+safe(roleLabel[row.role]||row.role)+' · '+(row.active?'เปิดใช้งาน':'ปิดใช้งาน')+'</p>';const fields={title:'ชื่องาน',campaign:'แคมเปญ',caption:'บรีฟ / แคปชัน',owner:'ผู้รับผิดชอบ',channel:'ช่องทาง',date:'วันเผยแพร่'};return '<dl>'+Object.entries(fields).map(([key,label])=>'<dt>'+label+'</dt><dd>'+safe(p[key]||'—')+'</dd>').join('')+'<dt>สถานะ</dt><dd>'+safe(STATUSES[p.status]||'—')+'</dd><dt>ไฟล์แนบ</dt><dd>'+safe((p.files||[]).map(f=>f.name).join(', ')||'—')+'</dd>'+Object.entries({approved:'งบอนุมัติ',spent:'ใช้จริง',views:'ยอดดู',replies:'ตอบกลับ',comments:'คอมเมนต์',clicks:'คลิก'}).map(([key,label])=>'<dt>'+label+'</dt><dd>'+safe(p.ads?.[key]??'—')+'</dd>').join('')+'</dl>';}
 function stamp(d){return new Date(d).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'});}
 async function boot(){
  if(demo){q('#auth-screen').hidden=true;q('#cloud-actions').hidden=true;return false;}
  tasks=[];gate('กำลังเชื่อมต่อ…');
  q('.prototype').textContent='KC WORKSPACE';
  q('.sidebar-bottom').innerHTML='<span class="demo-dot"></span>พื้นที่ทำงานร่วมกัน<small id="identity">ต้องเข้าสู่ระบบ</small>';
  q('footer span').textContent='ข้อมูลกลางของ KC · ยอดโฆษณาบันทึกด้วยตนเอง';
  q('#about').textContent='เกี่ยวกับระบบ';
  q('#info h2').textContent='พื้นที่ทำงานการตลาด KC';
  q('#info .info-body').innerHTML='<p>เก็บงานและไฟล์ร่วมกันใน Supabase ภายใต้สิทธิ์ของแต่ละบัญชี สมาชิกใหม่ต้องได้รับอนุมัติก่อนใช้งาน</p><p>การแก้ไข ย้ายลงถังขยะ และกู้คืนมีประวัติบันทึกอัตโนมัติ ผู้ดูแลและทีมการตลาดเปิดดูประวัติได้ ไฟล์แนบเป็นส่วนตัว</p><p>ตัวเลขโฆษณาต้องกรอกเอง ยังไม่ดึงยอดจากแพลตฟอร์มโฆษณา</p>';
  q('.form-hint').textContent='รูปแรกใช้เป็นภาพปก · ไฟล์เก็บร่วมกันตามสิทธิ์ของหน่วยงาน';
  q('#auth-form').onsubmit=authSubmit;
  q('#signup').onclick=()=>{q('#auth-name-field').hidden=false;q('#auth-title').textContent='ขอเข้าใช้งาน KC';q('#auth-submit').textContent='สมัครและยืนยันอีเมล';q('#auth-form').dataset.mode='signup';};
  q('#back-login').onclick=()=>{q('#auth-name-field').hidden=true;q('#auth-title').textContent='ยินดีต้อนรับกลับมา';q('#auth-submit').textContent='เข้าสู่ระบบ';q('#auth-form').dataset.mode='login';};
  q('#forgot').onclick=async()=>{try{const email=q('#auth-email').value.trim();if(!email)throw Error('กรอกอีเมลก่อนครับ');check(await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/'}));q('#auth-message').textContent='หากอีเมลนี้ใช้งานได้ ระบบจะส่งลิงก์ตั้งรหัสผ่านให้ กรุณาตรวจกล่องจดหมาย';}catch(e){q('#auth-message').textContent=e.message;}};
  q('#signout').onclick=async()=>{const result=await client.auth.signOut();if(result.error){toast(result.error.message);return;}clear();gate();};
  q('#refresh-cloud').onclick=async()=>{try{await enter();toast('โหลดข้อมูลล่าสุดแล้ว');}catch(e){toast(e.message);}};
  q('#history-btn').onclick=()=>panel('history');q('#trash-btn').onclick=()=>panel('trash');q('#members-btn').onclick=()=>panel('members');
  q('#close-cloud-panel').onclick=()=>q('#cloud-panel').close();
  q('#trash-task').onclick=async()=>{if(!editing||saving)return;try{await trash(editing.id,editing.version);q('#editor').close();await load();render();toast('ย้ายลงถังขยะแล้ว · กู้คืนได้');}catch(e){q('#form-error').textContent=e.message;}};
  if(!window.supabase){gate('โหลดส่วนเชื่อมต่อไม่สำเร็จ กรุณารีเฟรชหน้า');return true;}
  client=window.supabase.createClient(url,key);
  client.auth.onAuthStateChange((event,s)=>{session=s;if(event==='PASSWORD_RECOVERY'){recovery=true;gate('ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ');q('#auth-form').dataset.mode='recovery';q('#auth-title').textContent='ตั้งรหัสผ่านใหม่';q('#auth-submit').textContent='บันทึกรหัสผ่านใหม่';}else if(event==='SIGNED_OUT'){clear();gate();}});
  try{session=check(await client.auth.getSession()).session;if(session&&!recovery)await enter();else if(!recovery)gate();}catch(e){gate(e.message);}
  return true;
 }
 async function authSubmit(e){e.preventDefault();if(busy)return;busy=true;q('#auth-submit').disabled=true;
  try{const email=q('#auth-email').value.trim(),password=q('#auth-password').value,mode=e.target.dataset.mode;
   if(mode==='signup'){if(password.length<10)throw Error('ตั้งรหัสผ่านอย่างน้อย 10 ตัวอักษร');check(await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/',data:{display_name:q('#auth-name').value.trim()}}}));q('#auth-message').textContent='ตรวจอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบเพื่อขอสิทธิ์ใช้งาน';}
   else if(mode==='recovery'){if(password.length<10)throw Error('ตั้งรหัสผ่านอย่างน้อย 10 ตัวอักษร');check(await client.auth.updateUser({password}));recovery=false;q('#auth-form').dataset.mode='login';await enter();}
   else {session=check(await client.auth.signInWithPassword({email,password})).session;await enter();}
   q('#auth-password').value='';
  }catch(err){q('#auth-message').textContent=err.message;}finally{busy=false;q('#auth-submit').disabled=false;}
 }
 async function enter(){
  const user=check(await client.auth.getUser()).user;if(!user)throw Error('กรุณาเข้าสู่ระบบ');
  member=check(await client.from('members').select('*').eq('user_id',user.id).maybeSingle());
  if(!member){member=check(await client.from('members').insert({user_id:user.id,display_name:user.user_metadata?.display_name||user.email}).select().single());}
  if(!member.active||member.role==='pending'){clear();gate('ยืนยันตัวตนแล้ว บัญชีนี้กำลังรอผู้ดูแลอนุมัติสิทธิ์ กรุณาเข้าสู่ระบบอีกครั้งหลังอนุมัติ');return;}
  units=check(await client.from('units').select('*').order('bu_id'));
  await load();
  q('#auth-screen').hidden=true;q('.app').hidden=false;q('#cloud-actions').hidden=false;
  q('#identity').textContent=member.display_name+' · '+roleLabel[member.role];
  q('#history-btn').hidden=!['admin','marketing'].includes(member.role);q('#members-btn').hidden=member.role!=='admin';
  const allowed=new Set(units.map(u=>String(u.bu_id)));
  document.querySelectorAll('[data-bu]').forEach(b=>b.hidden=!allowed.has(b.dataset.bu));
  [...q('#bu-filter').options].forEach(o=>o.hidden=o.value!=='all'&&!allowed.has(o.value));
  const hash=location.hash.slice(1);if(['overview','content','calendar','library','ads','results','leads'].includes(hash))view=hash;
  fillUnitFilter();render();
 }
 async function hydrate(row){const u=units.find(x=>x.id===row.unit_id);const t={...row.payload,id:row.id,bu:u.bu_id,unit:u.name,version:row.version,sample:false,files:[]};
  for(const f of row.payload.files||[]){if(!f.path)continue;const result=await client.storage.from('kc-files').createSignedUrl(f.path,3600);t.files.push({...f,url:result.data?.signedUrl||''});}
  return adDefaults(t);
 }
 async function load(){rows=check(await client.from('content_items').select('*').order('updated_at',{ascending:false}));tasks=await Promise.all(rows.filter(r=>!r.deleted_at).map(hydrate));}
 async function save(next){
  if(!member?.active)throw Error('กรุณาเข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์');
  const changed=next.filter(t=>tasks.find(old=>old.id===t.id)!==t);
  if(changed.length!==1)throw Error('บันทึกได้ครั้งละหนึ่งงาน กรุณาโหลดข้อมูลใหม่');
  const t=changed[0],old=rows.find(r=>r.id===t.id),u=units.find(u=>u.bu_id===t.bu&&u.name===t.unit);
  if(!u)throw Error('บัญชีนี้ไม่มีสิทธิ์บันทึกในหน่วยงานที่เลือก');
  const files=[];
  for(const f of t.files){
   if(f.path&&f.path.startsWith(u.id+'/')){files.push({name:f.name,type:f.type,path:f.path});continue;}
   if(f.stock)continue;
   const blob=await (await fetch(f.url)).blob();const path=u.id+'/'+t.id+'/'+crypto.randomUUID();
   check(await client.storage.from('kc-files').upload(path,blob,{contentType:f.type,upsert:false}));files.push({name:f.name,type:f.type,path});
  }
  const payload={...t,files};delete payload.id;delete payload.version;delete payload.bu;delete payload.unit;delete payload.sample;
  let result;
  if(old)result=await client.from('content_items').update({unit_id:u.id,payload}).eq('id',t.id).eq('version',old.version).is('deleted_at',null).select().maybeSingle();
  else result=await client.from('content_items').insert({id:t.id,unit_id:u.id,payload}).select().single();
  const saved=check(result);if(!saved)throw Error('งานนี้ถูกแก้ไขโดยคนอื่นแล้ว ปิดหน้าต่างและกดโหลดข้อมูลล่าสุดก่อนแก้ไขอีกครั้ง');
  rows=rows.filter(r=>r.id!==saved.id);rows.push(saved);Object.assign(t,await hydrate(saved));
 }
 async function trash(id,version,restore=false){const result=check(await client.from('content_items').update({deleted_at:restore?null:new Date().toISOString()}).eq('id',id).eq('version',version).select().maybeSingle());if(!result)throw Error('รายการเปลี่ยนแปลงแล้ว กรุณาโหลดข้อมูลล่าสุด');}
 function editor(){if(demo)return;q('#trash-task').hidden=!editing;
  [...field('bu').options].forEach(o=>o.disabled=!units.some(u=>u.bu_id===Number(o.value)));
  if(!units.some(u=>u.bu_id===Number(field('bu').value)))field('bu').value=units[0].bu_id;
  editorUnits(editing?.unit);scopeUnits();
 }
 function scopeUnits(){if(demo||!member)return;[...field('unit').options].forEach(o=>o.disabled=!units.some(u=>u.bu_id===Number(field('bu').value)&&u.name===o.value));if(field('unit').selectedOptions[0]?.disabled)field('unit').value=[...field('unit').options].find(o=>!o.disabled)?.value||'';}
 async function panel(kind){q('#cloud-panel').showModal();q('#cloud-panel-body').textContent='กำลังโหลด…';q('#cloud-panel-title').textContent={history:'ประวัติการเปลี่ยนแปลง',trash:'ถังขยะ · กู้คืนงาน',members:'สมาชิกและสิทธิ์'}[kind];
  try{let html='';
   if(kind==='history'){
    const logs=check(await client.from('audit_log').select('*').order('happened_at',{ascending:false}).limit(200));
    const names={insert:'สร้าง',update:'แก้ไข',trash:'ย้ายลงถังขยะ',restore:'กู้คืน',delete:'ลบ'};
    html='<p class="form-hint">แสดง 200 เหตุการณ์ล่าสุด · เวลาไทย · ประวัติแก้ไขหรือลบจากหน้าเว็บไม่ได้</p>'+logs.map(l=>`<details class="history-row"><summary><b>${safe(names[l.action]||l.action)} · ${safe(l.after_data?.payload?.title||l.before_data?.payload?.title||l.after_data?.customer||l.before_data?.customer||(l.entity_table==='lead_followups'?'บันทึกการติดตามลูกค้า':'สิทธิ์สมาชิก'))}</b><small>${safe(l.actor_name)} · ${stamp(l.happened_at)}</small></summary><div class="history-grid"><div>ก่อนเปลี่ยน<div class="snapshot">${snapshot(l.before_data)}</div></div><div>หลังเปลี่ยน<div class="snapshot">${snapshot(l.after_data)}</div></div></div></details>`).join('');if(!logs.length)html+='<p>ยังไม่มีประวัติ</p>';
   }else if(kind==='trash'){
    const deleted=check(await client.from('content_items').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}));
    html=deleted.map(r=>`<div class="history-row"><b>${safe(r.payload.title)}</b><small>ลบเมื่อ ${stamp(r.deleted_at)}</small><button class="secondary" data-restore="${r.id}" data-version="${r.version}">กู้คืน</button></div>`).join('')||'<p>ถังขยะว่าง ไม่มีงานที่ถูกลบ</p>';
   }else{
    check(await client.rpc('sync_pending_members'));
    const people=check(await client.from('members').select('*').order('created_at'));
    html='<p>สมาชิกใหม่จะปรากฏหลังยืนยันอีเมลแล้ว เปิดหน้านี้อีกครั้งเพื่อโหลดรายชื่อใหม่ เลือกหน้าที่และติ๊กเปิดใช้งานก่อนบันทึก บัญชีประจำสาขาเห็นเฉพาะหน่วยย่อยที่กำหนด</p>'+people.map(m=>`<form class="member-row" data-person="${m.user_id}"><b>${safe(m.display_name)}</b><small>${safe(m.email)}</small><label>หน้าที่<select name="role">${Object.entries(roleLabel).map(([r,label])=>`<option value="${r}" ${m.role===r?'selected':''}>${label}</option>`).join('')}</select></label><label>หน่วยย่อย<select name="unit"><option value="">ทุกหน่วย (ผู้ดูแล/การตลาด)</option>${units.map(u=>`<option value="${u.id}" ${u.id===m.unit_id?'selected':''}>${safe(BUS[u.bu_id].short+' · '+u.name)}</option>`).join('')}</select></label><label><input type="checkbox" name="active" ${m.active?'checked':''}>เปิดใช้งาน</label><button class="primary" ${m.user_id===member.user_id?'disabled':''}>บันทึกสิทธิ์</button></form>`).join('');
   }
   q('#cloud-panel-body').innerHTML=html;
   document.querySelectorAll('[data-restore]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await trash(b.dataset.restore,Number(b.dataset.version),true);await load();render();await panel('trash');toast('กู้คืนงานแล้ว');}catch(e){toast(e.message);b.disabled=false;}});
   document.querySelectorAll('[data-person]').forEach(f=>f.onsubmit=async e=>{e.preventDefault();const role=f.elements.namedItem('role').value,unit=f.elements.namedItem('unit').value;if(role==='branch'&&!unit){toast('เลือกหน่วยย่อยสำหรับบัญชีประจำสาขา');return;}const button=f.querySelector('button');button.disabled=true;try{const saved=check(await client.from('members').update({role,unit_id:role==='branch'?unit:null,active:role!=='pending'&&f.elements.namedItem('active').checked}).eq('user_id',f.dataset.person).select().maybeSingle());if(!saved)throw Error('ไม่สามารถแก้สิทธิ์บัญชีนี้');toast('บันทึกสิทธิ์และประวัติแล้ว');}catch(e){toast(e.message);}finally{button.disabled=false;}});
  }catch(e){q('#cloud-panel-body').textContent=e.message;}
 }
 return {demo,boot,save,editor,scopeUnits,api:()=>client,units:()=>units};
})();
