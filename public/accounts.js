'use strict';
const ManagedAccounts=(()=>{
 const q=s=>document.querySelector(s);
 async function invoke(client,body){
  const r=await client.functions.invoke('manage-accounts',{body});
  if(r.error){let message='ทำรายการไม่สำเร็จ กรุณาลองใหม่';try{message=(await r.error.context.json()).error||message;}catch{}throw Error(message);}
  if(!r.data?.ok)throw Error(r.data?.error||'ทำรายการไม่สำเร็จ');
  return r.data;
 }
 function markup(units){return `<details class="account-create"><summary>＋ เพิ่มบัญชีให้ทีม</summary><p>ตั้งชื่อผู้ใช้และรหัสผ่านเริ่มต้น แล้วส่งให้เจ้าของบัญชีโดยตรง ผู้ใช้ต้องเปลี่ยนรหัสผ่านก่อนเริ่มงาน ไม่ส่งอีเมลยืนยัน</p><form id="create-account" autocomplete="off"><div class="form-grid"><label class="field">ชื่อที่ใช้ในทีม<input name="display_name" required maxlength="200"></label><label class="field">ชื่อผู้ใช้<input name="username" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,31}" placeholder="เช่น jaja.mkt" autocapitalize="none" spellcheck="false"></label><label class="field">รหัสผ่านเริ่มต้น<input name="password" type="password" required minlength="12" maxlength="72" autocomplete="new-password"></label><label class="field">ยืนยันรหัสผ่านเริ่มต้น<input name="password_confirm" type="password" required minlength="12" maxlength="72" autocomplete="new-password"></label><label class="field">หน้าที่<select name="role"><option value="marketing">ทีมการตลาด</option><option value="branch">ประจำสาขา</option><option value="admin">ผู้ดูแลระบบ</option></select></label><label class="field">สาขา<select name="unit_id"><option value="">เลือกเมื่อเป็นบัญชีประจำสาขา</option>${units.map(u=>`<option value="${esc(u.id)}">${esc(BUS[u.bu_id].short+' · '+u.name)}</option>`).join('')}</select></label></div><p class="form-hint">ชื่อผู้ใช้: a–z ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3–32 ตัว · รหัสผ่าน: 12–72 ตัว มีตัวอักษรและตัวเลข</p><p id="create-account-message" role="status"></p><button class="primary">สร้างบัญชี</button></form></details>`;}
 function bind(client,refresh){
  const form=q('#create-account');if(!form)return;
  form.onsubmit=async e=>{e.preventDefault();const f=n=>form.elements.namedItem(n),message=q('#create-account-message');
   if(f('password').value!==f('password_confirm').value){message.textContent='รหัสผ่านทั้งสองช่องไม่ตรงกัน';return;}
   if(f('role').value==='branch'&&!f('unit_id').value){message.textContent='เลือกสาขาก่อนสร้างบัญชี';return;}
   const body={action:'create',display_name:f('display_name').value.trim(),username:f('username').value.trim().toLowerCase(),password:f('password').value,role:f('role').value,unit_id:f('unit_id').value||null};
   form.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);q('#close-cloud-panel').disabled=true;
   try{await invoke(client,body);f('password').value='';f('password_confirm').value='';await refresh();toast('สร้างบัญชี '+body.username+' แล้ว · ส่งรหัสเริ่มต้นให้เจ้าของบัญชีโดยตรง');}
   catch(err){message.textContent=err.message;}
   finally{body.password='';form.querySelectorAll('input,select,button').forEach(x=>x.disabled=false);q('#close-cloud-panel').disabled=false;}
  };
 }
 async function changeInitial(client,enter){
  q('.app').hidden=true;q('#auth-screen').hidden=true;
  let section=q('#initial-password');if(!section){section=document.createElement('section');section.id='initial-password';section.className='auth-screen';document.body.append(section);}
  section.hidden=false;section.innerHTML='<div class="auth-card"><h1>ตั้งรหัสผ่านของคุณ</h1><p>เปลี่ยนรหัสผ่านเริ่มต้นที่ผู้ดูแลให้มา ก่อนเข้าถึงข้อมูลงาน</p><form id="initial-password-form"><label class="field">รหัสผ่านใหม่<input name="password" type="password" required minlength="12" maxlength="72" autocomplete="new-password"></label><label class="field">ยืนยันรหัสผ่านใหม่<input name="confirm" type="password" required minlength="12" maxlength="72" autocomplete="new-password"></label><p class="form-hint">12–72 ตัวอักษร มีทั้งตัวอักษรและตัวเลข ต้องไม่ซ้ำรหัสเริ่มต้น</p><p id="initial-password-message" role="status"></p><button class="primary">บันทึกรหัสผ่านใหม่</button></form><button class="secondary" id="initial-signout">ออกจากระบบ</button></div>';
  q('#initial-signout').onclick=async()=>{await client.auth.signOut();section.hidden=true;q('#auth-screen').hidden=false;};
  q('#initial-password-form').onsubmit=async e=>{e.preventDefault();const f=e.target,p=f.elements.namedItem('password'),c=f.elements.namedItem('confirm'),msg=q('#initial-password-message');
   if(p.value!==c.value){msg.textContent='รหัสผ่านไม่ตรงกัน';return;}
   section.querySelectorAll('button,input').forEach(x=>x.disabled=true);
   try{await invoke(client,{action:'change-initial',password:p.value});p.value='';c.value='';section.hidden=true;await enter();}
   catch(err){msg.textContent=err.message;}
   finally{section.querySelectorAll('button,input').forEach(x=>x.disabled=false);}
  };
 }
 return {markup,bind,changeInitial};
})();
