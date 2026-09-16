import test from 'node:test';
import assert from 'node:assert/strict';
import {latestDuplicableTicket,canCancel,ticketTotals} from '../lib/monitoring.ts';
const ticket=(id,createdAt,extra={})=>({id,createdAt,bank:'JP Bòlèt',pointOfSaleId:'jp-pos-1',seller:'Test',amount:10,prize:0,status:'pending',cancelUntil:1000,plays:[],...extra});
test('duplicate selects newest eligible ticket regardless of ordering and excludes other points and banks',()=>{
 const old=ticket('old',10), recent=ticket('recent',20);
 const excluded=[ticket('cancelled',30,{status:'cancelled'}),ticket('other-point',40,{pointOfSaleId:'jp-pos-2'}),ticket('other-bank',50,{bank:'Other'})];
 for(const list of [[old,recent,...excluded],[...excluded,recent,old]])assert.equal(latestDuplicableTicket(list,'JP Bòlèt','jp-pos-1'),recent);
 assert.equal(latestDuplicableTicket(excluded,'JP Bòlèt','jp-pos-1'),undefined);
});
test('cancellation deadline and paid status prevent cancellation',()=>{
 assert.equal(canCancel(ticket('a',0),999),true);
 assert.equal(canCancel(ticket('a',0),1000),false);
 assert.equal(canCancel(ticket('a',0,{paidAt:10}),100),false);
 assert.equal(canCancel(ticket('a',0,{status:'winner'}),100),false);
});
test('monitor totals exclude cancelled amounts and already paid prizes from payment due',()=>{
 assert.deepEqual(ticketTotals([ticket('a',0),ticket('b',0,{status:'cancelled'}),ticket('c',0,{status:'winner',prize:65}),ticket('d',0,{status:'winner',prize:15,paidAt:10})]),{amount:30,prize:80,pending:65});
});
