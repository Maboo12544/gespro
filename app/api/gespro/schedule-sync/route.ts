import {authConfig} from "@/lib/gespro-auth";
const headers={"Cache-Control":"no-store"};
function cutoff(draw:string){const m=/^(\d{2}):(\d{2})(?::\d{2})?$/.exec(draw);if(!m)return null;const total=(Number(m[1])*60+Number(m[2])-8+1440)%1440;return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0")+":00"}
export async function POST(request:Request){
 if(process.env.LOTTERY_SCHEDULE_AUTO_SYNC!=="true")return Response.json({mode:"test-manual",updated:false},{headers});
 const secret=process.env.LOTTERY_SCHEDULE_SYNC_SECRET;if(!secret||request.headers.get("authorization")!=="Bearer "+secret)return Response.json({error:"Aksè refize."},{status:403,headers});
 const body=await request.json().catch(()=>null) as {lotteryId?:string;lotteryName?:string;drawTime?:string;oldDrawTime?:string|null}|null;
 if(!body?.lotteryId||!body.lotteryName||!body.drawTime)return Response.json({error:"Orè a pa valab."},{status:400,headers});
 const newCutoff=cutoff(body.drawTime);if(!newCutoff)return Response.json({error:"Lè tiraj la pa valab."},{status:400,headers});
 const oldCutoff=body.oldDrawTime?cutoff(body.oldDrawTime):null;if(body.oldDrawTime===body.drawTime)return Response.json({updated:false,newCutoff},{headers});
 const {url,key}=authConfig();
 const r=await fetch(url+"/rest/v1/rpc/gespro_apply_schedule_change",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({target_lottery:body.lotteryId,target_lottery_name:body.lotteryName,old_draw:body.oldDrawTime||null,new_draw:body.drawTime,target_zone:"America/New_York"}),cache:"no-store"});
 if(!r.ok)return Response.json({error:"Chanjman orè a pa ka anrejistre."},{status:503,headers});
 return Response.json({updated:true,newDrawTime:body.drawTime,newCutoff},{headers});
}
