import {money,today} from '../finance.mjs';
import {monthLabel} from '../financial-insights.mjs';
import {createCardStatementUI} from './card-statement.mjs';

const colors={'bg-purple-600':'#ad82f5','bg-red-600':'#ee8991','bg-blue-600':'#82b4f5','bg-green-600':'#81c784','bg-zinc-800':'#b6c0cd'};
const shortMonth=month=>new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short'}).replace('.','')+'/'+month.slice(2,4);
const dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('pt-BR');
const status=(invoice)=>invoice.remainingCents<=0?'Quitada':invoice.paidCents>0?'Pagamento parcial':invoice.date<today()?'Em atraso':invoice.date===today()?'Vence hoje':'A vencer';

export function createCardsStatisticsUI(React,{motion,visuals={}}={}) {
  const h=React.createElement,Motion=motion?.div||'div';
  const {CardStatement}=createCardStatementUI(React);
  const value=(label,amount,kind='')=>h('div',{className:'sc-value '+kind},h('span',{},label),h('strong',{},amount===null?'Não informado':money(amount)));
  const cardIcon=()=>h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.5,'aria-hidden':true},h('rect',{x:3,y:5,width:18,height:14,rx:3}),h('path',{d:'M3 10h18 M7 15h4'}));

  function Invoice({invoice,state}) {
    const paid=state.entries.filter(e=>e.type==='card_payment'&&e.status==='posted'&&e.date<=today()&&e.cardId===invoice.cardId&&e.invoiceDate===invoice.date);
    return h('details',{className:'sc-invoice'},h('summary',{},h('div',{},h('strong',{},invoice.name),h('span',{},'Vencimento '+dateLabel(invoice.date))),
      h('span',{className:'sc-status'+(invoice.date<today()&&invoice.remainingCents>0?' overdue':'')},status(invoice)),h('strong',{className:'sc-invoice-amount'},money(Math.max(0,invoice.remainingCents))),h('span',{className:'sc-chevron','aria-hidden':true},'⌄')),
      h('div',{className:'sc-invoice-body'},h('div',{className:'sc-invoice-totals'},value('Total da fatura',invoice.totalCents),value('Pago',invoice.paidCents,'positive'),value('Em aberto',Math.max(0,invoice.remainingCents))),
        h('h4',{},'Composição da fatura'),invoice.items.map((item,n)=>h('div',{key:n,className:'sc-detail-row'},h('div',{},h('strong',{},item.description),item.installment&&h('span',{},'Parcela '+item.installment)),h('b',{},money(item.amountCents)))),
        paid.length?h(React.Fragment,{},h('h4',{},'Pagamentos registrados'),paid.map(e=>h('div',{key:e.id,className:'sc-detail-row'},h('span',{},dateLabel(e.date)),h('b',{},money(e.amountCents))))):h('p',{className:'nf-muted'},'Nenhum pagamento confirmado para esta fatura.')));
  }

  function CardDetails({c,month,onEditLimit}) {
        const percent=c.usedPercent,over=c.overLimitCents>0;
        const last4=(c.card.display?.number||'').replace(/\D/g,'').slice(-4);
    return h('article',{key:c.id,className:'sc-card'+(over?' over-limit':''),style:{'--sc-accent':colors[c.card.display?.color]||'#81c784'}},
          h('header',{},h('div',{className:'sc-card-icon'},cardIcon()),h('div',{className:'sc-card-name'},h('small',{},c.bank),h('h3',{},c.name)),last4&&h('span',{className:'sc-last4'},'•• '+last4)),
          h('div',{className:'sc-card-main'},h('div',{},h('span',{},'Fatura em aberto · '+shortMonth(month)),h('strong',{},money(c.selectedPendingCents))),h('div',{},h('span',{},'Pago nesta fatura'),h('b',{},money(c.selectedPaidCents)))),
          h('div',{className:'sc-limit-values'},value('Limite total',c.limitCents),value('Comprometido',c.usedCents),value('Disponível estimado',c.availableCents,'positive')),
          c.limitCents!==null?h('div',{className:'sc-limit-meter'},h('div',{role:'progressbar','aria-label':'Utilização do limite de '+c.name,'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.min(100,Math.round(percent??(c.usedCents>0?100:0))),'aria-valuetext':`${money(c.usedCents)} comprometidos de ${money(c.limitCents)}`},h('span',{style:{width:`${Math.min(100,percent??(c.usedCents>0?100:0))}%`}})),h('p',{},percent===null?(c.usedCents?'Limite informado: zero':'Sem limite contratado'):percent.toLocaleString('pt-BR',{maximumFractionDigits:1})+'% comprometido')):h('p',{className:'sc-limit-empty'},'Informe o limite para calcular o disponível.'),
          over&&h('p',{className:'sc-over-note'},`As faturas cadastradas superam o limite informado em ${money(c.overLimitCents)}. Confira o limite, as parcelas e os encargos com o banco.`),
          h('div',{className:'sc-card-foot'},h('div',{},h('span',{},`Fecha dia ${c.card.closingDay} · vence dia ${c.card.dueDay}`),h('small',{},c.nextInvoice?'Próxima pendente: '+dateLabel(c.nextInvoice.date):'Nenhuma fatura pendente cadastrada')),
            h('button',{type:'button',className:'nf-button quiet small',onClick:()=>onEditLimit(c.card)},c.limitCents===null?'Informar limite':'Editar limite')));
  }

  function CardsStatistics({report,state,month,onEditLimit,onManage}) {
    const [selectedCardId,setCardId]=React.useState('all'),[invoiceView,setInvoiceView]=React.useState('month');
    const cardId=report.cards.some(c=>c.id===selectedCardId)?selectedCardId:'all';
    const selected=report.cards.filter(c=>cardId==='all'||c.id===cardId);
    const invoiceRows=selected.flatMap(c=>invoiceView==='month'?c.selected:c.open).sort((a,b)=>a.date.localeCompare(b.date));
    const available=report.availableCents,configured=report.configuredCount;
    const timeline=report.timeline.map(m=>{const byCard=m.byCard.filter(c=>cardId==='all'||c.id===cardId);return {...m,byCard,pendingCents:byCard.reduce((v,c)=>v+c.amountCents,0)};});
    const max=Math.max(1,...timeline.map(m=>m.pendingCents));
    return h('div',{className:'sc-module'},
      h('div',{className:'sc-summary'},
        h('div',{},h('span',{},'Faturas em aberto · '+monthLabel(month)),h('strong',{},money(report.selectedPendingCents)),h('small',{},'Pagamentos registrados: '+money(report.selectedPaidCents))),
        h('div',{},h('span',{},'Comprometido em todos os meses'),h('strong',{},money(report.usedCents)),h('small',{},'Faturas abertas + parcelas futuras cadastradas')),
        h('div',{},h('span',{},'Limite disponível estimado'),h('strong',{},available===null?'Informe os limites':money(available)),h('small',{},`${configured} de ${report.cards.length} cartão(ões) com limite informado`))),
      h('div',{className:'sc-section-head'},h('div',{},h('p',{className:'nf-eyebrow'},'Seu crédito, por cartão'),h('h2',{},'Limites e faturas')),h('button',{className:'nf-button small',type:'button',onClick:onManage},'Gerenciar cartões')),
      report.cards.length?h('div',{className:'sc-card-gallery'},report.cards.map((c,index)=>h('button',{key:c.id,type:'button',className:'sc-card-preview'+(cardId===c.id?' selected':''),'aria-label':(cardId===c.id?'Recolher':'Expandir')+' '+c.name,'aria-expanded':cardId===c.id,'aria-controls':'sc-expanded-card',onClick:()=>setCardId(cardId===c.id?'all':c.id)},
        visuals.Card?h(visuals.Card,{index,name:c.card.display?.holder||c.name,bank:c.bank,number:c.card.display?.number||'•••• •••• •••• ••••',color:c.card.display?.color||'bg-green-dark',isFocused:cardId===c.id,readOnly:true,onClick:()=>setCardId(cardId===c.id?'all':c.id)}):h('div',{className:'sc-card-fallback',style:{background:colors[c.card.display?.color]||'#287b34'}},h('strong',{},c.card.display?.holder||c.name),h('small',{},c.bank),h('span',{},c.card.display?.number||'•••• •••• •••• ••••')),
        h('span',{className:'sc-card-preview-caption'},c.name+' · '+(cardId===c.id?'Recolher detalhes ↑':'Fatura e extrato ↓'))))):h('div',{className:'nf-empty'},h('strong',{},'Cadastre seus cartões'),h('p',{className:'nf-muted'},'Os limites e as faturas cadastradas aparecerão aqui.')),
      cardId!=='all'&&selected.length>0&&h(Motion,{key:cardId,id:'sc-expanded-card',className:'sc-expanded-card',initial:{opacity:0,height:0,y:12},animate:{opacity:1,height:'auto',y:0},transition:{duration:.35,ease:'easeOut'}},h(CardDetails,{c:selected[0],month,onEditLimit}),h(CardStatement,{key:cardId,state,card:selected[0].card})),
      h('details',{className:'sc-explanation'},h('summary',{},'Como calculamos o limite disponível'),h('p',{},'Limite informado menos o saldo de todas as faturas abertas, incluindo parcelas futuras. Pagamentos confirmados reduzem esse saldo. É uma estimativa pelos registros: compras não cadastradas, encargos e regras de liberação do banco podem alterar o limite real. O saldo da conta e o cheque especial não entram no limite do cartão.')),
      h('section',{className:'nf-panel sc-invoices'},h('div',{className:'sc-section-head'},h('div',{},h('p',{className:'nf-eyebrow'},'Confira cada vencimento'),h('h2',{},'Faturas e pagamentos')),
          h('label',{className:'sc-filter'},'Cartão',h('select',{value:cardId,onChange:e=>setCardId(e.target.value)},h('option',{value:'all'},'Todos os cartões'),report.cards.map(c=>h('option',{key:c.id,value:c.id},c.name))))),
        h('div',{className:'sc-invoice-tabs'},[['month','Da competência'],['open','Todas em aberto']].map(([id,label])=>h('button',{type:'button',key:id,className:'nf-button small','aria-pressed':invoiceView===id,onClick:()=>setInvoiceView(id)},label))),
        invoiceRows.length?invoiceRows.map(i=>h(Invoice,{key:i.key,invoice:i,state})):h('div',{className:'nf-empty'},h('strong',{},'Nenhuma fatura neste filtro'),h('p',{className:'nf-muted'},'Escolha outra competência ou consulte todas as faturas em aberto.'))),
      h('section',{className:'nf-panel sc-future'},h('p',{className:'nf-eyebrow'},'O que já está comprometido'),h('h2',{},'Próximas faturas · 6 meses'),h('p',{className:'nf-muted'},(cardId==='all'?'Todos os cartões. ':selected[0]?.name+'. ')+'Valores em aberto já cadastrados. Novas compras não estão projetadas.'),
        h('div',{className:'sc-timeline'},timeline.map(m=>h('div',{key:m.month,className:'sc-timeline-month'},h('strong',{},money(m.pendingCents)),
          h('div',{className:'sc-timeline-bar','aria-hidden':true},m.byCard.filter(c=>c.amountCents>0).map(c=>h('span',{key:c.id,title:c.name,style:{height:`${c.amountCents/max*100}%`,background:colors[report.cards.find(card=>card.id===c.id)?.card.display?.color]||'#81c784'}}))),h('span',{},shortMonth(m.month))))),
        h('div',{className:'sc-legend'},selected.map(c=>h('span',{key:c.id},h('i',{style:{background:colors[c.card.display?.color]||'#81c784'} }),c.name))),
        h('details',{className:'sc-explanation'},h('summary',{},'Valores por cartão e mês'),timeline.map(m=>h('div',{key:m.month,className:'sc-month-detail'},h('h4',{},monthLabel(m.month)),m.byCard.map(c=>h('div',{key:c.id,className:'sc-detail-row'},h('span',{},c.name),h('b',{},money(c.amountCents)))))))),
      report.overdrafts.length>0&&h('section',{className:'nf-panel sc-overdraft'},h('p',{className:'nf-eyebrow'},'Limite da conta'),h('h2',{},'Cheque especial'),h('p',{className:'nf-muted'},'Separado dos cartões. O valor utilizado acompanha o saldo negativo atual da conta.'),
        report.overdrafts.map(o=>h('div',{key:o.account.id,className:'sc-overdraft-row'},h('h3',{},o.account.name),h('div',{className:'sc-limit-values'},value('Limite da conta',o.limitCents),value('Utilizado',o.usedCents),value('Disponível estimado',o.availableCents,'positive'))))));
  }
  return {CardsStatistics};
}
