import {today,invoices,cardBank,accountBalance,addMonths,firstInvoiceDate,splitAmount} from './finance.mjs';

// A purchase appears once at its full value. Its installment schedule is detail,
// not extra purchases. Prior invoice balances retain their known due dates;
// the original merchant/date/category cannot be reconstructed from a total.
export function cardStatement(state,cardId,asOf=today()) {
  const card=state.cards.find(c=>c.id===cardId);
  if(!card)return {rows:[],purchaseCents:0,openingCents:0,paymentCents:0};
  const rows=[];
  if(card.openingDebtCents>0)rows.push({id:`opening:${card.id}`,kind:'opening',date:card.openingDueDate,dateKind:'due',description:'Fatura anterior ao início do controle',amountCents:card.openingDebtCents});
  for(const initial of card.openingInvoices||[])rows.push({id:`opening:${initial.id}`,kind:'opening',date:initial.date,dateKind:'due',description:initial.description,amountCents:initial.amountCents});
  for(const entry of state.entries.filter(e=>e.cardId===cardId&&e.status==='posted'&&e.date<=asOf)) {
    if(entry.type==='expense') {
      const count=entry.installments||1;
      const schedule=entry.paymentMethod==='credit'?splitAmount(entry.amountCents,count).map((amountCents,index)=>({number:index+1,count,amountCents,date:addMonths(firstInvoiceDate(card,entry.date),index,card.dueDay)})):[];
      rows.push({...entry,id:`entry:${entry.id}`,kind:'purchase',dateKind:'purchase',schedule});
    }else if(entry.type==='card_payment')rows.push({...entry,id:`entry:${entry.id}`,kind:'payment',dateKind:'payment'});
  }
  rows.sort((a,b)=>{
    const futureA=a.dateKind==='due'&&a.date>asOf,futureB=b.dateKind==='due'&&b.date>asOf;
    if(futureA!==futureB)return futureA?1:-1;
    return (futureA?a.date.localeCompare(b.date):b.date.localeCompare(a.date))||a.id.localeCompare(b.id);
  });
  const total=kind=>rows.filter(r=>r.kind===kind).reduce((v,r)=>v+r.amountCents,0);
  return {rows,purchaseCents:total('purchase'),openingCents:total('opening'),paymentCents:total('payment')};
}

export function updateCardLimit(state,cardId,limitCents) {
  if(limitCents!==null&&(!Number.isSafeInteger(limitCents)||limitCents<0||limitCents>1e12))throw new Error('Informe um limite positivo ou zero, com até duas casas decimais.');
  const card=state.cards.find(c=>c.id===cardId);
  if(!card)throw new Error('Cartão não encontrado. Atualize o financeiro.');
  card.creditLimitCents=limitCents;
}

// Only fill fields never configured before. Explicit null/zero and existing
// limits survive deploys; invoice amounts and the ledger are never changed.
export function initializeCardLimits(state,seedState) {
  let changed=0;
  for(const card of state.cards) {
    if(Object.hasOwn(card,'creditLimitCents'))continue;
    const configured=seedState?.cards?.find(c=>c.id===card.id);
    if(!configured||!Number.isSafeInteger(configured.creditLimitCents)||configured.creditLimitCents<0||configured.creditLimitCents>1e12)continue;
    updateCardLimit(state,card.id,configured.creditLimitCents);changed++;
  }
  return changed;
}

export function cardStatistics(state,month,asOf=today()) {
  const all=invoices(state,asOf);
  const cards=state.cards.map(card=>{
    const rows=all.filter(i=>i.cardId===card.id),open=rows.filter(i=>i.remainingCents>0);
    const selected=rows.filter(i=>i.date.startsWith(month));
    const usedCents=open.reduce((v,i)=>v+i.remainingCents,0);
    const limitCents=Number.isSafeInteger(card.creditLimitCents)&&card.creditLimitCents>=0?card.creditLimitCents:null;
    return {card,id:card.id,name:card.name,bank:cardBank(state,card),invoices:rows,selected,open,
      nextInvoice:open[0]||null,usedCents,limitCents,
      availableCents:limitCents===null?null:Math.max(0,limitCents-usedCents),
      overLimitCents:limitCents===null?0:Math.max(0,usedCents-limitCents),
      usedPercent:limitCents===null||limitCents===0?null:usedCents/limitCents*100,
      selectedTotalCents:selected.reduce((v,i)=>v+i.totalCents,0),
      selectedPaidCents:selected.reduce((v,i)=>v+i.paidCents,0),
      selectedPendingCents:selected.reduce((v,i)=>v+Math.max(0,i.remainingCents),0),
      futureCents:open.filter(i=>i.date.slice(0,7)>month).reduce((v,i)=>v+i.remainingCents,0)};
  });
  const configured=cards.filter(c=>c.limitCents!==null);
  const timeline=Array.from({length:6},(_,n)=>{
    const key=addMonths(month+'-01',n).slice(0,7),rows=all.filter(i=>i.date.startsWith(key));
    return {month:key,totalCents:rows.reduce((v,i)=>v+i.totalCents,0),paidCents:rows.reduce((v,i)=>v+i.paidCents,0),
      pendingCents:rows.reduce((v,i)=>v+Math.max(0,i.remainingCents),0),
      byCard:cards.map(c=>({id:c.id,name:c.name,amountCents:rows.filter(i=>i.cardId===c.id).reduce((v,i)=>v+Math.max(0,i.remainingCents),0)}))};
  });
  const overdrafts=state.accounts.filter(a=>a.kind==='bank'&&(a.overdraftLimitCents!=null||accountBalance(state,a.id,asOf)<0)).map(account=>{
    const usedCents=Math.max(0,-accountBalance(state,account.id,asOf));
    const limitCents=Number.isSafeInteger(account.overdraftLimitCents)&&account.overdraftLimitCents>=0?account.overdraftLimitCents:null;
    return {account,usedCents,limitCents,availableCents:limitCents===null?null:Math.max(0,limitCents-usedCents)};
  });
  return {cards,timeline,overdrafts,configuredCount:configured.length,missingCount:cards.length-configured.length,
    limitCents:configured.reduce((v,c)=>v+c.limitCents,0),
    availableCents:configured.length?configured.reduce((v,c)=>v+c.availableCents,0):null,
    usedCents:cards.reduce((v,c)=>v+c.usedCents,0),
    selectedPendingCents:cards.reduce((v,c)=>v+c.selectedPendingCents,0),
    selectedPaidCents:cards.reduce((v,c)=>v+c.selectedPaidCents,0)};
}
