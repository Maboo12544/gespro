"use client";
import {useState} from "react";
import type {LotteryItem} from "@/components/lottery-management";

const dominican:Record<string,string>={
 "rd-nacional":"nacional.jpg","rd-gana-mas":"nacional.jpg","rd-leidsa":"leidsa.jpg",
 "rd-loteka":"loteka.png","rd-real":"real.jpg","rd-nueva-yol":"real.jpg",
 "rd-primera":"primera.png","rd-suerte":"suerte.png"
};
function logoFor(item:LotteryItem){
 if(dominican[item.id])return dominican[item.id];
 const name=item.name.toUpperCase();
 if(name.startsWith("FL PICK 2"))return "pick2.png";
 if(name.startsWith("FLORIDA"))return "florida.png";
 if(name.startsWith("NEW YORK"))return "new-york.png";
 if(name.startsWith("GEORGIA"))return "georgia.png";
 if(name.startsWith("MASSACHUSETTS"))return "massachusetts.png";
 return null;
}
export function lotteryBrand(item:LotteryItem){return logoFor(item)?.split(".")[0]??"gespro";}
export function LotteryLogo({lottery}:{lottery:LotteryItem}){
 const file=logoFor(lottery);
 const [failed,setFailed]=useState(false);
 return <span className={"lottery-logo-frame"+(file==="loteka.png"?" lottery-logo-dark":"")} aria-hidden="true">{file&&!failed?
  <img src={'/lottery-logos/'+file} alt="" width={112} height={48} decoding="async" onError={()=>setFailed(true)}/>:
  <span className="lottery-logo-initials">{lottery.name.split(/\s+/).slice(0,2).map(s=>s[0]).join('')}</span>}
 </span>;
}
