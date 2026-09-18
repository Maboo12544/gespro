import {redirect} from 'next/navigation';
import {currentAccess} from '@/lib/gespro-auth';
import {SellerDirectAccess} from '@/components/seller-direct-access';
export const dynamic='force-dynamic';
export default async function PosPage(){
 const access=await currentAccess();
 if(!access)redirect('/login');
 const active=access.memberships.filter(m=>m.user_id===access.userId&&m.active);
 const sellerOnly=!access.isPlatformAdmin&&active.length>0&&active.every(m=>m.role==='seller');
 if(!sellerOnly)redirect('/access');
 return <SellerDirectAccess initial={access}/>;
}
