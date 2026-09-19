"use client";
import {useEffect,useState} from "react";
export type ClosingSchedule={time:string;zone:string};
export function secondsToClose(schedule:ClosingSchedule,now:Date){
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time))return null;
 try{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:schedule.zone,hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now);const part=(type:string)=>Number(parts.find(p=>p.type===type)?.value||0);const [h,m]=schedule.time.split(":").map(Number);return h*3600+m*60-part("hour")*3600-part("minute")*60-part("second")}catch{return null}
}
export function LotteryCountdown({schedule,serverOffsetMs=0}:{schedule?:ClosingSchedule;serverOffsetMs?:number}){
 const [now,setNow]=useState(()=>new Date(Date.now()+serverOffsetMs));
 useEffect(()=>{if(!schedule)return;setNow(new Date(Date.now()+serverOffsetMs));const id=setInterval(()=>setNow(new Date(Date.now()+serverOffsetMs)),1000);return()=>clearInterval(id)},[schedule,serverOffsetMs]);
 const remaining=schedule?secondsToClose(schedule,now):null;
 const soon=remaining!==null&&remaining>0&&remaining<=600;
 return <small className={"lottery-close-time"+(soon||remaining!==null&&remaining<=0?" closing-soon":"")} title={schedule?`${schedule.zone} — vant fèmen 8 minit anvan tiraj`:"Mete lè fèmti nan Admin → Lotri"}>{remaining===null?"Closing: —":remaining<=0?"Closed":`Closing · ${String(Math.floor(remaining/3600)).padStart(2,"0")}:${String(Math.floor((remaining%3600)/60)).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`}</small>
}
