import type { PlayType } from "@/lib/play-entry";
export type TicketPlay = { lottery: string; number: string; amount: number; type: PlayType };
export type MonitoredTicket = {
  storage?: "server"; sellerId?:string; pointOfSaleName?:string;
  bank?: string; pointOfSaleId?: string; agentCode?: string;
  id: string; createdAt: number; seller: string; amount: number; prize: number;
  status: "pending" | "winner" | "loser" | "cancelled"; paidAt?: number; paidBy?: string;
  cancelledAt?: number; cancelledBy?: string; cancelUntil: number; plays: TicketPlay[]; payoutSnapshot?:Record<string,unknown>;
};
export const ticketDate = (time: number) => {
  const date = new Date(time);
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
};
export const canCancel = (ticket: MonitoredTicket, now: number) => ticket.status === "pending" && !ticket.paidAt && now < ticket.cancelUntil;
export function latestDuplicableTicket(tickets: MonitoredTicket[], bank: string, pointOfSaleId: string) {
  return tickets.reduce<MonitoredTicket | undefined>((latest, ticket) =>
    ticket.bank === bank && ticket.pointOfSaleId === pointOfSaleId && ticket.status !== "cancelled" && (!latest || ticket.createdAt > latest.createdAt)
      ? ticket : latest, undefined);
}
export const periodTickets = (tickets: MonitoredTicket[], from: string, to: string) => tickets.filter(ticket => ticketDate(ticket.createdAt) >= from && ticketDate(ticket.createdAt) <= to);
export function ticketTotals(tickets: MonitoredTicket[]) {
  return tickets.filter(ticket => ticket.status !== "cancelled").reduce((sum, ticket) => ({
    amount: sum.amount + ticket.amount, prize: sum.prize + ticket.prize,
    pending: sum.pending + (ticket.status === "winner" && !ticket.paidAt ? ticket.prize : 0)
  }), { amount: 0, prize: 0, pending: 0 });
}
