import {NextRequest} from "next/server";

type Game={pick3:number;pick4:number};
const games:Record<string,Game>={
 "lottery-1":{pick3:82,pick4:84},
 "lottery-2":{pick3:300,pick4:302},
 "lottery-3":{pick3:101,pick4:104},
 "lottery-5":{pick3:83,pick4:85},
 "lottery-6":{pick3:100,pick4:103},
 "lottery-7":{pick3:301,pick4:303},
};
const pick2:Record<string,number>={"lottery-0":80,"lottery-4":81};
const massachusetts:Record<string,number>={"lottery-ma-even":213};
const host="usa-lottery-result-all-state-api.p.rapidapi.com";
const AUTO_SYNC_ENABLED=process.env.LOTTERY_SCHEDULE_AUTO_SYNC==="true";
type ApiData={drawDate?:string;drawTime?:string;nextDrawDate?:string;winningNumbers?:Array<string|number>;gameDetails?:{id?:number;gameName?:string}};
async function getGame(gameID:number,key:string){
 const url=new URL("https://"+host+"/lottery-results/game-result");url.searchParams.set("gameID",String(gameID));
 const r=await fetch(url,{headers:{"x-rapidapi-key":key,"x-rapidapi-host":host},cache:"no-store"});
 if(!r.ok)throw new Error("api");
 const body=await r.json() as {status?:string;data?:ApiData};
 if(body.status!=="success"||!body.data)throw new Error("data");
 return body.data;
}
function nextTime(data:ApiData){const m=/\s(\d{2}):(\d{2}):(\d{2})$/.exec(data.nextDrawDate||"");return m?`${m[1]}:${m[2]}:${m[3]}`:data.drawTime||null}
async function syncSchedule(request:NextRequest,lotteryId:string,lotteryName:string,data:ApiData){
 if(!AUTO_SYNC_ENABLED)return;
 const drawTime=nextTime(data);if(!drawTime)return;
 const secret=process.env.LOTTERY_SCHEDULE_SYNC_SECRET;if(!secret)return;
 const origin=request.nextUrl.origin;
 await fetch(origin+"/api/gespro/schedule-sync",{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"},body:JSON.stringify({lotteryId,lotteryName,drawTime,oldDrawTime:null}),cache:"no-store"}).catch(()=>{});
}
function digits(data:ApiData,count:number){const v=(data.winningNumbers??[]).map(String).slice(0,count).join("");return new RegExp("^\\d{"+count+"}$").test(v)?v:null}
export async function GET(request:NextRequest){
 const lotteryId=request.nextUrl.searchParams.get("lotteryId")||"",expectedDate=request.nextUrl.searchParams.get("date")||"",key=process.env.RAPIDAPI_LOTTERY_KEY;
 const scheduleMode=AUTO_SYNC_ENABLED?"production-auto":"test-manual";
 if(!key)return Response.json({error:"RAPIDAPI_LOTTERY_KEY pa konfigire sou sèvè a."},{status:503});
 try{
  const ma=massachusetts[lotteryId];
  if(ma){
   const d=await getGame(ma,key),four=digits(d,4);
   if(!four)return Response.json({error:"API a pa retounen Massachusetts 4 chif nan fòma ki valab."},{status:502});
   if(expectedDate&&d.drawDate!==expectedDate)return Response.json({error:`Dènye rezilta API a se ${d.drawDate||"yon lòt dat"}, pa ${expectedDate}.`,latestDate:d.drawDate},{status:409});
   return Response.json({lotteryId,gameID:ma,gameName:d.gameDetails?.gameName,drawDate:d.drawDate,drawTime:d.drawTime,nextDrawDate:d.nextDrawDate,scheduleMode,primary:four,values:[four]});
  }
  const p2=pick2[lotteryId];
  if(p2){
   const d=await getGame(p2,key),primary=digits(d,2);
   if(!primary)return Response.json({error:"API a pa retounen yon rezilta Pick 2 valab."},{status:502});
   if(expectedDate&&d.drawDate!==expectedDate)return Response.json({error:`Dènye rezilta API a se ${d.drawDate||"yon lòt dat"}, pa ${expectedDate}.`,latestDate:d.drawDate},{status:409});
   return Response.json({lotteryId,gameID:p2,gameName:d.gameDetails?.gameName,drawDate:d.drawDate,drawTime:d.drawTime,nextDrawDate:d.nextDrawDate,scheduleMode,primary,values:[primary]});
  }
  const game=games[lotteryId];if(!game)return Response.json({error:"Lotri sa a poko konekte ak API a."},{status:400});
  const [d3,d4]=await Promise.all([getGame(game.pick3,key),getGame(game.pick4,key)]);
  await syncSchedule(request,lotteryId,d3.gameDetails?.gameName||lotteryId,d3);
  if(expectedDate&&(d3.drawDate!==expectedDate||d4.drawDate!==expectedDate))return Response.json({error:"Pick 3 ak Pick 4 poko disponib pou dat sa a.",pick3Date:d3.drawDate,pick4Date:d4.drawDate},{status:409});
  if(d3.drawDate!==d4.drawDate)return Response.json({error:"Dat Pick 3 ak Pick 4 yo pa koresponn."},{status:409});
  const primary=digits(d3,3),four=digits(d4,4);
  if(!primary||!four)return Response.json({error:"API a pa retounen Pick 3 / Pick 4 nan fòma ki valab."},{status:502});
  return Response.json({lotteryId,gameIDs:[game.pick3,game.pick4],gameName:d3.gameDetails?.gameName,drawDate:d3.drawDate,drawTime:d3.drawTime,nextDrawDate:d3.nextDrawDate,scheduleMode,primary,values:[primary,four.slice(0,2),four.slice(2,4)]});
 }catch{return Response.json({error:"Nou pa ka konekte ak API tiraj la kounye a."},{status:502})}
}
