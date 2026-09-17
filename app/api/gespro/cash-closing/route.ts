import {cookies} from 'next/headers';
import {currentAccess,sessionCookie,authConfig,validOrigin} from '@/lib/gespro-auth';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,error:string)=>Response.json({error},{status,headers});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function context(){const access=await currentAccess();const token=(await cookies()).get(sessionCookie)?.value;if(!access||!token)return null;const {url,key}=authConfig();return {access,url,auth:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'}}}
export async function GET(request:Request){try{
 const c=await context();if(!c)return fail(401,'Konekte ankò.');
 const bank=new URL(request.url).searchParams.get('bank');
 if(!uuid(bank)||!c.access.banks.some(b=>b.id===bank&&b.active))return fail(403,'Bank sa a pa disponib.');
 const q=new URLSearchParams({select:'*',bank_id:'eq.'+bank,order:'closing_date.desc',limit:'100'});
 const r=await fetch(`${c.url}/rest/v1/gespro_cash_closings?${q}`,{headers:c.auth,cache:'no-store'});
 if(!r.ok)return fail(503,'Nou pa ka chaje fèmti yo kounye a.');
 return Response.json({closings:await r.json()},{headers});
 }catch{return fail(503,'Sèvis fèmti a pa disponib.');}}
export async function POST(request:Request){
 if(!validOrigin(request))return fail(403,'Demann pa otorize.');
 try{
 const c=await context();if(!c)return fail(401,'Konekte ankò.');
 const raw=await request.text();if(raw.length>8192)return fail(400,'Demann twò gwo.');
 const b=JSON.parse(raw);
 if(!uuid(b.bankId)||!c.access.banks.some(x=>x.id===b.bankId&&x.active))return fail(403,'Bank sa a pa disponib.');
 if(b.sellerId!==null&&!uuid(b.sellerId))return fail(400,'Vandè pa valab.');
 if(typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date))return fail(400,'Dat pa valab.');
 if(!Number.isSafeInteger(b.rateBps)||b.rateBps<0||b.rateBps>10000)return fail(400,'Komisyon an dwe ant 0 ak 100%.');
 if(!Number.isSafeInteger(b.remittedCents)||b.remittedCents<0)return fail(400,'Montan remiz la pa valab.');
 const r=await fetch(`${c.url}/rest/v1/rpc/gespro_record_cash_closing`,{method:'POST',headers:c.auth,body:JSON.stringify({target_bank:b.bankId,target_seller:b.sellerId,closing_date:b.date,rate_bps:b.rateBps,remitted_cents:b.remittedCents}),cache:'no-store'});
 if(!r.ok){const e=await r.json() as {message?:string};const messages:Record<string,string>={'Remittance exceeds available balance':'Montan remiz la depase balans ki disponib.','Invalid commission rate':'Komisyon an dwe ant 0 ak 100%.','Invalid remittance':'Montan remiz la pa valab.','Access denied':'Ou pa gen dwa pou fèmen kach sa a.'};return fail(r.status>=500?503:403,messages[e.message||'']||'Fèmti refize. Verifye done yo.');}
 return Response.json({closing:await r.json()},{headers});
 }catch{return fail(503,'Sèvis fèmti a pa disponib. Rekonekte epi retrye.');}
}
