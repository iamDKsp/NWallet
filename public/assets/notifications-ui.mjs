import {today,money} from '../finance.mjs';
import {payableReminders} from '../reminders.mjs';

function deviceToken(){
  let token=localStorage.getItem('nwallet-push-device');
  if(!/^[a-f0-9]{64}$/.test(token||'')){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');localStorage.setItem('nwallet-push-device',token);}
  return token;
}
async function request(route='',data,token=deviceToken()) {
  let response;
  try{response=await fetch('/api/notifications'+route,{method:data===undefined?'GET':route==='/settings'?'PUT':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},cache:'no-store',body:data===undefined?undefined:JSON.stringify(data)});}catch{throw new Error('Não foi possível conectar ao servidor de notificações. Tente novamente.');}
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível configurar as notificações.');return result;
}
function pushSupport(){
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(!window.isSecureContext)return 'Para ativar neste aparelho, abra o NWallet por HTTPS.';
  if(ios&&!navigator.standalone&&!window.matchMedia('(display-mode: standalone)').matches)return 'No iPhone, adicione o NWallet à Tela de Início pelo Safari e abra pelo ícone.';
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window))return 'Este navegador não oferece notificações push. Abra no Safari instalado, Chrome, Edge ou Firefox compatível.';
  if(Notification.permission==='denied')return 'As notificações foram bloqueadas. Libere-as nas configurações do navegador ou do aparelho.';
  return '';
}
const bytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function createNotificationUI(React,{useWallet,Modal,Presence}) {
  const h=React.createElement;
  function NotificationCenter(){
    const nw=useWallet(),[config,setConfig]=React.useState(null),[settings,setSettings]=React.useState(null),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[error,setError]=React.useState(''),[filter,setFilter]=React.useState('all');
    async function load(){try{const value=await request();setConfig(value);setSettings(value.settings);setError('');}catch(err){setError(err.message);}}
    React.useEffect(()=>{load();},[]);
    async function action(fn){if(busy)return;setBusy(true);setError('');setMessage('');try{await fn();}catch(err){setError(err.message);}finally{setBusy(false);}}
    async function enable(){
      const reason=pushSupport();if(reason)throw new Error(reason);
      // Permission is requested directly from the user's button click.
      if(await Notification.requestPermission()!=='granted')throw new Error('O aparelho não autorizou as notificações.');
      const registration=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
      let sub=await registration.pushManager.getSubscription(),created=false;
      if(!sub){sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(config.publicKey)});created=true;}
      try{const value=await request('/subscribe',{subscription:sub.toJSON()});setConfig(value);setMessage('Notificações ativadas neste aparelho. Use o teste para conferir a entrega.');}
      catch(err){if(created)await sub.unsubscribe();throw err;}
    }
    async function disable(){
      const value=await request('/unsubscribe',{});setConfig(value);
      if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration();const sub=await registration?.pushManager.getSubscription();if(sub)await sub.unsubscribe();}
      setMessage('Avisos desativados neste aparelho. Os outros aparelhos continuam vinculados.');
    }
    const items=payableReminders(nw.state),reason=pushSupport(),shown=items.filter(i=>filter==='all'||i.status===filter);
    const labels={overdue:'Em atraso',today:'Vence hoje',upcoming:'Próximos 7 dias'};
    const button=(text,fn,kind='')=>h('button',{type:'button',className:'nf-button '+kind,disabled:busy,onClick:()=>action(fn)},text);
    const toggle=(label,name)=>h('label',{className:'nf-check'},h('input',{type:'checkbox',checked:settings[name],onChange:e=>setSettings({...settings,[name]:e.target.checked})}),label);
    return h('div',{className:'nf-notifications'},h('header',{className:'nf-section-head'},h('div',{},h('h2',{},'Notificações e lembretes'),h('p',{className:'nf-muted'},'Contas, pensão, financiamentos e faturas. Pagamentos confirmados saem dos lembretes; consignados já descontados na folha não geram cobrança separada.'))),error&&h('p',{className:'nf-error',role:'alert'},error),message&&h('p',{className:'nf-notice',role:'status'},message),
      h('section',{className:'nf-panel'},h('h3',{},'Avisos neste aparelho'),h('p',{className:'nf-muted'},config?.subscribed?'Este aparelho está vinculado aos avisos diários.':'Ative em cada aparelho onde deseja receber.'),reason&&h('p',{className:'nf-hint'},reason),config&&h('div',{className:'nf-actions nf-notification-actions'},config.subscribed?button('Desativar neste aparelho',disable):h('button',{className:'nf-button primary',type:'button',disabled:busy||!!reason,onClick:()=>action(enable)},busy?'Aguarde…':'Ativar neste aparelho'),config.subscribed&&button('Enviar teste',async()=>{await request('/test',{});setMessage('Teste aceito pelo serviço push. Confira as notificações do aparelho.');})),config?.lastSentDay&&h('p',{className:'nf-muted'},'Último resumo enviado: '+new Date(config.lastSentDay+'T12:00:00').toLocaleDateString('pt-BR')),config?.lastError&&h('p',{className:'nf-error'},config.lastError),!config&&button('Recarregar configuração',load),h('p',{className:'nf-muted'},'O resumo externo mostra a quantidade de contas, sem nomes nem valores. O servidor precisa permanecer ligado para enviá-lo.')),
      settings&&h('form',{className:'nf-panel',onSubmit:e=>{e.preventDefault();action(async()=>{const value=await request('/settings',settings);setConfig(value);setMessage('Horário e regras salvos para todos os seus aparelhos.');});}},h('h3',{},'Seu resumo diário'),h('div',{className:'nf-notification-settings'},toggle('Enviar lembretes diários','enabled'),h('label',{className:'nf-field'},'Horário · Brasília',h('input',{type:'time',required:true,value:settings.time,onChange:e=>setSettings({...settings,time:e.target.value})})),h('div',{className:'nf-reminder-days'},h('span',{},'Avisar antes do vencimento'),[7,3,1].map(n=>h('label',{key:n,className:'nf-check'},h('input',{type:'checkbox',checked:settings.beforeDays.includes(n),onChange:e=>setSettings({...settings,beforeDays:e.target.checked?[...settings.beforeDays,n]:settings.beforeDays.filter(d=>d!==n)})}),n===1?'Na véspera':`${n} dias antes`))),toggle('No dia do vencimento','onDue'),toggle('Todo dia enquanto houver atraso','overdue')),h('button',{className:'nf-button primary',disabled:busy,type:'submit'},busy?'Salvando…':'Salvar regras'),h('p',{className:'nf-muted'},'Um resumo por dia em cada aparelho, somente quando houver algo a avisar. A central abaixo continua visível mesmo se os avisos externos estiverem pausados.')),
      h('section',{className:'nf-panel'},h('h3',{},'O que precisa da sua atenção'),h('div',{className:'nf-actions nf-notification-filters'},['all','overdue','today','upcoming'].map(id=>h('button',{key:id,type:'button',className:'nf-button small '+(filter===id?'primary':''),onClick:()=>setFilter(id)},id==='all'?`Todas (${items.length})`:`${labels[id]} (${items.filter(i=>i.status===id).length})`))),!nw.loaded?h('p',{className:'nf-muted'},'Aguardando seus dados financeiros…'):shown.length?shown.map(i=>h('article',{key:i.key,className:'nf-row'},h('div',{className:'nf-row-main'},h('strong',{},i.name),h('p',{className:'nf-muted'},new Date(i.date+'T12:00:00').toLocaleDateString('pt-BR')+' · '+(i.scope==='business'?'Empresa':'Pessoal')),h('span',{className:'nf-badge '+(i.days<0?'nf-late':'')},i.days<0?`${Math.abs(i.days)} dia(s) de atraso`:i.days===0?'Vence hoje':`Em ${i.days} dia(s)`)),h('div',{className:'nf-row-end'},h('strong',{},i.amountCents===null?'Valor a informar':money(i.amountCents)),i.variable&&h('span',{className:'nf-badge'},'Valor variável')))):h('p',{className:'nf-muted'},'Nenhuma conta pendente neste filtro. Cadastre seus compromissos na Carteira para acompanhar os vencimentos.')));
  }
  function NotificationModal({isOpen,onClose,isDarkMode=true}){
    return h(Presence,{},isOpen&&h('div',{className:'nf-theme','data-theme':isDarkMode?'dark':'light'},h(Modal,{title:'Sua central financeira',onClose,submit:'Fechar',onSubmit:async()=>{},plain:true},h(NotificationCenter,{}))));
  }
  return {NotificationCenter,NotificationModal};
}
