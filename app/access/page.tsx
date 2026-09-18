import {redirect} from 'next/navigation';
import {currentAccess} from '@/lib/gespro-auth';
import {AccessManagement} from '@/components/access-management';
export const dynamic='force-dynamic';
export default async function AccessPage(){
 const access=await currentAccess();
 if(!access)redirect('/login');
 const activeMemberships=access.memberships.filter(m=>m.user_id===access.userId&&m.active);
 const isSeller=activeMemberships.length>0&&activeMemberships.every(m=>m.role==='seller');
 if(isSeller)redirect('/pos');
 return <AccessManagement initial={access}/>;
}
