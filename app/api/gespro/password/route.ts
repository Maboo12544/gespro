import {NextResponse} from 'next/server';
import {currentAccess,authConfig,validOrigin,sessionCookie} from '@/lib/gespro-auth';
export async function POST(request:Request){
 const fail=(status:number,error:string)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(!validOrigin(request))return fail(403,'Demann pa otorize.');
 try{
  const access=await currentAccess();if(!access)return fail(401,'Konekte ankò.');
  const raw=await request.text();if(raw.length>4096)return fail(400,'Demann pa valab.');
  const {currentPassword,password,confirmPassword}=JSON.parse(raw);
  if(typeof currentPassword!=='string'||!currentPassword||currentPassword.length>128||typeof password!=='string'||password.length<12||password.length>128||password!==confirmPassword||password===currentPassword)return fail(400,'Mete yon nouvo modpas diferan, 12–128 karaktè, epi konfime li.');
  const {url,key}=authConfig();const headers={apikey:key,'Content-Type':'application/json'};
  const verified=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:'POST',headers,body:JSON.stringify({email:`${access.username}@login.gespro.lol`,password:currentPassword}),cache:'no-store'});
  if(!verified.ok)return fail(verified.status===429?429:400,verified.status===429?'Twòp tantativ. Tann yon ti moman.':'Modpas aktyèl la pa kòrèk.');
  const session=await verified.json() as {access_token:string;expires_in:number;user:{id:string}};
  if(!session.access_token||session.user?.id!==access.userId)return fail(403,'Kont la pa koresponn.');
  const updated=await fetch(`${url}/auth/v1/user`,{method:'PUT',headers:{...headers,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({password,current_password:currentPassword}),cache:'no-store'});
  if(!updated.ok)return fail(updated.status===429?429:400,'Modpas la pa chanje. Verifye kondisyon yo oswa rekonekte epi eseye ankò.');
  const result=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  result.cookies.set(sessionCookie,session.access_token,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:Math.min(session.expires_in||3600,3600)});
  return result;
 }catch{return fail(503,'Chanjman an pa konfime. Verifye koneksyon an anvan ou eseye ankò.')}
}
