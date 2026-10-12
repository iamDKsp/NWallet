import {money,today,METHODS} from '../finance.mjs';
import {monthLabel} from '../financial-insights.mjs';
import {animatedBuckets,filterStatisticsRows,categoryColors} from '../statistics-presentation.mjs';

export function createStatisticsOverview(React,{motion,visuals={}}={}) {
  const h=React.createElement,Motion=motion?.div||'div';
  const {Bar,Backdrop,ResponsiveContainer,PieChart,Pie,Cell,Tooltip,ActivityRow,ActivityIcon}=visuals;
  const enter={initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{duration:.6}};
  const dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('pt-BR');
  const field=(label,props)=>h('label',{className:'st-filter-field'},h('span',{},label),h('input',props));

  function StatisticsOverview({data,cash,balanceCents,month,period,onPeriod,onHistory,onSetCategory,isDarkMode=true}) {
    const [activeCategory,setActiveCategory]=React.useState(null),[activeBucket,setActiveBucket]=React.useState(null),
      [filtersOpen,setFiltersOpen]=React.useState(false),[filters,setFilters]=React.useState({query:'',start:'',end:'',min:'',max:'',method:'all'}),[page,setPage]=React.useState(0);
    const change=(key,value)=>{setFilters(previous=>({...previous,[key]:value}));setPage(0);};
    const rows=filterStatisticsRows(data.rows,filters),currentPage=Math.min(page,Math.max(0,Math.ceil(rows.length/5)-1)),buckets=animatedBuckets(data);
    const categories=React.useMemo(()=>data.categories.map((c,index)=>({...c,value:c.amountCents,color:categoryColors[index%categoryColors.length]})),[data.categories]);
    const paidPercent=cash.totalCents?cash.paidCents/cash.totalCents*100:0;
    const selected=buckets.find(b=>b.key===activeBucket);
    return h('div',{className:'st-restored'},
      h(Motion,{...enter,className:'st-balance-head'},h('div',{},h('p',{className:'st-kicker'},'Saldo total em contas'),h('strong',{},money(balanceCents))),
        h('div',{className:'st-periods','aria-label':'Período do gráfico'},[['week','S','Semana'],['month','M','Mês'],['year','A','Ano']].map(([id,letter,label])=>h('button',{type:'button',key:id,'aria-label':label,'aria-pressed':period===id,onClick:()=>{onPeriod(id);setActiveBucket(null);setPage(0);}},letter)))),
      h('div',{className:'st-original-grid'},
        h(Motion,{...enter,className:'st-original-panel st-original-chart'},Backdrop&&h(Backdrop),
          h('div',{className:'st-chart-heading'},h('h2',{},'Recebimentos e despesas'),h('p',{},`${dateLabel(data.start)} a ${dateLabel(data.end)} · confirmados até ${dateLabel(today())}`)),
          h('div',{className:'st-chart-legend'},h('span',{},h('i',{className:'income'}),'Recebimentos'),h('span',{},h('i',{className:'expense'}),'Despesas')),
          h('div',{className:'st-original-bars','aria-label':'Gráfico de registros confirmados'},buckets.map(bucket=>h('button',{type:'button',className:'st-bucket',key:bucket.key,'aria-pressed':activeBucket===bucket.key,
            'aria-label':`${bucket.label}: recebimentos ${money(bucket.incomeCents)}, despesas ${money(bucket.expenseCents)}`,onClick:()=>setActiveBucket(bucket.key)},
            Bar?h(Bar,{key:`${month}-${period}-${bucket.key}-${bucket.incomeCents}-${bucket.expenseCents}`,data:bucket,label:bucket.label,index:buckets.indexOf(bucket),isTarget:false,isDarkMode}):
              h('div',{className:'st-fallback-bar'},h('span',{style:{height:bucket.h1}}),h('span',{style:{height:bucket.h2}}),h('small',{},bucket.label))))),
          h('div',{className:'st-chart-totals'},h('span',{},'Recebimentos ',h('b',{},money(data.incomeCents))),h('span',{},'Despesas ',h('b',{},money(data.expenseCents)))),
          selected&&h('p',{className:'nf-notice',role:'status'},`${selected.label} · recebimentos ${money(selected.incomeCents)} · despesas ${money(selected.expenseCents)}`),
          !data.rows.length&&h('p',{className:'st-empty-note'},'Nenhuma movimentação confirmada neste período. Os pagamentos previstos aparecem abaixo.')),
        h(Motion,{...enter,transition:{duration:.6,delay:.1},className:'st-original-panel st-original-categories'},h('h2',{},'Gastos por Categoria'),
          h('div',{className:'st-category-layout'},h('div',{className:'st-donut'},
            categories.length&&PieChart?h(ResponsiveContainer,{width:'100%',height:210},h(PieChart,{},h(Pie,{data:categories,cx:'50%',cy:'50%',innerRadius:58,outerRadius:80,paddingAngle:8,dataKey:'value',stroke:'none',isAnimationActive:true,animationDuration:900,
              onMouseEnter:(_,index)=>setActiveCategory(index),onMouseLeave:()=>setActiveCategory(null),onClick:(_,index)=>setActiveCategory(activeCategory===index?null:index)},
              categories.map((c,index)=>h(Cell,{key:c.name,fill:c.color,opacity:activeCategory===null||activeCategory===index?1:.4,stroke:activeCategory===index?c.color:'none',strokeWidth:activeCategory===index?4:0}))),
              h(Tooltip,{content:({active,payload})=>active&&payload?.length?h('div',{className:'st-chart-tooltip'},h('strong',{},payload[0].payload.name),h('p',{},money(payload[0].payload.value)),h('small',{},(payload[0].payload.value/(data.expenseCents||1)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%')):null}))):
              h('div',{className:'st-empty-donut','aria-label':'Nenhuma despesa confirmada'},h('span',{},money(data.expenseCents)))),
            h('div',{className:'st-category-legend'},categories.length?categories.map((c,index)=>h(Motion,{key:c.name,className:'st-category-row',animate:{scale:activeCategory===index?1.035:1,opacity:activeCategory===null||activeCategory===index?1:.5},onMouseEnter:()=>setActiveCategory(index),onMouseLeave:()=>setActiveCategory(null)},
              h('button',{type:'button',onClick:()=>setActiveCategory(activeCategory===index?null:index),'aria-pressed':activeCategory===index},h('i',{style:{background:c.color}}),h('span',{},c.name),h('div',{},h('strong',{},money(c.value)),h('small',{},(c.value/(data.expenseCents||1)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'))))):h('p',{className:'st-empty-note'},'Nenhuma despesa confirmada neste período.'))))),
      h('div',{className:'st-original-grid st-cash-grid'},
        h(Motion,{...enter,className:'st-original-panel st-forecast'},h('h2',{},'Previsão desta competência'),h('p',{},monthLabel(month)+' · pagamentos da conta'),
          h('strong',{className:'st-forecast-total'},money(cash.totalCents)),h('div',{className:'st-forecast-parts'},h('span',{},'Pago ',h('b',{},money(cash.paidCents))),h('span',{},'Ainda a pagar ',h('b',{},money(cash.pendingCents)))),
          h('p',{className:'st-forecast-note'},'Inclui faturas e compromissos. Consignados já reduzem o salário líquido.'),cash.unknown>0&&h('p',{},`${cash.unknown} compromisso(s) com valor a informar, além do total.`)),
        h(Motion,{...enter,className:'st-original-panel st-payments'},h('div',{className:'st-payment-head'},h('h2',{},'Pagamentos do mês'),h('span',{},paidPercent.toLocaleString('pt-BR',{maximumFractionDigits:0})+'% pago')),
          h('div',{className:'st-payment-progress',role:'progressbar','aria-label':'Pagamentos realizados da competência','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.round(paidPercent)},h(Motion,{initial:{width:0},animate:{width:`${paidPercent}%`},transition:{duration:1.2,ease:'easeOut'}})),
          h('div',{className:'st-payment-values'},h('div',{},h('span',{},'Saídas da conta realizadas'),h('strong',{},money(cash.paidCents))),h('div',{},h('span',{},'Previsto no mês'),h('strong',{},money(cash.totalCents)))),
          h('p',{className:'st-empty-note'},`Faturas pendentes: ${money(cash.invoiceCents)}. Pagar fatura reduz o saldo sem repetir o gasto da compra.`))),
      h(Motion,{...enter,className:'st-activity-sheet'},h('div',{className:'st-sheet-handle','aria-hidden':true}),h('div',{className:'st-activity-head'},h('h2',{},'Atividade Recente'),h('button',{className:'nf-button quiet',type:'button',onClick:onHistory},'Ver registros')),
        h('div',{className:'st-search-row'},h('input',{type:'search','aria-label':'Buscar por nome ou valor',placeholder:'Buscar por nome ou valor...',value:filters.query,onChange:e=>change('query',e.target.value)}),h('button',{type:'button',className:'nf-button','aria-expanded':filtersOpen,onClick:()=>setFiltersOpen(!filtersOpen)},'Filtros')),
        filtersOpen&&h(Motion,{...enter,className:'st-activity-filters'},field('Início',{type:'date',value:filters.start,onChange:e=>change('start',e.target.value)}),field('Fim',{type:'date',value:filters.end,onChange:e=>change('end',e.target.value)}),
          field('Valor mínimo (R$)',{type:'text',inputMode:'decimal',value:filters.min,placeholder:'0,00',onChange:e=>change('min',e.target.value)}),field('Valor máximo (R$)',{type:'text',inputMode:'decimal',value:filters.max,placeholder:'Ilimitado',onChange:e=>change('max',e.target.value)}),
          h('label',{className:'st-filter-field'},h('span',{},'Método de pagamento'),h('select',{value:filters.method,onChange:e=>change('method',e.target.value)},h('option',{value:'all'},'Todos'),Object.entries(METHODS).map(([id,label])=>h('option',{key:id,value:id},label)))),
          h('button',{type:'button',className:'nf-button quiet',onClick:()=>{setFilters({query:'',start:'',end:'',min:'',max:'',method:'all'});setPage(0);}},'Limpar filtros')),
        h('div',{className:'st-activity-list'},rows.slice(currentPage*5,currentPage*5+5).map((row,index)=>h(Motion,{...enter,key:row.id,layout:true,transition:{duration:.4,delay:index*.06},className:'st-activity-row'},
          row.type==='expense'&&ActivityRow?h(ActivityRow,{id:row.id,icon:ActivityIcon,title:row.description,time:dateLabel(row.date)+' · '+(METHODS[row.paymentMethod]||'Método não informado'),amount:'−'+money(row.amountCents),color:'bg-green-primary',category:row.category||'Outros',onSetCategory,isDarkMode}):h(React.Fragment,{},
            h('span',{className:'st-activity-icon '+(row.type==='income'?'income':'expense'),'aria-hidden':true},row.type==='income'?'↗':'↙'),h('div',{className:'st-activity-name'},h('strong',{},row.description),h('small',{},dateLabel(row.date)+' · '+(row.category||'Recebimento')+' · '+(METHODS[row.paymentMethod]||'Método não informado'))),
            h('strong',{className:row.type==='income'?'st-income':''},(row.type==='income'?'+':'−')+money(row.amountCents)))))),
        !rows.length&&h('div',{className:'nf-empty'},h('strong',{},'Nenhum resultado encontrado'),h('p',{className:'nf-muted'},'Nenhum recebimento ou despesa confirmada neste filtro.')),
        rows.length>5&&h('div',{className:'nf-actions'},h('button',{type:'button',className:'nf-button small',disabled:currentPage===0,onClick:()=>setPage(currentPage-1)},'Anteriores'),h('span',{},`${currentPage*5+1}–${Math.min(currentPage*5+5,rows.length)} de ${rows.length}`),h('button',{type:'button',className:'nf-button small',disabled:(currentPage+1)*5>=rows.length,onClick:()=>setPage(currentPage+1)},'Próximos'))));
  }
  return {StatisticsOverview};
}
