"use client";
import {useDemoState} from "@/components/demo-storage";
import {Localized} from "@/components/language-settings";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ticketDate,type MonitoredTicket} from "@/lib/monitoring";
const money=(n:number)=>"$"+n.toFixed(2);
export function ViewSales({open,onOpenChange,tickets,lotteries=[],results=[],bank="JP Bòlèt",pointId="jp-pos-1"}:{bank?:string;pointId?:string;results?:(import("@/components/draw-results").DrawResult&{name:string})[];lotteries?:string[];open:boolean;onOpenChange:(v:boolean)=>void;tickets:MonitoredTicket[]}){
 const [date,setDate]=useDemoState("view-sales.tsx:date",()=>ticketDate(Date.now()));
 const [selected,setSelected]=useDemoState("view-sales.tsx:selected",date);
 const [tab,setTab]=useDemoState("view-sales.tsx:tab","sales");
 const [printing,setPrinting]=useState(false);
 const [detail,setDetail]=useState<string|null>(null);
 useEffect(()=>{setDetail(null)},[selected,open]);
 useEffect(()=>{const done=()=>setPrinting(false);window.addEventListener("afterprint",done);return ()=>window.removeEventListener("afterprint",done)},[]);
 const scoped=tickets.filter(t=>t.pointOfSaleId===pointId&&t.bank===bank);
 const day=scoped.filter(t=>ticketDate(t.createdAt)===selected);
 const active=day.filter(t=>t.status!=="cancelled");
 const sum=active.reduce((n,t)=>n+t.amount,0);
 const prizes=active.reduce((n,t)=>n+t.prize,0);
 const groups=new Map<string,number>();
 active.forEach(t=>t.plays.forEach(p=>groups.set(p.lottery,(groups.get(p.lottery)||0)+p.amount)));
 const names=[...new Set([...lotteries,...groups.keys()])];
 const pendingAmount=active.filter(t=>t.status==="pending").reduce((n,t)=>n+t.amount,0);
 const rows:[string,string|number][]=[["Pwen vant",bank],["Kòd",pointId],["An atant",day.filter(t=>t.status==="pending").length],["Pèdi",day.filter(t=>t.status==="loser").length],["Gayan",day.filter(t=>t.status==="winner").length],["Anile",day.filter(t=>t.status==="cancelled").length],["Total tikè",day.length],["Lavant (san tikè anile)",money(sum)],["Komisyon","Pa konfigire"],["Pri genyen",money(prizes)],["Balans inisyal","—"],["Nèt","—"],["Final","—"],["Balans total","—"]];
 const table=(headers:string[],body:React.ReactNode)=><div className="sales-table-scroll"><table><thead><tr>{headers.map(h=><th key={h}><Localized text={h}/></th>)}</tr></thead><tbody>{body}</tbody></table></div>;
 const empty=(cols:number)=><tr><td colSpan={cols}><Localized text="Pa gen done pou dat sa a."/></td></tr>;
 const resultHeaders=["Lotri","1st","2nd","3rd","Cash 3","Pick four","Pick five","Pick 3 Back","Detay"];
 const winners=(list:MonitoredTicket[])=>table(["Dat","Nimewo tikè","Montan","Pri"],list.length?list.map(t=><tr key={t.id}><td>{ticketDate(t.createdAt)}</td><td>{t.id}</td><td>{money(t.amount)}</td><td>{money(t.prize)}</td></tr>):empty(4));
 const resultValues=(name:string)=>results.find(r=>r.name===name&&r.date===selected)?.values;
 const resultTable=(list:string[])=>table(resultHeaders,list.length?list.map(name=><tr key={name}><td>{name}</td>{[0,1,2,3,4,5,6].map(i=><td key={i}>{resultValues(name)?.[i]??"—"}</td>)}<td><Button type="button" onClick={()=>setDetail(name)}><Localized text="Wè detay"/></Button></td></tr>):empty(9));
 const report=<><h2><Localized text={"Rezime lavant — "}/>{selected}</h2><p><Localized text={"Demonstrasyon • Done tès navigatè sa a sèlman."}/></p>{tab==="sales"?<><div className="sales-balance-banner"><Localized text="Balans aktyèl"/>: —</div><div className="sales-pending-banner"><Localized text="Montan tikè an atant"/>: {money(pendingAmount)}</div><table className="sales-summary"><tbody>{rows.map(([k,v])=><tr key={k}><th><Localized text={k}/></th><td><Localized text={v}/></td></tr>)}</tbody></table><p><Localized text="Balans ak komisyon poko konekte; — vle di done poko disponib."/></p><h3><Localized text={"Total pa lotri"}/></h3>{table(["Lotri","Total vann","Komisyon","Pri","Nèt"],[...groups].length?[...groups].map(([name,total])=><tr key={name}><td><button className="monitor-serial" onClick={()=>setDetail(name)}>{name}</button></td><td>{money(total)}</td><td>—</td><td>—</td><td>—</td></tr>):empty(5))}<h3><Localized text="Tikè genyen"/></h3>{winners(active.filter(t=>t.status==="winner"))}<h3><Localized text="Nimewo genyen"/></h3><p>Rezilta demonstrasyon sèlman • — vle di rezilta poko antre.</p>{resultTable(names)}</>:<><h3><Localized text={"Tranzaksyon resan"}/></h3><p>Balans ak tranzaksyon kès yo poko konekte. Lis anba a montre lavant tès yo sèlman.</p><table><thead><tr>{["Kalite","Dat","Referans","Montan","Estati"].map(x=><th key={x}><Localized text={x}/></th>)}</tr></thead><tbody>{day.map(t=><tr key={t.id}><td><Localized text={"Lavant tès"}/></td><td>{new Date(t.createdAt).toLocaleString("fr-FR")}</td><td>{t.id}</td><td>{money(t.amount)}</td><td>{t.status==="cancelled"?"Anile":"Anrejistre"}</td></tr>)}</tbody></table>{!day.length&&<p><Localized text={"Pa gen tranzaksyon tès pou dat sa a."}/></p>}</> }</>;
 function print(){setPrinting(true);setTimeout(()=>window.print(),100)}
 return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="monitor-dialog sales-dialog"><DialogHeader className="monitor-header"><DialogTitle><Localized text={"VIEW SALES"}/></DialogTitle><DialogDescription><Localized text={"Lavant ak rapò pwen vant lan"}/></DialogDescription></DialogHeader><div className="monitor-body"><form className="sales-controls" onSubmit={e=>{e.preventDefault();setSelected(date)}}><label><Localized text={"Dat"}/><Input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><Button type="submit"><Localized text={"Wè lavant"}/></Button><Button type="button" onClick={print}><Localized text={"Enprime rapò"}/></Button></form><div className="monitor-filters"><Button aria-pressed={tab==="sales"} onClick={()=>setTab("sales")}><Localized text={"Sales"}/></Button><Button aria-pressed={tab==="transactions"} onClick={()=>setTab("transactions")}><Localized text={"Transactions"}/></Button></div><div className="sales-report">{report}</div></div></DialogContent></Dialog><Dialog open={detail!==null} onOpenChange={v=>{if(!v)setDetail(null)}}><DialogContent className="sales-detail-dialog"><DialogHeader className="monitor-header"><DialogTitle>{detail}</DialogTitle><DialogDescription>{selected}</DialogDescription></DialogHeader><div className="sales-report sales-detail-body"><h3>{detail}</h3>{table(resultHeaders.slice(0,8),<tr><td>{detail}</td>{[0,1,2,3,4,5,6].map(i=><td key={i}>{resultValues(detail||"")?.[i]??"—"}</td>)}</tr>)}<p>Rezilta demonstrasyon sèlman • — vle di rezilta poko antre.</p><h3><Localized text="Detay lavant"/></h3>{table(["Kalite","Nimewo","Montan"],active.flatMap(t=>t.plays.filter(p=>p.lottery===detail)).length?active.flatMap(t=>t.plays.filter(p=>p.lottery===detail)).map((p,i)=><tr key={i}><td>{p.type}</td><td>{p.number}</td><td>{money(p.amount)}</td></tr>):empty(3))}<h3><Localized text="Tikè genyen"/></h3><p><Localized text="Pri a se total tikè a, menm si li gen plizyè lotri."/></p>{winners(active.filter(t=>t.status==="winner"&&t.plays.some(p=>p.lottery===detail)))}</div></DialogContent></Dialog>{printing&&createPortal(<div className="monitor-print"><section className="sales-report">{report}</section></div>,document.body)}</>;
}
