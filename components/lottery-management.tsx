"use client";
import {Localized} from "@/components/language-settings";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {LotteryBulk,type LotteryLimit} from "@/components/lottery-bulk";
import {PayoutSettings,defaultPayoutRates,type PayoutRates} from "@/components/payout-settings";
import type {BankManagement} from "@/components/bank-administration";
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from "@/components/ui/alert-dialog";
export type LotteryItem={resultMode?:"pick2"|"massachusetts4"|"dominican3"|"pending";id:string;name:string;bank:string|null};
export type LotteryState={closingTimes?:Record<string,import("@/components/lottery-countdown").ClosingSchedule>;results?:import("@/components/draw-results").DrawResult[];items:LotteryItem[];removed:Record<string,boolean>;rates:Record<string,PayoutRates>;limits?:LotteryLimit[];posLayout?:import("@/components/desktop-model-previews").PosLayout};
export const initialLotteryState:LotteryState={items:[...["FL PICK 2 AM","FLORIDA AM","NEW YORK AM","GEORGIA EVENING","FL PICK 2 PM","FLORIDA PM","GEORGIA MIDDAY","NEW YORK PM"].map((name,i)=>({id:"lottery-"+i,name,bank:null})),{id:"lottery-ma-even",name:"MASSACHUSETTS EVENING",bank:null,resultMode:"massachusetts4"} as LotteryItem],removed:{},rates:{}};
const rateKey=(lottery:string,bank:string,scope:string)=>JSON.stringify([lottery,bank,scope]);
export function resolveLotteryRates(state:LotteryState,lottery:string,bank:string,scope:string,supervisorId?:string){
 const scopes=[scope,...(scope.startsWith("pos:")&&supervisorId?["supervisor:"+supervisorId]:[]),"admin","bank"];
 for(const key of [...new Set(scopes)]){const value=state.rates[rateKey(lottery,bank,key)];if(value)return value}
 return state.rates[rateKey(lottery,"*","bank")]??(state.items.find(i=>i.id===lottery)?.resultMode==="dominican3"?Object.fromEntries(Object.keys(defaultPayoutRates()).map(k=>[k,"0.00"])):defaultPayoutRates());
}
export function LotteryManagement({bank,isSuper,management,state,onChange}:{bank:string;isSuper:boolean;management:BankManagement;state:LotteryState;onChange:(state:LotteryState)=>void}){
 const [newMode,setNewMode]=useState<NonNullable<LotteryItem["resultMode"]>|"">("");
 const [testOpen,setTestOpen]=useState<Record<string,boolean>>({});const [query,setQuery]=useState("");const [name,setName]=useState("");const [selected,setSelected]=useState("");const [scope,setScope]=useState("bank");const [allBanks,setAllBanks]=useState(false);const [pending,setPending]=useState<LotteryItem|null>(null);const [message,setMessage]=useState("");
 const target=isSuper&&allBanks?"*":bank;
 const available=state.items.filter(item=>(!item.bank||item.bank===bank)&&!state.removed[rateKey(item.id,target,"removed")]);
 const item=available.find(item=>item.id===selected);
 const points=management.points.filter(point=>point.bank===bank);const supervisors=management.supervisors.filter(s=>s.bank===bank);
 const validScope=scope==="bank"||scope==="admin"||supervisors.some(s=>scope==="supervisor:"+s.id)||points.some(p=>scope==="pos:"+p.id);
 const activeScope=target==="*"?"bank":validScope?scope:"bank";
 const supervisorId=points.find(p=>activeScope==="pos:"+p.id)?.supervisorId??undefined;
 const rates=item?resolveLotteryRates(state,item.id,target,activeScope,supervisorId):defaultPayoutRates();
 const key=item?rateKey(item.id,target,activeScope):"";
 function add(){
  const value=name.trim().replace(/\s+/g," ").toUpperCase();if(!value||!target)return;
  const existing=state.items.find(i=>i.name===value&&(!i.bank||i.bank===bank));
  if(existing){const removedKey=rateKey(existing.id,target,"removed");if(state.removed[removedKey]){onChange({...state,removed:{...state.removed,[removedKey]:false}});setSelected(existing.id);setName("");setMessage("Tiraj la disponib ankò.")}else setMessage("Tiraj sa a deja disponib.");return}
  const id="lottery-"+Date.now()+"-"+state.items.length;
  onChange({...state,items:[...state.items,{id,name:value,bank:target==="*"?null:bank,...newMode?{resultMode:newMode}:{}}]});setSelected(id);setName("");setMessage("Tiraj ajoute. Anrejistre konfigirasyon bank la pou aktive li nan POS yo.");
 }
 function remove(){if(!pending)return;
  // Removing availability keeps historical entries and payout configurations intact.
  onChange({...state,removed:{...state.removed,[rateKey(pending.id,target,"removed")]:true}});setPending(null);if(selected===pending.id)setSelected("");setMessage("Tiraj la retire nan lis chwazi a. Istorik li konsève.");
 }
 return <div className="lottery-management">
  <LotteryBulk key={bank} bank={bank} state={state} onChange={onChange} management={management}/>
  <div className="bank-context">{isSuper&&<label>Aplike pou<select value={allBanks?"all":"bank"} onChange={e=>{setAllBanks(e.target.value==="all");setSelected("");setScope("bank");setMessage("")}}><option value="bank">Bank chwazi a — {bank}</option><option value="all">Tout bank yo</option></select></label>}
  <label>Chèche tiraj<Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Non lotri / tiraj"/></label></div>
  <form className="bank-add" onSubmit={e=>{e.preventDefault();add()}}><label>Nouvo tiraj<Input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Egzanp: GEORGIA MIDDAY"/></label><label>Fòma tiraj<select value={newMode} onChange={e=>setNewMode(e.target.value as typeof newMode)}><option value="">Bòlèt 3 + 2 + 2</option><option value="pick2">Pick 2 — 2 chif</option><option value="massachusetts4">Massachusetts — 4 chif</option><option value="dominican3">Dominiken — 3 boul de chif</option><option value="pending">Règ pou konfime (pa vann)</option></select></label><Button className="primary-action" type="submit">Ajoute tiraj</Button></form>
  {message&&<p role="status">{message}</p>}
  <div className="table-scroll"><table className="bank-table"><thead><tr><th>Tiraj disponib</th><th>Lè fèmti chak jou</th><th><Localized text={"Aksyon"}/></th></tr></thead><tbody>{available.filter(i=>(target!=="*"||!i.bank)&&i.name.toLowerCase().includes(query.toLowerCase())&&!state.removed[rateKey(i.id,"*","removed")]).map(i=><tr key={i.id}><td>{i.name}{i.resultMode==="dominican3"&&<small style={{display:"block"}}>RD • Quiniela / Palé / Tripleta • Rezilta: 00–99 × 3</small>}</td><td><input type="time" aria-label={`Lè fèmti ${i.name}`} value={state.closingTimes?.[rateKey(i.id,target,"closing")]?.time??""} onChange={e=>onChange({...state,closingTimes:{...state.closingTimes,[rateKey(i.id,target,"closing")]:{time:e.target.value,zone:state.closingTimes?.[rateKey(i.id,target,"closing")]?.zone??(i.resultMode==="dominican3"?"America/Santo_Domingo":"America/New_York")}}})}/><select aria-label={`Zòn lè ${i.name}`} value={state.closingTimes?.[rateKey(i.id,target,"closing")]?.zone??(i.resultMode==="dominican3"?"America/Santo_Domingo":"America/New_York")} onChange={e=>onChange({...state,closingTimes:{...state.closingTimes,[rateKey(i.id,target,"closing")]:{time:state.closingTimes?.[rateKey(i.id,target,"closing")]?.time??"",zone:e.target.value}}})}><option value="America/Santo_Domingo">Repiblik Dominikèn</option><option value="America/New_York">New York / Miami</option><option value="America/Port-au-Prince">Ayiti</option><option value="America/Chicago">Chicago / Texas</option></select></td><td><div className="lottery-actions"><label className="test-open-control">Test Open <Switch checked={!!testOpen[i.id]} onCheckedChange={async (enabled:boolean)=>{if(!isSuper){setMessage("Super Admin sèlman ka itilize Test Open.");return}const bankId=bank==="mabooloto"?"e4637530-0d1c-472f-b1a4-fc14eed3a61e":"";if(!bankId){setMessage("Bank la pa konekte ak backend la.");return}const r=await fetch("/api/gespro/test-open",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bankId,lotteryId:i.id,enabled})});if(r.ok){setTestOpen((v:Record<string,boolean>)=>({...v,[i.id]:enabled}));setMessage(enabled?"TEST OPEN aktive pou tiraj sa a.":"TEST OPEN dezaktive; closing nòmal retounen.")}else setMessage("Test Open pa ka modifye.")}}/></label><Button variant="outline" onClick={()=>{setSelected(i.id);setMessage("")}}>Peman / Payout</Button><Button variant="outline" onClick={()=>setPending(i)}>Retire tiraj</Button></div></td></tr>)}</tbody></table></div>
  {!available.some(i=>(target!=="*"||!i.bank)&&i.name.toLowerCase().includes(query.toLowerCase())&&!state.removed[rateKey(i.id,"*","removed")])&&<p>Pa gen tiraj ki koresponn. Ou ka ajoute youn anlè a.</p>}
  {item&&!state.removed[rateKey(item.id,"*","removed")]&&<div className="lottery-payout"><h3>{item.name}</h3>
   {target!=="*"&&<label className="bank-assign">Konfigirasyon pou<select value={activeScope} onChange={e=>setScope(e.target.value)}><option value="bank">Tout bank — {bank}</option><option value="admin">Administratè bank la</option>{supervisors.map(s=><option key={s.id} value={"supervisor:"+s.id}>Sipèvizè — {s.name}</option>)}{points.map(p=><option key={p.id} value={"pos:"+p.id}>Pwen vant — {p.name}</option>)}</select></label>}
   <p className="payout-note">Pri espesifik pwen vant la pase anvan sipèvizè, administratè, bank, epi tarif tout bank yo. Se Super Admin ak Mèt Bòlèt ki modifye yo.</p>
   <PayoutSettings dominican={item.resultMode==="dominican3"} key={key+JSON.stringify(rates)} bank={item.name+" • "+(target==="*"?"Tout bank yo":bank)+" • "+activeScope} rates={rates} onSave={value=>onChange({...state,rates:{...state.rates,[key]:value}})}/>
   {state.rates[key]&&<Button variant="outline" onClick={()=>{const next={...state.rates};delete next[key];onChange({...state,rates:next});setMessage("Tarif espesifik retire; tarif nivo anlè a retabli nan konfigirasyon an.")}}>Retounen nan tarif nivo anlè a</Button>}
  </div>}
  <AlertDialog open={Boolean(pending)} onOpenChange={open=>{if(!open)setPending(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle><Localized text={"Retire "}/>{pending?.name}?</AlertDialogTitle><AlertDialogDescription>Tiraj la pap parèt nan lis {target==="*"?"tout bank yo":bank}. Tikè ak istorik yo pap efase.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Localized text={"Anile"}/></AlertDialogCancel><AlertDialogAction onClick={remove}>Retire tiraj</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>
}
