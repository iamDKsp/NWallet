import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,invoices,validateLedger} from '../public/finance.mjs';
import {cardStatement} from '../public/card-insights.mjs';
import {createCardStatementUI} from '../public/assets/card-statement.mjs';

const date='2026-10-12';
function fixture(){return {...emptyState(),accounts:[{id:'bank',name:'Conta',kind:'bank',scope:'personal',openingBalanceCents:100000,openingDate:'2026-10-01'}],
  cards:[{id:'card',name:'Cartão',scope:'personal',closingDay:20,dueDay:26,openingDebtCents:20000,openingDueDate:'2026-10-26',openingInvoices:[{id:'old',description:'Parcela anterior · Loja',amountCents:7000,date:'2026-11-26'}]},
    {id:'other',name:'Outro cartão',scope:'personal',closingDay:20,dueDay:28,openingDebtCents:9000,openingDueDate:'2026-10-28'}],
  entries:[{id:'buy',type:'expense',description:'Compra parcelada',amountCents:10001,date,status:'posted',cardId:'card',accountId:null,paymentMethod:'credit',installments:3,category:'Compras'},
    {id:'paid',type:'card_payment',description:'Pagamento parcial',amountCents:5000,date,status:'posted',cardId:'card',accountId:'bank',paymentMethod:'boleto',invoiceDate:'2026-10-26'},
    {id:'planned',type:'card_payment',description:'Pagamento previsto',amountCents:5000,date:'2026-11-01',status:'planned',cardId:'card',accountId:'bank',paymentMethod:'boleto',invoiceDate:'2026-11-26'},
    {id:'another',type:'expense',description:'Outro cartão',amountCents:5000,date,status:'posted',cardId:'other',accountId:null,paymentMethod:'credit',installments:1,category:'Compras'}]};}

test('statement contains purchases once, installments as detail and payments separately',()=>{
  const state=fixture();validateLedger(state,date);const original=JSON.stringify(state),report=cardStatement(state,'card',date);
  assert.equal(report.rows.length,4);assert.equal(report.purchaseCents,10001);assert.equal(report.openingCents,27000);assert.equal(report.paymentCents,5000);
  assert.deepEqual(report.rows.map(row=>row.kind),['purchase','payment','opening','opening']);assert.equal(report.rows[2].date,'2026-10-26');assert.equal(report.rows[3].date,'2026-11-26');
  const purchase=report.rows.find(row=>row.kind==='purchase');assert.equal(purchase.schedule.length,3);
  assert.deepEqual(purchase.schedule.map(p=>p.amountCents),[3334,3334,3333]);assert.equal(purchase.schedule.reduce((v,p)=>v+p.amountCents,0),purchase.amountCents);
  assert.equal(purchase.schedule[0].date,'2026-10-26');assert.equal(purchase.schedule[2].date,'2026-12-26');
  assert.equal(report.purchaseCents+report.openingCents-report.paymentCents,invoices(state,date).filter(i=>i.cardId==='card').reduce((v,i)=>v+i.remainingCents,0));
  assert.ok(report.rows.filter(r=>r.kind==='opening').every(r=>r.dateKind==='due'&&!r.category&&!r.schedule));
  assert.equal(report.rows.some(r=>r.description==='Pagamento previsto'||r.description==='Outro cartão'),false);assert.equal(JSON.stringify(state),original);
});

test('statement obeys the cutoff date and does not invent unavailable card history',()=>{
  const state=fixture(),past=cardStatement(state,'card','2026-10-11');assert.equal(past.purchaseCents,0);assert.equal(past.paymentCents,0);assert.equal(past.openingCents,27000);
  assert.deepEqual(cardStatement(state,'missing',date),{rows:[],purchaseCents:0,openingCents:0,paymentCents:0});
});

function harness(){let cursor=0,values=[];const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useMemo:fn=>fn(),useState:value=>{const index=cursor++;if(!(index in values))values[index]=value;return [values[index],next=>values[index]=next];}};return {React,render:fn=>{cursor=0;return fn();}};}
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return [];return [tree,...(tree.children||[]).flatMap(nodes)];}

test('every prior invoice record is reachable through statement pagination and search',()=>{
  const state=fixture(),card=state.cards[0];card.openingDebtCents=0;
  card.openingInvoices=Array.from({length:21},(_,index)=>({id:'old'+index,description:'Loja '+(index+1),amountCents:10000+index,date:'2026-10-26'}));state.entries=[];
  const {React,render}=harness(),{CardStatement}=createCardStatementUI(React),draw=()=>render(()=>CardStatement({state,card}));
  let tree=draw();assert.equal(nodes(tree).filter(n=>n.type==='article').length,10);
  nodes(tree).find(n=>n.type==='button'&&n.children.includes('Próximos')).props.onClick();tree=draw();assert.equal(nodes(tree).filter(n=>n.type==='article').length,10);
  nodes(tree).find(n=>n.type==='button'&&n.children.includes('Próximos')).props.onClick();tree=draw();assert.equal(nodes(tree).filter(n=>n.type==='article').length,1);
  nodes(tree).find(n=>n.type==='input'&&n.props.type==='search').props.onChange({target:{value:'Loja 21'}});tree=draw();
  const row=nodes(tree).find(n=>n.type==='article');assert.ok(nodes(row).some(n=>n.children?.includes('Loja 21')));
  assert.ok(nodes(row).some(n=>n.children?.includes('Vencimento: 26/10/2026')));assert.equal(nodes(tree).filter(n=>n.type==='article').length,1);
});
