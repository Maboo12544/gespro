import {cookies} from 'next/headers';
import {currentAccess,sessionCookie,authConfig,validOrigin} from '@/lib/gespro-auth';
import {mapTestTicket,type StoredTestTicket} from '@/lib/server-test-tickets';
const headers={'Cache-Control':'no-store'};
const fail=(status:number,error:string)=>Response.json({error},{status,headers});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function context(){const access=await currentAccess();if(!access)return null;const token=(await cookies()).get(sessionCookie)?.value;if(!token)return null;const {url,key}=authConfig();return {access,url,auth:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'}}}
export async function GET(request:Request){try{
 const c=await context();if(!c)return fail(401,'Konekte ankò.');const params=new URL(request.url).searchParams;const bank=params.get('bank');const before=params.get('before');
 if(!uuid(bank)||(before&&!/^[0-9]{1,18}$/.test(before)))return fail(400,'Bank oswa paj pa valab.');
 if(!c.access.banks.some(b=>b.id===bank&&b.active))return fail(403,'Bank sa a pa disponib.');
 const query=new URLSearchParams({select:'*',bank_id:`eq.${bank}`,order:'id.desc',limit:'250'});if(before)query.set('id',`lt.${before}`);
 const r=await fetch(`${c.url}/rest/v1/gespro_test_tickets?${query}`,{headers:c.auth,cache:'no-store'});if(!r.ok)return fail(503,'Nou pa ka chaje tikè yo kounye a.');
 const rows=await r.json() as StoredTestTicket[];return Response.json({tickets:rows.map(row=>({...mapTestTicket(row),bank:c.access.banks.find(b=>b.id===row.bank_id)?.name||row.bank_name,pointOfSaleName:c.access.points.find(p=>p.id===row.pos_id)?.name||row.pos_name})),next:rows.length===250?String(rows[rows.length-1].id):null,serverNow:Date.now()},{headers});
 }catch{return fail(503,'Sèvis tikè a pa disponib.')}}
export async function POST(request:Request){
 if(!validOrigin(request))return fail(403,'Demann pa otorize.');
 try{
 const c=await context();if(!c)return fail(401,'Konekte ankò.');const raw=await request.text();if(raw.length>150000)return fail(400,'Fich la twò gwo.');const body=JSON.parse(raw);let rpc:string;let args:Record<string,unknown>;
 if(body.operation==='create'){
  if(!uuid(body.posId)||!uuid(body.requestId)||!Array.isArray(body.plays)||body.plays.length<1||body.plays.length>500)return fail(400,'Fich la pa valab.');
  rpc='gespro_create_test_ticket';args={target_pos:body.posId,request_key:body.requestId,entries:body.plays};
 }else if(body.operation==='cancel'&&typeof body.id==='string'&&/^[0-9]{1,18}$/.test(body.id)){rpc='gespro_cancel_test_ticket';args={ticket_key:body.id}}
 else if(body.operation==='pay'&&typeof body.id==='string'&&/^[0-9]{1,18}$/.test(body.id)){rpc='gespro_pay_test_ticket';args={ticket_key:body.id}}
 else return fail(400,'Aksyon pa valab.');
 const r=await fetch(`${c.url}/rest/v1/rpc/${rpc}`,{method:'POST',headers:c.auth,body:JSON.stringify(args),cache:'no-store'});
 if(!r.ok){const error=await r.json() as {message?:string};const messages:Record<string,string>={'Configure bank lotteries and closing times first':'Admin dwe anrejistre konfigirasyon bank la ak lè fèmti yo.','Closing time not configured':'Lè fèmti lotri sa a poko konfigire.','Lottery closed':'Lotri sa a deja fèmen.','Lottery unavailable':'Lotri sa a pa disponib nan bank la.','Lottery rules unconfirmed':'Chwazi yon fòma tiraj valide pou lotri sa a.','Limit not configured':'Pa gen limit aktif pou jwèt/boul sa a. Admin dwe mete limit la anvan lavant.','Number limit exceeded':'Limit boul la rive. Tikè a pa antre.','Invalid limit':'Admin dwe korije limit bank la.'};return fail(r.status>=500?503:r.status===403?403:400,messages[error.message||'']||(body.operation==='cancel'?'Anilasyon refize: dwa oswa delè a pa valab.':body.operation==='pay'?'Peman refize: fich la pa gayan, deja peye, oswa bezwen revizyon.':'Tikè refize. Verifye lotri, boul, montan ak dwa kont ou.'))}
 const row=await r.json() as StoredTestTicket;return Response.json({ticket:mapTestTicket(row)},{headers});
 }catch{return fail(503,'Nou pa ka konfime aksyon an. Rekonekte epi retrye menm fich la; pa kreye yon lòt kopi.')}}
