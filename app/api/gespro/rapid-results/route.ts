import {currentAccess} from '@/lib/gespro-auth';

const host='usa-lottery-result-all-state-api.p.rapidapi.com';
const allowedGameIds=new Set([
  80,81,82,83,84,85,86,87,93,94,96,
  300,301,302,303,304,305,306,307,
  100,101,102,103,104,105,113,
  212,213,214,215,
  283,284,285,286,287,288,
  49,50,51,52,53,54
]);

type RapidDraw={
 status:string;message?:string;data?:{
  drawNumber:number;drawDate:string;drawTime:string;drawDateTime:string;
  winningNumbers:string[];additionalNumbers?:string[];note?:string;
  gameDetails:{id:number;gameName:string;state:{state:string;stateCode:string}};
 }
};

const noStore={'Cache-Control':'no-store'};
const fail=(status:number,error:string)=>Response.json({error},{status,headers:noStore});

export async function GET(request:Request){
 try{
  const access=await currentAccess();
  if(!access)return fail(401,'Konekte ankò.');
  const raw=new URL(request.url).searchParams.get('gameId');
  if(!raw||!/^[0-9]{1,4}$/.test(raw))return fail(400,'Game ID pa valab.');
  const gameId=Number(raw);
  if(!allowedGameIds.has(gameId))return fail(400,'Jwèt sa a poko aktive nan GesPro.');
  const key=process.env.RAPIDAPI_LOTTERY_KEY;
  if(!key)return fail(503,'Sèvis rezilta otomatik la poko konfigire.');
  const url=new URL('https://'+host+'/lottery-results/game-result');
  url.searchParams.set('gameID',String(gameId));
  const response=await fetch(url,{headers:{'x-rapidapi-key':key,'x-rapidapi-host':host},cache:'no-store'});
  if(!response.ok)return fail(502,'Founisè rezilta a pa disponib.');
  const body=await response.json() as RapidDraw;
  const d=body.data;
  if(body.status!=='success'||!d||d.gameDetails?.id!==gameId||!/^\d{4}-\d{2}-\d{2}$/.test(d.drawDate)||!Array.isArray(d.winningNumbers)||!d.winningNumbers.length||d.winningNumbers.some(n=>typeof n!=='string'||!/^\d{1,2}$/.test(n))){
   return fail(502,'Rezilta founisè a pa pase verifikasyon GesPro.');
  }
  return Response.json({
   source:'RapidAPI',
   gameId,
   gameName:d.gameDetails.gameName,
   state:d.gameDetails.state,
   drawNumber:d.drawNumber,
   drawDate:d.drawDate,
   drawTime:d.drawTime,
   winningNumbers:d.winningNumbers,
   additionalNumbers:d.additionalNumbers||[],
   note:d.note||''
  },{headers:noStore});
 }catch{return fail(503,'Sèvis rezilta otomatik la pa disponib.')}
}
