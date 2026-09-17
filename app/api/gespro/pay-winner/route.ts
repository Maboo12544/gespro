import {cookies} from 'next/headers';
import {currentAccess,sessionCookie,authConfig,validOrigin} from '@/lib/gespro-auth';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,error:string)=>Response.json({error},{status,headers});
async function context(){const access=await currentAccess();const token=(await cookies()).get(sessionCookie)?.value;if(!access||!token)return null;const {url,key}=authConfig();return {access,url,auth:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'}}}
export async function POST(request:Request){
 if(!validOrigin(request))return fail(403,'Demann pa otorize.');
 try{
 const c=await context();if(!c)return fail(401,'Konekte ankò.');
 const raw=await request.text();if(raw.length>4096)return fail(400,'Demann twò gwo.');
 const body=JSON.parse(raw);
 if(typeof body.ticketId!=='string'||!/^[0-9]{1,18}$/.test(body.ticketId))return fail(400,'Tikè pa valab.');
 const r=await fetch(`${c.url}/rest/v1/rpc/gespro_pay_winning_ticket`,{method:'POST',headers:c.auth,body:JSON.stringify({ticket_key:body.ticketId}),cache:'no-store'});
 if(!r.ok){const e=await r.json() as {message?:string};const messages:Record<string,string>={'Ticket is not a winner':'Tikè sa a pa genyen.','Ticket already paid':'Tikè sa a deja peye.','Ticket not found':'Tikè sa a pa egziste.','Access denied':'Ou pa gen dwa pou peye tikè sa a.'};return fail(r.status>=500?503:403,messages[e.message||'']||'Peman refize. Verifye dwa ou.');}
 return Response.json({payment:await r.json()},{headers});
 }catch{return fail(503,'Sèvis peman an pa disponib. Rekonekte epi retrye.');}
}
