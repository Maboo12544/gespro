import {cookies} from "next/headers";
import {currentAdmin,sessionCookie,authConfig,validOrigin} from "@/lib/gespro-auth";
const headers={"Cache-Control":"no-store"};
export async function POST(request:Request){
 if(!validOrigin(request))return Response.json({error:"Demann pa otorize."},{status:403,headers});
 const admin=await currentAdmin();if(!admin)return Response.json({error:"Aksè refize."},{status:403,headers});
 const token=(await cookies()).get(sessionCookie)?.value;if(!token)return Response.json({error:"Konekte ankò."},{status:401,headers});
 const body=await request.json().catch(()=>null) as {bankId?:string;lotteryId?:string;enabled?:boolean}|null;
 if(!body?.bankId||!body.lotteryId||typeof body.enabled!=="boolean")return Response.json({error:"Konfigirasyon pa valab."},{status:400,headers});
 const {url,key}=authConfig();const r=await fetch(url+"/rest/v1/rpc/gespro_set_test_open_override",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({target_bank:body.bankId,target_lottery:body.lotteryId,enabled:body.enabled}),cache:"no-store"});
 if(!r.ok)return Response.json({error:"Test Open pa ka modifye."},{status:503,headers});
 return Response.json({ok:true,enabled:body.enabled},{headers});
}