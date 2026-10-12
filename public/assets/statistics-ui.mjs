import {today,money,accountBalance} from '../finance.mjs';
import {cashProjection,statisticsData,monthLabel} from '../financial-insights.mjs';

export function createStatisticsUI(React,{useWallet,useSelectedMonth,selectWorkspaceSection}) {
  const h=React.createElement;
  const metric=(label,value)=>h('div',{className:'nf-metric'},h('span',{},label),h('strong',{},money(value)));
  function Statistics({isDarkMode=true,onBack,onOpenWallet}) {
    const nw=useWallet(),[month,setMonth]=useSelectedMonth(),[period,setPeriod]=React.useState('month'),[page,setPage]=React.useState(0);
    const data=statisticsData(nw.state,month,period),cash=cashProjection(nw.state,month);
    const max=Math.max(1,...data.buckets.flatMap(b=>[b.incomeCents,b.expenseCents]));
    const currentPage=Math.min(page,Math.max(0,Math.ceil(data.rows.length/5)-1));
    const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('pt-BR');
    return h('main',{className:'nf-theme nf-workspace nf-statistics','data-theme':isDarkMode?'dark':'light'},
      h('header',{className:'nf-workspace-head'},h('div',{},h('button',{type:'button',className:'nf-button quiet',onClick:onBack},'Voltar'),h('h1',{},'Estatísticas')),
        h('label',{className:'nf-month'},'Competência',h('input',{type:'month',value:month,min:'2000-01',max:'2200-12','aria-label':'Competência',onChange:e=>{if(e.target.value){setMonth(e.target.value);setPage(0);}}}))),
      !nw.loaded?h('p',{role:'status',className:'nf-notice'},nw.error||'Carregando seu financeiro…'):nw.error?h('p',{role:'alert',className:'nf-error'},nw.error):null,
      h('div',{className:'nf-metrics'},metric('Saldo atual das contas',nw.state.accounts.reduce((v,a)=>v+accountBalance(nw.state,a.id),0)),metric('Recebimentos no período',data.incomeCents),metric('Despesas realizadas no período',data.expenseCents)),
      h('section',{className:'nf-panel'},h('div',{className:'nf-section-head'},h('div',{},h('h2',{},'Recebimentos e despesas realizadas'),h('p',{className:'nf-muted'},`${dateLabel(data.start)} a ${dateLabel(data.end)} · registros confirmados até ${dateLabel(today())}`)),
        h('div',{className:'nf-actions'},[['week','Semana'],['month','Mês'],['year','Ano']].map(([value,label])=>h('button',{key:value,type:'button',className:'nf-button small','aria-pressed':period===value,onClick:()=>{setPeriod(value);setPage(0);}},label)))),
        data.rows.length?h(React.Fragment,{},h('p',{className:'nf-muted'},'Recebimentos em verde · despesas em vermelho. Transferências e pagamentos de fatura ficam fora.'),
          h('div',{className:'nf-stat-chart','aria-label':'Gráfico de registros confirmados'},data.buckets.map(b=>h('div',{key:b.key,className:'nf-stat-bucket'},
            h('div',{className:'nf-stat-bars','aria-hidden':true},h('span',{className:'income',style:{height:`${b.incomeCents/max*100}%`}}),h('span',{className:'expense',style:{height:`${b.expenseCents/max*100}%`}})),
            h('strong',{},b.label),h('small',{},'Entradas '+money(b.incomeCents)),h('small',{},'Despesas '+money(b.expenseCents)))))):
          h('div',{className:'nf-empty'},h('strong',{},'Nenhuma movimentação confirmada neste período'),h('p',{className:'nf-muted'},'Os pagamentos previstos aparecem no resumo abaixo. Saldos iniciais não são receitas ou despesas.'))),
      h('section',{className:'nf-panel'},h('h2',{},'Pagamentos da competência'),h('p',{className:'nf-muted'},monthLabel(month)+' · faturas e compromissos pagos pela conta; consignados já reduzem o salário líquido.'),
        h('div',{className:'nf-metrics'},metric('Saídas da conta realizadas',cash.paidCents),metric('Ainda a pagar',cash.pendingCents),metric('Total pago + pendente',cash.totalCents)),
        cash.unknown?h('p',{className:'nf-notice'},`${cash.unknown} compromisso(s) com valor a informar, além dos totais acima.`):null,
        h('p',{className:'nf-muted'},`Faturas pendentes: ${money(cash.invoiceCents)}. Pagar fatura reduz o saldo da conta sem repetir o gasto da compra.`)),
      h('section',{className:'nf-panel'},h('h2',{},'Gastos por categoria no período'),data.categories.length?data.categories.map(c=>h('div',{key:c.name,className:'nf-row'},h('strong',{},c.name),h('span',{},money(c.amountCents)))):h('p',{className:'nf-muted'},'Nenhuma despesa confirmada neste período.')),
      h('section',{className:'nf-panel'},h('div',{className:'nf-section-head'},h('h2',{},'Atividade do período'),h('button',{type:'button',className:'nf-button small',onClick:()=>{selectWorkspaceSection('history');onOpenWallet?.();}},'Ver registros')),
        data.rows.slice(currentPage*5,currentPage*5+5).map(e=>h('div',{key:e.id,className:'nf-row'},h('div',{},h('strong',{},e.description),h('p',{className:'nf-muted'},dateLabel(e.date)+' · '+(e.category||'Recebimento'))),h('strong',{},money(e.amountCents)))),
        !data.rows.length?h('p',{className:'nf-muted'},'Nenhum recebimento ou despesa confirmada neste período.'):null,
        data.rows.length>5?h('div',{className:'nf-actions'},h('button',{type:'button',className:'nf-button small',disabled:currentPage===0,onClick:()=>setPage(currentPage-1)},'Anteriores'),h('span',{},`${currentPage*5+1}–${Math.min(currentPage*5+5,data.rows.length)} de ${data.rows.length}`),h('button',{type:'button',className:'nf-button small',disabled:(currentPage+1)*5>=data.rows.length,onClick:()=>setPage(currentPage+1)},'Próximos')):null));
  }
  return {Statistics};
}
