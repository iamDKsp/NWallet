import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,newPlans,validateLedger,accountBalance,summary} from '../public/finance.mjs';
import {payrollPreview,receivePayroll,debtSchedule,obligations,settleObligation,businessSummary,commitmentSummary,removePostedEntry} from '../public/planning.mjs';
const month='2026-10',date='2026-10-10';
function fixture(){return {...emptyState(),accounts:[
  {id:'personal',name:'Conta CLT',scope:'personal',kind:'bank',openingBalanceCents:100000,openingDate:'2026-10-01'},
  {id:'business',name:'Empresa',scope:'business',kind:'bank',openingBalanceCents:200000,openingDate:'2026-10-01'}
],plans:{...newPlans(),payrolls:[{id:'job',name:'Meu CLT',accountId:'personal',baseCents:400000,payDay:5,startMonth:month,active:true,deductions:[
  {id:'tax',name:'INSS informado',kind:'tax',mode:'fixed',amountCents:30000,rateBps:0,startMonth:month,endMonth:null,active:true},
  {id:'pension',name:'Pensão na folha',kind:'pension',mode:'percent',amountCents:0,rateBps:1500,startMonth:month,endMonth:null,active:true}
]}],debts:[{id:'consigned',name:'Consignado',kind:'payroll_loan',payrollId:'job',accountId:null,installmentCents:50000,installments:4,firstDueDate:'2026-10-05'}]}};}
test('payroll links consigned loans and deductions, depositing only net salary',()=>{
  const s=fixture(),p=payrollPreview(s,s.plans.payrolls[0],month);assert.equal(p.baseCents,400000);assert.equal(p.deductionCents,140000);assert.equal(p.netCents,260000);
  assert.equal(accountBalance(s,'personal',date),100000);receivePayroll(s,'job',month,date);validateLedger(s,date);
  assert.equal(accountBalance(s,'personal',date),360000);assert.equal(summary(s,month,'personal',date).incomeCents,260000);assert.equal(summary(s,month,'personal',date).expenseCents,0);
  assert.equal(debtSchedule(s,s.plans.debts[0]).filter(i=>!i.paid).length,3);
  assert.throws(()=>receivePayroll(s,'job',month,date),/já foi recebido/);
});
test('confirmed payslips stay as snapshots when the future salary or bank account changes',()=>{
  const s=fixture();receivePayroll(s,'job',month,date);s.plans.payrolls[0].baseCents=500000;s.plans.payrolls[0].deductions[0].amountCents=40000;
  validateLedger(s,date);const confirmed=obligations(s,month).find(i=>i.kind==='payroll');assert.equal(confirmed.amountCents,260000);
  assert.equal(payrollPreview(s,s.plans.payrolls[0],'2026-11').netCents,335000);
  s.accounts.push({id:'newbank',name:'Nova conta',scope:'personal',kind:'bank',openingBalanceCents:0,openingDate:date});s.plans.payrolls[0].accountId='newbank';validateLedger(s,date);
  assert.equal(accountBalance(s,'personal',date),360000);
});
test('deleting a paycheck reopens its linked installments, while direct payment is rejected',()=>{
  const s=fixture();assert.throws(()=>settleObligation(s,'debt:consigned:2026-10',month,date,50000),/salário/);
  receivePayroll(s,'job',month,date);removePostedEntry(s,s.entries[0].id);validateLedger(s,date);
  assert.equal(s.plans.payrollRuns.length,0);assert.equal(debtSchedule(s,s.plans.debts[0]).filter(i=>!i.paid).length,4);assert.equal(accountBalance(s,'personal',date),100000);
});
test('finished payroll loans stop reducing later salaries and cannot be paid twice',()=>{
  const s=fixture();s.plans.debts[0].installments=1;receivePayroll(s,'job',month,date);
  assert.equal(payrollPreview(s,s.plans.payrolls[0],'2026-11').netCents,310000);assert.equal(debtSchedule(s,s.plans.debts[0]).filter(i=>!i.paid).length,0);
});
test('company withdrawals preserve total cash without becoming personal income or business expense',()=>{
  const s=fixture();s.entries=[{id:'client',type:'income',description:'Cliente',amountCents:100000,date,status:'posted',accountId:'business',paymentMethod:'pix',source:'company'},
    {id:'withdraw',type:'transfer',description:'Retirada pessoal',amountCents:40000,date,status:'posted',accountId:'business',toAccountId:'personal',paymentMethod:'transfer'}];
  validateLedger(s,date);const b=businessSummary(s,month);assert.equal(b.balanceCents,260000);assert.equal(b.incomeCents,100000);assert.equal(b.withdrawalsCents,40000);assert.equal(b.expenseCents,0);
  assert.equal(accountBalance(s,'personal',date),140000);assert.equal(summary(s,month,'personal',date).incomeCents,0);assert.equal(summary(s,month,'all',date).balanceCents,400000);
});
test('financing and fixed pension payments are planned, confirmed once and reduce the proper account',()=>{
  const s=fixture();s.plans.debts.push({id:'car',name:'Financiamento do carro',kind:'financing',accountId:'personal',payrollId:null,installmentCents:70000,installments:3,firstDueDate:'2026-10-10'});
  s.plans.recurrences.push({id:'pension-bank',name:'Outra pensão pela conta',type:'expense',amountMode:'fixed',amountCents:20000,accountId:'personal',day:10,paymentMethod:'pix',category:'Pensão',startMonth:month,endMonth:null,active:true});
  validateLedger(s,date);assert.equal(accountBalance(s,'personal',date),100000);assert.equal(commitmentSummary(s,month).expenseCents,90000);
  settleObligation(s,'debt:car:2026-10',month,date,70000);settleObligation(s,'recurrence:pension-bank:2026-10',month,date,20000);validateLedger(s,date);
  assert.equal(accountBalance(s,'personal',date),10000);assert.equal(debtSchedule(s,s.plans.debts[1]).filter(i=>!i.paid).length,2);
  assert.throws(()=>settleObligation(s,'debt:car:2026-10',month,date,70000),/confirmado/);
});
test('variable recurring expenses remain visibly unknown until actual amounts are supplied',()=>{
  const s=fixture();s.plans.recurrences.push({id:'power',name:'Luz',type:'expense',amountMode:'variable',amountCents:0,accountId:'personal',day:31,paymentMethod:'boleto',category:'Moradia',startMonth:month,endMonth:null,active:true});
  validateLedger(s,date);assert.equal(commitmentSummary(s,month).unknown,1);assert.equal(obligations(s,'2027-02').find(i=>i.id==='power').date,'2027-02-28');
  assert.throws(()=>settleObligation(s,'recurrence:power:2026-10',month,date,0),/Informe o valor/);
  settleObligation(s,'recurrence:power:2026-10',month,date,15325);validateLedger(s,date);assert.equal(accountBalance(s,'personal',date),84675);assert.equal(commitmentSummary(s,month).unknown,0);
  s.plans.recurrences[0].active=false;assert.equal(obligations(s,'2026-11').some(i=>i.id==='power'),false);assert.equal(obligations(s,month).find(i=>i.id==='power').paid,true);
});
test('validation catches missing payroll links, inconsistent net deposits and duplicated occurrences',()=>{
  const s=fixture();s.plans.debts[0].payrollId='missing';assert.throws(()=>validateLedger(s,date),/Vincule/);s.plans.debts[0].payrollId='job';
  receivePayroll(s,'job',month,date);s.entries[0].amountCents+=1;assert.throws(()=>validateLedger(s,date),/salário líquido/);s.entries[0].amountCents-=1;
  s.entries.push({...s.entries[0],id:'duplicate'});assert.throws(()=>validateLedger(s,date),/já foi registrado/);
});
test('a discount with an end date stops appearing and an excessive deduction blocks salary receipt',()=>{
  const s=fixture();s.plans.payrolls[0].deductions[0].endMonth=month;
  assert.equal(payrollPreview(s,s.plans.payrolls[0],'2026-11').netCents,290000);
  s.plans.payrolls[0].deductions[0].amountCents=500000;assert.throws(()=>receivePayroll(s,'job',month,date),/menores/);
});
test('an explicit zero salary is rejected rather than depositing the configured salary',()=>{
  const s=fixture();assert.throws(()=>receivePayroll(s,'job',month,date,0),/salário positivo/);assert.equal(s.entries.length,0);assert.equal(s.plans.payrollRuns.length,0);
});
test('percentage deductions round to centavos without losing integer precision',()=>{
  const s=fixture();s.plans.debts=[];s.plans.payrolls[0].deductions=[{id:'percentage',name:'Percentual informado',kind:'other',mode:'percent',rateBps:3333,startMonth:month,endMonth:null,active:true}];
  const base=999999999999,expected=Number((BigInt(base)*3333n+5000n)/10000n);
  assert.equal(payrollPreview(s,s.plans.payrolls[0],month,base).deductionCents,expected);
});
test('long employer names still generate a valid linked paycheck description',()=>{
  const s=fixture();s.plans.payrolls[0].name='Empresa '.repeat(20);receivePayroll(s,'job',month,date);validateLedger(s,date);assert.ok(s.entries[0].description.length<=160);assert.ok(s.entries[0].description.includes(month));
});
