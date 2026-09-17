"use client";
import {useDemoState} from "@/components/demo-storage";
import {Localized} from "@/components/language-settings";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { cashSummary, moneyToCents } from "@/lib/demo-cash";
import { ticketDate, type MonitoredTicket } from "@/lib/monitoring";

const money=(cents:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
type Entry={id:string;amount:number;at:string};
type Summary=ReturnType<typeof cashSummary>;
type Closing={id:string;bank:string;seller:string;date:string;at:string;summary:Summary;rate:number};
type Ledger={rate:string;entries:Entry[]};
export function DemoCash({tickets,banks}:{tickets:MonitoredTicket[];banks:string[]}){
  const [bank,setBank]=useDemoState("demo-cash.tsx:bank",banks[0]||"");
  const [seller,setSeller]=useDemoState("demo-cash.tsx:seller","");
  const [date,setDate]=useDemoState("demo-cash.tsx:date",ticketDate(Date.now()));
  const [ledgers,setLedgers]=useDemoState<Record<string,Ledger>>("demo-cash.tsx:ledgers",{});
  const [closings,setClosings]=useDemoState<Closing[]>("demo-cash.tsx:closings",[]);
  const [amount,setAmount]=useState("");
  const [error,setError]=useState("");
  const sellers=[...new Set(tickets.filter(t=>t.bank===bank).map(t=>t.seller))];
  const selected=sellers.includes(seller)?seller:sellers[0];
  const key=JSON.stringify([bank,selected,date]);
  const ledger=ledgers[key]||{rate:"0",entries:[]};
  const closed=closings.find(c=>c.id===key);
  const rows=tickets.filter(t=>t.bank===bank&&t.seller===selected&&ticketDate(t.createdAt)===date);
  const gross=rows.reduce((s,t)=>s+Math.round(t.amount*100),0);
  const cancelled=rows.filter(t=>t.status==="cancelled").reduce((s,t)=>s+Math.round(t.amount*100),0);
  const paid=rows.filter(t=>t.status!=="cancelled"&&t.paidAt).reduce((s,t)=>s+Math.round(t.prize*100),0);
  let rate=0,invalidRate=false;
  try{rate=moneyToCents(ledger.rate);if(rate>10000)invalidRate=true;}catch{invalidRate=true;}
  const total=cashSummary(gross,cancelled,paid,invalidRate?0:rate,ledger.entries.reduce((s,e)=>s+e.amount,0));
  const summary=closed?.summary||total;
  function update(next:Ledger){setLedgers(v=>({...v,[key]:next}));setError("");}
  function remit(){
    if(closed)return;
    try{if(invalidRate)throw new Error("Komisyon an dwe ant 0 ak 100%.");const value=moneyToCents(amount);if(value<=0||value>total.balance)throw new Error("Montan remiz la dwe plis pase zewo epi pa depase balans ki rete a.");update({...ledger,entries:[...ledger.entries,{id:crypto.randomUUID(),amount:value,at:new Date().toLocaleTimeString()}]});setAmount("");}catch(e){setError((e as Error).message);}
  }
  function close(){if(closed||invalidRate)return;setClosings(v=>v.some(c=>c.id===key)?v:[...v,{id:key,bank,seller:selected,date,at:new Date().toLocaleString(),summary:{...total},rate}]);}
  function exportReport(){
    const lines=[["GESPRO — RAPÒ KÈS"],["Bank",bank],["Vandè",selected],["Dat",date],["Sous","Tikè sesyon an"],["Lavant brit",money(summary.gross)],["Anilasyon",money(summary.cancelled)],["Lavant nèt",money(summary.net)],["Komisyon",money(summary.commission)],["Gayan peye",money(summary.paid)],["Kòb remèt",money(summary.remitted)],["Balans",money(summary.balance)],["Estati",closed?"Fèmen — foto kalkil lè fèmti":"Ouvè"]];
    const csv="\ufeff"+lines.map(r=>r.map(x=>'"'+(/^[=+@-]/.test(x)?"'":"")+x.replaceAll('"','""')+'"').join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`gespro-kes-${date}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="panel demo-cash-panel">
    <h2>Kès, komisyon ak fèmti jounen</h2>
    <p className="demo-cash-notice"><b>Kès ak komisyon.</b> Done yo sove sou sèvè a. Telechaje rapò a pou kenbe yon kopi.</p>
    <div className="demo-cash-controls">
      <label><Localized text={"Bank"}/><select value={bank} onChange={e=>{setBank(e.target.value);setSeller("");setError("");}}>{banks.map(b=><option key={b}>{b}</option>)}</select></label>
      <label><Localized text={"Vandè"}/><select value={selected} onChange={e=>{setSeller(e.target.value);setError("");}}>{sellers.map(s=><option key={s}>{s}</option>)}</select></label>
      <label><Localized text={"Jou"}/><Input type="date" value={date} onChange={e=>{if(e.target.value)setDate(e.target.value);setError("");}}/></label>
    </div>
<<<<<<< HEAD
    {example&&<p></p>}
=======
>>>>>>> 655495d04c152457f4a5f8b81ada300d4b352e9b
    <label className="form-label">Komisyon sou lavant nèt (%)<Input value={ledger.rate} disabled={!!closed} inputMode="decimal" onChange={e=>update({...ledger,rate:e.target.value})}/></label>
    <p>Lavant nèt = lavant brit − tikè anile. Balans = lavant nèt − komisyon − gayan peye − kòb remèt.</p>
    {invalidRate&&<p role="alert" className="demo-cash-error">Komisyon an dwe ant 0 ak 100%.</p>}
    <div className="demo-cash-stats">{[["Lavant brit",summary.gross],["Tikè anile",summary.cancelled],["Lavant nèt",summary.net],["Komisyon",summary.commission],["Gayan peye",summary.paid],["Kòb remèt",summary.remitted],[summary.balance<0?"Bank dwe vandè":"Vandè dwe bank",Math.abs(summary.balance)]].map(([label,value])=><article key={label}><span>{label}</span><b>{money(Number(value))}</b></article>)}</div>
    {closed?<p className="demo-cash-notice">Rapò sa a fèmen depi {closed.at}. Kalkil sa a konsève valè ki te la lè fèmti a; nouvo tikè pa antre ladan l.</p>:<div className="demo-cash-remit"><label>Montan remiz<Input value={amount} inputMode="decimal" placeholder="0.00" onChange={e=>setAmount(e.target.value)}/></label><Button onClick={remit} disabled={invalidRate||total.balance<=0}>Anrejistre remiz</Button></div>}
    {error&&<p role="alert" className="demo-cash-error">{error}</p>}
    <div className="table-scroll"><table><thead><tr><th><Localized text={"Lè"}/></th><th>Remiz</th></tr></thead><tbody>{ledger.entries.map(e=><tr key={e.id}><td>{e.at}</td><td>{money(e.amount)}</td></tr>)}{!ledger.entries.length&&<tr><td colSpan={2}>Pa gen remiz pou seleksyon sa a.</td></tr>}</tbody></table></div>
    <div className="demo-cash-actions"><Button variant="outline" onClick={exportReport} disabled={invalidRate}>Telechaje rapò</Button><AlertDialog><AlertDialogTrigger asChild><Button disabled={!!closed||invalidRate}>Fèmen jounen</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Fèmen rapò sa a?</AlertDialogTitle><AlertDialogDescription>{bank} — {selected} — {date}. Balans: {money(total.balance)}. Rapò sa a ap konsève kalkil aktyèl la.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Localized text={"Retounen"}/></AlertDialogCancel><AlertDialogAction onClick={close}>Konfime fèmti</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
    <h3>Istorik fèmti</h3><div className="table-scroll"><table><thead><tr><th><Localized text={"Bank"}/></th><th><Localized text={"Vandè"}/></th><th><Localized text={"Jou"}/></th><th><Localized text={"Balans"}/></th></tr></thead><tbody>{closings.filter(c=>c.bank===bank).map(c=><tr key={c.id}><td>{c.bank}</td><td>{c.seller}</td><td>{c.date}</td><td>{money(c.summary.balance)}</td></tr>)}{!closings.some(c=>c.bank===bank)&&<tr><td colSpan={4}>Pa gen fèmti pou bank sa a.</td></tr>}</tbody></table></div>
  </section>;
<<<<<<< HEAD
}
=======
}
>>>>>>> 655495d04c152457f4a5f8b81ada300d4b352e9b
