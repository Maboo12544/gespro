import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

export default defineConfig({
 root:fileURLToPath(new URL('.',import.meta.url)),
 publicDir:fileURLToPath(new URL('../../public',import.meta.url)),
 resolve:{alias:{'@':fileURLToPath(new URL('../..',import.meta.url))}},
 plugins:[react(),{
  name:'demo-security-headers',
  generateBundle(){
   this.emitFile({type:'asset',fileName:'_headers',source:"/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Robots-Tag: noindex, nofollow\n"});
  },
 }],
 build:{outDir:fileURLToPath(new URL('../../dist-netlify-demo',import.meta.url)),emptyOutDir:true},
});
