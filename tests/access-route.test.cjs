const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),Module=require('node:module');
test('account writes reject malformed requests, cross-bank access, disabled banks and missing sessions before forwarding',async()=>{
 let access,token,calls=[];
 const owner=()=>({userId:'owner',isPlatformAdmin:false,banks:[{id:'own',active:true}],memberships:[{user_id:'owner',bank_id:'own',role:'owner',active:true}]});
 const m=new Module('access-route',module);m.paths=module.paths;
 m.require=id=>id==='next/headers'?{cookies:async()=>({get:()=>token?{value:token}:undefined})}:id==='@/lib/gespro-auth'?{
  currentAccess:async()=>access,sessionCookie:'session',authConfig:()=>({url:'https://example.invalid',key:'public'}),validOrigin:r=>r.headers.get('origin')==='https://gespro.lol'
 }:require(id);
 m._compile(ts.transpileModule(fs.readFileSync('app/api/gespro/access/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,'access-route');
 const request=(body,origin='https://gespro.lol')=>new Request('https://gespro.lol/api/gespro/access',{method:'POST',headers:{origin},body:typeof body==='string'?body:JSON.stringify(body)});
 const valid={operation:'create_pos',data:{bank_id:'own',name:'Office'}};
 const original=global.fetch;
 global.fetch=async(url,init)=>{calls.push({url,init});return Response.json({ok:true})};
 try{
  access=owner();token='verified-token';
  assert.equal((await m.exports.POST(request(valid,'https://foreign.invalid'))).status,403);
  for(const body of ['{','null','[]',{}, {operation:'unknown',data:{}},{operation:'create_pos',data:[]}])assert.equal((await m.exports.POST(request(body))).status,400);
  assert.equal((await m.exports.POST(request({...valid,data:{bank_id:'foreign'}}))).status,403);
  assert.equal((await m.exports.POST(request({operation:'create_bank',data:{bank_id:'own'}}))).status,403);
  access.banks[0].active=false;assert.equal((await m.exports.POST(request(valid))).status,403);
  access=owner();access.memberships[0].role='seller';assert.equal((await m.exports.POST(request(valid))).status,403);
  access=owner();access.memberships[0].active=false;assert.equal((await m.exports.POST(request(valid))).status,403);
  access=owner();token='';assert.equal((await m.exports.POST(request(valid))).status,401);
  access=null;assert.equal((await m.exports.POST(request(valid))).status,401);
  assert.equal(calls.length,0);
  access=owner();token='verified-token';assert.equal((await m.exports.POST(request(valid))).status,200);
  assert.equal(calls.length,1);assert.equal(calls[0].init.headers.Authorization,'Bearer verified-token');
  assert.deepEqual(JSON.parse(calls[0].init.body),valid);
 }finally{global.fetch=original}
});
