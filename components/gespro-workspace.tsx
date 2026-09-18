"use client";
import {scheduleTicketPrint} from "@/lib/print-ticket";
import {LotteryLogo,lotteryBrand} from "@/components/lottery-logo";
import {validateDrawPlay,playIdentity} from "@/lib/draw-rules";
import {secondsToClose} from "@/components/lottery-countdown";
import {addDominicanCatalog} from "@/lib/dominican-lotteries";
import {isMobileTicket} from "@/components/ticket-share";
import {useDemoState,DemoStorageBoundary,StorageNotice} from "@/components/demo-storage";
import {Localized,LanguageProvider,LanguageSettings,LanguageLauncher} from "@/components/language-settings";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Activity, BarChart3, Bell, CalendarClock, CircleDollarSign, ClipboardList,
  Copy, CreditCard, Dice5, FileText, Gauge, HelpCircle, History,
  LayoutDashboard, LogOut, Menu, Plus, Printer, RefreshCw, Search,
  Settings, ShieldCheck, Store, Ticket, Trash2, TrendingUp, Trophy,
  UserCog, Users, WalletCards, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {DesktopPosOptions} from "@/components/desktop-pos-options";
import { DrawResults } from "@/components/draw-results";
import { DashboardReport } from "@/components/dashboard-report";
import { ViewSales } from "@/components/view-sales";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

import { PayoutSettings, defaultPayoutRates, type PayoutRates } from "@/components/payout-settings";

import {LotteryCountdown} from "@/components/lottery-countdown";
import { Monitoring, TicketPrintout } from "@/components/monitoring";
import { DemoCash } from "@/components/demo-cash";
import { TicketActions } from "@/components/ticket-actions";
import { initialLotteryState, LotteryManagement, type LotteryState } from "@/components/lottery-management";
import { BankAdministration, initialBankManagement } from "@/components/bank-administration";
import { canCancel, latestDuplicableTicket, type MonitoredTicket } from "@/lib/monitoring";
import { PosLayoutSwitcher, usePosLayout, layoutColumns, type PosLayout } from "@/components/desktop-model-previews";

type View = "admin" | "pos";
import { parsePlayEntry, type PlayType } from "@/lib/play-entry";
type Play = { id: number; lottery: string; number: string; amount: number; type: PlayType };
type Owner = { name: string; lottery: string; sellers: number; status: string };
type WebMcpContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};

const adminNav = [
  ["Kès ak komisyon", WalletCards], ["Tablo bank", LayoutDashboard], ["Administratè", UserCog], ["PDV Transactions", CreditCard], ["Pwen vant", Store], ["Lotri", Dice5], ["Consortium", Users], ["Rezilta tiraj", Trophy], ["Piblikasyon tiraj", CalendarClock],
  ["Tableau de bord", LayoutDashboard], ["Mèt Bòlèt", Store], ["Sipèvizè", UserCog],
  ["Vandè", Users], ["Tikè", Ticket], ["Tiraj", Trophy], ["Rapò", BarChart3], ["Paramèt", Settings],
] as const;
const posMenu = [
  ["Monitoring", ClipboardList], ["Pending for payment", WalletCards], ["Sales history", History],
  ["Print report", Printer], ["Duplicate", Copy], ["Play monitor", ClipboardList], ["Pay", CreditCard],
  ["View sales", Gauge], ["Schedules", CalendarClock], ["Help", HelpCircle], ["Configuration", Settings],
  ["Authorize strikeout", ShieldCheck], ["Random plays generator", Dice5], ["Logout", LogOut],
] as const;
const initialPlays: Play[] = [];
const playGroup = (type: string) => type==="TRIPLETA"?"TRIPLETA": ["DIRECTO","BOUL PÈ","REVÈ"].includes(type) ? "DIRECTO" : type.startsWith("CASH 3") ? "CASH 3" : type.startsWith("PLAY 4") ? "PLAY 4" : type.startsWith("PICK 5") ? "PICK 5" : "PALÉ";

function Brand() {
  return <div className="brand" aria-label="GesPro"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span><strong>GesPro</strong><small>PLATFÒM LOTRI</small></span></div>;
}
function RolePreview({ view, setView }: { view: View; setView: (v: View) => void }) {
  return <div className="role-preview" aria-label="Chanje entèfas"><button className={view==="admin"?"active":""} onClick={()=>setView("admin")}>Super Admin</button><button className={view==="pos"?"active":""} onClick={()=>window.location.assign("/access")}><Localized text={"Pwen Vant"}/></button></div>;
}
function StatCard({ icon: Icon, tone, label, value, change }: { icon: typeof Activity; tone: string; label: string; value: string; change: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon /></div><div><p><Localized text={label}/></p><strong>{value}</strong><small><b>{change}</b> vs semèn pase</small></div></article>;
}

function SupportWorkspace({ owner, onExit, rates, onSaveRates }: { owner: Owner; onExit: () => void; rates: PayoutRates; onSaveRates: (rates: PayoutRates) => void }) {
  const [tab,setTab] = useState("limits");
  const [role,setRole] = useState("Super Admin");
  const games = ["Direct", "Palé", "Cash 3 Straight", "Cash 3 Box", "Play 4 Straight", "Play 4 Box", "Pick 5 Straight", "Pick 5 Box"];
  const days = ["Lendi", "Madi", "Mèkredi", "Jedi", "Vandredi", "Samdi", "Dimanch"];
  const defaults = [100, 5, 5, 5, 2, 0, 0, 0];
  const [scope,setScope] = useState("Jeneral bank");
  const [limits,setLimits] = useState<Record<string,number>>(()=>Object.fromEntries(games.flatMap((game,index)=>days.map((day)=>[`${game}-${day}`,defaults[index]]))));
  const [saved,setSaved] = useState(false);
  function updateLimit(game:string,day:string,value:string){setSaved(false);setLimits((items)=>({...items,[`${game}-${day}`]:Math.max(0,Number(value)||0)}))}
  return <>
    <section className="support-banner"><ShieldCheck /><div><b>{role === "Super Admin" ? "MÒD ASISTANS" : "MÈT BÒLÈT"} — {owner.lottery}</b><span>Dwa aksè reyèl konekte.</span></div><Button variant="outline" onClick={onExit}><X /><Localized text={" Sòti nan bank"}/></Button></section>
    <div className="bank-config-nav"><div role="group" aria-label="Seksyon konfigirasyon"><Button variant={tab==="limits"?"default":"outline"} onClick={()=>setTab("limits")}><Localized text={"Limit jwèt"}/></Button><Button variant={tab==="payouts"?"default":"outline"} onClick={()=>setTab("payouts")}><Localized text={"Peman pa kalite jwèt"}/></Button></div><label>Aperçu wòl<select value={role} onChange={event=>setRole(event.target.value)}><option>Super Admin</option><option><Localized text={"Mèt Bòlèt"}/></option></select></label></div>
    <div hidden={tab!=="limits"}><section className="panel support-workspace">
      <div className="panel-title"><div><p className="eyebrow">KONFIGIRASYON BANK</p><h2>Limit pa kalite jwèt ak pa jou</h2></div><span className="status valide">{owner.status}</span></div>
      <div className="limit-scopes" role="group" aria-label="Chwazi nivo limit la">{["Jeneral bank","Sipèvizè","PDV / Vandè"].map((item)=><button key={item} className={scope===item?"active":""} onClick={()=>{setScope(item);setSaved(false)}}>{item}</button>)}</div>
      <div className="limit-context"><Store /><span><b>{owner.lottery}</b><small>{scope} • Chak kalite jwèt ka gen yon valè diferan chak jou</small></span></div>
      <div className="limit-table-wrap"><table className="limit-table"><thead><tr><th><Localized text={"Kalite jwèt"}/></th>{days.map((day)=><th key={day}>{day}</th>)}</tr></thead><tbody>{games.map((game)=><tr key={game}><th>{game}</th>{days.map((day)=><td key={day}><div><span>$</span><input inputMode="decimal" aria-label={`${game} ${day}`} value={limits[`${game}-${day}`]} onChange={(event)=>updateLimit(game,day,event.target.value)} /></div></td>)}</tr>)}</tbody></table></div>
      <footer className="limit-footer"><span><b>0.00</b> bloke jwèt la pou jou sa a.</span><Button className="primary-action" onClick={()=>setSaved(true)}>{saved?"✓ Chanjman yo anrejistre":"Anrejistre limit yo"}</Button></footer>
    </section></div>
    <div hidden={tab!=="payouts"}><PayoutSettings bank={owner.lottery} rates={rates} onSave={onSaveRates} /></div>
  </>;
}

function AdminDashboard({ setView, tickets, onCancel, lotteryState, setLotteryState }: { onCancel: (id: string) => boolean; setView: (v: View) => void; tickets: MonitoredTicket[]; lotteryState:LotteryState; setLotteryState:React.Dispatch<React.SetStateAction<LotteryState>> }) {
  const [bankManagement,setBankManagement]=useDemoState("gespro-workspace.tsx:bankManagement",initialBankManagement);

  const [identity,setIdentity]=useDemoState("gespro-workspace.tsx:identity","super");
  const [bankRates,setBankRates] = useDemoState<Record<string,PayoutRates>>("gespro-workspace.tsx:bankRates",{});
  const [section,setSection] = useDemoState("gespro-workspace.tsx:section","Tableau de bord");
  const [owners,setOwners] = useDemoState<Owner[]>("gespro-workspace.tsx:owners",[]);
  const [ownerName,setOwnerName] = useState("");
  const [lotteryName,setLotteryName] = useState("");
  const [open,setOpen] = useState(false);
  const [supportOwner,setSupportOwner] = useState<Owner|null>(null);
  const [backend,setBackend] = useState<{configured:boolean;urlConfigured:boolean;anonKeyConfigured:boolean;serviceRoleConfigured:boolean}|null>(null);
  useEffect(()=>{void fetch("/api/gespro/schedule-notifications",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(v=>{if(v&&typeof v.unread==="number"){setScheduleUnread(v.unread);setScheduleNotices(Array.isArray(v.notifications)?v.notifications:[])}}).catch(()=>{})},[]);
  useEffect(()=>{void fetch("/api/backend-status",{cache:"no-store"}).then((response)=>response.json()).then(value=>{if(value && typeof value === "object" && "configured" in value)setBackend(value as NonNullable<typeof backend>)}).catch(()=>setBackend(null))},[]);
  function addOwner() {
    if (!ownerName.trim() || !lotteryName.trim()) return;
    setOwners((items)=>[...items,{name:ownerName.trim(),lottery:lotteryName.trim(),sellers:0,status:"Aktif"}]);
    setOwnerName(""); setLotteryName(""); setOpen(false); setSection("Mèt Bòlèt");
  }
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Brand /><nav aria-label="Navigasyon administrasyon">{adminNav.map(([label,Icon])=><button key={label} className={section===label?"active":""} onClick={()=>setSection(label)}><Icon /><span><Localized text={label}/></span></button>)}</nav><p className="trust-line">Plis pase yon sistèm,<br />se konfyans.</p></aside>
    <main className="admin-main">
      <header className="admin-topbar"><div className="admin-mobile-brand"><Brand /></div><label className="search-box"><Search /><input aria-label="Rechèch" placeholder="Rechèch tikè, vandè, mèt bòlèt..." /></label><RolePreview view="admin" setView={setView} /><button className="icon-button" aria-label="Notifikasyon orè" title={scheduleUnread?`${scheduleUnread} chanjman orè poko li`:"Pa gen nouvo chanjman orè"} onClick={()=>setScheduleOpen(true)}><Bell />{scheduleUnread>0&&<span>{scheduleUnread>99?"99+":scheduleUnread}</span>}</button><Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}><DialogContent><DialogHeader><DialogTitle>Chanjman orè tiraj</DialogTitle><DialogDescription>GesPro mete orè valide yo otomatikman; lis sa a montre sa ki chanje.</DialogDescription></DialogHeader><div className="schedule-notification-list">{scheduleNotices.length?scheduleNotices.map(n=><article key={n.id}><strong>{n.lottery_name}</strong><p>Tiraj: {n.old_draw_time||"—"} → {n.new_draw_time}</p><p>Cutoff: {n.old_cutoff_time||"—"} → {n.new_cutoff_time}</p><small>{new Date(n.detected_at).toLocaleString()}</small>{!n.acknowledged_at&&<button onClick={async()=>{const r=await fetch("/api/gespro/schedule-notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:n.id})});if(r.ok){setScheduleNotices(items=>items.map(x=>x.id===n.id?{...x,acknowledged_at:new Date().toISOString()}:x));setScheduleUnread(v=>Math.max(0,v-1))}}}>Make kòm li</button>}</article>):<p>Pa gen chanjman orè pou montre.</p>}</div></DialogContent></Dialog><div className="profile"><b>SA</b><span><strong>SUPER ADMIN</strong><small>Super Admin</small></span></div></header>
      <section className="admin-content">
        <div className="page-heading"><div><p className="eyebrow">GESPRO CONTROL CENTER</p><h1>{supportOwner?supportOwner.lottery:section}</h1></div>
          {!supportOwner&&<Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="primary-action"><Plus /><Localized text={" Kreye Mèt Bòlèt"}/></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle><Localized text={"Kreye yon Mèt Bòlèt"}/></DialogTitle><DialogDescription>Kont sa a ap kapab kreye sipèvizè ak vandè pou pwòp lotri pa li.</DialogDescription></DialogHeader><label className="form-label"><Localized text={"Non konplè"}/><Input value={ownerName} onChange={(e)=>setOwnerName(e.target.value)} placeholder="Egzanp: Jean Pierre" /></label><label className="form-label"><Localized text={"Non lotri a"}/><Input value={lotteryName} onChange={(e)=>setLotteryName(e.target.value)} placeholder="Egzanp: JP Bòlèt" /></label><DialogFooter><Button onClick={addOwner} className="primary-action"><Localized text={"Kreye kont lan"}/></Button></DialogFooter></DialogContent></Dialog>}
        </div>
        <div hidden={!!supportOwner||section!=="Kès ak komisyon"}><DemoCash tickets={tickets} banks={owners.map(o=>o.lottery)}/></div>
        {supportOwner ? <section className="panel bank-admin-panel"><Button variant="outline" onClick={()=>setSupportOwner(null)}><Localized text={"Sòti nan bank"}/></Button><h2>Lotri — {supportOwner.lottery}</h2><p>Konfigirasyon lotri ak peman.</p><LotteryManagement key={supportOwner.lottery} bank={supportOwner.lottery} isSuper={false} management={bankManagement} state={lotteryState} onChange={setLotteryState}/></section> : section==="Tableau de bord" ? <DashboardReport tickets={tickets} onCancel={onCancel}/> : section==="Mèt Bòlèt" ?
          <section className="panel owners-panel"><div className="panel-title"><div><p className="eyebrow">{owners.length} KONT</p><h2>Jesyon Mèt Bòlèt</h2></div></div><div className="owner-grid">{owners.map((owner)=><article key={owner.lottery} className="owner-card"><div className="owner-icon"><Store /></div><div><h3>{owner.lottery}</h3><p>{owner.name}</p></div><span className={`status ${owner.status==="Aktif"?"valide":"pèdi"}`}>{owner.status}</span><footer><span>{owner.sellers} vandè</span><button onClick={()=>setSupportOwner(owner)}>Antre nan bank →</button></footer></article>)}</div></section>
          : section==="Kès ak komisyon" ? null : section==="Paramèt" ?
          <section className="panel backend-panel"><LanguageLauncher/><div className="panel-title"><div><p className="eyebrow">FONDASYON SEKIRITE</p><h2>Backend GesPro</h2></div><span className={`connection-state ${backend?.configured?"online":"waiting"}`}>{backend?.configured?"Konekte":"Ap tann koneksyon"}</span></div><div className="backend-grid"><article><ShieldCheck /><div><h3>RLS ak wòl</h3><p>Separasyon kont bank, sipèvizè ak vandè aplike sou done lavant yo.</p></div><b><Localized text={"Aktive"}/></b></article><article><CircleDollarSign /><div><h3>Tranzaksyon atomik</h3><p>Limit nimewo verifye anvan tikè a valide.</p></div><b><Localized text={"Aktive"}/></b></article><article><CalendarClock /><div><h3>Fèmti tiraj</h3><p>Tiraj la fèmen otomatikman selon orè li.</p></div><b><Localized text={"Aktive"}/></b></article><article><Activity /><div><h3>Koneksyon Supabase</h3><p>{backend?.urlConfigured?"Adrès pwojè a antre.":"Bezwen URL ak kle pwojè Supabase la."}</p></div><b className={backend?.configured?"ready":"pending"}>{backend?.configured?"Konekte":"Poko konekte"}</b></article></div></section>
          : ["Rezilta tiraj","Piblikasyon tiraj"].includes(section)&&identity==="super" ? <DrawResults state={lotteryState} onChange={setLotteryState}/>
          : ["Tablo bank","Administratè","Sipèvizè","PDV Transactions","Pwen vant","Lotri","Consortium","Rezilta tiraj","Piblikasyon tiraj"].includes(section) ? <BankAdministration lotteryState={lotteryState} setLotteryState={setLotteryState} section={section} banks={owners} data={bankManagement} onChange={setBankManagement} tickets={tickets} identity={identity} setIdentity={setIdentity}/>
          : <section className="panel section-placeholder"><div className="placeholder-icon">{(()=>{const Icon=adminNav.find(([label])=>label===section)?.[1]??Activity;return <Icon />})()}</div><h2>{section}</h2><p>Espas sa a pare pou pwochen etap jesyon GesPro a.</p></section>}
      </section>
    </main>
  </div>;
}

function PosMenu({ onAction }: { onAction: (label:string) => void }) {
  const [menuOpen,setMenuOpen] = useState(false);
  return <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetTrigger asChild><Button variant="outline" className="menu-trigger"><Menu /><span>MENU</span></Button></SheetTrigger><SheetContent side="left" className="pos-drawer"><SheetHeader className="drawer-brand"><Brand /><SheetTitle className="sr-only">Meni Pwen Vant</SheetTitle><SheetDescription className="sr-only">Zouti jesyon Pwen Vant</SheetDescription></SheetHeader><nav>{posMenu.map(([label,Icon])=>label==="Logout"?<form key={label} action="/api/gespro/logout" method="post"><button type="submit"><Icon /><span><Localized text={label}/></span></button></form>:<button key={label} onClick={()=>{setMenuOpen(false);onAction(label)}}><Icon /><span><Localized text={label}/></span></button>)}</nav><p className="trust-line">Plis pase yon jwèt,<br />se konfyans.</p></SheetContent></Sheet>;
}

export function PosInterface({ setView, tickets, setTickets, lotteryState, identity, remote, posLayout: layoutProp, serverOffsetMs=0 }: { remote?:{create:(plays:MonitoredTicket["plays"])=>Promise<MonitoredTicket>;cancel:(id:string)=>Promise<boolean>}; identity?:{bank:string;pointId:string;seller:string}; posLayout?: PosLayout; serverOffsetMs?:number; lotteryState:LotteryState; setView: (v: View) => void; tickets: MonitoredTicket[]; setTickets: React.Dispatch<React.SetStateAction<MonitoredTicket[]>> }) {
  const posBank=identity?.bank??"",posId=identity?.pointId??"",sellerName=identity?.seller??"";
  const [monitorOpen,setMonitorOpen] = useState(false);
  const configuredLotteries=lotteryState.items.filter(i=>i.resultMode!=="pending"&&(!i.bank||i.bank===posBank)&&!lotteryState.removed[JSON.stringify([i.id,"*","removed"])]&&!lotteryState.removed[JSON.stringify([i.id,posBank,"removed"])]);
  const [clockNow,setClockNow]=useState(()=>new Date(Date.now()+serverOffsetMs));
  useEffect(()=>{const id=setInterval(()=>setClockNow(new Date(Date.now()+serverOffsetMs)),1000);return()=>clearInterval(id)},[serverOffsetMs]);
  const activeLotteries=configuredLotteries.filter(i=>{const schedule=lotteryState.closingTimes?.[JSON.stringify([i.id,posBank,"closing"])]??lotteryState.closingTimes?.[JSON.stringify([i.id,"*","closing"])];const remaining=schedule?.time?secondsToClose(schedule,clockNow):null;return remaining===null||remaining>0});
  const [action,setAction]=useState("");
  const [duplicateCode,setDuplicateCode]=useState("");
  const [duplicateTicket,setDuplicateTicket]=useState<MonitoredTicket|null>(null);
  const [duplicateMoveTo,setDuplicateMoveTo]=useState("");
  const creatingTicket = useRef(false);
  const [receiptToPrint,setReceiptToPrint]=useState<MonitoredTicket|null>(null);
  const firstStar=useRef<number|null>(null);
  useEffect(()=>{
    if(!receiptToPrint)return;
    const finish=()=>{setReceiptToPrint(null);creatingTicket.current=false;firstStar.current=null};
    const cancelPrint=isMobileTicket()?()=>{}:scheduleTicketPrint(()=>{setNotice("Enpresyon an pa disponib. Fich la sove; ou ka reenprime li nan Monitoring.");finish()});
    window.addEventListener("afterprint",finish);
    return()=>{cancelPrint();window.removeEventListener("afterprint",finish)};
  },[receiptToPrint]);
  function cancelMonitoredTicket(id: string):boolean|Promise<boolean> {
    if(remote)return remote.cancel(id);
    const ticket=tickets.find(item=>item.id===id);
    if(!ticket||ticket.bank!==posBank||!canCancel(ticket,Date.now()))return false;
    setTickets(items=>items.map(item=>item.id===id&&canCancel(item,Date.now())?{...item,status:"cancelled",cancelledAt:Date.now(),cancelledBy:sellerName}:item));
    return true;
  }
  const [posLayout,setPosLayout] = usePosLayout();
  useEffect(()=>{if(layoutProp)setPosLayout(layoutProp)},[layoutProp,setPosLayout]);
  const [selectedLottery,setSelectedLottery] = useDemoState("gespro-workspace.tsx:selectedLottery","GEORGIA EVENING");
  useEffect(()=>{if(!activeLotteries.some(i=>i.name===selectedLottery))setSelectedLottery(activeLotteries[0]?.name??"")},[lotteryState,selectedLottery]);
  const [number,setNumber] = useDemoState("gespro-workspace.tsx:number","");
  const [amounts,setAmounts] = useDemoState<Record<string,string>>("gespro-workspace.tsx:amounts",{"DIRECTO":"2.00","PALÉ":"2.00","CASH 3":"2.00","PLAY 4":"2.00","PICK 5":"2.00"});
  const [lastEntryGroup,setLastEntryGroup] = useDemoState("gespro-workspace.tsx:lastEntryGroup","DIRECTO");
  let entryGroup=lastEntryGroup;
  try { entryGroup=playGroup(parsePlayEntry(number)[0].type); } catch {}
  const amount=amounts[entryGroup]??"2.00";
  const setAmount=(value:string)=>setAmounts(items=>({...items,[entryGroup]:value}));
  const [plays,setPlays] = useDemoState("gespro-workspace.tsx:plays",initialPlays); const [notice,setNotice] = useState("");
  const [multiples,setMultiples] = useDemoState("gespro-workspace.tsx:multiples",false); const [discount,setDiscount] = useDemoState("gespro-workspace.tsx:discount",false);
  const [multipleLotteries,setMultipleLotteries] = useDemoState<string[]>("gespro-workspace.tsx:multipleLotteries",[]);
  const saleLotteries = multiples ? multipleLotteries : (selectedLottery ? [selectedLottery] : []);
  useEffect(()=>{
    setMultipleLotteries(current=>{
      const available=current.filter(name=>activeLotteries.some(l=>l.name===name));
      return available.length===current.length?current:available;
    });
  },[lotteryState]);
  const total = useMemo(()=>plays.reduce((sum,play)=>sum+play.amount,0),[plays]);
  const lotteryStripRef = useRef<HTMLElement>(null);
  function scrollLotteries(direction:number){
    const strip=lotteryStripRef.current;
    if(strip)strip.scrollBy({left:direction*Math.max(140,strip.clientWidth*.7),behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  }
  const numberRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(plays.reduce((n,p)=>Math.max(n,p.id+1),1));
  useEffect(() => {
    const context = (document as unknown as { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const report = () => undefined;
    void Promise.resolve(context.registerTool({
      name: "add_ticket_play",
      title: "Ajoute jwèt nan tikè",
      description: "Ajoute yon nimewo ak montan nan tikè ki vizib sou ekran Pwen Vant GesPro a.",
      inputSchema: {
        type: "object",
        properties: {
          number: { type: "string", maxLength: 32 },
          amount: { type: "number", exclusiveMinimum: 0 },
          lottery: { type: "string" },
        },
        required: ["number", "amount"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const value = input as { number?: string; amount?: number; lottery?: string };
        const clean = String(value.number ?? "").trim();
        const cash = Number(value.amount);
        if (!clean || !Number.isFinite(cash) || cash <= 0) throw new Error("Nimewo oswa montan an pa valab.");
        const parsed = parsePlayEntry(clean);
        const targets = value.lottery?.trim() ? [value.lottery.trim()] : saleLotteries;
        validateLotteries(targets);
        const added=targets.flatMap(lottery=>parsed.map(play=>({id:nextId.current++,lottery,number:play.number,amount:cash,type:play.type})));
        appendPlays(added);
        return { status: "added", input: clean, generated: parsed, amount_each: cash, lotteries: targets };
      },
    }, { signal: lifecycle.signal })).catch(report);
    void Promise.resolve(context.registerTool({
      name: "create_ticket",
      title: "Kreye tikè",
      description: "Finalize tikè ki vizib la avèk tout jwèt li yo.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        if (!plays.length) throw new Error("Tikè a pa gen okenn jwèt.");
        return createTicket();
      },
    }, { signal: lifecycle.signal })).catch(report);
    return () => lifecycle.abort();
  }, [plays, selectedLottery, total, multiples, multipleLotteries, lotteryState]);
  function validateTicketPlays(entries:Play[]) {
    const now=new Date(Date.now()+serverOffsetMs);
    for(const play of entries){
      const item=activeLotteries.find(l=>l.name===play.lottery);
      if(!item)throw new Error("Lotri sa a pa disponib.");
      validateDrawPlay(item,play);
      const schedule=lotteryState.closingTimes?.[JSON.stringify([item.id,posBank,"closing"]) ]??lotteryState.closingTimes?.[JSON.stringify([item.id,"*","closing"])];
      if(schedule?.time){
        const remaining=secondsToClose(schedule,now);
        if(remaining===null)throw new Error(`Verifye lè fèmti ${item.name}.`);
        if(remaining<=0)throw new Error(`${item.name} fèmen pou jodi a.`);
      }
    }
  }
  function appendPlays(added:Play[]) {
    validateTicketPlays(added);
    const key=(play:Play)=>playIdentity(play);
    const seen=new Set(plays.map(key));
    for(const play of added){
      if(seen.has(key(play))){
        const message=`Boul ${play.number} deja nan fich la pou ${play.lottery}.`;
        setNotice(message);
        throw new Error(message);
      }
      seen.add(key(play));
    }
    setPlays(items=>[...items,...added]);
    setNotice("");
  }
  function validateLotteries(names:string[]) {
    if(!names.length)throw new Error("Chwazi omwen yon lotri anvan ou ajoute jwèt.");
    if(names.some(name=>!activeLotteries.some(l=>l.name===name)))throw new Error("Yon lotri chwazi pa aktive pou bank la.");
  }
  function toggleMultiples(enabled:boolean) {
    setMultiples(enabled);
    if(enabled)setMultipleLotteries(activeLotteries.some(l=>l.name===selectedLottery)?[selectedLottery]:[]);
    else if(multipleLotteries.length)setSelectedLottery(multipleLotteries.includes(selectedLottery)?selectedLottery:multipleLotteries[0]);
    setNotice("");
  }
  function chooseLottery(name:string) {
    if(multiples)setMultipleLotteries(current=>current.includes(name)?current.filter(item=>item!==name):[...current,name]);
    setSelectedLottery(name);
    numberRef.current?.focus();
  }
  function focusAmount() {
    try { parsePlayEntry(number); setNotice(""); amountRef.current?.focus(); amountRef.current?.select(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Fòma boul la pa valab."); }
  }
  function addPlay(amountOverride=amount) {
    const cash=Number(amountOverride);
    if(!number.trim()||!Number.isFinite(cash)||cash<=0){setNotice("Antre yon boul ak yon montan ki valab.");return}
    try {
      validateLotteries(saleLotteries);
      const parsed=parsePlayEntry(number);
      const group=playGroup(parsed[0].type);
      setLastEntryGroup(group);
      setAmounts(items=>({...items,[group]:cash.toFixed(2)}));
      const added=saleLotteries.flatMap(lottery=>parsed.map(play=>({id:nextId.current++,lottery,number:play.number,amount:cash,type:play.type})));
      appendPlays(added);
      setNumber("");numberRef.current?.focus();
    } catch(error) {
      setNotice(error instanceof Error?error.message:"Fòma boul la pa valab.");
    }
  }
  async function createTicket(){
    if(creatingTicket.current)return;
    if(!plays.length){setNotice("Ajoute omwen yon jwèt anvan ou kreye tikè a.");return}
    if(plays.some(p=>!activeLotteries.some(l=>l.name===p.lottery))){setNotice("Yon lotri nan fich la dezaktive. Retire jwèt sa yo anvan ou kontinye.");return}
    try{
      validateTicketPlays(plays);
      if(new Set(plays.map(playIdentity)).size!==plays.length)throw new Error("Gen boul ki repete nan fich la.");
    }catch(error){setNotice(error instanceof Error?error.message:"Verifye fich la.");return}
    creatingTicket.current=true;
    if(!remote){setNotice("Koneksyon sèvè a obligatwa pou kreye tikè.");creatingTicket.current=false;return}
    const submitted=[...plays];setNotice("Ap sove tikè sou sèvè a…");
    try{const ticket=await remote.create(submitted.map(({lottery,number,amount,type})=>({lottery,number,amount,type})));setPlays(items=>items.filter(p=>!submitted.some(old=>old.id===p.id)));setNotice("Tikè la sove sou sèvè a.");setReceiptToPrint(ticket)}
    catch(error){setNotice(error instanceof Error?error.message:"Tikè a pa konfime. Retrye menm fich la apre koneksyon an retounen.")}
    finally{creatingTicket.current=false}
  }
  function menuAction(label:string){
    if(["View sales","Print report"].includes(label)){setAction("View sales");return}
    if(["Monitoring","Pending for payment","Sales history","Print report","Play monitor","Pay","View sales","Authorize strikeout"].includes(label)){setMonitorOpen(true);return}
    if(label==="Duplicate"){setDuplicateCode("");setDuplicateTicket(null);setDuplicateMoveTo("");setAction("Duplicate");return}
    setAction(label);
  }
  return <main className={`pos-shell pos-layout-${posLayout}` } onKeyDownCapture={event=>{
    if(!event.currentTarget.contains(event.target as Node)||(event.target as HTMLElement).closest('[role="dialog"]')||monitorOpen||action||event.nativeEvent.isComposing)return;
    if(event.key!=="*"){firstStar.current=null;return}
    event.preventDefault();
    if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
    const now=Date.now();
    if(firstStar.current!==null&&now-firstStar.current<=1000){firstStar.current=null;createTicket()}
    else firstStar.current=now;
  }}>
    <TicketPrintout tickets={receiptToPrint?[receiptToPrint]:[]} copy={false}/>
    <ViewSales bank={posBank} pointId={posId} results={(lotteryState.results||[]).map(r=>({...r,name:lotteryState.items.find(i=>i.id===r.lotteryId)?.name||r.lotteryId}))} lotteries={activeLotteries.map(l=>l.name)} open={action==="View sales"} onOpenChange={open=>{if(!open)setAction("")}} tickets={tickets}/>
    <LanguageSettings open={action==="Configuration"} onOpenChange={open=>{if(!open)setAction("")}}/>
    <Dialog open={action==="Duplicate"} onOpenChange={open=>{if(!open){setAction("");setDuplicateTicket(null);setDuplicateCode("");setDuplicateMoveTo("")}}}><DialogContent><DialogHeader><DialogTitle>DUPLICATE</DialogTitle><DialogDescription>TICKET SERIAL NUMBER</DialogDescription></DialogHeader>{!duplicateTicket?<><Input autoFocus inputMode="numeric" value={duplicateCode} onChange={e=>setDuplicateCode(e.target.value.replace(/\D/g,"").slice(-4))} onKeyDown={e=>{if(e.key==="Enter"){const found=tickets.filter(t=>t.bank===posBank&&t.pointOfSaleId===posId&&t.id.replace(/\D/g,"").slice(-4)===duplicateCode);if(found.length===1)setDuplicateTicket(found[0]);else setNotice(found.length?"Plizyè fich gen menm 4 chif sa yo.":"Fich la pa jwenn.")}}}/><DialogFooter><Button onClick={()=>{const found=tickets.filter(t=>t.bank===posBank&&t.pointOfSaleId===posId&&t.id.replace(/\D/g,"").slice(-4)===duplicateCode);if(found.length===1)setDuplicateTicket(found[0]);else setNotice(found.length?"Plizyè fich gen menm 4 chif sa yo.":"Fich la pa jwenn.")}}>LOAD TICKET</Button><Button variant="outline" onClick={()=>setAction("")}>CLOSE</Button></DialogFooter></>:<><Input value={duplicateTicket.id} readOnly/><div><b>Lottery</b><p>{[...new Set(duplicateTicket.plays.map(p=>p.lottery))].join(", ")}</p><b>Move to</b><select value={duplicateMoveTo} onChange={e=>setDuplicateMoveTo(e.target.value)}><option value="">--- Chwazi tiraj ---</option>{activeLotteries.map(l=><option key={l.name} value={l.name}>{l.name}</option>)}</select></div><DialogFooter><Button disabled={!duplicateMoveTo} onClick={()=>{if(!duplicateMoveTo){setNotice("Chwazi yon tiraj ki ouvè pou kopye fich la.");return}const target=activeLotteries.find(l=>l.name===duplicateMoveTo);if(!target){setNotice("Tiraj sa a fèmen oswa li pa disponib.");return}const copied=duplicateTicket.plays.map(p=>({...p,id:nextId.current++,lottery:target.name}));try{appendPlays(copied);setAction("");setDuplicateTicket(null);setDuplicateCode("");setDuplicateMoveTo("")}catch(error){setNotice(error instanceof Error?error.message:"Fich la pa ka duplike.")}}}>DUPLICATE</Button><Button variant="outline" onClick={()=>setAction("")}>CLOSE</Button></DialogFooter></>}</DialogContent></Dialog>
    <Dialog open={Boolean(action)&&action!=="View sales"&&action!=="Configuration"&&action!=="Duplicate"} onOpenChange={open=>{if(!open)setAction("")}}><DialogContent><DialogHeader><DialogTitle>{action}</DialogTitle><DialogDescription>{action==="Help"?"Antre boul la, peze Enter, mete montan an, epi peze Enter pou ajoute. Kreye tikè lè fich la fini.":action==="Schedules"?"Orè tiraj yo disponib nan konfigirasyon bank la.":action==="Configuration"?"Konfigirasyon lotri ak payout disponib nan Admin → Lotri.":"Fonksyon sa a disponib."}</DialogDescription></DialogHeader>{action==="Help"&&<div className="play-format-help"><h3>Fòma pou jwe</h3><table><thead><tr><th>Tape</th><th>Rezilta</th></tr></thead><tbody>{[
["12","Directo: 12"],["12.","Revè: 12 ak 21"],["00d99","Boul pè: 00, 11, 22…99"],["1234","Palé: 12–34"],["1234.","Palé ak revè: 12–34, 12–43, 21–34, 21–43"],["123","Cash 3 Straight"],["123+","Cash 3 Box: yon sèl jwèt"],["123q","Combo: 123, 132, 213, 231, 312, 321"],["112q","Combo: 112, 121, 211 — san repetisyon"],["1234-","Play 4 Straight"],["1234+","Play 4 Box"],["12345-","Pick 5 Straight"],["12345+","Pick 5 Box"]
].map(([input,result])=><tr key={input}><td><code>{input}</code></td><td>{result}</td></tr>)}</tbody></table><p>Montan an aplike sou chak jwèt ki ajoute. Egzanp: 123q ak $2 bay 6 jwèt, total $12. Zewo devan yo konsève.</p><p><b>Mult. lot:</b> aktive li, chwazi lotri yo, epi ajoute boul ak montan an. Menm jwèt yo antre sou chak lotri chwazi.</p><p><b>Enprime:</b> klike Kreye Tikè, oswa peze * de fwa rapid sou klavye a.</p></div>}</DialogContent></Dialog>
    <Monitoring serverBacked={!!remote} open={monitorOpen} onOpenChange={setMonitorOpen} tickets={tickets.filter(ticket=>ticket.bank===posBank&&ticket.pointOfSaleId===posId)} onCancel={cancelMonitoredTicket} />
    <header className="pos-topbar"><div className="pos-brand-row"><PosMenu onAction={menuAction} /><Brand /></div><DesktopPosOptions state={lotteryState} bank={posBank}/>{!layoutProp&&<PosLayoutSwitcher value={posLayout} onChange={setPosLayout}/>}{!identity&&<RolePreview view="pos" setView={setView} />}<button className="icon-button dark" aria-label="Notifikasyon"><Bell /><span>3</span></button><div className="profile light"><b>JP</b><span><strong><Localized text={"VANDÈ"}/></strong><small>{sellerName}</small></span></div></header>
    {activeLotteries.find(l=>l.name===selectedLottery)?.resultMode==="dominican3"&&<p className="payout-note">Quiniela: 05 • Palé: 0528 • Tripleta: 052890.</p>}<div className="lottery-navigation"><button className="lottery-scroll-arrow" aria-label="Lotri anvan yo" onClick={()=>scrollLotteries(-1)}><ChevronLeft /></button><section ref={lotteryStripRef} className="lottery-strip" aria-label="Chwazi lotri">{activeLotteries.map((lottery)=><button key={lottery.name} data-lottery-brand={lotteryBrand(lottery)} aria-pressed={saleLotteries.includes(lottery.name)} className={saleLotteries.includes(lottery.name)?"active":""} onClick={()=>chooseLottery(lottery.name)}><span className="lottery-name">{lottery.name}</span><LotteryLogo lottery={lottery}/><LotteryCountdown serverOffsetMs={serverOffsetMs} schedule={lotteryState.closingTimes?.[JSON.stringify([lottery.id,posBank,"closing"])]??lotteryState.closingTimes?.[JSON.stringify([lottery.id,"*","closing"])]}/></button>)}</section><button className="lottery-scroll-arrow" aria-label="Lotri apre yo" onClick={()=>scrollLotteries(1)}><ChevronRight /></button></div>
    <div className="desktop-lottery-actions quick-actions"><button aria-label="Duplike" title="Duplike" onClick={()=>menuAction("Duplicate")}><Copy aria-hidden="true" /></button><button aria-label="Enprime" title="Enprime" onClick={()=>setMonitorOpen(true)}><Printer aria-hidden="true" /></button><button aria-label="Peye" title="Peye" onClick={()=>setMonitorOpen(true)}><span aria-hidden="true">$</span></button><button aria-label="Èd" title="Èd" onClick={()=>setAction("Help")}><span aria-hidden="true">?</span></button></div>
    <section className="ticket-toolbar">
      <div className="balance-panel"><div className="balance"><span><WalletCards /></span><div><small><Localized text={"Balans Vandè"}/></small><strong>{identity?"—":"$0.00"}</strong></div><button onClick={()=>setNotice("Rafrechi balans…")}><RefreshCw /><Localized text={" Rafrechi"}/></button></div><TicketActions serverBacked={!!remote} tickets={tickets.filter(t=>t.pointOfSaleId===posId)} bank={posBank} onCancel={cancelMonitoredTicket} onError={setNotice}/></div>
      <div className="entry-controls"><label><span className="desktop-entry-label"><Localized text={"Boul"}/></span><Input ref={numberRef} type="text" inputMode="text" enterKeyHint="next" value={number} maxLength={32} autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" onChange={(e)=>setNumber(e.target.value)} placeholder="PLAY" onKeyDown={(e)=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing){e.preventDefault();if(!e.repeat)focusAmount()}}} /></label><div className="mobile-game-kind">{number.trim()?entryGroup:"N/A"}</div><label><span className="desktop-entry-label"><Localized text={"Montan pou chak boul"}/></span><div className="money-input"><span>$</span><Input ref={amountRef} placeholder="AMOUNT" onFocus={e=>e.currentTarget.select()} onKeyDown={(e)=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing){e.preventDefault();if(!e.repeat)addPlay()}}} inputMode="decimal" value={amount} onChange={(e)=>setAmount(e.target.value)} /></div></label><div className="toggles"><label>Disc. <Switch checked={discount} onCheckedChange={value=>{setDiscount(value);setNotice("Rabè poko aplike sou total la.")}} /></label><label className={"multi-lottery-toggle"+(multiples?" is-active":"")}>Mult. lot <Switch aria-label="Mult. lot" checked={multiples} onCheckedChange={toggleMultiples} /></label></div><Button className="mobile-entry-add" onPointerDown={e=>e.preventDefault()} onClick={()=>addPlay()}><Plus /><Localized text={" AJOUTE"}/></Button></div>
      <div className="ticket-summary"><div><span><Localized text={"Jwèt: "}/><b>{plays.length}</b></span><span>Total: <strong>${total.toFixed(2)}</strong></span></div><Button className="remove-last-play" onClick={()=>setPlays(items=>items.slice(0,-1))} variant="outline" aria-label="Retire dènye jwèt">−</Button><Button onClick={()=>addPlay()} variant="outline" className="mobile-plus-play" aria-label="Ajoute jwèt">+</Button><Button onClick={()=>addPlay()} variant="outline" className="add-play"><span className="desktop-entry-label"><Plus /><Localized text={" AJOUTE"}/></span><span className="mobile-entry-label">ENTER</span></Button><Button onClick={createTicket} className="create-ticket"><span className="desktop-entry-label"><Plus /><Localized text={" KREYE TIKÈ"}/></span><span className="mobile-entry-label">CREATE TICKET</span></Button></div>
    </section>
    {notice&&<div className="notice error-notice" role="alert"><span><Localized text={notice}/></span><button onClick={()=>setNotice("")} aria-label="Fèmen"><X /></button></div>}
    <section className="mobile-plays" aria-label="Tout jwèt yo">
      <article className="play-card">
        <header><span><FileText /></span><h2>PLAYS</h2><b>{plays.length}<Localized text={" jwèt"}/></b></header>
        <div className="play-table">
          <div className="play-head"><span>LOT</span><span>NUM</span><span>$</span><span><Trash2 aria-label="Aksyon"/></span></div>
          {plays.length ? plays.map(play=><div className="play-row" key={play.id}>
            <span>{play.lottery}</span><strong>{play.number}{play.type.endsWith("STRAIGHT")?"Str":play.type.endsWith("BOX")?"Box":""}</strong><span>{play.amount}</span>
            <button onClick={()=>setPlays(items=>items.filter(item=>item.id!==play.id))} aria-label={`Efase ${play.number}`}><Trash2 /></button>
          </div>) : <div className="empty-plays"><FileText /><strong><Localized text={"Pa gen jwèt ankò"}/></strong><span><Localized text={"Antre yon nimewo pou ajoute."}/></span></div>}
        </div>
        <footer className="category-total"><span>TOTAL:</span><output>${total.toFixed(2)}</output></footer>
      </article>
      <Button className="mobile-bottom-action" onClick={()=>menuAction("Duplicate")}>DUPLICATE</Button>
      <Button className="mobile-bottom-action" onClick={()=>setAction("Help")}>HELP</Button>
    </section>
    <section className="play-columns" data-pos-layout={posLayout}>{layoutColumns[posLayout].map((col)=>{const colPlays=plays.filter((play)=>col.groups.includes(playGroup(play.type)));const colTotal=colPlays.reduce((sum,play)=>sum+play.amount,0);const Icon=col.icon==="dice"?Dice5:col.icon==="gauge"?Gauge:Users;return <article className="play-card" key={col.title} data-show-total={col.showTotal}><header><span><Icon /></span><h2>{col.title}</h2><b>{colPlays.length}<Localized text={" jwèt"}/></b></header><div className="play-table"><div className="play-head"><span><Localized text={"Lotri"}/></span><span><Localized text={"Nimewo"}/></span><span><Localized text={"Montan"}/></span><span><Localized text={"Aksyon"}/></span></div>{colPlays.length?colPlays.map((play)=><div className="play-row" key={play.id}><span>{play.lottery}</span><strong>{play.number}</strong><span>${play.amount.toFixed(2)}</span><button onClick={()=>setPlays((items)=>items.filter((item)=>item.id!==play.id))} aria-label={`Efase ${play.number}`}><Trash2 /></button></div>):<div className="empty-plays"><FileText /><strong><Localized text={"Pa gen jwèt ankò"}/></strong><span><Localized text={"Antre yon nimewo pou ajoute."}/></span></div>}</div>{col.showTotal&&<footer className="category-total"><span>TOTAL</span><output aria-label={`Total ${col.title}`}>${colTotal.toFixed(2)}</output></footer>}</article>})}</section>
  </main>;
}

function Workspace(){
  const[view,setView]=useDemoState<View>("gespro-workspace.tsx:view","admin");
  const[tickets,setTickets]=useDemoState<MonitoredTicket[]>("gespro-workspace.tsx:tickets",[]);
  const [lotteryState,setLotteryState]=useDemoState("gespro-workspace.tsx:lotteryState",initialLotteryState);
  useEffect(()=>{setLotteryState(current=>addDominicanCatalog(current))},[setLotteryState]);
  return <><div hidden={view!=="admin"}><AdminDashboard setView={setView} tickets={tickets} onCancel={id=>{const ticket=tickets.find(t=>t.id===id);const now=Date.now();if(!ticket||!canCancel(ticket,now))return false;setTickets(items=>items.map(t=>t.id===id&&canCancel(t,now)?{...t,status:"cancelled",cancelledAt:now,cancelledBy:"Super Admin"}:t));return true}} lotteryState={lotteryState} setLotteryState={setLotteryState}/></div><div hidden={view!=="pos"}><PosInterface setView={setView} tickets={tickets} setTickets={setTickets} lotteryState={lotteryState}/></div></>;
}

export default function Home(){return <DemoStorageBoundary><LanguageProvider><StorageNotice/><Workspace/></LanguageProvider></DemoStorageBoundary>}
