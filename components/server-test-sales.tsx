"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {MonitoredTicket,TicketPlay} from '@/lib/monitoring';
import {DashboardReport} from '@/components/dashboard-report';
export function useServerTestTickets(bank:string){
 const [tickets,setTickets]=useState<MonitoredTicket[]>([]),[message,setMessage]=useState(''),[ready,setReady]=useState(false),[updated,setUpdated]=useState(''),[serverOffsetMs,setServerOffsetMs]=useState(0);
 const revision=useRef(0),inflight=useRef(false),alive=useRef(true);
 const refresh=useCallback(async()=>{if(inflight.current)return;inflight.current=true;const rev=revision.current;
 try{let next:string|null=null;const list:MonitoredTicket[]=[];
 for(let page=0;page<40;page++){
 const query=new URLSearchParams({bank});if(next)query.set('before',next);
 const r=await fetch('/api/gespro/test-tickets?'+query,{cache:'no-store'});const data=await r.json() as {tickets:MonitoredTicket[];next:string|null;serverNow?:number;error?:string};if(!r.ok)throw Error(data.error||'Koneksyon pèdi.');list.push(...data.tickets);if(typeof data.serverNow==='number')setServerOffsetMs(data.serverNow-Date.now());next=data.next;if(!next)break;
 }
 if(next)throw Error('Plis pase 10 000 tikè: rapò konplè a bezwen yon rechèch pa peryòd.');
 if(alive.current&&revision.current===rev){setTickets(list);setMessage('');setReady(true);setUpdated(new Date().toLocaleTimeString())}
 }catch(e){if(alive.current){setMessage(e instanceof Error?e.message:'Nou pa ka rafrechi tikè yo.');setReady(false)}}finally{inflight.current=false}},[bank]);
 useEffect(()=>{alive.current=true;void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},15000);const focus=()=>void refresh();window.addEventListener('focus',focus);return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('focus',focus)}},[refresh]);
 async function mutate(body:Record<string,unknown>){
 const r=await fetch('/api/gespro/test-tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json() as {ticket:MonitoredTicket;error?:string};if(!r.ok){const error=Object.assign(Error(data.error||'Aksyon an pa konfime.'),{rejected:r.status===400||r.status===403});throw error;}revision.current++;setTickets(old=>[data.ticket,...old.filter(t=>t.id!==data.ticket.id)]);setMessage('');void refresh();return data.ticket;
 }
 const create=(posId:string,requestId:string,plays:TicketPlay[])=>mutate({operation:'create',posId,requestId,plays});
 const cancel=async(id:string)=>{try{await mutate({operation:'cancel',id});return true}catch(e){setMessage(e instanceof Error?e.message:'Anilasyon pa konfime.');return false}};
 const pay=async(id:string)=>mutate({operation:'pay',id});
 return {tickets,setTickets,refresh,create,cancel,pay,ready,message,updated,serverOffsetMs};
}
export function ServerSalesDashboard({bank,canCancel}:{bank:string;canCancel:boolean}){
 const data=useServerTestTickets(bank);
 const [cash,setCash]=useState<{balance_cents:number;sales_cents:number;payout_cents:number;entries:Array<{id:number;ticket_id?:number;entry_type:string;amount_cents:number;created_at:string}>}|null>(null),[cashError,setCashError]=useState("");
 const refreshCash=useCallback(async()=>{try{const r=await fetch('/api/gespro/cash-ledger?bank='+encodeURIComponent(bank),{cache:'no-store'});const b=await r.json() as {balance_cents:number;sales_cents:number;payout_cents:number;entries:Array<{id:number;ticket_id?:number;entry_type:string;amount_cents:number;created_at:string}>;error?:string};if(!r.ok)throw Error(b.error||'Kès pa disponib.');setCash(b);setCashError('')}catch(e){setCashError(e instanceof Error?e.message:'Kès pa disponib.')}},[bank]);
 useEffect(()=>{void refreshCash();const id=setInterval(()=>{if(!document.hidden)void refreshCash()},15000);return()=>clearInterval(id)},[refreshCash]);
 const money=(c:number)=>'$'+(c/100).toFixed(2);
 return <section className="access-server-sales"><h2>Lavant senkronize</h2>{cash&&<><div className="cash-summary"><article><span>Balans</span><strong className={cash.balance_cents<0?'negative':'positive'}>{money(cash.balance_cents)}</strong></article><article><span>Total lavant</span><strong>{money(cash.sales_cents)}</strong></article><article><span>Payout</span><strong>{money(cash.payout_cents)}</strong></article></div><details className="cash-ledger-details"><summary>Istorik kès — {cash.entries.length} mouvman</summary><div className="table-scroll"><table className="bank-table"><thead><tr><th>Dat</th><th>Kalite</th><th>Tikè</th><th>Montan</th></tr></thead><tbody>{cash.entries.slice(0,100).map(e=><tr key={e.id}><td>{new Date(e.created_at).toLocaleString()}</td><td>{e.entry_type}</td><td>{e.ticket_id??'—'}</td><td className={e.amount_cents<0?'negative':'positive'}>{money(e.amount_cents)}</td></tr>)}</tbody></table></div></details></>}{cashError&&<p role="status">{cashError}</p>}<p role="status">{data.message||(!data.ready?'Ap chaje tikè…':`Dènye rafrechisman: ${data.updated} · Chak 15 segonn`)} <button onClick={()=>{void data.refresh();void refreshCash()}}>Rafrechi</button></p><DashboardReport tickets={data.tickets} onCancel={canCancel?data.cancel:()=>false} serverBacked canCancel={canCancel}/></section>
}
