const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module'),{JSDOM}=require('jsdom');
let source=fs.readFileSync('supabase/functions/manage-accounts/index.ts','utf8').replace(/^import .*;\n/,'').replace('export async function','async function');
source=stripTypeScriptTypes(source)+'\nthis.handle=handle;';
const ctx={Response,Request,Deno:{serve(){}},createClient:()=>{},console};vm.createContext(ctx);vm.runInContext(source,ctx);
function mock(role='admin',change=false){
 const calls=[];const member={role,active:true,must_change_password:change};
 const caller={auth:{getUser:async()=>({data:{user:{id:'admin-id'}}}),updateUser:async b=>{calls.push(['password',b]);return {};}},
 from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:member})};return q;},
 rpc:async(n,b)=>{calls.push([n,b]);return {};}};
 const admin={auth:{admin:{createUser:async b=>{calls.push(['create',b]);return {data:{user:{id:'new-id'}}};},updateUserById:async(id,b)=>{calls.push(['password',id,b]);return {};},deleteUser:async()=>{calls.push(['cleanup']);return {};}}},rpc:caller.rpc};
 return {calls,client:(_,key)=>key==='service'?admin:caller,env:k=>k==='SUPABASE_SERVICE_ROLE_KEY'?'service':'public'};
}
const request=(body,auth=true)=>new Request('https://example.invalid',{method:'POST',headers:auth?{Authorization:'Bearer test'}:{},body:JSON.stringify(body)});
(async()=>{
 const body={action:'create',username:'Jaja.MKT',display_name:'Jaja',password:'test-only-password12',role:'marketing'};
 let m=mock();assert.equal((await ctx.handle(request(body,false),m.client,m.env)).status,401);assert.equal(m.calls.length,0);
 m=mock('branch');assert.equal((await ctx.handle(request(body),m.client,m.env)).status,403);assert.equal(m.calls.length,0);
 m=mock('admin',true);assert.equal((await ctx.handle(request(body),m.client,m.env)).status,403);assert.equal(m.calls.length,0);
 m=mock();assert.equal((await ctx.handle(request({...body,password:'short'}),m.client,m.env)).status,400);assert.equal(m.calls.length,0);
 m=mock();const result=await ctx.handle(request(body),m.client,m.env);assert.equal(result.status,200);const payload=await result.json();assert.equal(payload.username,'jaja.mkt');assert.ok(!JSON.stringify(payload).includes(body.password));assert.equal(m.calls[0][1].email,'jaja.mkt@users.kc.invalid');assert.equal(m.calls[0][1].email_confirm,true);assert.equal(m.calls[1][0],'provision_managed_member');assert.ok(!JSON.stringify(m.calls[1]).includes(body.password));
 m=mock('marketing',true);assert.equal((await ctx.handle(request({action:'change-initial',password:'new-test-password12'}),m.client,m.env)).status,200);assert.equal(m.calls[0][0],'password');assert.equal(m.calls[0][1],'admin-id');assert.equal(m.calls[1][0],'complete_initial_password');
 const dom=new JSDOM('<div id="cloud-panel-body"></div><button id="close-cloud-panel"></button>',{runScripts:'outside-only'}),w=dom.window;w.eval("const BUS=[{short:'KC'}];const esc=x=>String(x);const toast=()=>{};"+fs.readFileSync('public/accounts.js','utf8')+"\nthis.accounts=ManagedAccounts;");
 w.document.querySelector('#cloud-panel-body').innerHTML=w.accounts.markup([{id:'unit',bu_id:0,name:'Branch'}]);
 let sent;w.accounts.bind({functions:{invoke:async(n,b)=>{sent=b.body;return {data:{ok:true}};}}},async()=>{});
 const f=w.document.querySelector('form');f.elements.namedItem('username').value='jaja';f.elements.namedItem('display_name').value='Jaja';f.elements.namedItem('password').value='temporary-pass12';f.elements.namedItem('password_confirm').value='different';f.dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(sent,undefined);
 f.elements.namedItem('password_confirm').value='temporary-pass12';f.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,20));assert.equal(sent.username,'jaja');assert.equal(f.elements.namedItem('password').value,'');dom.window.close();
 console.log('PASS: endpoint auth/admin guards, password policy, username normalization, password exclusion from responses/audit, change gate flow, form confirmation and clearing.');
})().catch(e=>{console.error(e);process.exitCode=1;});
