import {NextRequest} from "next/server";
import {currentAdmin} from "@/lib/gespro-auth";
const lotteries=[["lottery-0","FL PICK 2 AM"],["lottery-1","FLORIDA AM"],["lottery-2","NEW YORK AM"],["lottery-3","GEORGIA EVENING"],["lottery-4","FL PICK 2 PM"],["lottery-5","FLORIDA PM"],["lottery-6","GEORGIA MIDDAY"],["lottery-7","NEW YORK PM"]] as const;
export async function POST(request:NextRequest){
 const admin=await currentAdmin();if(!admin)return Response.json({error:"Aksè refize."},{status:403});
 const origin=request.nextUrl.origin;
 const results=await Promise.all(lotteries.map(async ([lotteryId,gesproName])=>{try{const r=await fetch(origin+"/api/gespro/lottery-result?lotteryId="+encodeURIComponent(lotteryId),{cache:"no-store"});const b=await r.json() as {drawTime?:string;nextDrawDate?:string;gameName?:string;schedule?:{saved?:boolean;drawTime?:string;closingTime?:string;error?:string};error?:string};return {lotteryId,name:gesproName,apiName:b.gameName,ok:r.ok&&b.schedule?.saved===true,drawTime:b.schedule?.drawTime||b.drawTime,closingTime:b.schedule?.closingTime,nextDrawDate:b.nextDrawDate,error:b.error||b.schedule?.error}}catch{return {lotteryId,name:gesproName,ok:false,error:"network"}}}));
 return Response.json({results});
}