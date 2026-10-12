import {today,invoices,cardBank,accountBalance,addMonths} from './finance.mjs';

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
