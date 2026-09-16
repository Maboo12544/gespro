"use client";
import {scheduleTicketPrint} from "@/lib/print-ticket";
import {isMobileTicket,TicketShare} from "@/components/ticket-share";
import {TicketReceipt} from "@/components/ticket-receipt";
import {useDemoState} from "@/components/demo-storage";
import {Localized} from "@/components/language-settings";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { canCancel, periodTickets, ticketDate, ticketTotals, type MonitoredTicket } from "@/lib/monitoring";

const money = (value: number) => "$" + value.toFixed(2);
const stamp = (time?: number) => time ? new Date(time).toLocaleString("fr-FR") : "—";
const statusName = (ticket: MonitoredTicket) => ticket.status === "cancelled" ? "Anile" : ticket.paidAt ? "Peye" : ticket.status === "winner" ? "Gayan" : ticket.status === "loser" ? "Pèdi" : "An atant";
const filters = ["Tout", "Gayan", "Peman annatant", "Peye", "An atant", "Pèdi", "Anile"] as const;
type Filter = typeof filters[number];
const matches = (ticket: MonitoredTicket, filter: Filter) => filter === "Tout" || (filter === "Gayan" ? ticket.status === "winner" : filter === "Peman annatant" ? ticket.status === "winner" && !ticket.paidAt : statusName(ticket) === filter);

export function Monitoring({ open, onOpenChange, tickets, onCancel, initialRange, title, serverBacked=false, allowCancel=true }: { serverBacked?:boolean;allowCancel?:boolean;initialRange?: {from:string;to:string}; title?:string; open: boolean; onOpenChange: (open: boolean) => void; tickets: MonitoredTicket[]; onCancel: (id: string) => boolean|Promise<boolean> }) {
  const [from,setFrom] = useDemoState("monitoring.tsx:from",() => ticketDate(Date.now()));
  const [to,setTo] = useDemoState("monitoring.tsx:to",() => ticketDate(Date.now()));
  const [range,setRange] = useDemoState("monitoring.tsx:range",() => ({from:ticketDate(Date.now()),to:ticketDate(Date.now())}));
  const [filter,setFilter] = useDemoState<Filter>("monitoring.tsx:filter","Tout");
  const [search,setSearch] = useState("");
  const [message,setMessage] = useState("");
  const [selected,setSelected] = useState<string|null>(null);
  const [confirm,setConfirm] = useState(false);
  const [now,setNow] = useState(Date.now());
  const [printTickets,setPrintTickets] = useState<MonitoredTicket[]>([]);
  useEffect(() => { if (!open) return; setNow(Date.now()); const timer=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(timer); },[open]);
  useEffect(() => {
    if (!printTickets.length) return;
    const cancelPrint=isMobileTicket()?()=>{}:scheduleTicketPrint(()=>setPrintTickets([]));
    const clear=()=>setPrintTickets([]);
    window.addEventListener("afterprint",clear);
    return ()=>{cancelPrint();window.removeEventListener("afterprint",clear)};
  },[printTickets]);
  useEffect(()=>{if(open&&initialRange){setFrom(initialRange.from);setTo(initialRange.to);setRange(initialRange);setFilter("Tout");setSearch("");setSelected(null);setConfirm(false);setMessage("")}},[open,initialRange?.from,initialRange?.to]);
  const period = periodTickets(tickets,range.from,range.to);
  const totals = ticketTotals(period);
  const rows = period.filter(ticket=>matches(ticket,filter) && (ticket.id+" "+ticket.seller).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.createdAt-a.createdAt);
  const detail = tickets.find(ticket=>ticket.id===selected);
  const pending = period.filter(ticket=>matches(ticket,"Peman annatant"));
  const eligible=(ticket:MonitoredTicket)=>allowCancel&&(serverBacked?ticket.status==="pending"&&!ticket.paidAt:canCancel(ticket,now));
  async function cancel(ticket: MonitoredTicket) {
    if (!eligible(ticket) || !await onCancel(ticket.id)) {setMessage("Anilasyon refize: delè a pase oswa estati tikè a chanje.");setConfirm(false);return}
    setMessage("");setConfirm(false);
  }
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="monitor-dialog"><DialogHeader className="monitor-header"><DialogTitle><Localized text={title||"MONITORING"}/></DialogTitle><DialogDescription>Tikè ak lavant pwen vant lan</DialogDescription></DialogHeader>
      <div className="monitor-body">
        <p className="monitor-demo">{serverBacked?"Tikè tès sou sèvè • Anilasyon verifye ak lè sèvè a. Pa gen peman reyèl.":"Demonstrasyon • Tikè navigatè sa a sèlman. Lè yo itilize lè aparèy la."}</p>
        <div className="monitor-top">
          <form onSubmit={event=>{event.preventDefault();if(!from||!to||from>to){setMessage("Chwazi yon peryòd dat ki valab.");return}setRange({from,to});setMessage("")}} className="monitor-dates">
            <label><Localized text={"Dat kòmansman"}/><Input type="date" required value={from} onChange={event=>setFrom(event.target.value)} /></label><label><Localized text={"Dat fen"}/><Input type="date" required value={to} onChange={event=>setTo(event.target.value)} /></label><Button type="submit" className="primary-action"><Localized text={"Chèche"}/></Button>
          </form>
          <aside className="monitor-totals"><span><Localized text={"Total lavant "}/><b>{money(totals.amount)}</b></span><span><Localized text={"Total pri "}/><b>{money(totals.prize)}</b></span><span><Localized text={"Peman annatant "}/><b>{money(totals.pending)}</b></span><small>Peryòd chwazi a • Tikè anile pa ladan</small></aside>
        </div>
        <div className="monitor-filters" role="group" aria-label="Filtre tikè yo">{filters.map(item=><Button key={item} variant={filter===item?"default":"outline"} aria-pressed={filter===item} onClick={()=>setFilter(item)}><Localized text={item}/> ({period.filter(ticket=>matches(ticket,item)).length})</Button>)}</div>
        <div className="monitor-tools"><Button variant="outline" disabled={!pending.length} onClick={()=>setPrintTickets(pending)}><Printer /><Localized text={" Enprime peman annatant"}/></Button><label><Localized text={"Rechèch"}/><Input placeholder="Nimewo tikè oswa vandè" value={search} onChange={event=>setSearch(event.target.value)} /></label></div>
        {message&&<p className="notice error-notice" role="alert"><Localized text={message}/></p>}
        <div className={detail?"monitor-results with-detail":"monitor-results"}><div className="monitor-table-scroll"><table className="monitor-table"><thead><tr>{["Nimewo tikè","Dat","Vann pa","Montan","Pri","Dat anilasyon","Dat peman","Peye pa","Anile pa","Estati","Aksyon"].map(label=><th key={label} scope="col"><Localized text={label}/></th>)}</tr></thead><tbody>{rows.map(ticket=><tr key={ticket.id}>
          <td><button className="monitor-serial" onClick={()=>{setSelected(ticket.id);setConfirm(false)}}>{ticket.id}</button></td><td>{stamp(ticket.createdAt)}</td><td>{ticket.seller}</td><td>{money(ticket.amount)}</td><td>{money(ticket.prize)}</td><td>{stamp(ticket.cancelledAt)}</td><td>{stamp(ticket.paidAt)}</td><td>{ticket.paidBy||"—"}</td><td>{ticket.cancelledBy||"—"}</td><td><span className={"monitor-status "+ticket.status}><Localized text={statusName(ticket)}/></span></td>
          <td><div className="monitor-row-actions"><Button variant="ghost" aria-label={"Enprime "+ticket.id} onClick={()=>setPrintTickets([ticket])}><Printer /></Button><Button variant="ghost" disabled={!eligible(ticket)} title={eligible(ticket)?"Anile tikè":"Delè pase oswa tikè pa an atant"} aria-label={"Anile "+ticket.id} onClick={()=>{setSelected(ticket.id);setConfirm(true)}}><Trash2 /></Button></div></td>
        </tr>)}</tbody></table>{!rows.length&&<p className="monitor-empty"><Localized text={"Pa gen tikè pou rechèch sa a."}/></p>}</div>
{detail&&<aside className="monitor-detail"><header><h3><Localized text={"Detay tikè"}/></h3><Button variant="ghost" aria-label="Fèmen detay tikè" onClick={()=>{setSelected(null);setConfirm(false)}}>×</Button></header><h4>{detail.id}</h4><p>{statusName(detail)} • Demonstrasyon</p>
      <p>{stamp(detail.createdAt)} — {detail.seller}</p><div className="monitor-detail-plays">{detail.plays.map((play,index)=><p key={index}><span>{play.lottery} • {play.type} • <b>{play.number}</b></span><strong>{money(play.amount)}</strong></p>)}</div><p>Total: <b>{money(detail.amount)}</b> • Pri: <b>{money(detail.prize)}</b></p>
      <p><Localized text={"Delè anilasyon: "}/>{stamp(detail.cancelUntil)}</p>
      {confirm&&<p>Konfime anilasyon tikè sa a? Li ap rete nan istorik la kòm anile.</p>}
      <div className="monitor-row-actions"><Button variant="outline" onClick={()=>setPrintTickets([detail])}><Printer /><Localized text={" Enprime"}/></Button><Button disabled={!eligible(detail)} onClick={()=>confirm?cancel(detail):setConfirm(true)}>{confirm?"Konfime anilasyon":"Anile tikè"}</Button>{confirm&&<Button variant="outline" onClick={()=>setConfirm(false)}><Localized text={"Retounen"}/></Button>}</div>
    </aside>}
</div>
      </div>
    </DialogContent></Dialog>
    <TicketPrintout tickets={printTickets}/>
  </>;
}

export function TicketPrintout({tickets,copy=true}:{tickets:MonitoredTicket[];copy?:boolean}){
  return <>
    {tickets.length>0&&createPortal(<div className="monitor-print">{tickets.map(ticket=><div className="ticket-preview-item" key={ticket.id}><TicketShare ticket={ticket} copy={copy}/><TicketReceipt ticket={ticket} copy={copy}/></div>)}</div>,document.body)}
  </>;
}
