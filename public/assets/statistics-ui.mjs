import {money,accountBalance,cents,inputMoney,CATEGORIES} from '../finance.mjs';
import {cashProjection,statisticsData} from '../financial-insights.mjs';
import {cardStatistics,updateCardLimit} from '../card-insights.mjs';
import {createCardsStatisticsUI} from './cards-statistics.mjs';
import {createStatisticsOverview} from './statistics-overview.mjs';

export function createStatisticsUI(React,{useWallet,useSelectedMonth,selectWorkspaceSection,Modal,createPortal,motion,visuals}) {
  const h=React.createElement;
  const {CardsStatistics}=createCardsStatisticsUI(React,{motion,visuals});
  const {StatisticsOverview}=createStatisticsOverview(React,{motion,visuals});
  function Statistics({isDarkMode=true,onBack,onOpenWallet}) {
    const nw=useWallet(),[month,setMonth]=useSelectedMonth(),[period,setPeriod]=React.useState('month'),[view,setView]=React.useState('overview'),[editingLimit,setEditingLimit]=React.useState(null),[notice,setNotice]=React.useState('');
    const data=statisticsData(nw.state,month,period),cash=cashProjection(nw.state,month);
    const credit=cardStatistics(nw.state,month);
    const manage=()=>{selectWorkspaceSection('accounts');onOpenWallet?.();};
    React.useEffect(()=>{
      if(!editingLimit||!createPortal)return;
      const root=document.getElementById('root'),wasInert=root?.inert;
      if(root)root.inert=true;
      return()=>{if(root)root.inert=wasInert;};
    },[!!editingLimit]);
    return h('main',{className:'nf-theme nf-workspace nf-statistics','data-theme':isDarkMode?'dark':'light'},
      h('header',{className:'nf-workspace-head'},h('div',{},h('button',{type:'button',className:'nf-button quiet',onClick:onBack},'Voltar'),h('h1',{},'Estatísticas')),
        h('label',{className:'nf-month'},'Competência',h('input',{type:'month',value:month,min:'2000-01',max:'2200-12','aria-label':'Competência',onChange:e=>{if(e.target.value){setMonth(e.target.value);}}}))),
      h('p',{className:'st-intro'},'Seu mês, suas faturas e o crédito já comprometido.'),
      h('nav',{className:'st-view-tabs','aria-label':'Seções das estatísticas'},[['overview','Resumo do mês'],['cards','Cartões e faturas']].map(([id,label])=>h('button',{key:id,type:'button','aria-current':view===id?'page':undefined,onClick:()=>setView(id)},label))),
      !nw.loaded?h('p',{role:'status',className:'nf-notice'},nw.error||'Carregando seu financeiro…'):nw.error?h('p',{role:'alert',className:'nf-error'},nw.error):null,
      notice&&h('p',{className:'nf-notice',role:'status'},notice),
      view==='cards'?h(CardsStatistics,{report:credit,state:nw.state,month,onEditLimit:card=>{setNotice('');setEditingLimit(card);},onManage:manage}):h(React.Fragment,{},
        h(StatisticsOverview,{data,cash,balanceCents:nw.state.accounts.reduce((v,a)=>v+accountBalance(nw.state,a.id),0),month,period,onPeriod:setPeriod,onHistory:()=>{selectWorkspaceSection('history');onOpenWallet?.();},onSetCategory:(id,value)=>{
          const category=value==='Entretenimento'?'Lazer':value;
          if(!CATEGORIES.includes(category))return;
          nw.save(s=>{const entry=s.entries.find(e=>e.id===id);if(entry?.type==='expense')entry.category=category;}).catch(err=>setNotice(err.message));
        },isDarkMode}),
        h('button',{className:'st-credit-overview',type:'button',onClick:()=>setView('cards')},h('div',{},h('span',{className:'nf-eyebrow'},'Cartões de crédito'),h('strong',{},money(credit.selectedPendingCents)+' em faturas do mês'),h('p',{},`${credit.cards.length} cartão(ões) · consulte limites, pagamentos e parcelas futuras`)),h('span',{className:'st-credit-link'},'Analisar cartões →'))),
      editingLimit&&(()=>{
        const current=nw.state.cards.find(c=>c.id===editingLimit.id)||editingLimit;
        const dialog=h('div',{className:'nf-theme','data-theme':isDarkMode?'dark':'light'},h(Modal,{title:'Limite de crédito · '+current.name,onClose:()=>setEditingLimit(null),hint:'Informe o limite total do cartão no banco. Deixe vazio se ainda não souber. O saldo da conta e o cheque especial ficam separados.',onSubmit:async fd=>{const raw=String(fd.get('limit')||'').trim();await nw.save(s=>updateCardLimit(s,current.id,raw?cents(raw):null));setNotice('Limite atualizado. As faturas e os pagamentos foram preservados.');}},h('label',{className:'nf-field full'},h('span',{},'Limite total do cartão (R$)'),h('input',{name:'limit',type:'text',inputMode:'decimal',placeholder:'0,00',defaultValue:current.creditLimitCents==null?'':inputMoney(current.creditLimitCents)}))));
        return createPortal?createPortal(dialog,document.body):dialog;
      })());
  }
  return {Statistics};
}
