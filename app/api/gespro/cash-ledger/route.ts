import {cookies} from "next/headers";
import {currentAccess,sessionCookie,authConfig} from "@/lib/gespro-auth";
const headers={"Cache-Control":"no-store"};
export async function GET(request:Request){
 const access=await currentAccess();if(!access)return Response.json({error:"Konekte ankò."},{status:401,headers});
 const token=(await cookies()).get(sessionCookie)?.value;if(!token)return Response.json({error:"Konekte ankò."},{status:401,headers});
 const bank=new URL(request.url).searchParams.get("bank")||"";
 const member=access.memberships.find(m=>m.bank_id===bank&&m.user_id===access.userId&&m.active);
 if((!access.isPlatformAdmin&&!member)||member?.role==="seller")return Response.json({error:"Aksè refize."},{status:403,headers});
 const {url,key}=authConfig(),h={apikey:key,Authorization:"Bearer "+token};
 const r=await fetch(url+"/rest/v1/gespro_cash_ledger?bank_id=eq."+encodeURIComponent(bank)+"&select=*&order=created_at.desc&limit=500",{headers:h,cache:"no-store"});
 if(!r.ok)return Response.json({error:"Kès bank lan pa disponib."},{status:503,headers});
 const entries=await r.json() as Array<{id:number;pos_id?:string;seller_id?:string;ticket_id?:number;entry_type:string;amount_cents:number;note?:string;created_at:string}>;
 const balance=entries.reduce((s,e)=>s+Number(e.amount_cents),0),sales=entries.filter(e=>e.entry_type==="sale").reduce((s,e)=>s+Number(e.amount_cents),0),payout=entries.filter(e=>e.entry_type==="payout").reduce((s,e)=>s-Number(e.amount_cents),0);
 return Response.json({balance_cents:balance,sales_cents:sales,payout_cents:payout,entries},{headers});
}