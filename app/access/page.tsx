import {redirect} from 'next/navigation';
import {currentAccess} from '@/lib/gespro-auth';
import {AccessManagement} from '@/components/access-management';
import {SellerDirectAccess} from '@/components/seller-direct-access';
export const dynamic='force-dynamic';
export default async function AccessPage(){
 const access=await currentAccess();
 if(!access)redirect('/login');
 const isSeller=!access.isPlatformAdmin&&access.memberships.some(m=>m.user_id===access.userId&&m.active&&m.role==='seller');
 return isSeller?<SellerDirectAccess initial={access}/>:<AccessManagement initial={access}/>;
}
