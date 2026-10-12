// Connect editable financial modules to the original compiled UI, without rebuilding it.
// Fail on an unexpected bundle structure rather than overwriting unrelated work.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const file=path.resolve('public/assets/index-DGDPhK2a.js');
const original=fs.readFileSync(file,'utf8');
if(original.includes('const nwFinance=createFinanceIntegration')){console.log('Financial integration is already installed.');process.exit(0);}
let s=original;
function requireAt(needle,from=0){const i=s.indexOf(needle,from);if(i<0)throw new Error('Missing expected UI anchor: '+needle);return i;}
function closing(start) {
  const stack=[],pairs={'(':')','[':']','{':'}'};let quote=null,escape=false,line=false,block=false;
  for(let i=start;i<s.length;i++){
    const c=s[i],next=s[i+1];
    if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&next==='/'){block=false;i++;}continue;}
    if(quote){if(escape){escape=false;continue;}if(c==='\\'){escape=true;continue;}if(c===quote)quote=null;continue;}
    if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(pairs[c])stack.push(pairs[c]);else if(c===stack.at(-1)){stack.pop();if(!stack.length)return i;}
  }
  throw new Error('Unbalanced UI expression.');
}
function init(marker,value,from=0){const begin=requireAt(marker,from)+marker.length,end=closing(begin-1);s=s.slice(0,begin)+value+s.slice(end);}
function arrow(marker,body){const begin=requireAt(marker),brace=begin+marker.length-1,end=closing(brace);s=s.slice(0,begin)+marker.slice(0,-1)+'{'+body+'}'+s.slice(end+1);}
function replaceExact(old,next){const begin=requireAt(old);s=s.slice(0,begin)+next+s.slice(begin+old.length);}

// Reuse the original hooks and view structure. Only the demo state is replaced.
init('[oe,vt]=A.useState(','[]',requireAt('function bie()'));
init('[_e,Rt]=A.useState(','[]',requireAt('function bie()'));
init('[bt,Ln]=A.useState(','0',requireAt('function bie()'));
replaceExact('function bie(){','const nwFinance=createFinanceIntegration(A,se,jt,p5.createPortal);function bie(){const nw=nwFinance.useWallet();');
const sync='A.useEffect(()=>{if(!nw.loaded)return;Rt(nwFinance.transactions(nw.state).map(ue=>({...ue,icon:{Alimentação:Ad,Transporte:mv,Lazer:ld,Compras:Ja,Salário:ag,CLT:ag,Empresa:ag,Transferência:ag,Saúde:pv}[ue.category]||sd})));Ln(nwFinance.balance(nw.state));vt(nwFinance.legacyCards(nw.state));},[nw.state,nw.loaded]);\n';
const timer=requireAt('pd.useEffect(()=>{const ue=setTimeout(()=>h(!1)',requireAt('function bie()'));
s=s.slice(0,timer)+sync+s.slice(timer);
arrow('yo=ue=>{','return nw.addTransaction(ue);');
arrow('sc=ue=>{','nw.saveCard(ue).then(()=>s(!1)).catch(err=>Ks("Falha ao salvar cartão",err.message,"warning"));');
arrow('wm=ue=>{','nw.saveCard(ue).then(()=>{s(!1);c(null)}).catch(err=>Ks("Falha ao salvar cartão",err.message,"warning"));');
arrow('lc=ue=>{','nw.deleteCard(ue).catch(err=>Ks("Cartão não excluído",err.message,"warning"));');
arrow('an=()=>{','Ks("Notificação de teste","A simulação não altera seus saldos reais.","warning");');
arrow('xm=()=>{','Ks("Notificação de teste","A simulação não cria despesas no seu histórico.","info");');
s=s.replace(/b\.jsx\(xne,\s*\{/g,'b.jsx(nwFinance.TransactionModal,{');

s=s.replace(/b\.jsx\(bne,\s*\{/g,'b.jsx(nwFinance.CardModal,{');
// Keep desktop hooks unconditional when the window crosses the mobile breakpoint.
const wheelStart=s.indexOf('// Mouse wheel handler for desktop');
if(wheelStart>=0){
  const wheelEnd=requireAt('return b.jsxs("div", {',wheelStart),effect=s.slice(wheelStart,wheelEnd);
  s=s.slice(0,wheelStart)+s.slice(wheelEnd);
  const responsiveBranch=requireAt('if (E) {',requireAt('function bie()'));
  s=s.slice(0,responsiveBranch)+effect+s.slice(responsiveBranch);
}

// Wallet on mobile was an empty placeholder; desktop card management remains below it.
const placeholder='b.jsx("div",{className:"flex items-center justify-center h-[60vh]';
const mobileBegin=requireAt(placeholder,requireAt('function bie()')),mobileEnd=closing(s.indexOf('(',mobileBegin));
s=s.slice(0,mobileBegin)+'b.jsx(nwFinance.Workspace,{isDarkMode:I},"wallet")'+s.slice(mobileEnd+1);
const heading=requireAt('children: "Minha Carteira"',requireAt('function bie()'));
const desktopWalletAnchor='}, "settings") : b.jsxs("div", {';
const desktopBegin=requireAt(desktopWalletAnchor,requireAt('function bie()'))+'}, "settings") : '.length;
const desktopEnd=closing(s.indexOf('(',desktopBegin));
const cardView=s.slice(desktopBegin,desktopEnd+1).replace('children: "Minha Carteira"','children: "Meus cartões"');
s=s.slice(0,desktopBegin)+'b.jsxs("div",{children:[b.jsx(nwFinance.Workspace,{isDarkMode:I}),'+cardView+']},"wallet")'+s.slice(desktopEnd+1);
replaceExact('children:[b.jsx(pie,{','children:[b.jsx(nwFinance.HomeConnections,{isDarkMode:I,onOpen:()=>t("Wallet")}),b.jsx(pie,{');
const desktopHome=requireAt('className: "desktop-container"',s.indexOf('else {',requireAt('function bie()')));
const desktopChildren=requireAt('children: [',desktopHome)+'children: ['.length;
s=s.slice(0,desktopChildren)+'b.jsx(nwFinance.HomeConnections,{isDarkMode:I,onOpen:()=>t("Wallet")}),'+s.slice(desktopChildren);

// Original weekly gauge and statistics now use actual records in the shared wallet.
const pie=requireAt('pie=({'),data=requireAt('d=[',pie)+2,end=closing(data);
s=s.slice(0,data)+'nwFinance.weeklyData(r)'+s.slice(end+1);
replaceExact('h=Math.max(...d.map(O=>O.amount))','h=Math.max(1,...d.map(O=>O.amount))');
replaceExact('children:"R$98,60"','children:nwFinance.spentToday(r)');
// Category details read the persisted ledger; remove legacy fallback amounts and insights.
const categoryMathStart=requireAt(',p=O=>{',requireAt('pie=({'));
const categoryMathEnd=requireAt(';return b.jsxs',categoryMathStart);
s=s.slice(0,categoryMathStart)+s.slice(categoryMathEnd);
const categoryPanelStart=requireAt('children:b.jsxs("div",{className:`p-5 rounded-[28px]',requireAt('pie=({'));
const categoryPanelEnd=closing(s.indexOf('(',categoryPanelStart));
s=s.slice(0,categoryPanelStart)+'children:b.jsx(nwFinance.CategorySpending,{isDarkMode:n})'+s.slice(categoryPanelEnd+1);
s=s.replaceAll('Math.max(10, Math.min(100, bt / 5e3 * 100))','Math.max(0, Math.min(100, bt / 5e3 * 100))').replaceAll('Math.max(10,Math.min(100,bt/5e3*100))','Math.max(0,Math.min(100,bt/5e3*100))');
replaceExact('children: "+R$ 4.200,00"','children: nwFinance.money(nwFinance.summary(nw.state).incomeCents)');
replaceExact('children: "-R$ 1.323,10"','children: nwFinance.money(nwFinance.summary(nw.state).expenseCents)');
replaceExact('children: "R$ 2.876,90"','children: nwFinance.money(nwFinance.summary(nw.state).incomeCents-nwFinance.summary(nw.state).expenseCents)');
s=s.replace('children: "Economizado"','children: "Resultado do mês"');
const oldInsight='"Seus gastos com alimentação caíram 8% esta semana. Você tem R$ 1.200,00 disponíveis para investimentos recomendados."';
if(s.includes(oldInsight))s=s.replace(oldInsight,'nwFinance.insight(nw.state)');
s=s.replace('"Online & Sincronizado"','(nw.loaded?"Dados salvos no seu servidor":"Carregando seu financeiro")');

replaceExact('yne=({onBack:e,isDarkMode:t=!1})=>{','yne=({onBack:e,isDarkMode:t=!1})=>{const ns=nwFinance.useWallet();');
init('[I,H]=A.useState(','[]',requireAt('yne=({'));
const statsHe=requireAt(',he=(X,ae)=>',requireAt('yne=({'));
s=s.slice(0,statsHe)+';A.useEffect(()=>{H(nwFinance.statisticsRows(ns.state).map(X=>({...X,icon:sd})))},[ns.state]);const '+s.slice(statsHe+1);
arrow('he=(X,ae)=>{','ns.save(state=>{const row=state.entries.find(e=>e.id===X);if(row&&row.type==="expense")row.category=ae==="Entretenimento"?"Lazer":ae;}).catch(()=>{});');
replaceExact('U=5e3,ne=Q/U*100,de=[','U=nwFinance.budget(ns.state)/100,ne=U?Q/U*100:0,de=[');
const weeks=requireAt('de=[',requireAt('yne=({'))+3,weeksEnd=closing(weeks);
s=s.slice(0,weeks)+'nwFinance.monthWeeks(ns.state)'+s.slice(weeksEnd+1);
const yStart=requireAt('yne=({'),yEnd=requireAt('vne=',yStart);
let stats=s.slice(yStart,yEnd);
stats=stats.replace('value:pe||.1','value:pe').replace('children:"Maio"','children:nwFinance.monthLabel()').replace('children:"R$300.469,52"','children:nwFinance.money(Math.round(nwFinance.balance(ns.state)*100))').replace('children:"Orçamento de Janeiro"','children:"Previsão desta competência"').replace('children:"R$6.000,00"','children:nwFinance.money(nwFinance.budget(ns.state))').replace('children:"Meta de Gastos"','children:"Pagamentos do mês"').replace('children:"Meta Mensal"','children:"Previsto no mês"');
s=s.slice(0,yStart)+stats+s.slice(yEnd);

// Keep the calendar design, but supply real dates and planned obligations.
replaceExact('let ae=new Date;if(X.date.includes("Ontem"))','let ae=new Date;if(X.isoDate)ae=new Date(X.isoDate+"T12:00:00");else if(X.date.includes("Ontem"))');
replaceExact('const G=[...r];e.forEach(X=>','const G=[...r,...nwFinance.currentAppointments(c)];e.forEach(X=>');
let cursor=requireAt('function bie()');
while(true){const match=/b\.jsx\(fie,\s*\{/.exec(s.slice(cursor));if(!match)break;const begin=cursor+match.index,end=closing(s.indexOf('(',begin));let call=s.slice(begin,end+1);call=call.replace(/transactions:\s*_e/,'transactions:nwFinance.calendarTransactions(_e)').replace(/cards:\s*oe/,'cards:[]').replace('fe => ge(fe)','fe => Ae(fe)');s=s.slice(0,begin)+call+s.slice(end+1);cursor=begin+call.length;}
// Import preview must never create the former hard-coded example expense.
cursor=requireAt('function bie()');
while(true){const match=/onImportComplete:\s*ue\s*=>\s*\{/.exec(s.slice(cursor));if(!match)break;const begin=cursor+match.index,brace=begin+match[0].length-1,end=closing(brace);const next='onImportComplete:ue=>{D(!1);ne("expense");Ks("Conferir comprovante","Revise e preencha os dados antes de salvar a despesa.","info")}';s=s.slice(0,begin)+next+s.slice(end+1);cursor=begin+next.length;}

s=s.replace(/b\.jsx\(fie,\s*\{/g,'b.jsx(nwFinance.Calendar,{onOpenWallet:()=>t("Wallet"),');

s='import {createFinanceIntegration} from "/assets/finance-integration.mjs";\n'+s;
s=s.replace('b.jsx(die,{isOpen:Z','b.jsx(nwFinance.NotificationModal,{isOpen:Z').replace('const[e,t]=A.useState("Home")','const[e,t]=A.useState(()=>new URLSearchParams(location.search).get("view")==="notifications"?"Wallet":"Home")');
// Syntax-check the patched body before writing, excluding its single ESM import.
new vm.Script(s.replace(/^import[^\n]+\n/,''));
if(fs.readFileSync(file,'utf8')!==original)throw new Error('The UI changed concurrently. No files were written.');
fs.writeFileSync(file,s);
console.log('Connected the existing UI to the persisted financial model.');
