// Route both layouts through the editable financial views. Safe to run after
// regenerating the legacy bundle: expected anchors are required before writing.
const fs=require('node:fs');
const file='public/assets/index-DGDPhK2a.js';
let source=fs.readFileSync(file,'utf8');
if(!source.includes('const nwFinance=createFinanceIntegration'))throw Error('Apply financial integration first.');
if(source.includes('b.jsx(yne,')) {
  const next=source.replace(/b\.jsx\(yne,\s*\{\s*onBack:\s*\(\)\s*=>\s*t\("Home"\),\s*isDarkMode:\s*I\s*\}/g,'b.jsx(nwFinance.Statistics,{onBack:()=>t("Home"),onOpenWallet:()=>t("Wallet"),isDarkMode:I}');
  if(next===source||next.includes('b.jsx(yne,'))throw Error('Unexpected statistics route.');
  source=next;
}
const marker='className:"text-sm font-bold text-green-primary px-3 py-1 rounded-full bg-green-primary/10",children:"Ver todas"';
if(source.includes(marker))source=source.replace(marker,'onClick:()=>{nwFinance.selectWorkspaceSection("history");t("Wallet")},'+marker);
// Retain the button marker while avoiding duplicate handlers on reruns.
source=source.replace('onClick:()=>{nwFinance.selectWorkspaceSection("history");t("Wallet")},onClick:()=>{nwFinance.selectWorkspaceSection("history");t("Wallet")},','onClick:()=>{nwFinance.selectWorkspaceSection("history");t("Wallet")},');
if(!source.includes('Nenhuma despesa confirmada nos últimos 7 dias.')) {
  const start=source.indexOf('pie=({'),end=source.indexOf('},Vy=',start);
  if(start<0||end<0)throw Error('Missing balance chart.');
  let chart=source.slice(start,end);
  const toggle='b.jsxs("button",{id:"toggle-balance-details"';
  if(chart.split(toggle).length!==3)throw Error('Expected both balance layouts.');
  chart=chart.replaceAll(toggle,'d.every(O=>O.expense===0)&&b.jsx("p",{className:"text-xs text-gray-400 mt-3 text-center",children:"Nenhuma despesa confirmada nos últimos 7 dias."}),'+toggle);
  source=source.slice(0,start)+chart+source.slice(end);
}
fs.writeFileSync(file,source);
console.log('Financial views connected in mobile and desktop layouts.');
