import {cookies} from "next/headers";
import {currentAdmin,sessionCookie,authConfig} from "@/lib/gespro-auth";
const headers={"Cache-Control":"no-store"};
export async function GET(){
 const admin=await currentAdmin();if(!admin)return Response.json({error:"Aksè refize."},{status:403,headers});
 const token=(await cookies()).get(sessionCookie)?.value;if(!token)return Response.json({error:"Konekte ankò."},{status:401,headers});
 const {url,key}=authConfig();
 const r=await fetch(url+"/rest/v1/gespro_schedule_change_log?select=id,lottery_id,lottery_name,old_draw_time,new_draw_time,old_cutoff_time,new_cutoff_time,provider,detected_at,acknowledged_at&order=detected_at.desc&limit=50",{headers:{apikey:key,Authorization:"Bearer "+token},cache:"no-store"});
 if(!r.ok)return Response.json({error:"Nou pa ka chaje avi orè yo."},{status:503,headers});
 const notifications=await r.json();
 return Response.json({notifications,unread:notifications.filter((n:{acknowledged_at?:string|null})=>!n.acknowledged_at).length},{headers});
}
