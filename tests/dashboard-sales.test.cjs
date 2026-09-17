const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const Module=require('node:module');
function load(file){const m=new Module(file,module);m.paths=module.paths;m.require=id=>id==='./monitoring'?load('lib/monitoring.ts'):require(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);return m.exports}
const {dashboardSales}=load('lib/dashboard-sales.ts');
const t=(bank,pos,date,extra={})=>({id:bank+pos+date,bank,pointOfSaleId:pos,createdAt:new Date(date+'T12:00:00').getTime(),status:'pending',amount:0.1,prize:0,...extra});
test('daily and POS totals isolate equal POS codes across banks, include end date, and exclude cancelled value',()=>{
 const rows=[t('A','01','2026-09-15'),t('A','01','2026-09-16',{amount:0.2}),t('B','01','2026-09-16',{amount:20}),t('A','02','2026-09-16',{status:'cancelled',amount:100}),t('A','01','2026-09-17',{amount:999})];
 const report=dashboardSales(rows,'2026-09-15','2026-09-16','*');assert.equal(report.points.length,3);assert.equal(report.amount,20.3);assert.equal(report.count,4);assert.equal(report.cancelled,1);assert.equal(report.days.length,2);
 const own=dashboardSales(rows,'2026-09-15','2026-09-16','A');assert.equal(own.amount,0.3);assert.equal(own.points.find(p=>p.id==='01').amount,0.3);assert.equal(own.count,3);
 const cancelled=rows.map(r=>r.bank==='A'?{...r,status:'cancelled'}:r);assert.equal(dashboardSales(cancelled,'2026-09-15','2026-09-16','A').amount,0);
 assert.equal(dashboardSales([], '2026-09-15','2026-09-16','*').points.length,0);
});
