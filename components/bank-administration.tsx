"use client";
import {useDemoState} from "@/components/demo-storage";
import {Localized} from "@/components/language-settings";
import { LotteryManagement, type LotteryState } from "@/components/lottery-management";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { MonitoredTicket } from "@/lib/monitoring";
import { ticketDate } from "@/lib/monitoring";

type Supervisor = { id:string; bank:string; name:string };
type Point = { id:string; bank:string; name:string; supervisorId:string|null };
export type BankManagement = { supervisors:Supervisor[]; points:Point[] };
export const initialBankManagement: BankManagement = {
  supervisors:[{id:"jp-supervisor-1",bank:"JP Bòlèt",name:"Sipèvizè JP — Démo"},{id:"sol-supervisor-1",bank:"Solange Lotto",name:"Sipèvizè Solange — Démo"}],
  points:[{id:"jp-pos-1",bank:"JP Bòlèt",name:"PDV Jean Pierre",supervisorId:"jp-supervisor-1"},{id:"jp-pos-2",bank:"JP Bòlèt",name:"PDV JP 2",supervisorId:null},{id:"sol-pos-1",bank:"Solange Lotto",name:"PDV Solange",supervisorId:"sol-supervisor-1"}]
};
export function scopedPoints(data:BankManagement, bank:string, supervisorId?:string) {
  return data.points.filter(point=>point.bank===bank&&(!supervisorId||point.supervisorId===supervisorId));
}
export function BankAdministration({section,banks,data,onChange,tickets,identity,setIdentity,lotteryState,setLotteryState}:{
  lotteryState:LotteryState;setLotteryState:(state:LotteryState)=>void;
  section:string; banks:{name:string;lottery:string}[];data:BankManagement;onChange:(data:BankManagement)=>void;
  tickets:MonitoredTicket[];identity:string;setIdentity:(value:string)=>void;
}) {
  const [selectedBank,setSelectedBank]=useDemoState("bank-administration.tsx:selectedBank",banks[0]?.lottery??"");
  const [name,setName]=useState("");
  const [assignTo,setAssignTo]=useState("");
  const [message,setMessage]=useState("");
  const [from,setFrom]=useDemoState("bank-administration.tsx:from",()=>ticketDate(Date.now()));
  const [to,setTo]=useDemoState("bank-administration.tsx:to",()=>ticketDate(Date.now()));
  const supervisor=data.supervisors.find(item=>"supervisor:"+item.id===identity);
  const owner=banks.find(item=>"owner:"+item.lottery===identity);
  const isSuper=identity==="super";
  const bank=supervisor?.bank??owner?.lottery??(isSuper?selectedBank:"");
  const canManage=isSuper||Boolean(owner);
  const points=scopedPoints(data,bank,supervisor?.id);
  const ids=new Set(points.map(point=>point.id));
  const scoped=tickets.filter(ticket=>ticket.bank===bank&&Boolean(ticket.pointOfSaleId)&&ids.has(ticket.pointOfSaleId!));
  const rows=scoped.filter(ticket=>ticketDate(ticket.createdAt)>=from&&ticketDate(ticket.createdAt)<=to);
  const sold=rows.filter(ticket=>ticket.status!=="cancelled");
  const total=sold.reduce((sum,ticket)=>sum+ticket.amount,0);
  const localSupervisors=data.supervisors.filter(item=>item.bank===bank);
  const view=canManage?section:"Tablo bank";
  function add(kind:"supervisor"|"point") {
    if(!canManage||!bank||!name.trim())return;
    if((kind==="supervisor"?localSupervisors:points).some(item=>item.name.toLowerCase()===name.trim().toLowerCase())){setMessage("Non sa a deja egziste nan bank la.");return}
    const id=kind+"-"+Date.now()+"-"+(data.points.length+data.supervisors.length);
    onChange(kind==="supervisor"?{...data,supervisors:[...data.supervisors,{id,bank,name:name.trim()}]}:{...data,points:[...data.points,{id,bank,name:name.trim(),supervisorId:null}]});
    setName("");setMessage("Ajoute nan demonstrasyon bank "+bank+".");
  }
  function assign(point:Point,checked:boolean) {
    if(!canManage||point.bank!==bank||!localSupervisors.some(item=>item.id===assignTo))return;
    onChange({...data,points:data.points.map(item=>item.id===point.id?{...item,supervisorId:checked?assignTo:null}:item)});
    setMessage("Afektasyon pwen vant yo mete ajou nan sesyon sa a.");
  }
  return <section className="panel bank-admin-panel">
    <p className="bank-demo">Demonstrasyon • Kont, afektasyon ak lavant yo rete nan sesyon an. Separasyon sa a poko yon kontwòl aksè backend.</p>
    <div className="bank-context">
      <label>Aperçu kont<select value={identity} onChange={event=>{setIdentity(event.target.value);setName("");setMessage("");setAssignTo("")}}>
        <option value="super">Super Admin</option>{banks.map(item=><option key={item.lottery} value={"owner:"+item.lottery}>Mèt Bòlèt — {item.lottery}</option>)}{data.supervisors.map(item=><option key={item.id} value={"supervisor:"+item.id}>{item.name} — {item.bank}</option>)}
      </select></label>
      {isSuper&&<label><Localized text={"Bank"}/><select value={selectedBank} onChange={event=>{setSelectedBank(event.target.value);setAssignTo("");setName("");setMessage("")}}>{banks.map(item=><option key={item.lottery}>{item.lottery}</option>)}</select></label>}
      <div><strong>{bank||"Pa gen bank"}</strong><small>{supervisor?"Sipèvizè • Lavant pwen vant ki afekte yo sèlman":owner?"Mèt Bòlèt • Pwòp bank li":"Super Admin • Bank chwazi a"}</small></div>
    </div>
    <h2>{view}</h2>{message&&<p role="status">{message}</p>}
    {view==="Lotri"?<LotteryManagement key={bank+identity} bank={bank} isSuper={isSuper} management={data} state={lotteryState} onChange={setLotteryState}/>: ["Tablo bank","PDV Transactions"].includes(view)?<>
      <div className="bank-context"><label><Localized text={"Dat kòmansman"}/><Input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label><Localized text={"Dat fen"}/><Input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label></div>
      {from>to?<p role="alert">Dat kòmansman dwe vini anvan dat fen.</p>:<>
        <div className="bank-stats"><article><span><Localized text={"Total lavant"}/></span><strong>${total.toFixed(2)}</strong></article><article><span>Tikè ki pa anile</span><strong>{sold.length}</strong></article><article><span>Pwen vant vizib</span><strong>{points.length}</strong></article></div>
        <div className="table-scroll"><table className="bank-table"><thead><tr><th><Localized text={"Pwen vant"}/></th><th><Localized text={"Tikè"}/></th><th><Localized text={"Lavant"}/></th></tr></thead><tbody>{points.map(point=>{const sales=sold.filter(ticket=>ticket.pointOfSaleId===point.id);return <tr key={point.id}><td>{point.name}</td><td>{sales.length}</td><td>${sales.reduce((sum,ticket)=>sum+ticket.amount,0).toFixed(2)}</td></tr>})}</tbody></table></div>
        {!points.length&&<p>Okenn pwen vant pa afekte ak kont sa a.</p>}
        {view==="PDV Transactions"&&<div className="table-scroll"><table className="bank-table"><thead><tr><th><Localized text={"Tikè"}/></th><th><Localized text={"Vandè"}/></th><th><Localized text={"Montan"}/></th><th><Localized text={"Estati"}/></th></tr></thead><tbody>{rows.map(ticket=><tr key={ticket.id}><td>{ticket.id}</td><td>{ticket.seller}</td><td>${ticket.amount.toFixed(2)}</td><td>{ticket.status}</td></tr>)}</tbody></table>{!rows.length&&<p>Pa gen lavant nan peryòd sa a.</p>}</div>}
      </>}
    </>:["Administratè","Sipèvizè"].includes(view)?<>
      <p>{banks.find(item=>item.lottery===bank)?.name} — Mèt Bòlèt</p>
      <form className="bank-add" onSubmit={event=>{event.preventDefault();add("supervisor")}}><label>Non sipèvizè<Input value={name} onChange={event=>setName(event.target.value)} required/></label><Button type="submit">Ajoute sipèvizè</Button></form>
      <div className="table-scroll"><table className="bank-table"><thead><tr><th><Localized text={"Sipèvizè"}/></th><th>Pwen vant afekte</th><th>Aksè</th></tr></thead><tbody>{localSupervisors.map(item=><tr key={item.id}><td>{item.name}</td><td>{scopedPoints(data,bank,item.id).map(point=>point.name).join(", ")||"Okenn"}</td><td>Lavant sèlman</td></tr>)}</tbody></table></div>
    </>:view==="Pwen vant"?<>
      <form className="bank-add" onSubmit={event=>{event.preventDefault();add("point")}}><label>Non pwen vant<Input required value={name} onChange={event=>setName(event.target.value)}/></label><Button type="submit">Ajoute pwen vant</Button></form>
      <label className="bank-assign">Afekte pwen vant ak<select value={assignTo} onChange={event=>setAssignTo(event.target.value)}><option value="">Chwazi sipèvizè</option>{localSupervisors.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <p>Chak pwen vant gen yon sipèvizè. Yon nouvo afektasyon ranplase ansyen an.</p>
      <div className="bank-point-list">{points.map(point=><label key={point.id}><Checkbox disabled={!assignTo} checked={Boolean(assignTo)&&point.supervisorId===assignTo} onCheckedChange={checked=>assign(point,checked===true)}/><span><b>{point.name}</b><small>{localSupervisors.find(item=>item.id===point.supervisorId)?.name||"Poko afekte"}</small></span></label>)}</div>
    </>:view==="Consortium"?<div className="bank-point-list">{(isSuper?banks:banks.filter(item=>item.lottery===bank)).map(item=><article key={item.lottery}><h3>{item.lottery}</h3><p>{item.name}</p></article>)}</div>:<p className="bank-empty">{view==="Rezilta tiraj"?"Pa gen rezilta tiraj konekte pou bank sa a.":view==="Piblikasyon tiraj"?"Piblikasyon rezilta poko konekte.":"Konfigirasyon lotri bank la poko konekte."}</p>}
  </section>;
}
