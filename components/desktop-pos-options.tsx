"use client";
import {useEffect,useState} from 'react';
import {UserRound,ChevronDown,Trophy} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import type {LotteryState} from '@/components/lottery-management';
import {resultLabels} from '@/components/draw-results';
export function DesktopPosOptions({state,bank}:{state:LotteryState;bank:string}){
 const [desktop,setDesktop]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(min-width: 1024px)');const update=()=>setDesktop(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
 return desktop?<DesktopControls state={state} bank={bank}/>:null;
}
function DesktopControls({state,bank}:{state:LotteryState;bank:string}){
 const [clock,setClock]=useState<{now:number;zone:string}|null>(null);
 const [open,setOpen]=useState<'results'|'password'|null>(null);
 const [date,setDate]=useState('');
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[success,setSuccess]=useState(false);
 useEffect(()=>{
  let sample:{time:number;at:number;zone:string}|null=null,alive=true,pending=false;
  const sync=async()=>{if(pending)return;pending=true;try{const start=performance.now();const r=await fetch('/api/gespro/time',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json() as {now:number;timeZone:string};if(!Number.isFinite(data.now)||typeof data.timeZone!=='string')throw Error();if(alive){sample={time:data.now+(performance.now()-start)/2,at:performance.now(),zone:data.timeZone};setClock({now:sample.time,zone:sample.zone})}}catch{if(alive){sample=null;setClock(null)}}finally{pending=false}};
  const tick=setInterval(()=>{if(!sample)return;const elapsed=performance.now()-sample.at;if(elapsed>120000){setClock(null);return}setClock({now:sample.time+elapsed,zone:sample.zone})},1000);
  void sync();const timer=setInterval(sync,60000);const visible=()=>{if(!document.hidden){sample=null;setClock(null);void sync()}};document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;clearInterval(tick);clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[]);
 const systemDate=clock?new Intl.DateTimeFormat('en-CA',{timeZone:clock.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(clock.now)):'';
 const selected=date||systemDate;
 const results=(state.results||[]).filter(r=>r.date===selected&&state.items.some(i=>i.id===r.lotteryId&&(!i.bank||i.bank===bank)));
 async function changePassword(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;const form=e.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');setSuccess(false);
  try{const r=await fetch('/api/gespro/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(data))});const result=await r.json() as {error?:string};if(!r.ok)throw Error(result.error||'Modpas la pa chanje.');form.reset();setSuccess(true);setMessage('Modpas ou chanje avèk siksè.')}catch(err){setMessage(err instanceof Error?err.message:'Koneksyon an pa disponib.')}finally{setBusy(false)}
 }
 return <div className="desktop-pos-options">
 <Button variant="ghost" onClick={()=>{setDate(systemDate);setOpen('results')}}><Trophy size={18}/>Rezilta<ChevronDown size={14}/></Button>
 <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" aria-label="Kont mwen"><UserRound size={21}/><ChevronDown size={14}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>{setMessage('');setSuccess(false);setOpen('password')}}>Chanje modpas</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
 <time className="pos-server-clock" title="Lè sistèm nan — Ayiti (America/Port-au-Prince)">{clock?new Intl.DateTimeFormat('fr-FR',{timeZone:clock.zone,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(clock.now)):'Lè sèvè: koneksyon…'}</time>
 <Dialog open={open==='results'} onOpenChange={v=>{if(!v)setOpen(null)}}><DialogContent className="monitor-dialog"><DialogHeader><DialogTitle>Rezilta tiraj</DialogTitle><DialogDescription>Rezilta tès ki antre nan sistèm nan. Rezilta ofisyèl yo poko konekte.</DialogDescription></DialogHeader><div className="monitor-body"><label>Dat <input type="date" value={selected} onChange={e=>setDate(e.target.value)}/></label><div className="table-scroll"><table className="monitor-table"><thead><tr><th>Lotri</th>{[...resultLabels,'Pick 3 Back'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{results.map(r=><tr key={r.lotteryId+r.date}><td>{state.items.find(i=>i.id===r.lotteryId)?.name}</td>{Array.from({length:7},(_,i)=><td key={i}>{r.values[i]||'—'}</td>)}</tr>)}{!results.length&&<tr><td colSpan={8}>Pa gen rezilta anrejistre pou dat sa a.</td></tr>}</tbody></table></div></div></DialogContent></Dialog>
 <Dialog open={open==='password'} onOpenChange={v=>{if(!v&&!busy)setOpen(null)}}><DialogContent><DialogHeader><DialogTitle>Chanje modpas</DialogTitle><DialogDescription>Chanje modpas kont ou konekte a. Nouvo modpas la dwe gen omwen 12 karaktè.</DialogDescription></DialogHeader><form className="pos-password-form" onSubmit={changePassword}>
 <label>Modpas aktyèl<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} disabled={busy}/></label>
 <label>Nouvo modpas<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={busy}/></label>
 <label>Konfime nouvo modpas<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={busy}/></label>
 {message&&<p role={success?'status':'alert'}>{message}</p>}<Button type="submit" disabled={busy}>{busy?'Ap anrejistre…':'Anrejistre modpas'}</Button></form></DialogContent></Dialog>
 </div>;
}
