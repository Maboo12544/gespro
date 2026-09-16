const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');
function edge(fetch){let handler;vm.runInNewContext(ts.transpileModule(fs.readFileSync('supabase/functions/gespro-access/index.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{Deno:{serve:fn=>handler=fn,env:{get:name=>name==='SUPABASE_URL'?'https://example.invalid':'service-test'}},fetch,Response,Request,JSON,Error,encodeURIComponent});return handler}
const request=(body,token='token')=>new Request('https://example.invalid',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:JSON.stringify(body)});
test('provisioning refuses anonymous and invalid tokens before any write',async()=>{
 let calls=0;const handler=edge(async()=>{calls++;return new Response('',{status:401})});assert.equal((await handler(request({},''))).status,401);assert.equal(calls,0);assert.equal((await handler(request({}))).status,401);assert.equal(calls,1);
});
test('verified actor replaces forged actor; passwords never reach the database RPC',async()=>{
 const calls=[];const handler=edge(async(url,init)=>{const body=init.body?JSON.parse(init.body):null;calls.push({url,body});if(url.endsWith('/auth/v1/user'))return Response.json({id:'verified-user'});if(url.endsWith('/auth/v1/admin/users'))return Response.json({id:'new-user'});assert.equal(body.actor,'verified-user');assert.equal(body.data.password,undefined);return Response.json({ok:true});});
 const response=await handler(request({actor:'forged-admin',operation:'create_member',data:{bank_id:'bank',role:'seller',pos_ids:['pos'],username:'test-seller',display_name:'Test',user_id:'forged-target',password:'test-password-long'}}));assert.equal(response.status,200);assert.equal(calls.at(-1).body.data.user_id,'new-user');assert.equal(calls[2].body.password,'test-password-long');
});
test('denied role preflight cannot create an authentication account',async()=>{
 const urls=[];const handler=edge(async(url)=>{urls.push(url);return url.endsWith('/auth/v1/user')?Response.json({id:'seller'}):new Response('',{status:403})});
 assert.equal((await handler(request({operation:'create_member',data:{username:'attempt',password:'test-password-long',role:'owner',bank_id:'other'}}))).status,403);assert.equal(urls.length,2);
});
