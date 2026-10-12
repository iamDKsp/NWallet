import {money,METHODS} from '../finance.mjs';
import {cardStatement} from '../card-insights.mjs';

const dateLabel=date=>new Date(date+'T12:00:00').toLocaleDateString('pt-BR');
const kinds={purchase:'Compra',payment:'Pagamento de fatura',opening:'Saldo / parcela anterior'};

export function createCardStatementUI(React) {
  const h=React.createElement;
  function CardStatement({state,card}) {
    const [query,setQuery]=React.useState(''),[kind,setKind]=React.useState('all'),[start,setStart]=React.useState(''),[end,setEnd]=React.useState(''),[page,setPage]=React.useState(0);
    const statement=React.useMemo(()=>cardStatement(state,card.id),[state,card.id]);
    const search=query.trim().toLocaleLowerCase('pt-BR');
    const rows=statement.rows.filter(row=>(kind==='all'||row.kind===kind)&&(!start||row.date>=start)&&(!end||row.date<=end)&&
      (!search||[row.description,row.category,kinds[row.kind],money(row.amountCents)].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(search)));
    const currentPage=Math.min(page,Math.max(0,Math.ceil(rows.length/10)-1));
    const filter=fn=>e=>{fn(e.target.value);setPage(0);};
    const metric=(label,amount)=>h('div',{},h('span',{},label),h('strong',{},money(amount)));
    return h('section',{className:'sc-statement','aria-label':'Extrato de '+card.name},
      h('div',{className:'sc-section-head'},h('div',{},h('p',{className:'nf-eyebrow'},'Todo o histórico cadastrado'),h('h3',{},'Extrato do cartão'))),
      h('p',{className:'nf-muted'},'Compras aparecem uma vez pelo valor total, com suas parcelas nos detalhes. Pagamentos de fatura são mostrados separadamente.'),
      h('div',{className:'sc-statement-totals'},metric('Compras registradas',statement.purchaseCents),metric('Saldos e parcelas anteriores',statement.openingCents),metric('Pagamentos confirmados',statement.paymentCents)),
      statement.openingCents>0&&h('p',{className:'nf-notice'},'Os saldos e as parcelas trazidos para o controle têm a descrição e o vencimento cadastrados. Um total de fatura não informa cada compra, sua categoria ou a data original.'),
      h('div',{className:'sc-statement-filters'},h('label',{},h('span',{},'Buscar no extrato'),h('input',{type:'search',value:query,placeholder:'Descrição, categoria ou valor',onChange:filter(setQuery)})),
        h('label',{},h('span',{},'Tipo de registro'),h('select',{value:kind,onChange:filter(setKind)},h('option',{value:'all'},'Todos os registros'),Object.entries(kinds).map(([value,label])=>h('option',{key:value,value},label)))),
        h('label',{},h('span',{},'De'),h('input',{type:'date',value:start,onChange:filter(setStart)})),h('label',{},h('span',{},'Até'),h('input',{type:'date',value:end,onChange:filter(setEnd)}))),
      h('p',{className:'nf-muted'},`${rows.length} registro(s) neste filtro · datas das compras e pagamentos; vencimentos para saldos anteriores.`),
      rows.slice(currentPage*10,currentPage*10+10).map(row=>h('article',{key:row.id,className:'sc-statement-row '+row.kind},
        h('div',{className:'sc-statement-main'},h('div',{},h('span',{className:'sc-statement-kind'},kinds[row.kind]),h('strong',{},row.description),
          h('small',{},(row.dateKind==='due'?'Vencimento: ':row.dateKind==='payment'?'Pago em: ':'Compra em: ')+dateLabel(row.date)),
          row.kind==='purchase'&&h('small',{},(row.category||'Categoria não informada')+' · '+(METHODS[row.paymentMethod]||'Método não informado')+(row.schedule.length>1?` · ${row.schedule.length} parcelas`:'')),
          row.kind==='payment'&&h('small',{},'Fatura com vencimento em '+dateLabel(row.invoiceDate))),
          h('b',{},(row.kind==='payment'?'−':'')+money(row.amountCents))),
        row.kind==='purchase'&&row.schedule.length>0&&h('details',{},h('summary',{},'Parcelas e faturas desta compra'),row.schedule.map(part=>h('div',{key:part.number,className:'sc-detail-row'},h('span',{},`Parcela ${part.number}/${part.count} · fatura ${dateLabel(part.date)}`),h('b',{},money(part.amountCents))))))),
      !rows.length&&h('div',{className:'nf-empty'},h('strong',{},'Nenhum registro neste filtro'),h('p',{className:'nf-muted'},statement.rows.length?'Ajuste a busca, o tipo ou as datas.':'As compras e os pagamentos cadastrados para este cartão aparecerão aqui.')),
      rows.length>10&&h('div',{className:'sc-statement-pagination'},h('button',{type:'button',className:'nf-button small',disabled:currentPage===0,onClick:()=>setPage(currentPage-1)},'Anteriores'),h('span',{},`${currentPage*10+1}–${Math.min(currentPage*10+10,rows.length)} de ${rows.length}`),h('button',{type:'button',className:'nf-button small',disabled:(currentPage+1)*10>=rows.length,onClick:()=>setPage(currentPage+1)},'Próximos')));
  }
  return {CardStatement};
}
