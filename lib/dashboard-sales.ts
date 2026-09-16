import {periodTickets,ticketDate,type MonitoredTicket} from './monitoring';
export function salesSummary(tickets:MonitoredTicket[]){
 const active=tickets.filter(t=>t.status!=='cancelled');
 const sum=(rows:MonitoredTicket[],field:'amount'|'prize')=>rows.reduce((n,t)=>n+Math.round(t[field]*100),0)/100;
 return {count:tickets.length,amount:sum(active,'amount'),prize:sum(active,'prize'),net:sum(active,'amount')-sum(active,'prize'),cancelled:tickets.filter(t=>t.status==='cancelled').length};
}
export function dashboardSales(tickets:MonitoredTicket[],from:string,to:string,bank:string){
 const period=periodTickets(tickets,from,to).filter(t=>bank==='*'||t.bank===bank);
 const groups=new Map<string,MonitoredTicket[]>();
 for(const ticket of period){const key=JSON.stringify([ticket.bank||'',ticket.pointOfSaleId||'']);groups.set(key,[...(groups.get(key)||[]),ticket])}
 const points=[...groups].map(([key,rows])=>({key,bank:rows[0].bank||'',id:rows[0].pointOfSaleId||'',name:rows[0].pointOfSaleName||rows[0].pointOfSaleId||'',...salesSummary(rows)})).sort((a,b)=>b.amount-a.amount||a.key.localeCompare(b.key));
 const days=[...new Set(period.map(t=>ticketDate(t.createdAt)))].sort().reverse().map(date=>({date,...salesSummary(period.filter(t=>ticketDate(t.createdAt)===date))}));
 return {period,points,days,...salesSummary(period)};
}
