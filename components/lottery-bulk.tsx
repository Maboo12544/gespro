"use client";
import {Localized} from "@/components/language-settings";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Checkbox} from "@/components/ui/checkbox";
import {PayoutSettings,defaultPayoutRates} from "@/components/payout-settings";
import type {LotteryState} from "@/components/lottery-management";
import type {BankManagement} from "@/components/bank-administration";

export type LotteryLimit={lottery:string;bank:string;scope:string;game:string;number:string;days:string[]};
const games=["Directo","Palé","Tripleta","Cash 3 Straight","Cash 3 Box","Play 4 Straight","Play 4 Box","Pick 5 Straight","Pick 5 Box"];
const days=["Lendi","Madi","Mèkredi","Jedi","Vandredi","Samdi","Dimanch"];
export function LotteryBulk({state,onChange,bank,management}:{state:LotteryState;onChange:(s:LotteryState)=>void;bank:string;management:BankManagement}){
 const [selection,setSelection]=useState<string[]>([]),[scope,setScope]=useState("bank"),[tab,setTab]=useState("limit"),[game,setGame]=useState(games[0]),[number,setNumber]=useState(""),[values,setValues]=useState(Array(7).fill("100.00") as string[]),[message,setMessage]=useState("");
 const items=state.items.filter(i=>(!i.bank||i.bank===bank)&&!state.removed[JSON.stringify([i.id,bank,"removed"])]&&!state.removed[JSON.stringify([i.id,"*","removed"])]);
 const ids=selection.filter(id=>items.some(i=>i.id===id));
 const allRD=ids.length>0&&ids.every(id=>items.find(i=>i.id===id)?.resultMode==="dominican3");
 const limits=state.limits??[];
 const width=game==="Tripleta"?6:game==="Directo"?2:game==="Palé"?4:game.startsWith("Cash")?3:game.startsWith("Play")?4:5;
 function save(){
  if(!ids.length){setMessage("Chwazi omwen yon lotri.");return}
  if(number&&!new RegExp("^\\d{"+width+"}$").test(number)){setMessage("Nimewo a dwe gen "+width+" chif pou kalite jwèt sa a.");return}
  if(values.some(v=>!/^\d+(\.\d{1,2})?$/.test(v)||!Number.isFinite(Number(v)))){setMessage("Antre yon limit pozitif oswa zewo, ak jiska 2 desimal, pou chak jou.");return}
  const keep=limits.filter(l=>!(ids.includes(l.lottery)&&l.bank===bank&&l.scope===scope&&l.game===game&&l.number===number));
  onChange({...state,limits:[...keep,...ids.map(lottery=>({lottery,bank,scope,game,number,days:values.map(v=>Number(v).toFixed(2))}))]});setMessage("Limit valide sou "+ids.length+" lotri nan konfigirasyon an.");
 }
 return <section className="lottery-payout">
  <h3>Konfigire plizyè lotri</h3>
  <div className="lottery-actions"><Button variant="outline" onClick={()=>setSelection(items.map(i=>i.id))}><Localized text={"Chwazi tout"}/></Button><Button variant="outline" onClick={()=>setSelection([])}><Localized text={"Deseleksyone tout"}/></Button><span>{ids.length} lotri chwazi</span></div>
  <div className="bank-point-list">{items.map(i=><label key={i.id}><Checkbox aria-label={"Chwazi "+i.name} checked={ids.includes(i.id)} onCheckedChange={v=>setSelection(old=>v===true?[...new Set([...old,i.id])]:old.filter(id=>id!==i.id))}/>{i.name}</label>)}</div>
  <label className="bank-assign">Aplike nan bank {bank}<select value={scope} onChange={e=>{setScope(e.target.value);setMessage("")}}><option value="bank">Tout bank la</option>{management.supervisors.filter(s=>s.bank===bank).map(s=><option key={s.id} value={"supervisor:"+s.id}>Sipèvizè — {s.name}</option>)}{management.points.filter(p=>p.bank===bank).map(p=><option key={p.id} value={"pos:"+p.id}>Pwen vant — {p.name}</option>)}</select></label>
  <div className="bank-context"><Button variant={tab==="limit"?"default":"outline"} onClick={()=>setTab("limit")}>Limit</Button><Button variant={tab==="payout"?"default":"outline"} onClick={()=>setTab("payout")}>Payout</Button></div>
  {tab==="payout"?<><p>Valè valide yo ranplase tarif pou tout lotri chwazi yo nan nivo sa a.</p>{ids.length>0?<PayoutSettings dominican={allRD} key={bank+scope+ids.join(",")} bank={bank+" • "+ids.length+" lotri chwazi"} rates={allRD?Object.fromEntries(Object.keys(defaultPayoutRates()).map(k=>[k,"0.00"])):defaultPayoutRates()} onSave={rates=>{const next={...state.rates};ids.forEach(id=>{next[JSON.stringify([id,bank,scope])]={...rates}});onChange({...state,rates:next});setMessage("Payout aplike sou "+ids.length+" lotri.")}}/>:<p>Chwazi yon lotri pou konfigire payout.</p>}</>:<>
   <div className="bank-context"><label><Localized text={"Kalite jwèt"}/><select value={game} onChange={e=>{setGame(e.target.value);setNumber("")}}>{games.map(g=><option key={g}>{g}</option>)}</select></label><label>Boul espesifik — kite vid pou tout nimewo<Input value={number} inputMode="numeric" maxLength={width} onChange={e=>setNumber(e.target.value)} placeholder="Tout nimewo"/></label></div>
   <p>Montan maksimòm pou chak nimewo, pa jou. Zewo bloke nimewo a. Nan espas bank konekte a, yo aplike apre ou anrejistre konfigirasyon bank la. Limit bank, sipèvizè ak POS yo tout respekte; yon limit pou yon boul presi ranplase limit jeneral menm nivo a.</p>
   <div className="bank-context">{days.map((day,i)=><label key={day}>{day}<Input aria-label={"Limit "+day} inputMode="decimal" value={values[i]} onChange={e=>setValues(old=>old.map((v,j)=>i===j?e.target.value:v))}/></label>)}</div>
   <div className="lottery-actions"><Button variant="outline" onClick={()=>setValues(Array(7).fill(values[0]))}>Lendi → Tout jou</Button><Button className="admin-save-button" disabled={!ids.length} onClick={save}>SAVE LIMIT</Button></div>
   <h3>Limit nan konfigirasyon an</h3><div className="table-scroll"><table className="bank-table"><thead><tr><th><Localized text={"Lotri"}/></th><th>Nivo</th><th>Jwèt / Boul</th><th>Lendi → Dimanch</th><th><Localized text={"Aksyon"}/></th></tr></thead><tbody>{limits.filter(l=>l.bank===bank).map((l,i)=><tr key={i}><td>{state.items.find(x=>x.id===l.lottery)?.name}</td><td>{l.scope}</td><td>{l.game} / {l.number||"Tout"}</td><td>{l.days.join(" / ")}</td><td><Button variant="outline" onClick={()=>{setSelection([l.lottery]);setScope(l.scope);setGame(l.game);setNumber(l.number);setValues([...l.days]);setMessage("Limit chaje pou modifye.")}}><Localized text={"Modifye"}/></Button></td></tr>)}</tbody></table></div>
  </>}{message&&<p role="status">{message}</p>}
 </section>
}
