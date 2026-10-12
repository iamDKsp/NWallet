import {today,addMonths,invoices,plansOf} from './finance.mjs';
import {debtSchedule,dueDate} from './planning.mjs';
import {birthdayAlerts,formatBirthdayNotification} from './birthdays.mjs';

export const defaultReminderSettings=()=>({enabled:true,time:'09:00',beforeDays:[3,1],onDue:true,overdue:true});
export function validateReminderSettings(value) {
  if(!value||typeof value.enabled!=='boolean'||typeof value.onDue!=='boolean'||typeof value.overdue!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)||!Array.isArray(value.beforeDays)||value.beforeDays.length>3||value.beforeDays.some(n=>![1,3,7].includes(n)))throw new Error('Configuração de lembretes inválida.');
  return {enabled:value.enabled,time:value.time,beforeDays:[...new Set(value.beforeDays)].sort((a,b)=>b-a),onDue:value.onDue,overdue:value.overdue};
}
const dayNumber=date=>Date.parse(date+'T00:00:00Z')/86400000;
export function payableReminders(s,asOf=today(),horizon=7) {
  const p=plansOf(s),items=new Map();
  function add(item){const days=dayNumber(item.date)-dayNumber(asOf);if(days>horizon)return;items.set(item.key,{...item,days,status:days<0?'overdue':days===0?'today':'upcoming'});}
  for(const debt of p.debts)if(debt.kind!=='payroll_loan')for(const i of debtSchedule(s,debt))if(!i.paid)add({...i,kind:'debt',name:debt.name,scope:s.accounts.find(a=>a.id===debt.accountId)?.scope});
  for(const r of p.recurrences) {
    if(r.type!=='expense'||!r.active)continue;
    const endMonth=new Date((dayNumber(asOf)+horizon)*86400000).toISOString().slice(0,7);
    for(let month=r.startMonth;month<=endMonth&&(!r.endMonth||month<=r.endMonth);month=addMonths(month+'-01',1).slice(0,7)){
      const key=`recurrence:${r.id}:${month}`;
      const entry=s.entries.find(e=>e.occurrenceKey===key);
      if(entry?.status==='posted')continue;
      add({key,kind:'recurrence',name:r.name,date:dueDate(month,r.day),amountCents:entry?.amountCents||r.amountCents||null,variable:r.amountMode==='variable',scope:s.accounts.find(a=>a.id===r.accountId)?.scope});
    }
  }
  for(const e of s.entries)if(e.type==='expense'&&e.status==='planned')add({key:e.occurrenceKey||`entry:${e.id}`,kind:'entry',name:e.description,date:e.date,amountCents:e.amountCents,scope:s.accounts.find(a=>a.id===e.accountId)?.scope});
  for(const i of invoices(s,asOf))if(i.remainingCents>0)add({key:`invoice:${i.key}`,kind:'invoice',name:`Fatura · ${i.name}`,date:i.date,amountCents:i.remainingCents,scope:i.scope});
  return [...items.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
export function dailyReminder(s,settings=defaultReminderSettings(),asOf=today()) {
  if(!settings.enabled)return null;
  const items=payableReminders(s,asOf).filter(i=>i.days<0?settings.overdue:i.days===0?settings.onDue:settings.beforeDays.includes(i.days));
  const bAlerts=birthdayAlerts(s,asOf);
  if(!items.length && !bAlerts.length)return null;

  const bNotification=formatBirthdayNotification(bAlerts);

  // Se houver apenas alertas de aniversário
  if(!items.length && bNotification){
    return {title:bNotification.title,body:bNotification.body,tag:`nwallet-birthday-${asOf}`,url:'/?view=birthdays',count:bNotification.count};
  }

  const late=items.filter(i=>i.days<0).length,due=items.filter(i=>i.days===0).length,next=items.length-late-due;
  const finBody=[late&&`${late} conta(s) em atraso`,due&&`${due} vencendo hoje`,next&&`${next} próxima(s) do vencimento`].filter(Boolean).join(' · ');

  // Se houver apenas lembretes financeiros
  if(!bNotification){
    return {title:'NWallet · Lembrete financeiro',body:finBody+'. Abra sua carteira para conferir.',tag:`nwallet-daily-${asOf}`,url:'/?view=notifications',count:items.length};
  }

  // Se houver ambos (aniversário + financeiro)
  const combinedTitle=bAlerts.some(a=>a.isToday)?'NWallet · Aniversário & Lembretes 🎉':'NWallet · Lembretes do Dia 🎂';
  const combinedBody=`${bNotification.body} · ${finBody}.`;
  return {title:combinedTitle,body:combinedBody,tag:`nwallet-daily-${asOf}`,url:'/?view=birthdays',count:items.length+bAlerts.length};
}
export function saoPauloClock(now=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
}
