import test from 'node:test';
import assert from 'node:assert/strict';
import {cents,emptyState,validateLedger,accountBalance,summary,invoices,splitAmount,firstInvoiceDate,addMonths,today} from '../public/finance.mjs';
import {cardBank,linkCardAccount,upsertAccount} from '../public/finance.mjs';
const date='2026-10-10';
function fixture() {
  return {...emptyState(),accounts:[
    {id:'personal',name:'Pessoal',kind:'bank',scope:'personal',openingBalanceCents:100000,openingDate:'2026-10-01'},
    {id:'business',name:'Empresa',kind:'bank',scope:'business',openingBalanceCents:200000,openingDate:'2026-10-01'},
  ],cards:[{id:'card',name:'Cartão',scope:'personal',closingDay:25,dueDay:5,openingDebtCents:20000,openingDueDate:'2026-10-05'}]};
}
const entry = overrides => ({id:'e',type:'expense',description:'Mercado',amountCents:10000,date,status:'posted',accountId:'personal',paymentMethod:'pix',category:'Alimentação',...overrides});

test('one bank account owns multiple cards and supplies their bank and scope',()=>{
  const s=fixture();s.accounts[1].bank='Itaú';
  s.cards[0]=linkCardAccount(s,s.cards[0],'business');
  s.cards.push(linkCardAccount(s,{...s.cards[0],id:'virtual',name:'Virtual'},'business'));
  validateLedger(s,date);assert.ok(s.cards.every(c=>c.scope==='business'&&cardBank(s,c)==='Itaú'));
  upsertAccount(s,{...s.accounts[1],bank:'Novo banco',scope:'personal'});
  validateLedger(s,date);assert.ok(s.cards.every(c=>c.scope==='personal'&&cardBank(s,c)==='Novo banco'));
  assert.equal(accountBalance(s,'business',date),200000);
});
test('cards remain independent by default and broken bank relationships are rejected',()=>{
  const s=fixture();validateLedger(s,date);
  for(const id of ['missing','cash']){
    s.accounts.push({id:'cash',name:'Dinheiro',kind:'cash',scope:'personal',openingBalanceCents:0,openingDate:date});
    assert.throws(()=>linkCardAccount(s,s.cards[0],id),/conta bancária/);s.accounts.pop();
  }
  s.cards[0]=linkCardAccount(s,s.cards[0],'personal');
  assert.throws(()=>upsertAccount(s,{...s.accounts[0],kind:'cash'}),/Desvincule/);
  const broken=structuredClone(s);broken.accounts.shift();assert.throws(()=>validateLedger(broken,date),/conta bancária/);
  s.cards[0].scope='business';assert.throws(()=>validateLedger(s,date),/contexto/);
  s.cards[0]=linkCardAccount(s,s.cards[0],null);validateLedger(s,date);assert.equal(s.cards[0].accountId,null);
});
test('Brazilian money inputs preserve centavos and reject ambiguous or invalid values',()=>{
  assert.equal(cents('R$ 1.234,56'),123456);assert.equal(cents('0,01'),1);assert.equal(cents('-0,01'),-1);assert.equal(cents('-10,50'),-1050);
  for(const v of ['','12.50','abc','1,999','1e5','NaN'])assert.throws(()=>cents(v));
});
test('calendar uses São Paulo and clamps month ends without skipping February',()=>{
  assert.match(today(),/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(addMonths('2026-01-31',1),'2026-02-28');assert.equal(addMonths('2026-01-31',2),'2026-03-31');
  const card=fixture().cards[0];
  assert.equal(firstInvoiceDate(card,'2026-10-25'),'2026-11-05');assert.equal(firstInvoiceDate(card,'2026-10-26'),'2026-12-05');
  assert.equal(firstInvoiceDate({...card,closingDay:5,dueDay:15},'2026-10-04'),'2026-10-15');
});
test('opening balances, posted entries and transfers reconcile without inflating income',()=>{
  const s=fixture();s.entries=[entry({id:'salary',type:'income',amountCents:300000,source:'clt'}),entry({id:'expense'}),entry({id:'transfer',type:'transfer',amountCents:50000,accountId:'business',toAccountId:'personal',paymentMethod:'transfer'})];
  validateLedger(s,date);assert.equal(accountBalance(s,'personal',date),440000);assert.equal(accountBalance(s,'business',date),150000);
  const all=summary(s,'2026-10','all',date);assert.equal(all.balanceCents,590000);assert.equal(all.incomeCents,300000);assert.equal(all.expenseCents,10000);
  assert.equal(summary(s,'2026-10','business',date).incomeCents,0);
});
test('planned receipts and payments stay out of cash until settled',()=>{
  const s=fixture();s.entries=[entry({status:'planned'}),entry({id:'receipt',type:'income',source:'company',status:'planned',accountId:'business',amountCents:50000})];
  let v=summary(s,'2026-10','all',date);assert.equal(v.balanceCents,300000);assert.equal(v.incomeCents,0);assert.equal(v.receivableCents,50000);assert.equal(v.payableCents,30000);
  s.entries[0].status='posted';s.entries[1].status='posted';v=summary(s,'2026-10','all',date);assert.equal(v.balanceCents,340000);assert.equal(v.incomeCents,50000);assert.equal(v.expenseCents,10000);
});
test('credit installments sum to the purchase and paying an invoice never repeats expense',()=>{
  const s=fixture();s.entries=[entry({amountCents:10001,paymentMethod:'credit',accountId:null,cardId:'card',installments:3})];
  assert.deepEqual(splitAmount(10001,3),[3334,3334,3333]);
  let bills=invoices(s,date);assert.equal(bills.reduce((n,b)=>n+b.totalCents,0),30001);assert.equal(accountBalance(s,'personal',date),100000);
  assert.equal(summary(s,'2026-10','personal',date).expenseCents,10001);
  s.entries.push(entry({id:'payment',type:'card_payment',amountCents:20000,cardId:'card',invoiceDate:'2026-10-05',paymentMethod:'boleto'}));
  validateLedger(s,date);bills=invoices(s,date);assert.equal(bills[0].remainingCents,0);assert.equal(accountBalance(s,'personal',date),80000);assert.equal(summary(s,'2026-10','personal',date).expenseCents,10001);
});
test('partial invoice payments and edits cannot create an overpaid or orphaned invoice',()=>{
  const s=fixture();s.entries=[entry({id:'payment',type:'card_payment',cardId:'card',invoiceDate:'2026-10-05',amountCents:5000,paymentMethod:'boleto'})];
  validateLedger(s,date);assert.equal(invoices(s,date)[0].remainingCents,15000);
  s.entries[0].amountCents=20001;assert.throws(()=>validateLedger(s,date),/supera/);
  s.entries[0].amountCents=5000;s.cards[0].openingDebtCents=0;assert.throws(()=>validateLedger(s,date),/supera/);
});
test('receipts are separated by source and scope, loans report remaining installments',()=>{
  const s=fixture();s.entries=[entry({id:'loan',status:'planned',commitmentKind:'loan',amountCents:30000}),entry({id:'clt',type:'income',source:'clt'}),entry({id:'company',type:'income',source:'company',accountId:'business',amountCents:50000})];
  validateLedger(s,date);assert.equal(summary(s,'2026-10','personal',date).incomeCents,10000);assert.equal(summary(s,'2026-10','business',date).incomeCents,50000);assert.equal(summary(s,'2026-10','all',date).debtCents,30000);
  s.entries[0].status='posted';assert.equal(summary(s,'2026-10','all',date).debtCents,0);
});
test('schema validation rejects broken references, dates, cents and duplicated ids',()=>{
  const cases=[{accountId:'missing'},{amountCents:1.5},{date:'2026-02-30'},{amountCents:-10},{date:'2026-09-30'},{type:'income',source:'bad'},{type:'transfer',toAccountId:'personal',paymentMethod:'transfer'},{status:'posted',date:'2026-10-11'},{paymentMethod:'credit',accountId:null,cardId:'card',installments:3,amountCents:2}];
  for(const change of cases){const s=fixture();s.entries=[entry(change)];assert.throws(()=>validateLedger(s,date));}
  const s=fixture();s.entries=[entry(),entry()];assert.throws(()=>validateLedger(s,date),/repetido/);
});
test('editing or deleting a cash expense recalculates balances from the ledger',()=>{
  const s=fixture();s.entries=[entry()];assert.equal(accountBalance(s,'personal',date),90000);
  s.entries[0].amountCents=30000;assert.equal(accountBalance(s,'personal',date),70000);s.entries=[];assert.equal(accountBalance(s,'personal',date),100000);
});
test('installments predating the starting snapshot add invoice debt without new expenses',()=>{
  const s=fixture();s.cards[0].openingInvoices=[{id:'previous',description:'Notebook anterior · 1/2',date:'2026-11-05',amountCents:30000}];
  validateLedger(s,date);assert.equal(invoices(s,date).find(i=>i.date==='2026-11-05').remainingCents,30000);
  assert.equal(summary(s,'2026-10','all',date).expenseCents,0);assert.equal(summary(s,'2026-11','all',date).payableCents,30000);
});
test('overdue commitments can predate the snapshot and count only when paid after it',()=>{
  const s=fixture();s.entries=[entry({status:'planned',date:'2026-09-15'})];
  validateLedger(s,date);assert.equal(accountBalance(s,'personal',date),100000);
  s.entries[0].status='posted';assert.throws(()=>validateLedger(s,date),/saldo inicial/);
  s.entries[0].date=date;validateLedger(s,date);assert.equal(accountBalance(s,'personal',date),90000);
});
