import {today,summary,invoices,entryScope} from './finance.mjs';
import {commitmentSummary,obligations} from './planning.mjs';

// Cash payments and purchase expenses answer different questions. Invoice
// payments belong in cash projections, but never create another expense.
export function cashProjection(state,month,asOf=today()) {
  const actual=summary(state,month,'all',asOf),commitments=commitmentSummary(state,month);
  const paidCents=state.entries.filter(e=>e.status==='posted'&&e.date<=asOf&&e.date.startsWith(month)&&
    (e.type==='card_payment'||(e.type==='expense'&&e.paymentMethod!=='credit'))).reduce((v,e)=>v+e.amountCents,0);
  const invoiceCents=invoices(state,asOf).filter(i=>i.date.startsWith(month)).reduce((v,i)=>v+Math.max(0,i.remainingCents),0);
  const pending=pendingPayments(state,month,'all',asOf),pendingCents=pending.reduce((v,i)=>v+(i.amountCents||0),0);
  return {paidCents,pendingCents,invoiceCents,commitmentCents:commitments.expenseCents,
    receivableCents:actual.receivableCents+commitments.incomeCents,
    totalCents:paidCents+pendingCents,unknown:pending.filter(i=>!i.amountCents).length};
}

export function pendingPayments(state,month,scope='all',asOf=today()) {
  const items=obligations(state,month),keys=new Set(items.map(i=>i.key));
  return [
    ...items.filter(i=>i.type==='expense'&&!i.paid&&!i.viaPayroll).map(i=>({...i,description:i.name,source:'Compromisso'})),
    ...invoices(state,asOf).filter(i=>i.date.startsWith(month)&&i.remainingCents>0).map(i=>({...i,amountCents:i.remainingCents,description:'Fatura · '+i.name,source:'Fatura'})),
    ...state.entries.filter(e=>e.status==='planned'&&e.type==='expense'&&e.date.startsWith(month)&&!keys.has(e.occurrenceKey)).map(e=>({...e,key:e.id,scope:entryScope(state,e),source:'Lançamento previsto'}))
  ].filter(i=>scope==='all'||i.scope===scope).sort((a,b)=>a.date.localeCompare(b.date));
}

export function statisticsData(state,month,period='month',asOf=today()) {
  const date=asOf.startsWith(month)?asOf:month+'-'+String(new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate());
  let start=month+'-01',end=date,buckets;
  if(period==='year') {
    start=month.slice(0,4)+'-01-01';end=month.slice(0,4)+'-12-31';
    buckets=Array.from({length:12},(_,i)=>({key:month.slice(0,4)+'-'+String(i+1).padStart(2,'0'),label:new Date(2000,i,1).toLocaleDateString('pt-BR',{month:'short'}),incomeCents:0,expenseCents:0}));
  } else if(period==='week') {
    const anchor=new Date(date+'T12:00:00');anchor.setDate(anchor.getDate()-6);
    buckets=Array.from({length:7},(_,i)=>{const d=new Date(anchor);d.setDate(d.getDate()+i);return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,label:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),incomeCents:0,expenseCents:0};});
    start=buckets[0].key;
  } else {
    buckets=Array.from({length:Math.ceil(Number(end.slice(-2))/7)},(_,i)=>({key:i,label:`${i*7+1}–${Math.min((i+1)*7,Number(end.slice(-2)))}`,incomeCents:0,expenseCents:0}));
  }
  const rows=state.entries.filter(e=>e.status==='posted'&&e.date<=asOf&&e.date>=start&&e.date<=end&&(e.type==='income'||e.type==='expense'));
  for(const e of rows) {
    const b=period==='year'?buckets[Number(e.date.slice(5,7))-1]:period==='week'?buckets.find(b=>b.key===e.date):buckets[Math.floor((Number(e.date.slice(-2))-1)/7)];
    if(b)b[e.type==='income'?'incomeCents':'expenseCents']+=e.amountCents;
  }
  const categories=new Map();
  for(const e of rows.filter(e=>e.type==='expense'))categories.set(e.category||'Outros',(categories.get(e.category||'Outros')||0)+e.amountCents);
  return {start,end,rows:rows.slice().sort((a,b)=>b.date.localeCompare(a.date)),buckets,
    incomeCents:rows.filter(e=>e.type==='income').reduce((v,e)=>v+e.amountCents,0),
    expenseCents:rows.filter(e=>e.type==='expense').reduce((v,e)=>v+e.amountCents,0),
    categories:[...categories].map(([name,amountCents])=>({name,amountCents})).sort((a,b)=>b.amountCents-a.amountCents)};
}

export function monthLabel(month) {
  return new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
}
