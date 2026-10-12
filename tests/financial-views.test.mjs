import test from 'node:test';
import assert from 'node:assert/strict';
import {createCalendarUI} from '../public/assets/calendar-ui.mjs';
import {createStatisticsUI} from '../public/assets/statistics-ui.mjs';
import {emptyState,today} from '../public/finance.mjs';
import {shiftDays} from '../public/agenda.mjs';
import {createFinanceIntegration} from '../public/assets/finance-integration.mjs';

const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{},useRef:value=>({current:value}),useMemo:fn=>fn()};
function visit(node,fn){if(Array.isArray(node))return node.forEach(n=>visit(n,fn));if(!node||typeof node!=='object')return;fn(node);node.children?.forEach(n=>visit(n,fn));}
function text(node){const values=[];visit(node,n=>n.children.forEach(c=>{if(typeof c==='string')values.push(c);}));return values.join(' ');}

test('an empty selected day still displays invoice dates and amounts more than seven days away',()=>{
  const date=shiftDays(today(),14),state={...emptyState(),cards:[{id:'card',name:'Cartão',scope:'personal',closingDay:19,dueDay:26,openingDebtCents:82294,openingDueDate:date}]};
  const wallet=createFinanceIntegration(React,null,null);
  const {Calendar}=createCalendarUI(React,{useWallet:()=>({state,loaded:true}),calendarItems:wallet.calendarItems,selectWorkspaceSection:()=>{}});
  const tree=Calendar({}),buttons=[];visit(tree,n=>{if(n.type==='button')buttons.push(n);});
  assert.match(text(tree),/Próximos compromissos · 30 dias/);
  const invoice=buttons.find(n=>text(n).includes('Fatura Cartão'));assert.ok(invoice);assert.match(text(invoice),/822,94/);
  assert.match(text(tree),/Seu dia está livre/);
});

test('statistics renders real series, keeps invoice payment separate and opens the history section',()=>{
  const date=today(),state={...emptyState(),entries:[{id:'expense',description:'Mercado',type:'expense',amountCents:12345,date,status:'posted',category:'Alimentação'},{id:'payment',type:'card_payment',amountCents:10000,date,status:'posted'}]};
  let section,opened=false;
  const {Statistics}=createStatisticsUI(React,{useWallet:()=>({state,loaded:true}),useSelectedMonth:()=>[date.slice(0,7),()=>{}],selectWorkspaceSection:value=>section=value});
  const parent=Statistics({onOpenWallet:()=>opened=true});let overview;
  visit(parent,n=>{if(typeof n.type==='function'&&n.type.name==='StatisticsOverview')overview=n;});
  const tree=overview.type(overview.props);assert.match(text(tree),/123,45/);assert.match(text(tree),/223,45/);
  let button;visit(tree,n=>{if(n.type==='button'&&text(n)==='Ver registros')button=n;});button.props.onClick();
  assert.equal(section,'history');assert.equal(opened,true);
  const chart=[];visit(tree,n=>{if(n.props.className==='st-bucket')chart.push(n);});assert.ok(chart.length>0);
  assert.doesNotMatch(text(tree),/Nenhuma movimentação confirmada/);
});
