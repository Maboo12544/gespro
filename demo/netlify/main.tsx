import {createRoot} from 'react-dom/client';
import Workspace from '../../components/gespro-workspace';
import {DemoNamespaceProvider} from '../../components/demo-storage';
import '../../app/globals.css';
import './demo.css';

// Static demonstration only: no API routes, authentication or remote credentials
// are included in this build. CSP additionally blocks all network API calls.
document.addEventListener('submit', event=>{
 const form=event.target;
 if(form instanceof HTMLFormElement && form.getAttribute('action')?.startsWith('/api/')){
  event.preventDefault();
  window.location.assign('/');
 }
});

createRoot(document.getElementById('root')!).render(
 <DemoNamespaceProvider scope="netlify-demo-only">
  <aside className="netlify-demo-notice" role="note">
   <strong>DEMONSTRASYON — SAN LAJAN REYÈL</strong>
   <span>Tout kont, tikè ak montan isit la se egzanp. Done yo rete nan navigatè sa a sèlman. Pa antre modpas oswa enfòmasyon reyèl.</span>
  </aside>
  <Workspace/>
 </DemoNamespaceProvider>
);
