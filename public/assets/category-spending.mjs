import {today,addMonths,money,categorySpending,SCOPES,METHODS} from '../finance.mjs';
import {pendingPayments} from '../financial-insights.mjs';

const visuals={
  'Alimentação':['food','#20c68b'],'Moradia':['home','#8d9fe7'],'Transporte':['car','#69a6ed'],
  'Saúde':['health','#ea939c'],'Educação':['book','#baa0ed'],'Lazer':['play','#dca969'],
  'Compras':['bag','#78c5d0'],'Assinaturas':['repeat','#a598e6'],'Impostos':['receipt','#acaeb7'],
  'Empresa':['business','#71b5bd'],'Empréstimos':['receipt','#c39c77'],'Financiamento':['home','#919ce0'],
  'Pensão':['heart','#dca0bd'],'Outros':['grid','#96ad9f']
};
const paths={
  food:'M3 8h13v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z M16 9h2a3 3 0 0 1 0 6h-2 M6 2v3 M10 2v3 M14 2v3',
  home:'m3 10 9-7 9 7v11H3z M9 21v-8h6v8',car:'M3 10l2-6h14l2 6v8H3z M3 10h18 M7 14h.01 M17 14h.01 M5 18v3 M19 18v3',
  health:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',book:'M12 5v16 M3 4h6l3 2 3-2h6v16h-6l-3 2-3-2H3z',
  play:'m9 6 10 6-10 6z M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',bag:'M4 7h16l1 14H3z M8 7V5a4 4 0 0 1 8 0v2',
  repeat:'M20 7H4l4-4 M4 7l4 4 M4 17h16l-4-4 M20 17l-4 4',receipt:'M5 3h14v18l-3-2-4 2-4-2-3 2z M8 8h8 M8 12h8',
  business:'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',heart:'M20 4a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-6 6 8 17 8 17S26 10 20 4z',
  grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',down:'m6 9 6 6 6-6',
  chart:'M4 20V10 M10 20V4 M16 20v-8 M22 20V7',check:'m5 12 4 4 10-10'
};
const periodLabel=month=>new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const shortDate=date=>new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});

export function createCategorySpendingUI(React,{useWallet}) {
  const h=React.createElement;
  const icon=name=>h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[name]||paths.grid}));
  function CategoryDetails({category,state}) {
    const [page,setPage]=React.useState(0),pages=Math.ceil(category.entries.length/5);
    const current=Math.min(page,pages-1),rows=category.entries.slice(current*5,current*5+5);
    return h('div',{className:'cs-details'},h('p',{className:'cs-detail-heading'},'Lançamentos desta categoria'),rows.map(entry=>{
      const account=state.accounts.find(a=>a.id===entry.accountId),card=state.cards.find(c=>c.id===entry.cardId);
      return h('div',{key:entry.id,className:'cs-transaction'},h('div',{},h('strong',{},entry.description),h('span',{},[shortDate(entry.date),METHODS[entry.paymentMethod],card?.name||account?.name].filter(Boolean).join(' · '))),h('b',{},money(entry.amountCents)));
    }),pages>1&&h('div',{className:'cs-pagination'},h('button',{type:'button','aria-label':'Lançamentos anteriores',disabled:current===0,onClick:()=>setPage(current-1)},icon('left')),h('span',{},`${current*5+1}–${Math.min(current*5+5,category.count)} de ${category.count}`),h('button',{type:'button','aria-label':'Próximos lançamentos',disabled:current===pages-1,onClick:()=>setPage(current+1)},icon('right'))));
  }
  function CategorySpending({isDarkMode=true}) {
    const nw=useWallet(),currentMonth=today().slice(0,7);
    const [month,setMonth]=React.useState(currentMonth),[scope,setScope]=React.useState('all'),[selected,setSelected]=React.useState(null);
    const report=React.useMemo(()=>categorySpending(nw.state,month,scope),[nw.state,month,scope]);
    const pending=pendingPayments(nw.state,month,scope),pendingTotal=pending.reduce((v,i)=>v+(i.amountCents||0),0);
    const changeMonth=next=>{setMonth(next);setSelected(null);};
    const largest=report.categories[0];
    return h('section',{className:'nf-theme cs-panel','data-theme':isDarkMode?'dark':'light','aria-label':'Gastos por categoria'},
      h('header',{className:'cs-header'},h('div',{},h('p',{className:'cs-eyebrow'},month===currentMonth?'Mês atual':'Mês selecionado'),h('h3',{},'Gastos por categoria')),h('div',{className:'cs-total'},h('span',{},'Despesa total'),h('strong',{},money(report.totalCents)))),
      h('div',{className:'cs-period'},h('button',{type:'button','aria-label':'Mês anterior dos gastos',disabled:month==='2000-01',onClick:()=>changeMonth(addMonths(month+'-01',-1).slice(0,7))},icon('left')),h('span',{},periodLabel(month)),h('button',{type:'button','aria-label':'Próximo mês dos gastos',disabled:month==='2200-12',onClick:()=>changeMonth(addMonths(month+'-01',1).slice(0,7))},icon('right')),month!==currentMonth&&h('button',{type:'button',className:'cs-current','aria-label':'Voltar ao mês atual',onClick:()=>changeMonth(currentMonth)},'Atual')),
      h('label',{className:'cs-scope'},h('span',{},'Contexto'),h('select',{'aria-label':'Contexto dos gastos',value:scope,onChange:e=>{setScope(e.target.value);setSelected(null);}},h('option',{value:'all'},'Pessoal e empresa'),...Object.entries(SCOPES).map(([value,label])=>h('option',{key:value,value},label)))),
      !nw.loaded?h('p',{className:'cs-empty',role:'status'},nw.error||'Carregando os gastos…'):nw.error?h('p',{className:'cs-error',role:'alert'},nw.error):report.categories.length?h(React.Fragment,{},
        h('p',{className:'cs-count'},`${report.count} despesa${report.count===1?'':'s'} confirmada${report.count===1?'':'s'} · ${report.categories.length} categoria${report.categories.length===1?'':'s'}`),
        h('div',{className:'cs-categories'},report.categories.map(category=>{
          const [visual,color]=visuals[category.name]||visuals.Outros,expanded=selected===category.name;
          return h('div',{key:category.name,className:'cs-category',style:{'--cs-accent':color}},h('button',{type:'button',className:'cs-category-button','aria-expanded':expanded,'aria-label':`${category.name}: ${money(category.amountCents)}, ${category.percent}% do total, ${category.count} despesa${category.count===1?'':'s'}`,onClick:()=>setSelected(expanded?null:category.name)},h('span',{className:'cs-category-icon'},icon(visual)),h('span',{className:'cs-category-name'},h('strong',{},category.name),h('small',{},`${category.count} lançamento${category.count===1?'':'s'}`)),h('span',{className:'cs-category-value'},h('b',{},money(category.amountCents)),h('small',{},`${category.percent}%`)),h('span',{className:'cs-chevron'+(expanded?' expanded':'')},icon('down'))),h('div',{className:'cs-bar','aria-hidden':true},h('span',{style:{width:`${category.share}%`}})),expanded&&h(CategoryDetails,{key:category.name+month+scope,category,state:nw.state}));
        })),
        h('div',{className:'cs-insight'},icon('chart'),h('div',{},h('strong',{},'Maior participação'),h('p',{},`${largest.name} representa ${largest.percent}% dos gastos do período, com ${money(largest.amountCents)}.`)))):
        h('div',{className:'cs-empty'},icon('chart'),h('strong',{},'Nenhuma despesa confirmada neste mês'),h('p',{},scope==='all'?'Faturas e compromissos cadastrados aparecem abaixo como pagamentos previstos.':`Nenhuma despesa confirmada no contexto ${SCOPES[scope].toLowerCase()}.`)),
      nw.loaded&&!nw.error&&h('section',{className:'cs-pending','aria-label':'Pagamentos previstos do mês'},h('header',{className:'cs-header'},h('div',{},h('h3',{},'Pagamentos previstos'),h('p',{className:'nf-muted'},'Faturas e compromissos ainda a pagar pela conta. Consignados já estão no salário líquido.')),h('div',{className:'cs-total'},h('span',{},'Ainda a pagar'),h('strong',{},money(pendingTotal)))),
        pending.length?pending.map(item=>h('div',{key:item.key,className:'cs-transaction'},h('div',{},h('strong',{},item.description),h('span',{},new Date(item.date+'T12:00:00').toLocaleDateString('pt-BR')+' · '+item.source)),h('b',{},item.amountCents===null?'Valor a informar':money(item.amountCents)))):h('p',{className:'nf-muted'},'Nenhum pagamento previsto neste mês e contexto.')),
      h('details',{className:'cs-calculation'},h('summary',{},'Como este resumo é calculado'),h('p',{},'Somamos as despesas confirmadas na data do lançamento. Compras no crédito entram pelo valor total na data da compra. Receitas, transferências entre suas contas, previsões e pagamentos de fatura ficam fora. Os percentuais são arredondados para somar 100%.')));
  }
  return {CategorySpending};
}
