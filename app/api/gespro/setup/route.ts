import { authConfig, validOrigin } from "@/lib/gespro-auth";
export async function POST(request: Request) {
  const reply=(status:number,error:string)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});
  if(!validOrigin(request))return reply(403,"Demann sa a pa otorize.");
  try {
    const raw=await request.text();
    if(raw.length>8192)return reply(400,"Demann sa a pa valab.");
    const {token,password}=JSON.parse(raw);
    if(typeof token!=="string"||token.length>100||typeof password!=="string"||password.length<12||password.length>128)return reply(400,"Modpas la dwe genyen ant 12 ak 128 karaktè.");
    const {url,key}=authConfig();
    const response=await fetch(`${url}/functions/v1/gespro-setup`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({token,password}),cache:"no-store"});
    const body:unknown=await response.json();
      const responseError=body && typeof body==="object" && "error" in body && typeof body.error==="string" ? body.error : null;
    return Response.json(response.ok?{ok:true}:{error:responseError||"Aktivasyon an pa disponib."},{status:response.status,headers:{"Cache-Control":"no-store"}});
  }catch{return reply(503,"Aktivasyon an pa disponib. Eseye ankò.");}
}
