import {today,uid,validDate,addMonths,money,METHODS} from './finance.mjs';

export const APPOINTMENT_KINDS={personal:'Pessoal',work:'Trabalho',health:'Saúde',other:'Outro'};
export const REPEATS={none:'Não repetir',weekly:'Toda semana',monthly:'Todo mês'};
export const appointmentsOf=s=>Array.isArray(s?.appointments)?s.appointments:[];
const requireValue=(condition,message)=>{if(!condition)throw new Error(message);};
const text=(value,max)=>typeof value==='string'&&value.length<=max;

export function validateAppointments(s,reservedIds=new Set()) {
  if(s.appointments===undefined)return;
  requireValue(Array.isArray(s.appointments)&&s.appointments.length<=10000,'Lista de compromissos inválida.');
  for(const item of s.appointments){
    requireValue(item&&typeof item==='object','Compromisso inválido.');
    requireValue(text(item.id,160)&&item.id.trim()&&!reservedIds.has(item.id),'Identificador de compromisso inválido ou repetido.');
    reservedIds.add(item.id);
    requireValue(text(item.title,160)&&item.title.trim(),'Informe um título para o compromisso.');
    requireValue(validDate(item.date),'Data do compromisso inválida.');
    requireValue(item.time===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time),'Horário do compromisso inválido.');
    requireValue(text(item.location,240)&&text(item.notes,2000),'Local ou observações do compromisso inválidos.');
    requireValue(Object.hasOwn(APPOINTMENT_KINDS,item.kind)&&Object.hasOwn(REPEATS,item.repeat),'Tipo ou repetição do compromisso inválidos.');
    requireValue(item.endDate===null||(validDate(item.endDate)&&item.endDate>=item.date),'A última data deve ser a partir do início do compromisso.');
    requireValue(typeof item.archived==='boolean','Status do compromisso inválido.');
    requireValue(Array.isArray(item.completedDates)&&item.completedDates.length<=10000&&item.completedDates.every(validDate)&&new Set(item.completedDates).size===item.completedDates.length,'Datas de conclusão inválidas.');
  }
}

export function upsertAppointment(s,data) {
  const index=appointmentsOf(s).findIndex(a=>a.id===data.id),old=index>=0?s.appointments[index]:null;
  const item={...old,id:old?.id||uid(),title:data.title.trim(),date:data.date,time:data.time||'',location:(data.location||'').trim(),notes:(data.notes||'').trim(),kind:data.kind||'personal',repeat:data.repeat||'none',endDate:data.repeat&&data.repeat!=='none'?data.endDate||null:null,archived:old?.archived||false,completedDates:old?.completedDates||[]};
  validateAppointments({appointments:[item]});
  if(!s.appointments)s.appointments=[];
  if(index<0)s.appointments.push(item);else s.appointments[index]=item;
  return item;
}
export function archiveAppointment(s,id,archived=true) {
  const item=appointmentsOf(s).find(a=>a.id===id);
  requireValue(!!item,'Compromisso não encontrado.');item.archived=archived;
}
export function toggleAppointment(s,id,date) {
  const item=appointmentsOf(s).find(a=>a.id===id);
  requireValue(item&&!item.archived&&appointmentOccurrences({appointments:[item]},date,date).length,'Ocorrência do compromisso não encontrada.');
  const index=item.completedDates.indexOf(date);
  if(index<0)item.completedDates.push(date);else item.completedDates.splice(index,1);
}

// Calendar arithmetic uses UTC only as a date counter, never as an event timezone.
export function shiftDays(date,days) {
  const dt=new Date(date+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()+days);
  return dt.toISOString().slice(0,10);
}
export function weekStart(date) {
  return shiftDays(date,-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7));
}
export function calendarDays(date,view='week') {
  const start=weekStart(view==='month'?date.slice(0,7)+'-01':date);
  return Array.from({length:view==='month'?42:7},(_,i)=>shiftDays(start,i));
}
export function monthRange(date) {
  const start=date.slice(0,7)+'-01';
  return {start,end:shiftDays(addMonths(start,1),-1)};
}
export function navigateCalendar(date,view,direction) {
  const next=view==='week'?shiftDays(date,7*direction):addMonths(date,direction);
  return validDate(next)?next:date;
}
export function appointmentOccurrences(s,start,end) {
  requireValue(validDate(start)&&validDate(end)&&end>=start,'Período da agenda inválido.');
  const rows=[];
  for(const item of appointmentsOf(s)){
    if(item.archived||item.date>end||item.endDate&&item.endDate<start)continue;
    let date=item.date;
    if(item.repeat==='weekly'){
      const difference=Math.max(0,(Date.parse(start+'T00:00:00Z')-Date.parse(date+'T00:00:00Z'))/86400000);
      date=shiftDays(date,Math.ceil(difference/7)*7);
    }
    let monthOffset=0;
    if(item.repeat==='monthly'){
      monthOffset=Math.max(0,(Number(start.slice(0,4))-Number(date.slice(0,4)))*12+Number(start.slice(5,7))-Number(date.slice(5,7)));
      date=addMonths(item.date,monthOffset);
    }
    for(let count=0;count<10000&&date<=end&&(!item.endDate||date<=item.endDate);count++){
      if(date>=start)rows.push({...item,id:`appointment:${item.id}:${date}`,appointmentId:item.id,date,source:'appointment',completed:item.completedDates.includes(date)});
      if(item.repeat==='none')break;
      // Always clamp from the original day, so Jan 31 → Feb 28 → Mar 31.
      date=item.repeat==='monthly'?addMonths(item.date,++monthOffset):shiftDays(date,7);
    }
  }
  return rows.sort(sortCalendarItems);
}
export function sortCalendarItems(a,b) {
  return a.date.localeCompare(b.date)||(a.time||'00:00').localeCompare(b.time||'00:00')||a.title.localeCompare(b.title,'pt-BR');
}
export function filterCalendarItems(items,filter='all',showCompleted=false) {
  return items.filter(item=>(showCompleted||!item.completed)&&(filter==='all'||filter==='appointments'&&item.source==='appointment'||filter==='finance'&&['financial','transaction'].includes(item.source)||filter==='birthdays'&&item.source==='birthday')).sort(sortCalendarItems);
}

export function dateToISO(date) {
  if(typeof date==='string')return date.slice(0,10);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function buildCalendarItems(s,start,end,forecasts=[]) {
  const rows=appointmentOccurrences(s,start,end),forecastKeys=new Set(forecasts.map(f=>f.id));
  for(const item of forecasts){
    const date=item.isoDate||dateToISO(item.date);
    if(date<start||date>end)continue;
    rows.push({...item,date,time:'',source:item.type==='birthday'?'birthday':'financial',completed:false});
  }
  for(const entry of s.entries){
    if(entry.date<start||entry.date>end||entry.status==='planned'&&forecastKeys.has(entry.occurrenceKey))continue;
    const planned=entry.status==='planned';
    rows.push({id:`entry:${entry.id}`,entryId:entry.id,date:entry.date,time:'',title:entry.description,description:[entry.category||({income:'Recebimento',expense:'Despesa',transfer:'Transferência',card_payment:'Fatura paga'})[entry.type],METHODS[entry.paymentMethod]].filter(Boolean).join(' · '),source:planned?'financial':'transaction',type:entry.type,completed:false,amountCents:entry.amountCents,financialDirection:entry.type==='income'?'income':'expense',section:planned?'commitments':'history'});
  }
  return rows.sort(sortCalendarItems);
}

export function localDateLabel(date,options={}) {
  return new Date(date+'T12:00:00').toLocaleDateString('pt-BR',options);
}
export function dayLabel(date,asOf=today()) {
  if(date===asOf)return 'Hoje';
  if(date===shiftDays(asOf,1))return 'Amanhã';
  return localDateLabel(date,{weekday:'long',day:'numeric',month:'short'});
}
