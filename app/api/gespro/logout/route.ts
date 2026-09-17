import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authConfig, sessionCookie, validOrigin } from "@/lib/gespro-auth";
export async function POST(request: Request) {
  if(!validOrigin(request)) return new Response("Forbidden",{status:403});
  const token = (await cookies()).get(sessionCookie)?.value;
  if(token) { try { const {url,key}=authConfig(); await fetch(`${url}/auth/v1/logout`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${token}`}}); } catch {} }
  const response = new NextResponse(null,{status:303,headers:{Location:"/login","Cache-Control":"no-store"}});
  response.cookies.set(sessionCookie,"",{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:0});
  return response;
}
