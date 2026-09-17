"use client";
import {isMobileTicket} from "@/components/ticket-share";
import {Localized} from "@/components/language-settings";
import {useEffect,useState} from "react";
import {Printer,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from "@/components/ui/alert-dialog";
import {canCancel,type MonitoredTicket} from "@/lib/monitoring";
import {TicketPrintout} from "@/components/monitoring";

export function TicketActions({tickets,bank,onCancel,onError,serverBacked=false}:{serverBacked?:boolean;tickets:MonitoredTicket[];bank:string;onCancel:(id:string)=>boolean|Promise<boolean>;onError:(message:string)=>void}){
  const [selected,setSelected]=useState("");
  const [confirm,setConfirm]=useState(false);
  const [now,setNow]=useState(Date.now());
  const [printing,setPrinting]=useState<MonitoredTicket[]>([]);
  const rows=tickets.filter(t=>t.bank===bank).sort((a,b)=>b.createdAt-a.createdAt);
  const ticket=rows.find(t=>t.id===selected)??rows[0];
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  useEffect(()=>{
    if(!printing.length)return;
    const clear=()=>setPrinting([]);
    const timer=setTimeout(()=>{try{if(!isMobileTicket())window.print()}catch{onError("Enpresyon an pa disponib. Eseye ankò.");clear()}},100);
    window.addEventListener("afterprint",clear);
    return()=>{clearTimeout(timer);window.removeEventListener("afterprint",clear)};
  },[printing]);
  const eligible=(t:MonitoredTicket)=>serverBacked?t.status==="pending"&&!t.paidAt:canCancel(t,now);
  async function cancel(){
    if(!ticket||!eligible(ticket)||!await onCancel(ticket.id))onError("Anilasyon refize: delè a pase oswa fich la pa ka anile.");
    else onError("");
    setConfirm(false);
  }
  return <>
    <div className="bank-ticket-actions">
      <select aria-label="Fich bank lan" value={ticket?.id??""} disabled={!rows.length} onChange={e=>{setSelected(e.target.value);onError("")}}>
        {!rows.length&&<option value=""><Localized text={"Pa gen fich ankò"}/></option>}
        {rows.map(t=><option key={t.id} value={t.id}>{t.id} — ${t.amount.toFixed(2)}{t.status==="cancelled"?" — Anile":""}</option>)}
      </select>
      <Button variant="ghost" aria-label="Anile fich chwazi a" title={ticket&&eligible(ticket)?"Anile fich":"Delè pase oswa fich pa ka anile"} disabled={!ticket||!eligible(ticket)} onClick={()=>setConfirm(true)}><Trash2 /></Button>
      <Button variant="ghost" aria-label="Reenprime fich chwazi a" title="Reenprime fich" disabled={!ticket} onClick={()=>{if(ticket){onError("");setPrinting([ticket])}}}><Printer /></Button>
    </div>
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle><Localized text={"Anile fich sa a?"}/></AlertDialogTitle><AlertDialogDescription>{ticket?.id} — ${ticket?.amount.toFixed(2)}. Fich la ap rete nan istorik la kòm anile.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Localized text={"Retounen"}/></AlertDialogCancel><AlertDialogAction onClick={cancel}><Localized text={"Konfime anilasyon"}/></AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <TicketPrintout tickets={printing}/>
  </>;
}
