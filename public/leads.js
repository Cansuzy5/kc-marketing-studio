'use strict';
const LeadUI=(()=>{
const statuses=['ใหม่','ติดต่อแล้ว','สนใจ','เสนอราคาแล้ว','รอติดตาม','ปิดการขายสำเร็จ','ไม่สนใจ','ติดต่อไม่ได้'];
const sources=['Facebook Ads','Facebook Organic','TikTok Ads','TikTok Organic','LINE OA','เว็บไซต์','Shopee','โทรศัพท์','Walk-in','แนะนำต่อ','อื่นๆ','ยังไม่ทราบ'];
const evidence=['ยืนยันจากโพสต์','ลูกค้าแจ้ง','รอยืนยัน','ยังไม่ทราบ'];
let records=[],events=[],selected='',filter='all',serial=0,loaded=false;
const q=s=>document.querySelector(s),safe=v=>esc(v),check=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const money=n=>n===null||n===undefined?'—':Number(n).toLocaleString('th-TH',{maximumFractionDigits:2});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const due=l=>l.next_followup&&l.next_followup<=today()&&!['ปิดการขายสำเร็จ','ไม่สนใจ'].includes(l.status);
const confirmed=l=>['ยืนยันจากโพสต์','ลูกค้าแจ้ง'].includes(l.attribution);
function scopeUnits(){return KC.demo?BUS.flatMap((b,i)=>(b.units.length?b.units:['ระดับ BU']).map((name,j)=>({id:`demo-${i}-${j}`,bu_id:i,name}))):KC.units();}
function unitFor(t){return scopeUnits().find(u=>u.bu_id===t.bu&&u.name===t.unit);}
function match(l){const u=scopeUnits().find(u=>u.id===l.unit_id);return u&&(bu==='all'||u.bu_id===Number(bu))&&(unit==='all'||u.name===unit)&&(!query||[l.customer,l.product,l.need,l.owner,l.contact].join(' ').toLowerCase().includes(query.toLowerCase()));}
async function all(table){let rows=[];for(let from=0;;from+=500){const batch=check(await KC.api().from(table).select('*').order('id').range(from,from+499));rows.push(...batch);if(batch.length<500)return rows;}}
async function load(){
 if(KC.demo){if(loaded)return;const saved=localStorage.getItem('kc-leads-demo-v1');if(saved){const state=JSON.parse(saved);records=state.records;events=state.events;}else{
 const pool=tasks.find(t=>t.id==='demo-pool'),u=pool&&unitFor(pool);
 records=u?['A','B','C','D','E','F'].map((name,i)=>({id:'demo-lead-'+i,unit_id:u.id,content_id:pool.id,customer:'ลูกค้าตัวอย่าง '+name,contact:'',product:'พูลวิลล่า',need:['บ้านพัก 8 คน','ขอราคา 2 คืน','จอง 1 คืน','พักกับครอบครัว','ที่พักทีมงาน','สอบถามพิกัด'][i],source:i%2?'Facebook Organic':'Facebook Ads',attribution:'ลูกค้าแจ้ง',received_on:today(),status:['รอติดตาม','เสนอราคาแล้ว','ปิดการขายสำเร็จ','ปิดการขายสำเร็จ','เสนอราคาแล้ว','ใหม่'][i],owner:'ทีมบ้านโฮม',next_followup:i<2?today():null,sale_value:i===2||i===3?12000:null,consent:'ไม่ทราบ',version:1,created_at:new Date().toISOString(),deleted_at:null})):[];events=[];
 }loaded=true;return;}
 records=await all('leads');events=[];loaded=true;
}
function saveDemo(){localStorage.setItem('kc-leads-demo-v1',JSON.stringify({records,events}));}
function reset(){records=[];events=[];loaded=false;selected='';serial++;}
function pick(id){selected=id;go('results');}
function options(list,value){return list.map(s=>`<option value="${safe(s)}" ${s===value?'selected':''}>${safe(s)}</option>`).join('');}
function stats(t,list){
 const verified=list.filter(confirmed),won=verified.filter(l=>l.status==='ปิดการขายสำเร็จ'),qualified=verified.filter(l=>['สนใจ','เสนอราคาแล้ว','ปิดการขายสำเร็จ'].includes(l.status));
 const paid=verified.filter(l=>l.source.endsWith(' Ads')),a=t.ads||{},sales=won.filter(l=>l.sale_value!==null),sum=sales.reduce((s,l)=>s+Number(l.sale_value),0);
 return `${renderOrganic([t])}<p class="form-hint">ผลโฆษณา (Ads) แยกจากยอดทั่วไปด้านบน</p><div class="stats">${[['ยอดดู',a.views,'ครั้ง'],['คอมเมนต์',a.comments,'ครั้ง'],['ตอบกลับ',a.replies,'ตามยอดที่กรอก · อาจมาจากคนเดิม'],['ลูกค้าที่เชื่อม',list.length,'โอกาสขาย · ยืนยันที่มา '+verified.length]].map(([label,n,note])=>`<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${money(n)}</div><div class="stat-note">${note}</div></div>`).join('')}</div>
 <div class="lead-analysis"><section class="panel"><h2>ลูกค้าที่ยืนยันที่มา</h2><p class="form-hint">สถานะปัจจุบัน · ไม่รวมที่มายังไม่ทราบหรือรอยืนยัน</p>${[['ลูกค้าทั้งหมด',verified.length],['สนใจ / เสนอราคา / จอง',qualified.length],['ปิดการขาย',won.length]].map(([label,n])=>`<div class="lead-step"><span>${label}</span><div class="progress-track"><div class="progress-fill" style="width:${verified.length?n/verified.length*100:0}%"></div></div><b>${n}</b></div>`).join('')}<p>อัตราปิดการขาย <b>${verified.length?money(won.length/verified.length*100)+'%':'—'}</b></p></section>
 <section class="panel"><p class="form-hint">ยอดปิดการขายที่ยืนยันที่มาและกรอกมูลค่าแล้ว</p><div class="lead-money">${sales.length?'฿'+money(sum):'—'}</div><p>ค่าแอด ÷ ลูกค้าจากแอด <b>${paid.length&&a.spent!==null&&a.spent!==undefined?'฿'+money(a.spent/paid.length):'—'}</b></p><p class="form-hint">${won.length-sales.length} รายยังไม่ระบุมูลค่า · ไม่ใช่กำไรหรือหลักฐานว่าเกิดจากแอดทั้งหมด</p><small>ยอดสะสมตามโพสต์ · อัปเดต ${safe(a.updated||'ยังไม่ระบุ')}</small></section></div>`;
}
async function renderPage(content){
 const token=++serial;q('#view').innerHTML='<section class="panel">กำลังโหลดผลตอบรับ…</section>';
 try{await load();if(token!==serial||!['results','leads'].includes(view))return;
 const visible=content;if(view==='results'&&!visible.some(t=>t.id===selected))selected=visible[0]?.id||'';
 const t=tasks.find(t=>t.id===selected),isResults=view==='results';
 const list=records.filter(l=>isResults?l.content_id===selected:match(l));
 const active=list.filter(l=>!l.deleted_at);
 const shown=list.filter(l=>filter==='trash'?!!l.deleted_at:!l.deleted_at&&(filter==='due'?due(l):filter==='won'?l.status==='ปิดการขายสำเร็จ':true));
 q('#view').innerHTML=`<div class="lead-controls"><label class="field">${isResults?'เลือกคอนเทนต์':'แสดงลูกค้า'}${isResults?`<select id="lead-content">${visible.map(t=>`<option value="${safe(t.id)}" ${t.id===selected?'selected':''}>${safe(t.title)}</option>`).join('')}</select>`:'ทุกคอนเทนต์และที่มายังไม่ทราบ ตามตัวกรอง BU ด้านบน'}</label><button id="lead-create" class="primary" ${scopeUnits().length?'':'disabled'}>＋ บันทึกลูกค้า${isResults?'จากโพสต์นี้':''}</button></div>
 ${isResults&&t?`<section class="lead-post panel"><div class="lead-cover">${cover(t)}</div><div><div class="eyebrow">${safe(contentScope(t))} / ${safe(t.unit)}</div><h2>${safe(t.title)}</h2><p>${safe(t.channel)} · ${safe(t.campaign||'ยังไม่ระบุแคมเปญ')}</p><small>${t.sample?'ข้อมูลตัวอย่าง · ':''}ผลสะสมของคอนเทนต์นี้</small></div><button id="lead-edit-post" class="secondary">อัปเดตยอดโพสต์</button></section>${stats(t,active)}`:isResults?'<section class="panel">ยังไม่มีคอนเทนต์ในมุมมองนี้ สร้างคอนเทนต์ก่อน หรือบันทึกลูกค้าโดยยังไม่ผูกโพสต์ได้</section>':''}
 <section class="panel"><div class="section-head"><h2>ผลตอบรับและการติดตาม</h2><small>${active.length} โอกาสขาย · ต้องติดตาม ${active.filter(due).length} ราย</small></div><div class="segmented lead-filters">${[['all','ทั้งหมด'],['due','ครบกำหนด / เกินกำหนด'],['won','ปิดการขาย'],['trash','ถังขยะลูกค้า']].map(([k,label])=>`<button data-lead-filter="${k}" class="${filter===k?'active':''}">${label}</button>`).join('')}</div><div class="lead-list">${shown.map(l=>{const post=tasks.find(t=>t.id===l.content_id);return `<div class="lead-row"><div><b>${safe(l.customer)}</b><small>${safe(l.source)} · ${safe(l.attribution)}</small></div><div>${safe(l.need||l.product||'ยังไม่ระบุความต้องการ')}<small>${safe(post?.title||(l.content_id?'คอนเทนต์ถูกย้ายลงถังขยะ':'ยังไม่ผูกคอนเทนต์'))}</small></div><div><span class="lead-status ${due(l)?'lead-due':''}">${safe(l.status)}</span><small>${l.next_followup?'นัด '+formatDate(l.next_followup,true):safe(l.owner||'ยังไม่มอบหมาย')}</small></div><button class="secondary" data-lead-id="${safe(l.id)}">${l.deleted_at?'ดู / กู้คืน':'ดู / ติดตาม'}</button></div>`;}).join('')||'<p class="form-hint">ยังไม่มีลูกค้าในรายการนี้</p>'}</div></section>`;
 if(isResults&&q('#lead-content'))q('#lead-content').onchange=e=>{selected=e.target.value;render();};
 if(q('#lead-edit-post'))q('#lead-edit-post').onclick=()=>openEditor(selected);
 bindCards();
 q('#lead-create').onclick=()=>edit(null,isResults?t:null);
 document.querySelectorAll('[data-lead-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.leadFilter;render();});
 document.querySelectorAll('[data-lead-id]').forEach(b=>b.onclick=()=>detail(b.dataset.leadId));
 }catch(e){if(token===serial)q('#view').innerHTML=`<section class="panel" role="alert">โหลดลูกค้าไม่สำเร็จ: ${safe(e.message)} <button id="lead-retry" class="secondary">ลองใหม่</button></section>`;if(q('#lead-retry'))q('#lead-retry').onclick=()=>render();}
}
function dialog(title,body){let d=q('#lead-dialog');if(!d){d=document.createElement('dialog');d.id='lead-dialog';document.body.append(d);}d.innerHTML=`<div class="dialog-head"><h2>${safe(title)}</h2><button class="icon-button" id="lead-close" aria-label="ปิด">×</button></div><div class="lead-dialog-body">${body}</div>`;q('#lead-close').onclick=()=>d.close();if(!d.open)d.showModal();return d;}
function lock(form,on){form.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=on);q('#lead-close').disabled=on;q('#lead-dialog').oncancel=e=>{if(on)e.preventDefault();};}
async function edit(existing,post=null){
 const l=existing||{},units=scopeUnits(),uid=l.unit_id||(post&&unitFor(post)?.id)||units[0]?.id;
 const input=(name,label,value,type='text',required=false,max=300)=>`<label class="field">${label}<input name="${name}" type="${type}" value="${safe(value||'')}" ${required?'required':''} maxlength="${max}"></label>`;
 const d=dialog(existing?'แก้ไขข้อมูลลูกค้า':'บันทึกลูกค้าใหม่',`<form id="lead-form"><div class="form-grid">${input('customer','ชื่อลูกค้า / บริษัท *',l.customer,'text',true,140)}${input('contact','เบอร์ / LINE / อีเมล',l.contact)}<label class="field">ธุรกิจย่อย / สาขา<select name="unit_id" ${existing?'disabled':''}>${units.map(u=>`<option value="${safe(u.id)}" ${u.id===uid?'selected':''}>${safe(BUS[u.bu_id].short+' · '+u.name)}</option>`).join('')}</select></label><label class="field">คอนเทนต์ที่มา<select name="content_id"></select></label>${input('product','สินค้า / บริการที่สนใจ',l.product,'text',false,200)}${input('received_on','วันที่รับลูกค้า *',l.received_on||today(),'date',true)}<label class="field">ช่องทางที่มา<select name="source">${options(sources,l.source||'ยังไม่ทราบ')}</select></label><label class="field">การยืนยันที่มา<select name="attribution">${options(evidence,l.attribution||'ยังไม่ทราบ')}</select></label>${input('owner','ผู้รับผิดชอบ',l.owner,'text',false,100)}<label class="field">ยินยอมให้ติดต่อ<select name="consent">${options(['ยินยอม','ไม่ยินยอม','ไม่ทราบ'],l.consent||'ไม่ทราบ')}</select></label></div><label class="field">ความต้องการลูกค้า<textarea name="need" maxlength="8000" rows="3">${safe(l.need||'')}</textarea></label><p class="form-hint">1 รายการ = 1 โอกาสขาย · ตรวจชื่อและช่องทางติดต่อซ้ำก่อนเพิ่มรายการ</p><p id="lead-error" role="alert"></p><button class="primary">บันทึกข้อมูลลูกค้า</button></form>`);
 const f=q('#lead-form'),field=n=>f.elements.namedItem(n);
 function fill(){const chosen=l.content_id||post?.id||'';field('content_id').innerHTML='<option value="">ยังไม่ทราบ / ยังไม่ผูกคอนเทนต์</option>'+tasks.filter(t=>unitFor(t)?.id===field('unit_id').value).map(t=>`<option value="${safe(t.id)}" ${chosen===t.id?'selected':''}>${safe(t.title)}</option>`).join('');if(existing?.content_id&&!tasks.some(t=>t.id===existing.content_id))field('content_id').insertAdjacentHTML('beforeend',`<option value="${safe(existing.content_id)}" selected>คอนเทนต์เดิมในถังขยะ</option>`);}
 fill();field('unit_id').onchange=fill;
 f.onsubmit=async e=>{e.preventDefault();const payload={};for(const name of ['customer','contact','unit_id','content_id','product','received_on','source','attribution','owner','consent','need'])payload[name]=field(name).value.trim();payload.content_id=payload.content_id||null;
 if(!payload.customer){q('#lead-error').textContent='กรอกชื่อลูกค้า';return;}if(!payload.content_id&&payload.attribution!=='ยังไม่ทราบ'){q('#lead-error').textContent='เลือกคอนเทนต์ หรือระบุที่มาเป็นยังไม่ทราบ';return;}
 if(!existing&&records.some(r=>!r.deleted_at&&r.unit_id===payload.unit_id&&((payload.contact&&r.contact===payload.contact)||r.customer===payload.customer))&&!f.dataset.duplicate){q('#lead-error').textContent='พบชื่อหรือช่องทางติดต่อซ้ำ ตรวจสอบก่อน หากเป็นโอกาสขายใหม่ให้กดบันทึกอีกครั้ง';f.dataset.duplicate='checked';return;}
 lock(f,true);try{
 if(KC.demo){if(existing)Object.assign(existing,payload,{version:existing.version+1});else records.push({...payload,id:crypto.randomUUID(),status:'ใหม่',version:1,sale_value:null,next_followup:null,created_at:new Date().toISOString()});saveDemo();}
 else{if(existing){delete payload.unit_id;const saved=check(await KC.api().from('leads').update(payload).eq('id',existing.id).eq('version',existing.version).is('deleted_at',null).select().maybeSingle());if(!saved)throw Error('มีคนแก้ข้อมูลนี้แล้ว กรุณาปิดและโหลดข้อมูลล่าสุด');}else check(await KC.api().from('leads').insert(payload).select().single());}
 d.close();render();toast('บันทึกข้อมูลลูกค้าแล้ว');}catch(err){q('#lead-error').textContent=err.message;}finally{lock(f,false);if(existing)field('unit_id').disabled=true;}
 };
}
async function detail(id){
 const l=records.find(r=>r.id===id);if(!l)return;
 const d=dialog(l.customer,'<p>กำลังโหลดประวัติ…</p>');
 try{
 const log=KC.demo?events.filter(e=>e.lead_id===id):check(await KC.api().from('lead_followups').select('*').eq('lead_id',id).order('created_at',{ascending:false}));
 const post=tasks.find(t=>t.id===l.content_id);
 q('.lead-dialog-body').innerHTML=`<div class="lead-detail-meta"><p>${safe(l.product)} · ${safe(l.need)}</p><p>ติดต่อ: ${safe(l.contact||'ยังไม่ระบุ')} · ${safe(l.consent)}</p><p>ที่มา: ${safe(l.source)} · ${safe(l.attribution)}<br>${safe(post?.title||(l.content_id?'คอนเทนต์ในถังขยะ':'ยังไม่ผูกคอนเทนต์'))}</p><small>ผู้ดูแล ${safe(l.owner||'ยังไม่มอบหมาย')} · รับลูกค้า ${formatDate(l.received_on,true)}</small></div><div class="lead-controls"><button class="secondary" id="lead-edit" ${l.deleted_at?'disabled':''}>แก้ไขข้อมูลลูกค้า</button><button class="secondary" id="lead-trash">${l.deleted_at?'กู้คืนลูกค้า':'ย้ายลงถังขยะ'}</button></div><h3>ประวัติติดตาม</h3><div class="lead-timeline">${log.map(e=>`<article><small>${new Date(e.created_at).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})} · ${safe(e.status)}</small><p>${safe(e.note)}</p>${e.next_followup?`<small>นัดถัดไป ${formatDate(e.next_followup,true)}</small>`:''}</article>`).join('')||'<p class="form-hint">ยังไม่มีการติดตาม บันทึกครั้งแรกด้านล่างได้เลย</p>'}</div>
 ${l.deleted_at?'<p>ข้อมูลอยู่ในถังขยะ กู้คืนก่อนบันทึกการติดตาม</p>':`<form id="followup-form"><div class="form-grid"><label class="field">สถานะล่าสุด<select name="status">${options(statuses,l.status)}</select></label><label class="field">นัดติดตามถัดไป<input name="next" type="date" value="${safe(l.next_followup||'')}"></label><label class="field">มูลค่าปิดการขาย (บาท)<input name="value" type="number" min="0" max="999999999999.99" step="0.01" placeholder="เว้นว่างเมื่อยังไม่ทราบ" value="${l.sale_value===null?'':safe(l.sale_value)}"></label></div><label class="field">ผลการติดตามครั้งนี้ *<textarea name="note" required maxlength="8000" rows="3"></textarea></label><p class="form-hint">เพิ่มเป็นบันทึกใหม่ เก็บประวัติเดิมไว้</p><p id="followup-error" role="alert"></p><button class="primary">บันทึกการติดตาม</button></form>`}<p id="lead-action-error" role="alert"></p>`;
 q('#lead-edit').onclick=()=>edit(l);q('#lead-trash').onclick=async()=>{q('#lead-trash').disabled=true;try{
 if(KC.demo){l.deleted_at=l.deleted_at?null:new Date().toISOString();l.version++;saveDemo();}else{const r=check(await KC.api().from('leads').update({deleted_at:l.deleted_at?null:new Date().toISOString()}).eq('id',id).eq('version',l.version).select().maybeSingle());if(!r)throw Error('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาโหลดใหม่');}
 d.close();render();toast(l.deleted_at?'ย้ายลงถังขยะแล้ว':'บันทึกการเปลี่ยนสถานะถังขยะแล้ว');}catch(e){q('#lead-action-error').textContent=e.message;q('#lead-trash').disabled=false;}};
 const f=q('#followup-form');if(f){const field=n=>f.elements.namedItem(n);const change=()=>field('value').disabled=field('status').value!=='ปิดการขายสำเร็จ';field('status').onchange=change;change();
 f.onsubmit=async e=>{e.preventDefault();const note=field('note').value.trim();if(!note){q('#followup-error').textContent='กรอกผลการติดตาม';return;}const status=field('status').value,next=field('next').value||null,value=status==='ปิดการขายสำเร็จ'&&field('value').value!==''?Number(field('value').value):null;lock(f,true);
 try{if(KC.demo){Object.assign(l,{status,next_followup:next,sale_value:value,version:l.version+1});events.unshift({id:crypto.randomUUID(),lead_id:id,note,status,next_followup:next,sale_value:value,created_at:new Date().toISOString()});saveDemo();}else check(await KC.api().rpc('record_lead_followup',{p_id:id,p_version:l.version,p_note:note,p_status:status,p_next:next,p_value:value}));d.close();render();toast('บันทึกผลติดตามและประวัติแล้ว');}catch(err){q('#followup-error').textContent=err.message;}finally{lock(f,false);change();}
 };}
 }catch(e){q('.lead-dialog-body').textContent=e.message;}
}
return {render:renderPage,pick,reset,stats};
})();
