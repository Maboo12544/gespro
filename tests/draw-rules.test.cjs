const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const Module=require('node:module');
function load(file){const m=new Module(file,module);m.paths=module.paths;m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);return m.exports}
const {deriveDraw,validateDrawPlay,playIdentity}=load('lib/draw-rules.ts');
const {parsePlayEntry}=load('lib/play-entry.ts');
const {secondsToClose}=load('components/lottery-countdown.tsx');
const lottery=(mode,name='TEST')=>({id:'test',name,bank:null,resultMode:mode});
const play=(type,number,amount=2)=>({lottery:'TEST',type,number,amount});
test('all configured result formats retain zeros and exact slots',()=>{
 assert.deepEqual(deriveDraw(lottery(),['746','20','10']),['46','20','10','746','2010','74620']);
 assert.deepEqual(deriveDraw(lottery(),['007','00','01']),['07','00','01','007','0001','00700']);
 assert.deepEqual(deriveDraw(lottery('massachusetts4'),['0017']),['00','01','17','001','0017','','017']);
 assert.deepEqual(deriveDraw(lottery('dominican3'),['00','05','90']),['00','05','90']);
 assert.deepEqual(deriveDraw(lottery(undefined,'FL PICK 2 AM'),['00']),['00']);
 for(const [mode,values] of [['pick2',['000']],['dominican3',['1','02','03']],['massachusetts4',['381']],['pending',['00']],['dominican3',['00','01','02','03']]])assert.throws(()=>deriveDraw(lottery(mode),values));
});
test('unsupported games and invalid amounts cannot finalize',()=>{
 for(const [mode,p] of [['pick2',play('PALÉ','05-20')],['dominican3',play('CASH 3 STRAIGHT','007')],['massachusetts4',play('PICK 5 STRAIGHT','00123')],[undefined,play('TRIPLETA','00-01-02')],['pending',play('DIRECTO','05')],[undefined,play('DIRECTO','05',NaN)],[undefined,play('DIRECTO','05',0)]])assert.throws(()=>validateDrawPlay(lottery(mode),p));
 for(const p of [play('DIRECTO','00'),play('PALÉ','00-05'),play('TRIPLETA','00-05-90')])assert.doesNotThrow(()=>validateDrawPlay(lottery('dominican3'),p));
 assert.equal(playIdentity(play('DIRECTO','00')),playIdentity(play('BOUL PÈ','00')));
});
test('Cash 3 combinations expand to 6, 3 or 1 unique plays',()=>{
 for(const [entry,count] of [['123q',6],['007q',3],['000q',1]]){const entries=parsePlayEntry(entry);assert.equal(entries.length,count);assert.equal(new Set(entries.map(p=>p.number)).size,count);assert(entries.every(p=>p.number.length===3));}
});
test('closure respects exact second, zone and daylight savings',()=>{
 const schedule={time:'13:00',zone:'America/New_York'};
 assert.equal(secondsToClose(schedule,new Date('2026-09-16T16:55:00Z')),300);
 assert.equal(secondsToClose(schedule,new Date('2026-09-16T17:00:00Z')),0);
 assert.equal(secondsToClose(schedule,new Date('2026-09-16T17:00:01Z')),-1);
 assert.equal(secondsToClose(schedule,new Date('2026-01-16T18:00:00Z')),0);
 assert.equal(secondsToClose({time:'25:00',zone:schedule.zone},new Date()),null);
});
