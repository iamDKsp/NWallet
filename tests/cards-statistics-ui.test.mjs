import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,today} from '../public/finance.mjs';
import {cardStatistics} from '../public/card-insights.mjs';
import {createCardsStatisticsUI} from '../public/assets/cards-statistics.mjs';

const React={createElement:(type,props,...children)=>typeof type==='function'?type({...props,children}):({type,props:props||{},children}),useState:value=>[value,()=>{}]};
function visit(node,fn){if(Array.isArray(node))return node.forEach(n=>visit(n,fn));if(!node||typeof node!=='object')return;fn(node);node.children?.forEach(n=>visit(n,fn));}
function text(node){const words=[];visit(node,n=>n.children?.forEach(c=>{if(typeof c==='string')words.push(c);}));return words.join(' ');}

test('cards section displays limits, future credit, invoice composition and independent overdraft',()=>{
  const date=today(),s={...emptyState(),accounts:[{id:'bank',name:'Conta',kind:'bank',scope:'personal',openingBalanceCents:-20000,openingDate:date,overdraftLimitCents:50000}],
    cards:[{id:'card',name:'Cartão A',scope:'personal',closingDay:20,dueDay:26,creditLimitCents:10000,openingDebtCents:20000,openingDueDate:date}]};
  let edited;
  const {CardsStatistics}=createCardsStatisticsUI(React),tree=CardsStatistics({report:cardStatistics(s,date.slice(0,7)),state:s,month:date.slice(0,7),onEditLimit:card=>edited=card,onManage:()=>{}});
  const rendered=text(tree);assert.match(rendered,/Limite total/);assert.match(rendered,/Disponível estimado/);assert.match(rendered,/Composição da fatura/);assert.match(rendered,/Cheque especial/);
  assert.match(rendered,/200% comprometido/);assert.match(rendered,/superam o limite informado/);
  let edit;visit(tree,n=>{if(n.type==='button'&&text(n)==='Editar limite')edit=n;});edit.props.onClick();assert.equal(edited.id,'card');
  const meters=[];visit(tree,n=>{if(n.props.role==='progressbar')meters.push(n);});assert.equal(meters[0].props['aria-valuenow'],100);assert.match(meters[0].props['aria-valuetext'],/200,00.*100,00/);
});

test('unconfigured credit never displays an invented limit or a positive availability',()=>{
  const date=today(),s={...emptyState(),cards:[{id:'card',name:'Cartão A',scope:'personal',closingDay:20,dueDay:26,openingDebtCents:20000,openingDueDate:date}]};
  const {CardsStatistics}=createCardsStatisticsUI(React),tree=CardsStatistics({report:cardStatistics(s,date.slice(0,7)),state:s,month:date.slice(0,7),onEditLimit:()=>{},onManage:()=>{}});
  assert.match(text(tree),/Não informado/);assert.match(text(tree),/Informe os limites/);assert.doesNotMatch(text(tree),/R\$\s*5.000,00/);
});
