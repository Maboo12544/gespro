"use client";
import {useEffect,useRef,useState} from 'react';
import type {AccessContext,AccessRole} from '@/lib/access-types';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Users,Landmark,LayoutDashboard,Settings,Store,ArrowLeftRight} from 'lucide-react';
import {BankEntityEditor} from '@/components/bank-entity-editor';
import {BankConfiguration} from '@/components/bank-configuration';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {DemoStorageBoundary,DemoNamespaceProvider,useDemoState} from '@/components/demo-storage';
import {LanguageProvider} from '@/components/language-settings';
import {PosInterface} from '@/components/gespro-workspace';
import type {PosLayout} from '@/components/desktop-model-previews';
import {useServerTestTickets,ServerSalesDashboard} from '@/components/server-test-sales';
import {addDominicanCatalog} from '@/lib/dominican-lotteries';
import {initialLotteryState,type LotteryState} from '@/components/lottery-management';
import type {MonitoredTicket} from '@/lib/monitoring';
import {SellerDirectAccess} from '@/components/seller-direct-access';
const roleName={owner:'Admin bank',supervisor:'Sipèvizè',seller:'Vandè'};
function ScopedTestPos({bank,bankId,pointId,seller,userId}:{bank:string;bankId:string;pointId:string;seller:string;userId:string}){
 const data=useServerTestTickets(bankId);
 type Pending={signature:string;id:string};
 const key='gespro-pending-ticket:'+userId+':'+bankId+':'+pointId;
 const [request,setRequest]=useState<Pending|null>(()=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}});
 const requestRef=useRef(request),[recovery,setRecovery]=useState(''),[recovering,setRecovering]=useState(false);
 const [lotteries,setLotteries]=useState<LotteryState|null>(null),[configError,setConfigError]=useState('Ap chaje lotri bank la…');
 useEffect(()=>{let live=true;async function load(){try{const r=await fetch('/api/gespro/pos-configuration?pos='+encodeURIComponent(pointId),{cache:'no-store'});const result=await r.json() as {configuration:LotteryState|null;error?:string};if(!r.ok)throw Error(result.error);if(live){setLotteries(result.configuration);setConfigError(result.configuration?'':'Admin dwe konfigire lotri ak lè fèmti bank la anvan vann.')}}catch(e){if(live){setLotteries(null);setConfigError(e instanceof Error?e.message:'Koneksyon pèdi.')}}}void load();const timer=setInterval(()=>void load(),15000);return()=>{live=false;clearInterval(timer)}},[pointId]);

 function clear(){localStorage.removeItem(key);requestRef.current=null;setRequest(null)}
 async function submit(pending:Pending){try{const ticket=await data.create(pointId,pending.id,JSON.parse(pending.signature));clear();return ticket}catch(error){if(error instanceof Error&&'rejected' in error&&error.rejected)clear();throw error}}
 async function create(plays:MonitoredTicket['plays']){
  const signature=JSON.stringify(plays);let pending=requestRef.current;
  if(pending&&pending.signature!==signature)throw Error('Konfime fich ki rete an atant lan ak bouton anlè a anvan ou voye yon lòt fich.');
  if(!pending){pending={signature,id:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(pending));requestRef.current=pending;setRequest(pending)}
  return submit(pending);
 }
 async function recover(){if(!requestRef.current||recovering)return;setRecovering(true);try{const ticket=await submit(requestRef.current);setRecovery('Fich '+ticket.id+' konfime. Li nan lis tikè yo pou enprime. Verifye epi retire ansyen boul yo nan bouyon an anvan ou kreye yon lòt fich.')}catch(error){setRecovery(error instanceof Error?error.message:'Pa konfime.')}finally{setRecovering(false)}}
 if(!lotteries)return <p className="access-mode" role="status">{configError}</p>;
 const posLayout=(lotteries as LotteryState&{posLayout?:string}).posLayout as PosLayout|undefined;
 return <LanguageProvider><div className="access-mode" role="status">{data.message||(!data.ready?'Ap chaje tikè…':`Rafrechisman chak 15 segonn · ${data.updated}`)}{request&&<button disabled={recovering} onClick={()=>void recover()}>Konfime fich ki an atant lan</button>}{recovery&&<p>{recovery}</p>}</div><PosInterface remote={{create,cancel:data.cancel}} identity={{bank,pointId,seller}} posLayout={posLayout} setView={()=>{}} tickets={data.tickets.filter(t=>t.pointOfSaleId===pointId)} setTickets={data.setTickets} lotteryState={lotteries}/></LanguageProvider>
}
export function AccessManagement({initial}:{initial:AccessContext}){
 const sellerOnly=!initial.isPlatformAdmin&&initial.memberships.filter(m=>m.user_id===initial.userId&&m.active).length>0&&initial.memberships.filter(m=>m.user_id===initial.userId&&m.active).every(m=>m.role==='seller');
 if(sellerOnly)return <SellerDirectAccess initial={initial}/>;
 const initialBank=initial.isPlatformAdmin?'':initial.banks.find(b=>b.active)?.id??'';
 const initialMembership=initial.isPlatformAdmin?undefined:initial.memberships.find(m=>m.user_id===initial.userId&&m.bank_id===initialBank&&m.active);
 const isSeller=initialMembership?.role==='seller';
 const sellerPosId=isSeller?(initial.assignments.find(a=>a.user_id===initial.userId&&a.bank_id===initialBank)?.pos_id??''):'';
 const validSellerPos=Boolean(sellerPosId&&initial.points.some(p=>p.id===sellerPosId&&p.active&&p.bank_id===initialBank));
 const [access,setAccess]=useState(initial),[bank,setBank]=useState(initialBank);
 const [name,setName]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState('');
 const [role,setRole]=useState<AccessRole>('seller'),[posIds,setPosIds]=useState<string[]>([]),[editing,setEditing]=useState(''),[active,setActive]=useState(true);
 const [bankName,setBankName]=useState(''),[pointName,setPointName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[opened,setOpened]=useState(validSellerPos?sellerPosId:'');
 const [pickerOpen,setPickerOpen]=useState(initial.isPlatformAdmin);
 const [screen,setScreen]=useState(isSeller?'points':'dashboard'),[configDirty,setConfigDirty]=useState(false);
 const autoOpened=useRef(false);
 useEffect(()=>{if(!autoOpened.current&&isSeller&&validSellerPos&&!opened){autoOpened.current=true;setOpened(sellerPosId)}},[isSeller,validSellerPos,sellerPosId,opened]);
 const membership=access.memberships.find(m=>m.user_id===access.userId&&m.bank_id===bank&&m.active);
 const canManage=access.isPlatformAdmin||membership?.role==='owner';
 const currentMembership=access.memberships.find(m=>m.user_id===access.userId&&m.bank_id===bank&&m.active);
 const sellerAssignment=currentMembership?.role==='seller'?access.assignments.find(a=>a.user_id===access.userId&&a.bank_id===bank):undefined;
 const points=access.points.filter(p=>p.bank_id===bank&&p.active&&(!currentMembership||currentMembership.role!=='seller'||p.id===sellerAssignment?.pos_id));
 const members=access.memberships.filter(m=>m.bank_id===bank);
 const bankItem=access.banks.find(b=>b.id===bank&&b.active);
 async function refresh(){const r=await fetch('/api/gespro/access',{cache:'no-store'});if(r.status===401){window.location.assign('/login');return}if(!r.ok)throw Error('Nou pa ka verifye dwa yo kounye a.');const next=await r.json() as AccessContext;setAccess(next)}
 useEffect(()=>{const check=()=>{void refresh().catch(()=>{setOpened('');setMessage('Nou pa ka verifye dwa yo kounye a. Rafrechi paj la.')})};const id=setInterval(check,60000);window.addEventListener('focus',check);return()=>{clearInterval(id);window.removeEventListener('focus',check)}},[]);
 useEffect(()=>{if(!access.banks.some(b=>b.id===bank&&b.active)){setBank(access.isPlatformAdmin?'':access.banks.find(b=>b.active)?.id??'');setOpened('')}if(opened&&!access.points.some(p=>p.id===opened&&p.active))setOpened('')},[access,bank,opened]);
 function chooseBank(id:string){if(configDirty&&!window.confirm('Ou gen konfigirasyon ki poko anrejistre. Sòti nan bank la kanmenm?'))return;setConfigDirty(false);setScreen('dashboard');setBank(id);setPickerOpen(!id);setOpened('');clear();setPointName('');setBankName('');setMessage('')}
 function clear(){setEditing('');setName('');setUsername('');setPassword('');setRole('seller');setPosIds([]);setActive(true)}
 async function act(operation:string,data:Record<string,unknown>){
  if(busy)return;setBusy(true);setMessage('');
  try{const r=await fetch('/api/gespro/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,data})});const body=await r.json() as {error?:string};if(!r.ok)throw Error(body.error||'Aksyon an refize.');setPassword('');await refresh();clear();setBankName('');setPointName('');setMessage('Chanjman an anrejistre sou sèvè a.')}catch(e){setMessage(e instanceof Error?e.message:'Aksyon an pa fèt.')}finally{setBusy(false)}
 }
 if(opened&&bankItem&&points.some(p=>p.id===opened)&&(access.isPlatformAdmin||membership?.role==='owner'))return <section className="access-open-pos"><div className="access-test-banner"><b>Pwen vant — {points.find(p=>p.id===opened)?.name}</b><span></span><Button variant="outline" onClick={()=>setOpened('')}>Fèmen pwen vant</Button></div><DemoNamespaceProvider key={access.userId+bank+opened} scope={access.userId+':'+bank+':'+opened}><DemoStorageBoundary><ScopedTestPos userId={access.userId} bankId={bank} bank={bankItem.name} pointId={opened} seller={access.displayName||access.username}/></DemoStorageBoundary></DemoNamespaceProvider></section>;
 return <main className={"access-shell"+(access.isPlatformAdmin?" access-super":"")}><header className="access-header"><div><strong>GesPro</strong><p>Kont ak dwa reyèl</p></div><div><b>{access.displayName||access.username}</b><p>{access.isPlatformAdmin?'Super Admin':membership?roleName[membership.role]:'Kont aktive'}</p></div><form action="/api/gespro/logout" method="post"><Button type="submit" variant="outline">Dekonekte</Button></form></header>
 {access.isPlatformAdmin&&<aside className="bank-admin-sidebar"><div className="bank-sidebar-identity"><Landmark/><strong>{bankItem?.name||'Super Admin'}</strong><small>{bankItem?'Bank aktyèl':'Chwazi yon bank'}</small></div><button onClick={()=>setPickerOpen(true)}><ArrowLeftRight size={18}/>Chanje bank</button><button className={screen==='dashboard'?'active':''} onClick={()=>setScreen('dashboard')}><LayoutDashboard size={18}/>Tablo de bò</button>{bankItem&&<><button onClick={()=>setScreen('points')}><Store size={18}/>Pwen vant</button><button onClick={()=>setScreen('team')}><Users size={18}/>Ekip ak dwa</button><button onClick={()=>setScreen('configuration')}><Settings size={18}/>Konfigirasyon</button></>}</aside>}
 <div className="access-content">{access.isPlatformAdmin&&<a href="/demo">Espace admin / pwen vant →</a>}
 {message&&<p role="status" className="access-message">{message}</p>}
 {access.isPlatformAdmin&&!bankItem&&<section className="bank-selection-overview"><h1>Tablo de bò</h1><div className="bank-overview-stats"><article><Landmark/><strong>{access.banks.length}</strong><span>Bank / konsòsyòm</span></article><article><Users/><strong>{access.memberships.filter(m=>m.active).length}</strong><span>Kont aktif</span></article><article><Store/><strong>{access.points.filter(p=>p.active).length}</strong><span>POS aktif</span></article></div><section className="panel access-panel"><h2>Jesyon bank yo</h2><p>Chwazi yon bank pou ouvri espas jesyon li.</p><Button onClick={()=>setPickerOpen(true)}>Chwazi yon bank</Button></section></section>}
 {access.isPlatformAdmin&&<Dialog open={pickerOpen} onOpenChange={setPickerOpen}><DialogContent className="consortium-dialog" showCloseButton={false}><div className="consortium-dialog-header"><DialogTitle>Chwazi yon bank / konsòsyòm</DialogTitle><Button disabled={busy} onClick={()=>chooseBank('')}>Efase seleksyon</Button></div><DialogDescription className="sr-only">Chwazi bank ou vle jere a. Chanjman yo ap konsène bank sa a sèlman.</DialogDescription><div className="consortium-dialog-body"><div className="consortium-cards">{access.banks.map(item=>{
 const team=access.memberships.filter(m=>m.bank_id===item.id),locations=access.points.filter(p=>p.bank_id===item.id);
 const owners=team.filter(m=>m.role==='owner'&&m.active).map(m=>access.profiles.find(p=>p.user_id===m.user_id)).filter(Boolean);
 return <button type="button" className="consortium-card" aria-label={'Antre nan bank '+item.name} disabled={busy||!item.active} key={item.id} onClick={()=>chooseBank(item.id)}><h2>{item.name}</h2><div className="consortium-emblem"><span aria-hidden="true">{item.name.trim().slice(0,2).toUpperCase()}</span></div><p className="consortium-owner">{owners.map(p=>p?.display_name||p?.username).join(', ')||'Mèt bank poko afekte'}</p><div className="consortium-card-bottom"><span className={item.active?'bank-active':'bank-inactive'}>{item.active?'Bank aktif':'Bank sispann'}</span><div className="consortium-counts"><span className="consortium-count-group" aria-label="Kont: total, aktif, sispann"><Users size={17}/><b title="Tout kont">{team.length}</b><b className="count-active" title="Kont aktif">{team.filter(m=>m.active).length}</b><b className="count-inactive" title="Kont sispann">{team.filter(m=>!m.active).length}</b></span><span className="consortium-count-group" aria-label="POS: total, aktif, sispann"><Landmark size={17}/><b title="Tout POS">{locations.length}</b><b className="count-active" title="POS aktif">{locations.filter(p=>p.active).length}</b><b className="count-inactive" title="POS sispann">{locations.filter(p=>!p.active).length}</b></span></div></div></button>
 })}</div>{!access.banks.length&&<p>Pa gen bank ankò. Kreye premye bank la anba a.</p>}<details className="consortium-create"><summary>Kreye yon bank / konsòsyòm</summary><form onSubmit={e=>{e.preventDefault();void act('create_bank',{name:bankName})}}><label>Non bank<Input required maxLength={120} value={bankName} onChange={e=>setBankName(e.target.value)}/></label><Button disabled={busy} type="submit">Kreye bank</Button></form>{message&&<p role="status">{message}</p>}</details><details className="consortium-create"><summary>Modifye / sispann / reaktive bank yo</summary>{access.banks.map(b=><BankEntityEditor key={b.id+b.name+b.active} bank={b.id} id={b.id} kind="bank" name={b.name} active={b.active} onSaved={refresh}/>)}</details></div><div className="consortium-dialog-footer"><small>Kont / POS : total · aktif · sispann</small><Button variant="outline" onClick={()=>setPickerOpen(false)}>Fèmen</Button></div></DialogContent></Dialog>}
 {!access.isPlatformAdmin&&<label className="access-bank">Bank<select disabled={busy} value={bank} onChange={e=>chooseBank(e.target.value)}>{access.banks.filter(b=>b.active).map(b=><option value={b.id} key={b.id}>{b.name}</option>)}{!access.banks.some(b=>b.active)&&<option value="">Pa gen bank afekte</option>}</select></label>}
 {bankItem&&<section className="bank-context"><div><small>Bank aktyèl</small><h1>{bankItem.name}</h1><p>{members.filter(m=>m.active).length} kont aktif · {points.length} POS aktif</p></div>{access.isPlatformAdmin&&<Button disabled={busy} variant="outline" onClick={()=>setPickerOpen(true)}>Chanje bank</Button>}<nav aria-label="Jesyon bank">{(canManage||membership?.role==='supervisor')&&<button aria-current={screen==='dashboard'?'page':undefined} onClick={()=>setScreen('dashboard')}>Tablo de bò / Tikè / Rapò</button>}<button aria-current={screen==='points'?'page':undefined} onClick={()=>setScreen('points')}>Pwen vant</button>{canManage&&<><button aria-current={screen==='team'?'page':undefined} onClick={()=>setScreen('team')}>Administratè / Sipèvizè / Vandè</button><button aria-current={screen==='configuration'?'page':undefined} onClick={()=>setScreen('configuration')}>Lotri / Limit / Tarif / Orè</button></>}</nav></section>}

 {bankItem&&<><section hidden={screen!=="points"&&(canManage||membership?.role==='supervisor')} id="bank-points" className="panel access-panel"><h2>Pwen vant — {bankItem.name}</h2>{canManage&&<form onSubmit={e=>{e.preventDefault();void act('create_pos',{bank_id:bank,name:pointName})}}><label>Non pwen vant<Input required maxLength={120} value={pointName} onChange={e=>setPointName(e.target.value)}/></label><Button disabled={busy} type="submit">Ajoute pwen vant</Button></form>}
 <div className="access-points">{points.map(p=><article key={p.id}><b>{p.name} · {p.active?'Aktif':'Sispann'}</b>{canManage&&<BankEntityEditor key={p.id+p.name+p.active} bank={bank} id={p.id} kind="pos" name={p.name} active={p.active} onSaved={refresh}/>}<span hidden={!p.active}>{(access.isPlatformAdmin||membership?.role==='owner'||membership?.role==='seller')&&<Button variant="outline" onClick={()=>setOpened(p.id)}>Louvri pwen vant</Button>}</span></article>)}</div>{!points.length&&<p>{membership?.role==='seller'?'Admin bank dwe asiyen w yon pwen vant anvan ou ka vann. Pa gen pwen vant ki afekte ak kont vandè sa a.':'Pa gen pwen vant aktif ki afekte ak kont sa a.'}</p>}{membership?.role==='supervisor'&&<p>Aksè lekti sèlman sou pwen vant ki afekte avè w. Rapò yo montre sèlman POS yo asiyen ou.</p>}</section>
 {(canManage||membership?.role==='supervisor')&&<div hidden={screen!=="dashboard"} id="bank-sales" key={bank}><ServerSalesDashboard bank={bank} canCancel={canManage}/></div>}
 {canManage&&<section hidden={screen!=="team"} id="bank-team" className="panel access-panel"><h2>{editing?'Modifye dwa kont lan':'Kreye kont'}</h2><form onSubmit={e=>{e.preventDefault();void act(editing?'update_member':'create_member',{bank_id:bank,role,pos_ids:posIds,...editing?{user_id:editing,active}:{username,password,display_name:name}})}}>
 {!editing&&<><label>Non konplè<Input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label>Non itilizatè<Input required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}" autoComplete="off" value={username} onChange={e=>setUsername(e.target.value)}/></label><label>Modpas (12 karaktè minimòm)<Input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label></>}
 <label>Wòl<select value={role} onChange={e=>{setRole(e.target.value as AccessRole);setPosIds([])}}>{access.isPlatformAdmin&&<option value="owner">Admin bank</option>}<option value="supervisor">Sipèvizè</option><option value="seller">Vandè</option></select></label>
 {role!=='owner'&&<fieldset><legend>{role==='seller'?'Chwazi yon sèl pwen vant':'Afekte pwen vant yo'}</legend>{points.map(p=><label className="access-check" key={p.id}><Checkbox checked={posIds.includes(p.id)} onCheckedChange={checked=>setPosIds(old=>checked?role==='seller'?[p.id]:[...old,p.id]:old.filter(id=>id!==p.id))}/>{p.name}</label>)}</fieldset>}
 {editing&&<label className="access-check"><Checkbox checked={active} onCheckedChange={v=>setActive(v===true)}/>Kont aktif nan bank sa a</label>}
 <Button disabled={busy||(role==='seller'&&posIds.length!==1)} type="submit">{busy?'Ap anrejistre…':editing?'Anrejistre dwa yo':'Kreye kont lan'}</Button>{editing&&<Button type="button" variant="outline" onClick={clear}>Anile</Button>}</form>
 <div className="table-scroll"><table className="bank-table"><thead><tr><th>Kont</th><th>Wòl</th><th>Pwen vant</th><th>Estati</th><th>Aksyon</th></tr></thead><tbody>{members.map(m=>{const profile=access.profiles.find(p=>p.user_id===m.user_id);return <tr key={m.user_id}><td>{profile?.display_name||profile?.username||'Kont'}<small style={{display:'block'}}>{profile?.username}</small></td><td>{roleName[m.role]}</td><td>{access.assignments.filter(a=>a.user_id===m.user_id&&a.bank_id===bank).map(a=>points.find(p=>p.id===a.pos_id)?.name).filter(Boolean).join(', ')||'—'}</td><td>{m.active?'Aktif':'Sispann'}</td><td>{m.user_id!==access.userId&&(access.isPlatformAdmin||m.role!=='owner')&&<Button variant="outline" onClick={()=>{setEditing(m.user_id);setRole(m.role);setActive(m.active);setPassword('');setPosIds(access.assignments.filter(a=>a.user_id===m.user_id&&a.bank_id===bank).map(a=>a.pos_id))}}>Modifye</Button>}</td></tr>})}</tbody></table></div></section>}
 {canManage&&<div hidden={screen!=="configuration"} key={bank+bankItem.name}><BankConfiguration bank={bankItem} access={access} onDirty={setConfigDirty}/></div>}
 </>}
 </div></main>
}
