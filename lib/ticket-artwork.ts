import JsBarcode from "jsbarcode";
import type {MonitoredTicket,TicketPlay} from "./monitoring";

const W=1170, M=62;
// Model 2: high-contrast 58mm thermal typography matching the supplied receipt.
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const amount=(n:number)=>n.toFixed(2);
const playLabel=(p:TicketPlay)=>p.number+(p.type.endsWith("STRAIGHT")?"Str":p.type.endsWith("BOX")?"Box":"");
type Artwork={width:number;height:number;svg:string;url?:string};
// Ticket state is updated immutably. Weak keys release receipts when no longer used.
const artworkCache=new WeakMap<MonitoredTicket,Map<boolean,Artwork>>();
// Active print template: supplied Model 2 thermal layout. Model 1 remains available as the alternate source style.
export type TicketModel="model1"|"model2";
// Both approved receipt models are intentionally retained. Model 2 is active; Model 1 is the saved alternate.
export const SAVED_TICKET_MODELS:readonly TicketModel[]=["model1","model2"];
export const ACTIVE_TICKET_MODEL:TicketModel="model2";
const usesLegacyBarcode=(model:TicketModel)=>model==="model1";
export function ticketArtwork(ticket:MonitoredTicket,copy:boolean):Artwork{
 const cached=artworkCache.get(ticket)?.get(copy);
 if(cached)return cached;
 let y=92;const parts:string[]=[];
 const text=(value:string,x:number,size:number,anchor="start",italic=false,heavy=false)=>parts.push(`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}"${italic?' font-style="italic"':''}${heavy?' font-family="Impact, Arial Black, DejaVu Sans Condensed, sans-serif" font-weight="900"':''}>${escape(value)}</text>`);
 const center=(value:string,size=54,heavy=false)=>{text(value,W/2,size,"middle",false,heavy);y+=size+24};
 const rule=()=>{text("================================",W/2,52,"middle",false,true);y+=64};
 // Keep names and identifiers real; never copy the sample receipt's serial or payouts.
 const wrap=(value:string,size:number)=>{const max=Math.max(1,Math.floor((W-M*2)/(size*.61)));for(let i=0;i<value.length;i+=max)center(value.slice(i,i+max),size)};
 const posRaw=String(ticket.agentCode||ticket.pointOfSaleName||ticket.pointOfSaleId||ticket.seller);const posNumber=posRaw.replace(/^\s*(?:post|pos|po)\s*/i,"");center(`POST ${posNumber}`,76,true);center(copy?"** COPY **":"** ORIGINAL **",68,true);
 const d=new Date(ticket.createdAt),pad=(n:number)=>String(n).padStart(2,"0");
 text(`${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getHours()>=12?"PM":"AM"}`,W/2,52,"middle",false,true);y+=60;
 text(`Ticket: ${ticket.id}`,M,50);y+=55;
 text(`Date: ${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getHours()>=12?"PM":"AM"}`,M,50);y+=76;
 const serial=(ticket as MonitoredTicket&{serial?:string}).serial;if(serial&&serial!==ticket.id)wrap(serial,46);
 const code:{encodings?:{data:string}[]}={};
 JsBarcode(code,ticket.id,{format:"CODE128",displayValue:false,margin:0});
 const bars=code.encodings?.map(e=>e.data).join("")||"";
 const model:TicketModel=ticket.ticketModel??ACTIVE_TICKET_MODEL;
 if(usesLegacyBarcode(model)){const barWidth=790/bars.length,left=(W-790)/2;for(let i=0;i<bars.length;i++)if(bars[i]==="1")parts.push(`<rect x="${left+i*barWidth}" y="${y-12}" width="${barWidth+.05}" height="180"/>`);y+=215;center(ticket.id,54);}rule();
 for(const lottery of [...new Set(ticket.plays.map(p=>p.lottery))]){
  const plays=ticket.plays.filter(p=>p.lottery===lottery);
  wrap(`${lottery}: ${amount(plays.reduce((sum,p)=>sum+Math.round(p.amount*100),0)/100)}`,60);rule();
  const columns=[M+12,330,600,852];
  ["PLAY","AMOUNT","PLAY","AMOUNT"].forEach((s,i)=>text(s,columns[i],54,"start",false,true));y+=80;
  const rows=Math.ceil(plays.length/2);
  // Fill down the left column then down the right, as on the supplied receipt.
  for(let row=0;row<rows;row++){
   [plays[row],plays[row+rows]].forEach((p,col)=>{if(!p)return;const label=playLabel(p);text(label,columns[col*2],Math.min(58,250/(label.length*.61)),"start",false,true);const value=amount(p.amount);text(value,columns[col*2+1],Math.min(58,235/(value.length*.61)),"start",false,true);});y+=80;
  }
  rule();
 }
 center(`-- TOTAL: ${amount(ticket.amount)} --`,78);rule();
 const payout=(ticket as MonitoredTicket&{payoutLines?:string[]}).payoutLines||[];for(const line of payout)wrap(line,40);
 if(ticket.status==="cancelled")center("ANILE",48);
 else if(ticket.paidAt)center("PEYE",48);
 else if(ticket.status==="winner")center("GENYEN — AN ATANT PEMAN",38);
 else if(ticket.status==="loser")center("PÈDI",48);
 y+=10;
 const artwork:Artwork={width:W,height:y,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}" viewBox="0 0 ${W} ${y}"><rect width="100%" height="100%" fill="white"/><g fill="#111" font-family="Arial Narrow, DejaVu Sans Condensed, sans-serif" font-weight="900">${parts.join("")}</g></svg>`};
 const variants=artworkCache.get(ticket)??new Map<boolean,Artwork>();
 variants.set(copy,artwork);artworkCache.set(ticket,variants);return artwork;
}
export function ticketArtworkUrl(ticket:MonitoredTicket,copy:boolean){const artwork=ticketArtwork(ticket,copy);return artwork.url??(artwork.url="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(artwork.svg))}
