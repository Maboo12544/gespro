const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const Module=require('node:module');
let access={banks:[{id:'11111111-1111-4111-8111-111111111111',active:true}]};
const m=new Module('ticket-route',module);m.paths=module.paths;m.require=id=>id==='next/headers'?{cookies:async()=>({get:()=>({value:'caller-token'})})}:id==='@/lib/gespro-auth'?{currentAccess:async()=>access,authConfig:()=>({url:'https://example.invalid',key:'public-key'}),validOrigin:r=>r.headers.get('origin')==='https://gespro.lol',sessionCookie:'session'}:id==='@/lib/server-test-tickets'?{mapTestTicket:r=>r}:require(id);
m._compile(ts.transpileModule(fs.readFileSync('app/api/gespro/test-tickets/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,'ticket-route');
const body={operation:'create',posId:'22222222-2222-4222-8222-222222222222',requestId:'33333333-3333-4333-8333-333333333333',plays:[{lottery:'FLORIDA AM',number:'00',type:'DIRECTO',amount:2.35}],sellerId:'forged',amount:0,status:'paid'};
const request=(origin='https://gespro.lol')=>new Request('https://gespro.lol/api/gespro/test-tickets',{method:'POST',headers:{origin},body:JSON.stringify(body)});
test('ticket API rejects foreign origin/session/bank and forwards only caller-authorized RPC inputs; transient errors remain retryable',async()=>{const original=global.fetch;let calls=[],failure=false;global.fetch=async(url,init)=>{calls.push({url,init});return failure?new Response('{}',{status:503}):Response.json({id:123})};try{
assert.equal((await m.exports.POST(request('https://evil.invalid'))).status,403);const saved=access;access=null;assert.equal((await m.exports.POST(request())).status,401);access=saved;
assert.equal((await m.exports.GET(new Request('https://gespro.lol/api/gespro/test-tickets?bank=44444444-4444-4444-8444-444444444444'))).status,403);assert.equal(calls.length,0);
assert.equal((await m.exports.POST(request())).status,200);assert.equal(calls[0].init.headers.Authorization,'Bearer caller-token');assert.deepEqual(JSON.parse(calls[0].init.body),{target_pos:body.posId,request_key:body.requestId,entries:body.plays});
failure=true;assert.equal((await m.exports.POST(request())).status,503);
}finally{global.fetch=original}});
