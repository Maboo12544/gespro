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
  const [loginMode,setLoginMode]=useState<"admin"|"seller"|null>(setup?"admin":null);
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
  const backdrop="radial-gradient(circle at 9% 13%,#21cbd54a 0 54px,transparent 58px),radial-gradient(circle at 93% 18%,#4d8cf34a 0 68px,transparent 72px),radial-gradient(circle at 8% 86%,#e4b52c45 0 58px,transparent 63px),radial-gradient(circle at 92% 86%,#1ed3c64a 0 62px,transparent 67px),linear-gradient(155deg,#020b17,#061a32 48%,#06374c)";
  if(!setup&&!loginMode)return <main className="gespro-login" style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:"24px",background:backdrop,color:"white"}}>
    <section style={{width:"100%",maxWidth:440,padding:"64px 54px",borderRadius:28,background:"#274d65e8",border:"1px solid #4c758b",boxShadow:"0 28px 80px #0009",textAlign:"center",backdropFilter:"blur(10px)"}}>
      <img src="/favicon.svg" width="92" height="92" alt="" style={{margin:"0 auto 12px",borderRadius:18}}/>
      <strong style={{display:"block",fontSize:56,lineHeight:1,marginBottom:46}}>GesPro</strong>
      <div style={{display:"grid",gap:20}}>
        <button type="button" onClick={()=>setLoginMode("seller")} style={{minHeight:76,border:0,borderRadius:16,background:"#079aa7",color:"white",fontSize:30,fontWeight:800}}>Vandè</button>
        <button type="button" onClick={()=>setLoginMode("admin")} style={{minHeight:76,border:"1px solid #17375a",borderRadius:16,background:"#081b45",color:"white",fontSize:30,fontWeight:800}}>Admin</button>
      </div>
    </section>
  </main>;
  return <main className="gespro-login" style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:"24px",background:backdrop,color:"#102a47"}}>
    <section style={{width:"100%",maxWidth:460,background:"white",borderRadius:20,overflow:"hidden",boxShadow:"0 24px 70px #020b1880",border:"1px solid #ffffff26"}}>
      <header style={{background:"linear-gradient(135deg,#081d39,#0b3159)",padding:"28px",color:"white",display:"flex",alignItems:"center",gap:14,justifyContent:"center"}}><img src="/favicon.svg" width="46" height="46" alt=""/><span><strong style={{fontSize:32,display:"block",lineHeight:1}}>GesPro</strong><small style={{color:"#62e4df",letterSpacing:".18em"}}>{loginMode==="seller"?"VANDÈ":"ADMIN"}</small></span></header>
      <form onSubmit={submit} style={{padding:28,display:"grid",gap:18}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><h1 style={{fontSize:24,fontWeight:800}}>{setup?"Kreye modpas ou":"Konekte"}</h1>{!setup&&<button type="button" onClick={()=>{setLoginMode(null);setError("");setPassword("")}} style={{border:0,background:"transparent",color:"#087d8c",fontWeight:800}}>Retounen</button>}</div>
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
