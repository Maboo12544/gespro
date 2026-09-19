import {NextRequest} from "next/server";
const ids=["lottery-0","lottery-1","lottery-2","lottery-3","lottery-4","lottery-5","lottery-6","lottery-7"];
export async function POST(request:NextRequest){
 const origin=request.nextUrl.origin,secret=process.env.LOTTERY_SCHEDULE_SYNC_SECRET;
 if(!secret||request.headers.get("authorization")!=="Bearer "+secret)return Response.json({error:"Aksè refize."},{status:403});
 const results=await Promise.all(ids.map(async lotteryId=>{try{const r=await fetch(origin+"/api/gespro/lottery-result?lotteryId="+encodeURIComponent(lotteryId),{cache:"no-store"});const b=await r.json() as {drawTime?:string;nextDrawDate?:string;error?:string};return {lotteryId,ok:r.ok,drawTime:b.drawTime,nextDrawDate:b.nextDrawDate,error:b.error}}catch{return {lotteryId,ok:false,error:"network"}}}));
 return Response.json({results});
}