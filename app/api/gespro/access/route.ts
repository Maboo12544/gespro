import {cookies} from 'next/headers';
import {currentAccess,sessionCookie,authConfig,validOrigin} from '@/lib/gespro-auth';
const headers={'Cache-Control':'no-store'};
export async function GET(){const access=await currentAccess();return Response.json(access??{error:'Konekte ankò.'},{status:access?200:401,headers})}
export async function POST(request:Request){
 if(!validOrigin(request))return Response.json({error:'Demann pa otorize.'},{status:403,headers});
 try{
  const access=await currentAccess();if(!access)return Response.json({error:'Konekte ankò.'},{status:401,headers});
  const raw=await request.text();if(raw.length>8192)return Response.json({error:'Demann twò gwo.'},{status:413,headers});
  let body;try{body=JSON.parse(raw)}catch{return Response.json({error:'Demann pa valab.'},{status:400,headers})}
  if(!body||typeof body!=='object'||Array.isArray(body)||!['create_bank','create_pos','create_member','update_member'].includes(body.operation)||!body.data||typeof body.data!=='object'||Array.isArray(body.data))return Response.json({error:'Demann pa valab.'},{status:400,headers});
  const bankId=body.data.bank_id;
  if(!access.isPlatformAdmin&&(body.operation==='create_bank'||!access.banks.some(b=>b.id===bankId&&b.active)||!access.memberships.some(m=>m.user_id===access.userId&&m.bank_id===bankId&&m.role==='owner'&&m.active)))return Response.json({error:'Ou pa gen dwa pou aksyon sa a.'},{status:403,headers});
  const token=(await cookies()).get(sessionCookie)?.value;
  if(!token)return Response.json({error:'Konekte ankò.'},{status:401,headers});
  const {url,key}=authConfig();
  const result=await fetch(`${url}/functions/v1/gespro-access`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:raw,cache:'no-store'});
  const data:unknown=await result.json();
  return Response.json(result.ok?{ok:true}:{error:data&&typeof data==='object'&&'error' in data&&typeof data.error==='string'?data.error:'Aksyon an refize.'},{status:result.status,headers});
 }catch{return Response.json({error:'Sèvis la pa disponib. Rafrechi lis la anvan ou eseye ankò.'},{status:503,headers})}
}
