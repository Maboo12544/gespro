const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const Module=require('node:module');
let access={isPlatformAdmin:true,banks:[{id:'bank',active:true}]};
const m=new Module('result-route',module);m.paths=module.paths;m.require=id=>id==='next/headers'?{cookies:async()=>({get:()=>({value:'caller-token'})})}:id==='@/lib/gespro-auth'?{currentAccess:async()=>access,authConfig:()=>({url:'https://example.invalid',key:'public-key'}),validOrigin:r=>r.headers.get('origin')==='https://gespro.lol',sessionCookie:'session'}:require(id);
m._compile(ts.transpileModule(fs.readFileSync('app/api/gespro/results/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,'result-route');
const body={bank:'bank',lotteryId:'fl',date:'2026-09-15',numbers:['100','00','00'],version:0,reason:'',actor:'forged',prize:999};
const request=(data=body,origin='https://gespro.lol')=>new Request('https://gespro.lol/api/gespro/results',{method:'POST',headers:{origin},body:JSON.stringify(data)});
test('result API enforces session, origin, superadmin and active bank; preserves zeros and ignores client prize/actor',async()=>{const original=global.fetch;let calls=[];global.fetch=async(url,init)=>{calls.push({url,init});return Response.json({version:1})};try{
assert.equal((await m.exports.POST(request(body,'https://evil.invalid'))).status,403);
const saved=access;access=null;assert.equal((await m.exports.POST(request())).status,401);access={...saved,isPlatformAdmin:false};assert.equal((await m.exports.POST(request())).status,403);access=saved;
assert.equal((await m.exports.POST(request({...body,bank:'foreign'}))).status,400);
assert.equal((await m.exports.POST(request({...body,numbers:[100,'00','00']}))).status,400);assert.equal(calls.length,0);
assert.equal((await m.exports.POST(request())).status,200);assert.equal(calls[0].init.headers.Authorization,'Bearer caller-token');assert.deepEqual(JSON.parse(calls[0].init.body),{target_bank:'bank',lottery_id:'fl',result_date:'2026-09-15',numbers:['100','00','00'],expected_version:0,reason:''});
global.fetch=async()=>Response.json({code:'40001',message:'Result conflict'},{status:400});assert.equal((await m.exports.POST(request())).status,409);
}finally{global.fetch=original;access={isPlatformAdmin:true,banks:[{id:'bank',active:true}]}}});
