import {redirect} from 'next/navigation';
import {currentAccess} from '@/lib/gespro-auth';
import {AccessManagement} from '@/components/access-management';
export const dynamic='force-dynamic';
export default async function AccessPage(){const access=await currentAccess();if(!access)redirect('/login');return <AccessManagement initial={access}/>}
