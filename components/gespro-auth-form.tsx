"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginSpace="admin"|"seller";

export function GesproAuthForm({setup=false}:{setup?:boolean}) {
  const [token,setToken]=useState("");
  const [username,setUsername]=useState(setup?"Gespro123":"");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(!setup);
  const [space,setSpace]=useState<LoginSpace>("admin");
  useEffect(()=>{if(setup){const value=new URLSearchParams(window.location.hash.slice(1)).get("token")||"";setToken(value);setReady(true);window.history.replaceState(null,"",window.location.pathname);}},[setup]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");
    if(setup&&password!==confirmation){setError("De modpas yo dwe menm.");return;}
    setBusy(true);
    try {
      const response=await fetch(`/api/gespro/${setup?"setup":"login"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(setup?{token,password}:{username,password})});
      const body:unknown=await response.json();
      const responseError=body && typeof body==="object" && "error" in body && typeof body.error==="string" ? body.error : null;
      if(!response.ok){setError(responseError||"Nou pa kapab konekte kounye a.");return;}
      setPassword("");setConfirmation("");setToken("");
      window.location.assign(setup?"/login?activated=1":space==="seller"?"/access":"/");
    }catch{setError("Verifye koneksyon entènèt ou epi eseye ankò.");}finally{setBusy(false);}
  }
  return <main className="gespro-login" style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:"24px",background:"#edf5f8",color:"#102a47"}}>
    <section style={{width:"100%",maxWidth:420,background:"white",borderRadius:20,overflow:"hidden",boxShadow:"0 16px 48px #0b294819"}}>
      <header style={{background:"#0b2948",padding:"28px",color:"white",display:"flex",alignItems:"center",gap:14}}><img src="/favicon.svg" width="42" height="42" alt=""/><strong style={{fontSize:32}}>GesPro</strong></header>
      <form onSubmit={submit} style={{padding:28,display:"grid",gap:18}}>
        <h1 style={{fontSize:24,fontWeight:700}}>{setup?"Kreye modpas ou":"Konekte"}</h1>
        {!setup&&<div role="group" aria-label="Chwazi espas" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><Button type="button" variant={space==="admin"?"default":"outline"} onClick={()=>setSpace("admin")}>Administrasyon</Button><Button type="button" variant={space==="seller"?"default":"outline"} onClick={()=>setSpace("seller")}>Vandè</Button></div>}
        {setup&&<p>Aktive kont Super Admin ou a. Chwazi yon modpas ki genyen omwen 12 karaktè.</p>}
        {setup&&ready&&!token?<p role="alert" style={{color:"#b91c1c"}}>Lyen aktivasyon an manke. Louvri lyen pèsonèl ou te resevwa a ankò.</p>:<>
        <label style={{display:"grid",gap:8}}>Non itilizatè<Input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} readOnly={setup} required autoCapitalize="none" spellCheck={false} maxLength={32}/></label>
        <label style={{display:"grid",gap:8}}>Modpas<Input type="password" autoComplete={setup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={setup?12:1} maxLength={128}/></label>
        {setup&&<label style={{display:"grid",gap:8}}>Konfime modpas<Input type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required minLength={12} maxLength={128}/></label>}
        {error&&<p role="alert" style={{color:"#b91c1c"}}>{error}</p>}
        <Button type="submit" disabled={busy||!ready} style={{minHeight:48,background:"#009ea9",color:"white"}}>{busy?"Tanpri tann…":setup?"Aktive kont mwen":"Konekte"}</Button>
        </>}
      </form>
    </section>
  </main>;
}
