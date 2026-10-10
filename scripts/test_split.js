const fs = require('fs');

const originalBundle = fs.readFileSync('public/assets/index-DGDPhK2a.js.backup', 'utf8');

const bieStart = originalBundle.indexOf('function bie(');
const bieEnd = originalBundle.indexOf('function xie(');

const originalBie = originalBundle.slice(bieStart, bieEnd);
const retStart = originalBie.indexOf('return pd.useEffect(');

// 1. Hooks part
const hooksPart = originalBie.slice(0, retStart);

// 2. Original return part (which starts with 'return pd.useEffect(...),b.jsxs(...)')
// In original return part, let's extract:
// The comma-chained useEffect:
// pd.useEffect(()=>{const ue=setTimeout(()=>h(!1),2e3);return()=>clearTimeout(ue)},[]);
const afterUseEffect = originalBie.slice(retStart + 'return pd.useEffect(()=>{const ue=setTimeout(()=>h(!1),2e3);return()=>clearTimeout(ue)},[]),'.length);

console.log('Hooks length:', hooksPart.length);
console.log('After useEffect length:', afterUseEffect.length);
