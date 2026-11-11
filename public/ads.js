'use strict';
const ORGANIC_FIELDS=[['views','ยอดดู'],['replies','ตอบกลับ'],['comments','คอมเมนต์'],['clicks','คลิก']];
const ORGANIC_REACH_FIELDS=[ORGANIC_FIELDS[0],['viewers','ผู้ชม','คน']];
const ORGANIC_ENGAGEMENT_FIELDS=[['reactions','ความรู้สึก'],ORGANIC_FIELDS[3],ORGANIC_FIELDS[2],['shares','แชร์']];
const ORGANIC_EDITOR_FIELDS=[...ORGANIC_REACH_FIELDS,...ORGANIC_ENGAGEMENT_FIELDS,ORGANIC_FIELDS[1]];
function organicInputs(fields){return fields.map(([k,label,unit='ครั้ง'])=>`<label class="field">${label} (${unit})<input name="organic_${k}" type="number" min="0" max="999999999999" step="1" placeholder="ยังไม่รายงาน"></label>`).join('');}
function updateOrganicEngagement(){const values=ORGANIC_ENGAGEMENT_FIELDS.map(([k])=>field('organic_'+k).valueAsNumber);document.querySelector('#organic-editor-engagement').textContent=adFormat(values.every(adNumber)?values.reduce((sum,n)=>sum+n,0):null);}
function setupOrganicEditor(){
 const section=document.createElement('section');section.className='ad-editor';
 section.innerHTML=`<h3>ผลตอบรับทั่วไป · ไม่เสียค่าโฆษณา</h3><p class="form-hint">กรอกได้แม้ไม่ยิง Ads · ใช้ยอด Organic จากช่องทางของคอนเทนต์นี้เท่านั้น ไม่รวมยอดโฆษณา หากแยกยอดไม่ได้ให้เว้นว่างเพื่อไม่ให้นับซ้ำ</p><label class="field">ข้อมูลทั่วไปสะสมถึงวันที่<input name="organicUpdated" type="date"></label><div class="form-grid">${organicInputs(ORGANIC_REACH_FIELDS)}</div><h4>การมีส่วนร่วม</h4><div class="form-grid">${organicInputs(ORGANIC_ENGAGEMENT_FIELDS)}</div><p class="editor-note">Engagement: <output id="organic-editor-engagement" aria-live="polite">—</output> · ความรู้สึก + คลิก + คอมเมนต์ + แชร์</p><p class="form-hint">กรอกครบ 4 ช่องเพื่อแสดงยอดรวม หากวัดแล้วไม่มีให้กรอก 0</p><div class="form-grid">${organicInputs([ORGANIC_FIELDS[1]])}</div><p class="form-hint">เว้นว่าง = ยังไม่รายงาน · 0 = วัดแล้วไม่มีผลตอบรับ</p>`;
 document.querySelector('.editor-main').append(section);
 ORGANIC_ENGAGEMENT_FIELDS.forEach(([k])=>field('organic_'+k).addEventListener('input',updateOrganicEngagement));
}
function loadOrganicForm(t){field('organicUpdated').value=t?.organic?.updated||'';ORGANIC_EDITOR_FIELDS.forEach(([k])=>field('organic_'+k).value=t?.organic?.[k]??'');updateOrganicEngagement();}
function readOrganicForm(){return {updated:field('organicUpdated').value,...Object.fromEntries(ORGANIC_EDITOR_FIELDS.map(([k])=>[k,field('organic_'+k).value===''?null:Number(field('organic_'+k).value)]))};}
function resultDetails(id,label,body){
 const open=document.getElementById(id)?.open?' open':'';
 return `<details class="result-details" id="${id}"${open}><summary>${label}</summary><div class="result-details-body">${body}</div></details>`;
}
function renderOrganicDetails(data){
 return resultDetails('organic-post-details',`ผล Organic รายโพสต์ · ${data.length} รายการ`,`<div class="ad-table-wrap"><table class="organic-table"><thead><tr><th>คอนเทนต์ / ข้อมูลถึง</th>${ORGANIC_FIELDS.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${data.map(t=>`<tr><td><button data-edit="${esc(t.id)}">${esc(t.title)}</button><small>${esc(t.organic?.updated||'ยังไม่รายงาน')}</small></td>${ORGANIC_FIELDS.map(([k])=>`<td>${adFormat(t.organic?.[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
}
function renderOrganic(data,showDetails=true){
 const totals=k=>{const values=data.map(t=>t.organic?.[k]).filter(adNumber);return values.length?values.reduce((a,b)=>a+b,0):null;};
 return `<section class="panel organic-results"><h2>ผลตอบรับทั่วไป · Organic</h2><p class="form-hint">รวมคอนเทนต์ที่ไม่ยิงแอดด้วย · แสดงตาม BU ที่เกี่ยวข้อง · งานร่วมหลาย BU นับครั้งเดียวในภาพรวม · “—” ยังไม่รายงาน</p><div class="organic-stats">${ORGANIC_FIELDS.map(([k,label])=>`<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${adFormat(totals(k))}</div><div class="stat-note">ครั้ง · ไม่รวม Ads</div></div>`).join('')}</div>${showDetails?renderOrganicDetails(data):''}</section>`;
}
const AD_FIELDS=[['approved','งบอนุมัติ (บาท)','0.01'],['spent','ใช้จริง (บาท)','0.01'],['views','ยอดดู (ครั้ง)','1'],['replies','การตอบกลับ (ครั้ง)','1'],['comments','คอมเมนต์ (ครั้ง)','1'],['clicks','คลิก (ครั้ง)','1']];
const DEMO_ADS={
 'demo-pool':{enabled:true,phase:'กำลังยิง',approved:5000,spent:1850,views:24500,replies:37,comments:52,clicks:286,updated:'2026-10-19'},
 'demo-fuel':{enabled:true,phase:'กำลังยิง',approved:3000,spent:866.70,views:18200,replies:24,comments:61,clicks:194,updated:'2026-10-19'},
 'demo-solar':{enabled:true,phase:'กำลังยิง',approved:6000,spent:2400,views:16800,replies:30,comments:28,clicks:215,updated:'2026-10-19'},
 'demo-resort':{enabled:true,phase:'จบแล้ว',approved:4000,spent:3250,views:31200,replies:65,comments:84,clicks:420,updated:'2026-10-19'},
 'demo-material':{enabled:true,phase:'วางแผน',approved:2000,spent:null,views:null,replies:null,comments:null,clicks:null,updated:''}
};
function adDefaults(t){return {...t,ads:t.ads??(t.sample&&DEMO_ADS[t.id]?{...DEMO_ADS[t.id]}:{enabled:false,phase:'วางแผน',approved:null,spent:null,views:null,replies:null,comments:null,clicks:null,updated:''})};}
const adNumber=v=>typeof v==='number'&&Number.isFinite(v);
const adFormat=(v,money=false)=>adNumber(v)?(money?'฿':'')+v.toLocaleString('th-TH',{maximumFractionDigits:2,minimumFractionDigits:money?2:0}):'—';
function adTotal(rows,key){const values=rows.map(t=>t.ads[key]).filter(adNumber);return values.length?values.reduce((a,b)=>a+b,0):null;}
function adCost(a){return adNumber(a.spent)&&adNumber(a.replies)&&a.replies>0?a.spent/a.replies:null;}
let adPeriodMode='all',adCustomPeriod;
function adDateValid(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function adMonthPeriod(today,offset=0){
 const [year,month]=today.split('-').map(Number);
 const start=new Date(Date.UTC(year,month-1+offset,1));
 const end=new Date(Date.UTC(year,month+offset,0));
 return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
}
function adRunPeriod(a,today){
 const from=a.startDate;
 const end=a.endDate||(a.phase==='กำลังยิง'?today:'');
 if(!adDateValid(from)||!adDateValid(end)||end<from||from>today)return null;
 return {from,to:end>today?today:end};
}
function adPeriodText(a){
 const start=adDateValid(a.startDate)?formatDate(a.startDate,true):'';
 const end=adDateValid(a.endDate)?formatDate(a.endDate,true):'';
 if(start&&end)return start+' – '+end;
 if(start)return 'เริ่มยิง '+start;
 if(end)return 'สิ้นสุด '+end;
 return 'ยังไม่ระบุช่วงยิง';
}
function adPeriodControls(period){
 const options=[['all','ทุกช่วงเวลา'],['this-month','เดือนนี้'],['last-month','เดือนที่แล้ว'],['custom','กำหนดช่วงเอง']];
 return `<form id="ad-period-filter" class="ad-period-filter"><label>ช่วงยิง Ads <select name="period">${options.map(([value,label])=>`<option value="${value}" ${adPeriodMode===value?'selected':''}>${label}</option>`).join('')}</select></label>${adPeriodMode==='custom'?`<label>ตั้งแต่ <input type="date" name="from" value="${period.from}" required></label><label>ถึง <input type="date" name="to" value="${period.to}" required></label><button class="secondary" type="submit">ใช้ช่วงวันที่</button>`:''}</form>`;
}
function bindAdPeriod(today){
 const controls=$('#ad-period-filter'),fields=controls.elements;
 fields.period.onchange=()=>{
  adPeriodMode=fields.period.value;
  if(adPeriodMode==='custom')adCustomPeriod??=adMonthPeriod(today);
  render();
 };
 controls.onsubmit=e=>{
  e.preventDefault();
  if(adPeriodMode!=='custom')return;
  const from=fields.from.value,to=fields.to.value;
  if(!adDateValid(from)||!adDateValid(to)||from>to){
   fields.to.setCustomValidity('เลือกวันสิ้นสุดให้ตรงกับหรือหลังวันเริ่มต้น');
   fields.to.reportValidity();
   return;
  }
  adCustomPeriod={from,to};
  render();
 };
 if(adPeriodMode==='custom')for(const input of [fields.from,fields.to])input.oninput=()=>fields.to.setCustomValidity('');
}
function renderAds(data,followup=''){
 const today=calendarToday();
 const period=adPeriodMode==='all'?null:adPeriodMode==='custom'?adCustomPeriod:adMonthPeriod(today,adPeriodMode==='last-month'?-1:0);
 const ads=data.filter(t=>t.ads?.enabled);
 const started=ads.filter(t=>['กำลังยิง','จบแล้ว'].includes(t.ads.phase)&&(!adDateValid(t.ads.startDate)||t.ads.startDate<=today));
 const undated=started.filter(t=>!adRunPeriod(t.ads,today)).length;
 const rows=period?started.filter(t=>{
  const run=adRunPeriod(t.ads,today);
  return run&&run.from<=period.to&&run.to>=period.from;
 }):ads;
 const counted=period?rows:started;const approved=adTotal(rows,'approved'),spent=adTotal(rows,'spent');const complete=rows.filter(t=>t.ads.phase!=='วางแผน');const cost=complete.length&&complete.every(t=>adNumber(t.ads.spent)&&adNumber(t.ads.replies))&&adTotal(complete,'replies')>0?adTotal(complete,'spent')/adTotal(complete,'replies'):null;
const stats=[['งบอนุมัติ',approved,true],['ใช้จริง',spent,true],['ยอดดู',adTotal(rows,'views'),false],['การตอบกลับ',adTotal(rows,'replies'),false],['คอมเมนต์',adTotal(rows,'comments'),false],['คลิก',adTotal(rows,'clicks'),false]];
$('#view').innerHTML=`<div class="ad-dashboard">${renderOrganic(data,false)}<div class="ad-banner"><div><strong>ภาพรวมโฆษณา · Ads</strong><p>กรอกผลโฆษณาของแต่ละคอนเทนต์ แล้วดูภาพรวมแยกตาม BU</p></div><span class="prototype">${typeof KC!=='undefined'&&!KC.demo?'ข้อมูลบันทึกโดยทีม':'ตัวเลขเริ่มต้นเป็นข้อมูลสมมติ'}</span></div>${adPeriodControls(period)}<p class="ad-period-count"><strong>${uniqueContents(counted).length} คอนเทนต์ · ${counted.length} โพสต์ Ads ที่เริ่มยิง</strong>${period?` <span>ช่วง ${formatDate(period.from,true)} – ${formatDate(period.to,true)}</span>`:''}</p><div class="ad-stats">${stats.map(([label,value,money])=>`<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${adFormat(value,money)}</div><div class="stat-note">${money?'บาท':'ครั้ง · ไม่ใช่คนไม่ซ้ำ'}</div></div>`).join('')}</div><div class="ad-summary"><span>ต้นทุนต่อการตอบกลับ <strong>${adFormat(cost,true)}</strong></span><span>คำนวณเฉพาะงานที่เริ่มยิงและมีข้อมูลครบ</span></div><p class="ad-hint">ยอดรวมตามที่กรอกของโพสต์ที่เข้าเงื่อนไข · โพสต์ที่ยิงข้ามช่วงยังใช้ยอดสะสมทั้งโพสต์ · “—” = ยังไม่รายงาน${period&&undated?` · มี ${undated} โพสต์ที่ช่วงยิงไม่ครบ ดูได้ใน “ทุกช่วงเวลา”`:''}</p><div class="lower-grid"><section class="panel"><h2>งบใช้จริง เทียบงบอนุมัติ · ตาม BU เจ้าของงาน</h2>${BUS.map((b,i)=>{const group=rows.filter(t=>t.bu===i);if(!group.length)return '';const a=adTotal(group,'approved'),s=adTotal(group,'spent');const width=adNumber(a)&&a>0&&adNumber(s)?Math.min(100,s/a*100):0;return `<div class="progress-item"><div class="progress-text"><span>${b.name}</span><span>${adFormat(s,true)} / ${adFormat(a,true)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${width}%;${adNumber(a)&&adNumber(s)&&s>a?'background:#c87958':''}"></div></div>${adNumber(a)&&adNumber(s)&&s>a?'<small class="over-budget">เกินงบ '+adFormat(s-a,true)+'</small>':''}</div>`;}).join('')||'<p class="stat-note">ยังไม่มีรายการโฆษณา</p>'}</section><section class="panel"><h2>ยอดดูแยกตามช่องทาง</h2>${[...new Set(rows.map(t=>t.channel))].map(ch=>{const n=adTotal(rows.filter(t=>t.channel===ch),'views'),total=adTotal(rows,'views');return `<div class="progress-item"><div class="progress-text"><span>${esc(ch)}</span><span>${adFormat(n)} ครั้ง</span></div><div class="progress-track"><div class="progress-fill" style="width:${adNumber(n)&&total>0?n/total*100:0}%"></div></div></div>`;}).join('')||'<p class="stat-note">ยังไม่มีข้อมูลช่องทาง</p>'}</section></div>${resultDetails('ad-post-details',`ผล Ads รายโพสต์ · ${rows.length} รายการ`,rows.length?`<p class="ad-hint">กดชื่อโพสต์เพื่อกรอกหรือแก้ไขยอด</p><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>คอนเทนต์ / ช่องทาง</th><th>สถานะ Ads</th><th>งบอนุมัติ</th><th>ใช้จริง</th><th>ยอดดู</th><th>ตอบกลับ</th><th>คอมเมนต์</th><th>คลิก</th><th>บาท/ตอบกลับ</th></tr></thead><tbody>${rows.map(t=>`<tr><td><button data-edit="${esc(t.id)}">${esc(t.title)}</button><small>${esc(BUS[t.bu].short)} · ${esc(t.channel)}${t.sample?' · ตัวอย่าง':''}</small><small>${adPeriodText(t.ads)}</small></td><td><span class="status">${esc(t.ads.phase)}</span></td>${AD_FIELDS.map(([key])=>`<td>${adFormat(t.ads[key],['approved','spent'].includes(key))}</td>`).join('')}<td>${adFormat(adCost(t.ads),true)}</td></tr>`).join('')}</tbody></table></div>`:empty(period?'ไม่มีโพสต์ Ads ที่ยิงในช่วงนี้':'ยังไม่มีคอนเทนต์ที่เปิดการยิงโฆษณา'))}${renderOrganicDetails(data)}${followup?resultDetails('ad-followup-details','รายการติดตามผลหลังโพสต์',followup):''}</div>`;
 bindAdPeriod(today);
}
function setupAdsEditor(){setupOrganicEditor();const section=document.createElement('section');section.className='ad-editor';section.innerHTML=`<h3>งบและผลโฆษณา</h3><label class="ad-toggle"><input name="adEnabled" type="checkbox"> ยิง Ads ให้คอนเทนต์นี้</label><div id="ad-fields"><div class="form-grid"><label class="field">สถานะโฆษณา<select name="adPhase"><option>วางแผน</option><option>กำลังยิง</option><option>จบแล้ว</option></select></label><label class="field">วันที่เริ่มยิง<input type="date" name="adStartDate"></label><label class="field">วันที่สิ้นสุด<input type="date" name="adEndDate"></label></div><p class="form-hint">แอดที่กำลังยิงเว้นวันที่สิ้นสุดได้</p><div class="form-grid">${AD_FIELDS.map(([key,label,step])=>`<label class="field">${label}<input name="ad_${key}" type="number" min="0" max="999999999999" step="${step}" placeholder="ยังไม่รายงาน" inputmode="${step==='1'?'numeric':'decimal'}"></label>`).join('')}</div><p class="form-hint">กรอกผล Ads ของช่องทางที่เลือกด้านขวาเท่านั้น ไม่รวมยอด Organic · เว้นว่างเมื่อยังไม่ทราบ และใส่ 0 เมื่อวัดแล้วไม่มีผลลัพธ์</p><div id="ad-live-summary" class="editor-note" aria-live="polite"></div></div>`;$('.editor-main').append(section);field('adEnabled').onchange=updateAdsForm;for(const name of ['adStartDate','adEndDate'])field(name).oninput=syncAdDateValidation;AD_FIELDS.forEach(([k])=>field('ad_'+k).addEventListener('input',updateAdLive));}
function updateAdsForm(){const enabled=field('adEnabled').checked;$('#ad-fields').hidden=!enabled;$('#ad-fields').querySelectorAll('input,select').forEach(el=>el.disabled=!enabled);syncAdDateValidation();updateAdLive();}
function syncAdDateValidation(){
 const start=field('adStartDate'),end=field('adEndDate');
 const invalid=!end.disabled&&end.value&&(!start.value||end.value<start.value);
 end.setCustomValidity(invalid?'เลือกวันที่เริ่มยิง และระบุวันสิ้นสุดตรงกับหรือหลังวันเริ่มยิง':'');
}
function numberFromField(key){const value=field('ad_'+key).value;return value===''?null:Number(value);}
function updateAdLive(){const approved=numberFromField('approved'),spent=numberFromField('spent'),replies=numberFromField('replies');$('#ad-live-summary').textContent=(adNumber(approved)&&adNumber(spent)?(approved>=spent?'งบคงเหลือ '+adFormat(approved-spent,true):'เกินงบ '+adFormat(spent-approved,true)):'งบคงเหลือ —')+' · ต้นทุนต่อการตอบกลับ '+adFormat(adCost({spent,replies}),true);}
function loadAdsForm(task){const a=task?.ads||{enabled:false,phase:'วางแผน'};field('adEnabled').checked=!!a.enabled;field('adPhase').value=a.phase;field('adStartDate').value=a.startDate||'';field('adEndDate').value=a.endDate||'';AD_FIELDS.forEach(([k])=>field('ad_'+k).value=a[k]??'');updateAdsForm();loadOrganicForm(task);}
function readAdsForm(previous){
 const enabled=field('adEnabled').checked;
 const metrics=Object.fromEntries(AD_FIELDS.map(([key])=>[key,numberFromField(key)]));
 const changed=enabled&&['views','replies','comments','clicks','spent'].some(key=>metrics[key]!== (previous?.[key]??null));
 return {...previous,...metrics,enabled,phase:field('adPhase').value,startDate:field('adStartDate').value,endDate:field('adEndDate').value,updated:changed?calendarToday():previous?.updated||''};
}
