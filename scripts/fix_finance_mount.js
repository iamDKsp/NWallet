const fs=require('node:fs'),vm=require('node:vm');
const file='public/assets/index-DGDPhK2a.js';let s=fs.readFileSync(file,'utf8'),original=s;
function close(start){let n=0,q=null,esc=false;for(let i=start;i<s.length;i++){const c=s[i];if(q){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===q)q=null;continue;}if(['"',"'",'`'].includes(c)){q=c;continue;}if(c==='(')n++;if(c===')'&&!--n)return i;}throw Error('unbalanced');}
const wrong='b.jsxs("div",{children:[b.jsx(nwFinance.Workspace,{isDarkMode:I}),b.jsxs("div", {\n            className: "desktop-container"';
const p=s.indexOf(wrong);
if(p>=0){const inner=s.indexOf('b.jsxs("div", {',p),innerEnd=close(s.indexOf('(',inner)),outerEnd=close(s.indexOf('(',p));s=s.slice(0,p)+s.slice(inner,innerEnd+1)+s.slice(outerEnd+1);}
const anchor='}, "settings") : b.jsxs("div", {';
const at=s.indexOf(anchor,s.indexOf('function bie()'));if(at<0)throw Error('Wallet branch missing');
const begin=at+'}, "settings") : '.length,end=close(s.indexOf('(',begin));
const cards=s.slice(begin,end+1).replace('children: "Minha Carteira"','children: "Meus cartões"');
s=s.slice(0,begin)+'b.jsxs("div",{children:[b.jsx(nwFinance.Workspace,{isDarkMode:I}),'+cards+']},"wallet")'+s.slice(end+1);
new vm.Script(s.replace(/^import[^\n]+\n/,''));if(fs.readFileSync(file,'utf8')!==original)throw Error('Concurrent change');fs.writeFileSync(file,s);
console.log('Wallet workspace mounted only in Wallet.');
