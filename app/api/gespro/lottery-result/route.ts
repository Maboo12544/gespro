import {NextRequest} from "next/server";

const games:Record<string,{gameID:number;digits:number}>={
 "lottery-0":{gameID:80,digits:2},
 "lottery-1":{gameID:82,digits:3},
 "lottery-2":{gameID:300,digits:3},
 "lottery-3":{gameID:101,digits:3},
 "lottery-4":{gameID:81,digits:2},
 "lottery-5":{gameID:83,digits:3},
 "lottery-6":{gameID:100,digits:3},
 "lottery-7":{gameID:301,digits:3},
};
const host="usa-lottery-result-all-state-api.p.rapidapi.com";
export async function GET(request:NextRequest){
 const lotteryId=request.nextUrl.searchParams.get("lotteryId")||"";
 const expectedDate=request.nextUrl.searchParams.get("date")||"";
 const game=games[lotteryId],key=process.env.RAPIDAPI_LOTTERY_KEY;
 if(!game)return Response.json({error:"Lotri sa a poko konekte ak API a."},{status:400});
 if(!key)return Response.json({error:"RAPIDAPI_LOTTERY_KEY pa konfigire sou sèvè a."},{status:503});
 try{
  const url=new URL("https://"+host+"/lottery-results/game-result");url.searchParams.set("gameID",String(game.gameID));
  const r=await fetch(url,{headers:{"x-rapidapi-key":key,"x-rapidapi-host":host},cache:"no-store"});
  if(!r.ok)return Response.json({error:"API tiraj la pa disponib kounye a.",status:r.status},{status:502});
  const body=await r.json() as {status?:string;data?:{drawDate?:string;drawTime?:string;winningNumbers?:Array<string|number>;gameDetails?:{id?:number;gameName?:string}}};
  const d=body.data,numbers=d?.winningNumbers?.map(String)??[];
  if(!d||body.status!=="success"||numbers.length<game.digits)return Response.json({error:"API a pa retounen yon rezilta valab."},{status:502});
  if(expectedDate&&d.drawDate!==expectedDate)return Response.json({error:`Dènye rezilta API a se ${d.drawDate||"yon lòt dat"}, pa ${expectedDate}.`,latestDate:d.drawDate},{status:409});
  const primary=numbers.slice(0,game.digits).join("");
  if(!new RegExp("^\\d{"+game.digits+"}$").test(primary))return Response.json({error:"Fòma rezilta API a pa koresponn ak lotri a."},{status:502});
  return Response.json({lotteryId,gameID:game.gameID,gameName:d.gameDetails?.gameName,drawDate:d.drawDate,drawTime:d.drawTime,primary,winningNumbers:numbers});
 }catch{return Response.json({error:"Nou pa ka konekte ak API tiraj la kounye a."},{status:502})}
}
