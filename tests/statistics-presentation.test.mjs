import test from 'node:test';
import assert from 'node:assert/strict';
import {animatedBuckets,filterStatisticsRows} from '../public/statistics-presentation.mjs';
import {createStatisticsOverview} from '../public/assets/statistics-overview.mjs';
import {statisticsData,cashProjection} from '../public/financial-insights.mjs';
import {emptyState} from '../public/finance.mjs';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const date='2026-10-12';
const entries=[{id:'in',type:'income',description:'Salário',date,status:'posted',amountCents:120000,paymentMethod:'pix'},
  {id:'out',type:'expense',description:'Mercado',date,status:'posted',amountCents:123450,paymentMethod:'credit',category:'Alimentação'},
  {id:'other',type:'expense',description:'Farmácia',date:'2026-10-10',status:'posted',amountCents:32100,paymentMethod:'debit',category:'Saúde'},
  {id:'settlement',type:'card_payment',description:'Fatura',date,status:'posted',amountCents:5000,paymentMethod:'boleto'}];
const state={...emptyState(),entries};
const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:value=>[value,()=>{}],useMemo:fn=>fn()};
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return [];return [tree,...(tree.children||[]).flatMap(nodes)];}

test('original stacked bars scale combined actual values without inventing a minimum',()=>{
  const data=statisticsData(state,'2026-10','month',date),bars=animatedBuckets(data);
  assert.equal(data.expenseCents,155550);
  assert.ok(bars.every(b=>parseFloat(b.h1)+parseFloat(b.h2)<=85.000001&&b.h3==='0%'));
  assert.equal(bars[0].h1,'0%');assert.equal(bars[0].h2,'0%');
  assert.equal(bars[1].incomeCents,120000);assert.equal(bars[1].expenseCents,155550);
});

test('activity filters compare integer cent amounts and exact payment methods',()=>{
  const rows=statisticsData(state,'2026-10','month',date).rows;
  assert.deepEqual(filterStatisticsRows(rows,{query:'1.234,50',min:'1.000,00',max:'1.300,00',method:'credit'}).map(r=>r.id),['out']);
  assert.deepEqual(filterStatisticsRows(rows,{start:'2026-10-11',method:'pix'}).map(r=>r.id),['in']);
  assert.deepEqual(filterStatisticsRows(rows,{query:'FARMÁCIA'}).map(r=>r.id),['other']);
  assert.equal(filterStatisticsRows(rows,{min:'inválido'}).length,0);
  assert.equal(rows.some(r=>r.id==='settlement'),false);
});

test('overview reuses original bar, donut and activity components with real amounts',()=>{
  const visuals=Object.fromEntries(['Bar','Backdrop','ResponsiveContainer','PieChart','Pie','Cell','Tooltip','ActivityRow','ActivityIcon'].map(name=>[name,()=>null]));
  const {StatisticsOverview}=createStatisticsOverview(React,{motion:{div:'animated-div'},visuals});
  const data=statisticsData(state,'2026-10','month',date),cash=cashProjection(state,'2026-10',date);
  let changed,period,opened=false;
  const tree=StatisticsOverview({data,cash,balanceCents:-10000,month:'2026-10',period:'month',onPeriod:value=>period=value,onHistory:()=>opened=true,onSetCategory:(...value)=>changed=value});
  const all=nodes(tree),pie=all.find(n=>n.type===visuals.Pie),bars=all.filter(n=>n.type===visuals.Bar);
  assert.equal(pie.props.data.reduce((v,c)=>v+c.value,0),155550);assert.ok(pie.props.data.some(c=>c.name==='Saúde'));
  assert.equal(pie.props.isAnimationActive,true);assert.equal(bars.length,data.buckets.length);assert.ok(bars.every(b=>b.props.isTarget===false));
  const activity=all.find(n=>n.type===visuals.ActivityRow&&n.props.id==='out');activity.props.onSetCategory('out','Saúde');assert.deepEqual(changed,['out','Saúde']);
  all.find(n=>n.props['aria-label']==='Ano').props.onClick();assert.equal(period,'year');
  all.find(n=>n.type==='button'&&n.children.includes('Ver registros')).props.onClick();assert.equal(opened,true);
  const progress=all.find(n=>n.props.role==='progressbar');assert.equal(progress.props['aria-valuenow'],Math.round(cash.paidCents/cash.totalCents*100));
});

test('deploy integration retains original statistics visual wiring on repeated builds',async()=>{
  let source=await fs.readFile('public/assets/index-DGDPhK2a.js','utf8');
  source=source.replace('createFinanceIntegration(A,se,jt,p5.createPortal,{Bar:mne,Backdrop:pne,ResponsiveContainer:zq,PieChart:hne,Pie:w3,Cell:hm,Tooltip:uQ,ActivityRow:gne,ActivityIcon:sd})','createFinanceIntegration(A,se,jt,p5.createPortal)');
  const script=await fs.readFile('scripts/fix_financial_views.cjs','utf8');
  const run=()=>vm.runInNewContext(script,{require:name=>{assert.equal(name,'node:fs');return {readFileSync:()=>source,writeFileSync:(_,value)=>source=value};},console:{log:()=>{}}});
  run();const first=source;run();assert.equal(source,first);
  assert.match(source,/createFinanceIntegration\(A,se,jt,p5.createPortal,\{Bar:mne,Backdrop:pne/);
  assert.equal(source.match(/b\.jsx\(nwFinance\.Statistics,/g).length,2);
});
