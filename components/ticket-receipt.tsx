"use client";
import type {MonitoredTicket} from "@/lib/monitoring";
import {ticketArtwork,ticketArtworkUrl} from "@/lib/ticket-artwork";
export function TicketReceipt({ticket,copy=true}:{ticket:MonitoredTicket;copy?:boolean}){
 const artwork=ticketArtwork(ticket,copy);
 return <section className="ticket-receipt"><img className="receipt-artwork" src={ticketArtworkUrl(ticket,copy)} width={artwork.width} height={artwork.height} alt={`${copy?"COPY":"ORIGINAL"} — ${ticket.bank||"GesPro"} — Tikè ${ticket.id} — ${ticket.plays.length} jwèt — Total ${ticket.amount.toFixed(2)}`} /></section>;
}
