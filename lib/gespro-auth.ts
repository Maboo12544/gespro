import { cookies } from "next/headers";

export const sessionCookie = "__Host-gespro-session";
export function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Auth unavailable");
  return { url, key };
}
export function validOrigin(request: Request) {
  return ["https://gespro.lol", "https://www.gespro.lol", "https://gespro.rodchyllesupreme387.chatgpt.site"].includes(request.headers.get("origin") || "");
}
export async function accessForToken(token: string): Promise<import("./access-types").AccessContext|null> {
  const {url,key}=authConfig();
  const headers={apikey:key,Authorization:`Bearer ${token}`};
  const response=await fetch(`${url}/auth/v1/user`,{headers,cache:"no-store"});
  if(!response.ok)return null;
  const user=await response.json() as {id?:string};if(!user.id)return null;
  async function read<T>(path:string):Promise<T[]> {
    const r=await fetch(`${url}/rest/v1/${path}`,{headers,cache:"no-store"});
    if(!r.ok)throw Error("Access unavailable");return await r.json() as T[];
  }
  type C=import("./access-types").AccessContext;
  const [profiles,admins,banks,memberships,points,assignments]=await Promise.all([
    read<C["profiles"][number]>("gespro_profiles?select=user_id,username,display_name,active"),
    read<{user_id:string}>("gespro_platform_admins?select=user_id"),
    read<C["banks"][number]>("gespro_banks?select=id,name,active"),
    read<C["memberships"][number]>("gespro_memberships?select=bank_id,user_id,role,active"),
    read<C["points"][number]>("gespro_points_of_sale?select=id,bank_id,name,active"),
    read<C["assignments"][number]>("gespro_pos_assignments?select=bank_id,pos_id,user_id")
  ]);
  const profile=profiles.find(p=>p.user_id===user.id&&p.active);if(!profile)return null;
  const isPlatformAdmin=admins.some(a=>a.user_id===user.id);
  const allowed=memberships.some(m=>m.user_id===user.id&&m.active&&banks.some(b=>b.id===m.bank_id&&b.active));
  if(!isPlatformAdmin&&!allowed)return null;
  return {userId:user.id,username:profile.username,displayName:profile.display_name,isPlatformAdmin,banks,memberships,points,assignments,profiles};
}
export async function currentAccess(){
 const token=(await cookies()).get(sessionCookie)?.value;
 if(!token)return null;try{return await accessForToken(token)}catch{return null}
}
export async function adminForToken(token:string){const access=await accessForToken(token);return access?.isPlatformAdmin?access:null}
export async function currentAdmin(){const access=await currentAccess();return access?.isPlatformAdmin?access:null}
