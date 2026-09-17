import {applyPrinterPaper,printerPaper} from "./printer-settings";
// Wait for the existing vector receipt to decode; never rasterize it to print.
// Returns cancellation so closing/replacing a preview cannot trigger stale prints.
export function scheduleTicketPrint(onError:()=>void=()=>{}){
 applyPrinterPaper(printerPaper());
 let cancelled=false;
 let frame=0;
 const images=Array.from(document.querySelectorAll<HTMLImageElement>('.monitor-print .receipt-artwork'));
 Promise.all(images.map(image=>image.decode())).then(()=>{
  if(cancelled)return;
  frame=requestAnimationFrame(()=>{if(!cancelled){try{window.print()}catch{onError()}}});
 }).catch(()=>{if(!cancelled)onError()});
 return()=>{cancelled=true;cancelAnimationFrame(frame)};
}
