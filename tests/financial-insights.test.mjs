import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,newPlans,accountBalance,categorySpending} from '../public/finance.mjs';
import {cashProjection,statisticsData,pendingPayments} from '../public/financial-insights.mjs';
import {debtPriorityRanking,simulateAmortization,debtAmounts} from '../public/amortization.mjs';
import {receivePayroll,settleObligation} from '../public/planning.mjs';

const asOf='2026-10-12';
function fixture(){return {...emptyState(),accounts:[{id:'bank',name:'Santander',bank:'Santander',kind:'bank',scope:'personal',openingBalanceCents:-200000,openingDate:'2026-10-01'}],
  cards:[['n',82294,26],['bb',298933,28],['s',18117,30]].map(([id,openingDebtCents,dueDay])=>({id,name:id,scope:'personal',closingDay:19,dueDay,openingDebtCents,openingDueDate:`2026-10-${dueDay}`})),
  plans:{...newPlans(),payrolls:[{id:'job',name:'CLT',accountId:'bank',baseCents:500000,payDay:5,startMonth:'2026-10',active:true,deductions:[]}],debts:[
    {id:'loan',name:'Consignado',kind:'payroll_loan',payrollId:'job',installmentCents:9621,installments:6,firstDueDate:'2026-10-05',interestRateBps:449,cetBps:480,currentBalanceCents:42859},
    {id:'car',name:'HB20',kind:'financing',accountId:'bank',installmentCents:107600,installments:22,firstDueDate:'2026-10-27',interestRateBps:149,cetBps:179,currentBalanceCents:1940317}]
  }};}

test('October cash forecast includes all three opening invoices and financing without duplicating payroll deductions',()=>{
  const s=fixture(),before=JSON.stringify(s),p=cashProjection(s,'2026-10',asOf);
  assert.equal(p.invoiceCents,399344);assert.equal(p.pendingCents,506944);assert.equal(p.commitmentCents,107600);
  assert.equal(p.paidCents,0);assert.equal(categorySpending(s,'2026-10','all',asOf).totalCents,0);
  assert.deepEqual(pendingPayments(s,'2026-10','all',asOf).map(i=>i.date),['2026-10-26','2026-10-27','2026-10-28','2026-10-30']);
  assert.equal(JSON.stringify(s),before);
});

test('partial invoice payments move amounts from pending to paid without another purchase expense',()=>{
  const s=fixture();s.entries.push({id:'pay',type:'card_payment',cardId:'n',invoiceDate:'2026-10-26',accountId:'bank',amountCents:10000,date:asOf,status:'posted'});
  const p=cashProjection(s,'2026-10',asOf);assert.equal(p.paidCents,10000);assert.equal(p.pendingCents,496944);assert.equal(p.totalCents,506944);
  assert.equal(statisticsData(s,'2026-10','month',asOf).expenseCents,0);assert.equal(accountBalance(s,'bank',asOf),-210000);
});

test('matching planned recurrence is not counted twice and an unknown amount stays explicit',()=>{
  const s=fixture();s.plans.recurrences.push({id:'light',name:'Luz',type:'expense',amountMode:'variable',amountCents:0,accountId:'bank',day:15,startMonth:'2026-10',active:true});
  assert.equal(cashProjection(s,'2026-10',asOf).unknown,1);
  s.entries.push({id:'planned',type:'expense',description:'Luz',amountCents:12345,date:'2026-10-15',status:'planned',accountId:'bank',occurrenceKey:'recurrence:light:2026-10'});
  assert.equal(cashProjection(s,'2026-10',asOf).pendingCents,506944+12345);
});

test('future invoices have no presumed interest, while overdue invoices carry their actual due dates',()=>{
  const s=fixture();let ranking=debtPriorityRanking(s,[],[],[],{asOf});
  assert.ok(ranking.filter(i=>i.type==='card_invoice').every(i=>i.status==='A vencer'&&i.monthlyRateBps===0&&i.urgency!=='high'));
  assert.equal(ranking.find(i=>i.type==='overdraft').monthlyRateBps,0);
  ranking=debtPriorityRanking(s,[],[],[],{asOf:'2026-11-01'});assert.ok(ranking.filter(i=>i.type==='card_invoice').every(i=>i.status==='Em atraso'&&i.monthlyRateBps===0));
});

test('overdraft ranking follows live account balance instead of the negative opening balance',()=>{
  const s=fixture();s.entries.push({id:'deposit',type:'income',accountId:'bank',amountCents:210000,date:asOf,status:'posted'});
  assert.equal(accountBalance(s,'bank',asOf),10000);assert.equal(debtPriorityRanking(s,[],[],[],{asOf}).some(i=>i.type==='overdraft'),false);
});

test('confirmed payroll and financing installments disappear from ranking totals and amortization',()=>{
  const s=fixture();receivePayroll(s,'job','2026-10',asOf);settleObligation(s,'debt:car:2026-10','2026-10',asOf,107600);
  const loan=s.plans.debts[0],amounts=debtAmounts(s,loan,'2026-10');assert.equal(amounts.remaining.length,5);assert.equal(amounts.nominalCents,48105);assert.equal(amounts.monthlyCents,0);
  const sim=simulateAmortization(loan,10000000,{state:s,asOfMonth:'2026-10'});
  assert.equal(sim.eliminatedCount,5);assert.ok(sim.eliminated.every(i=>i.number!==1));
  assert.equal(debtPriorityRanking(s,[],[],[],{asOf}).find(i=>i.id==='debt:car').installmentsRemaining,21);
  s.plans.debts[0].installments=1;assert.equal(debtPriorityRanking(s,[],[],[],{asOf}).some(i=>i.id==='debt:loan'),false);
});

test('quotation anomalies produce warnings without silently editing user-supplied balances',()=>{
  const s=fixture(),debt={...s.plans.debts[0],installmentCents:25145,installments:35,currentBalanceCents:905220};
  assert.match(debtAmounts(s,debt,'2026-10').warnings[0],/supera/);assert.equal(debt.currentBalanceCents,905220);
});

test('week month and year charts have different date ranges and exclude transfers, payments and future posted dates',()=>{
  const s=fixture();s.entries=[
    {id:'jan',type:'expense',amountCents:10000,date:'2026-01-02',status:'posted',category:'Outros'},
    {id:'early',type:'expense',amountCents:20000,date:'2026-10-01',status:'posted',category:'Saúde'},
    {id:'week',type:'expense',amountCents:30000,date:'2026-10-10',status:'posted',category:'Transporte'},
    {id:'income',type:'income',amountCents:40000,date:'2026-10-12',status:'posted'},
    {id:'transfer',type:'transfer',amountCents:999999,date:asOf,status:'posted'},
    {id:'future',type:'expense',amountCents:999999,date:'2026-10-20',status:'posted'}];
  const week=statisticsData(s,'2026-10','week',asOf),month=statisticsData(s,'2026-10','month',asOf),year=statisticsData(s,'2026-10','year',asOf);
  assert.equal(week.buckets.length,7);assert.equal(year.buckets.length,12);assert.equal(week.expenseCents,30000);assert.equal(month.expenseCents,50000);assert.equal(year.expenseCents,60000);
  for(const report of [week,month,year]){assert.equal(report.incomeCents,40000);assert.equal(report.buckets.reduce((v,b)=>v+b.expenseCents,0),report.expenseCents);}
});
