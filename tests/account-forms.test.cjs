const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const Module=require('node:module');

function component(file){
 const states=[];
 const jsx=(type,props)=>({type,props});
 const m=new Module(file,module);m.paths=module.paths;
 m.require=id=>id==='react'?{
  useState(value){const state={value};states.push(state);return [value,next=>{state.value=next}]},
  useRef:value=>({current:value}),useEffect(){}
 }:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id.startsWith('@/components/ui/')?{Button:'button',Input:'input'}:require(id);
 m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,file);
 return {exports:m.exports,states};
}
function find(node,type){
 if(!node||typeof node!=='object')return null;
 if(node.type===type)return node;
 for(const child of [node.props?.children].flat(Infinity)){const match=find(child,type);if(match)return match;}
 return null;
}
const event={preventDefault(){}};

test('entity save sends once and distinguishes committed changes from failed list refresh',async()=>{
 const original=global.fetch;let calls=0,release;
 global.fetch=()=>{calls++;return new Promise(resolve=>{release=resolve})};
 try{
  const loaded=component('components/bank-entity-editor.tsx');
  const tree=loaded.exports.BankEntityEditor({bank:'b',id:'p',kind:'pos',name:'Office',active:true,onSaved:async()=>{throw Error('offline')}});
  const form=find(tree,'form');form.props.onSubmit(event);form.props.onSubmit(event);
  assert.equal(calls,1);
  release(Response.json({ok:true}));await new Promise(resolve=>setImmediate(resolve));
  assert.match(loaded.states[3].value,/anrejistre, men lis la pa rafrechi/);
  assert.equal(loaded.states[2].value,false);
 }finally{global.fetch=original}
});

test('login suppresses concurrent submits and unlocks after a network failure',async()=>{
 const original=global.fetch;let calls=0,reject;
 global.fetch=()=>{calls++;return new Promise((_,fail)=>{reject=fail})};
 try{
  const loaded=component('components/gespro-auth-form.tsx');
  const form=find(loaded.exports.GesproAuthForm({}),'form');
  const first=form.props.onSubmit(event);await form.props.onSubmit(event);assert.equal(calls,1);
  reject(Error('offline'));await first;
  assert.match(loaded.states[4].value,/koneksyon/);
  const retry=form.props.onSubmit(event);assert.equal(calls,2);reject(Error('offline'));await retry;
 }finally{global.fetch=original}
});
