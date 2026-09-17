"use client";
import {useState} from "react";
import {Eye,Search,RotateCcw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Monitoring} from "@/components/monitoring";
import {ticketDate,type MonitoredTicket} from "@/lib/monitoring";
import {dashboardSales} from "@/lib/dashboard-sales";
const money=(v:number)=>'$'+v.toFixed(2);
const statuses=[['pending','An atant'],['winner','Gayan'],['loser','Pèdi'],['cancelled','Anile']] as const;
export function DashboardReport({tickets,onCancel,serverBacked=false,canCancel=true}:{serverBacked?:boolean;canCancel?:boolean;tickets:MonitoredTicket[];onCancel:(id:string)=>boolean|Promise<boolean>}){
 const today=()=>ticketDate(Date.now());
 const [from,setFrom]=useState(today),[to,setTo]=useState(today),[bank,setBank]=useState('*');
 const [range,setRange]=useState(()=>({from:today(),to:today(),bank:'*'}));
 const [error,setError]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(1);
 const [selected,setSelected]=useState<{bank:string;id:string}|null>(null);
 const report=dashboardSales(tickets,range.from,range.to,range.bank);
 const points=report.points.filter(p=>(p.bank+' '+p.id+' '+p.name).toLowerCase().includes(search.toLowerCase()));
 const pages=Math.max(1,Math.ceil(points.length/10)),current=Math.min(page,pages);
 const selectedTickets=selected?tickets.filter(t=>(t.bank||'')===selected.bank&&(t.pointOfSaleId||'')===selected.id):[];
 return <div className="sales-control">
 <section className="panel sales-control-filter"><h2>Kontwòl lavant</h2>
 <form onSubmit={e=>{e.preventDefault();if(!from||!to||from>to){setError('Dat fen an dwe apre dat kòmansman an.');return}setRange({from,to,bank});setPage(1);setError('')}}>
 <label>Dat kòmansman<input type="date" required value={from} onChange={e=>setFrom(e.target.value)}/></label>
 <label>Dat fen<input type="date" required value={to} onChange={e=>setTo(e.target.value)}/></label>
 <label>Bank<select value={bank} onChange={e=>setBank(e.target.value)}><option value="*">Tout bank yo</option>{[...new Set(tickets.map(t=>t.bank).filter(Boolean))].map(b=><option key={b}>{b}</option>)}</select></label>
 <Button type="submit" className="primary-action"><Search size={16}/>Chèche</Button><Button type="button" variant="outline" onClick={()=>{const d=today();setFrom(d);setTo(d);setBank('*');setRange({from:d,to:d,bank:'*'});setSearch('');setPage(1);setError('')}}><RotateCcw size={16}/>Reyajiste</Button>
 </form>{error&&<p role="alert" className="notice error-notice">{error}</p>}</section>
 <section className="panel sales-status-summary"><div className="table-scroll"><table><caption>Tikè ak montan pou peryòd la</caption><thead><tr><th></th><th>Total</th>{statuses.map(([s,label])=><th key={s}>{label}</th>)}<th>Peye</th></tr></thead><tbody>
 <tr><th>Tikè</th><td>{report.count}</td>{statuses.map(([s])=><td key={s}>{report.period.filter(t=>t.status===s).length}</td>)}<td>{report.period.filter(t=>t.paidAt&&t.status!=='cancelled').length}</td></tr>
 <tr><th>Montan jwe</th><td>{money(report.amount)}</td>{statuses.map(([s])=><td key={s}>{money(report.period.filter(t=>t.status===s).reduce((n,t)=>n+Math.round(t.amount*100),0)/100)}</td>)}<td>{money(report.period.filter(t=>t.paidAt&&t.status!=='cancelled').reduce((n,t)=>n+Math.round(t.amount*100),0)/100)}</td></tr>
 </tbody></table></div><small>Total lavant eskli tikè anile. « Peye » se yon pati nan tikè gayan yo.</small></section>
 <div className="stat-grid">{[['Lavant valab',money(report.amount)],['Total pri',money(report.prize)],['Lavant − pri',money(report.net)],['Tikè anile',String(report.cancelled)]].map(([label,value])=><article className="stat-card" key={label}><div><p>{label}</p><strong>{value}</strong></div></article>)}</div>
 <section className="panel"><div className="panel-title"><h2>Lavant pa jou</h2><span>{range.from} — {range.to}</span></div><div className="table-scroll"><table><thead><tr><th>Dat</th><th>Tikè</th><th>Lavant valab</th><th>Pri</th><th>Anile</th><th>Aksyon</th></tr></thead><tbody>{report.days.map(d=><tr key={d.date}><td>{d.date}</td><td>{d.count}</td><td>{money(d.amount)}</td><td>{money(d.prize)}</td><td>{d.cancelled}</td><td><Button variant="outline" onClick={()=>{setFrom(d.date);setTo(d.date);setRange({...range,from:d.date,to:d.date});setPage(1)}}>Wè POS jou sa a</Button></td></tr>)}{!report.days.length&&<tr><td colSpan={6}>Pa gen lavant pou peryòd sa a.</td></tr>}</tbody></table></div></section>
 <section className="panel"><div className="panel-title"><h2>Pwen vant ki vann yo</h2><label className="sales-pos-search">Chèche POS<input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Bank oswa nimewo POS"/></label></div>
 <div className="table-scroll"><table><thead><tr>{['Bank','POS','Tikè','Lavant valab','Pri','Lavant − pri','Anile','Aksyon'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{points.slice((current-1)*10,current*10).map(p=><tr key={p.key}><td>{p.bank||'Pa presize'}</td><td><strong>{p.name||'Pa presize'}</strong></td><td>{p.count}</td><td>{money(p.amount)}</td><td>{money(p.prize)}</td><td><span className={p.net<0?'sales-negative':'sales-positive'}>{money(p.net)}</span></td><td>{p.cancelled}</td><td><Button variant="outline" onClick={()=>setSelected({bank:p.bank,id:p.id})}><Eye size={16}/>Ouvri POS</Button></td></tr>)}{!points.length&&<tr><td colSpan={8}>Pa gen POS ki koresponn ak rechèch sa a.</td></tr>}</tbody></table></div>
 <footer className="sales-pagination"><span>{points.length} POS • Paj {current}/{pages}</span><Button variant="outline" disabled={current===1} onClick={()=>setPage(current-1)}>Anvan</Button><Button variant="outline" disabled={current===pages} onClick={()=>setPage(current+1)}>Apre</Button></footer><p className="sales-control-note">Ouvri POS la pou wè tikè, detay jwèt ak enpresyon. Anilasyon disponib pou tikè an atant ki toujou nan delè yo; tras tikè a rete nan istorik la. Komisyon ak balans kont yo poko konekte.</p></section>
 <Monitoring serverBacked={serverBacked} allowCancel={canCancel} key={selected?JSON.stringify(selected):'closed'} open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}} tickets={selectedTickets} initialRange={range} title={selected?`Siveyans POS · ${selected.id||'Pa presize'} · ${selected.bank}`:undefined} onCancel={id=>selectedTickets.some(t=>t.id===id)&&onCancel(id)}/>
 </div>;
}
