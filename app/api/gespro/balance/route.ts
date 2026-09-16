import {cookies} from 'next/headers';
import {currentAccess,sessionCookie,authConfig} from '@/lib/gespro-auth';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,error:string)=>Response.json({error},{status,headers});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function context(){const access=await currentAccess();const token=(await cookies()).get(sessionCookie)?.value;if(!access||!token)return null;const {url,key}=authConfig();return {access,url,auth:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'}}}
export async function GET(request:Request){try{
 const c=await context();if(!c)return fail(401,'Konekte ankò.');
 const bank=new URL(request.url).searchParams.get('bank');
 if(!uuid(bank)||!c.access.banks.some(b=>b.id===bank&&b.active))return fail(403,'Bank sa a pa disponib.');
 const r=await fetch(`${c.url}/rest/v1/rpc/gespro_bank_balance`,{method:'POST',headers:c.auth,body:JSON.stringify({target_bank:bank}),cache:'no-store'});
 if(!r.ok)return fail(503,'Nou pa ka chaje balans la kounye a.');
 return Response.json({balance:await r.json()},{headers});
 }catch{return fail(503,'Sèvis balans la pa disponib.');}}
