import {today,money,accountBalance,cents,inputMoney} from '../finance.mjs';
import {cashProjection,statisticsData,monthLabel} from '../financial-insights.mjs';
import {cardStatistics,updateCardLimit} from '../card-insights.mjs';
import {createCardsStatisticsUI} from './cards-statistics.mjs';

export function createStatisticsUI(React,{useWallet,useSelectedMonth,selectWorkspaceSection,Modal,createPortal}) {
  const h=React.createElement;
  const {CardsStatistics}=createCardsStatisticsUI(React);
  const metric=(label,value)=>h('div',{className:'nf-metric'},h('span',{},label),h('strong',{},money(value)));
  function Statistics({isDarkMode=true,onBack,onOpenWallet}) {
    const nw=useWallet(),[month,setMonth]=useSelectedMonth(),[period,setPeriod]=React.useState('month'),[page,setPage]=React.useState(0),[view,setView]=React.useState('overview'),[editingLimit,setEditingLimit]=React.useState(null),[notice,setNotice]=React.useState('');
    const data=statisticsData(nw.state,month,period),cash=cashProjection(nw.state,month);
    const credit=cardStatistics(nw.state,month);
    const manage=()=>{selectWorkspaceSection('accounts');onOpenWallet?.();};
    React.useEffect(()=>{
      if(!editingLimit||!createPortal)return;
      const root=document.getElementById('root'),wasInert=root?.inert;
      if(root)root.inert=true;
      return()=>{if(root)root.inert=wasInert;};
    },[!!editingLimit]);
    const max=Math.max(1,...data.buckets.flatMap(b=>[b.incomeCents,b.expenseCents]));
    const currentPage=Math.min(page,Math.max(0,Math.ceil(data.rows.length/5)-1));
    const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('pt-BR');
    return h('main',{className:'nf-theme nf-workspace nf-statistics','data-theme':isDarkMode?'dark':'light'},
      h('header',{className:'nf-workspace-head'},h('div',{},h('button',{type:'button',className:'nf-button quiet',onClick:onBack},'Voltar'),h('h1',{},'Estatísticas')),
        h('label',{className:'nf-month'},'Competência',h('input',{type:'month',value:month,min:'2000-01',max:'2200-12','aria-label':'Competência',onChange:e=>{if(e.target.value){setMonth(e.target.value);setPage(0);}}}))),
      h('p',{className:'st-intro'},'Seu mês, suas faturas e o crédito já comprometido.'),
      h('nav',{className:'st-view-tabs','aria-label':'Seções das estatísticas'},[['overview','Resumo do mês'],['cards','Cartões e faturas']].map(([id,label])=>h('button',{key:id,type:'button','aria-current':view===id?'page':undefined,onClick:()=>setView(id)},label))),
      !nw.loaded?h('p',{role:'status',className:'nf-notice'},nw.error||'Carregando seu financeiro…'):nw.error?h('p',{role:'alert',className:'nf-error'},nw.error):null,
      notice&&h('p',{className:'nf-notice',role:'status'},notice),
      view==='cards'?h(CardsStatistics,{report:credit,state:nw.state,month,onEditLimit:card=>{setNotice('');setEditingLimit(card);},onManage:manage}):h(React.Fragment,{},
      h('div',{className:'nf-metrics'},metric('Saldo atual das contas',nw.state.accounts.reduce((v,a)=>v+accountBalance(nw.state,a.id),0)),metric('Recebimentos no período',data.incomeCents),metric('Despesas realizadas no período',data.expenseCents)),
      h('button',{className:'st-credit-overview',type:'button',onClick:()=>setView('cards')},h('div',{},h('span',{className:'nf-eyebrow'},'Cartões de crédito'),h('strong',{},money(credit.selectedPendingCents)+' em faturas do mês'),h('p',{},`${credit.cards.length} cartão(ões) · consulte limites, pagamentos e parcelas futuras`)),h('span',{className:'st-credit-link'},'Analisar cartões →')),
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
        data.rows.length>5?h('div',{className:'nf-actions'},h('button',{type:'button',className:'nf-button small',disabled:currentPage===0,onClick:()=>setPage(currentPage-1)},'Anteriores'),h('span',{},`${currentPage*5+1}–${Math.min(currentPage*5+5,data.rows.length)} de ${data.rows.length}`),h('button',{type:'button',className:'nf-button small',disabled:(currentPage+1)*5>=data.rows.length,onClick:()=>setPage(currentPage+1)},'Próximos')):null)),
      editingLimit&&(()=>{
        const current=nw.state.cards.find(c=>c.id===editingLimit.id)||editingLimit;
        const dialog=h('div',{className:'nf-theme','data-theme':isDarkMode?'dark':'light'},h(Modal,{title:'Limite de crédito · '+current.name,onClose:()=>setEditingLimit(null),hint:'Informe o limite total do cartão no banco. Deixe vazio se ainda não souber. O saldo da conta e o cheque especial ficam separados.',onSubmit:async fd=>{const raw=String(fd.get('limit')||'').trim();await nw.save(s=>updateCardLimit(s,current.id,raw?cents(raw):null));setNotice('Limite atualizado. As faturas e os pagamentos foram preservados.');}},h('label',{className:'nf-field full'},h('span',{},'Limite total do cartão (R$)'),h('input',{name:'limit',type:'text',inputMode:'decimal',placeholder:'0,00',defaultValue:current.creditLimitCents==null?'':inputMoney(current.creditLimitCents)}))));
        return createPortal?createPortal(dialog,document.body):dialog;
      })());
  }
  return {Statistics};
}
