import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinanceIntegration,walletErrorMessage,workspaceSection} from '../public/assets/finance-integration.mjs';
import {emptyState,today,newPlans} from '../public/finance.mjs';
const integration=createFinanceIntegration({createElement:()=>null},null,null);
test('calendar links open the requested wallet section and preserve birthday deep links',()=>{
  assert.equal(workspaceSection('?view=birthdays'),'birthdays');assert.equal(workspaceSection('?view=notifications','accounts'),'accounts');
  const previousLocation=globalThis.location;globalThis.location={search:''};
  const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{}};
  const wallet=createFinanceIntegration(React,null,null);wallet.selectWorkspaceSection('accounts');
  try{
    const tree=wallet.Workspace({});const selected=[];
    function visit(node){if(Array.isArray(node))return node.forEach(visit);if(!node||typeof node!=='object')return;if(node.type==='button'&&node.props['aria-current']==='page')selected.push(...node.children);node.children?.forEach(visit);}
    visit(tree);assert.deepEqual(selected,['Contas']);
  }finally{globalThis.location=previousLocation;}
});
test('wallet reconnects after a network failure without writing or clearing saved data',async()=>{
  const originalFetch=globalThis.fetch;
  let current,offline=true,calls=[];
  const React={createElement:()=>null,useState:value=>[current=value,()=>{}],useEffect:()=>{}};
  const wallet=createFinanceIntegration(React,null,null);
  const stored={revision:12,state:{...emptyState(),accounts:[{id:'saved',name:'Conta preservada',kind:'bank',scope:'personal',openingBalanceCents:10000,openingDate:today()}]}};
  globalThis.fetch=async(url,options)=>{calls.push({url,options});if(offline)throw new TypeError('Failed to fetch');return {ok:true,json:async()=>structuredClone(stored)};};
  try {
    await assert.rejects(wallet.useWallet().refresh(),/servidor local/);
    const failed=wallet.useWallet();assert.equal(failed.loaded,false);assert.match(failed.error,/servidor local/);
    offline=false;await failed.refresh();
    const restored=wallet.useWallet();assert.equal(restored.error,'');assert.equal(restored.loaded,true);assert.equal(restored.revision,12);assert.deepEqual(restored.state,stored.state);
    offline=true;await assert.rejects(restored.refresh());assert.deepEqual(wallet.useWallet().state,stored.state);
    assert.ok(calls.every(c=>c.url==='/api/wallet'&&!c.options.method));
    assert.equal(walletErrorMessage(new Error('Revisão conflitante.')),'Revisão conflitante.');
  } finally {globalThis.fetch=originalFetch;}
});
function fixture(){const date=today();return {...emptyState(),accounts:[{id:'a',name:'Conta',kind:'bank',scope:'personal',openingBalanceCents:10000,openingDate:date},{id:'b',name:'Empresa',kind:'bank',scope:'business',openingBalanceCents:0,openingDate:date}],cards:[{id:'card',name:'Cartão',scope:'personal',closingDay:25,dueDay:5,openingDebtCents:10000,openingDueDate:date}],entries:[
{id:'expense',type:'expense',description:'Mercado',amountCents:2555,date,status:'posted',accountId:'a',paymentMethod:'pix',category:'Alimentação'},
{id:'income',type:'income',description:'Recebimento',amountCents:50000,date,status:'posted',accountId:'a',paymentMethod:'pix',source:'clt'},
{id:'transfer',type:'transfer',description:'Transferência',amountCents:1000,date,status:'posted',accountId:'a',toAccountId:'b',paymentMethod:'transfer'},
{id:'payment',type:'card_payment',description:'Fatura',amountCents:5000,date,status:'posted',accountId:'a',cardId:'card',invoiceDate:date,paymentMethod:'boleto'}]};}
test('editing an existing card binds it to the bank without losing invoice or display data',async()=>{
  const originalFetch=globalThis.fetch;
  let stored={revision:1,state:fixture()};stored.state.accounts[1].bank='Itaú';
  stored.state.cards[0].display={holder:'Titular',bank:'Anterior',number:'•••• 1234',color:'bg-purple-600'};
  stored.state.cards[0].openingInvoices=[{id:'older',description:'Parcela anterior',date:'2028-01-05',amountCents:1000}];
  stored.state.cards[0].creditLimitCents=300000;
  const wallet=createFinanceIntegration({createElement:()=>null,useState:value=>[value,()=>{}],useEffect:()=>{}},null,null);
  globalThis.fetch=async(url,options)=>{if(options?.method==='PUT'){const data=JSON.parse(options.body);stored={revision:stored.revision+1,state:data.state};}return {ok:true,json:async()=>structuredClone(stored)};};
  try {
    await wallet.useWallet().refresh();await wallet.saveCard({id:'card',accountId:'b',cardName:'Empresarial físico'});
    const card=stored.state.cards[0];assert.equal(card.accountId,'b');assert.equal(card.scope,'business');
    assert.equal(card.creditLimitCents,300000);
    assert.equal(card.openingDebtCents,10000);assert.equal(card.openingInvoices[0].id,'older');assert.equal(card.display.holder,'Titular');
    const adapted=wallet.legacyCards(stored.state)[0];assert.equal(adapted.accountId,'b');assert.equal(adapted.bank,'Itaú');
    await wallet.saveCard({id:'card',color:'bg-blue-600'});assert.equal(stored.state.cards[0].accountId,'b');
    await wallet.saveCard({id:'card',accountId:null});assert.equal(stored.state.cards[0].accountId,null);
    await wallet.saveCard({id:'card',creditLimitCents:180000});assert.equal(stored.state.cards[0].creditLimitCents,180000);assert.equal(stored.state.cards[0].openingInvoices[0].id,'older');
    await wallet.saveCard({id:'card',creditLimitCents:null});assert.equal(stored.state.cards[0].creditLimitCents,null);
  }finally{globalThis.fetch=originalFetch;}
});
test('calendar adapters preserve the string transaction date and supply Date appointments required by the original UI',()=>{
  const s=fixture(),transactions=integration.calendarTransactions(integration.transactions(s));
  assert.ok(transactions.every(e=>typeof e.date==='string'&&typeof e.date.includes==='function'&&e.isoDate===today()));
  const appointments=integration.calendarAppointments(s);assert.equal(appointments.length,1);assert.ok(appointments[0].date instanceof Date);assert.ok(Number.isFinite(appointments[0].date.getTime()));
});
test('original statistics and weekly charts exclude transfers and invoice settlements from expenses',()=>{
  const s=fixture(),transactions=integration.transactions(s),rows=integration.statisticsRows(s);
  assert.deepEqual(rows.map(e=>e.id).sort(),['expense','income']);
  const weeks=integration.weeklyData(transactions);assert.equal(weeks.length,7);assert.equal(weeks.reduce((v,w)=>v+w.expense,0),25.55);assert.equal(weeks.reduce((v,w)=>v+w.income,0),500);
  assert.ok(weeks.every(w=>Number.isFinite(w.amount)));assert.equal(integration.summary(s).expenseCents,2555);
});
test('calendar forecasts follow the selected month, including later years and February',()=>{
  const s=fixture();s.plans={...newPlans(),payrolls:[{id:'job',name:'CLT',baseCents:100000,accountId:'a',payDay:31,startMonth:'2026-10',active:true,deductions:[]}]};
  const dates=integration.calendarAppointments(s,new Date('2028-02-15T12:00:00')).filter(a=>a.id.startsWith('payroll:')).map(a=>a.date);
  assert.equal(dates.length,3);assert.ok(dates.some(d=>d.getFullYear()===2028&&d.getMonth()===1&&d.getDate()===29));
});
