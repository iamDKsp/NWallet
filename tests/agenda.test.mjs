import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateLedger,today,accountBalance} from '../public/finance.mjs';
import {upsertAppointment,appointmentOccurrences,archiveAppointment,toggleAppointment,calendarDays,monthRange,navigateCalendar,shiftDays,buildCalendarItems,filterCalendarItems} from '../public/agenda.mjs';
import {createFinanceIntegration} from '../public/assets/finance-integration.mjs';
const event=overrides=>({title:'Reunião',date:'2026-10-12',time:'09:30',kind:'work',repeat:'none',location:'Sala 2',notes:'Levar proposta',...overrides});

test('appointments persist in the wallet while legacy states without them remain valid',()=>{
  const s=emptyState();const added=upsertAppointment(s,event());validateLedger(s);
  const restored=JSON.parse(JSON.stringify(s));validateLedger(restored);
  assert.equal(restored.appointments[0].time,'09:30');
  upsertAppointment(restored,event({id:added.id,title:'Reunião remarcada',date:'2026-10-13'}));
  assert.equal(restored.appointments.length,1);assert.equal(restored.appointments[0].id,added.id);
  const legacy=emptyState();delete legacy.appointments;validateLedger(legacy);
});
test('validation rejects malformed dates, times, titles, recurrence limits and duplicate ids',()=>{
  const s=emptyState();const item=upsertAppointment(s,event());
  for(const change of [{title:' '},{date:'2026-02-30'},{time:'24:00'},{time:'09:75'},{repeat:'daily'},{kind:'invalid'},{endDate:'2026-10-01'},{completedDates:['invalid']},{completedDates:['2026-10-12','2026-10-12']}])assert.throws(()=>validateLedger({...s,appointments:[{...item,...change}]}));
  assert.throws(()=>validateLedger({...s,appointments:[item,item]}),/repetido/);
  assert.throws(()=>validateLedger({...s,appointments:[null]}),/inválido/);
});
test('weeks contain seven days and month grids handle leap years and year boundaries',()=>{
  const week=calendarDays('2026-10-12');assert.equal(week.length,7);assert.equal(week[0],'2026-10-12');assert.equal(week.at(-1),'2026-10-18');
  const grid=calendarDays('2028-02-29','month');assert.equal(grid.length,42);assert.ok(grid.includes('2028-02-29'));assert.ok(grid.includes('2028-03-01'));
  assert.deepEqual(monthRange('2028-02-15'),{start:'2028-02-01',end:'2028-02-29'});
  assert.equal(navigateCalendar('2026-12-31','week',1),'2027-01-07');assert.equal(navigateCalendar('2026-01-31','month',1),'2026-02-28');
  assert.equal(navigateCalendar('2200-12-31','month',1),'2200-12-31');assert.equal(shiftDays('2026-12-31',1),'2027-01-01');
});
test('monthly repetition clamps February and returns to the original day in March',()=>{
  const s=emptyState();upsertAppointment(s,event({date:'2026-01-31',repeat:'monthly',endDate:'2026-04-30'}));
  assert.deepEqual(appointmentOccurrences(s,'2026-01-01','2026-05-31').map(e=>e.date),['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
  assert.deepEqual(appointmentOccurrences(s,'2026-02-28','2026-03-31').map(e=>e.date),['2026-02-28','2026-03-31']);
});
test('weekly repetition can conclude one occurrence and archive or restore the series',()=>{
  const s=emptyState();const item=upsertAppointment(s,event({repeat:'weekly',endDate:'2026-11-02'}));
  toggleAppointment(s,item.id,'2026-10-19');
  const rows=appointmentOccurrences(s,'2026-10-12','2026-11-02');assert.equal(rows.length,4);assert.equal(rows.filter(e=>e.completed).length,1);
  assert.equal(rows[0].completed,false);assert.equal(rows[1].completed,true);
  assert.throws(()=>toggleAppointment(s,item.id,'2026-10-20'),/Ocorrência/);
  archiveAppointment(s,item.id);assert.equal(appointmentOccurrences(s,'2026-10-12','2026-11-02').length,0);
  archiveAppointment(s,item.id,false);toggleAppointment(s,item.id,'2026-10-19');validateLedger(s);assert.equal(appointmentOccurrences(s,'2026-10-12','2026-11-02').filter(e=>e.completed).length,0);
});
test('filters and agenda sorting distinguish real money events from personal completion',()=>{
  const s=emptyState();const personal=upsertAppointment(s,event());upsertAppointment(s,event({title:'Antes',time:'08:00'}));
  const forecast={id:'bill',date:'2026-10-12',title:'Fatura',amountCents:2000};
  const bday={id:'bday',date:'2026-10-12',title:'Aniversário',type:'birthday'};
  const items=buildCalendarItems(s,'2026-10-12','2026-10-12',[forecast,bday]);
  assert.equal(filterCalendarItems(items,'finance').length,1);assert.equal(filterCalendarItems(items,'birthdays').length,1);
  assert.deepEqual(filterCalendarItems(items,'appointments').map(e=>e.title),['Antes','Reunião']);
  toggleAppointment(s,personal.id,'2026-10-12');const next=buildCalendarItems(s,'2026-10-12','2026-10-12',[forecast,bday]);
  assert.equal(filterCalendarItems(next,'appointments').length,1);assert.equal(filterCalendarItems(next,'appointments',true).length,2);
  assert.equal(s.entries.length,0);
});
test('calendar avoids duplicate planned rows and shows a confirmed financial event only once',()=>{
  const s=emptyState();s.accounts=[{id:'a',name:'Conta',kind:'bank',scope:'personal',openingBalanceCents:10000,openingDate:'2026-10-01'}];
  s.entries=[{id:'e',type:'expense',description:'Luz',status:'planned',amountCents:2000,date:'2026-10-12',accountId:'a',paymentMethod:'pix',category:'Moradia',occurrenceKey:'recurrence:r:2026-10'}];
  const forecast={id:'recurrence:r:2026-10',date:'2026-10-12',title:'Luz'};
  assert.equal(buildCalendarItems(s,'2026-10-12','2026-10-12',[forecast]).length,1);
  s.entries[0].status='posted';const rows=buildCalendarItems(s,'2026-10-12','2026-10-12');assert.equal(rows.length,1);assert.equal(rows[0].source,'transaction');assert.equal(accountBalance(s,'a','2026-10-12'),8000);
});
test('the calendar adapter joins financial forecasts, birthdays and saved appointments',()=>{
  const integration=createFinanceIntegration({createElement:()=>null},null,null),s=emptyState(),date=today();
  upsertAppointment(s,event({date}));s.birthdays=[{id:'b',name:'Amiga',date:'1990'+date.slice(4),active:true}];
  const rows=integration.calendarItems(s,date,date,date);assert.deepEqual(rows.map(e=>e.source).sort(),['appointment','birthday']);
  assert.ok(rows.every(e=>e.date===date));assert.equal(rows.find(e=>e.source==='birthday').time,'');
});
