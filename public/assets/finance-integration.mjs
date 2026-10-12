import {emptyState,validateLedger,uid,cents,inputMoney,formatBps,money,today,accountBalance,entryScope,summary,invoices,plansOf,ensurePlans,CATEGORIES,SCOPES,METHODS,SOURCES} from '../finance.mjs';
import {monthNow,dueDate,obligations,payrollPreview,debtSchedule,receivePayroll,settleObligation,businessSummary,commitmentSummary,removePostedEntry} from '../planning.mjs';
import {createNotificationUI} from './notifications-ui.mjs';
import {payableReminders} from '../reminders.mjs';
import {cardBank,linkCardAccount,upsertAccount} from '../finance.mjs';
import {birthdaysOf,nextBirthdayOccurrence,birthdayAlerts,birthdayCalendarAppointments,DEFAULT_NOTIFY_DAYS} from '../birthdays.mjs';
import {cartOf,cartSummary,CART_CATEGORIES,CART_PRIORITIES,upsertCartItem,toggleCartItemStatus,removeCartItem} from '../cart.mjs';
import {buildCalendarItems} from '../agenda.mjs';
import {createCalendarUI} from './calendar-ui.mjs';
import {createCategorySpendingUI} from './category-spending.mjs';
import {presentValue,simulateAmortization,annualRateFromMonthly,debtPriorityRanking,debtAmounts} from '../amortization.mjs';
import {cashProjection} from '../financial-insights.mjs';
import {createStatisticsUI} from './statistics-ui.mjs';

export function walletErrorMessage(err) {
  if(err instanceof TypeError && /fetch|network|load failed/i.test(err.message))return 'Não foi possível conectar ao servidor local. Verifique se o NWallet está iniciado e tente novamente.';
  return err.message;
}
export function workspaceSection(search,requested) {
  const view=requested||new URLSearchParams(search).get('view');
  return ['overview','debts','payroll','business','commitments','accounts','history','birthdays','cart','notifications','contracts','pension','recurring'].includes(view)?view:'overview';
}

// Shared by the original dashboard, entry sheets and Wallet screen.
export function createFinanceIntegration(React,motion,Presence,createPortal,visuals={}) {
  const h=React.createElement;
  let pendingWorkspaceTab;
  let pendingDebtId;
  let selectedMonth=monthNow();
  const monthListeners=new Set();
  const sectionListeners=new Set();
  function useSelectedMonth(){
    const [month,setValue]=React.useState(selectedMonth);
    React.useEffect(()=>{monthListeners.add(setValue);setValue(selectedMonth);return()=>monthListeners.delete(setValue);},[]);
    return [month,next=>{if(!/^\d{4}-\d{2}$/.test(next))return;selectedMonth=next;monthListeners.forEach(fn=>fn(next));}];
  }
  const selectWorkspaceSection=view=>{pendingWorkspaceTab=view;sectionListeners.forEach(fn=>fn(workspaceSection('',view)));};
  const {Calendar}=createCalendarUI(React,{useWallet,Modal,Presence,calendarItems,selectWorkspaceSection,createPortal});
  const {CategorySpending}=createCategorySpendingUI(React,{useWallet});
  const {Statistics}=createStatisticsUI(React,{useWallet,useSelectedMonth,selectWorkspaceSection,Modal,createPortal,motion,visuals});
  const {NotificationCenter,NotificationModal}=createNotificationUI(React,{useWallet,Modal,Presence});
  let snapshot={state:emptyState(),revision:0,loaded:false,saving:false,error:''},boot;
  const listeners=new Set();
  const emit=next=>{snapshot={...snapshot,...next};listeners.forEach(fn=>fn(snapshot));};
  async function refresh() {
    try {
      const response=await fetch('/api/wallet',{cache:'no-store'});
      if(!response.ok)throw new Error('Não foi possível carregar seu financeiro.');
      const data=await response.json();validateLedger(data.state);emit({...data,loaded:true,error:''});
    }catch(err){const error=new Error(walletErrorMessage(err),{cause:err});emit({error:error.message});throw error;}
  }
  async function save(change) {
    if(snapshot.saving)throw new Error('Aguarde o salvamento em andamento.');
    if(!snapshot.loaded)throw new Error('Aguarde o carregamento dos dados.');
    const state=structuredClone(snapshot.state);change(state);validateLedger(state);emit({saving:true,error:''});
    try {
      const response=await fetch('/api/wallet',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:snapshot.revision,state})});
      const result=await response.json();
      if(response.status===409)await refresh();
      if(!response.ok)throw new Error(result.error||'Não foi possível salvar.');
      emit({...result,loaded:true,error:''});
    }catch(err){const error=new Error(walletErrorMessage(err),{cause:err});emit({error:error.message});throw error;}
    finally{emit({saving:false});}
  }
  function useWallet() {
    const [value,setValue]=React.useState(snapshot);
    React.useEffect(()=>{
      listeners.add(setValue);setValue(snapshot);
      if(!boot)boot=refresh().catch(()=>{});
      return()=>listeners.delete(setValue);
    },[]);
    return {...value,save,refresh,addTransaction:entry=>save(s=>s.entries.push({...entry,id:uid()})),saveCard,deleteCard};
  }
  const balance = s => s.accounts.reduce((v,a)=>v+accountBalance(s,a.id),0)/100;
  const accountName = (s,id) => s.accounts.find(a=>a.id===id)?.name||'Conta';
  function transactions(s) {
    return s.entries.filter(e=>e.status==='posted'&&e.date<=today()).slice().reverse().sort((a,b)=>b.date.localeCompare(a.date)).map(e=>({
      ...e,id:e.id,merchant:e.description,amount:`${e.type==='income'?'+':'-'}${money(e.amountCents)}`,isoDate:e.date,date:new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}),
      category:e.type==='transfer'?'Transferência':e.type==='card_payment'?'Fatura':e.category||(SOURCES[e.source]||'Outros'),
      neutral:e.type==='transfer'||e.type==='card_payment',color:e.type==='income'?'bg-green-500':'bg-red-500'
    }));
  }
  function legacyCards(s) {
    return s.cards.map(c=>({id:c.id,accountId:c.accountId||null,name:c.display?.holder||'Meu cartão',bank:cardBank(s,c),number:c.display?.number||'•••• •••• •••• ••••',fullNumber:c.display?.fullNumber||'',expiry:c.display?.expiry||'',color:c.display?.color||'bg-purple-600',cvv:''}));
  }
  async function saveCard(data) {
    return save(s=>{
      const old=s.cards.find(c=>c.id===data.id),card=linkCardAccount(s,{...old,id:old?.id||uid(),name:data.cardName||old?.name||data.bank||data.name,scope:data.scope||old?.scope||'personal',closingDay:Number(data.closingDay||old?.closingDay||25),dueDay:Number(data.dueDay||old?.dueDay||5),openingDebtCents:data.openingDebtCents??old?.openingDebtCents??0,openingDueDate:data.openingDueDate||old?.openingDueDate||today(),display:{...old?.display,holder:data.name??old?.display?.holder,bank:data.bank??old?.display?.bank,number:data.number??old?.display?.number,fullNumber:data.fullNumber??old?.display?.fullNumber,expiry:data.expiry??old?.display?.expiry,color:data.color??old?.display?.color}},data.accountId===undefined?old?.accountId:data.accountId);
      if(data.creditLimitCents!==undefined)card.creditLimitCents=data.creditLimitCents;
      if(old)s.cards[s.cards.indexOf(old)]=card;else s.cards.push(card);
    });
  }
  async function deleteCard(id) {
    return save(s=>{if(s.entries.some(e=>e.cardId===id))throw new Error('Este cartão tem compras ou pagamentos vinculados.');s.cards=s.cards.filter(c=>c.id!==id);});
  }
  function weeklyData(txs) {
    const now=new Date(today()+'T12:00:00');
    return Array.from({length:7},(_,i)=>{
      const day=new Date(now);day.setDate(day.getDate()-6+i);
      const date=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      const rows=txs.filter(e=>e.isoDate===date),expense=rows.filter(e=>e.type==='expense').reduce((v,e)=>v+e.amountCents,0)/100,income=rows.filter(e=>e.type==='income').reduce((v,e)=>v+e.amountCents,0)/100;
      return {day:day.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''),amount:expense,expense,income};
    });
  }
  const spentToday = txs => money(txs.filter(e=>e.isoDate===today()&&e.type==='expense').reduce((v,e)=>v+e.amountCents,0));
  function calendarAppointments(s,baseDate) {
    const appointments=[];
    for(let offset=-1;offset<=1;offset++){
      const date=new Date(baseDate||today()+'T12:00:00');date.setDate(1);date.setMonth(date.getMonth()+offset);
      const month=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
      for(const item of obligations(s,month).filter(i=>!i.paid&&!i.viaPayroll))appointments.push({id:item.key,title:item.name,date:item.date,isoDate:item.date,time:'',type:'obligation',amountCents:item.amountCents,financialDirection:item.type,section:item.kind==='payroll'?'payroll':'commitments',description:item.amountCents?item.type==='income'?'Recebimento previsto':'Pagamento previsto':'Valor a informar neste mês'});
    }
    for(const invoice of invoices(s).filter(i=>i.remainingCents>0))appointments.push({id:invoice.key,title:`Fatura ${invoice.name}`,date:invoice.date,isoDate:invoice.date,time:'',type:'invoice',amountCents:invoice.remainingCents,financialDirection:'expense',section:'accounts',description:'Fatura em aberto'});
    for(const bday of birthdayCalendarAppointments(s,baseDate))appointments.push({...bday,section:'birthdays'});
    return appointments.map(a=>({...a,date:a.date instanceof Date?a.date:new Date(a.date+'T12:00:00')}));
  }
  function calendarItems(s,start,end,baseDate) {
    return buildCalendarItems(s,start,end,calendarAppointments(s,new Date(baseDate+'T12:00:00')));
  }
  function statisticsRows(s) {
    const categories={'Alimentação':'Alimentação','Transporte':'Transporte','Educação':'Educação','Lazer':'Entretenimento'};
    return transactions(s).filter(e=>!e.neutral&&e.isoDate.startsWith(monthNow())).map(e=>({...e,title:e.merchant,time:e.date,date:e.isoDate,category:categories[e.category]||'Outros',paymentType:METHODS[e.paymentMethod]||'Transferência'}));
  }
  function monthWeeks(s) {
    const rows=s.entries.filter(e=>e.status==='posted'&&e.date.startsWith(monthNow())&&e.date<=today());
    const buckets=Array.from({length:5},(_,i)=>({income:0,expense:0,label:`Semana ${i+1}`}));
    for(const e of rows){const b=buckets[Math.min(4,Math.floor((Number(e.date.slice(-2))-1)/7))];if(e.type==='income')b.income+=e.amountCents;if(e.type==='expense')b.expense+=e.amountCents;}
    const max=Math.max(1,...buckets.flatMap(b=>[b.income,b.expense]));
    return buckets.map(b=>({h1:`${b.income/max*100}%`,h2:`${b.expense/max*100}%`,h3:'0%',label:b.label}));
  }
  function insight(s) {
    const p=plansOf(s),company=businessSummary(s,monthNow());
    if(!s.accounts.length)return 'Cadastre suas contas na Carteira para conectar seu salário, sua empresa e seus compromissos.';
    if(p.payrolls.length){const net=p.payrolls.filter(p=>p.active).reduce((v,p)=>v+payrollPreview(s,p,monthNow()).netCents,0);return `Líquido previsto do CLT: ${money(net)}. Saldo da empresa: ${money(company.balanceCents)}. Confira os contratos e vencimentos na Carteira.`;}
    return `Seu dinheiro está distribuído em ${s.accounts.length} conta(s). Cadastre o CLT e as contas recorrentes para enxergar os próximos compromissos.`;
  }
  const paths={wallet:'M3 7h18v13H3z M3 7V4h15v3 M15 11h6v5h-6z',payroll:'M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h3',business:'M3 21V7h18v14 M8 7V3h8v4 M7 11h2 M15 11h2 M7 15h2 M15 15h2 M10 21v-3h4v3',debt:'M12 3a9 9 0 1 0 9 9 M12 7v5l3 2',pension:'M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M17 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M2 21v-5a5 5 0 0 1 10 0v5 M14 21v-5a4 4 0 0 1 8 0v5',recurring:'M20 8a8 8 0 0 0-14-3L3 8 M3 3v5h5 M4 16a8 8 0 0 0 14 3l3-3 M16 16h5v5',plus:'M12 5v14 M5 12h14',close:'M6 6l12 12 M6 18 18 6',transfer:'M3 7h17l-4-4 M20 7l-4 4 M21 17H4l4-4 M4 17l4 4',check:'M5 12l4 4L19 6',card:'M3 5h18v14H3z M3 10h18 M6 15h4',birthday:'M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8 M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1 M2 21h20 M7 8v3 M12 8v3 M17 8v3 M7 4h.01 M12 4h.01 M17 4h.01',calendar:'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18',cart:'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6 M10 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0 M21 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0',external:'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3',history:'M12 8v4l3 3 M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8 M3 3v5h5',bell:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',arrowLeft:'M19 12H5 M12 19l-7-7 7-7'};
  const icon=name=>h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[name]||paths.wallet}));
  const btn=(label,fn,kind='',ico)=>h('button',{type:'button',className:'nf-button '+kind,onClick:fn},ico&&icon(ico),label);
  const muted=text=>h('p',{className:'nf-muted'},text);
  const badge=(text,kind='')=>h('span',{className:'nf-badge '+kind},text);
  const empty=(title,text,ico='wallet',action=null)=>h('div',{className:'nf-empty'},icon(ico),h('strong',{},title),muted(text),action);
  const metric=(label,value,kind='')=>h('div',{className:'nf-metric '+kind},h('span',{},label),h('strong',{},typeof value==='number'?money(value):value));
  const section=(title,subtitle,body,action)=>h('section',{className:'nf-panel'},h('div',{className:'nf-section-head'},h('div',{},h('h2',{},title),subtitle&&muted(subtitle)),action),body);
  const row=(title,detail,value,action,tag)=>h('div',{className:'nf-row'},h('div',{className:'nf-row-main'},h('strong',{},title),detail&&muted(detail),tag),h('div',{className:'nf-row-end'},value!==undefined&&h('strong',{},typeof value==='number'?money(value):value),action));
  const field=(name,label,control,full=false)=>h('label',{className:'nf-field '+(full?'full':'')},h('span',{},label),control);
  const inp=(name,value='',type='text',props={})=>h('input',{name,defaultValue:value??'',type,...props});
  const sel=(name,value,options,required=true)=>h('select',{name,defaultValue:value||'',required},options.map(([v,label])=>h('option',{value:v,key:v},label)));
  const accountOpts=(s,scope)=>[['','Selecione uma conta'],...s.accounts.filter(a=>!scope||a.scope===scope).map(a=>[a.id,`${a.name} · ${SCOPES[a.scope]}`])];
  const centsField=(name,label,value,full=false,props={})=>field(name,label,inp(name,value===undefined?'':inputMoney(value),'text',{inputMode:'decimal',placeholder:'0,00',required:true,...props}),full);
  const moneyInput=fd=>cents(fd);
  const dateField=(name,label,value=today())=>field(name,label,inp(name,value,'date',{required:true,min:'2000-01-01',max:today()}));

  function Modal({title,children,onClose,onSubmit,submit='Salvar',hint,plain=false}) {
    const panel=React.useRef(),trigger=React.useRef(document.activeElement),[error,setError]=React.useState(''),[working,setWorking]=React.useState(false);
    React.useEffect(()=>{
      (panel.current?.querySelector('input,select')||panel.current?.querySelector('button'))?.focus();
      const key=e=>{
        if(e.key==='Escape'&&!working)onClose();
        if(e.key==='Tab'){
          const fields=[...panel.current.querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled&&el.getClientRects().length),first=fields[0],last=fields.at(-1);
          if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
        }
      };
      document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(trigger.current?.isConnected)trigger.current.focus({preventScroll:true});};
    },[working]);
    const form=plain?children:h('form',{onSubmit:async e=>{e.preventDefault();if(working)return;const fd=new FormData(e.currentTarget);setError('');setWorking(true);try{const keepOpen=await onSubmit(fd);setWorking(false);if(keepOpen!==false)onClose();}catch(err){setError(err.message);setWorking(false);}}},h('div',{className:'nf-form-grid'},children),hint&&h('p',{className:'nf-hint'},hint),error&&h('p',{className:'nf-error',role:'alert'},error),h('footer',{className:'nf-form-actions'},h('button',{type:'button',className:'nf-button',onClick:onClose,disabled:working},'Cancelar'),h('button',{className:'nf-button primary',disabled:working,type:'submit'},working?'Salvando…':submit)));
    return h(motion.div,{className:'nf-backdrop',initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},onClick:()=>!working&&onClose()},h(motion.div,{className:'nf-sheet'+(plain?' nf-notification-sheet':''),role:'dialog','aria-modal':true,'aria-label':title,ref:panel,initial:{y:40,opacity:0},animate:{y:0,opacity:1},exit:{y:40,opacity:0},onClick:e=>e.stopPropagation()},h('header',{className:'nf-sheet-head'},h('h3',{},title),h('button',{type:'button','aria-label':'Fechar',className:'nf-close',onClick:onClose,disabled:working},icon('close'))),h('div',{className:'nf-sheet-scroll'},form)));
  }
  function EntryFields({s,type,defaults={}}) {
    const [method,setMethod]=React.useState((type==='transfer'?'transfer':defaults.paymentMethod||'pix')),credit=method==='credit'&&type==='expense';
    const defaultAccount=defaults.accountId||s.accounts.find(a=>type==='income'&&defaults.source==='company'?a.scope==='business':a.scope==='personal')?.id||s.accounts[0]?.id;
    return h(React.Fragment,{},centsField('amount','Valor (R$)',defaults.amountCents,true,{className:'nf-money-input'}),field('description','Descrição',inp('description',defaults.description,'text',{required:true,maxLength:160,placeholder:type==='income'?'Ex.: Recebimento de cliente':'Ex.: Mercado ou combustível'}),true),dateField('date','Data',defaults.date||today()),field('method','Forma de pagamento',h('select',{name:'method',value:method,onChange:e=>setMethod(e.target.value)},Object.entries(METHODS).filter(([k])=>type==='expense'||k!=='credit').map(([v,l])=>h('option',{key:v,value:v},l)))),credit?field('cardId','Cartão',sel('cardId',defaults.cardId,[['','Selecione'],...s.cards.map(c=>[c.id,c.name])])):field('accountId',type==='transfer'?'Conta de origem':'Conta',sel('accountId',defaultAccount,accountOpts(s))),type==='transfer'?field('toAccountId','Conta de destino',sel('toAccountId',defaults.toAccountId,accountOpts(s))):type==='income'?field('source','Origem',sel('source',defaults.source||'clt',Object.entries(SOURCES))):field('category','Categoria',sel('category',defaults.category||'Outros',CATEGORIES.map(c=>[c,c]))),credit&&field('installments','Parcelas',inp('installments',defaults.installments||1,'number',{min:1,max:360,required:true})),h('p',{className:'nf-hint full'},type==='transfer'?'A transferência altera as duas contas, sem gerar receita ou gasto.':credit?'A compra vai para a fatura. O dinheiro só sai da conta quando a fatura for paga.':'Para uma retirada da sua própria empresa, use Transferência. O salário com descontos deve ser recebido pela sua folha CLT.'));
  }
  function entryFrom(fd,type,id=uid()) {
    const credit=type==='expense'&&fd.get('method')==='credit';
    return {id,type,description:fd.get('description').trim(),amountCents:cents(fd.get('amount')),date:fd.get('date'),status:'posted',paymentMethod:type==='transfer'?'transfer':fd.get('method'),accountId:credit?null:fd.get('accountId'),toAccountId:type==='transfer'?fd.get('toAccountId'):undefined,source:type==='income'?fd.get('source'):undefined,category:type==='expense'?fd.get('category'):undefined,cardId:credit?fd.get('cardId'):null,installments:credit?Number(fd.get('installments')):1};
  }
  function PayrollConfirmFields({s,pay,month}) {
    const [value,setValue]=React.useState(inputMoney(pay.baseCents));
    let preview;
    try{preview=payrollPreview(s,pay,month,cents(value));}catch{preview=null;}
    return h(React.Fragment,{},field('amount','Salário desta folha antes dos descontos (R$)',h('input',{name:'amount',value,onChange:e=>setValue(e.target.value),inputMode:'decimal',required:true,placeholder:'0,00'}),true),dateField('date','Data em que aconteceu'),preview&&h('p',{className:'nf-hint full'},`Depósito líquido: ${money(preview.netCents)} · descontos: ${money(preview.deductionCents)}. O consignado será baixado junto com este recebimento.`));
  }
  function TransactionModal({isOpen,onClose,onSave,type='expense',isDarkMode=true}) {
    const nw=useWallet();
    return h(Presence,{},isOpen&&h('div',{className:'nf-theme','data-theme':isDarkMode?'dark':'light'},h(Modal,{title:type==='income'?'Nova Receita':'Nova Despesa',onClose,onSubmit:fd=>onSave(entryFrom(fd,type)),submit:'Salvar registro',hint:!nw.state.accounts.length?'Cadastre primeiro sua conta na Carteira → Contas.':undefined},h(EntryFields,{s:nw.state,type}))));
  }
  function ConnectionNotice({nw}) {
    const [retrying,setRetrying]=React.useState(false);
    return h('div',{className:'nf-error nf-connection',role:'alert'},h('span',{},nw.error),h('button',{className:'nf-button',disabled:retrying||nw.saving,onClick:async()=>{setRetrying(true);try{await nw.refresh();}catch{}finally{setRetrying(false);}}},retrying?'Conectando…':'Tentar novamente'));
  }
  function HomeConnections({onOpen,isDarkMode=true}) {
    const nw=useWallet(),bList=birthdaysOf(nw.state);
    const bNext=bList.map(b=>({...b,occ:nextBirthdayOccurrence(b,today())})).sort((a,b)=>a.occ.daysRemaining-b.occ.daysRemaining)[0];
    const openSection=view=>()=>{selectWorkspaceSection(view);onOpen?.();};
    return h('div',{className:'nf-theme nf-home-connections','data-theme':isDarkMode?'dark':'light'},
      nw.error&&h(ConnectionNotice,{nw}),
      h('button',{className:'nf-home-link','aria-label':'Abrir agenda',onClick:()=>document.querySelector('.nc-calendar')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})},icon('calendar'),h('span',{},h('strong',{},'Minha agenda'),h('small',{},'Compromissos e próximos dias')),icon('calendar')),
      h('button',{className:'nf-home-link',onClick:openSection('birthdays')},icon('birthday'),h('span',{},h('strong',{},'Aniversários'),h('small',{},bNext?`${bNext.name} (${bNext.occ.daysRemaining===0?'Hoje!':`em ${bNext.occ.daysRemaining}d`})`:`${bList.length} cadastrado(s)`)),icon('plus')));
  }

  function AccountForm({item,scope,s,onClose,onSave}) {
    const [kind,setKind]=React.useState(item?.kind||'bank');
    return h(Modal,{title:item?'Editar conta':'Cadastrar conta',onClose,onSubmit:onSave,hint:'Informe o saldo real nesta data. Depois de salvar uma conta bancária, você poderá adicionar seus cartões.'},
      field('name','Nome da conta',inp('name',item?.name,'text',{required:true,maxLength:160,placeholder:scope==='business'?'Ex.: Conta da minha empresa':'Ex.: Minha conta principal'}),true),
      field('scope','Contexto',sel('scope',item?.scope||scope||'personal',Object.entries(SCOPES))),
      field('kind','Tipo',h('select',{name:'kind',value:kind,onChange:e=>setKind(e.target.value)},h('option',{value:'bank'},'Conta bancária'),h('option',{value:'cash'},'Dinheiro em mãos'))),
      kind==='bank'&&field('bank','Banco / instituição',inp('bank',item?.bank,'text',{required:!item?.id,maxLength:160,placeholder:'Ex.: Itaú, Nubank, Banco do Brasil'}),true),
      centsField('balance','Saldo inicial (R$)',item?.openingBalanceCents||0),dateField('date','Data do saldo',item?.openingDate||today()),
      item&&s.cards.some(c=>c.accountId===item.id)&&h('p',{className:'nf-hint full'},'O banco e o contexto desta conta também aparecem nos cartões vinculados.'));
  }
  function CardForm({item,accountId:defaultAccountId,s,onClose,onSave}) {
    const [accountId,setAccountId]=React.useState(item?.accountId||defaultAccountId||'');
    const account=s.accounts.find(a=>a.id===accountId);
    const last4=(item?.display?.number||'').replace(/\D/g,'').slice(-4);
    return h(Modal,{title:item?'Editar cartão':'Adicionar cartão',onClose,onSubmit:fd=>onSave({id:item?.id,accountId:fd.get('accountId')||null,cardName:fd.get('cardName').trim(),bank:fd.get('bank').trim(),scope:account?.scope||fd.get('scope'),name:fd.get('holder').trim(),number:fd.get('last4')?`•••• •••• •••• ${fd.get('last4')}`:item?.display?.number||'•••• •••• •••• ••••',expiry:fd.get('expiry'),color:fd.get('color'),closingDay:Number(fd.get('closingDay')),dueDay:Number(fd.get('dueDay')),openingDebtCents:cents(fd.get('debt')),openingDueDate:fd.get('date'),creditLimitCents:String(fd.get('creditLimit')||'').trim()?cents(fd.get('creditLimit')):null}),hint:account?'Este cartão ficará na conta selecionada, com o mesmo banco e contexto.':'Cartões independentes podem ser cadastrados sem uma conta bancária vinculada.'},
      field('cardName','Nome do cartão',inp('cardName',item?.name,'text',{required:true,maxLength:160,placeholder:'Ex.: Empresarial físico ou cartão virtual'}),true),
      centsField('creditLimit','Limite de crédito total (R$, opcional)',item?.creditLimitCents??undefined,true,{required:false}),
      field('accountId','Conta bancária vinculada',h('select',{name:'accountId',value:accountId,onChange:e=>setAccountId(e.target.value)},h('option',{value:''},'Cartão sem conta vinculada'),...s.accounts.filter(a=>a.kind==='bank').map(a=>h('option',{key:a.id,value:a.id},`${a.name} · ${a.bank||'Banco não informado'} · ${SCOPES[a.scope]}`))),true),
      field('bank','Banco / instituição',account?h('input',{name:'bank',key:'linked',value:account.bank||account.name,readOnly:true}):inp('bank',item?cardBank(s,item):'','text',{key:'independent',required:true,maxLength:160,placeholder:'Instituição que emite o cartão'})),
      field('scope','Contexto',account?h('input',{name:'scope',value:SCOPES[account.scope],readOnly:true}):sel('scope',item?.scope||'personal',Object.entries(SCOPES))),
      field('holder','Nome no cartão (opcional)',inp('holder',item?.display?.holder,'text',{maxLength:160})),
      field('last4','Últimos 4 dígitos (opcional)',inp('last4',last4,'text',{inputMode:'numeric',pattern:'[0-9]{4}',maxLength:4,placeholder:'1234'})),
      field('expiry','Validade (opcional)',inp('expiry',item?.display?.expiry,'text',{pattern:'(0[1-9]|1[0-2])/[0-9]{2}',maxLength:5,placeholder:'MM/AA'})),
      field('color','Cor do cartão',sel('color',item?.display?.color||'bg-purple-600',[['bg-purple-600','Roxo'],['bg-blue-600','Azul'],['bg-green-600','Verde'],['bg-zinc-800','Grafite'],['bg-red-600','Vermelho'],...item?.display?.color&&!['bg-purple-600','bg-blue-600','bg-green-600','bg-zinc-800','bg-red-600'].includes(item.display.color)?[[item.display.color,'Cor atual']]:[]])),
      h('details',{className:'full'},h('summary',{},'Fechamento, vencimento e fatura inicial'),h('div',{className:'nf-form-grid'},field('closingDay','Dia de fechamento',inp('closingDay',item?.closingDay||25,'number',{required:true,min:1,max:31})),field('dueDay','Dia de vencimento',inp('dueDay',item?.dueDay||5,'number',{required:true,min:1,max:31})),centsField('debt','Fatura anterior em aberto (R$)',item?.openingDebtCents||0,true),field('date','Vencimento dessa fatura',inp('date',item?.openingDueDate||today(),'date',{required:true,min:'2000-01-01',max:'2200-12-31'}),true))));
  }
  function CardModal({isOpen,editingCard,onClose,isDarkMode=true}) {
    const nw=useWallet(),item=nw.state.cards.find(c=>c.id===editingCard?.id);
    if(!isOpen)return null;
    return h('div',{className:'nf-theme','data-theme':isDarkMode?'dark':'light'},h(Presence,{},h(CardForm,{key:item?.id||'new',item,s:nw.state,onClose,onSave:nw.saveCard})));
  }

  function DebtsView({ s, p, month }) {
    const debts = p.debts || [];
    const [selectedDebtId, setSelectedDebtId] = React.useState(pendingDebtId || debts[0]?.id || '');
    React.useEffect(()=>{pendingDebtId=undefined;},[]);
    const [simAmountStr, setSimAmountStr] = React.useState('1000,00');

    const ranking = debtPriorityRanking(s, [], [], invoices(s),{month});
    const totalNominal = debts.reduce((acc, d) => acc + debtAmounts(s,d,month).nominalCents, 0);
    const totalBalance = debts.reduce((acc, d) => acc + debtAmounts(s,d,month).quotedCents, 0);
    const monthlyTotal = debts.reduce((acc, d) => acc + debtAmounts(s,d,month).monthlyCents, 0);
    const cardTotal=invoices(s).reduce((v,i)=>v+Math.max(0,i.remainingCents),0);
    const negativeTotal=s.accounts.reduce((v,a)=>v+Math.max(0,-accountBalance(s,a.id)),0);

    const targetDebt = debts.find(d => d.id === selectedDebtId) || debts[0];
    let simResult = null;
    if (targetDebt) {
      try {
        const cashCents = simAmountStr ? cents(simAmountStr) : 0;
        if (cashCents > 0) {
          simResult = simulateAmortization(targetDebt, cashCents, { asOfMonth: month,state:s });
        }
      } catch (_) {}
    }

    return section('Dívidas, Juros & Simulador de Amortização',
      'Compare contratos, faturas e saldos negativos. Simulações são estimativas mensais; a cotação de quitação deve ser confirmada com o credor.',
      h(React.Fragment, {},
        h('div', { className: 'nf-metrics' },
          metric('Quitação informada dos contratos', totalBalance, 'out'),
          metric('Parcelas restantes dos contratos', totalNominal, 'out'),
          metric('Parcelas pendentes em '+month, monthlyTotal, 'out'),
          metric('Faturas abertas · todos os meses',cardTotal,'out'),
          metric('Saldos negativos atuais',negativeTotal,'out')
        ),
        section('Dívidas e pagamentos a acompanhar',
          'Atrasos e saldos negativos aparecem primeiro. Contratos usam as taxas cadastradas; faturas abertas não recebem juros presumidos.',
          ranking.length ? h('div', { className: 'nf-stack' },
            ranking.map(item => h('article', { key: item.id, className: 'nf-contract-card' },
              h('div', { className: 'nf-section-head' },
                h('div', {},
                  h('h3', {}, item.name),
                  muted(`${item.status}${item.date?' · vencimento '+new Date(item.date+'T12:00:00').toLocaleDateString('pt-BR'):''} · ${item.monthlyRateBps ? (item.rateSource||'Taxa informada')+' '+formatBps(item.monthlyRateBps)+' a.m.' : 'Taxa não informada'}${item.annualRatePercent ? ` (${item.annualRatePercent.toLocaleString('pt-BR')}% a.a.)` : ''}`)
                ),
                h('div', { className: 'nf-actions' },
                  h('span', { className: `nf-badge ${item.urgency}` }, item.status),
                  item.type === 'payroll_loan' || item.type === 'financing' || item.type === 'loan'
                    ? btn('Simular amortização', () => { setSelectedDebtId(item.debt.id); }, 'small')
                    : null
                )
              ),
              h('p', { className: 'nf-hint' }, item.reason),
              item.warnings?.map(w=>h('p',{key:w,className:'nf-notice'},w)),
              h('div', { className: 'nf-metrics' },
                metric(item.type === 'overdraft' ? 'Saldo negativo atual' : item.type === 'card_invoice' ? 'Fatura em aberto' : item.quotedCents?'Quitação informada':'Parcelas restantes', item.balanceCents, 'out'),
                item.nominalRemainingCents ? metric('Total restante nominal', item.nominalRemainingCents) : metric('Situação', item.status),
                item.installmentCents ? metric('Parcela mensal', item.installmentCents) : metric('Acompanhamento', 'Confira o vencimento')
              )
            ))
          ) : empty('Nenhuma dívida mapeada', 'Cadastre seus contratos para ativar o ranking de juros.')
        ),
        targetDebt ? h('div', { className: 'nf-sim-box' },
          h('div', { className: 'nf-section-head' },
            h('div', {},
              h('h2', {}, 'Estimativa de amortização'),
              muted(`Abatimento de trás para frente no contrato: ${targetDebt.name}`)
            )
          ),
          muted(`Referência: ${month}. Taxa usada: ${formatBps(targetDebt.interestRateBps||targetDebt.cetBps||0)} a.m. (${targetDebt.interestRateBps?'juros cadastrados':targetDebt.cetBps?'CET usado como aproximação':'sem taxa'}). Desconto por meses inteiros, sem cálculo diário de encargos.`),
          targetDebt.currentBalanceCents?muted(`Quitação informada pelo usuário: ${money(targetDebt.currentBalanceCents)}. A estimativa abaixo não substitui essa cotação nem a atualiza.`):null,
          h('div', { className: 'nf-form-grid' },
            field('contract', 'Contrato selecionado',
              h('select', { value: targetDebt.id, onChange: e => setSelectedDebtId(e.target.value) },
                debts.map(d => h('option', { key: d.id, value: d.id }, `${d.name} (${d.cetBps ? formatBps(d.cetBps) + ' CET' : d.interestRateBps ? formatBps(d.interestRateBps) + ' a.m.' : 'Sem taxa'})`))
              )
            ),
            field('simAmount', 'Valor disponível para aporte (R$)',
              inp('simAmount', simAmountStr, 'text', {
                inputMode: 'decimal',
                onChange: e => setSimAmountStr(e.target.value)
              })
            )
          ),
          h('div', { className: 'nf-sim-quick' },
            muted('Atalhos rápidos:'),
            ['500,00', '1.000,00', '2.000,00', '5.000,00', '10.000,00'].map(val =>
              btn(`R$ ${val}`, () => setSimAmountStr(val), 'quiet small')
            )
          ),
          simResult && simResult.eliminatedCount > 0 ? h(React.Fragment, {},
            h('div', { className: 'nf-metrics', style: { marginTop: '16px' } },
              metric('Parcelas na simulação', `${simResult.eliminatedCount} do final`),
              metric('Desconto estimado', simResult.interestSavedCents, 'in'),
              metric('Aporte não utilizado', simResult.remainingCashCents)
            ),
            h('p', { className: 'nf-notice' },
              `Aporte estimado de ${money(simResult.totalRealPaidCents)} para ${money(simResult.totalNominalEliminatedCents)} de parcelas nominais. Desconto estimado de ${simResult.discountPercentage.toLocaleString('pt-BR')}%. Confirme as condições com o credor.`
            ),
            h('table', { className: 'nf-sim-table' },
              h('thead', {},
                h('tr', {},
                  h('th', {}, 'Parcela'),
                  h('th', {}, 'Mês Vencimento'),
                  h('th', { className: 'money' }, 'Valor Nominal'),
                  h('th', { className: 'money' }, 'Valor c/ Desconto (VP)'),
                  h('th', { className: 'money' }, 'Juros Economizados')
                )
              ),
              h('tbody', {},
                simResult.eliminated.map(row => h('tr', { key: row.number },
                  h('td', {}, `Parcela ${row.number}`),
                  h('td', {}, row.month),
                  h('td', { className: 'money' }, money(row.nominalCents)),
                  h('td', { className: 'money' }, money(row.presentValueCents)),
                  h('td', { className: 'money', style: { color: 'var(--nf-green)', fontWeight: 'bold' } }, money(row.interestSavedCents))
                ))
              )
            )
          ) : h('p', { className: 'nf-hint full' },
            targetDebt.interestRateBps || targetDebt.cetBps
              ? 'Informe um valor de aporte suficiente para quitar pelo menos uma parcela futura.'
              : 'Este contrato não possui taxa de juros ou CET cadastrado para calcular o desconto. Edite o contrato e informe a taxa.'
          )
        ) : null
      )
    );
  }

  function Workspace({isDarkMode=true}) {
    const nw=useWallet(),s=nw.state,p=plansOf(s);
    const [tab,setTab]=React.useState(()=>workspaceSection(location.search,pendingWorkspaceTab)),[month,setMonth]=useSelectedMonth(),[modal,setModal]=React.useState(null),[notice,setNotice]=React.useState('');
    React.useEffect(()=>{
      pendingWorkspaceTab=undefined;
      sectionListeners.add(setTab);
      const dockWalletBtn=document.getElementById('nav-wallet');
      const handleDock=()=>setTab('overview');
      dockWalletBtn?.addEventListener('click',handleDock);
      return()=>{sectionListeners.delete(setTab);dockWalletBtn?.removeEventListener('click',handleDock);};
    },[]);
    const open=(kind,data={})=>{setNotice('');setModal({...data,kind,key:uid()});};
    const close=()=>setModal(null);
    const persist=async fn=>{await nw.save(fn);setNotice('Salvo no seu financeiro.');};
    const monthItems=obligations(s,month),projection=cashProjection(s,month),business=businessSummary(s,month),actual=summary(s,month);
    const tabs=[['overview','Visão geral'],['debts','Dívidas & Juros'],['cart','Carrinho'],['birthdays','Aniversários'],['payroll','CLT e folha'],['business','Empresa'],['contracts','Consignado e financiamento'],['pension','Pensão'],['recurring','Contas recorrentes'],['accounts','Contas'],['commitments','Compromissos'],['history','Registros'],['notifications','Notificações']];
    const agendaItems=[...monthItems,...invoices(s).filter(i=>i.date.startsWith(month)&&i.remainingCents>0).map(i=>({...i,name:'Fatura · '+i.name,kind:'invoice',type:'expense',amountCents:i.remainingCents}))].sort((a,b)=>a.date.localeCompare(b.date));
    const noAccounts=()=>empty('Comece pelas suas contas','Cadastre a conta que recebe seu salário, a conta da empresa e o dinheiro em mãos.');
    const totalDebt=p.debts.reduce((v,d)=>v+debtSchedule(s,d).filter(i=>!i.paid).reduce((a,i)=>a+i.amountCents,0),0);
    const renderObligation=i=>row(i.name,`${new Date(i.date+'T12:00:00').toLocaleDateString('pt-BR')} · ${SCOPES[i.scope]||'Pessoal'}${i.number?` · parcela ${i.number}`:''}`,i.amountCents===null?'Valor a informar':i.amountCents,i.paid?badge('Confirmado','success'):i.viaPayroll?badge('Será descontado na folha'):i.kind==='invoice'?btn('Ver fatura',()=>setTab('accounts'),'small'):btn(i.type==='income'?'Recebi':'Paguei',()=>open('settle',{item:i}),'small'),i.variable?badge(i.amountCents?'Valor estimado · confirme o real':'Valor variável'):undefined);
    const accountTile=a=>h('article',{key:a.id,className:'nf-account-card '+a.scope},h('div',{className:'nf-card-top'},icon(a.scope==='business'?'business':'wallet'),badge(SCOPES[a.scope]),btn('Editar',()=>open('account',{item:a}),'quiet')),h('h3',{},a.name),a.kind==='bank'&&muted(a.bank||'Banco não informado'),h('strong',{className:'nf-card-balance'},money(accountBalance(s,a.id))),muted(a.scope==='business'?'Dinheiro que permanece na empresa':'Saldo da conta pessoal'),h('div',{className:'nf-card-actions'},btn('Receber',()=>open('entry',{type:'income',defaults:{accountId:a.id,source:a.scope==='business'?'company':'other'}}),'small'),a.scope==='business'?btn('Retirar para mim',()=>open('entry',{type:'transfer',defaults:{accountId:a.id}}),'small'):btn('Gasto',()=>open('entry',{type:'expense',defaults:{accountId:a.id}}),'small')),a.kind==='bank'&&h('div',{className:'nf-linked-cards'},h('strong',{},'Cartões vinculados'),s.cards.filter(c=>c.accountId===a.id).length?s.cards.filter(c=>c.accountId===a.id).map(c=>row(c.name,c.display?.number,undefined,btn('Editar cartão',()=>open('card',{item:c}),'quiet'))):muted('Nenhum cartão vinculado a esta conta.'),btn('Adicionar cartão a esta conta',()=>open('card',{accountId:a.id}),'small','plus')));

    function birthdaysView() {
      const list=birthdaysOf(s);
      const enriched=list.map(b=>({...b,occ:nextBirthdayOccurrence(b,today())})).sort((a,b)=>a.occ.daysRemaining-b.occ.daysRemaining||a.name.localeCompare(b.name));
      const thisMonthCount=enriched.filter(b=>b.occ.nextDate.startsWith(monthNow())).length;
      const nextUp=enriched[0];
      return section('Agendamentos & Aniversários','Cadastre aniversários para receber lembretes no iPhone com 1 mês, 1 semana, 3 dias de antecedência e no dia.',
        h(React.Fragment,{},
          h('div',{className:'nf-metrics'},
            metric('Total de aniversários',String(list.length)),
            metric('Neste mês',String(thisMonthCount)),
            metric('Próximo',nextUp?`${nextUp.name} (${nextUp.occ.daysRemaining===0?'Hoje!':nextUp.occ.daysRemaining===1?'Amanhã':`${nextUp.occ.daysRemaining} dias`})`:'Nenhum')
          ),
          enriched.length?h('div',{className:'nf-birthday-grid'},
            enriched.map(b=>{
              const occ=b.occ;
              const [y,m,d]=occ.nextDate.split('-');
              const dateFmt=`${d}/${m}`;
              const msg=`Parabéns ${b.name}! Feliz aniversário! 🎉🎂 Muita saúde, paz e realizações!`;
              const waUrl=b.phone?`https://wa.me/55${b.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`:`https://wa.me/?text=${encodeURIComponent(msg)}`;
              return h('article',{key:b.id,className:'nf-birthday-card'+(occ.isToday?' nf-birthday-today':'')},
                h('div',{className:'nf-birthday-header'},
                  b.photo?h('img',{src:b.photo,alt:b.name,className:'nf-birthday-avatar'}):h('div',{className:'nf-birthday-avatar-fallback'},b.name.slice(0,2).toUpperCase()),
                  h('div',{className:'nf-birthday-title'},
                    h('h3',{},b.name),
                    b.relationship&&h('span',{className:'nf-badge'},b.relationship),
                    h('p',{className:'nf-muted'},`Aniversário: ${dateFmt}${b.hasYear!==false&&b.date?` · ${b.date.slice(0,4)}`:''}`)
                  ),
                  h('div',{className:'nf-birthday-badge-box'},
                    occ.isToday?h('span',{className:'nf-badge nf-badge-today'},'🎉 É HOJE!')
                    :occ.daysRemaining<=3?h('span',{className:'nf-badge nf-late'},`Faltam ${occ.daysRemaining} dias`)
                    :occ.daysRemaining<=7?h('span',{className:'nf-badge'},'Em 1 semana')
                    :occ.daysRemaining<=30?h('span',{className:'nf-badge'},`Em ${occ.daysRemaining} dias`)
                    :h('span',{className:'nf-badge'},`Em ${occ.daysRemaining} dias`)
                  )
                ),
                h('div',{className:'nf-birthday-info'},
                  occ.turningAge?h('p',{className:'nf-birthday-age'},occ.isToday?`🎈 Completa ${occ.turningAge} anos hoje! Parabéns!`:b.hasYear!==false?`Vai completar ${occ.turningAge} anos`:''):null,
                  b.notes&&h('p',{className:'nf-birthday-notes'},`🎁 ${b.notes}`)
                ),
                h('div',{className:'nf-birthday-actions'},
                  h('a',{href:waUrl,target:'_blank',rel:'noopener noreferrer',className:'nf-button small nf-button-whatsapp'},'💬 Dar Parabéns'),
                  btn('Editar',()=>open('birthday',{item:b}),'small'),
                  btn('Excluir',()=>open('delete-birthday',{item:b}),'quiet small')
                )
              );
            })
          ):empty('Nenhum aniversário cadastrado','Cadastre seus amigos e familiares para receber lembretes no iPhone com 1 mês, 1 semana, 3 dias e no dia.','birthday',h('div',{style:{marginTop:'16px'}},btn('Cadastrar aniversário',()=>open('birthday'),'primary','plus'))),
          enriched.length?h('div',{className:'nf-actions',style:{marginTop:'16px'}},
            btn('Novo Aniversário',()=>open('birthday'),'primary','plus')
          ):null
        ),
        btn('Novo Aniversário',()=>open('birthday'),'primary','plus')
      );
    }
    function CartView({ s, open, persist, setNotice }) {
      const list=cartOf(s);
      const cSum=cartSummary(s);
      const [statusFilter,setStatusFilter]=React.useState('all');
      const [search,setSearch]=React.useState('');

      const filtered=list.filter(item=>{
        if(statusFilter==='pending'&&item.status==='bought')return false;
        if(statusFilter==='bought'&&item.status!=='bought')return false;
        if(search.trim()){
          const q=search.trim().toLowerCase();
          const matchName=item.name?.toLowerCase().includes(q);
          const matchNotes=item.notes?.toLowerCase().includes(q);
          const matchCat=item.category?.toLowerCase().includes(q);
          if(!matchName&&!matchNotes&&!matchCat)return false;
        }
        return true;
      });

      return section('Carrinho & Compras Futuras','Guarde os itens que deseja comprar, links, fotos e valores estimados. Dê baixa a qualquer momento.',
        h(React.Fragment,{},
          h('div',{className:'nf-metrics'},
            metric('A comprar (pendente)',`${cSum.pendingCount} item(ns) · ${money(cSum.pendingEstimatedCents)}`,'out'),
            metric('Comprados (baixa dada)',`${cSum.boughtCount} item(ns) · ${money(cSum.boughtEstimatedCents)}`,'in'),
            metric('Total estimado',money(cSum.totalEstimatedCents))
          ),
          h('div',{className:'nf-cart-toolbar'},
            h('div',{className:'nf-actions nf-cart-filters'},
              h('button',{
                type:'button',
                className:'nf-button small'+(statusFilter==='all'?' primary':''),
                onClick:()=>setStatusFilter('all')
              },`Todos (${list.length})`),
              h('button',{
                type:'button',
                className:'nf-button small'+(statusFilter==='pending'?' primary':''),
                onClick:()=>setStatusFilter('pending')
              },`A comprar (${cSum.pendingCount})`),
              h('button',{
                type:'button',
                className:'nf-button small'+(statusFilter==='bought'?' primary':''),
                onClick:()=>setStatusFilter('bought')
              },`Comprados (${cSum.boughtCount})`)
            ),
            h('div',{className:'nf-cart-search-box'},
              h('input',{
                type:'search',
                className:'nf-cart-search-input',
                placeholder:'Buscar no carrinho...',
                value:search,
                onChange:e=>setSearch(e.target.value)
              })
            ),
            btn('Novo Item',()=>open('cart-item'),'primary small','plus')
          ),
          filtered.length?h('div',{className:'nf-cart-grid'},
            filtered.map(item=>{
              const isBought=item.status==='bought';
              return h('article',{key:item.id,className:'nf-cart-card'+(isBought?' nf-cart-bought':'')},
                h('div',{className:'nf-cart-header'},
                  item.photo?h('img',{src:item.photo,alt:item.name,className:'nf-cart-photo'})
                    :h('div',{className:'nf-cart-photo-fallback'},icon('cart')),
                  h('div',{className:'nf-cart-title-box'},
                    h('h3',{className:'nf-cart-title'},item.name),
                    h('div',{className:'nf-cart-badges'},
                      isBought?h('span',{className:'nf-badge success'},item.boughtAt?`✅ Comprado em ${item.boughtAt.split('-').reverse().join('/')}`:'✅ Comprado')
                               :h('span',{className:'nf-badge warning'},'⏳ A comprar'),
                      item.category&&h('span',{className:'nf-badge'},item.category),
                      item.priority==='high'&&h('span',{className:'nf-badge critical'},'Alta prioridade'),
                      item.priority==='low'&&h('span',{className:'nf-badge'},'Baixa prioridade')
                    )
                  ),
                  h('div',{className:'nf-cart-price-box'},
                    h('strong',{className:'nf-cart-price'},money(item.priceCents||0)),
                    h('small',{className:'nf-muted'},'estimado')
                  )
                ),
                item.notes&&h('p',{className:'nf-cart-notes'},item.notes),
                h('div',{className:'nf-cart-actions'},
                  item.url&&h('a',{
                    href:item.url,
                    target:'_blank',
                    rel:'noopener noreferrer',
                    className:'nf-button small nf-button-link'
                  },icon('external'),'Abrir link'),
                  isBought
                    ?btn('Reabrir',async()=>{
                        await persist(state=>toggleCartItemStatus(state,item.id));
                        setNotice(`Item "${item.name}" reaberto.`);
                      },'small quiet')
                    :btn('Dar baixa',async()=>{
                        await persist(state=>toggleCartItemStatus(state,item.id));
                        setNotice(`"${item.name}" marcado como comprado!`);
                      },'small primary','check'),
                  btn('Lançar gasto',()=>open('entry',{
                    type:'expense',
                    defaults:{
                      description:item.name,
                      amountCents:item.priceCents||0,
                      category:'Compras'
                    }
                  }),'small quiet'),
                  btn('Editar',()=>open('cart-item',{item}),'small'),
                  btn('Excluir',()=>open('delete-cart-item',{item}),'quiet small')
                )
              );
            })
          ):empty(
            list.length?'Nenhum item encontrado':'Seu carrinho está vazio',
            list.length?'Nenhum item corresponde ao filtro ou busca selecionada.':'Guarde aqui produtos, links e ideias de compras futuras para planejar seus gastos.',
            'cart',
            !list.length&&h('div',{style:{marginTop:'16px'}},btn('Adicionar primeiro item',()=>open('cart-item'),'primary','plus'))
          ),
          list.length?h('div',{className:'nf-actions',style:{marginTop:'20px'}},
            btn('Adicionar mais um item',()=>open('cart-item'),'primary','plus')
          ):null
        ),
        btn('Novo Item',()=>open('cart-item'),'primary','plus')
      );
    }
    function payrollView() {
      return section('Seu CLT e a folha','O que foi combinado, o que já vem descontado e o que chega na sua conta.',p.payrolls.length?h('div',{className:'nf-stack'},p.payrolls.map(pay=>{
        const run=p.payrollRuns.find(r=>r.payrollId===pay.id&&r.month===month),preview=run?{baseCents:run.baseCents,deductions:run.deductions,deductionCents:run.baseCents-run.netCents,netCents:run.netCents}:payrollPreview(s,pay,month);
        return h('article',{key:pay.id,className:'nf-payroll-card'},h('div',{className:'nf-section-head'},h('div',{},h('h3',{},pay.name),muted(`Dia ${pay.payDay} · ${accountName(s,pay.accountId)}`)),btn('Editar folha',()=>open('payroll',{item:pay}),'small')),h('div',{className:'nf-metrics'},metric('Antes dos descontos',preview.baseCents),metric('Descontos na folha',preview.deductionCents,'out'),metric('Líquido na conta',preview.netCents,'in')),h('div',{className:'nf-deductions'},preview.deductions.length?preview.deductions.map((d,i)=>row(d.name,d.debtId?'Consignado vinculado · baixa junto do salário':d.kind==='pension'?'Pensão descontada na folha':'Desconto da folha',d.amountCents,undefined,badge('Já sai antes do depósito'))):muted('Nenhum desconto cadastrado nesta competência.')),h('div',{className:'nf-actions'},btn('Adicionar desconto',()=>open('deduction',{payrollId:pay.id}),'small','plus'),btn('Vincular consignado',()=>open('debt',{debtKind:'payroll_loan',payrollId:pay.id}),'small','debt'),btn('Pensão na folha',()=>open('deduction',{payrollId:pay.id,initialKind:'pension'}),'small','pension'),run?badge('Salário recebido','success'):month<pay.startMonth?badge('A partir de '+pay.startMonth):btn('Confirmar salário recebido',()=>open('settle',{item:monthItems.find(i=>i.kind==='payroll'&&i.id===pay.id)}),'primary small')),pay.deductions.length>0&&h('details',{},h('summary',{},'Gerenciar descontos'),pay.deductions.map(d=>row(d.name,(d.active?'Ativo':'Pausado')+' · de '+d.startMonth+(d.endMonth?' até '+d.endMonth:''),d.mode==='percent'?`${inputMoney(d.rateBps)}%`:d.amountCents,h('div',{className:'nf-actions'},btn('Editar',()=>open('deduction',{payrollId:pay.id,item:d}),'quiet'),btn(d.active?'Pausar':'Ativar',()=>persist(state=>{const deduction=ensurePlans(state).payrolls.find(x=>x.id===pay.id).deductions.find(x=>x.id===d.id);deduction.active=!deduction.active;}).catch(err=>setNotice(err.message)),'quiet'))))));
      })):empty('Cadastre seu trabalho CLT','Informe o salário antes dos descontos que você vai cadastrar. Depois vincule consignados, pensão e outros descontos.'),btn('Cadastrar CLT',()=>open('payroll'),'primary','plus'));
    }
    function debtView(){return section('Consignados, financiamentos e empréstimos','Cadastre somente as parcelas que ainda faltam, com os valores do seu contrato.',p.debts.length?h('div',{className:'nf-stack'},p.debts.map(d=>{const schedule=debtSchedule(s,d),remaining=schedule.filter(i=>!i.paid),paid=schedule.length-remaining.length,pay=p.payrolls.find(p=>p.id===d.payrollId);return h('article',{key:d.id,className:'nf-contract-card'},h('div',{className:'nf-section-head'},h('div',{},h('h3',{},d.name),muted(`${({payroll_loan:'Consignado',financing:'Financiamento',loan:'Empréstimo'})[d.kind]}${pay?` · vinculado a ${pay.name}`:` · ${accountName(s,d.accountId)}`}${d.creditor?` · ${d.creditor}`:''}`)),h('div',{className:'nf-actions'},d.cetBps?h('span',{className:'nf-badge warning'},`CET ${formatBps(d.cetBps)} a.m.`):d.interestRateBps?h('span',{className:'nf-badge'},`${formatBps(d.interestRateBps)} a.m.`):null,btn('Simular',()=>{pendingDebtId=d.id;setTab('debts');},'quiet small'),btn('Editar',()=>open('debt',{item:d}),'small'))),h('div',{className:'nf-metrics'},metric('Parcela',d.installmentCents),metric('Faltam',`${remaining.length} parcelas`),metric('Total a pagar',remaining.length*d.installmentCents,'out')),d.currentBalanceCents?muted(`Saldo p/ quitação informado: ${money(d.currentBalanceCents)}`):null,debtAmounts(s,d,month).warnings.map(w=>h('p',{key:w,className:'nf-notice'},w)),h('div',{className:'nf-progress'},h('span',{style:{width:`${paid/schedule.length*100}%`}})),muted(`${paid} de ${schedule.length} parcelas cadastradas confirmadas${d.kind==='payroll_loan'?' · descontadas ao confirmar o salário':''}`));})):empty('Mapeie suas dívidas','Seu consignado fica ligado à folha. Financiamentos e outros empréstimos saem da conta escolhida.'),btn('Adicionar contrato',()=>open('debt'),'primary','plus'));}

    function pensionView() {
      const payrollPensions = p.payrolls.flatMap(pay => (pay.deductions||[]).filter(d => d.kind === 'pension').map(d => ({ ...d, payrollName: pay.name, payrollId: pay.id })));
      const recurringPensions = p.recurrences.filter(r => r.category === 'Pensão' || (r.name && r.name.toLowerCase().includes('pens')));
      const hasPensions = payrollPensions.length > 0 || recurringPensions.length > 0;

      return section('Pensão alimentícia', 'Cadastre pensão descontada na folha CLT ou paga todo mês pela conta bancária.',
        h(React.Fragment, {},
          payrollPensions.length > 0 && h('div', { className: 'nf-panel', style: { marginBottom: 16 } },
            h('h3', {}, 'Descontada na folha (CLT)'),
            muted('Já sai direto do salário antes do depósito na conta.'),
            payrollPensions.map(d => row(
              d.name,
              `Vinculada a ${d.payrollName} · ${d.active ? 'Ativo' : 'Pausado'}`,
              d.mode === 'percent' ? `${inputMoney(d.rateBps)}% do salário` : d.amountCents,
              h('div', { className: 'nf-actions' },
                btn('Editar', () => open('deduction', { payrollId: d.payrollId, item: d, initialKind: 'pension' }), 'quiet'),
                btn(d.active ? 'Pausar' : 'Ativar', () => persist(state => {
                  const deduction = ensurePlans(state).payrolls.find(x => x.id === d.payrollId).deductions.find(x => x.id === d.id);
                  deduction.active = !deduction.active;
                }).catch(err => setNotice(err.message)), 'quiet')
              ),
              badge('Desconto em folha')
            ))
          ),
          recurringPensions.length > 0 && h('div', { className: 'nf-panel', style: { marginBottom: 16 } },
            h('h3', {}, 'Paga pela conta bancária (Recorrência)'),
            muted('O valor sai da conta no dia cadastrado e precisa ser confirmado a cada mês.'),
            recurringPensions.map(r => row(
              r.name,
              `${r.type === 'income' ? 'A receber' : 'A pagar'} · dia ${r.day} · ${accountName(s, r.accountId)} · ${r.active ? 'ativo' : 'pausado'}`,
              r.amountMode === 'variable' ? (r.amountCents ? `Estimativa ${money(r.amountCents)}` : 'Valor a informar') : r.amountCents,
              h('div', { className: 'nf-actions' },
                btn('Editar', () => open('recurrence', { item: r, pension: true }), 'quiet'),
                btn(r.active ? 'Pausar' : 'Ativar', () => persist(state => {
                  const item = ensurePlans(state).recurrences.find(x => x.id === r.id);
                  item.active = !item.active;
                }).catch(err => setNotice(err.message)), 'quiet')
              )
            ))
          ),
          !hasPensions && empty('Nenhuma pensão cadastrada', 'Você pode cadastrar pensão como desconto em folha CLT ou como compromisso mensal pela conta.'),
          h('div', { className: 'nf-actions', style: { marginTop: 16 } },
            p.payrolls.length > 0 && btn('Pensão na folha', () => open('deduction', { payrollId: p.payrolls[0].id, initialKind: 'pension' }), 'small', 'pension'),
            btn('Pensão pela conta', () => open('recurrence', { pension: true }), 'primary small', 'plus')
          )
        )
      );
    }

    function recurringView() {
      const list = p.recurrences.filter(r => !(r.category === 'Pensão' || (r.name && r.name.toLowerCase().includes('pens'))));
      return section('Contas recorrentes', 'Valor fixo para o que você já conhece; valor a informar para o que muda a cada mês.',
        list.length ? h('div', {}, list.map(r => row(
          r.name,
          `${r.type === 'income' ? 'A receber' : 'A pagar'} · dia ${r.day} · ${accountName(s, r.accountId)} · ${r.active ? 'ativo' : 'pausado'}`,
          r.amountMode === 'variable' ? (r.amountCents ? `Estimativa ${money(r.amountCents)}` : 'Valor a informar') : r.amountCents,
          h('div', { className: 'nf-actions' },
            btn('Editar', () => open('recurrence', { item: r }), 'quiet'),
            btn(r.active ? 'Pausar' : 'Ativar', () => persist(state => {
              const item = ensurePlans(state).recurrences.find(x => x.id === r.id);
              item.active = !item.active;
            }).catch(err => setNotice(err.message)), 'quiet')
          )
        ))) : empty('Seus compromissos mensais', 'Cadastre aluguel, assinaturas, luz, internet ou recebimentos recorrentes.'),
        h('div', { className: 'nf-actions' },
          btn('Nova recorrência', () => open('recurrence'), 'primary small', 'plus')
        )
      );
    }

    function commitmentsView() {
      return h(React.Fragment, {},
        h('div', { className: 'nf-metrics' },
          metric('Saldo nas contas', actual.balanceCents),
          metric('Parcelas restantes', totalDebt, 'out'),
          metric('Previsto a pagar no mês', projection.unknown ? (money(projection.pendingCents) + ' + ' + projection.unknown + ' a informar') : projection.pendingCents, 'out')
        ),
        section('Compromissos do mês & Agenda financeira', `Competência ${month} · ${projection.unknown} compromisso(s) com valor a informar. Consignados já estão dentro dos descontos do salário.`,
          agendaItems.length ? agendaItems.map(i => h('div', { key: i.key }, renderObligation(i))) : empty('Nenhum compromisso cadastrado para esta competência', 'Cadastre uma folha, contrato ou conta recorrente para ver os próximos compromissos.'),
          btn('Gasto avulso', () => open('entry', { type: 'expense' }), 'small', 'plus')
        )
      );
    }

    function historyView() {
      const postedEntries = s.entries.filter(e => e.status === 'posted' && e.date <= today() && e.date.startsWith(month));
      return section('Registros reais', `Movimentações confirmadas em ${month}.`,
        postedEntries.length
          ? postedEntries.slice().sort((a, b) => b.date.localeCompare(a.date)).map(e => row(
              e.description,
              e.type === 'transfer' ? `${accountName(s, e.accountId)} → ${accountName(s, e.toAccountId)}` : `${new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')} · ${accountName(s, e.accountId)} · ${e.category || SOURCES[e.source] || 'Fatura'}`,
              `${e.type === 'income' ? '+' : e.type === 'expense' ? '-' : ''}${money(e.amountCents)}`,
              btn('Excluir', () => open('delete-entry', { item: e }), 'quiet')
            ))
          : empty('Nenhuma movimentação confirmada nesta competência', 'Saldos iniciais e compromissos previstos ficam nas suas respectivas seções.'),
        h('div', { className: 'nf-actions' },
          btn('Recebimento', () => open('entry', { type: 'income' }), 'small'),
          btn('Gasto', () => open('entry', { type: 'expense' }), 'small'),
          btn('Transferir', () => open('entry', { type: 'transfer' }), 'primary small')
        )
      );
    }

    let body;
    if(tab==='overview') {
      body = h('div', { className: 'nf-option-grid' },
        [
          ['debts', 'debt', 'Dívidas & Juros', 'Simulador de amortização e ranking'],
          ['cart', 'cart', 'Carrinho', 'Lista de compras futuras e desejos'],
          ['birthdays', 'birthday', 'Aniversários', 'Datas especiais e lembretes'],
          ['payroll', 'payroll', 'CLT e folha', 'Salário, descontos e líquido'],
          ['business', 'business', 'Minha empresa', 'Saldo e retiradas pessoais'],
          ['contracts', 'debt', 'Consignado e financiamento', 'Contratos e parcelas restantes'],
          ['pension', 'pension', 'Pensão', 'Na folha ou paga pela conta'],
          ['recurring', 'recurring', 'Contas recorrentes', 'Fixas ou com valor a informar'],
          ['accounts', 'wallet', 'Contas e saldos', 'Separe pessoal e empresa'],
          ['commitments', 'calendar', 'Compromissos do mês', 'Agenda financeira e vencimentos'],
          ['history', 'history', 'Registros reais', 'Extrato de movimentações confirmadas'],
          ['notifications', 'bell', 'Notificações', 'Central de avisos e lembretes']
        ].map(([id, ico, title, text]) =>
          h('button', { key: id, type: 'button', className: 'nf-option', onClick: () => setTab(id) },
            icon(ico),
            h('strong', {}, title),
            h('span', {}, text)
          )
        )
      );
    }
    if(tab==='debts') body = h(DebtsView, { s, p, month });
    if(tab==='cart') body = h(CartView, { s, open, persist, setNotice });
    if(tab==='birthdays') body = birthdaysView();
    if(tab==='payroll') body = payrollView();
    if(tab==='business') body = h(React.Fragment, {},
      h('div', { className: 'nf-metrics' },
        metric('Na empresa hoje', business.balanceCents, 'in'),
        metric('Recebido no mês', business.incomeCents),
        metric('Retirado para mim', business.withdrawalsCents)
      ),
      section('Dinheiro da empresa', 'Receber de um cliente é uma entrada. Retirar para sua conta pessoal é uma transferência.',
        business.accounts.length ? h('div', { className: 'nf-card-grid' }, business.accounts.map(accountTile)) : empty('Cadastre a conta da empresa', 'Ela aparece como um cartão próprio, com saldo separado do seu dinheiro pessoal.'),
        btn('Conta da empresa', () => open('account', { scope: 'business' }), 'primary', 'plus')
      ),
      section('Movimentações da empresa', 'Entradas, despesas, aportes e retiradas.',
        s.entries.filter(e => e.status === 'posted' && e.date.startsWith(month) && (entryScope(s, e) === 'business' || (e.type === 'transfer' && s.accounts.find(a => a.id === e.toAccountId)?.scope === 'business'))).reverse().map(e =>
          row(e.description, e.type === 'transfer' ? `${accountName(s, e.accountId)} → ${accountName(s, e.toAccountId)}` : accountName(s, e.accountId), e.amountCents)
        )
      )
    );
    if(tab==='contracts') body = debtView();
    if(tab==='pension') body = pensionView();
    if(tab==='recurring') body = recurringView();
    if(tab==='accounts') body = h(React.Fragment, {},
      section('Suas contas e dinheiro em mãos', 'Cada conta bancária reúne seu saldo e seus cartões vinculados.',
        s.accounts.length ? h('div', { className: 'nf-card-grid' }, s.accounts.map(accountTile)) : noAccounts(),
        h('div', { className: 'nf-actions' },
          btn('Conta pessoal', () => open('account', { scope: 'personal' }), 'small', 'plus'),
          btn('Conta da empresa', () => open('account', { scope: 'business' }), 'primary small', 'plus')
        )
      ),
      section('Cartões sem conta vinculada', 'Vincule um cartão existente a uma conta bancária ou mantenha um cartão independente.',
        s.cards.filter(c => !c.accountId).length
          ? s.cards.filter(c => !c.accountId).map(c => row(c.name, cardBank(s, c) + ' · ' + SCOPES[c.scope], undefined, btn('Editar / vincular', () => open('card', { item: c }), 'small')))
          : muted(s.cards.length ? 'Todos os seus cartões estão vinculados a contas.' : 'Nenhum cartão cadastrado ainda.'),
        btn('Adicionar cartão', () => open('card'), 'small', 'plus')
      ),
      section('Faturas dos cartões', 'Todos os meses. Compras e parcelas ficam no cartão; pagar a fatura não repete o gasto.',
        invoices(s).length
          ? invoices(s).map(i =>
              h('div', { key: i.key },
                row(i.name, 'Vencimento ' + new Date(i.date + 'T12:00:00').toLocaleDateString('pt-BR') + ' · ' + SCOPES[i.scope], i.remainingCents, i.remainingCents > 0 ? btn('Pagar', () => open('invoice', { item: i }), 'small') : badge('Quitada', 'success')),
                h('details', {},
                  h('summary', {}, 'Composição da fatura'),
                  i.items.map((item, n) => row(item.description, item.installment ? 'Parcela ' + item.installment : 'Saldo trazido para o controle', item.amountCents)),
                  row('Total da fatura', '', i.totalCents),
                  row('Pagamentos confirmados', '', i.paidCents),
                  row('Saldo em aberto', '', i.remainingCents)
                )
              )
            )
          : empty('Sem faturas cadastradas', 'Configure o fechamento e o vencimento ao cadastrar ou editar um cartão.')
      )
    );
    if(tab==='commitments') body = commitmentsView();
    if(tab==='history') body = historyView();
    if(tab==='notifications') body = h(NotificationCenter, {});

    function modalView() {
      if(!modal)return null;
      const item=modal.item;
      const wrapper=(title,children,action,hint,submit)=>h(Modal,{key:modal.key,title,onClose:close,onSubmit:action,hint,submit},children);
      if(modal.kind==='cart-item')return h(CartItemForm,{key:modal.key,item,onClose:close,onSave:async data=>{await persist(state=>upsertCartItem(state,data));setNotice('Item do carrinho salvo.');}});
      if(modal.kind==='delete-cart-item')return wrapper('Excluir do carrinho',h('p',{className:'nf-hint full'},`Deseja realmente remover "${item.name}" do seu carrinho?`),()=>persist(state=>removeCartItem(state,item.id)),undefined,'Excluir');
      if(modal.kind==='birthday')return h(BirthdayForm,{key:modal.key,item,onClose:close,onSave:async data=>{await persist(state=>{state.birthdays||=[];const i=state.birthdays.findIndex(x=>x.id===data.id);if(i<0)state.birthdays.push({...data,id:uid()});else state.birthdays[i]=data;});setNotice('Aniversário salvo.');}});
      if(modal.kind==='delete-birthday')return wrapper('Excluir aniversário',h('p',{className:'nf-hint full'},`Deseja realmente remover o aniversário de "${item.name}"?`),()=>persist(state=>{state.birthdays=(state.birthdays||[]).filter(x=>x.id!==item.id);}),undefined,'Excluir');
      if(modal.kind==='account')return h(AccountForm,{key:modal.key,item,scope:modal.scope,s,onClose:close,onSave:async fd=>{const account={...item,id:item?.id||uid(),name:fd.get('name').trim(),bank:fd.get('kind')==='bank'?(fd.get('bank')||'').trim():'',scope:fd.get('scope'),kind:fd.get('kind'),openingBalanceCents:cents(fd.get('balance')),openingDate:fd.get('date')};await persist(state=>upsertAccount(state,account));if(!item&&account.kind==='bank'){open('account-created',{account});return false;}}});
      if(modal.kind==='account-created')return h(Modal,{key:modal.key,title:'Conta bancária cadastrada',onClose:close,plain:true},h('p',{className:'nf-hint'},modal.account.name+' · '+modal.account.bank+' · '+SCOPES[modal.account.scope]),muted('Você pode adicionar agora um cartão físico, virtual ou adicional a esta conta.'),h('div',{className:'nf-form-actions'},btn('Concluir',close),btn('Adicionar cartão a esta conta',()=>open('card',{accountId:modal.account.id}),'primary','plus')));
      if(modal.kind==='payroll')return wrapper(item?'Editar CLT e folha':'Cadastrar meu CLT',h(React.Fragment,{},field('name','Empresa / trabalho CLT',inp('name',item?.name,'text',{required:true,maxLength:160}),true),centsField('base','Salário antes dos descontos cadastrados (R$)',item?.baseCents,true),field('accountId','Conta que recebe o salário',sel('accountId',item?.accountId,accountOpts(s,'personal')),true),field('payDay','Dia de pagamento',inp('payDay',item?.payDay||5,'number',{required:true,min:1,max:31})),field('startMonth','Acompanhar a partir de',inp('startMonth',item?.startMonth||month,'month',{required:true,min:'2000-01',max:'2200-12'}))),fd=>persist(state=>{const pay={...item,id:item?.id||uid(),name:fd.get('name').trim(),baseCents:cents(fd.get('base')),accountId:fd.get('accountId'),payDay:Number(fd.get('payDay')),startMonth:fd.get('startMonth'),active:true,deductions:item?.deductions||[]};const p=ensurePlans(state),i=p.payrolls.findIndex(x=>x.id===pay.id);if(i<0)p.payrolls.push(pay);else p.payrolls[i]=pay;}),'Use o valor da folha antes dos descontos que você cadastrar. INSS, impostos e outros descontos precisam ser informados por você.');
      if(modal.kind==='deduction')return h(DeductionForm,{key:modal.key,item,payrollId:modal.payrollId,initialKind:modal.initialKind||'other',onClose:close,month,onSave:fd=>persist(state=>{const p=ensurePlans(state),pay=p.payrolls.find(x=>x.id===modal.payrollId);const d={...item,id:item?.id||uid(),name:fd.get('name').trim(),kind:fd.get('kind'),mode:fd.get('mode'),amountCents:fd.get('mode')==='fixed'?cents(fd.get('value')):0,rateBps:fd.get('mode')==='percent'?cents(fd.get('value')):0,startMonth:fd.get('startMonth'),endMonth:fd.get('endMonth')||null,active:item?.active??true};const i=pay.deductions.findIndex(x=>x.id===d.id);if(i<0)pay.deductions.push(d);else pay.deductions[i]=d;})});
      if(modal.kind==='debt')return h(DebtForm,{key:modal.key,item,defaults:modal,s,month,onClose:close,onSave:fd=>persist(state=>{
        const rateVal = fd.get('rate') ? fd.get('rate').trim() : '';
        const cetVal = fd.get('cet') ? fd.get('cet').trim() : '';
        const curBalVal = fd.get('currentBalance') ? fd.get('currentBalance').trim() : '';
        const d={
          ...item,
          id:item?.id||uid(),
          name:fd.get('name').trim(),
          kind:fd.get('kind'),
          creditor:fd.get('creditor')?fd.get('creditor').trim():'',
          installmentCents:cents(fd.get('amount')),
          installments:Number(fd.get('count')),
          firstDueDate:fd.get('date'),
          interestRateBps:rateVal?cents(rateVal):undefined,
          cetBps:cetVal?cents(cetVal):undefined,
          currentBalanceCents:curBalVal?cents(curBalVal):undefined,
          payrollId:fd.get('kind')==='payroll_loan'?fd.get('payrollId'):null,
          accountId:fd.get('kind')==='payroll_loan'?null:fd.get('accountId')
        };
        const p=ensurePlans(state),index=p.debts.findIndex(x=>x.id===d.id);
        if(item&&(s.entries.some(e=>e.debtId===item.id)||p.payrollRuns.some(r=>r.deductions.some(d=>d.debtId===item.id)))){
          for(const key of ['kind','installmentCents','installments','firstDueDate','payrollId'])if(d[key]!==item[key])throw new Error('Este contrato já tem parcelas confirmadas. Mantenha o parcelamento para preservar o histórico.');
        }
        if(index<0)p.debts.push(d);else p.debts[index]=d;
      })});
      if(modal.kind==='recurrence')return h(RecurrenceForm,{key:modal.key,item,pension:modal.pension,s,month,onClose:close,onSave:fd=>persist(state=>{const r={...item,id:item?.id||uid(),name:fd.get('name').trim(),type:fd.get('type'),accountId:fd.get('accountId'),amountMode:fd.get('amountMode'),amountCents:fd.get('amount')?cents(fd.get('amount')):0,day:Number(fd.get('day')),paymentMethod:fd.get('method'),category:fd.get('category'),source:fd.get('source'),startMonth:fd.get('startMonth'),endMonth:fd.get('endMonth')||null,active:item?.active??true};const p=ensurePlans(state),i=p.recurrences.findIndex(x=>x.id===r.id);if(i<0)p.recurrences.push(r);else p.recurrences[i]=r;})});
      if(modal.kind==='entry')return wrapper(modal.type==='transfer'?'Retirada / transferência':modal.type==='income'?'Registrar recebimento':'Registrar gasto',h(EntryFields,{s,type:modal.type,defaults:modal.defaults}),fd=>persist(state=>state.entries.push(entryFrom(fd,modal.type))));
      if(modal.kind==='settle'){
        if(!item)return null;
        const pay=p.payrolls.find(pay=>pay.id===item.id);
        return wrapper(item.kind==='payroll'?'Confirmar salário recebido':item.type==='income'?'Confirmar recebimento':'Confirmar pagamento',h(React.Fragment,{},h('p',{className:'nf-hint full'},`${item.name} · competência ${month}${item.kind==='payroll'?' · o depósito será o salário menos todos os descontos cadastrados.':''}`),item.kind==='payroll'?h(PayrollConfirmFields,{s,pay,month}):h(React.Fragment,{},centsField('amount',item.variable?'Valor real deste mês (R$)':'Valor (R$)',item.amountCents??undefined,true,{readOnly:item.kind==='debt'}),dateField('date','Data em que aconteceu'))),fd=>persist(state=>settleObligation(state,item.key,month,fd.get('date'),cents(fd.get('amount')))),item.kind==='payroll'?'Ao confirmar, o líquido entra na conta e a parcela do consignado é baixada. Não pague esse mesmo desconto novamente como despesa.':undefined,'Confirmar');
      }
      if(modal.kind==='invoice')return wrapper('Pagar fatura',h(React.Fragment,{},h('p',{className:'nf-hint full'},`${item.name} · em aberto ${money(item.remainingCents)}`),centsField('amount','Valor pago (R$)',item.remainingCents),dateField('date','Pagamento'),field('accountId','Conta que paga',sel('accountId',null,accountOpts(s)),true)),fd=>persist(state=>state.entries.push({id:uid(),type:'card_payment',description:`Fatura · ${item.name}`,amountCents:cents(fd.get('amount')),date:fd.get('date'),status:'posted',accountId:fd.get('accountId'),cardId:item.cardId,invoiceDate:item.date,paymentMethod:'boleto'})),'O pagamento reduz o saldo da conta e a fatura, sem gerar outro gasto.');
      if(modal.kind==='card')return h(CardForm,{key:modal.key,item,accountId:modal.accountId,s,onClose:close,onSave:async data=>{await nw.saveCard(data);setNotice('Cartão salvo na sua carteira.');}});
      if(modal.kind==='delete-entry')return wrapper('Excluir registro',h('p',{className:'nf-hint full'},`Excluir “${item.description}” recalcula o saldo. Se for salário, os descontos e consignados vinculados a esse recebimento também serão reabertos.`),()=>persist(state=>removePostedEntry(state,item.id)),undefined,'Excluir');
      return null;
    }
    const currentLabel = tabs.find(([id]) => id === tab)?.[1] || 'Carteira';
    return h('div', { className: 'nf-theme nf-workspace', 'data-theme': isDarkMode ? 'dark' : 'light' },
      tab === 'overview'
        ? h('header', { className: 'nf-workspace-head' },
            h('div', {},
              h('p', { className: 'nf-eyebrow' }, 'Sua vida financeira, conectada'),
              h('h1', {}, 'Minha carteira'),
              muted('Selecione um módulo para visualizar e gerenciar:')
            ),
            h('label', { className: 'nf-month' },
              'Competência',
              h('input', {
                type: 'month',
                value: month,
                min: '2000-01',
                max: '2200-12',
                onChange: e => e.target.value && setMonth(e.target.value)
              })
            )
          )
        : h('header', { className: 'nf-workspace-head nf-module-head' },
            h('div', { className: 'nf-module-nav' },
              h('button', {
                type: 'button',
                className: 'nf-back-btn',
                onClick: () => setTab('overview'),
                'aria-label': 'Voltar para Carteira'
              },
                icon('arrowLeft'),
                h('span', {}, 'Voltar para Carteira')
              ),
              h('button', {
                type: 'button',
                className: 'nf-module-badge-btn',
                'aria-current': 'page',
                onClick: () => {}
              }, currentLabel)
            ),
            h('label', { className: 'nf-month' },
              'Competência',
              h('input', {
                type: 'month',
                value: month,
                min: '2000-01',
                max: '2200-12',
                onChange: e => e.target.value && setMonth(e.target.value)
              })
            )
          ),
      nw.error && h(ConnectionNotice, { nw }),
      notice && h('p', { className: 'nf-notice', role: 'status' }, notice),
      !nw.loaded ? empty('Carregando seu financeiro…', 'Aguarde a conexão com seu servidor.') : body,
      h(Presence, {}, modalView())
    );
  }

  function DeductionForm({item,payrollId,initialKind='other',onClose,month,onSave}) {
    const [mode,setMode]=React.useState(item?.mode||'fixed');
    return h(Modal,{title:item?'Editar desconto':'Adicionar desconto na folha',onClose,onSubmit:onSave,hint:'Percentuais usam o salário informado como base. Os valores não são calculados por tabelas legais.'},field('name','Descrição do desconto',inp('name',item?.name|| (initialKind==='pension'?'Pensão':''),'text',{required:true,maxLength:160}),true),field('kind','Tipo',sel('kind',item?.kind||initialKind,[['other','Outro desconto'],['tax','INSS / imposto informado'],['pension','Pensão na folha']])),field('mode','Como informar',h('select',{name:'mode',value:mode,onChange:e=>setMode(e.target.value)},h('option',{value:'fixed'},'Valor fixo'),h('option',{value:'percent'},'Percentual do salário'))),centsField('value',mode==='fixed'?'Valor mensal (R$)':'Percentual (%)',item?(mode==='fixed'?item.amountCents:item.rateBps):undefined,true),field('startMonth','Primeira competência',inp('startMonth',item?.startMonth||month,'month',{required:true,min:'2000-01',max:'2200-12'})),field('endMonth','Última competência (opcional)',inp('endMonth',item?.endMonth||'','month',{min:'2000-01',max:'2200-12'})));
  }
  function DebtForm({item,defaults,s,month,onClose,onSave}) {
    const [kind,setKind]=React.useState(item?.kind||defaults.debtKind||defaults.contractKind||'loan');
    return h(Modal,{title:item?'Editar contrato':'Consignado, financiamento ou empréstimo',onClose,onSubmit:onSave,hint:'Informe as parcelas restantes. Opcionalmente informe taxas para simulação de amortização.'},
      field('name','Nome do contrato',inp('name',item?.name,'text',{required:true,maxLength:160,placeholder:'Ex.: Consignado TECFAG ou Financiamento HB20'}),true),
      field('kind','Tipo de contrato',h('select',{name:'kind',value:kind,onChange:e=>setKind(e.target.value)},h('option',{value:'payroll_loan'},'Consignado · descontado na folha'),h('option',{value:'financing'},'Financiamento'),h('option',{value:'loan'},'Outro empréstimo'))),
      field('creditor','Banco / credor (opcional)',inp('creditor',item?.creditor,'text',{maxLength:160})),
      centsField('amount','Valor de cada parcela (R$)',item?.installmentCents),
      field('count',item?'Parcelas cadastradas no início':'Parcelas ainda restantes',inp('count',item?.installments||1,'number',{required:true,min:1,max:600})),
      field('date','Vencimento da primeira restante',inp('date',item?.firstDueDate||dueDate(month,5),'date',{required:true,min:'2000-01-01',max:'2200-12-31'})),
      field('rate','Taxa de juros mensal (%, opcional)',inp('rate',item?.interestRateBps?inputMoney(item.interestRateBps):'','text',{inputMode:'decimal',placeholder:'Ex.: 4,98'})),
      field('cet','Custo Efetivo Total CET (%, opcional)',inp('cet',item?.cetBps?inputMoney(item.cetBps):'','text',{inputMode:'decimal',placeholder:'Ex.: 5,85'})),
      field('currentBalance','Saldo devedor p/ quitação (R$, opcional)',inp('currentBalance',item?.currentBalanceCents?inputMoney(item.currentBalanceCents):'','text',{inputMode:'decimal',placeholder:'Ex.: 19403,17'})),
      kind==='payroll_loan'?field('payrollId','Folha CLT vinculada',sel('payrollId',item?.payrollId||defaults.payrollId,[['','Selecione uma folha'],...plansOf(s).payrolls.map(p=>[p.id,p.name])])):field('accountId','Conta que paga as parcelas',sel('accountId',item?.accountId,accountOpts(s)))
    );
  }
  function RecurrenceForm({item,pension,s,month,onClose,onSave}) {
    const [type,setType]=React.useState(item?.type||'expense'),[mode,setMode]=React.useState(item?.amountMode||'fixed');
    return h(Modal,{title:pension?'Pensão paga pela conta':item?'Editar recorrência':'Conta ou recebimento recorrente',onClose,onSubmit:onSave,hint:'Previsões não alteram o saldo. A cada mês, confirme quando pagar ou receber. No modo variável, confirme o valor real.'},field('name','Descrição',inp('name',item?.name||(pension?'Pensão':''),'text',{required:true,maxLength:160}),true),field('type','Movimentação',h('select',{name:'type',value:type,onChange:e=>setType(e.target.value)},h('option',{value:'expense'},'Conta a pagar'),h('option',{value:'income'},'Recebimento previsto'))),field('amountMode','Valor',h('select',{name:'amountMode',value:mode,onChange:e=>setMode(e.target.value)},h('option',{value:'fixed'},'Fixo todo mês'),h('option',{value:'variable'},'Varia · informar a cada mês'))),field('amount',mode==='fixed'?'Valor mensal (R$)':'Estimativa (opcional, R$)',inp('amount',item?.amountCents?inputMoney(item.amountCents):'','text',{inputMode:'decimal',required:mode==='fixed',placeholder:'0,00'})),field('day','Dia do vencimento / recebimento',inp('day',item?.day||10,'number',{required:true,min:1,max:31})),field('accountId','Conta',sel('accountId',item?.accountId,accountOpts(s))),field('method','Forma de pagamento',sel('method',item?.paymentMethod||'pix',Object.entries(METHODS).filter(([k])=>k!=='credit'))),type==='expense'?field('category','Categoria',sel('category',item?.category||(pension?'Pensão':'Outros'),CATEGORIES.map(c=>[c,c]))):field('source','Origem',sel('source',item?.source||'company',Object.entries(SOURCES))),field('startMonth','Primeiro mês',inp('startMonth',item?.startMonth||month,'month',{required:true,min:'2000-01',max:'2200-12'})),field('endMonth','Último mês (opcional)',inp('endMonth',item?.endMonth||'','month',{min:'2000-01',max:'2200-12'})));
  }
  function CartItemForm({item,onClose,onSave}) {
    const [photo,setPhoto]=React.useState(item?.photo||null);
    const [name,setName]=React.useState(item?.name||'');
    const [priceStr,setPriceStr]=React.useState(item?.priceCents?inputMoney(item.priceCents):'');
    const [url,setUrl]=React.useState(item?.url||'');
    const [category,setCategory]=React.useState(item?.category||'Geral');
    const [priority,setPriority]=React.useState(item?.priority||'medium');
    const [notes,setNotes]=React.useState(item?.notes||'');
    const [isBought,setIsBought]=React.useState(item?.status==='bought');
    const [boughtAt,setBoughtAt]=React.useState(item?.boughtAt||today());

    function handlePhoto(e){
      const file=e.target.files?.[0];
      if(!file)return;
      const reader=new FileReader();
      reader.onload=ev=>{
        const img=new Image();
        img.onload=()=>{
          const canvas=document.createElement('canvas');
          const max=320;
          let w=img.width,h=img.height;
          if(w>h){if(w>max){h=Math.round(h*max/w);w=max;}}
          else{if(h>max){w=Math.round(w*max/h);h=max;}}
          canvas.width=w;canvas.height=h;
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,w,h);
          setPhoto(canvas.toDataURL('image/jpeg',0.82));
        };
        img.src=ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    return h(Modal,{
      title:item?'Editar item do carrinho':'Novo item no carrinho',
      onClose,
      onSubmit:async()=>{
        if(!name.trim())throw new Error('Informe o nome do item.');
        let priceCents=0;
        if(priceStr.trim()){
          try{priceCents=cents(priceStr);}
          catch(e){throw new Error('Valor estimado inválido. Use um formato como 150,00.');}
        }
        let formattedUrl=url.trim();
        if(formattedUrl&&!/^https?:\/\//i.test(formattedUrl)){
          formattedUrl='https://'+formattedUrl;
        }
        await onSave({
          id:item?.id,
          name:name.trim(),
          priceCents,
          url:formattedUrl||null,
          photo,
          category,
          priority,
          notes:notes.trim()||null,
          status:isBought?'bought':'pending',
          boughtAt:isBought?boughtAt:null
        });
      },
      hint:'Salve itens para compras futuras. Você pode dar baixa como comprado a qualquer momento.'
    },
      h('div',{className:'nf-field full'},
        h('span',{},'Foto do produto (opcional)'),
        h('div',{className:'nf-photo-uploader'},
          photo?h('div',{className:'nf-photo-preview-box'},
            h('img',{src:photo,alt:'Preview',className:'nf-photo-preview'}),
            h('button',{type:'button',className:'nf-button small',onClick:()=>setPhoto(null)},'Remover foto')
          ):h('div',{className:'nf-photo-placeholder'},
            h('span',{},'🛍️ Nenhuma foto selecionada'),
            h('label',{className:'nf-button small nf-upload-btn'},
              'Escolher ou tirar foto',
              h('input',{type:'file',accept:'image/*',onChange:handlePhoto,className:'hidden'})
            )
          )
        )
      ),
      field('name','Nome do produto / item',h('input',{
        name:'name',
        value:name,
        onChange:e=>setName(e.target.value),
        required:true,
        maxLength:160,
        placeholder:'Ex.: Monitor 27 polegadas 4K, Tênis, Livro...'
      }),true),
      field('price','Valor estimado (R$)',h('input',{
        name:'price',
        value:priceStr,
        onChange:e=>setPriceStr(e.target.value),
        inputMode:'decimal',
        placeholder:'0,00'
      })),
      field('url','Link para compra (URL)',h('input',{
        name:'url',
        value:url,
        onChange:e=>setUrl(e.target.value),
        type:'url',
        placeholder:'https://exemplo.com.br/produto',
        maxLength:2000
      }),true),
      field('category','Categoria',h('select',{
        name:'category',
        value:category,
        onChange:e=>setCategory(e.target.value)
      },CART_CATEGORIES.map(c=>h('option',{key:c,value:c},c)))),
      field('priority','Prioridade',h('select',{
        name:'priority',
        value:priority,
        onChange:e=>setPriority(e.target.value)
      },Object.entries(CART_PRIORITIES).map(([k,l])=>h('option',{key:k,value:k},l)))),
      field('notes','Observações / Detalhes',h('textarea',{
        name:'notes',
        value:notes,
        onChange:e=>setNotes(e.target.value),
        placeholder:'Loja, cor, tamanho, modelo, cupom de desconto...',
        rows:2,
        maxLength:500
      }),true),
      h('label',{className:'nf-check full'},
        h('input',{
          type:'checkbox',
          checked:isBought,
          onChange:e=>setIsBought(e.target.checked)
        }),
        'Já comprei este item (dar baixa como comprado)'
      ),
      isBought&&field('boughtAt','Data da compra',h('input',{
        type:'date',
        name:'boughtAt',
        value:boughtAt,
        onChange:e=>setBoughtAt(e.target.value),
        required:true,
        min:'2000-01-01',
        max:'2200-12-31'
      }))
    );
  }
  function BirthdayForm({item,onClose,onSave}) {
    const [photo,setPhoto]=React.useState(item?.photo||null);
    const [hasYear,setHasYear]=React.useState(item?.hasYear!==false);
    const [name,setName]=React.useState(item?.name||'');
    const [date,setDate]=React.useState(item?.date||today());
    const [phone,setPhone]=React.useState(item?.phone||'');
    const [relationship,setRelationship]=React.useState(item?.relationship||'Família');
    const [notes,setNotes]=React.useState(item?.notes||'');
    const [notifyDays,setNotifyDays]=React.useState(item?.notifyDays||DEFAULT_NOTIFY_DAYS);
    function handlePhoto(e){
      const file=e.target.files?.[0];
      if(!file)return;
      const reader=new FileReader();
      reader.onload=ev=>{
        const img=new Image();
        img.onload=()=>{
          const canvas=document.createElement('canvas');
          const max=256;
          let w=img.width,h=img.height;
          if(w>h){if(w>max){h=Math.round(h*max/w);w=max;}}
          else{if(h>max){w=Math.round(w*max/h);h=max;}}
          canvas.width=w;canvas.height=h;
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,w,h);
          setPhoto(canvas.toDataURL('image/jpeg',0.82));
        };
        img.src=ev.target.result;
      };
      reader.readAsDataURL(file);
    }
    const toggleNotify=d=>setNotifyDays(notifyDays.includes(d)?notifyDays.filter(n=>n!==d):[...notifyDays,d]);
    return h(Modal,{
      title:item?'Editar aniversário':'Novo aniversário',
      onClose,
      onSubmit:async()=>{
        if(!name.trim())throw new Error('Informe o nome da pessoa.');
        if(!date)throw new Error('Informe a data do aniversário.');
        await onSave({
          id:item?.id,
          name:name.trim(),
          date,
          hasYear,
          photo,
          phone:phone.trim()||null,
          relationship,
          notes:notes.trim()||null,
          notifyDays,
          active:item?.active??true
        });
      },
      hint:'Lembretes serão enviados automaticamente ao seu iPhone: 1 mês, 1 semana, 3 dias antes e no dia do aniversário.'
    },
      h('div',{className:'nf-field full'},
        h('span',{},'Foto da pessoa (opcional)'),
        h('div',{className:'nf-photo-uploader'},
          photo?h('div',{className:'nf-photo-preview-box'},
            h('img',{src:photo,alt:'Preview',className:'nf-photo-preview'}),
            h('button',{type:'button',className:'nf-button small',onClick:()=>setPhoto(null)},'Remover foto')
          ):h('div',{className:'nf-photo-placeholder'},
            h('span',{},'👤 Nenhuma foto selecionada'),
            h('label',{className:'nf-button small nf-upload-btn'},
              'Escolher ou tirar foto',
              h('input',{type:'file',accept:'image/*',onChange:handlePhoto,className:'hidden'})
            )
          )
        )
      ),
      field('name','Nome completo',h('input',{name:'name',value:name,onChange:e=>setName(e.target.value),required:true,maxLength:160,placeholder:'Ex.: Maria Silva, João'}),true),
      field('date','Data de nascimento',h('input',{type:'date',name:'date',value:date,onChange:e=>setDate(e.target.value),required:true,min:'1900-01-01',max:'2200-12-31'}),true),
      h('label',{className:'nf-check full'},
        h('input',{type:'checkbox',checked:!hasYear,onChange:e=>setHasYear(!e.target.checked)}),
        'Não sei o ano de nascimento (calcular apenas dia e mês)'
      ),
      field('relationship','Parentesco / Categoria',h('select',{name:'relationship',value:relationship,onChange:e=>setRelationship(e.target.value)},
        [['Família','Família'],['Amigos','Amigos'],['Trabalho','Trabalho'],['Outros','Outros']].map(([v,l])=>h('option',{key:v,value:v},l))
      )),
      field('phone','WhatsApp / Celular (opcional)',h('input',{name:'phone',value:phone,onChange:e=>setPhone(e.target.value),placeholder:'11999999999',maxLength:30})),
      field('notes','Ideias de presente / Anotações',h('textarea',{name:'notes',value:notes,onChange:e=>setNotes(e.target.value),placeholder:'Gosta de chocolates, livros, café...',rows:2,maxLength:500})),
      h('div',{className:'full nf-notify-group'},
        h('span',{className:'nf-notify-label'},'Avisos no iPhone:'),
        h('div',{className:'nf-reminder-days'},
          [[30,'1 mês antes'],[7,'1 semana antes'],[3,'3 dias antes'],[0,'No dia']].map(([d,l])=>
            h('label',{key:d,className:'nf-check'},
              h('input',{type:'checkbox',checked:notifyDays.includes(d),onChange:()=>toggleNotify(d)}),
              l
            )
          )
        )
      )
    );
  }
  return {useWallet,Workspace,Statistics,CategorySpending,Calendar,calendarItems,selectWorkspaceSection,CardModal,TransactionModal,HomeConnections,NotificationModal,NotificationCenter,reminderCount:s=>payableReminders(s).length,transactions,legacyCards,balance,weeklyData,spentToday,calendarAppointments,currentAppointments:date=>calendarAppointments(snapshot.state,date),calendarTransactions:rows=>rows,statisticsRows,monthWeeks,insight,budget:s=>cashProjection(s,selectedMonth).totalCents,monthLabel:()=>new Date(today()+'T12:00:00').toLocaleDateString('pt-BR',{month:'long'}),summary:s=>summary(s,monthNow()),money,saveCard,deleteCard};
}
