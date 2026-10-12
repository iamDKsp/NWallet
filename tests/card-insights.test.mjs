import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateLedger,accountBalance} from '../public/finance.mjs';
import {cardStatistics,updateCardLimit,initializeCardLimits} from '../public/card-insights.mjs';

const asOf='2026-10-12';
function fixture(){return {...emptyState(),accounts:[{id:'bank',name:'Conta',kind:'bank',scope:'personal',openingBalanceCents:-20000,openingDate:'2026-10-01',overdraftLimitCents:50000}],
  cards:[{id:'a',name:'Cartão A',scope:'personal',closingDay:20,dueDay:26,creditLimitCents:100000,openingDebtCents:30000,openingDueDate:'2026-10-26',openingInvoices:[{id:'installment',description:'Compra anterior',date:'2026-11-26',amountCents:40000}]},
    {id:'b',name:'Cartão B',scope:'personal',closingDay:20,dueDay:28,creditLimitCents:20000,openingDebtCents:30000,openingDueDate:'2026-10-28'}]};}

test('credit availability includes every open installment, while selected invoices follow the month',()=>{
  const s=fixture(),before=JSON.stringify(s),r=cardStatistics(s,'2026-10',asOf),a=r.cards[0];
  assert.equal(a.usedCents,70000);assert.equal(a.selectedPendingCents,30000);assert.equal(a.futureCents,40000);
  assert.equal(a.availableCents,30000);assert.equal(a.usedPercent,70);assert.equal(r.selectedPendingCents,60000);
  assert.equal(r.cards[1].overLimitCents,10000);assert.equal(r.cards[1].availableCents,0);
  // One card's excess does not consume the independent remaining limit of another.
  assert.equal(r.availableCents,30000);assert.equal(JSON.stringify(s),before);
  const november=cardStatistics(s,'2026-11',asOf);assert.equal(november.cards[0].selectedPendingCents,40000);assert.equal(november.cards[0].usedCents,70000);
});

test('partial and full invoice payments update used credit exactly once and show payment breakdowns',()=>{
  const s=fixture();s.entries.push({id:'pay',type:'card_payment',description:'Fatura',amountCents:10000,date:asOf,status:'posted',accountId:'bank',cardId:'a',invoiceDate:'2026-10-26',paymentMethod:'boleto'});
  validateLedger(s,asOf);let a=cardStatistics(s,'2026-10',asOf).cards[0];
  assert.equal(a.usedCents,60000);assert.equal(a.availableCents,40000);assert.equal(a.selectedPaidCents,10000);assert.equal(a.selectedPendingCents,20000);
  s.entries[0].amountCents=30000;validateLedger(s,asOf);a=cardStatistics(s,'2026-10',asOf).cards[0];
  assert.equal(a.usedCents,40000);assert.equal(a.selectedPendingCents,0);assert.equal(a.availableCents,60000);assert.equal(a.open.length,1);
});

test('a new credit purchase consumes its entire registered value, not only the first monthly installment',()=>{
  const s=fixture();s.entries.push({id:'purchase',type:'expense',description:'Nova compra',amountCents:12001,date:asOf,status:'posted',cardId:'a',accountId:null,paymentMethod:'credit',category:'Compras',installments:3});
  validateLedger(s,asOf);const r=cardStatistics(s,'2026-10',asOf);
  assert.equal(r.cards[0].usedCents,82001);assert.equal(r.cards[0].availableCents,17999);
  assert.equal(r.timeline.reduce((v,m)=>v+m.pendingCents,0),r.usedCents);
});

test('missing limits are unknown, explicit zero is respected and overdraft is separate from card credit',()=>{
  const s=fixture();delete s.cards[0].creditLimitCents;s.cards[1].creditLimitCents=0;
  const r=cardStatistics(s,'2026-10',asOf);assert.equal(r.cards[0].availableCents,null);assert.equal(r.cards[0].usedPercent,null);
  assert.equal(r.cards[1].availableCents,0);assert.equal(r.cards[1].overLimitCents,30000);assert.equal(r.configuredCount,1);assert.equal(r.availableCents,0);
  assert.equal(r.overdrafts[0].usedCents,20000);assert.equal(r.overdrafts[0].availableCents,30000);
  assert.equal(accountBalance(s,'bank',asOf),-20000);
});

test('limit updates reject invalid values and preserve the ledger and invoice data',()=>{
  const s=fixture(),entries=JSON.stringify(s.entries),invoices=JSON.stringify(s.cards[0].openingInvoices);
  for(const value of [-1,1.5,NaN,'100000',1e13])assert.throws(()=>updateCardLimit(s,'a',value));
  assert.throws(()=>updateCardLimit(s,'missing',100),/não encontrado/);
  updateCardLimit(s,'a',500000);validateLedger(s,asOf);assert.equal(s.cards[0].creditLimitCents,500000);
  updateCardLimit(s,'a',null);validateLedger(s,asOf);assert.equal(s.cards[0].creditLimitCents,null);
  assert.equal(JSON.stringify(s.entries),entries);assert.equal(JSON.stringify(s.cards[0].openingInvoices),invoices);
  for(const value of [-1,1.5,'1000']){s.cards[0].creditLimitCents=value;assert.throws(()=>validateLedger(s,asOf),/Limite de crédito/);}
});

test('deploy initialization fills only missing limits and never overwrites a configured limit, zero or explicit null',()=>{
  const s=fixture();delete s.cards[0].creditLimitCents;
  const seed={cards:[{id:'a',creditLimitCents:500000},{id:'b',creditLimitCents:999999},{id:'unknown',creditLimitCents:300000}]};
  const snapshot=structuredClone(s);assert.equal(initializeCardLimits(s,seed),1);assert.equal(s.cards[0].creditLimitCents,500000);assert.equal(s.cards[1].creditLimitCents,20000);
  assert.deepEqual(s.accounts,snapshot.accounts);assert.deepEqual(s.entries,snapshot.entries);assert.deepEqual(s.cards[0].openingInvoices,snapshot.cards[0].openingInvoices);
  assert.equal(initializeCardLimits(s,seed),0);s.cards[0].creditLimitCents=0;s.cards[1].creditLimitCents=null;
  assert.equal(initializeCardLimits(s,seed),0);assert.equal(s.cards[0].creditLimitCents,0);assert.equal(s.cards[1].creditLimitCents,null);
});
