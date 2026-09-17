"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GesproAuthForm({setup=false}:{setup?:boolean}) {
  const [token,setToken]=useState("");
  const [username,setUsername]=useState(setup?"Gespro123":"");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [loginMode,setLoginMode]=useState<"admin"|"seller">("admin");
  const submitting=useRef(false);
  const [ready,setReady]=useState(!setup);
  useEffect(()=>{if(setup){const value=new URLSearchParams(window.location.hash.slice(1)).get("token")||"";setToken(value);setReady(true);window.history.replaceState(null,"",window.location.pathname);}},[setup]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(submitting.current)return;setError("");
    if(setup&&password!==confirmation){setError("De modpas yo dwe menm.");return;}
    submitting.current=true;setBusy(true);
    try {
      const response=await fetch(`/api/gespro/${setup?"setup":"login"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(setup?{token,password}:{username,password})});
      const body:unknown=await response.json();
      const responseError=body && typeof body==="object" && "error" in body && typeof body.error==="string" ? body.error : null;
      if(!response.ok){setError(responseError||"Nou pa kapab konekte kounye a.");return;}
      setPassword("");setConfirmation("");setToken("");
      window.location.assign(setup?"/login?activated=1":loginMode==="seller"?"/access?view=seller":"/");
    }catch{setError("Verifye koneksyon entènèt ou epi eseye ankò.");}finally{submitting.current=false;setBusy(false);}
  }
  return <main className="gespro-login" style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:"24px",background:"radial-gradient(circle at 15% 18%,#0db7bd33 0 70px,transparent 72px),radial-gradient(circle at 85% 78%,#12c5c933 0 95px,transparent 98px),linear-gradient(155deg,#071b36,#0b2948 58%,#075d72)",color:"#102a47"}}>
    <section style={{width:"100%",maxWidth:460,background:"white",borderRadius:20,overflow:"hidden",boxShadow:"0 24px 70px #020b1880",border:"1px solid #ffffff26"}}>
      <header style={{background:"linear-gradient(135deg,#081d39,#0b3159)",padding:"28px",color:"white",display:"flex",alignItems:"center",gap:14,justifyContent:"center"}}><img src="/favicon.svg" width="46" height="46" alt=""/><span><strong style={{fontSize:32,display:"block",lineHeight:1}}>GesPro</strong><small style={{color:"#62e4df",letterSpacing:".18em"}}>PLATFÒM LOTRI</small></span></header>
      <form onSubmit={submit} style={{padding:28,display:"grid",gap:18}}>
        <h1 style={{fontSize:24,fontWeight:800,textAlign:"center"}}>{setup?"Kreye modpas ou":"Konekte"}</h1>
        {!setup&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} role="group" aria-label="Chwazi espas koneksyon">
          <button type="button" onClick={()=>setLoginMode("admin")} aria-pressed={loginMode==="admin"} style={{minHeight:64,borderRadius:12,border:loginMode==="admin"?"2px solid #078c9f":"1px solid #cbdde5",background:loginMode==="admin"?"#e3f7f7":"#f8fbfc",color:"#0b2948",fontWeight:800,fontSize:17}}>Administrasyon</button>
          <button type="button" onClick={()=>setLoginMode("seller")} aria-pressed={loginMode==="seller"} style={{minHeight:64,borderRadius:12,border:loginMode==="seller"?"2px solid #078c9f":"1px solid #cbdde5",background:loginMode==="seller"?"#e3f7f7":"#f8fbfc",color:"#0b2948",fontWeight:800,fontSize:17}}>Vandè</button>
        </div>}
        {setup&&<p>Aktive kont Super Admin ou a. Chwazi yon modpas ki genyen omwen 12 karaktè.</p>}
        {setup&&ready&&!token?<p role="alert" style={{color:"#b91c1c"}}>Lyen aktivasyon an manke. Louvri lyen pèsonèl ou te resevwa a ankò.</p>:<>
        <label style={{display:"grid",gap:8}}>Non itilizatè<Input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} readOnly={setup} required autoCapitalize="none" spellCheck={false} maxLength={32}/></label>
        <label style={{display:"grid",gap:8}}>Modpas<Input type={showPassword?"text":"password"} autoComplete={setup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={setup?12:1} maxLength={128}/></label>
        {!setup&&<label style={{display:"flex",alignItems:"center",gap:9,fontSize:14}}><input type="checkbox" checked={showPassword} onChange={e=>setShowPassword(e.target.checked)}/> Montre modpas</label>}
        {setup&&<label style={{display:"grid",gap:8}}>Konfime modpas<Input type={showPassword?"text":"password"} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required minLength={12} maxLength={128}/></label>}
        {error&&<p role="alert" style={{color:"#b91c1c",fontWeight:700}}>{error}</p>}
        <Button type="submit" disabled={busy||!ready} style={{minHeight:50,background:"linear-gradient(135deg,#0bbab8,#078c9f)",color:"white",fontWeight:800,fontSize:16}}>{busy?"Tanpri tann…":setup?"Aktive kont mwen":"Konekte"}</Button>
        </>}
      </form>
    </section>
  </main>;
}
