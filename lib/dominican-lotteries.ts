import type {LotteryItem,LotteryState} from "@/components/lottery-management";
export const dominicanLotteries:LotteryItem[]=[
 ["nacional","NACIONAL — QUINIELA"],["gana-mas","NACIONAL — GANA MÁS"],["leidsa","LEIDSA — QUINIELA"],["loteka","LOTEKA — QUINIELA"],["real","LOTERÍA REAL — QUINIELA"],["primera","LA PRIMERA — QUINIELA"],["suerte","LA SUERTE — QUINIELA"]
].map(([id,name])=>({id:"rd-"+id,name,bank:null,resultMode:"dominican3"}));
dominicanLotteries.push({id:"rd-nueva-yol",name:"NUEVA YOL REAL — RÈG POU KONFIME",bank:null,resultMode:"pending"});
export function addDominicanCatalog(state:LotteryState):LotteryState{
 const missing=dominicanLotteries.filter(item=>!state.items.some(old=>old.id===item.id));
 return missing.length?{...state,items:[...state.items,...missing]}:state;
}
export function parseDominicanResult(values:string[]){if(values.length!==3||values.some(v=>!/^\d{2}$/.test(v)))throw Error("Antre 3 boul de chif: 00–99.");return [...values]}
