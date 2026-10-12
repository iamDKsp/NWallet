// Values are integer centavos. Dates are local ISO calendar dates, never UTC timestamps.
export const SCOPES = { personal: 'Pessoal', business: 'Empresa' };
export const METHODS = { pix: 'Pix', debit: 'Débito', cash: 'Dinheiro', boleto: 'Boleto', transfer: 'Transferência', credit: 'Crédito' };
export const SOURCES = { clt: 'CLT', company: 'Empresa', other: 'Outros' };
export const CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Assinaturas', 'Impostos', 'Empresa', 'Empréstimos', 'Financiamento', 'Pensão', 'Outros'];
export const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function uid() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  // getRandomValues also works on a phone opening a private LAN address over HTTP.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function cents(value) {
  const s = String(value).trim().replace(/R\$\s*/g, '');
  if (!s || !/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(s)) throw new Error('Use um valor como 125,90.');
  const [whole, decimal=''] = s.replace(/\./g,'').split(',');
  const result = Number(whole) * 100 + (s.startsWith('-') ? -1 : 1) * Number(decimal.padEnd(2,'0'));
  if (!Number.isSafeInteger(result) || Math.abs(result) > 1e12) throw new Error('Valor fora do limite permitido.');
  return result;
}
export const inputMoney = value => (value / 100).toFixed(2).replace('.', ',');
export function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,d] = s.split('-').map(Number), dt = new Date(y,m-1,d);
  return y >= 2000 && y <= 2200 && dt.getFullYear() === y && dt.getMonth() === m-1 && dt.getDate() === d;
}
export function addMonths(date, n, day) {
  const [y,m,d] = date.split('-').map(Number), dt = new Date(y,m-1+n,1);
  const last = new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(Math.min(day ?? d,last)).padStart(2,'0')}`;
}
export function splitAmount(amount, count) {
  const base = Math.floor(amount/count), remainder = amount % count;
  return Array.from({length:count},(_,i)=>base+(i<remainder?1:0));
}
export const emptyState = () => ({ schemaVersion: 1, accounts: [], cards: [], entries: [] });
function assert(ok, message) { if (!ok) throw new Error(message); }
const shortText = s => typeof s === 'string' && s.trim().length > 0 && s.length <= 160;
const amount = n => Number.isSafeInteger(n) && n > 0 && n <= 1e12;
const signedAmount = n => Number.isSafeInteger(n) && Math.abs(n) <= 1e12;
export function validateState(s) {
  assert(s && s.schemaVersion === 1, 'Formato de dados incompatível.');
  for (const key of ['accounts','cards','entries']) assert(Array.isArray(s[key]) && s[key].length <= 20000, 'Lista de dados inválida.');
  const ids = new Set();
  for (const c of s.cards) assert(!c.openingInvoices || (Array.isArray(c.openingInvoices) && c.openingInvoices.length <= 3600), 'Faturas anteriores inválidas.');
  for (const item of [...s.accounts,...s.cards,...s.cards.flatMap(c=>c.openingInvoices||[]),...s.entries]) {
    assert(shortText(item.id) && !ids.has(item.id), 'Identificador inválido ou repetido.'); ids.add(item.id);
  }
  for (const a of s.accounts) {
    assert(shortText(a.name) && Object.hasOwn(SCOPES,a.scope) && ['bank','cash'].includes(a.kind), 'Conta inválida.');
    assert(signedAmount(a.openingBalanceCents) && validDate(a.openingDate), 'Saldo ou data inicial inválida.');
  }
  for (const c of s.cards) {
    assert(shortText(c.name) && Object.hasOwn(SCOPES,c.scope), 'Cartão inválido.');
    assert(Number.isInteger(c.closingDay) && c.closingDay >= 1 && c.closingDay <= 31 && Number.isInteger(c.dueDay) && c.dueDay >= 1 && c.dueDay <= 31, 'Datas do cartão inválidas.');
    assert(signedAmount(c.openingDebtCents) && c.openingDebtCents >= 0 && validDate(c.openingDueDate), 'Fatura inicial inválida.');
    for (const i of c.openingInvoices||[]) assert(amount(i.amountCents) && validDate(i.date) && shortText(i.description), 'Fatura anterior inválida.');
  }
  for (const e of s.entries) {
    assert(['income','expense','transfer','card_payment'].includes(e.type) && ['posted','planned'].includes(e.status), 'Tipo de lançamento inválido.');
    assert(shortText(e.description) && amount(e.amountCents) && validDate(e.date) && Object.hasOwn(METHODS,e.paymentMethod), 'Lançamento inválido.');
    assert(!e.groupId || shortText(e.groupId), 'Grupo inválido.');
    assert(!e.commitmentKind || ['bill','loan'].includes(e.commitmentKind), 'Compromisso inválido.');
    const account = s.accounts.find(a=>a.id === e.accountId), card = s.cards.find(c=>c.id === e.cardId);
    const credit = e.type === 'expense' && e.paymentMethod === 'credit';
    assert(credit ? !!card && !e.accountId : !!account, 'Selecione uma conta ou cartão existente.');
    if (account && e.status === 'posted') assert(e.date >= account.openingDate, 'O lançamento deve ser a partir da data do saldo inicial da conta.');
    if (e.type === 'transfer') {
      const destination = s.accounts.find(a=>a.id === e.toAccountId);
      assert(destination && destination.id !== account.id && e.paymentMethod === 'transfer', 'Selecione duas contas diferentes.');
      if (e.status === 'posted') assert(e.date >= destination.openingDate, 'A transferência deve ser a partir do saldo inicial das duas contas.');
    }
    if (e.type === 'income') assert(Object.hasOwn(SOURCES,e.source) && e.paymentMethod !== 'credit', 'Informe a origem do recebimento.');
    if (e.type === 'expense') assert(CATEGORIES.includes(e.category), 'Categoria inválida.');
    if (credit) assert(e.status === 'posted' && Number.isInteger(e.installments) && e.installments >= 1 && e.installments <= 360 && e.amountCents >= e.installments, 'Parcelamento do cartão inválido.');
    if (e.type === 'card_payment') assert(card && e.paymentMethod !== 'credit' && validDate(e.invoiceDate), 'Fatura inválida.');
  }
  validatePlans(s);
  return s;
}
export function entryScope(s, e) {
  return (e.type === 'expense' && e.paymentMethod === 'credit' ? s.cards.find(c=>c.id === e.cardId) : s.accounts.find(a=>a.id === e.accountId))?.scope;
}
export function accountBalance(s, id, asOf=today()) {
  const a = s.accounts.find(a=>a.id===id);
  if (!a || a.openingDate > asOf) return 0;
  return a.openingBalanceCents + s.entries.filter(e=>e.status==='posted' && e.date<=asOf).reduce((sum,e)=> {
    if (e.type === 'transfer') return sum + (e.toAccountId===id ? e.amountCents : 0) - (e.accountId===id ? e.amountCents : 0);
    if (e.accountId !== id) return sum;
    return sum + (e.type==='income' ? e.amountCents : -e.amountCents);
  },0);
}
export function firstInvoiceDate(card, date) {
  const closing = addMonths(date,0,card.closingDay);
  const cycle = date > closing ? 1 : 0;
  const due = addMonths(date,cycle,card.dueDay);
  // A due date on/before closing is in the following month.
  return due <= addMonths(date,cycle,card.closingDay) ? addMonths(date,cycle+1,card.dueDay) : due;
}
export function invoices(s, asOf=today()) {
  const buckets = new Map();
  function get(card,date) {
    const key = `${card.id}:${date}`;
    if (!buckets.has(key)) buckets.set(key,{ key, cardId:card.id, name:card.name, scope:card.scope, date, totalCents:0, paidCents:0, items:[] });
    return buckets.get(key);
  }
  for (const card of s.cards) {
    if (card.openingDebtCents) {
      const invoice = get(card,card.openingDueDate);
      invoice.totalCents += card.openingDebtCents;
      invoice.items.push({description:'Fatura anterior ao início do controle',amountCents:card.openingDebtCents});
    }
    for (const initial of card.openingInvoices||[]) {
      const invoice = get(card,initial.date);
      invoice.totalCents += initial.amountCents;
      invoice.items.push({description:initial.description,amountCents:initial.amountCents});
    }
  }
  for (const e of s.entries) {
    const card = s.cards.find(c=>c.id===e.cardId);
    if (!card) continue;
    if (e.type==='expense' && e.paymentMethod==='credit' && e.status==='posted' && e.date<=asOf) {
      const first = firstInvoiceDate(card,e.date);
      splitAmount(e.amountCents,e.installments).forEach((part,i)=> {
        const inv = get(card,addMonths(first,i,card.dueDay));
        inv.totalCents += part;
        inv.items.push({description:e.description,amountCents:part,installment:`${i+1}/${e.installments}`});
      });
    }
    if (e.type==='card_payment' && e.status==='posted' && e.date<=asOf) get(card,e.invoiceDate).paidCents += e.amountCents;
  }
  return [...buckets.values()].map(i=>({...i,remainingCents:i.totalCents-i.paidCents})).sort((a,b)=>a.date.localeCompare(b.date));
}
export function validateLedger(s, asOf=today()) {
  validateState(s);
  assert(!s.accounts.some(a=>a.openingDate>asOf), 'A data do saldo inicial não pode ser futura.');
  assert(!s.entries.some(e=>e.status==='posted' && e.date>asOf), 'Uma movimentação futura deve ficar como prevista.');
  assert(!invoices(s,asOf).some(i=>i.remainingCents<0), 'O pagamento supera o valor da fatura. Confira os pagamentos ou compras vinculados antes de alterar.');
  return s;
}
export function summary(s, month, scope='all', asOf=today()) {
  const match = e => scope==='all' || entryScope(s,e)===scope;
  const actual = s.entries.filter(e=>match(e) && e.status==='posted' && e.date<=asOf && e.date.startsWith(month));
  const incomeCents = actual.filter(e=>e.type==='income').reduce((v,e)=>v+e.amountCents,0);
  const expenseCents = actual.filter(e=>e.type==='expense').reduce((v,e)=>v+e.amountCents,0);
  const planned = s.entries.filter(e=>match(e) && e.status==='planned' && e.date.startsWith(month));
  const due = invoices(s,asOf).filter(i=>(scope==='all'||i.scope===scope) && i.date.startsWith(month));
  const payableCents = planned.filter(e=>e.type==='expense').reduce((v,e)=>v+e.amountCents,0)+due.reduce((v,i)=>v+Math.max(0,i.remainingCents),0);
  const receivableCents = planned.filter(e=>e.type==='income').reduce((v,e)=>v+e.amountCents,0);
  const balanceCents = s.accounts.filter(a=>scope==='all'||a.scope===scope).reduce((v,a)=>v+accountBalance(s,a.id,asOf),0);
  const categories = CATEGORIES.map(name=>({name,amountCents:actual.filter(e=>e.type==='expense' && e.category===name).reduce((v,e)=>v+e.amountCents,0)})).filter(c=>c.amountCents).sort((a,b)=>b.amountCents-a.amountCents);
  const debtCents = s.entries.filter(e=>match(e) && e.status==='planned' && e.commitmentKind==='loan').reduce((v,e)=>v+e.amountCents,0);
  const cardDebtCents = invoices(s,asOf).filter(i=>scope==='all'||i.scope===scope).reduce((v,i)=>v+Math.max(0,i.remainingCents),0);
  return {incomeCents,expenseCents,payableCents,receivableCents,balanceCents,categories,debtCents,cardDebtCents};
}

export const newPlans = () => ({payrolls:[],debts:[],recurrences:[],payrollRuns:[]});
export const plansOf = s => s.plans || newPlans();
export const ensurePlans = s => (s.plans ||= newPlans());
function validMonth(m) { return typeof m==='string' && validDate(m+'-01'); }
function validatePlans(s) {
  if(!s.plans)return;
  const p=s.plans;
  for(const key of ['payrolls','debts','recurrences','payrollRuns'])assert(Array.isArray(p[key])&&p[key].length<=10000,'Configuração financeira inválida.');
  const ids=new Set([...s.accounts,...s.cards,...s.entries].map(x=>x.id));
  for(const item of [...p.payrolls,...p.debts,...p.recurrences,...p.payrollRuns]){
    assert(item&&shortText(item.id)&&!ids.has(item.id),'Identificador de configuração inválido ou repetido.');ids.add(item.id);
  }
  for(const pay of p.payrolls){
    assert(shortText(pay.name)&&amount(pay.baseCents)&&Number.isInteger(pay.payDay)&&pay.payDay>=1&&pay.payDay<=31&&validMonth(pay.startMonth),'Folha de pagamento inválida.');
    assert(s.accounts.some(a=>a.id===pay.accountId&&a.scope==='personal'),'A folha precisa de uma conta pessoal para receber o salário.');
    assert(typeof pay.active==='boolean'&&Array.isArray(pay.deductions)&&pay.deductions.length<=100,'Descontos da folha inválidos.');
    const deductions=new Set();
    for(const d of pay.deductions){
      assert(shortText(d.id)&&!deductions.has(d.id)&&shortText(d.name),'Desconto inválido ou repetido.');deductions.add(d.id);
      assert(['fixed','percent'].includes(d.mode)&&['other','tax','pension'].includes(d.kind)&&typeof d.active==='boolean','Tipo de desconto inválido.');
      assert(d.mode==='fixed'?amount(d.amountCents):Number.isInteger(d.rateBps)&&d.rateBps>0&&d.rateBps<=10000,'Valor ou percentual do desconto inválido.');
      assert(validMonth(d.startMonth)&&(!d.endMonth||(validMonth(d.endMonth)&&d.endMonth>=d.startMonth)),'Período do desconto inválido.');
    }
  }
  for(const debt of p.debts){
    assert(shortText(debt.name)&&['payroll_loan','financing','loan'].includes(debt.kind)&&amount(debt.installmentCents),'Contrato inválido.');
    assert(Number.isInteger(debt.installments)&&debt.installments>=1&&debt.installments<=600&&validDate(debt.firstDueDate),'Parcelas do contrato inválidas.');
    assert(validDate(addMonths(debt.firstDueDate,debt.installments-1)),'As parcelas excedem o período permitido.');
    if(debt.kind==='payroll_loan')assert(p.payrolls.some(pay=>pay.id===debt.payrollId),'Vincule o consignado a uma folha de pagamento.');
    else assert(s.accounts.some(a=>a.id===debt.accountId),'Informe a conta para pagar o contrato.');
  }
  for(const r of p.recurrences){
    assert(shortText(r.name)&&['income','expense'].includes(r.type)&&['fixed','variable'].includes(r.amountMode),'Recorrência inválida.');
    assert(r.amountMode==='fixed'?amount(r.amountCents):signedAmount(r.amountCents)&&r.amountCents>=0,'Valor da recorrência inválido.');
    assert(s.accounts.some(a=>a.id===r.accountId)&&Number.isInteger(r.day)&&r.day>=1&&r.day<=31&&Object.hasOwn(METHODS,r.paymentMethod)&&r.paymentMethod!=='credit','Conta ou vencimento da recorrência inválido.');
    assert(typeof r.active==='boolean'&&validMonth(r.startMonth)&&(!r.endMonth||(validMonth(r.endMonth)&&r.endMonth>=r.startMonth)),'Período da recorrência inválido.');
    assert(r.type==='expense'?CATEGORIES.includes(r.category):Object.hasOwn(SOURCES,r.source),'Categoria ou origem da recorrência inválida.');
  }
  const runs=new Set();
  for(const run of p.payrollRuns){
    const pay=p.payrolls.find(pay=>pay.id===run.payrollId),e=s.entries.find(e=>e.id===run.entryId),key=run.payrollId+':'+run.month;
    assert(pay&&validMonth(run.month)&&validDate(run.date)&&!runs.has(key),'Folha mensal inválida ou já recebida.');runs.add(key);
    assert(amount(run.baseCents)&&signedAmount(run.netCents)&&run.netCents>0&&Array.isArray(run.deductions),'Recebimento da folha inválido.');
    let deductionCents=0;const linked=new Set();
    for(const d of run.deductions){
      assert(shortText(d.name)&&amount(d.amountCents),'Desconto confirmado inválido.');deductionCents+=d.amountCents;
      if(d.debtId){assert(p.debts.some(x=>x.id===d.debtId&&x.payrollId===pay.id)&&!linked.has(d.debtId),'Consignado inválido ou repetido na folha.');linked.add(d.debtId);}
    }
    assert(run.baseCents-deductionCents===run.netCents,'Os descontos não correspondem ao salário líquido.');
    assert(e&&e.type==='income'&&e.source==='clt'&&e.status==='posted'&&e.amountCents===run.netCents&&e.accountId===(run.accountId||pay.accountId)&&e.date===run.date,'O salário líquido deve estar vinculado ao recebimento da folha.');
  }
  const occurrences=new Set();
  for(const e of s.entries){
    if(e.occurrenceKey){assert(shortText(e.occurrenceKey)&&!occurrences.has(e.occurrenceKey),'Este compromisso mensal já foi registrado.');occurrences.add(e.occurrenceKey);}
    if(e.debtId){const debt=p.debts.find(d=>d.id===e.debtId);assert(debt&&debt.kind!=='payroll_loan'&&e.type==='expense'&&e.amountCents===debt.installmentCents,'Pagamento de contrato inválido.');}
    if(e.recurrenceId)assert(p.recurrences.some(r=>r.id===e.recurrenceId),'Recorrência vinculada não encontrada.');
  }
  for(const debt of p.debts){
    const count=s.entries.filter(e=>e.debtId===debt.id&&e.status==='posted').length+p.payrollRuns.filter(r=>r.deductions.some(d=>d.debtId===debt.id)).length;
    assert(count<=debt.installments,'O número de pagamentos supera as parcelas restantes cadastradas.');
  }
}
