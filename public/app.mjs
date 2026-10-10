import {SCOPES,METHODS,SOURCES,CATEGORIES,money,today,uid,cents,inputMoney,addMonths,splitAmount,emptyState,validateLedger,entryScope,accountBalance,invoices,summary} from './finance.mjs';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {
  home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  history:'<path d="M4 7h16M4 12h16M4 17h10"/>',
  wallet:'<path d="M20 8V5H4v15h16V8H4"/><path d="M20 11h-6v5h6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  income:'<path d="M7 17 17 7M7 7h10v10"/>',
  expense:'<path d="m7 7 10 10M7 17h10V7"/>',
  transfer:'<path d="M3 7h17m-5-4 5 4-5 4M21 17H4m5-4-5 4 5 4"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  edit:'<path d="m15 4 5 5-11 11H4v-5zM13 6l5 5"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  refresh:'<path d="M20 7a8 8 0 1 0 0 10M20 3v5h-5"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  bank:'<path d="m3 8 9-5 9 5H3zm1 13h16M6 11v7m6-7v7m6-7v7"/>',
  chart:'<path d="M4 3v18h17M8 17v-4m5 4V9m5 8V5"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  loan:'<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h4"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.wallet}</svg>`;
const fmtDate = date => new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
const monthName = date => new Date(date+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const titles = {home:'Meu financeiro',history:'Movimentações',wallet:'Contas e cartões',calendar:'Compromissos',settings:'Meu controle'};
let state=emptyState(), revision=0, view='home', scope='all', month=today().slice(0,7), privacy=false, busy=false, lastSaved='', query='', typeFilter='all', statusFilter='all', toastTimer;
const cash = value => privacy?'R$ •••••':money(value);

async function load() {
  const response = await fetch('/api/wallet',{cache:'no-store'});
  if (!response.ok) throw new Error('Não foi possível acessar seus dados. Confira se o servidor está disponível.');
  const data = await response.json(); validateLedger(data.state);
  state=data.state; revision=data.revision; lastSaved='Dados carregados';
}
async function save(mutate) {
  if (busy) throw new Error('Aguarde o salvamento em andamento.');
  const next = structuredClone(state); mutate(next); validateLedger(next);
  busy=true;
  document.querySelectorAll('#editor button').forEach(b=>b.disabled=true);
  try {
    const response = await fetch('/api/wallet',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,state:next})});
    const result = await response.json();
    if (response.status===409) { await load(); render(); }
    if (!response.ok) throw new Error(result.error || 'Falha ao salvar. Tente novamente.');
    state=result.state; revision=result.revision; lastSaved='Salvo agora'; render();
  } finally { busy=false; document.querySelectorAll('#editor button').forEach(b=>b.disabled=false); }
}
function toast(message) {
  $('#toast').textContent=message; $('#toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);
}
const empty = (title,text,action='',label='') => `<div class="empty">${icon('wallet')}<strong>${title}</strong><p>${text}</p>${action?`<button class="button small" data-action="${action}">${label}</button>`:''}</div>`;
const button = (action,label,ico='plus',klass='') => `<button class="button ${klass}" data-action="${action}">${icon(ico)}${label}</button>`;
const nav = mobile => `<nav class="${mobile?'mobile-nav':'navigation'}" aria-label="Navegação principal">${Object.entries(titles).map(([id,label])=>`<button class="${mobile?'':'nav-item '}${view===id?'active':''}" data-view="${id}" ${view===id?'aria-current="page"':''}>${icon(id)}<span>${({home:'Visão geral',history:'Registros',wallet:'Carteira',calendar:'Agenda',settings:'Ajustes'})[id]}</span></button>`).join('')}</nav>`;
function render() {
  $('#app').innerHTML=`<aside class="sidebar"><div class="brand"><span class="brand-symbol">N</span>NWallet</div><div class="eyebrow">Seu espaço financeiro</div>${nav(false)}<div class="sidebar-foot"><span class="status-dot"></span>${esc(lastSaved)}<p>Um registro de cada vez.<br>Mais clareza a cada dia.</p></div></aside>
    <main class="shell"><div class="mobile-header"><div class="brand"><span class="brand-symbol">N</span>NWallet</div><small><span class="status-dot"></span>${esc(lastSaved)}</small></div>
    <header class="topbar"><div><div class="eyebrow">Seu dinheiro, com clareza</div><h1>${titles[view]}</h1></div><div class="top-controls"><button class="icon-button" data-action="privacy" aria-label="${privacy?'Mostrar':'Ocultar'} valores" aria-pressed="${privacy}">${icon('eye')}</button>${view!=='settings'?button('new-entry','Registrar','plus','primary'):button('refresh','Atualizar','refresh')}</div></header>
    ${view!=='settings'?`<div class="toolbar"><div class="segments" role="group" aria-label="Filtrar por contexto">${[['all','Tudo'],...Object.entries(SCOPES)].map(([id,label])=>`<button data-scope="${id}" class="${scope===id?'active':''}" aria-pressed="${scope===id}">${label}</button>`).join('')}</div>${view!=='wallet'?`<label class="month-input">${icon('calendar')}<input type="month" id="month" aria-label="Mês de referência" min="2000-01" max="2200-12" value="${month}"></label>`:''}</div>`:''}
    ${({home:homeView,history:historyView,wallet:walletView,calendar:calendarView,settings:settingsView})[view]()}</main>${nav(true)}`;
}
function homeView() {
  const s=summary(state,month,scope);
  const recent=state.entries.filter(e=>(scope==='all'||entryScope(state,e)===scope) && e.status==='posted' && e.date<=today()).sort((a,b)=>b.date.localeCompare(a.date)||state.entries.indexOf(b)-state.entries.indexOf(a)).slice(0,5);
  const upcoming=upcomingItems().slice(0,5);
  return `${!state.accounts.length?`<section class="onboarding"><div><div class="eyebrow">O começo da sua jornada</div><h2>Vamos partir da sua realidade.</h2><p>Cadastre uma conta com o saldo que ela tem hoje. Depois, registre as faturas abertas, as parcelas e o dinheiro que ainda vai entrar.</p></div>${button('new-account','Definir meu ponto de partida','plus','primary')}</section>`:''}
    <section class="overview-grid" aria-label="Resumo financeiro"><div class="balance-card"><div class="balance-top"><span class="eyebrow">Saldo em contas · hoje</span>${icon('wallet')}</div><div class="balance-value">${cash(s.balanceCents)}</div><small>${state.accounts.filter(a=>scope==='all'||a.scope===scope).length} conta(s) · disponível em banco e dinheiro</small></div>
    <div class="metric-card"><div class="metric-icon"><div class="eyebrow">Recebido no mês</div><span>${icon('income')}</span></div><div class="metric-value">${cash(s.incomeCents)}</div><small>Entradas confirmadas · ${esc(monthName(month))}</small></div>
    <div class="metric-card"><div class="metric-icon out"><div class="eyebrow">Gastos no mês</div><span>${icon('expense')}</span></div><div class="metric-value">${cash(s.expenseCents)}</div><small>Inclui compras no crédito pelo valor total</small></div></section>
    <section class="forecast"><div class="forecast-title">${icon('calendar')}<div><strong>O que vem pela frente</strong><p>Valores pendentes em ${esc(monthName(month))}</p></div></div><div class="forecast-amounts"><div><small>A receber</small><strong class="positive">${cash(s.receivableCents)}</strong></div><div><small>A pagar + faturas</small><strong class="warning">${cash(s.payableCents)}</strong></div><div><small>Saldo após pendências*</small><strong>${cash(s.balanceCents+s.receivableCents-s.payableCents)}</strong></div></div></section>
    <p class="note">*Saldo de hoje + recebimentos previstos − contas e faturas pendentes do mês selecionado.</p>
    <section class="section"><div class="section-head"><h2>Registrar na hora</h2><span class="eyebrow">Poucos toques, mais clareza</span></div><div class="quick-actions">${[['expense','expense','Paguei / comprei','Pix, cartão ou dinheiro'],['income','income','Recebi','CLT, empresa ou outros'],['transfer','transfer','Transferi','Entre minhas contas'],['commitment','calendar','Tenho a pagar','Contas e empréstimos']].map(([a,i,l,s])=>`<button class="quick-action" data-action="${a}"><span>${icon(i)}</span><div><b>${l}</b><small>${s}</small></div></button>`).join('')}</div></section>
    <div class="lower-grid"><section class="section panel"><div class="section-head"><h2>Últimos registros</h2><button class="text-button" data-view="history">Ver todos →</button></div>${recent.length?`<div class="list">${recent.map(e=>entryRow(e,false)).join('')}</div>`:empty('Sua história começa aqui','As movimentações que você registrar aparecerão aqui.','new-entry','Registrar movimentação')}</section>
    <section class="section panel"><div class="section-head"><h2>Para onde foi?</h2>${icon('chart')}</div>${s.categories.length?s.categories.slice(0,6).map(c=>`<div class="category-row"><div class="category-label"><span>${esc(c.name)}</span><span>${cash(c.amountCents)} <small>· ${Math.round(c.amountCents/s.expenseCents*100)}%</small></span></div><div class="bar"><span style="width:${c.amountCents/s.expenseCents*100}%"></span></div></div>`).join(''):empty('Sem gastos neste mês','Seu mapa de gastos será construído a partir dos seus registros.')}<p class="category-note">Transferências e pagamentos de fatura não entram como novos gastos.</p></section></div>
    <section class="section panel"><div class="section-head"><div><h2>Próximos compromissos</h2><p>Inclui atrasados e próximos vencimentos, de todos os meses.</p></div><button class="text-button" data-view="calendar">Abrir agenda →</button></div>${upcoming.length?upcoming.map(upcomingRow).join(''):empty('Nenhuma pendência registrada','Adicione as contas, parcelas e recebimentos que você já conhece.','commitment','Adicionar compromisso')}</section>`;
}
function entryRow(e,actions=true) {
  const account=state.accounts.find(a=>a.id===e.accountId), card=state.cards.find(c=>c.id===e.cardId), destination=state.accounts.find(a=>a.id===e.toAccountId);
  const detail=e.type==='transfer'?`${account?.name} → ${destination?.name}`:e.type==='card_payment'?`Fatura ${card?.name} · ${account?.name}`:e.type==='income'?`${SOURCES[e.source]} · ${account?.name}`:`${e.category} · ${card?.name||account?.name}`;
  const late=e.status==='planned' && e.date<today();
  return `<div class="list-row"><span class="row-icon ${e.type}">${icon(e.type==='card_payment'?'card':e.type)}</span><div class="row-body"><strong>${esc(e.description)}</strong><small>${esc(detail)} · ${METHODS[e.paymentMethod]}${e.installments>1?` · ${e.installments}x`:''}</small></div><div class="row-value"><strong class="${e.type==='income'?'positive':e.type==='expense'?'negative':''}">${e.type==='income'?'+':e.type==='expense'?'-':''}${cash(e.amountCents)}</strong><small>${fmtDate(e.date)} · ${SCOPES[entryScope(state,e)]}</small>${e.status==='planned'?`<span class="badge ${late?'overdue':'planned'}">${late?'Atrasado':'Previsto'}</span>`:''}</div>${actions?`<div class="row-actions">${e.status==='planned'?`<button class="icon-button positive" data-action="settle" data-id="${esc(e.id)}" aria-label="Confirmar ${esc(e.description)}">${icon('check')}</button>`:''}<button class="icon-button" data-action="edit-entry" data-id="${esc(e.id)}" aria-label="Editar ${esc(e.description)}">${icon('edit')}</button><button class="icon-button" data-action="delete-entry" data-id="${esc(e.id)}" aria-label="Excluir ${esc(e.description)}">${icon('trash')}</button></div>`:''}</div>`;
}
function filteredEntries() {
  const text=query.toLocaleLowerCase('pt-BR');
  return state.entries.filter(e=>(scope==='all'||entryScope(state,e)===scope) && e.date.startsWith(month) && (typeFilter==='all'||e.type===typeFilter) && (statusFilter==='all'||e.status===statusFilter) && (!text||`${e.description} ${e.category||''} ${SOURCES[e.source]||''}`.toLocaleLowerCase('pt-BR').includes(text))).sort((a,b)=>b.date.localeCompare(a.date)||state.entries.indexOf(b)-state.entries.indexOf(a));
}
function historyView() {
  const rows=filteredEntries();
  return `<div class="filter-bar"><input id="query" placeholder="Buscar descrição, categoria ou origem" aria-label="Buscar registros" value="${esc(query)}"><select id="type-filter" aria-label="Tipo de registro">${options({all:'Todos os tipos',income:'Recebimentos',expense:'Gastos',transfer:'Transferências',card_payment:'Pagamentos de fatura'},typeFilter)}</select><select id="status-filter" aria-label="Situação">${options({all:'Todas as situações',posted:'Confirmados',planned:'Previstos'},statusFilter)}</select></div><section class="panel"><div class="section-head"><h2>Seus registros</h2><span class="muted" id="row-count">${rows.length} registro(s)</span></div><div id="history-list">${rows.length?rows.map(e=>entryRow(e)).join(''):empty('Nenhum registro encontrado','Altere os filtros ou registre uma movimentação.','new-entry','Registrar')}</div></section>${journeyView()}`;
}
function journeyView() {
  const start=month+'-01', list=Array.from({length:6},(_,i)=>{const m=addMonths(start,i-5).slice(0,7);return {month:m,...summary(state,m,scope)};});
  const max=Math.max(1,...list.flatMap(s=>[s.incomeCents,s.expenseCents]));
  return `<section class="section panel"><div class="section-head"><div><h2>Sua jornada</h2><p>Recebimentos e gastos dos últimos seis meses · ${SCOPES[scope]||'Pessoal + empresa'}</p></div>${icon('chart')}</div>${list.map(s=>`<div class="category-row"><div class="category-label"><span>${esc(monthName(s.month))}</span><span class="positive">${cash(s.incomeCents)} <span class="muted">/</span> <span class="negative">${cash(s.expenseCents)}</span></span></div><div class="bar"><span style="width:${s.incomeCents/max*100}%"></span></div><div class="bar" style="margin-top:5px"><span style="width:${s.expenseCents/max*100}%;background:var(--red)"></span></div></div>`).join('')}<div class="category-note"><span class="positive">Verde: recebido</span> · <span class="negative">Rosa: gastos, incluindo compras no crédito</span></div></section>`;
}
function walletView() {
  const accounts=state.accounts.filter(a=>scope==='all'||a.scope===scope), cards=state.cards.filter(c=>scope==='all'||c.scope===scope), bills=invoices(state);
  return `<section><div class="section-head"><div><h2>Onde está seu dinheiro</h2><p>O saldo inicial é o ponto de partida, sem contar como receita.</p></div>${button('new-account','Conta','plus','small')}</div>${accounts.length?`<div class="account-grid">${accounts.map(a=>`<article class="account-card"><div class="account-header"><span class="row-icon">${icon(a.kind==='cash'?'wallet':'bank')}</span><span class="badge">${SCOPES[a.scope]}</span><button class="icon-button" data-action="edit-account" data-id="${esc(a.id)}" aria-label="Editar ${esc(a.name)}">${icon('edit')}</button></div><h3>${esc(a.name)}</h3><small>${a.kind==='cash'?'Dinheiro em mãos':'Conta bancária'}</small><div class="account-value">${cash(accountBalance(state,a.id))}</div><small>Inicial: ${cash(a.openingBalanceCents)} em ${fmtDate(a.openingDate)}</small></article>`).join('')}</div>`:empty('Cadastre suas contas','Pode ser sua conta pessoal, a conta da empresa ou o dinheiro na carteira.','new-account','Adicionar conta')}</section>
    <section class="section"><div class="section-head"><div><h2>Seus cartões</h2><p>Compras, parcelas e faturas em um só lugar.</p></div>${button('new-card','Cartão','plus','small')}</div>${cards.length?`<div class="card-grid">${cards.map(c=>{const pending=bills.filter(i=>i.cardId===c.id&&i.remainingCents>0),debt=pending.reduce((v,i)=>v+i.remainingCents,0);return `<article class="credit-card"><div class="card-top">${icon('card')}<span class="badge">${SCOPES[c.scope]}</span><button class="icon-button" data-action="edit-card" data-id="${esc(c.id)}" aria-label="Editar ${esc(c.name)}">${icon('edit')}</button></div><h3>${esc(c.name)}</h3><small>Fecha dia ${c.closingDay} · vence dia ${c.dueDay}</small><div class="metric-value">${cash(debt)}</div><small>Em aberto, incluindo parcelas futuras</small>${pending.length?`<p class="note">Próxima: ${fmtDate(pending[0].date)} · ${cash(pending[0].remainingCents)}</p>`:''}${snapshotList(c)}</article>`;}).join('')}</div>`:empty('Seus cartões ainda não estão aqui','Informe o fechamento, o vencimento e a fatura anterior ao início do controle.','new-card','Adicionar cartão')}</section>
    <p class="note">O valor total da compra entra no mapa de gastos na data da compra. As parcelas entram nas faturas de cada mês. O pagamento da fatura apenas sai da conta bancária.</p>`;
}
function upcomingItems() {
  const entries=state.entries.filter(e=>e.status==='planned' && (scope==='all'||entryScope(state,e)===scope)).map(e=>({kind:'entry',entry:e,date:e.date}));
  const bills=invoices(state).filter(i=>i.remainingCents>0 && (scope==='all'||i.scope===scope)).map(i=>({kind:'invoice',invoice:i,date:i.date}));
  return [...entries,...bills].sort((a,b)=>a.date.localeCompare(b.date));
}
function snapshotList(card) {
  return `<button class="button small" style="margin-top:16px" data-action="opening-invoice" data-id="${esc(card.id)}">${icon('plus')}Parcelas anteriores</button>${card.openingInvoices?.length?`<details class="note"><summary>Valores anteriores cadastrados</summary>${card.openingInvoices.map(i=>`<div class="list-row"><div class="row-body"><strong>${esc(i.description)}</strong><small>${fmtDate(i.date)} · ${cash(i.amountCents)}</small></div><button class="icon-button" data-action="edit-opening-invoice" data-id="${esc(card.id)}" data-invoice="${esc(i.id)}" aria-label="Editar ${esc(i.description)}">${icon('edit')}</button></div>`).join('')}</details>`:''}`;
}
function upcomingRow(item) {
  if (item.kind==='entry') return entryRow(item.entry);
  const i=item.invoice;
  return `<div class="invoice-row"><span class="row-icon">${icon('card')}</span><div class="row-body"><strong>Fatura · ${esc(i.name)}</strong><small>${fmtDate(i.date)} · ${SCOPES[i.scope]}${i.paidCents?` · pago ${cash(i.paidCents)}`:''}</small><span class="badge ${i.date<today()?'overdue':'planned'}">${i.date<today()?'Vencida':'Em aberto'}</span></div><div class="row-value"><strong>${cash(i.remainingCents)}</strong><button class="button small" data-action="pay-invoice" data-id="${esc(i.key)}">Pagar fatura</button></div></div>`;
}
function calendarView() {
  const totals=summary(state,month,scope), upcoming=upcomingItems().filter(i=>i.date.startsWith(month));
  const closed=invoices(state).filter(i=>i.remainingCents===0&&i.totalCents>0&&i.date.startsWith(month)&&(scope==='all'||i.scope===scope));
  const closedRows=closed.length?`<div class="timeline-heading">Faturas quitadas</div>${closed.map(i=>`<div class="invoice-row"><div><strong>${esc(i.name)}</strong><p>${fmtDate(i.date)} · ${SCOPES[i.scope]}</p></div><span class="positive">${icon('check')} ${cash(i.totalCents)}</span></div>`).join('')}`:'';
  return `<div class="debt-summary"><section class="metric-card"><div class="eyebrow">Parcelas de empréstimos · todas</div><div class="metric-value">${cash(totals.debtCents)}</div><small>Total das parcelas ainda não pagas</small></section><section class="metric-card"><div class="eyebrow">Cartões · todas as faturas</div><div class="metric-value">${cash(totals.cardDebtCents)}</div><small>Inclui compras parceladas futuras</small></section></div><section class="panel"><div class="section-head"><div><h2>Agenda de ${esc(monthName(month))}</h2><p>Confirme quando o dinheiro realmente entrar ou sair.</p></div>${button('commitment','Compromisso','plus','small')}</div>${upcoming.length?upcoming.map(upcomingRow).join(''):empty('Nenhuma pendência neste mês','Cadastre uma conta a pagar, um empréstimo ou um recebimento previsto.','commitment','Adicionar compromisso')}${closedRows}</section><p class="note">As parcelas de empréstimos representam os valores que você informou, incluindo juros quando presentes. Contas previstas ficam fora do saldo até serem confirmadas.</p>`;
}
function settingsView() {
  return `<div class="settings-grid"><section class="panel"><h2>Uma cópia do seu controle</h2><p>Exporte todos os registros, contas e cartões para guardar uma cópia. Você pode restaurar essa cópia neste servidor quando precisar.</p>${button('export','Exportar cópia','download','primary')}${button('import','Restaurar cópia','upload')}<input id="import-file" class="hidden" type="file" accept=".json,application/json"><small>Restaurar substitui os dados atuais após sua confirmação.</small></section><section class="panel"><h2>Seu ponto de partida</h2><p>Comece com os saldos atuais, registre as faturas já abertas e cadastre as parcelas que ainda faltam pagar. A partir daí, anote cada entrada e saída.</p>${button('new-account','Adicionar conta','bank')}${button('new-card','Adicionar cartão','card')}${button('commitment','Adicionar empréstimo','loan')}</section><section class="panel"><h2>Como os números se conectam</h2><p>Saldo: dinheiro nas suas contas. Gastos: despesas e compras no crédito. Compromissos: valores previstos e faturas em aberto.</p><div class="hint">O saldo inicial não é receita. Transferir entre suas contas não é gasto. Pagar a fatura não repete a despesa da compra.</div></section><section class="panel"><h2>Seu espaço pessoal</h2><p>Os dados ficam salvos no servidor desta instalação. Abra o mesmo servidor no celular para acessar o mesmo controle. Esta etapa requer conexão com ele.</p><p>Esta versão ainda não tem login. Use em um ambiente privado; autenticação fica para a próxima etapa antes de publicar na internet.</p><a href="/prototipo.html" target="_blank" rel="noopener">Abrir a interface original de referência →</a></section></div>`;
}

function options(values,selected) { return Object.entries(values).map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(selected)?'selected':''}>${esc(l)}</option>`).join(''); }
function accountOptions(selected) { return `<option value="">Selecione uma conta</option>${state.accounts.map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(a.name)} · ${SCOPES[a.scope]}</option>`).join('')}`; }
function cardOptions(selected) { return `<option value="">Selecione um cartão</option>${state.cards.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.name)} · ${SCOPES[c.scope]}</option>`).join('')}`; }
const field = (label,control,full=false) => `<label class="field ${full?'full':''}">${label}${control}</label>`;
const input = (name,value='',type='text',extra='') => `<input name="${name}" type="${type}" value="${esc(value)}" ${extra}>`;
const select = (name,html,extra='') => `<select name="${name}" ${extra}>${html}</select>`;
function openDialog(title,body,submit,onSubmit) {
  const d=$('#editor');
  if(d.open)d.close();
  d.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-button" type="button" data-close aria-label="Fechar">${icon('close')}</button></div><form class="dialog-body">${body}<div class="form-error" role="alert"></div><div class="dialog-actions"><button class="button" type="button" data-close>Cancelar</button><button class="button primary" type="submit">${submit}</button></div></form>`;
  d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(!busy)d.close();});
  d.oncancel=e=>{if(busy)e.preventDefault();};
  const form=d.querySelector('form');
  form.onsubmit=async e=>{
    e.preventDefault(); if(busy)return;
    form.querySelector('.form-error').textContent='';
    try { await onSubmit(new FormData(form),form);d.close(); }
    catch(err){form.querySelector('.form-error').textContent=err.message;}
  };
  d.showModal();
  return form;
}
function openAccount(id) {
  const a=state.accounts.find(a=>a.id===id), editable=!!a;
  const body=`<p>Informe o saldo real da conta na data inicial. Registre apenas as movimentações a partir dessa data.</p><div class="form-grid">${field('Nome da conta',input('name',a?.name,'text','required maxlength="160" placeholder="Ex.: Nubank pessoal"'),true)}${field('Contexto',select('scope',options(SCOPES,a?.scope||(scope==='business'?'business':'personal'))))}${field('Tipo',select('kind',options({bank:'Conta bancária',cash:'Dinheiro em mãos'},a?.kind||'bank')))}${field('Saldo inicial (R$)',input('balance',inputMoney(a?.openingBalanceCents||0),'text','required inputmode="decimal"'))}${field('Data do saldo inicial',input('date',a?.openingDate||today(),'date',`required max="${today()}" min="2000-01-01"`))}</div>${editable?'<div class="hint">Alterar o saldo inicial recalcula o saldo atual. Movimentações já registradas continuam contando.</div>':''}`;
  const form=openDialog(editable?'Editar conta':'Seu ponto de partida',body,'Salvar conta',async fd=>{
    const account={id:a?.id||uid(),name:fd.get('name').trim(),scope:fd.get('scope'),kind:fd.get('kind'),openingBalanceCents:cents(fd.get('balance')),openingDate:fd.get('date')};
    await save(s=>{const i=s.accounts.findIndex(x=>x.id===account.id);if(i>=0)s.accounts[i]=account;else s.accounts.push(account);});toast('Conta salva. Seu ponto de partida está registrado.');
  });
  if(editable) addDeleteButton(form,'Excluir conta',async()=>{
    if(state.entries.some(e=>e.accountId===id||e.toAccountId===id)) throw new Error('Esta conta possui registros vinculados. Remova ou altere os registros antes de excluir.');
    await save(s=>{s.accounts=s.accounts.filter(x=>x.id!==id);});toast('Conta excluída.');
  });
}
function addDeleteButton(form,label,fn) {
  const b=document.createElement('button');b.type='button';b.className='text-button negative';b.textContent=label;b.style.marginTop='18px';
  b.onclick=()=>{openDialog(label,`<p>Esta alteração será salva no seu controle.</p>`,'Confirmar exclusão',async()=>{await fn();});};form.appendChild(b);
}
function openCard(id) {
  const c=state.cards.find(c=>c.id===id);
  const body=`<p>Use um nome para identificar o cartão. Para começar, informe somente a fatura anterior que ainda está em aberto.</p><div class="form-grid">${field('Nome do cartão',input('name',c?.name,'text','required maxlength="160" placeholder="Ex.: Nubank"'),true)}${field('Contexto',select('scope',options(SCOPES,c?.scope||(scope==='business'?'business':'personal'))))}${field('Dia de fechamento',input('closing',c?.closingDay||25,'number','required min="1" max="31"'))}${field('Dia de vencimento',input('due',c?.dueDay||5,'number','required min="1" max="31"'))}${field('Fatura inicial em aberto (R$)',input('debt',inputMoney(c?.openingDebtCents||0),'text','required inputmode="decimal"'))}${field('Vencimento da fatura inicial',input('date',c?.openingDueDate||today(),'date','required min="2000-01-01" max="2200-12-31"'),true)}</div><div class="hint">Não registre novamente compras já incluídas nessa fatura inicial. Depois de salvar, use “Parcelas anteriores” na carteira para informar valores antigos que vencerão nos próximos meses.</div>`;
  const form=openDialog(c?'Editar cartão':'Adicionar cartão',body,'Salvar cartão',async fd=>{
    const card={...c,id:c?.id||uid(),name:fd.get('name').trim(),scope:fd.get('scope'),closingDay:Number(fd.get('closing')),dueDay:Number(fd.get('due')),openingDebtCents:cents(fd.get('debt')),openingDueDate:fd.get('date')};
    await save(s=>{const i=s.cards.findIndex(x=>x.id===card.id);if(i>=0)s.cards[i]=card;else s.cards.push(card);});toast('Cartão salvo.');
  });
  if(c) addDeleteButton(form,'Excluir cartão',async()=>{
    if(state.entries.some(e=>e.cardId===id))throw new Error('Este cartão possui compras ou pagamentos. Remova ou altere os registros antes de excluir.');
    await save(s=>{s.cards=s.cards.filter(x=>x.id!==id);});toast('Cartão excluído.');
  });
}
function openPreviousInvoices(cardId,invoiceId) {
  const card=state.cards.find(c=>c.id===cardId);if(!card)return;
  const item=card.openingInvoices?.find(i=>i.id===invoiceId);
  const body=`<p>Valores de compras feitas antes do início do controle, que ainda vão vencer no cartão ${esc(card.name)}.</p><div class="form-grid">${field('Descrição',input('description',item?.description||'Parcelas anteriores','text','required maxlength="120"'),true)}${field(item?'Valor (R$)':'Total que falta vencer (R$)',input('amount',item?inputMoney(item.amountCents):'','text','required inputmode="decimal"'))}${!item?field('Parcelas mensais restantes',input('count',1,'number','required min="1" max="360"')):''}${field(item?'Vencimento':'Primeiro vencimento',input('date',item?.date||addMonths(today(),1,card.dueDay),'date','required min="2000-01-01" max="2170-12-31"'),true)}</div><div class="hint">Esses valores entram somente nas faturas, sem virar novos gastos. Não inclua valores que você já informou na fatura inicial. Se cada mês tem um valor diferente, cadastre um mês por vez.</div>`;
  const form=openDialog(item?'Editar valor anterior':'Parcelas anteriores do cartão',body,'Salvar nas faturas',async fd=>{
    const total=cents(fd.get('amount')),count=item?1:Number(fd.get('count'));if(!Number.isInteger(count)||count<1||count>360||total<count)throw new Error('Informe um valor positivo e parcelas de pelo menos R$ 0,01.');
    await save(s=>{const c=s.cards.find(c=>c.id===cardId);c.openingInvoices||=[];if(item){const i=c.openingInvoices.find(i=>i.id===invoiceId);Object.assign(i,{description:fd.get('description').trim(),amountCents:total,date:fd.get('date')});}else c.openingInvoices.push(...splitAmount(total,count).map((part,i)=>({id:uid(),description:fd.get('description').trim()+(count>1?` · ${i+1}/${count}`:''),amountCents:part,date:addMonths(fd.get('date'),i)})));});toast('Valores anteriores salvos nas faturas.');
  });
  if(item)addDeleteButton(form,'Excluir valor anterior',async()=>{await save(s=>{const c=s.cards.find(c=>c.id===cardId);c.openingInvoices=c.openingInvoices.filter(i=>i.id!==invoiceId);});toast('Valor anterior excluído.');});
}
function needAccount() {
  if(state.accounts.length)return false;
  openAccount();toast('Comece cadastrando uma conta com o saldo atual.');return true;
}
function openEntry(type='expense',id) {
  if(needAccount())return;
  const existing=state.entries.find(e=>e.id===id);
  if(existing?.type==='card_payment'){openPaymentEdit(existing);return;}
  type=existing?.type||type;
  const firstAccount=state.accounts.find(a=>scope==='all'||a.scope===scope)||state.accounts[0];
  const e=existing||{type,amountCents:0,description:'',date:today(),status:'posted',accountId:firstAccount?.id,paymentMethod:firstAccount?.kind==='cash'?'cash':'pix',category:'Outros',source:firstAccount?.scope==='business'?'company':'clt',installments:1};
  const title=existing?'Editar registro':({expense:'Paguei ou comprei',income:'Recebi',transfer:'Transferi entre contas'})[type];
  const body=`${!existing?`<div class="type-tabs">${['expense','income','transfer'].map(t=>`<button type="button" data-entry-type="${t}" class="${t===type?'active':''}">${({expense:'Gasto',income:'Recebimento',transfer:'Transferência'})[t]}</button>`).join('')}</div>`:''}<div class="form-grid"><label class="field full amount-field">Valor (R$)${input('amount',existing?inputMoney(e.amountCents):'','text','required inputmode="decimal" placeholder="0,00" autofocus')}</label>${field('Descrição',input('description',e.description,'text',`required maxlength="160" placeholder="${type==='income'?'Ex.: Salário de outubro':type==='transfer'?'Ex.: Da empresa para minha conta':'Ex.: Mercado, almoço, aluguel'}"`),true)}${field('Data',input('date',e.date,'date','required min="2000-01-01" max="2200-12-31"'))}${field('Situação',select('status',options({posted:type==='income'?'Já recebi':type==='transfer'?'Já transferi':'Já paguei / comprei',planned:'Previsto'},e.status)))}
    ${type!=='transfer'?field('Forma de pagamento',select('method',options(Object.fromEntries(Object.entries(METHODS).filter(([k])=>type==='expense'||k!=='credit')),e.paymentMethod))):input('method','transfer','hidden')}
    <label class="field" id="account-field">${type==='transfer'?'Conta de origem':'Conta'}${select('account',accountOptions(e.accountId))}</label>
    ${type==='transfer'?field('Conta de destino',select('destination',accountOptions(e.toAccountId))):''}
    ${type==='expense'?`<label class="field hidden" id="card-field">Cartão${select('card',cardOptions(e.cardId))}</label><label class="field hidden" id="installments-field">Parcelas${input('installments',e.installments||1,'number','min="1" max="360"')}</label>${field('Categoria',select('category',options(Object.fromEntries(CATEGORIES.map(c=>[c,c])),e.category)),true)}`:''}
    ${type==='income'?field('Origem do recebimento',select('source',options(SOURCES,e.source)),true):''}</div><div class="hint" id="entry-hint">O registro atualiza o saldo da conta quando confirmado.</div>`;
  const form=openDialog(title,body,'Salvar registro',async fd=>{
    const credit=type==='expense'&&fd.get('method')==='credit';
    const item={...existing,id:existing?.id||uid(),type,description:fd.get('description').trim(),amountCents:cents(fd.get('amount')),date:fd.get('date'),status:credit?'posted':fd.get('status'),paymentMethod:type==='transfer'?'transfer':fd.get('method'),accountId:credit?null:fd.get('account')};
    if(type==='expense'){item.category=fd.get('category');item.cardId=credit?fd.get('card'):null;item.installments=credit?Number(fd.get('installments')):1;}
    if(type==='income')item.source=fd.get('source');
    if(type==='transfer')item.toAccountId=fd.get('destination');
    await save(s=>{const i=s.entries.findIndex(x=>x.id===item.id);if(i>=0)s.entries[i]=item;else s.entries.push(item);});toast('Registro salvo.');
  });
  form.querySelectorAll('[data-entry-type]').forEach(b=>b.onclick=()=>openEntry(b.dataset.entryType));
  const update=()=>{
    const credit=type==='expense'&&form.elements.method.value==='credit';
    const toggle=(id,show)=>{const wrapper=form.querySelector('#'+id);if(wrapper){wrapper.classList.toggle('hidden',!show);wrapper.querySelectorAll('input,select').forEach(i=>{i.disabled=!show;i.required=show;});}};
    toggle('account-field',!credit);toggle('card-field',credit);toggle('installments-field',credit);
    if(credit){form.elements.status.value='posted';form.elements.status.disabled=true;}else form.elements.status.disabled=false;
    $('#entry-hint').textContent=credit?'A compra entra nos gastos pelo valor total; as parcelas vão para as faturas. O saldo da conta muda somente ao pagar a fatura.':type==='transfer'?'A transferência altera os saldos das duas contas, sem gerar receita ou gasto.':form.elements.status.value==='planned'?'Previsto: só entra no saldo quando você confirmar o recebimento ou pagamento.':'A movimentação confirmada atualiza o saldo da conta escolhida.';
  };
  form.elements.method?.addEventListener('change',update);form.elements.status.addEventListener('change',update);update();
}
function openCommitment() {
  if(needAccount())return;
  const body=`<p>Cadastre o que ainda falta pagar ou receber. O saldo só muda quando você confirmar a movimentação.</p><div class="form-grid">${field('O que você quer acompanhar?',select('kind',options({bill:'Conta a pagar',loan:'Empréstimo · parcelas restantes',income:'Recebimento previsto'},'bill')),true)}${field('Descrição',input('description','','text','required maxlength="120" placeholder="Ex.: Aluguel ou empréstimo pessoal"'),true)}${field('Valor total restante (R$)',input('amount','','text','required inputmode="decimal" placeholder="0,00"'))}${field('Quantidade de parcelas',input('count',1,'number','required min="1" max="360"'))}${field('Primeiro vencimento',input('date',today(),'date','required min="2000-01-01" max="2170-12-31"'))}${field('Conta',select('account',accountOptions(state.accounts.find(a=>scope==='all'||a.scope===scope)?.id||state.accounts[0].id),'required'))}<label class="field" id="commitment-category">Categoria${select('category',options(Object.fromEntries(CATEGORIES.map(c=>[c,c])),'Outros'))}</label><label class="field hidden" id="commitment-source">Origem${select('source',options(SOURCES,'clt'))}</label>${field('Forma de pagamento',select('method',options(Object.fromEntries(Object.entries(METHODS).filter(([k])=>k!=='credit')),'boleto')))}</div><div class="hint">O total será dividido em parcelas mensais a partir do primeiro vencimento. Para empréstimos, informe a soma das parcelas que ainda faltam, incluindo os juros.</div>`;
  const form=openDialog('Compromisso futuro',body,'Salvar previsão',async fd=>{
    const count=Number(fd.get('count'));if(!Number.isInteger(count)||count<1||count>360)throw new Error('Informe de 1 a 360 parcelas.');
    const total=cents(fd.get('amount'));if(total<count)throw new Error('O valor total deve permitir parcelas de pelo menos R$ 0,01.');
    const kind=fd.get('kind'),groupId=uid();
    const items=splitAmount(total,count).map((value,i)=>({id:uid(),groupId,type:kind==='income'?'income':'expense',commitmentKind:kind==='loan'?'loan':'bill',description:fd.get('description').trim()+(count>1?` · ${i+1}/${count}`:''),amountCents:value,date:addMonths(fd.get('date'),i),status:'planned',accountId:fd.get('account'),paymentMethod:fd.get('method'),category:kind==='loan'?'Empréstimos':fd.get('category'),source:fd.get('source')}));
    await save(s=>s.entries.push(...items));toast(`${count} previsão(ões) salva(s).`);
  });
  form.elements.kind.onchange=()=>{
    const kind=form.elements.kind.value;
    $('#commitment-category').classList.toggle('hidden',kind==='income');$('#commitment-source').classList.toggle('hidden',kind!=='income');
    if(kind==='loan')form.elements.category.value='Empréstimos';form.elements.category.disabled=kind==='loan';
  };
}
function settle(id) {
  const e=state.entries.find(e=>e.id===id);if(!e)return;
  openDialog(e.type==='income'?'Confirmar recebimento':e.type==='transfer'?'Confirmar transferência':'Confirmar pagamento',`<p>${esc(e.description)} · ${cash(e.amountCents)}. A previsão será substituída pelo registro confirmado.</p><div class="form-grid">${field('Data em que aconteceu',input('date',today(),'date',`required min="2000-01-01" max="${today()}"`),true)}</div>`,'Confirmar',async fd=>{
    await save(s=>{const item=s.entries.find(x=>x.id===id);if(!item||item.status!=='planned')throw new Error('Este registro já foi alterado. Atualize a página.');item.status='posted';item.date=fd.get('date');});toast('Movimentação confirmada. Saldo atualizado.');
  });
}
function payInvoice(key) {
  if(needAccount())return;
  const invoice=invoices(state).find(i=>i.key===key);if(!invoice)return;
  const body=`<p>Fatura ${esc(invoice.name)} · vencimento ${fmtDate(invoice.date)}. Em aberto: <strong>${cash(invoice.remainingCents)}</strong>.</p><div class="form-grid">${field('Valor pago (R$)',input('amount',inputMoney(invoice.remainingCents),'text','required inputmode="decimal"'))}${field('Data do pagamento',input('date',today(),'date',`required min="2000-01-01" max="${today()}"`))}${field('Saiu de qual conta?',select('account',accountOptions(state.accounts.find(a=>a.scope===invoice.scope)?.id||state.accounts[0].id),'required'),true)}</div><div class="hint">O pagamento reduz o saldo da conta e o valor em aberto da fatura. Ele não entra como um novo gasto.</div>`;
  openDialog('Pagar fatura',body,'Registrar pagamento',async fd=>{
    await save(s=>s.entries.push({id:uid(),type:'card_payment',description:`Pagamento de fatura · ${invoice.name}`,amountCents:cents(fd.get('amount')),date:fd.get('date'),status:'posted',accountId:fd.get('account'),cardId:invoice.cardId,invoiceDate:invoice.date,paymentMethod:'boleto'}));toast('Pagamento da fatura registrado.');
  });
}
function openPaymentEdit(e) {
  openDialog('Editar pagamento de fatura',`<p>${esc(e.description)}. A alteração recalcula o saldo da conta e a fatura vinculada.</p><div class="form-grid">${field('Valor pago (R$)',input('amount',inputMoney(e.amountCents),'text','required inputmode="decimal"'))}${field('Data do pagamento',input('date',e.date,'date',`required min="2000-01-01" max="${today()}"`))}${field('Conta',select('account',accountOptions(e.accountId),'required'),true)}</div>`,'Salvar pagamento',async fd=>{
    await save(s=>{const item=s.entries.find(x=>x.id===e.id);if(!item)throw new Error('Pagamento não encontrado.');Object.assign(item,{amountCents:cents(fd.get('amount')),date:fd.get('date'),accountId:fd.get('account')});});toast('Pagamento atualizado.');
  });
}
function deleteEntry(id) {
  const e=state.entries.find(e=>e.id===id);if(!e)return;
  const group=state.entries.filter(x=>x.groupId===e.groupId && x.status==='planned');
  const choice=e.groupId&&e.status==='planned'&&group.length>1?field('O que excluir?',select('delete-scope',options({one:'Somente este registro',remaining:`Todas as ${group.length} parcelas previstas deste compromisso`},'one')),true):'';
  openDialog('Excluir registro',`<p>Excluir “${esc(e.description)}” (${cash(e.amountCents)}) recalcula seus saldos e compromissos.</p>${choice}`,'Excluir registro',async fd=>{
    await save(s=>{s.entries=s.entries.filter(x=>fd.get('delete-scope')==='remaining'?!(x.groupId===e.groupId && x.status==='planned'):x.id!==id);});toast('Registro excluído.');
  });
}
function exportData() {
  const file=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=`nwallet-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Cópia exportada. Guarde-a em um lugar seguro.');
}
async function importData(file) {
  try {
    if(!file)return;if(file.size>8*1024*1024)throw new Error('O arquivo ultrapassa 8 MB.');
    const data=JSON.parse(await file.text()), imported=validateLedger(data.state||data);
    openDialog('Restaurar seu controle',`<p>A cópia tem ${imported.accounts.length} conta(s), ${imported.cards.length} cartão(ões) e ${imported.entries.length} registro(s).</p><div class="hint">Restaurar vai substituir os dados atuais. Exporte uma cópia do controle atual antes de continuar.</div>`,'Substituir e restaurar',async()=>{
      await save(s=>{s.accounts=imported.accounts;s.cards=imported.cards;s.entries=imported.entries;});toast('Cópia restaurada.');
    });
  }catch(err){toast(`Não foi possível importar: ${err.message}`);}
}

document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action],[data-view],[data-scope]');if(!target)return;
  if(target.dataset.view){view=target.dataset.view;render();window.scrollTo(0,0);return;}
  if(target.dataset.scope){scope=target.dataset.scope;render();return;}
  const {action,id}=target.dataset;
  try {
    if(action==='new-entry'||action==='expense')openEntry('expense');
    else if(action==='income'||action==='transfer')openEntry(action);
    else if(action==='edit-entry')openEntry('expense',id);
    else if(action==='new-account')openAccount();
    else if(action==='edit-account')openAccount(id);
    else if(action==='new-card')openCard();
    else if(action==='edit-card')openCard(id);
    else if(action==='commitment')openCommitment();
    else if(action==='settle')settle(id);
    else if(action==='delete-entry')deleteEntry(id);
    else if(action==='pay-invoice')payInvoice(id);
    else if(action==='opening-invoice')openPreviousInvoices(id);
    else if(action==='edit-opening-invoice')openPreviousInvoices(id,target.dataset.invoice);
    else if(action==='privacy'){privacy=!privacy;render();}
    else if(action==='refresh'){await load();render();toast('Dados atualizados.');}
    else if(action==='export')exportData();
    else if(action==='import')$('#import-file').click();
  }catch(err){toast(err.message);}
});
document.addEventListener('change',event=>{
  if(event.target.id==='month'){if(/^\d{4}-\d{2}$/.test(event.target.value)){month=event.target.value;render();}}
  if(event.target.id==='type-filter'){typeFilter=event.target.value;render();}
  if(event.target.id==='status-filter'){statusFilter=event.target.value;render();}
  if(event.target.id==='import-file')importData(event.target.files[0]);
});
document.addEventListener('input',event=>{
  if(event.target.id==='query'){
    query=event.target.value;const rows=filteredEntries();$('#row-count').textContent=`${rows.length} registro(s)`;
    $('#history-list').innerHTML=rows.length?rows.map(e=>entryRow(e)).join(''):empty('Nenhum registro encontrado','Altere os filtros ou registre uma movimentação.');
  }
});
load().then(render).catch(err=>{
  $('#app').innerHTML=`<main class="error-screen"><div class="brand"><span class="brand-symbol">N</span>NWallet</div><h1 style="margin-top:30px">Vamos reconectar.</h1><p>${esc(err.message)}</p><button class="button primary" onclick="location.reload()">Tentar novamente</button></main>`;
});
