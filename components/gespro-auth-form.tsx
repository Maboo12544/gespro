"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const [space,setSpace]=useState<LoginSpace|null>(setup?"admin":null);
  const submitting=useRef(false);
  useEffect(()=>{if(setup){const value=new URLSearchParams(window.location.hash.slice(1)).get("token")||"";setToken(value);setReady(true);window.history.replaceState(null,"",window.location.pathname);}},[setup]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(submitting.current)return;
    setError("");
    if(setup&&password!==confirmation){setError("De modpas yo dwe menm.");return;}
    submitting.current=true;setBusy(true);
    try {
      const response=await fetch(`/api/gespro/${setup?"setup":"login"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(setup?{token,password}:{username,password})});
      const body:unknown=await response.json();
      const responseError=body && typeof body==="object" && "error" in body && typeof body.error==="string" ? body.error : null;
      if(!response.ok){setError(responseError||"Nou pa kapab konekte kounye a.");return;}
      setPassword("");setConfirmation("");setToken("");
      window.location.assign(setup?"/login?activated=1":"/access");
    }catch{setError("Verifye koneksyon entènèt ou epi eseye ankò.");}finally{submitting.current=false;setBusy(false);}
  }
  const shell={minHeight:"100dvh",display:"grid",placeItems:"center",padding:"24px",background:"radial-gradient(circle at 50% 25%,#edf4fb 0,#dfe9f4 42%,#ccd8e6 100%)",color:"#102a47"} as const;
  if(!setup&&!space)return <main className="gespro-login" style={shell}><section style={{width:"100%",maxWidth:420,display:"grid",gap:34,textAlign:"center"}}><div style={{display:"grid",justifyItems:"center",gap:12}}><img src="/favicon.svg" width="76" height="76" alt=""/><strong style={{fontSize:44,lineHeight:1,color:"#17395f",letterSpacing:"-.04em"}}>GesPro</strong></div><div style={{display:"grid",gap:20}}><button type="button" onClick={()=>setSpace("seller")} style={{minHeight:118,border:0,borderRadius:22,background:"#078fa0",color:"white",fontSize:32,fontWeight:800,boxShadow:"0 15px 28px #087c8c38",cursor:"pointer"}}>Vandè</button><button type="button" onClick={()=>setSpace("admin")} style={{minHeight:118,border:0,borderRadius:22,background:"#0c3158",color:"white",fontSize:32,fontWeight:800,boxShadow:"0 15px 28px #0c31583d",cursor:"pointer"}}>Admin</button></div></section></main>;
  return <main className="gespro-login" style={shell}>
    <section style={{width:"100%",maxWidth:420,background:"white",borderRadius:20,overflow:"hidden",boxShadow:"0 16px 48px #0b294819"}}>
      <header style={{background:"#0b2948",padding:"28px",color:"white",display:"flex",alignItems:"center",gap:14}}><img src="/favicon.svg" width="42" height="42" alt=""/><strong style={{fontSize:32}}>GesPro</strong></header>
      <form onSubmit={submit} style={{padding:28,display:"grid",gap:18}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><h1 style={{fontSize:24,fontWeight:700}}>{setup?"Kreye modpas ou":space==="seller"?"Konekte Vandè":"Konekte Admin"}</h1>{!setup&&<Button type="button" variant="outline" onClick={()=>{setSpace(null);setError("");setPassword("")}}>Retounen</Button>}</div>
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
