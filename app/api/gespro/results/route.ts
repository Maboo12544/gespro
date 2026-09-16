import {cookies} from 'next/headers';
import {currentAccess,sessionCookie,authConfig,validOrigin} from '@/lib/gespro-auth';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,error:string)=>Response.json({error},{status,headers});
async function context(){const access=await currentAccess();const token=(await cookies()).get(sessionCookie)?.value;if(!access||!token)return null;const {url,key}=authConfig();return {access,url,auth:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'}}}
export async function GET(request:Request){try{
 const c=await context();if(!c)return fail(401,'Konekte ankò.');
 const day=new URL(request.url).searchParams.get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Port-au-Prince'}).format(new Date());
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return fail(400,'Dat pa valab.');
 const q=new URLSearchParams({select:'lottery,mode,draw_date,numbers,derived,version,updated_at',draw_date:'eq.'+day,order:'lottery.asc',limit:'1000'});
 const r=await fetch(`${c.url}/rest/v1/gespro_test_results?${q}`,{headers:c.auth,cache:'no-store'});
 if(!r.ok)return fail(503,'Nou pa ka chaje rezilta yo.');
 const results=await r.json() as unknown[];if(results.length===1000)return fail(503,'Twòp rezilta pou jou sa a. Kontakte administratè a.');
 return Response.json({results,date:day},{headers});
 }catch{return fail(503,'Sèvis rezilta a pa disponib.')}}
export async function POST(request:Request){
 if(!validOrigin(request))return fail(403,'Demann pa otorize.');
 try{const c=await context();if(!c)return fail(401,'Konekte ankò.');if(!c.access.isPlatformAdmin)return fail(403,'Se super admin sèlman ki ka pibliye rezilta.');
 const raw=await request.text();if(raw.length>4000)return fail(400,'Demann twò gwo.');const b=JSON.parse(raw);
 if(typeof b.bank!=='string'||!c.access.banks.some(x=>x.id===b.bank&&x.active)||typeof b.lotteryId!=='string'||b.lotteryId.length>120||typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Array.isArray(b.numbers)||b.numbers.length<1||b.numbers.length>3||b.numbers.some((v:unknown)=>typeof v!=='string'||!/^\d{2,4}$/.test(v))||!Number.isSafeInteger(b.version)||b.version<0||typeof b.reason!=='string'||b.reason.length>500)return fail(400,'Verifye dat, lotri ak chif yo.');
 const r=await fetch(`${c.url}/rest/v1/rpc/gespro_publish_test_result`,{method:'POST',headers:c.auth,body:JSON.stringify({target_bank:b.bank,lottery_id:b.lotteryId,result_date:b.date,numbers:b.numbers,expected_version:b.version,reason:b.reason}),cache:'no-store'});
 if(!r.ok){const e=await r.json() as {code?:string;message?:string};const messages:Record<string,string>={'Draw still open':'Tiraj la poko fèmen nan tout bank yo.','Closing time not configured':'Konfigire lè fèmti lotri a anvan.','Result conflict':'Yon lòt rezilta deja anrejistre. Rafrechi epi verifye li.','Correction reason required':'Ekri rezon koreksyon an (5 karaktè minimòm).','Invalid result':'Fòma rezilta a pa valab.'};return fail(r.status>=500?503:e.code==='40001'?409:400,messages[e.message||'']||'Rezilta a pa konfime. Rafrechi anvan ou retrye.');}
 return Response.json({result:await r.json()},{headers});
 }catch{return fail(503,'Nou pa ka konfime piblikasyon an. Rafrechi anvan ou retrye.')}}
