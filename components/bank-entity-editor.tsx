"use client";
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export function BankEntityEditor({bank,id,kind,name,active,onSaved}:{bank:string;id:string;kind:'bank'|'pos';name:string;active:boolean;onSaved:()=>Promise<void>}){
 const [title,setTitle]=useState(name),[enabled,setEnabled]=useState(active),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const saving=useRef(false);
 async function save(){
  if(saving.current)return;
  const cleanTitle=title.trim();
  if(!cleanTitle){setMessage('Antre yon non.');return;}
  if(!enabled&&active&&!window.confirm('Sispann '+name+'? Vant yo ap bloke; istorik la ap rete.'))return;
  saving.current=true;setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/gespro/bank-entity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bank,id,kind,name:cleanTitle,active:enabled})});
   const data=await r.json() as {error?:string};
   if(!r.ok)throw Error(data.error||'Chanjman an refize.');
   setMessage('Chanjman an anrejistre.');
   try{await onSaved()}catch{setMessage('Chanjman an anrejistre, men lis la pa rafrechi. Rafrechi paj la pou wè li.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Chanjman pa konfime. Rafrechi lis la anvan ou retrye.')}
  finally{saving.current=false;setBusy(false)}
 }
 return <details className="bank-entity-editor"><summary>Modifye {kind==='bank'?'bank':'POS'} — {name}</summary><form onSubmit={e=>{e.preventDefault();void save()}}><label>Non<Input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Aktif</label><Button disabled={busy} type="submit">{busy?'Ap anrejistre…':'Anrejistre'}</Button></form>{message&&<p role="status">{message}</p>}</details>
}
