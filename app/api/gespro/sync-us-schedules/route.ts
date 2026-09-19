import {NextRequest} from "next/server";
import {currentAdmin} from "@/lib/gespro-auth";
const ids=["lottery-0","lottery-1","lottery-2","lottery-3","lottery-4","lottery-5","lottery-6","lottery-7"];
export async function POST(request:NextRequest){
 const admin=await currentAdmin();if(!admin)return Response.json({error:"Aksè refize."},{status:403});
 const origin=request.nextUrl.origin;
 const results=await Promise.all(ids.map(async lotteryId=>{try{const r=await fetch(origin+"/api/gespro/lottery-result?lotteryId="+encodeURIComponent(lotteryId),{cache:"no-store"});const b=await r.json() as {drawTime?:string;nextDrawDate?:string;gameName?:string;schedule?:{saved?:boolean;drawTime?:string;closingTime?:string;error?:string};error?:string};return {lotteryId,name:b.gameName||lotteryId,ok:r.ok&&b.schedule?.saved===true,drawTime:b.schedule?.drawTime||b.drawTime,closingTime:b.schedule?.closingTime,nextDrawDate:b.nextDrawDate,error:b.error||b.schedule?.error}}catch{return {lotteryId,ok:false,error:"network"}}}));
 return Response.json({results});
}