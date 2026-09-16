import { redirect } from "next/navigation";
import { currentAccess } from "@/lib/gespro-auth";
import Workspace from "@/components/gespro-workspace";

export const dynamic = "force-dynamic";
export default async function Home() {
  const access=await currentAccess();
  if (!access) redirect("/login");
  if (!access.isPlatformAdmin) redirect("/access");
  return <><form action="/api/gespro/logout" method="post" style={{textAlign:"right",padding:"6px 18px",background:"#0b2948",color:"white"}}><button type="submit">Dekonekte {access.username}</button></form><a className="access-entry" href="/access">Kont ak dwa reyèl →</a><Workspace /></>;
}
