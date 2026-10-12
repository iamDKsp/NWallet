import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,newPlans} from '../public/finance.mjs';
import {payableReminders,dailyReminder,defaultReminderSettings,saoPauloClock,validateReminderSettings} from '../public/reminders.mjs';
import {settleObligation} from '../public/planning.mjs';
function fixture(){return {...emptyState(),accounts:[{id:'a',name:'Pessoal',scope:'personal',kind:'bank',openingBalanceCents:100000,openingDate:'2026-01-01'}],plans:{...newPlans(),recurrences:[{id:'power',name:'Luz',type:'expense',accountId:'a',amountMode:'variable',amountCents:0,day:10,paymentMethod:'pix',category:'Moradia',startMonth:'2026-09',active:true},{id:'rent',name:'Aluguel',type:'expense',accountId:'a',amountMode:'fixed',amountCents:10000,day:12,paymentMethod:'pix',category:'Moradia',startMonth:'2026-10',active:true}]}};}
test('reminders retain older unpaid months and variable bills without inventing amounts',()=>{
  const s=fixture(),items=payableReminders(s,'2026-10-11');
  assert.equal(items.length,3);assert.deepEqual(items.map(i=>i.status),['overdue','overdue','upcoming']);assert.equal(items[0].amountCents,null);assert.equal(items[0].days,-31);assert.equal(items.at(-1).days,1);
  settleObligation(s,'recurrence:power:2026-09','2026-09','2026-10-11',13500);
  assert.equal(payableReminders(s,'2026-10-11').length,2);
});
test('digest respects exact before-days, due-day and overdue settings and hides financial details',()=>{
  const s=fixture(),settings=defaultReminderSettings();
  const message=dailyReminder(s,settings,'2026-10-09');assert.ok(message.body.includes('atraso'));assert.ok(message.body.includes('vencimento'));assert.ok(!JSON.stringify(message).includes('Aluguel'));assert.ok(!JSON.stringify(message).includes('10000'));
  assert.equal(dailyReminder(s,{...settings,enabled:false},'2026-10-09'),null);
  assert.equal(dailyReminder(s,{...settings,overdue:false,beforeDays:[]},'2026-10-09'),null);
  assert.ok(dailyReminder(s,{...settings,overdue:false,beforeDays:[]},'2026-10-10'));
  assert.equal(dailyReminder(s,{...settings,overdue:false,onDue:false,beforeDays:[]},'2026-10-10'),null);
});
test('paid financing and partial card invoices behave correctly; payroll loans never create another bill',()=>{
  const s=fixture();s.plans.recurrences=[];
  s.plans.debts=[{id:'loan',kind:'payroll_loan',payrollId:'job',name:'Consignado',installmentCents:10000,installments:2,firstDueDate:'2026-10-05'},{id:'car',kind:'financing',accountId:'a',name:'Carro',installmentCents:20000,installments:2,firstDueDate:'2026-09-10'}];
  s.cards=[{id:'card',name:'Meu cartão',scope:'personal',closingDay:25,dueDay:10,openingDebtCents:15000,openingDueDate:'2026-10-10'}];
  s.entries=[{id:'pay',type:'card_payment',status:'posted',date:'2026-10-10',accountId:'a',cardId:'card',invoiceDate:'2026-10-10',amountCents:5000}];
  let items=payableReminders(s,'2026-10-11');assert.equal(items.length,3);assert.equal(items.find(i=>i.kind==='invoice').amountCents,10000);assert.ok(!items.some(i=>i.name==='Consignado'));
  settleObligation(s,'debt:car:2026-09','2026-09','2026-10-11',20000);assert.equal(payableReminders(s,'2026-10-11').length,2);
});
test('recurrences clamp February dates, honor end dates and deduplicate matching planned entries',()=>{
  const s=fixture();s.plans.recurrences=[{...s.plans.recurrences[1],day:31,startMonth:'2028-02',endMonth:'2028-02'}];
  assert.equal(payableReminders(s,'2028-02-28')[0].date,'2028-02-29');assert.equal(payableReminders(s,'2028-03-01').length,1);
  s.entries=[{id:'planned',type:'expense',status:'planned',date:'2028-02-29',amountCents:15000,description:'Aluguel confirmado',accountId:'a',occurrenceKey:'recurrence:rent:2028-02'}];
  assert.equal(payableReminders(s,'2028-03-01').length,1);assert.equal(payableReminders(s,'2028-03-01')[0].amountCents,15000);
});
test('schedule uses São Paulo date at UTC rollover and settings are validated',()=>{
  assert.deepEqual(saoPauloClock(new Date('2026-10-12T01:30:00Z')),{date:'2026-10-11',time:'22:30'});
  assert.throws(()=>validateReminderSettings({...defaultReminderSettings(),time:'24:00'}));assert.throws(()=>validateReminderSettings({...defaultReminderSettings(),beforeDays:[100]}));
  assert.deepEqual(validateReminderSettings({...defaultReminderSettings(),beforeDays:[1,3,1]}).beforeDays,[3,1]);
});
