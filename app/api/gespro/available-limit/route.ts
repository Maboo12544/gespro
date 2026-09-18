import {cookies} from "next/headers";
import {currentAccess,sessionCookie,authConfig} from "@/lib/gespro-auth";
const headers={"Cache-Control":"no-store"};
export async function GET(request:Request){
 const access=await currentAccess();if(!access)return Response.json({error:"Konekte ankò."},{status:401,headers});
 const token=(await cookies()).get(sessionCookie)?.value;if(!token)return Response.json({error:"Konekte ankò."},{status:401,headers});
 const p=new URL(request.url).searchParams,posId=p.get("posId"),lottery=p.get("lottery"),number=p.get("number"),type=p.get("type");
 if(!posId||!lottery||!number||!type)return Response.json({available:null},{headers});
 const {url,key}=authConfig();const r=await fetch(url+"/rest/v1/rpc/gespro_available_test_limit",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({target_pos:posId,target_lottery:lottery,target_number:number,target_type:type}),cache:"no-store"});
 if(!r.ok)return Response.json({available:null},{headers});
 const available=await r.json();return Response.json({available:typeof available==="number"?available:null},{headers});
}