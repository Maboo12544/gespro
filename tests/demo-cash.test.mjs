import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyToCents, cashSummary } from '../lib/demo-cash.ts';
test('net sales exclude cancellations and balance deducts commission, prizes and remittances',()=>{
 assert.deepEqual(cashSummary(100000,10000,15000,1000,40000),{gross:100000,cancelled:10000,net:90000,paid:15000,commission:9000,remitted:40000,due:66000,balance:26000});
});
test('bank owes seller when paid prizes exceed net proceeds',()=>assert.equal(cashSummary(1000,0,2000,0,0).balance,-1000));
test('reject malformed amounts; preserve decimal cents',()=>{assert.equal(moneyToCents('12,34'),1234);for(const s of ['-1','1e3','1.001','','NaN'])assert.throws(()=>moneyToCents(s));});
test('reject impossible cancellation and commission values',()=>{assert.throws(()=>cashSummary(100,101,0,0,0));assert.throws(()=>cashSummary(100,0,0,10001,0));assert.equal(cashSummary(105,0,0,1000,0).commission,11);});
