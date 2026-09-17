const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),Module=require('node:module');
function load(file){const m=new Module(file,module);m.paths=module.paths;const originalRequire=m.require.bind(m);m.require=id=>id==="./printer-settings"?load("lib/printer-settings.ts"):originalRequire(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);return m.exports}
const {ticketArtwork,ticketArtworkUrl}=load('lib/ticket-artwork.ts');
const ticket={id:'00001234',bank:'TEST',createdAt:0,seller:'Seller',amount:6,prize:0,status:'pending',plays:[{lottery:'FLORIDA AM',number:'00',amount:2,type:'DIRECTO'},{lottery:'NEW YORK PM',number:'007',amount:4,type:'CASH 3 STRAIGHT'}]};
test('reuse vector artwork while keeping original, copy and updates separate',()=>{
 const original=ticketArtwork(ticket,false);
 assert.equal(ticketArtwork(ticket,false),original);
 assert.equal(ticketArtworkUrl(ticket,false),ticketArtworkUrl(ticket,false));
 assert.match(original.svg,/ORIGINAL/);assert.match(original.svg,/FLORIDA AM/);assert.match(original.svg,/NEW YORK PM/);assert.match(original.svg,/007Str/);
 const copy=ticketArtwork(ticket,true);assert.notEqual(copy,original);assert.match(copy.svg,/COPY/);
 const cancelled=ticketArtwork({...ticket,status:'cancelled'},false);assert.match(cancelled.svg,/ANILE/);assert.doesNotMatch(original.svg,/ANILE/);
});
test('print waits for image decoding and can be cancelled',async()=>{
 const {scheduleTicketPrint}=load('lib/print-ticket.ts');let printed=0,resolve;
 global.document={documentElement:{style:{setProperty(){}}},querySelectorAll:()=>[{decode:()=>new Promise(r=>resolve=r)}]};
 global.window={print:()=>printed++};global.requestAnimationFrame=f=>{f();return 1};global.cancelAnimationFrame=()=>{};
 const cancel=scheduleTicketPrint();assert.equal(printed,0);cancel();resolve();await new Promise(r=>setImmediate(r));assert.equal(printed,0);
 scheduleTicketPrint();resolve();await new Promise(r=>setImmediate(r));assert.equal(printed,1);
});
