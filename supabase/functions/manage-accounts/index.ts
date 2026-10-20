import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const headers = {"Access-Control-Allow-Origin":"https://kc-marketing-studio.vercel.app","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers});
export async function handle(req:Request,makeClient=createClient,env=(key:string)=>Deno.env.get(key)) {
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,{error:"Method not allowed"});
 const token=req.headers.get("Authorization")||"";
 if(!token.startsWith("Bearer "))return reply(401,{error:"กรุณาเข้าสู่ระบบ"});
 try{
  const url=env("SUPABASE_URL")!,anon=env("SUPABASE_ANON_KEY")!,secret=env("SUPABASE_SERVICE_ROLE_KEY")!;
  const caller=makeClient(url,anon,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
  const verified=await caller.auth.getUser(token.slice(7));
  if(verified.error||!verified.data.user)return reply(401,{error:"กรุณาเข้าสู่ระบบใหม่"});
  const uid=verified.data.user.id;
  const profile=await caller.from("members").select("role,active,must_change_password").eq("user_id",uid).maybeSingle();
  const member=profile.data;
  if(profile.error||!member?.active)return reply(403,{error:"บัญชีนี้ยังไม่มีสิทธิ์"});
  if(Number(req.headers.get("content-length")||0)>8192)return reply(413,{error:"ข้อมูลมากเกินไป"});
  const raw=await req.text();if(raw.length>8192)return reply(413,{error:"ข้อมูลมากเกินไป"});
  const body=JSON.parse(raw);
  if(typeof body.password!=="string"||body.password.length<12||body.password.length>72||!/[a-zA-Z]/.test(body.password)||!/[0-9]/.test(body.password))return reply(400,{error:"รหัสผ่านต้องมี 12–72 ตัวอักษร และมีทั้งตัวอักษรกับตัวเลข"});
  const admin=makeClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  if(body.action==="change-initial"){
   if(!member.must_change_password)return reply(400,{error:"บัญชีนี้ไม่อยู่ในขั้นตอนเปลี่ยนรหัสผ่านเริ่มต้น"});
   // Auth rejects reusing the current password. No password is stored in profiles/logs.
   const changed=await admin.auth.admin.updateUserById(uid,{password:body.password});
   if(changed.error)return reply(400,{error:"เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง"});
   const completed=await admin.rpc("complete_initial_password",{target:uid});
   if(completed.error)return reply(500,{error:"เปลี่ยนรหัสผ่านแล้ว แต่ยังเปิดสิทธิ์ไม่สำเร็จ กรุณาติดต่อผู้ดูแล"});
   return reply(200,{ok:true});
  }
  if(body.action!=="create"||member.role!=="admin"||member.must_change_password)return reply(403,{error:"เฉพาะผู้ดูแลระบบเท่านั้น"});
  const username=String(body.username||"").trim().toLowerCase(),name=String(body.display_name||"").trim(),role=body.role;
  if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)||!name||name.length>200||!["admin","marketing","branch"].includes(role))return reply(400,{error:"ตรวจสอบชื่อผู้ใช้ ชื่อทีม และหน้าที่"});
  if(role==="branch"){
   const u=await caller.from("units").select("id").eq("id",body.unit_id).maybeSingle();
   if(u.error||!u.data)return reply(400,{error:"เลือกสาขาที่ถูกต้อง"});
  }
  const created=await admin.auth.admin.createUser({email:username+"@users.kc.invalid",password:body.password,email_confirm:true,user_metadata:{display_name:name},app_metadata:{managed_by:uid}});
  if(created.error||!created.data.user)return reply(400,{error:"สร้างบัญชีไม่สำเร็จ ชื่อผู้ใช้อาจมีอยู่แล้ว กรุณาเลือกชื่อใหม่"});
  const id=created.data.user.id;
  const provisioned=await caller.rpc("provision_managed_member",{target:id,login_name:username,full_name:name,assigned_role:role,assigned_unit:role==="branch"?body.unit_id:null});
  if(provisioned.error){
   // Remove only the just-created Auth user if profile creation failed.
   // No existing account is changed; repeated requests never reset passwords.
   await admin.auth.admin.deleteUser(id);
   return reply(500,{error:"สร้างสิทธิ์ไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแล"});
  }
  return reply(200,{ok:true,username});
 }catch{return reply(400,{error:"ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่"});}
}
Deno.serve(req=>handle(req));
