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
 const dom=new JSDOM(fs.readFileSync('public/index.html','utf8'),{url:'https://kc.test/?demo=1#content',runScripts:'outside-only'});
 try{
  const w=dom.window,d=w.document,q=s=>d.querySelector(s);
  w.structuredClone=structuredClone;
  w.indexedDB=indexedDB;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.eval(['ads.js','planner.js','home.js','app.js'].map(f=>fs.readFileSync('public/'+f,'utf8')).join('\n')+'\nwindow.run=code=>eval(code);');
  await waitFor(()=>q('.content-card'));
  const form=q('#task-form'),field=name=>form.elements.namedItem(name);
  const submit=async()=>{
   form.dispatchEvent(new w.Event('submit',{cancelable:true}));
   await waitFor(()=>!q('#editor').open||q('#form-error').textContent);
   assert.equal(q('#form-error').textContent,'');
  };
  const branch=name=>q('[name="relatedBranch"][value="'+name+'"]');
  const choose=(name,value)=>{field(name).value=value;field(name).dispatchEvent(new w.Event('change',{bubbles:true}));};

  q('#add-task').click();
  field('title').value='โปรหลายสาขา';
  field('campaign').value='โปรหน้าหนาว';
  field('caption').value='แคปชันเฟซบุ๊ก';
  field('postUrl').value='https://example.com/facebook';
  const date=w.run('calendarToday()');
  field('date').value=date;
  field('organic_views').value='8';
  q('[name="relatedBu"][value="1"]').click();
  branch('สาขายางตลาด').click();
  branch('สาขากระนวน').click();
  await submit();
  const original=w.run("tasks.find(t=>t.title==='โปรหลายสาขา')");
  assert.equal(original.relatedUnits,'สาขายางตลาด; สาขากระนวน');

  const open=id=>w.run('openEditor('+JSON.stringify(id)+')');
  open(original.id);
  q('#planner-channel').click();
  assert.equal(field('channel').value,'TikTok');
  assert.equal(field('date').value,date);
  assert.equal(field('campaign').value,'โปรหน้าหนาว');
  assert.equal(field('postUrl').value,'');
  assert.equal(field('organic_views').value,'');
  assert.equal(branch('สาขากระนวน').checked,true);
  assert.equal(branch('สาขากระนวน').disabled,true);
  field('caption').value='แคปชันติ๊กต็อก';
  field('postUrl').value='https://example.com/tiktok';
  field('organic_views').value='3';
  await submit();

  const posts=w.run("tasks.filter(t=>t.title==='โปรหลายสาขา')");
  assert.equal(posts.length,2);
  assert.equal(posts[0].contentCode,posts[1].contentCode);
  assert.notEqual(posts[0].postCode,posts[1].postCode);
  assert.deepEqual(Array.from(posts,t=>t.organic.views).sort(),[3,8]);
  assert.equal(posts.find(t=>t.channel==='TikTok').postUrl,'https://example.com/tiktok');
  assert.equal(posts.find(t=>t.channel==='Facebook').caption,'แคปชันเฟซบุ๊ก');

  w.run("selectBu('1');unit='สาขากระนวน';render();go('calendar')");
  assert.equal([...d.querySelectorAll('.calendar-event')].filter(e=>e.textContent.includes('โปรหลายสาขา')).length,2);
  w.run("go('overview')");
  assert.match(q('.home-content .home-panel-head p').textContent,/1 คอนเทนต์ · 2 โพสต์/);
  w.run("unit='สาขาวานรนิวาส'");
  assert.equal(w.run("filtered().filter(t=>t.title==='โปรหลายสาขา').length"),0);

  open(original.id);
  q('[name="wholeBu"][value="1"]').click();
  assert.equal(branch('สาขากระนวน').disabled,true);
  await submit();
  w.run("selectBu('1');unit='สาขาวานรนิวาส'");
  assert.equal(w.run("filtered().filter(t=>t.title==='โปรหลายสาขา').length"),2);
  assert.equal(w.run("matchesBranch({bu:1,unit:'สาขายางตลาด',relatedUnits:'กระนวน; หมายเหตุเดิม'},1,'สาขากระนวน')"),true);
  console.log('PASS: branch scope, same-day channels, independent metrics, calendar, and unique overview counts.');
 }finally{dom.window.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
