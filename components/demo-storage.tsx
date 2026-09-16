"use client";
import {createContext,useContext,useEffect,useState,type Dispatch,type SetStateAction} from 'react';
const DemoNamespace=createContext('gespro-demo-v1:Gespro123:');
export function DemoNamespaceProvider({scope,children}:{scope:string;children:React.ReactNode}){return <DemoNamespace.Provider value={'gespro-demo-v2:'+scope+':'}>{children}</DemoNamespace.Provider>}
export function DemoStorageBoundary({children}:{children:React.ReactNode}){const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);return ready?<>{children}</>:<div aria-busy="true">GesPro…</div>}
export function useDemoState<T>(key:string,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>]{
 const prefix=useContext(DemoNamespace);
 const [value,setValue]=useState<T>(()=>{const fallback=typeof initial==='function'?(initial as ()=>T)():initial;try{const raw=localStorage.getItem(prefix+key);if(!raw)return fallback;const parsed=JSON.parse(raw);if(parsed.version!==1)return fallback;const v=parsed.value;if(Array.isArray(fallback)?!Array.isArray(v):typeof v!==typeof fallback||v===null&&fallback!==null)return fallback;return v as T}catch{return fallback}});
 useEffect(()=>{try{localStorage.setItem(prefix+key,JSON.stringify({version:1,value}))}catch{window.dispatchEvent(new Event('gespro-storage-error'))}},[prefix,key,value]);
 return [value,setValue];
}
export function StorageNotice(){const [failed,setFailed]=useState(false);useEffect(()=>{const handler=()=>setFailed(true);window.addEventListener('gespro-storage-error',handler);return ()=>window.removeEventListener('gespro-storage-error',handler)},[]);return failed?<div className="storage-warning" role="alert">Navigatè a pa ka konsève travay la. Pa rafrechi anvan ou telechaje rapò tès ou.</div>:null}
