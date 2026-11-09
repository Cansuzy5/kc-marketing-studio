const {JSDOM}=require('jsdom');
const {indexedDB}=require('fake-indexeddb');
const fs=require('node:fs');
const assert=require('node:assert/strict');

async function waitFor(check){
 for(let i=0;i<100;i++){
  if(check())return;
  await new Promise(resolve=>setTimeout(resolve,10));
 }
 throw Error('Timed out');
}
(async()=>{
 const w=new JSDOM(fs.readFileSync('public/index.html','utf8'),{url:'https://kc.test/?demo=1#ads',runScripts:'outside-only'}).window;
 try{
  const d=w.document,q=s=>d.querySelector(s);
  w.structuredClone=structuredClone;
  w.indexedDB=indexedDB;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.eval(['ads.js','app.js'].map(f=>fs.readFileSync('public/'+f,'utf8')).join('\n')+'\nwindow.run=code=>eval(code);');
  await waitFor(()=>q('#ad-period-filter'));
  w.run(`calendarToday=()=> '2026-11-09';
   tasks=[
    ['first','shared','Facebook','จบแล้ว','2026-10-30','2026-11-01',10],
    ['second','shared','TikTok','กำลังยิง','2026-11-01','',20],
    ['old','old','Facebook','จบแล้ว','','',30],
    ['planned','planned','TikTok','วางแผน','2026-11-02','2026-11-05',40]
   ].map(([id,contentCode,channel,phase,startDate,endDate,views])=>({id,contentCode,channel,title:id,date:'2026-11-01',bu:0,unit:BUS[0].units[0],files:[],status:3,organic:{views:1},ads:{enabled:true,phase,startDate,endDate,views,spent:views,replies:1,updated:'2026-10-19'}}));
   render();
  `);
  const counts=()=>q('.ad-period-count strong').textContent;
  const views=()=>q('.ad-stats .stat:nth-child(3) .stat-value').textContent;
  const period=mode=>{const select=q('#ad-period-filter select');select.value=mode;select.dispatchEvent(new w.Event('change',{bubbles:true}));};
  assert.match(counts(),/2 คอนเทนต์ · 3 โพสต์/);
  period('this-month');
  assert.match(counts(),/1 คอนเทนต์ · 2 โพสต์/);
  assert.equal(views(),'30');
  assert.match(q('.ad-dashboard > .ad-hint').textContent,/มี 1 โพสต์ที่ช่วงยิงไม่ครบ/);
  assert.equal(q('.organic-stats .stat-value').textContent,'4');
  assert.equal(q('#ad-post-details').open,false);
  period('last-month');
  assert.match(counts(),/1 คอนเทนต์ · 1 โพสต์/);
  assert.equal(views(),'10');
  period('custom');
  let filter=q('#ad-period-filter');
  filter.elements.from.value='2026-11-02';filter.elements.to.value='2026-11-01';
  filter.dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(filter.elements.to.checkValidity(),false);
  filter.elements.to.value='2026-11-09';
  filter.elements.to.dispatchEvent(new w.Event('input',{bubbles:true}));
  filter.dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.match(counts(),/1 คอนเทนต์ · 1 โพสต์/);
  assert.equal(views(),'20');
  assert.equal(w.run("adMonthPeriod('2024-03-01',-1).to"),'2024-02-29');

  w.run("openEditor('first')");
  const form=q('#task-form'),fields=form.elements;
  assert.equal(fields.adStartDate.value,'2026-10-30');
  assert.equal(fields.adEndDate.value,'2026-11-01');
  assert.equal(fields.namedItem('adUpdated'),null);
  fields.adEndDate.value='2026-10-29';
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(fields.adEndDate.checkValidity(),false);
  assert.equal(q('#editor').open,true);
  fields.adEndDate.value='2026-11-02';
  form.dispatchEvent(new w.Event('submit',{cancelable:true}));
  await waitFor(()=>!q('#editor').open);
  const saved=w.run("tasks.find(t=>t.id==='first').ads");
  assert.equal(saved.endDate,'2026-11-02');
  assert.equal(saved.views,10);
  assert.equal(saved.updated,'2026-10-19');
  assert.equal(views(),'30');
  console.log('PASS: overlap by date, unique content count, legacy posts, planning, date presets, validation and saving.');
 }finally{w.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
