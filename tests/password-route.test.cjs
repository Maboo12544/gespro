const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const Module=require('node:module');
let access={username:'seller',userId:'u1'};let calls=[];let wrong=false;let mismatch=false;
const m=new Module('password-route',module);m.paths=module.paths;m.require=id=>id==='next/server'?{NextResponse:{json:(body,options)=>({body,status:options?.status||200,cookies:{set:()=>{}}})}}:id==='@/lib/gespro-auth'?{currentAccess:async()=>access,authConfig:()=>({url:'https://example.invalid',key:'public-key'}),validOrigin:r=>r.headers.get('origin')==='https://gespro.lol',sessionCookie:'session'}:require(id);
m._compile(ts.transpileModule(fs.readFileSync('app/api/gespro/password/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,'password-route');
const body={currentPassword:'old-password',password:'new-password-123',confirmPassword:'new-password-123',userId:'attacker',username:'attacker'};
const request=(origin='https://gespro.lol',data=body)=>new Request('https://gespro.lol/api/gespro/password',{method:'POST',headers:{origin},body:JSON.stringify(data)});
test('password change requires own active session, origin, matching confirmation and correct current password',async()=>{
 const original=global.fetch;global.fetch=async(url,init)=>{calls.push({url,init});return url.includes('/token?')?(wrong?new Response('{}',{status:400}):Response.json({access_token:'fresh-token',expires_in:3600,user:{id:mismatch?'other':'u1'}})):Response.json({id:'u1'})};
 try{
 assert.equal((await m.exports.POST(request('https://evil.invalid'))).status,403);assert.equal(calls.length,0);
 access=null;assert.equal((await m.exports.POST(request())).status,401);access={username:'seller',userId:'u1'};
 assert.equal((await m.exports.POST(request(undefined,{...body,confirmPassword:'different'}))).status,400);assert.equal(calls.length,0);
 wrong=true;assert.equal((await m.exports.POST(request())).status,400);assert.equal(calls.length,1);
 wrong=false;mismatch=true;assert.equal((await m.exports.POST(request())).status,403);assert.equal(calls.length,2);
 mismatch=false;const r=await m.exports.POST(request());assert.equal(r.status,200);assert.equal(calls.length,4);
 assert.equal(JSON.parse(calls[2].init.body).email,'seller@login.gespro.lol');assert.equal(calls[3].init.headers.Authorization,'Bearer fresh-token');assert.deepEqual(JSON.parse(calls[3].init.body),{password:body.password,current_password:body.currentPassword});assert.deepEqual(r.body,{ok:true});
 }finally{global.fetch=original}
});
