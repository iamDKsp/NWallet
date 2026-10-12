import {today,uid,addMonths,plansOf,ensurePlans,accountBalance,summary,SCOPES} from './finance.mjs';

export const monthNow = () => today().slice(0,7);
export const dueDate = (month,day) => addMonths(month+'-01',0,day);
const inPeriod = (month,start,end) => month>=start&&(!end||month<=end);
export function debtSchedule(s,debt) {
  const paid=new Set(s.entries.filter(e=>e.debtId===debt.id&&e.status==='posted').map(e=>e.occurrenceKey));
  for(const run of plansOf(s).payrollRuns)if(run.deductions.some(d=>d.debtId===debt.id))paid.add(`debt:${debt.id}:${run.month}`);
  return Array.from({length:debt.installments},(_,i)=>{
    const date=addMonths(debt.firstDueDate,i),month=date.slice(0,7),key=`debt:${debt.id}:${month}`;
    return {key,date,month,amountCents:debt.installmentCents,paid:paid.has(key),number:i+1};
  });
}
export function payrollPreview(s,payroll,month,baseCents=payroll.baseCents) {
  const deductions=payroll.deductions.filter(d=>d.active&&inPeriod(month,d.startMonth,d.endMonth)).map(d=>({name:d.name,kind:d.kind,amountCents:d.mode==='fixed'?d.amountCents:Number((BigInt(baseCents)*BigInt(d.rateBps)+5000n)/10000n)})).filter(d=>d.amountCents>0);
  for(const debt of plansOf(s).debts.filter(d=>d.kind==='payroll_loan'&&d.payrollId===payroll.id)){
    const installment=debtSchedule(s,debt).find(i=>i.month===month);
    if(installment)deductions.push({name:debt.name,kind:'payroll_loan',debtId:debt.id,amountCents:debt.installmentCents});
  }
  const deductionCents=deductions.reduce((v,d)=>v+d.amountCents,0);
  return {baseCents,deductions,deductionCents,netCents:baseCents-deductionCents,date:dueDate(month,payroll.payDay)};
}
export function receivePayroll(s,payrollId,month,date,baseCents) {
  const p=ensurePlans(s),pay=p.payrolls.find(x=>x.id===payrollId);
  if(!pay)throw new Error('Folha não encontrada.');
  if(p.payrollRuns.some(r=>r.payrollId===payrollId&&r.month===month))throw new Error('Este salário já foi recebido nesta competência.');
  if(!inPeriod(month,pay.startMonth))throw new Error('A competência é anterior ao início da folha.');
  const actualBase=baseCents??pay.baseCents;
  if(!Number.isSafeInteger(actualBase)||actualBase<=0)throw new Error('Informe um salário positivo para confirmar este recebimento.');
  const preview=payrollPreview(s,pay,month,actualBase);
  if(preview.netCents<=0)throw new Error('Os descontos precisam ser menores que o salário informado. Confira a folha.');
  const entryId=uid(),runId=uid();
  s.entries.push({id:entryId,type:'income',description:`Salário · ${pay.name.slice(0,120)} · ${month}`,amountCents:preview.netCents,date,status:'posted',accountId:pay.accountId,paymentMethod:'transfer',source:'clt',payrollRunId:runId,occurrenceKey:`payroll:${pay.id}:${month}`});
  p.payrollRuns.push({id:runId,payrollId,accountId:pay.accountId,month,date,baseCents:preview.baseCents,netCents:preview.netCents,deductions:preview.deductions,entryId});
}
export function obligations(s,month) {
  const p=plansOf(s),list=[];
  for(const pay of p.payrolls){
    if(!pay.active||month<pay.startMonth)continue;
    const run=p.payrollRuns.find(r=>r.payrollId===pay.id&&r.month===month),preview=run?{baseCents:run.baseCents,deductions:run.deductions,netCents:run.netCents,date:dueDate(month,pay.payDay)}:payrollPreview(s,pay,month);
    list.push({key:`payroll:${pay.id}:${month}`,kind:'payroll',id:pay.id,name:`Salário · ${pay.name}`,type:'income',date:preview.date,amountCents:preview.netCents,paid:!!run,payroll:preview,scope:'personal'});
  }
  for(const debt of p.debts){
    const item=debtSchedule(s,debt).find(i=>i.month===month);if(!item)continue;
    const pay=p.payrolls.find(x=>x.id===debt.payrollId),account=s.accounts.find(x=>x.id===debt.accountId);
    list.push({...item,kind:'debt',id:debt.id,name:debt.name,type:'expense',scope:pay?'personal':account?.scope,viaPayroll:debt.kind==='payroll_loan',category:debt.kind==='financing'?'Financiamento':'Empréstimos'});
  }
  for(const r of p.recurrences){
    const key=`recurrence:${r.id}:${month}`,entry=s.entries.find(e=>e.occurrenceKey===key);
    if(!entry&&(!r.active||!inPeriod(month,r.startMonth,r.endMonth)))continue;
    list.push({key,kind:'recurrence',id:r.id,name:r.name,type:r.type,date:dueDate(month,r.day),amountCents:entry?.amountCents||r.amountCents||null,variable:r.amountMode==='variable',paid:entry?.status==='posted',scope:s.accounts.find(a=>a.id===r.accountId)?.scope,category:r.category});
  }
  return list.sort((a,b)=>a.date.localeCompare(b.date));
}
export function settleObligation(s,key,month,date,value) {
  const item=obligations(s,month).find(i=>i.key===key);
  if(!item||item.paid)throw new Error('Compromisso não encontrado ou já confirmado.');
  if(item.viaPayroll)throw new Error('Confirme o recebimento do salário; o consignado será baixado junto com a folha.');
  if(item.kind==='payroll'){receivePayroll(s,item.id,month,date,value);return;}
  const p=plansOf(s),debt=p.debts.find(d=>d.id===item.id),r=p.recurrences.find(r=>r.id===item.id),amountCents=item.kind==='debt'?debt.installmentCents:value;
  if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw new Error('Informe o valor que foi pago ou recebido.');
  const entry={id:uid(),description:item.name,type:item.type,amountCents,date,status:'posted',accountId:debt?.accountId||r.accountId,paymentMethod:r?.paymentMethod||'boleto',category:item.category,source:r?.source,occurrenceKey:key};
  if(debt)entry.debtId=debt.id;else entry.recurrenceId=r.id;
  s.entries.push(entry);
}
export function businessSummary(s,month) {
  const accounts=s.accounts.filter(a=>a.scope==='business'),ids=new Set(accounts.map(a=>a.id)),personal=new Set(s.accounts.filter(a=>a.scope==='personal').map(a=>a.id));
  const entries=s.entries.filter(e=>e.status==='posted'&&e.date<=today()&&e.date.startsWith(month));
  const withdrawals=entries.filter(e=>e.type==='transfer'&&ids.has(e.accountId)&&personal.has(e.toAccountId)).reduce((v,e)=>v+e.amountCents,0);
  const contributions=entries.filter(e=>e.type==='transfer'&&personal.has(e.accountId)&&ids.has(e.toAccountId)).reduce((v,e)=>v+e.amountCents,0);
  const actual=summary(s,month,'business');
  return {...actual,withdrawalsCents:withdrawals,contributionsCents:contributions,accounts};
}
export function commitmentSummary(s,month) {
  const items=obligations(s,month).filter(i=>!i.paid&&!i.viaPayroll);
  return {incomeCents:items.filter(i=>i.type==='income').reduce((v,i)=>v+Math.max(0,i.amountCents||0),0),expenseCents:items.filter(i=>i.type==='expense').reduce((v,i)=>v+(i.amountCents||0),0),unknown:items.filter(i=>!i.amountCents).length};
}
export function removePostedEntry(s,id) {
  const p=ensurePlans(s),run=p.payrollRuns.find(r=>r.entryId===id);
  if(run)p.payrollRuns=p.payrollRuns.filter(r=>r.id!==run.id);
  s.entries=s.entries.filter(e=>e.id!==id);
}
