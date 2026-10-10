const fs = require('fs');

const originalBundle = fs.readFileSync('public/assets/index-DGDPhK2a.js.backup', 'utf8');

const bieStart = originalBundle.indexOf('function bie(');
const bieEnd = originalBundle.indexOf('function xie(');

const originalBie = originalBundle.slice(bieStart, bieEnd);
const retStart = originalBie.indexOf('return pd.useEffect(');

// 1. All original hooks up to return
const hooksPart = originalBie.slice(0, retStart);

// 2. The useEffect timer hook
const timerHook = `pd.useEffect(()=>{const ue=setTimeout(()=>h(!1),2e3);return()=>clearTimeout(ue)},[]);`;

// 3. Desktop mousemove tilt hook
const mouseHook = `A.useEffect(()=>{if(typeof window>"u"||E)return;const ue=Ee=>{const Je=(Ee.clientX/window.innerWidth-.5)*2,dt=(Ee.clientY/window.innerHeight-.5)*2;he.set(Je*.22);fe.set(dt*.22)};return window.addEventListener("mousemove",ue),()=>window.removeEventListener("mousemove",ue)},[E,he,fe]);`;

// 4. Mobile JSX: original return after the useEffect comma
const useEffectCall = 'return pd.useEffect(()=>{const ue=setTimeout(()=>h(!1),2e3);return()=>clearTimeout(ue)},[]),';
const mobileJsxRaw = originalBie.slice(retStart + useEffectCall.length);
// mobileJsxRaw ends with ')}' where the '}' closed function bie()
// Let's remove the trailing '}' so it's a return statement:
const mobileJsx = 'return ' + mobileJsxRaw.slice(0, -1) + ';';

// 5. Desktop JSX
const desktopJsx = fs.readFileSync('scratch_desktop_jsx.js', 'utf8');

// Combine into new bie:
const newBie = `${hooksPart}
${timerHook}
${mouseHook}
if (E) {
  ${mobileJsx}
} else {
  ${desktopJsx}
}
}`;

console.log('New bie length:', newBie.length);

// Build complete new bundle
const newBundle = originalBundle.slice(0, bieStart) + newBie + originalBundle.slice(bieEnd);
console.log('New bundle length:', newBundle.length);

// Save to public/assets/index-DGDPhK2a.js
fs.writeFileSync('public/assets/index-DGDPhK2a.js', newBundle);
console.log('Successfully wrote to public/assets/index-DGDPhK2a.js!');
