import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,today} from '../public/finance.mjs';
import {cardStatistics} from '../public/card-insights.mjs';
import {createCardsStatisticsUI} from '../public/assets/cards-statistics.mjs';

function harness(){let cursor=0,values=[];const React={createElement:(type,props,...children)=>typeof type==='function'?type({...props,children}):({type,props:props||{},children}),useMemo:fn=>fn(),useState:value=>{const index=cursor++;if(!(index in values))values[index]=value;return [values[index],next=>values[index]=next];}};return {React,render:fn=>{cursor=0;return fn();}};}
function visit(node,fn){if(Array.isArray(node))return node.forEach(n=>visit(n,fn));if(!node||typeof node!=='object')return;fn(node);node.children?.forEach(n=>visit(n,fn));}
function text(node){const words=[];visit(node,n=>n.children?.forEach(c=>{if(typeof c==='string')words.push(c);}));return words.join(' ');}

test('cards section displays limits, future credit, invoice composition and independent overdraft',()=>{
  const date=today(),s={...emptyState(),accounts:[{id:'bank',name:'Conta',kind:'bank',scope:'personal',openingBalanceCents:-20000,openingDate:date,overdraftLimitCents:50000}],
    cards:[{id:'card',name:'Cartão A',scope:'personal',closingDay:20,dueDay:26,creditLimitCents:10000,openingDebtCents:20000,openingDueDate:date}]};
  let edited;
  const {React,render}=harness(),{CardsStatistics}=createCardsStatisticsUI(React),draw=()=>render(()=>CardsStatistics({report:cardStatistics(s,date.slice(0,7)),state:s,month:date.slice(0,7),onEditLimit:card=>edited=card,onManage:()=>{}}));
  let tree=draw(),expand;visit(tree,n=>{if(n.props['aria-label']==='Expandir Cartão A')expand=n;});assert.equal(expand.props['aria-expanded'],false);assert.doesNotMatch(text(tree),/Extrato do cartão/);expand.props.onClick();tree=draw();
  const rendered=text(tree);assert.match(rendered,/Limite total/);assert.match(rendered,/Disponível estimado/);assert.match(rendered,/Composição da fatura/);assert.match(rendered,/Cheque especial/);
  assert.match(rendered,/200% comprometido/);assert.match(rendered,/superam o limite informado/);
  let edit;visit(tree,n=>{if(n.type==='button'&&text(n)==='Editar limite')edit=n;});edit.props.onClick();assert.equal(edited.id,'card');
  const meters=[];visit(tree,n=>{if(n.props.role==='progressbar')meters.push(n);});assert.equal(meters[0].props['aria-valuenow'],100);assert.match(meters[0].props['aria-valuetext'],/200,00.*100,00/);
});

test('unconfigured credit never displays an invented limit or a positive availability',()=>{
  const date=today(),s={...emptyState(),cards:[{id:'card',name:'Cartão A',scope:'personal',closingDay:20,dueDay:26,openingDebtCents:20000,openingDueDate:date}]};
  const {React,render}=harness(),{CardsStatistics}=createCardsStatisticsUI(React),draw=()=>render(()=>CardsStatistics({report:cardStatistics(s,date.slice(0,7)),state:s,month:date.slice(0,7),onEditLimit:()=>{},onManage:()=>{}}));
  let tree=draw();visit(tree,n=>{if(n.props['aria-label']==='Expandir Cartão A')n.props.onClick();});tree=draw();
  assert.match(text(tree),/Não informado/);assert.match(text(tree),/Informe os limites/);assert.doesNotMatch(text(tree),/R\$\s*5.000,00/);
});

test('original home card face expands the matching statement, filters invoices and collapses again',()=>{
  const date=today(),s={...emptyState(),cards:['a','b'].map(id=>({id,name:'Cartão '+id,scope:'personal',closingDay:20,dueDay:26,openingDebtCents:id==='a'?10000:20000,openingDueDate:date,display:{holder:'Titular '+id,bank:'Banco '+id,number:'•••• '+id,color:'bg-purple-600'}}))};
  const {React,render}=harness(),Card=props=>({type:'original-card',props,children:[]}),{CardsStatistics}=createCardsStatisticsUI(React,{visuals:{Card}});
  const draw=()=>render(()=>CardsStatistics({report:cardStatistics(s,date.slice(0,7)),state:s,month:date.slice(0,7),onEditLimit:()=>{},onManage:()=>{}}));
  let tree=draw(),faces=[];visit(tree,n=>{if(n.type==='original-card')faces.push(n);});assert.equal(faces.length,2);assert.ok(faces.every(n=>n.props.readOnly===true));
  faces[1].props.onClick();tree=draw();let section,filter;visit(tree,n=>{if(n.props['aria-label']==='Extrato de Cartão b')section=n;if(n.type==='select'&&n.children.some(c=>c?.children?.includes('Todos os cartões')))filter=n;});
  assert.ok(section);assert.equal(filter.props.value,'b');assert.match(text(section),/200,00/);assert.doesNotMatch(text(section),/100,00/);
  visit(tree,n=>{if(n.props['aria-label']==='Recolher Cartão b')n.props.onClick();});tree=draw();assert.doesNotMatch(text(tree),/Extrato do cartão/);
});
