import {emptyState,validateLedger,uid,cents,inputMoney,money,today,accountBalance,entryScope,summary,invoices,plansOf,ensurePlans,CATEGORIES,SCOPES,METHODS,SOURCES} from '../finance.mjs';
import {monthNow,dueDate,obligations,payrollPreview,debtSchedule,receivePayroll,settleObligation,businessSummary,commitmentSummary,removePostedEntry} from '../planning.mjs';
import {createNotificationUI} from './notifications-ui.mjs';
import {payableReminders} from '../reminders.mjs';

export function walletErrorMessage(err) {
  if(err instanceof TypeError && /fetch|network|load failed/i.test(err.message))return 'Não foi possível conectar ao servidor local. Verifique se o NWallet está iniciado e tente novamente.';
  return err.message;
}

// Shared by the original dashboard, entry sheets and Wallet screen.
export function createFinanceIntegration(React,motion,Presence) {
  const h=React.createElement;
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
    return s.cards.map(c=>({id:c.id,name:c.display?.holder||'Meu cartão',bank:c.display?.bank||c.name,number:c.display?.number||'•••• •••• •••• ••••',fullNumber:c.display?.fullNumber||'',expiry:c.display?.expiry||'',color:c.display?.color||'bg-purple-600',cvv:''}));
  }
  async function saveCard(data) {
    return save(s=>{
      const old=s.cards.find(c=>c.id===data.id),card={...old,id:old?.id||uid(),name:data.bank||data.name,scope:old?.scope||'personal',closingDay:old?.closingDay||25,dueDay:old?.dueDay||5,openingDebtCents:old?.openingDebtCents||0,openingDueDate:old?.openingDueDate||today(),display:{holder:data.name,bank:data.bank,number:data.number,fullNumber:data.fullNumber,expiry:data.expiry,color:data.color}};
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
      for(const item of obligations(s,month).filter(i=>!i.paid&&!i.viaPayroll))appointments.push({id:item.key,title:item.name,date:item.date,time:'09:00',description:item.amountCents?`${money(item.amountCents)} · ${item.type==='income'?'a receber':'a pagar'}`:'Valor a informar neste mês'});
    }
    for(const invoice of invoices(s).filter(i=>i.remainingCents>0))appointments.push({id:invoice.key,title:`Fatura ${invoice.name}`,date:invoice.date,time:'09:00',description:money(invoice.remainingCents)});
    return appointments.map(a=>({...a,date:new Date(a.date+'T12:00:00')}));
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
  const paths={wallet:'M3 7h18v13H3z M3 7V4h15v3 M15 11h6v5h-6z',payroll:'M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h3',business:'M3 21V7h18v14 M8 7V3h8v4 M7 11h2 M15 11h2 M7 15h2 M15 15h2 M10 21v-3h4v3',debt:'M12 3a9 9 0 1 0 9 9 M12 7v5l3 2',pension:'M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M17 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M2 21v-5a5 5 0 0 1 10 0v5 M14 21v-5a4 4 0 0 1 8 0v5',recurring:'M20 8a8 8 0 0 0-14-3L3 8 M3 3v5h5 M4 16a8 8 0 0 0 14 3l3-3 M16 16h5v5',plus:'M12 5v14 M5 12h14',close:'M6 6l12 12 M6 18 18 6',transfer:'M3 7h17l-4-4 M20 7l-4 4 M21 17H4l4-4 M4 17l4 4',check:'M5 12l4 4L19 6',card:'M3 5h18v14H3z M3 10h18 M6 15h4'};
  const icon=name=>h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[name]||paths.wallet}));
  const btn=(label,fn,kind='',ico)=>h('button',{type:'button',className:'nf-button '+kind,onClick:fn},ico&&icon(ico),label);
  const muted=text=>h('p',{className:'nf-muted'},text);
  const badge=(text,kind='')=>h('span',{className:'nf-badge '+kind},text);
  const empty=(title,text)=>h('div',{className:'nf-empty'},icon('wallet'),h('strong',{},title),muted(text));
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
    const form=plain?children:h('form',{onSubmit:async e=>{e.preventDefault();if(working)return;const fd=new FormData(e.currentTarget);setError('');setWorking(true);try{await onSubmit(fd);setWorking(false);onClose();}catch(err){setError(err.message);setWorking(false);}}},h('div',{className:'nf-form-grid'},children),hint&&h('p',{className:'nf-hint'},hint),error&&h('p',{className:'nf-error',role:'alert'},error),h('footer',{className:'nf-form-actions'},h('button',{type:'button',className:'nf-button',onClick:onClose,disabled:working},'Cancelar'),h('button',{className:'nf-button primary',disabled:working,type:'submit'},working?'Salvando…':submit)));
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
    const nw=useWallet(),p=plansOf(nw.state),business=businessSummary(nw.state,monthNow());
    return h('div',{className:'nf-theme nf-home-connections','data-theme':isDarkMode?'dark':'light'},nw.error&&h(ConnectionNotice,{nw}),h('button',{className:'nf-home-link',onClick:onOpen},icon('payroll'),h('span',{},h('strong',{},'CLT e folha'),h('small',{},p.payrolls.length?`${p.payrolls.length} folha(s) cadastrada(s)`:'Salário, descontos e consignado')),icon('plus')),h('button',{className:'nf-home-link',onClick:onOpen},icon('business'),h('span',{},h('strong',{},'Minha empresa'),h('small',{},business.accounts.length?`${money(business.balanceCents)} · saldo da empresa`:'Recebimentos e retiradas')),icon('plus')));
  }

  function Workspace({isDarkMode=true}) {
    const nw=useWallet(),s=nw.state,p=plansOf(s);
    const [tab,setTab]=React.useState(()=>new URLSearchParams(location.search).get('view')==='notifications'?'notifications':'overview'),[month,setMonth]=React.useState(monthNow()),[modal,setModal]=React.useState(null),[notice,setNotice]=React.useState('');
    const open=(kind,data={})=>{setNotice('');setModal({...data,kind,key:uid()});};
    const close=()=>setModal(null);
    const persist=async fn=>{await nw.save(fn);setNotice('Salvo no seu financeiro.');};
    const monthItems=obligations(s,month),projection=commitmentSummary(s,month),business=businessSummary(s,month),actual=summary(s,month);
    const tabs=[['overview','Visão geral'],['payroll','CLT e folha'],['business','Empresa'],['commitments','Compromissos'],['accounts','Contas'],['history','Registros'],['notifications','Notificações']];
    const noAccounts=()=>empty('Comece pelas suas contas','Cadastre a conta que recebe seu salário, a conta da empresa e o dinheiro em mãos.');
    const totalDebt=p.debts.reduce((v,d)=>v+debtSchedule(s,d).filter(i=>!i.paid).reduce((a,i)=>a+i.amountCents,0),0);
    const renderObligation=i=>row(i.name,`${new Date(i.date+'T12:00:00').toLocaleDateString('pt-BR')} · ${SCOPES[i.scope]||'Pessoal'}${i.number?` · parcela ${i.number}`:''}`,i.amountCents===null?'Valor a informar':i.amountCents,i.paid?badge('Confirmado','success'):i.viaPayroll?badge('Descontado na folha'):btn(i.type==='income'?'Recebi':'Paguei',()=>open('settle',{item:i}),'small'),i.variable?badge(i.amountCents?'Valor estimado · confirme o real':'Valor variável'):undefined);
    const accountTile=a=>h('article',{key:a.id,className:'nf-account-card '+a.scope},h('div',{className:'nf-card-top'},icon(a.scope==='business'?'business':'wallet'),badge(SCOPES[a.scope]),btn('Editar',()=>open('account',{item:a}),'quiet')),h('h3',{},a.name),h('strong',{className:'nf-card-balance'},money(accountBalance(s,a.id))),muted(a.scope==='business'?'Dinheiro que permanece na empresa':'Saldo da conta pessoal'),h('div',{className:'nf-card-actions'},btn('Receber',()=>open('entry',{type:'income',defaults:{accountId:a.id,source:a.scope==='business'?'company':'other'}}),'small'),a.scope==='business'?btn('Retirar para mim',()=>open('entry',{type:'transfer',defaults:{accountId:a.id}}),'small'):btn('Gasto',()=>open('entry',{type:'expense',defaults:{accountId:a.id}}),'small')));

    function payrollView() {
      return section('Seu CLT e a folha','O que foi combinado, o que já vem descontado e o que chega na sua conta.',p.payrolls.length?h('div',{className:'nf-stack'},p.payrolls.map(pay=>{
        const run=p.payrollRuns.find(r=>r.payrollId===pay.id&&r.month===month),preview=run?{baseCents:run.baseCents,deductions:run.deductions,deductionCents:run.baseCents-run.netCents,netCents:run.netCents}:payrollPreview(s,pay,month);
        return h('article',{key:pay.id,className:'nf-payroll-card'},h('div',{className:'nf-section-head'},h('div',{},h('h3',{},pay.name),muted(`Dia ${pay.payDay} · ${accountName(s,pay.accountId)}`)),btn('Editar folha',()=>open('payroll',{item:pay}),'small')),h('div',{className:'nf-metrics'},metric('Antes dos descontos',preview.baseCents),metric('Descontos na folha',preview.deductionCents,'out'),metric('Líquido na conta',preview.netCents,'in')),h('div',{className:'nf-deductions'},preview.deductions.length?preview.deductions.map((d,i)=>row(d.name,d.debtId?'Consignado vinculado · baixa junto do salário':d.kind==='pension'?'Pensão descontada na folha':'Desconto da folha',d.amountCents,undefined,badge('Já sai antes do depósito'))):muted('Nenhum desconto cadastrado nesta competência.')),h('div',{className:'nf-actions'},btn('Adicionar desconto',()=>open('deduction',{payrollId:pay.id}),'small','plus'),btn('Vincular consignado',()=>open('debt',{debtKind:'payroll_loan',payrollId:pay.id}),'small','debt'),btn('Pensão na folha',()=>open('deduction',{payrollId:pay.id,initialKind:'pension'}),'small','pension'),run?badge('Salário recebido','success'):month<pay.startMonth?badge('A partir de '+pay.startMonth):btn('Confirmar salário recebido',()=>open('settle',{item:monthItems.find(i=>i.kind==='payroll'&&i.id===pay.id)}),'primary small')),pay.deductions.length>0&&h('details',{},h('summary',{},'Gerenciar descontos'),pay.deductions.map(d=>row(d.name,d.active?'Ativo':'Pausado',d.mode==='percent'?`${inputMoney(d.rateBps)}%`:d.amountCents,h('div',{className:'nf-actions'},btn('Editar',()=>open('deduction',{payrollId:pay.id,item:d}),'quiet'),btn(d.active?'Pausar':'Ativar',()=>persist(state=>{const deduction=ensurePlans(state).payrolls.find(x=>x.id===pay.id).deductions.find(x=>x.id===d.id);deduction.active=!deduction.active;}).catch(err=>setNotice(err.message)),'quiet'))))));
      })):empty('Cadastre seu trabalho CLT','Informe o salário antes dos descontos que você vai cadastrar. Depois vincule consignados, pensão e outros descontos.'),btn('Cadastrar CLT',()=>open('payroll'),'primary','plus'));
    }
    function debtView(){return section('Consignados, financiamentos e empréstimos','Cadastre somente as parcelas que ainda faltam, com os valores do seu contrato.',p.debts.length?h('div',{className:'nf-stack'},p.debts.map(d=>{const schedule=debtSchedule(s,d),remaining=schedule.filter(i=>!i.paid),paid=schedule.length-remaining.length,pay=p.payrolls.find(p=>p.id===d.payrollId);return h('article',{key:d.id,className:'nf-contract-card'},h('div',{className:'nf-section-head'},h('div',{},h('h3',{},d.name),muted(`${({payroll_loan:'Consignado',financing:'Financiamento',loan:'Empréstimo'})[d.kind]}${pay?` · vinculado a ${pay.name}`:` · ${accountName(s,d.accountId)}`}${d.creditor?` · ${d.creditor}`:''}`)),btn('Editar',()=>open('debt',{item:d}),'small')),h('div',{className:'nf-metrics'},metric('Parcela',d.installmentCents),metric('Faltam',`${remaining.length} parcelas`),metric('Total a pagar',remaining.length*d.installmentCents,'out')),h('div',{className:'nf-progress'},h('span',{style:{width:`${paid/schedule.length*100}%`}})),muted(`${paid} de ${schedule.length} parcelas cadastradas confirmadas${d.kind==='payroll_loan'?' · descontadas ao confirmar o salário':''}`));})):empty('Mapeie suas dívidas','Seu consignado fica ligado à folha. Financiamentos e outros empréstimos saem da conta escolhida.'),btn('Adicionar contrato',()=>open('debt'),'primary','plus'));}
    function recurringView(){return section('Pensão e contas recorrentes','Valor fixo para o que você já conhece; valor a informar para o que muda a cada mês.',p.recurrences.length?h('div',{},p.recurrences.map(r=>row(r.name,`${r.type==='income'?'A receber':'A pagar'} · dia ${r.day} · ${accountName(s,r.accountId)} · ${r.active?'ativo':'pausado'}`,r.amountMode==='variable'?(r.amountCents?`Estimativa ${money(r.amountCents)}`:'Valor a informar'):r.amountCents,h('div',{className:'nf-actions'},btn('Editar',()=>open('recurrence',{item:r}),'quiet'),btn(r.active?'Pausar':'Ativar',()=>persist(state=>{const item=ensurePlans(state).recurrences.find(x=>x.id===r.id);item.active=!item.active;}).catch(err=>setNotice(err.message)),'quiet'))))):empty('Seus compromissos mensais','Cadastre pensão, aluguel, assinaturas, luz, internet ou recebimentos recorrentes.'),h('div',{className:'nf-actions'},btn('Pensão',()=>open('recurrence',{pension:true}),'small','pension'),btn('Recorrência',()=>open('recurrence'),'primary small','plus')));}

    let body;
    if(tab==='overview')body=h(React.Fragment,{},h('div',{className:'nf-option-grid'},[['payroll','payroll','CLT e folha','Salário, descontos e líquido'],['business','business','Minha empresa','Saldo e retiradas pessoais'],['commitments','debt','Consignado e financiamento','Contratos e parcelas restantes'],['commitments','pension','Pensão','Na folha ou paga pela conta'],['commitments','recurring','Contas recorrentes','Fixas ou com valor a informar'],['accounts','wallet','Contas e saldos','Separe pessoal e empresa']].map(([id,i,title,text])=>h('button',{key:title,className:'nf-option',onClick:()=>setTab(id)},icon(i),h('strong',{},title),h('span',{},text)))),h('div',{className:'nf-metrics'},metric('Saldo nas contas',actual.balanceCents),metric('Parcelas restantes',totalDebt,'out'),metric('Previsto a pagar no mês',projection.unknown?(money(projection.expenseCents)+' + '+projection.unknown+' a informar'):projection.expenseCents,'out')),section('Agenda financeira',`Competência ${month} · ${projection.unknown} compromisso(s) com valor a informar. Consignados já estão dentro dos descontos do salário.`,monthItems.length?monthItems.map(i=>h('div',{key:i.key},renderObligation(i))):empty('Sua agenda começa pelos cadastros','Cadastre uma folha, contrato ou conta recorrente para ver os próximos compromissos.'),btn('Gasto avulso',()=>open('entry',{type:'expense'}),'small','plus')));
    if(tab==='payroll')body=payrollView();
    if(tab==='business')body=h(React.Fragment,{},h('div',{className:'nf-metrics'},metric('Na empresa hoje',business.balanceCents,'in'),metric('Recebido no mês',business.incomeCents),metric('Retirado para mim',business.withdrawalsCents)),section('Dinheiro da empresa','Receber de um cliente é uma entrada. Retirar para sua conta pessoal é uma transferência.',business.accounts.length?h('div',{className:'nf-card-grid'},business.accounts.map(accountTile)):empty('Cadastre a conta da empresa','Ela aparece como um cartão próprio, com saldo separado do seu dinheiro pessoal.'),btn('Conta da empresa',()=>open('account',{scope:'business'}),'primary','plus')),section('Movimentações da empresa','Entradas, despesas, aportes e retiradas.',s.entries.filter(e=>e.status==='posted'&&e.date.startsWith(month)&&(entryScope(s,e)==='business'||(e.type==='transfer'&&s.accounts.find(a=>a.id===e.toAccountId)?.scope==='business'))).reverse().map(e=>row(e.description,e.type==='transfer'?`${accountName(s,e.accountId)} → ${accountName(s,e.toAccountId)}`:accountName(s,e.accountId),e.amountCents))));
    if(tab==='commitments')body=h(React.Fragment,{},debtView(),recurringView(),section('Compromissos deste mês',`${projection.unknown} valor(es) ainda não informado(s).`,monthItems.filter(i=>i.type==='expense').length?monthItems.filter(i=>i.type==='expense').map(i=>h('div',{key:i.key},renderObligation(i))):empty('Nenhuma obrigação cadastrada','Cadastre os compromissos conhecidos para acompanhar os vencimentos.')));
    if(tab==='accounts')body=h(React.Fragment,{},section('Suas contas e dinheiro em mãos','O saldo inicial é o ponto de partida e não entra como receita.',s.accounts.length?h('div',{className:'nf-card-grid'},s.accounts.map(accountTile)):noAccounts(),h('div',{className:'nf-actions'},btn('Conta pessoal',()=>open('account',{scope:'personal'}),'small','plus'),btn('Conta da empresa',()=>open('account',{scope:'business'}),'primary small','plus'))),section('Faturas dos cartões','Compras e parcelas ficam no cartão. Pagar a fatura não repete o gasto.',invoices(s).length?invoices(s).map(i=>row(i.name,`Vencimento ${i.date} · ${SCOPES[i.scope]}`,i.remainingCents,i.remainingCents>0?btn('Pagar',()=>open('invoice',{item:i}),'small'):badge('Quitada','success'))):empty('Sem faturas cadastradas','Você pode adicionar cartões no início e configurar o fechamento e o vencimento abaixo.')),section('Configurar cartões existentes','Defina fechamento, vencimento e a fatura anterior em aberto.',s.cards.length?s.cards.map(c=>row(c.name,`Fecha dia ${c.closingDay} · vence dia ${c.dueDay}`,c.openingDebtCents,btn('Configurar fatura',()=>open('card',{item:c}),'small'))):muted('Adicione um cartão na seção “Meu Cartão” do início.')));
    if(tab==='history')body=section('Registros reais',`Movimentações confirmadas em ${month}.`,s.entries.filter(e=>e.date.startsWith(month)).slice().reverse().map(e=>row(e.description,e.type==='transfer'?`${accountName(s,e.accountId)} → ${accountName(s,e.toAccountId)}`:`${accountName(s,e.accountId)} · ${e.category||SOURCES[e.source]||'Fatura'}`,`${e.type==='income'?'+':e.type==='expense'?'-':''}${money(e.amountCents)}`,btn('Excluir',()=>open('delete-entry',{item:e}),'quiet'))),h('div',{className:'nf-actions'},btn('Recebimento',()=>open('entry',{type:'income'}),'small'),btn('Gasto',()=>open('entry',{type:'expense'}),'small'),btn('Transferir',()=>open('entry',{type:'transfer'}),'primary small')));

    function modalView() {
      if(!modal)return null;
      const item=modal.item;
      const wrapper=(title,children,action,hint,submit)=>h(Modal,{key:modal.key,title,onClose:close,onSubmit:action,hint,submit},children);
      if(modal.kind==='account')return wrapper(item?'Editar conta':'Cadastrar conta',h(React.Fragment,{},field('name','Nome da conta',inp('name',item?.name,'text',{required:true,maxLength:160,placeholder:modal.scope==='business'?'Ex.: Conta da minha empresa':'Ex.: Banco que recebe meu CLT'}),true),field('scope','Contexto',sel('scope',item?.scope||modal.scope||'personal',Object.entries(SCOPES))),field('kind','Tipo',sel('kind',item?.kind||'bank',[['bank','Conta bancária'],['cash','Dinheiro em mãos']])),centsField('balance','Saldo inicial (R$)',item?.openingBalanceCents||0),dateField('date','Data do saldo',item?.openingDate||today())),fd=>persist(state=>{const a={id:item?.id||uid(),name:fd.get('name').trim(),scope:fd.get('scope'),kind:fd.get('kind'),openingBalanceCents:cents(fd.get('balance')),openingDate:fd.get('date')};const index=state.accounts.findIndex(x=>x.id===a.id);if(index<0)state.accounts.push(a);else state.accounts[index]=a;}),'Informe o saldo real nesta data e registre somente as movimentações posteriores.');
      if(modal.kind==='payroll')return wrapper(item?'Editar CLT e folha':'Cadastrar meu CLT',h(React.Fragment,{},field('name','Empresa / trabalho CLT',inp('name',item?.name,'text',{required:true,maxLength:160}),true),centsField('base','Salário antes dos descontos cadastrados (R$)',item?.baseCents,true),field('accountId','Conta que recebe o salário',sel('accountId',item?.accountId,accountOpts(s,'personal')),true),field('payDay','Dia de pagamento',inp('payDay',item?.payDay||5,'number',{required:true,min:1,max:31})),field('startMonth','Acompanhar a partir de',inp('startMonth',item?.startMonth||month,'month',{required:true,min:'2000-01',max:'2200-12'}))),fd=>persist(state=>{const pay={...item,id:item?.id||uid(),name:fd.get('name').trim(),baseCents:cents(fd.get('base')),accountId:fd.get('accountId'),payDay:Number(fd.get('payDay')),startMonth:fd.get('startMonth'),active:true,deductions:item?.deductions||[]};const p=ensurePlans(state),i=p.payrolls.findIndex(x=>x.id===pay.id);if(i<0)p.payrolls.push(pay);else p.payrolls[i]=pay;}),'Use o valor da folha antes dos descontos que você cadastrar. INSS, impostos e outros descontos precisam ser informados por você.');
      if(modal.kind==='deduction')return h(DeductionForm,{key:modal.key,item,payrollId:modal.payrollId,initialKind:modal.initialKind||'other',onClose:close,month,onSave:fd=>persist(state=>{const p=ensurePlans(state),pay=p.payrolls.find(x=>x.id===modal.payrollId);const d={...item,id:item?.id||uid(),name:fd.get('name').trim(),kind:fd.get('kind'),mode:fd.get('mode'),amountCents:fd.get('mode')==='fixed'?cents(fd.get('value')):0,rateBps:fd.get('mode')==='percent'?cents(fd.get('value')):0,startMonth:fd.get('startMonth'),endMonth:fd.get('endMonth')||null,active:item?.active??true};const i=pay.deductions.findIndex(x=>x.id===d.id);if(i<0)pay.deductions.push(d);else pay.deductions[i]=d;})});
      if(modal.kind==='debt')return h(DebtForm,{key:modal.key,item,defaults:modal,s,month,onClose:close,onSave:fd=>persist(state=>{const d={...item,id:item?.id||uid(),name:fd.get('name').trim(),kind:fd.get('kind'),creditor:fd.get('creditor').trim(),installmentCents:cents(fd.get('amount')),installments:Number(fd.get('count')),firstDueDate:fd.get('date'),payrollId:fd.get('kind')==='payroll_loan'?fd.get('payrollId'):null,accountId:fd.get('kind')==='payroll_loan'?null:fd.get('accountId')};const p=ensurePlans(state),index=p.debts.findIndex(x=>x.id===d.id);if(item&&(s.entries.some(e=>e.debtId===item.id)||p.payrollRuns.some(r=>r.deductions.some(d=>d.debtId===item.id)))){for(const key of ['kind','installmentCents','installments','firstDueDate','payrollId'])if(d[key]!==item[key])throw new Error('Este contrato já tem parcelas confirmadas. Mantenha o parcelamento para preservar o histórico.');}if(index<0)p.debts.push(d);else p.debts[index]=d;})});
      if(modal.kind==='recurrence')return h(RecurrenceForm,{key:modal.key,item,pension:modal.pension,s,month,onClose:close,onSave:fd=>persist(state=>{const r={...item,id:item?.id||uid(),name:fd.get('name').trim(),type:fd.get('type'),accountId:fd.get('accountId'),amountMode:fd.get('amountMode'),amountCents:fd.get('amount')?cents(fd.get('amount')):0,day:Number(fd.get('day')),paymentMethod:fd.get('method'),category:fd.get('category'),source:fd.get('source'),startMonth:fd.get('startMonth'),endMonth:fd.get('endMonth')||null,active:item?.active??true};const p=ensurePlans(state),i=p.recurrences.findIndex(x=>x.id===r.id);if(i<0)p.recurrences.push(r);else p.recurrences[i]=r;})});
      if(modal.kind==='entry')return wrapper(modal.type==='transfer'?'Retirada / transferência':modal.type==='income'?'Registrar recebimento':'Registrar gasto',h(EntryFields,{s,type:modal.type,defaults:modal.defaults}),fd=>persist(state=>state.entries.push(entryFrom(fd,modal.type))));
      if(modal.kind==='settle'){
        if(!item)return null;
        const pay=p.payrolls.find(pay=>pay.id===item.id);
        return wrapper(item.kind==='payroll'?'Confirmar salário recebido':item.type==='income'?'Confirmar recebimento':'Confirmar pagamento',h(React.Fragment,{},h('p',{className:'nf-hint full'},`${item.name} · competência ${month}${item.kind==='payroll'?' · o depósito será o salário menos todos os descontos cadastrados.':''}`),item.kind==='payroll'?h(PayrollConfirmFields,{s,pay,month}):h(React.Fragment,{},centsField('amount',item.variable?'Valor real deste mês (R$)':'Valor (R$)',item.amountCents??undefined,true,{readOnly:item.kind==='debt'}),dateField('date','Data em que aconteceu'))),fd=>persist(state=>settleObligation(state,item.key,month,fd.get('date'),cents(fd.get('amount')))),item.kind==='payroll'?'Ao confirmar, o líquido entra na conta e a parcela do consignado é baixada. Não pague esse mesmo desconto novamente como despesa.':undefined,'Confirmar');
      }
      if(modal.kind==='invoice')return wrapper('Pagar fatura',h(React.Fragment,{},h('p',{className:'nf-hint full'},`${item.name} · em aberto ${money(item.remainingCents)}`),centsField('amount','Valor pago (R$)',item.remainingCents),dateField('date','Pagamento'),field('accountId','Conta que paga',sel('accountId',null,accountOpts(s)),true)),fd=>persist(state=>state.entries.push({id:uid(),type:'card_payment',description:`Fatura · ${item.name}`,amountCents:cents(fd.get('amount')),date:fd.get('date'),status:'posted',accountId:fd.get('accountId'),cardId:item.cardId,invoiceDate:item.date,paymentMethod:'boleto'})),'O pagamento reduz o saldo da conta e a fatura, sem gerar outro gasto.');
      if(modal.kind==='card')return wrapper('Configurar fatura do cartão',h(React.Fragment,{},field('closingDay','Dia de fechamento',inp('closingDay',item.closingDay,'number',{required:true,min:1,max:31})),field('dueDay','Dia de vencimento',inp('dueDay',item.dueDay,'number',{required:true,min:1,max:31})),centsField('debt','Fatura anterior ainda em aberto (R$)',item.openingDebtCents,true),field('date','Vencimento dessa fatura',inp('date',item.openingDueDate,'date',{required:true,min:'2000-01-01',max:'2200-12-31'}),true)),fd=>persist(state=>{const c=state.cards.find(c=>c.id===item.id);Object.assign(c,{closingDay:Number(fd.get('closingDay')),dueDay:Number(fd.get('dueDay')),openingDebtCents:cents(fd.get('debt')),openingDueDate:fd.get('date')});}),'Não registre de novo as compras já incluídas no valor da fatura anterior.');
      if(modal.kind==='delete-entry')return wrapper('Excluir registro',h('p',{className:'nf-hint full'},`Excluir “${item.description}” recalcula o saldo. Se for salário, os descontos e consignados vinculados a esse recebimento também serão reabertos.`),()=>persist(state=>removePostedEntry(state,item.id)),undefined,'Excluir');
      return null;
    }
    return h('div',{className:'nf-theme nf-workspace','data-theme':isDarkMode?'dark':'light'},h('header',{className:'nf-workspace-head'},h('div',{},h('p',{className:'nf-eyebrow'},'Sua vida financeira, conectada'),h('h1',{},'Minha carteira'),muted('Salário, empresa, contratos e compromissos no mesmo lugar.')),h('label',{className:'nf-month'},'Competência',h('input',{type:'month',value:month,min:'2000-01',max:'2200-12',onChange:e=>e.target.value&&setMonth(e.target.value)}))),h('nav',{className:'nf-tabs','aria-label':'Seções da carteira'},tabs.map(([id,label])=>h('button',{key:id,onClick:()=>setTab(id),'aria-current':tab===id?'page':undefined,className:tab===id?'active':''},label))),nw.error&&h(ConnectionNotice,{nw}),notice&&h('p',{className:'nf-notice',role:'status'},notice),!nw.loaded?empty('Carregando seu financeiro…','Aguarde a conexão com seu servidor.'):tab==='notifications'?h(NotificationCenter,{}):body,h(Presence,{},modalView()));
  }

  function DeductionForm({item,payrollId,initialKind='other',onClose,month,onSave}) {
    const [mode,setMode]=React.useState(item?.mode||'fixed');
    return h(Modal,{title:item?'Editar desconto':'Adicionar desconto na folha',onClose,onSubmit:onSave,hint:'Percentuais usam o salário informado como base. Os valores não são calculados por tabelas legais.'},field('name','Descrição do desconto',inp('name',item?.name|| (initialKind==='pension'?'Pensão':''),'text',{required:true,maxLength:160}),true),field('kind','Tipo',sel('kind',item?.kind||initialKind,[['other','Outro desconto'],['tax','INSS / imposto informado'],['pension','Pensão na folha']])),field('mode','Como informar',h('select',{name:'mode',value:mode,onChange:e=>setMode(e.target.value)},h('option',{value:'fixed'},'Valor fixo'),h('option',{value:'percent'},'Percentual do salário'))),centsField('value',mode==='fixed'?'Valor mensal (R$)':'Percentual (%)',item?(mode==='fixed'?item.amountCents:item.rateBps):undefined,true),field('startMonth','Primeira competência',inp('startMonth',item?.startMonth||month,'month',{required:true,min:'2000-01',max:'2200-12'})),field('endMonth','Última competência (opcional)',inp('endMonth',item?.endMonth||'','month',{min:'2000-01',max:'2200-12'})));
  }
  function DebtForm({item,defaults,s,month,onClose,onSave}) {
    const [kind,setKind]=React.useState(item?.kind||defaults.debtKind||defaults.contractKind||'loan');
    return h(Modal,{title:item?'Editar contrato':'Consignado, financiamento ou empréstimo',onClose,onSubmit:onSave,hint:'Informe as parcelas que ainda faltam. O total mostrado soma essas parcelas, incluindo os juros já embutidos nelas; não é um cálculo de quitação antecipada.'},field('name','Nome do contrato',inp('name',item?.name,'text',{required:true,maxLength:160,placeholder:'Ex.: Consignado do banco ou financiamento do carro'}),true),field('kind','Tipo de contrato',h('select',{name:'kind',value:kind,onChange:e=>setKind(e.target.value)},h('option',{value:'payroll_loan'},'Consignado · descontado na folha'),h('option',{value:'financing'},'Financiamento'),h('option',{value:'loan'},'Outro empréstimo'))),field('creditor','Banco / credor (opcional)',inp('creditor',item?.creditor,'text',{maxLength:160})),centsField('amount','Valor de cada parcela (R$)',item?.installmentCents),field('count',item?'Parcelas cadastradas no início':'Parcelas ainda restantes',inp('count',item?.installments||1,'number',{required:true,min:1,max:600})),field('date','Vencimento da primeira restante',inp('date',item?.firstDueDate||dueDate(month,5),'date',{required:true,min:'2000-01-01',max:'2200-12-31'})),kind==='payroll_loan'?field('payrollId','Folha CLT vinculada',sel('payrollId',item?.payrollId||defaults.payrollId,[['','Selecione uma folha'],...plansOf(s).payrolls.map(p=>[p.id,p.name])])):field('accountId','Conta que paga as parcelas',sel('accountId',item?.accountId,accountOpts(s))));
  }
  function RecurrenceForm({item,pension,s,month,onClose,onSave}) {
    const [type,setType]=React.useState(item?.type||'expense'),[mode,setMode]=React.useState(item?.amountMode||'fixed');
    return h(Modal,{title:pension?'Pensão paga pela conta':item?'Editar recorrência':'Conta ou recebimento recorrente',onClose,onSubmit:onSave,hint:'Previsões não alteram o saldo. A cada mês, confirme quando pagar ou receber. No modo variável, confirme o valor real.'},field('name','Descrição',inp('name',item?.name||(pension?'Pensão':''),'text',{required:true,maxLength:160}),true),field('type','Movimentação',h('select',{name:'type',value:type,onChange:e=>setType(e.target.value)},h('option',{value:'expense'},'Conta a pagar'),h('option',{value:'income'},'Recebimento previsto'))),field('amountMode','Valor',h('select',{name:'amountMode',value:mode,onChange:e=>setMode(e.target.value)},h('option',{value:'fixed'},'Fixo todo mês'),h('option',{value:'variable'},'Varia · informar a cada mês'))),field('amount',mode==='fixed'?'Valor mensal (R$)':'Estimativa (opcional, R$)',inp('amount',item?.amountCents?inputMoney(item.amountCents):'','text',{inputMode:'decimal',required:mode==='fixed',placeholder:'0,00'})),field('day','Dia do vencimento / recebimento',inp('day',item?.day||10,'number',{required:true,min:1,max:31})),field('accountId','Conta',sel('accountId',item?.accountId,accountOpts(s))),field('method','Forma de pagamento',sel('method',item?.paymentMethod||'pix',Object.entries(METHODS).filter(([k])=>k!=='credit'))),type==='expense'?field('category','Categoria',sel('category',item?.category||(pension?'Pensão':'Outros'),CATEGORIES.map(c=>[c,c]))):field('source','Origem',sel('source',item?.source||'company',Object.entries(SOURCES))),field('startMonth','Primeiro mês',inp('startMonth',item?.startMonth||month,'month',{required:true,min:'2000-01',max:'2200-12'})),field('endMonth','Último mês (opcional)',inp('endMonth',item?.endMonth||'','month',{min:'2000-01',max:'2200-12'})));
  }
  return {useWallet,Workspace,TransactionModal,HomeConnections,NotificationModal,NotificationCenter,reminderCount:s=>payableReminders(s).length,transactions,legacyCards,balance,weeklyData,spentToday,calendarAppointments,currentAppointments:date=>calendarAppointments(snapshot.state,date),calendarTransactions:rows=>rows,statisticsRows,monthWeeks,insight,budget:s=>summary(s,monthNow()).expenseCents+commitmentSummary(s,monthNow()).expenseCents,monthLabel:()=>new Date(today()+'T12:00:00').toLocaleDateString('pt-BR',{month:'long'}),summary:s=>summary(s,monthNow()),money,saveCard,deleteCard};
}
