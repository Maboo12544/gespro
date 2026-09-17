"use client";
import {scheduleTicketPrint} from "@/lib/print-ticket";
import {useEffect,useState} from "react";
import {ticketArtwork,ticketArtworkUrl} from "@/lib/ticket-artwork";
import type {MonitoredTicket} from "@/lib/monitoring";

function ticketImage(ticket:MonitoredTicket,copy:boolean):Promise<Blob>{
 const artwork=ticketArtwork(ticket,copy);
 return new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>{
   const canvas=document.createElement("canvas");canvas.width=artwork.width;canvas.height=artwork.height;
   const context=canvas.getContext("2d");if(!context){reject(Error("canvas"));return}
   context.drawImage(image,0,0);canvas.toBlob(blob=>blob?resolve(blob):reject(Error("image")),"image/png");
  };image.onerror=()=>reject(Error("image"));image.src=ticketArtworkUrl(ticket,copy);
 });
}
export function TicketShare({ticket,copy}:{ticket:MonitoredTicket;copy:boolean}){
 const [file,setFile]=useState<File|null>(null),[error,setError]=useState("");
 useEffect(()=>{let active=true;setFile(null);if(!isMobileTicket())return;ticketImage(ticket,copy).then(blob=>{if(active)setFile(new File([blob],`GesPro-${ticket.id}.png`,{type:"image/png"}))}).catch(()=>setError("Foto a pa disponib. Eseye ankò."));return()=>{active=false}},[ticket,copy]);
 async function share(){if(!file)return;setError("");try{if(/GesProAndroid/.test(navigator.userAgent)){const r=new FileReader();r.onload=()=>{window.location.href="gespro-share://image?data="+encodeURIComponent(String(r.result).split(",")[1])};r.readAsDataURL(file)}else if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:`GesPro ${ticket.id}`})}else{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setError("Foto a telechaje. Ou ka voye li sou WhatsApp.")}}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setError("Pataj la pa mache. Eseye ankò.")}}
 return <div className="ticket-share-tools"><button disabled={!file} onClick={share}>↗ Share</button><button onClick={()=>scheduleTicketPrint(()=>setError("Enpresyon an pa disponib. Eseye ankò."))}>Enprime</button><button aria-label="Fèmen tikè" onClick={()=>window.dispatchEvent(new Event("afterprint"))}>×</button>{error&&<p role="status">{error}</p>}</div>
}
export function isMobileTicket(){return matchMedia("(max-width: 767px)").matches||/GesProAndroid/.test(navigator.userAgent)}
