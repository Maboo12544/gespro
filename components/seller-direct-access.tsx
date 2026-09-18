"use client";
import {useEffect,useRef,useState} from 'react';
import type {AccessContext} from '@/lib/access-types';
import {DemoStorageBoundary,DemoNamespaceProvider} from '@/components/demo-storage';
import {LanguageProvider} from '@/components/language-settings';
import {PosInterface} from '@/components/gespro-workspace';
import type {PosLayout} from '@/components/desktop-model-previews';
import {useServerTestTickets} from '@/components/server-test-sales';
import type {LotteryState} from '@/components/lottery-management';
import type {MonitoredTicket} from '@/lib/monitoring';

function SellerPos({bank,bankId,pointId,seller,userId}:{bank:string;bankId:string;pointId:string;seller:string;userId:string}){
 const data=useServerTestTickets(bankId);
 type Pending={signature:string;id:string};
 const key='gespro-pending-ticket:'+userId+':'+bankId+':'+pointId;
 const [request,setRequest]=useState<Pending|null>(()=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}});
 const requestRef=useRef(request),[recovery,setRecovery]=useState(''),[recovering,setRecovering]=useState(false);
 const [lotteries,setLotteries]=useState<LotteryState|null>(null),[configError,setConfigError]=useState('Ap chaje lotri bank la…');
 useEffect(()=>{let live=true;async function load(){try{const r=await fetch('/api/gespro/pos-configuration?pos='+encodeURIComponent(pointId),{cache:'no-store'});const result=await r.json() as {configuration:LotteryState|null;error?:string};if(!r.ok)throw Error(result.error);if(live){setLotteries(result.configuration);setConfigError(result.configuration?'':'Admin dwe konfigire lotri ak lè fèmti bank la anvan vann.')}}catch(e){if(live){setLotteries(null);setConfigError(e instanceof Error?e.message:'Koneksyon pèdi.')}}}void load();const timer=setInterval(()=>void load(),15000);return()=>{live=false;clearInterval(timer)}},[pointId]);
 function clear(){localStorage.removeItem(key);requestRef.current=null;setRequest(null)}
 async function submit(pending:Pending){try{const ticket=await data.create(pointId,pending.id,JSON.parse(pending.signature));clear();return ticket}catch(error){if(error instanceof Error&&'rejected' in error&&error.rejected)clear();throw error}}
 async function create(plays:MonitoredTicket['plays']){const signature=JSON.stringify(plays);let pending=requestRef.current;if(pending&&pending.signature!==signature)throw Error('Konfime fich ki rete an atant lan anvan ou voye yon lòt fich.');if(!pending){pending={signature,id:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(pending));requestRef.current=pending;setRequest(pending)}return submit(pending)}
 async function recover(){if(!requestRef.current||recovering)return;setRecovering(true);try{const ticket=await submit(requestRef.current);setRecovery('Fich '+ticket.id+' konfime.')}catch(error){setRecovery(error instanceof Error?error.message:'Pa konfime.')}finally{setRecovering(false)}}
 if(!lotteries)return <main className="seller-direct-shell"><p className="access-mode" role="status">{configError}</p></main>;
 const posLayout=(lotteries as LotteryState&{posLayout?:string}).posLayout as PosLayout|undefined;
 return <main className="seller-direct-shell"><LanguageProvider>{request&&<div className="access-mode" role="status"><button disabled={recovering} onClick={()=>void recover()}>Konfime fich ki an atant lan</button>{recovery&&<p>{recovery}</p>}</div>}<PosInterface remote={{create,cancel:data.cancel,pay:data.pay}} identity={{bank,pointId,seller}} posLayout={posLayout} serverOffsetMs={data.serverOffsetMs} setView={()=>{}} tickets={data.tickets.filter(t=>t.pointOfSaleId===pointId)} setTickets={data.setTickets} lotteryState={lotteries}/></LanguageProvider></main>
}

export function SellerDirectAccess({initial}:{initial:AccessContext}){
 const bank=initial.banks.find(b=>b.active);
 const membership=bank?initial.memberships.find(m=>m.user_id===initial.userId&&m.bank_id===bank.id&&m.active&&m.role==='seller'):undefined;
 const assignment=membership?initial.assignments.find(a=>a.user_id===initial.userId&&a.bank_id===bank?.id):undefined;
 const point=assignment?initial.points.find(p=>p.id===assignment.pos_id&&p.bank_id===bank?.id&&p.active):undefined;
 if(!bank||!membership||!point)return <main className="seller-direct-shell"><p className="access-mode" role="status">Admin bank dwe asiyen w yon pwen vant aktif anvan ou ka vann.</p></main>;
 return <DemoNamespaceProvider scope={initial.userId+':'+bank.id+':'+point.id}><DemoStorageBoundary><SellerPos userId={initial.userId} bankId={bank.id} bank={bank.name} pointId={point.id} seller={initial.displayName||initial.username}/></DemoStorageBoundary></DemoNamespaceProvider>
}
