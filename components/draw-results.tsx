"use client";
import {drawMode,deriveDraw} from "@/lib/draw-rules";
import {useState} from "react";
import {ticketDate} from "@/lib/monitoring";
import type {LotteryState} from "@/components/lottery-management";
export type DrawResult={lotteryId:string;date:string;values:string[]};
export const resultLabels=['1st','2nd','3rd','Cash 3','Pick 4','Pick 5'];
export function DrawResults({state,onChange}:{state:LotteryState;onChange:(s:LotteryState)=>void}){
 const [lottery,setLottery]=useState(state.items[0]?.id||'');const [date,setDate]=useState(ticketDate(Date.now()));const [values,setValues]=useState(['','','']);const [message,setMessage]=useState('');
 const item=state.items.find(i=>i.id===lottery);
 const mode=item?drawMode(item):"pending";
 const isRD=mode==="dominican3",pending=mode==="pending",isPick2=mode==="pick2",isMass=mode==="massachusetts4";
 const [base,setBase]=useState('');const [apiBusy,setApiBusy]=useState(false);
 const widths=isPick2?[2]:isRD?[2,2,2]:[3,2,2];
 let derived:string[]=[],standard:string[]=[];
 try{if(item){const result=deriveDraw(item,isMass?[base]:values.slice(0,widths.length));if(isMass)derived=result;else standard=result}}catch{}
 async function loadApi(){
  if(!item||pending)return;
  setApiBusy(true);setMessage("Ap chèche rezilta API a…");
  try{
   const r=await fetch("/api/gespro/lottery-result?lotteryId="+encodeURIComponent(lottery)+"&date="+encodeURIComponent(date),{cache:"no-store"});
   const data=await r.json() as {error?:string;primary?:string;gameName?:string;drawDate?:string};
   if(!r.ok||!data.primary){setMessage(data.error||"Rezilta API a pa disponib.");return}
   const primary=data.primary;if(!primary){setMessage(data.error||"Rezilta API a pa disponib.");return}
   if(isPick2)setValues([primary,"",""]);else setValues(old=>[primary,old[1]??"",old[2]??""]);
   setMessage(isPick2?`API konekte • ${data.gameName||item.name} • ${data.drawDate||date}. Verifye epi sove rezilta a.`:`API konekte • ${data.gameName||item.name} • premye nimewo a chaje. Dezyèm ak twazyèm boul yo rete pou verifye/antre manyèlman.`);
  }catch{setMessage("Nou pa ka konekte ak API tiraj la kounye a.")}finally{setApiBusy(false)}
 }
 function save(e:React.FormEvent){
  e.preventDefault();
  if(!item||pending){setMessage("Règ tiraj sa a poko konfime.");return}
  const parsedDate=new Date(date+"T12:00:00Z");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==date){setMessage("Dat tiraj la pa valab.");return}
  let result:string[];
  try{result=deriveDraw(item,isMass?[base]:values.slice(0,widths.length))}catch(error){setMessage(error instanceof Error?error.message:"Rezilta pa valab.");return}
  if(state.results?.some(r=>r.lotteryId===lottery&&r.date===date)){setMessage('Rezilta sa a deja anrejistre. Li pa ranplase otomatikman.');return}
  onChange({...state,results:[...(state.results||[]),{lotteryId:lottery,date,values:result}]});setMessage('Rezilta a anrejistre.');setValues(['','','']);setBase('')
 }
 return <section className="panel draw-results"><h2>Rezilta tiraj</h2><p>Antre epi verifye rezilta tiraj yo.</p><form onSubmit={save}><button type="button" className="primary-action" disabled={pending||apiBusy} onClick={loadApi}>{apiBusy?"AP CHÈCHE…":"CHAJE REZILTA API"}</button><label>Dat<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>Lotri<select value={lottery} onChange={e=>{setLottery(e.target.value);setBase('');setValues(['','',''])}}>{state.items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>{isMass?<><label>Massachusetts — 4 chif tiraj la<input aria-label="Massachusetts 4 chif" required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={base} onChange={e=>setBase(e.target.value.replace(/\D/g,''))}/></label><div className="draw-result-fields">{derived.map((v,i)=>v&&<span key={i}>{i===6?'Pick 3 Back':resultLabels[i]}<b>{v}</b></span>)}</div></>:<div className="draw-result-fields">{(isPick2?['Pick 2 — 2 chif']:[isRD?'Premye boul — 2 chif':'Premye nimewo — 3 chif','Dezyèm boul — 2 chif','Twazyèm boul — 2 chif']).map((label,i)=><label key={label}>{label}<input aria-label={label} required inputMode="numeric" pattern={'[0-9]{'+widths[i]+'}'} maxLength={widths[i]} placeholder={'0'.repeat(widths[i])} value={values[i]} onChange={e=>setValues(old=>old.map((v,j)=>j===i?e.target.value.replace(/\D/g,''):v))}/></label>)}{standard.map((v,i)=><span key={resultLabels[i]}>{resultLabels[i]}<b>{v}</b></span>)}</div>}{!isRD&&!isPick2&&!pending&&<p>Fòmil bòlèt bank la: valè derive yo pa tiraj ofisyèl Pick 4 / Pick 5 apa.</p>}{isRD&&<p>Quiniela RD: antre 3 boul egzakteman. Pa gen Cash 3 / Pick 4 / Pick 5 derive. Peman otomatik poko aktive.</p>}{pending&&<p>Règ jwèt sa a poko konfime. Antre rezilta dezaktive.</p>}<button disabled={pending} type="submit" className="primary-action">SAVE REZILTA</button></form>{message&&<p role="status">{message}</p>}<div>{(state.results||[]).map(r=><article key={r.date+r.lotteryId}><h3>{r.date} — {state.items.find(i=>i.id===r.lotteryId)?.name}</h3><div className="draw-result-fields">{r.values.map((v,i)=><span key={i}>{i===6?'Pick 3 Back':resultLabels[i]} <b>{v||'—'}</b></span>)}</div></article>)}</div></section>
}
