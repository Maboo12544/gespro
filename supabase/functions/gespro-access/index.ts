// Authenticated account provisioning. Actor always comes from verified Auth user.
Deno.serve(async (req: Request) => {
 const reply=(status:number,error?:string)=>Response.json(error?{error}:{ok:true},{status,headers:{'Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply(405,'Method not allowed');
 const authorization=req.headers.get('Authorization')||'';
 if(!authorization.startsWith('Bearer '))return reply(401,'Konekte ankò.');
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 let createdId:string|null=null;
 try{
  const userResponse=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization}});
  if(!userResponse.ok)return reply(401,'Konekte ankò.');
  const user=await userResponse.json() as {id?:string};if(!user.id)return reply(401,'Konekte ankò.');
  const raw=await req.text();if(raw.length>8192)return reply(413,'Demann twò gwo.');
  const body=JSON.parse(raw);if(!body||typeof body!=='object')return reply(400,'Demann pa valab.');
  const {operation,data}=body;
  if(!['create_bank','create_pos','create_member','update_member'].includes(operation)||!data||typeof data!=='object'||Array.isArray(data))return reply(400,'Demann pa valab.');
  const rpc=(op:string,payload:unknown)=>fetch(url+'/rest/v1/rpc/gespro_manage_access',{method:'POST',headers,body:JSON.stringify({actor:user.id,operation:op,data:payload})});
  if(operation==='create_member'){
   if(typeof data.username!=='string'||!/^[a-z0-9][a-z0-9._-]{2,31}$/i.test(data.username)||typeof data.password!=='string'||data.password.length<12||data.password.length>128)return reply(400,'Non itilizatè oswa modpas pa valab. Modpas: 12–128 karaktè.');
   const allowed=await rpc('check_member',{bank_id:data.bank_id,role:data.role,pos_ids:data.pos_ids});if(!allowed.ok)return reply(403,'Dwa oswa afektasyon sa a pa otorize.');
   const created=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({email:data.username.toLowerCase()+'@login.gespro.lol',password:data.password,email_confirm:true})});
   if(!created.ok)return reply(409,'Kont la pa kreye. Verifye non itilizatè a ak modpas la.');
   const profile=await created.json() as {id:string};createdId=profile.id;
   if(!createdId)throw Error('Missing user');
   const {password:ignored,...safe}=data;
   const saved=await rpc('create_member',{...safe,user_id:createdId});
   if(!saved.ok){await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(createdId),{method:'DELETE',headers});createdId=null;return reply(403,'Kont la pa aktive: verifye dwa ak afektasyon yo.');}
   createdId=null;
  }else{
   const saved=await rpc(operation,data);if(!saved.ok)return reply(403,'Aksyon refize. Verifye dwa, non ak afektasyon yo.');
  }
  return reply(200);
 }catch{
  // Never remove an identity after an ambiguous commit: it might have been saved.
  return reply(503,'Sèvis la pa disponib. Rafrechi lis la anvan ou eseye ankò.');
 }
});
