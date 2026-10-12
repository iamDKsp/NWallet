import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {emptyState,categorySpending,summary,today} from '../public/finance.mjs';
import {createCategorySpendingUI} from '../public/assets/category-spending.mjs';
const date='2026-10-12';
function fixture(){return {...emptyState(),accounts:[{id:'personal',name:'Pessoal',scope:'personal',kind:'bank',openingDate:'2026-09-01',openingBalanceCents:100000},{id:'business',name:'Empresa',scope:'business',kind:'bank',openingDate:'2026-09-01',openingBalanceCents:0}],cards:[{id:'card',name:'Cartão empresarial',scope:'business',closingDay:25,dueDay:5,openingDebtCents:0,openingDueDate:'2026-11-05'}]};}
const expense=change=>({id:'e',type:'expense',description:'Mercado',amountCents:12550,date,status:'posted',accountId:'personal',paymentMethod:'pix',category:'Alimentação',...change});

test('only posted expenses within the selected month and as-of date contribute to categories',()=>{
  const s=fixture();s.entries=[expense(),expense({id:'later',date:'2026-10-13'}),expense({id:'previous',date:'2026-09-30'}),expense({id:'planned',status:'planned'}),expense({id:'income',type:'income',source:'clt'}),expense({id:'transfer',type:'transfer',toAccountId:'business'}),expense({id:'payment',type:'card_payment',cardId:'card',invoiceDate:'2026-11-05',paymentMethod:'boleto'})];
  const report=categorySpending(s,'2026-10','all',date);assert.equal(report.totalCents,12550);assert.equal(report.count,1);assert.equal(report.categories[0].percent,100);
  assert.equal(report.totalCents,summary(s,'2026-10','all',date).expenseCents);
  assert.equal(categorySpending(s,'2026-09','all',date).totalCents,12550);
});
test('bank scopes and credit card scopes filter independently and credit purchases count once at full value',()=>{
  const s=fixture();s.entries=[expense(),expense({id:'business',accountId:'business',category:'Empresa',amountCents:8415}),expense({id:'credit',accountId:null,cardId:'card',paymentMethod:'credit',installments:3,category:'Compras',amountCents:34990})];
  const personal=categorySpending(s,'2026-10','personal',date),business=categorySpending(s,'2026-10','business',date),all=categorySpending(s,'2026-10','all',date);
  assert.equal(personal.totalCents,12550);assert.equal(business.totalCents,43405);assert.equal(all.totalCents,55955);
  assert.equal(business.categories.find(c=>c.name==='Compras').amountCents,34990);
  assert.equal(categorySpending(s,'2026-11','business','2026-11-30').totalCents,0);
});
test('centavos remain exact, categories sort by amount and displayed percentages add up to 100',()=>{
  const s=fixture();s.entries=['Alimentação','Saúde','Lazer'].map((category,i)=>expense({id:String(i),category,amountCents:1}));
  let report=categorySpending(s,'2026-10','all',date);assert.equal(report.totalCents,3);assert.deepEqual(report.categories.map(c=>c.percent),[34,33,33]);
  assert.equal(report.categories.reduce((sum,c)=>sum+c.percent,0),100);
  s.entries.push(expense({id:'big',category:'Transporte',amountCents:10001}));report=categorySpending(s,'2026-10','all',date);
  assert.equal(report.categories[0].name,'Transporte');assert.equal(report.totalCents,10004);assert.equal(report.categories.reduce((sum,c)=>sum+c.percent,0),100);
});
test('detail records are sorted, edits and deletion recalculate the report without modifying the ledger',()=>{
  const s=fixture();s.entries=[expense(),expense({id:'earlier',date:'2026-10-01',amountCents:5000})];const before=JSON.stringify(s);
  const report=categorySpending(s,'2026-10','all',date);assert.deepEqual(report.categories[0].entries.map(e=>e.id),['e','earlier']);assert.equal(JSON.stringify(s),before);
  s.entries[0].category='Transporte';assert.equal(categorySpending(s,'2026-10','all',date).categories.length,2);
  s.entries[0].amountCents=100;assert.equal(categorySpending(s,'2026-10','all',date).totalCents,5100);
  s.entries.splice(0,1);assert.equal(categorySpending(s,'2026-10','all',date).totalCents,5000);
});
test('empty months and invalid period or context have defined results',()=>{
  assert.deepEqual(categorySpending(fixture(),'2026-10','all',date),{month:'2026-10',scope:'all',totalCents:0,count:0,categories:[]});
  for(const args of [['2026-13','all',date],['invalid','all',date],['2026-10','missing',date],['2026-10','all','2026-02-30']])assert.throws(()=>categorySpending(fixture(),...args));
});
function renderPanel(state){
  const React={createElement:(type,props,...children)=>({type,props,children}),useState:value=>[value,()=>{}],useMemo:fn=>fn()};
  const {CategorySpending}=createCategorySpendingUI(React,{useWallet:()=>({state,loaded:true,error:''})});
  const tree=CategorySpending({});const values=[];
  function visit(node){if(Array.isArray(node))return node.forEach(visit);if(typeof node==='string'||typeof node==='number')values.push(node);else node?.children?.forEach(visit);}
  visit(tree);return values.join(' ');
}
test('the rendered empty panel contains no invented totals, categories or budget claims',()=>{
  const rendered=renderPanel(emptyState());assert.match(rendered,/R\$\s*0,00/);assert.match(rendered,/Nenhuma despesa confirmada neste mês/);assert.doesNotMatch(rendered,/820|499|prudencial|Excelente controle|Tecnologia/);
});
test('the rendered report uses real spending and factual category insights',()=>{
  const s=fixture();s.entries=[expense({date:today(),amountCents:12550})];const rendered=renderPanel(s);
  assert.match(rendered,/125,50/);assert.match(rendered,/Alimentação representa 100%/);assert.match(rendered,/1 despesa confirmada/);assert.doesNotMatch(rendered,/prudencial|maior moderação/);
});
test('the original balance card uses the real category panel and no legacy mock fallback',async()=>{
  const bundle=await fs.readFile(new URL('../public/assets/index-DGDPhK2a.js',import.meta.url),'utf8');const card=bundle.slice(bundle.indexOf('pie=({'),bundle.indexOf('},Vy=',bundle.indexOf('pie=({')));
  assert.match(card,/nwFinance\.CategorySpending/);assert.doesNotMatch(card,/total:820|total:499|limite prudencial|m=r\.filter/);
});
