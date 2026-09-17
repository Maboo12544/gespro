import { NextResponse } from "next/server";
import { accessForToken, authConfig, sessionCookie, validOrigin } from "@/lib/gespro-auth";
export async function POST(request: Request) {
  const fail = (status: number, error: string) => NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
  if (!validOrigin(request)) return fail(403,"Demann sa a pa otorize.");
  try {
    const raw = await request.text();
    if(raw.length > 4096) return fail(400,"Demann sa a pa valab.");
    const {username,password} = JSON.parse(raw);
    if(typeof username !== "string" || !/^[a-z0-9][a-z0-9._-]{2,31}$/i.test(username.trim()) || typeof password !== "string" || password.length > 128) return fail(400,"Non itilizatè oswa modpas pa kòrèk.");
    const {url,key} = authConfig();
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email:`${username.trim().toLowerCase()}@login.gespro.lol`,password}),cache:"no-store"});
    if(!response.ok) return fail(response.status === 429 ? 429 : 401,response.status === 429 ? "Twòp tantativ. Tann yon ti moman." : "Non itilizatè oswa modpas pa kòrèk.");
    const session = await response.json() as {access_token:string;expires_in:number};
    if(!session.access_token || !(await accessForToken(session.access_token))) return fail(403,"Kont sa a pa gen aksè aktive.");
    const result = NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    result.cookies.set(sessionCookie,session.access_token,{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:Math.min(session.expires_in || 3600,3600)});
    return result;
  } catch { return fail(503,"Koneksyon an pa disponib. Eseye ankò."); }
}
