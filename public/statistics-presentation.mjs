import {cents} from './finance.mjs';

export const categoryColors=['#4ADE80','#22C55E','#0E3A20','#166534','#86EFAC','#2E8B57','#A3D9A5'];

// The original chart stacks its segments. Scale the combined value, rather
// than each segment separately, so a large income and expense fit together.
export function animatedBuckets(data) {
  const max=Math.max(1,...data.buckets.map(b=>b.incomeCents+b.expenseCents));
  return data.buckets.map(b=>({...b,h1:`${b.incomeCents/max*85}%`,h2:`${b.expenseCents/max*85}%`,h3:'0%'}));
}

export function filterStatisticsRows(rows,{query='',start='',end='',min='',max='',method='all'}={}) {
  const amount=value=>{try{return String(value).trim()?cents(value):null;}catch{return NaN;}};
  const minimum=amount(min),maximum=amount(max),search=query.trim().toLocaleLowerCase('pt-BR');
  return rows.filter(row=>(!search||row.description.toLocaleLowerCase('pt-BR').includes(search)||
    (row.amountCents/100).toFixed(2).replace('.',',').includes(search)||
    (row.amountCents/100).toLocaleString('pt-BR',{minimumFractionDigits:2}).includes(search))&&
    (!start||row.date>=start)&&(!end||row.date<=end)&&
    (minimum===null||row.amountCents>=minimum)&&(maximum===null||row.amountCents<=maximum)&&
    (method==='all'||row.paymentMethod===method));
}
