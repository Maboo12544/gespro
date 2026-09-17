Deno.serve(async (req: Request) => {
 const reply=(status:number,error?:string)=>Response.json(error?{error}:{ok:true},{status});
 if(req.method!=="POST") return reply(405,"Method not allowed");
 if(Number(req.headers.get("content-length")||0)>8192) return reply(413,"Invalid request");
 let body;try{const raw=await req.text();if(raw.length>8192)return reply(413,"Invalid request");body=JSON.parse(raw);}catch{return reply(400,"Invalid request");}
 const {token,password}=body;
 if(typeof token!=="string"||token.length>100||typeof password!=="string"||password.length<12||password.length>128)return reply(400,"Modpas la dwe genyen ant 12 ak 128 karaktè.");
 const url=Deno.env.get("SUPABASE_URL")!, key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const headers={apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"};
 const rpc=async(name:string,data:unknown)=>fetch(url+"/rest/v1/rpc/"+name,{method:"POST",headers,body:JSON.stringify(data)});
 try{
 const allowed=await rpc("gespro_bootstrap_allowed",{token});
 if(!allowed.ok||await allowed.json()!==true)return reply(403,"Lyen sa a ekspire oswa li deja sèvi.");
 const created=await fetch(url+"/auth/v1/admin/users",{method:"POST",headers,body:JSON.stringify({email:"gespro123@login.gespro.lol",password,email_confirm:true})});
 if(!created.ok)return reply(400,"Nou pa kapab kreye kont lan. Verifye modpas la epi eseye ankò.");
 const user=await created.json();
 const saved=await rpc("gespro_finish_bootstrap",{token,target_user:user.id});
 if(!saved.ok){
 await fetch(url+"/auth/v1/admin/users/"+encodeURIComponent(user.id),{method:"DELETE",headers});
 return reply(409,"Lyen sa a pa disponib ankò.");
 }
 return reply(200);
 }catch{return reply(503,"Sèvis la pa disponib. Eseye ankò.");}
});
