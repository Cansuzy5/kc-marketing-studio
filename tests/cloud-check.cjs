const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=['cloud.js','ads.js','app.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const wait=async test=>{for(let i=0;i<150;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out');};
function boot(mode){
 const dom=new JSDOM(html,{url:'https://kc-test.example',runScripts:'outside-only'}),w=dom.window;let writes=0,conflict=false;
 w.structuredClone=structuredClone;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const u={id:'unit-a',bu_id:0,name:'วัสดุก่อสร้าง'},member={user_id:'user-a',display_name:'Member',email:'test@example.invalid',role:mode==='pending'?'pending':'branch',active:mode!=='pending'};
 const row={id:'record-a',unit_id:u.id,version:1,deleted_at:null,payload:{title:'Cloud work',date:'2026-10-20',status:0,owner:'Team',channel:'Facebook',campaign:'',caption:'',files:[]}};
 const client={auth:{onAuthStateChange(){},async getSession(){return {data:{session:mode==='signedout'?null:{}}};},async getUser(){return {data:{user:{id:'user-a'}}};}},from(table){let op='select',body,single=false;const query={select(){return query;},eq(){return query;},is(){return query;},order(){return query;},maybeSingle(){single=true;return query;},single(){single=true;return query;},insert(b){op='insert';body=b;return query;},update(b){op='update';body=b;return query;},then(resolve){let data;if(table==='members')data=member;else if(table==='units')data=[u];else if(op==='select')data=[row];else{writes++;data=conflict?null:{...row,...body,version:row.version+1};}return Promise.resolve({data,error:null}).then(resolve);}};return query;}};
 w.supabase={createClient:()=>client};w.eval(script);return {dom,w,conflict:()=>{conflict=true;},writes:()=>writes};
}
(async()=>{
 for(const mode of ['signedout','pending']){const x=boot(mode);await wait(()=>!x.w.document.querySelector('#auth-message').textContent.includes('กำลังเชื่อมต่อ'));assert.equal(x.w.document.querySelector('.app').hidden,true);assert.equal(x.w.document.querySelector('#view').textContent,'');assert.equal(x.writes(),0);x.dom.window.close();}
 const x=boot('active'),d=x.w.document;await wait(()=>!d.querySelector('.app').hidden);assert.equal(d.querySelector('#history-btn').hidden,true);assert.equal(d.querySelector('#members-btn').hidden,true);
 d.querySelector('[data-view="content"]').click();assert.equal(d.querySelectorAll('.content-card').length,1);d.querySelector('.content-card').click();assert.equal(d.querySelector('#task-form').elements.unit.options[1].disabled,true);
 x.conflict();d.querySelector('#task-form').elements.title.value='Conflicting edit';d.querySelector('#task-form').dispatchEvent(new x.w.Event('submit',{cancelable:true}));await wait(()=>d.querySelector('#form-error').textContent.includes('คนอื่น'));assert.equal(d.querySelector('#editor').open,true);assert.equal(x.writes(),1);assert.ok(d.querySelector('.content-card').textContent.includes('Cloud work'));x.dom.window.close();
 console.log('PASS: unauthenticated and pending gates; no sample data exposure; scoped editor; conflict keeps unsaved work and original record.');
})().catch(e=>{console.error(e);process.exitCode=1;});
