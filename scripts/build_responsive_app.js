const fs = require('fs');

const originalBundle = fs.readFileSync('public/assets/index-DGDPhK2a.js.backup', 'utf8');

const bieStart = originalBundle.indexOf('function bie(');
const bieEnd = originalBundle.indexOf('function xie(');

if (bieStart === -1 || bieEnd === -1) {
  console.error('Could not find bie range!');
  process.exit(1);
}

const originalBie = originalBundle.slice(bieStart, bieEnd);

// Let's get the state & hooks part (up to 'return pd.useEffect(')
const retStart = originalBie.indexOf('return pd.useEffect(');
const originalHooks = originalBie.slice(0, retStart);

// Let's add the desktop mousemove hook right before the return:
const desktopMouseHook = `
A.useEffect(()=>{if(typeof window>"u"||E)return;const ue=Ee=>{const Je=(Ee.clientX/window.innerWidth-.5)*2,dt=(Ee.clientY/window.innerHeight-.5)*2;he.set(Je*.22);fe.set(dt*.22)};return window.addEventListener("mousemove",ue),()=>window.removeEventListener("mousemove",ue)},[E,he,fe]);
`;

// Now let's extract the mobile return JSX from originalBie
// from retStart to the end of originalBie
const originalRet = originalBie.slice(retStart);

// Notice in originalRet:
// 1. Footer text:
// !E&&b.jsxs("p",{className:"text-[10px] text-zinc-500 mt-4 font-bold tracking-wider select-none uppercase",children:["Simulando ",b.jsx("span",{className:"text-green-primary",children:"Apple iPhone 15 Pro"})," • Resoluções de Toque HIG"]})
// We REMOVE this footer text entirely!

// 2. The mobile phone wrapper:
// Currently:
// b.jsxs("div",{className:E?"w-full h-full overflow-hidden fixed inset-0 flex flex-col bg-black text-white":"min-h-screen w-screen flex flex-col items-center justify-center bg-[#070b13] text-white p-6 overflow-hidden select-none",...
// !E&&b.jsx("div",{className:"absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-green-primary/5 rounded-full blur-[120px] pointer-events-none"}),
// b.jsxs("div",{className:E?"w-full h-full relative overflow-hidden flex flex-col":"relative w-[385px] h-[790px] max-h-[82vh] rounded-[48px] border-[10px] border-zinc-800 bg-black shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-[3px] ring-zinc-700/40 overflow-hidden flex flex-col transition-all duration-300 transform translate-z-0 shrink-0",children:[
//   !E&&b.jsx("div",{className:"absolute top-0 inset-x-0 h-9 flex justify-center z-[450] pointer-events-none",children:b.jsx("div",{className:"w-28 h-5.5 bg-black rounded-b-[18px] border-b border-zinc-800/10"})}),
//   b.jsxs("div",{className:`w-full h-full relative flex flex-col ${I?"bg-[#05080d] text-white":"bg-gradient-to-b from-mint-light via-mint-ultra-light to-mint-light/30"} font-sans transition-colors duration-500 ${E?"rounded-none":"rounded-[40px] md:rounded-[36px]"} overflow-hidden transform translate-z-0`,children:[
//     b.jsx(vie,{isDarkMode:I,activeNotification:G,isMobileScreen:E}),
// ...

console.log('Hooks extracted, length:', originalHooks.length);
console.log('Original return extracted, length:', originalRet.length);
