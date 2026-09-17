import type {LotteryItem} from "@/components/lottery-management";
import type {PlayType} from "./play-entry";

export function drawMode(item:LotteryItem){
  // Recognize saved catalog entries created before explicit Pick 2 modes existed.
  return item.resultMode??(/^FL PICK 2 (AM|PM)$/.test(item.name)?"pick2":"bolet3");
}
export function deriveDraw(item:LotteryItem,values:string[]):string[]{
  const mode=drawMode(item);
  if(mode==="pending")throw new Error("Règ tiraj sa a poko konfime.");
  const widths=mode==="pick2"?[2]:mode==="massachusetts4"?[4]:mode==="dominican3"?[2,2,2]:[3,2,2];
  if(values.length!==widths.length||values.some((v,i)=>!new RegExp(`^\\d{${widths[i]}}$`).test(v)))throw new Error("Kantite chif rezilta a pa valab.");
  if(mode==="pick2"||mode==="dominican3")return [...values];
  if(mode==="massachusetts4"){
    const [base]=values;
    return [base.slice(0,2),base.slice(1,3),base.slice(2),base.slice(0,3),base,"",base.slice(1)];
  }
  // Bank's custom bòlèt convention, not independent official Pick 4/5 results.
  return [values[0].slice(1),values[1],values[2],values[0],values[1]+values[2],values[0]+values[1]];
}
type RulePlay={lottery:string;type:PlayType;number:string;amount:number};
export function validateDrawPlay(item:LotteryItem,play:RulePlay){
  const mode=drawMode(item);
  if(mode==="pending")throw new Error("Règ tiraj sa a poko konfime.");
  if(!Number.isFinite(play.amount)||play.amount<=0)throw new Error("Montan jwèt la pa valab.");
  const two=["DIRECTO","REVÈ","BOUL PÈ"].includes(play.type);
  const pattern=two?/^\d{2}$/:play.type==="PALÉ"?/^\d{2}-\d{2}$/:play.type==="TRIPLETA"?/^\d{2}-\d{2}-\d{2}$/:play.type.startsWith("CASH 3 ")?/^\d{3}$/:play.type.startsWith("PLAY 4 ")?/^\d{4}$/ : /^\d{5}$/;
  if(!pattern.test(play.number))throw new Error("Fòma jwèt la pa valab.");
  if(mode==="pick2"&&!two)throw new Error("FL Pick 2 aksepte jwèt 2 chif sèlman.");
  if(mode==="dominican3"&&!two&&!["PALÉ","TRIPLETA"].includes(play.type))throw new Error("Quiniela dominiken: 2 chif, Palé oswa Tripleta sèlman.");
  if(mode!=="dominican3"&&play.type==="TRIPLETA")throw new Error("Tripleta disponib pou Quiniela dominiken sèlman.");
  if(mode==="massachusetts4"&&play.type.startsWith("PICK 5"))throw new Error("Fòma Massachusetts 4 chif sa a pa gen rezilta Pick 5.");
}
export function playIdentity(play:RulePlay){
  return JSON.stringify([play.lottery,["DIRECTO","REVÈ","BOUL PÈ"].includes(play.type)?"DIRECTO":play.type,play.number]);
}
