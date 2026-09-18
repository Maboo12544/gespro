import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/gespro-auth";
export const dynamic="force-dynamic";
export default async function Home(){
 const access=await currentAccess();
 if(!access)redirect("/login");
 const active=access.memberships.filter(m=>m.user_id===access.userId&&m.active);
 const sellerOnly=!access.isPlatformAdmin&&active.length>0&&active.every(m=>m.role==="seller");
 redirect(sellerOnly?"/pos":"/access");
}
