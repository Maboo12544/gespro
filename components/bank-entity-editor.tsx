"use client";
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export function BankEntityEditor({bank,id,kind,name,active,onSaved}:{bank:string;id:string;kind:'bank'|'pos';name:string;active:boolean;onSaved:()=>Promise<void>}){
 const [title,setTitle]=useState(name),[enabled,setEnabled]=useState(active),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function save(){if(!enabled&&active&&!window.confirm('Sispann '+name+'? Vant yo ap bloke; istorik la ap rete.'))return;setBusy(true);try{const r=await fetch('/api/gespro/bank-entity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bank,id,kind,name:title,active:enabled})});const data=await r.json() as {error?:string};if(!r.ok)throw Error(data.error);await onSaved();setMessage('Chanjman an anrejistre.')}catch(e){setMessage(e instanceof Error?e.message:'Chanjman pa konfime.')}finally{setBusy(false)}}
 return <details className="bank-entity-editor"><summary>Modifye {kind==='bank'?'bank':'POS'} — {name}</summary><form onSubmit={e=>{e.preventDefault();void save()}}><label>Non<Input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label><label><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Aktif</label><Button disabled={busy} type="submit">{busy?'Ap anrejistre…':'Anrejistre'}</Button></form>{message&&<p role="status">{message}</p>}</details>
}
