const fs = require('fs');

const ret = fs.readFileSync('scratch_ret.js', 'utf8');

// Let's find each of the 10 child components of the inner div
console.log('--- Finding inner elements ---');
const vieIdx = ret.indexOf('b.jsx(vie');
const cardModalIdx = ret.indexOf('n!==null&&b.jsx(se.div');
const screensIdx = ret.indexOf('e==="Home"?');
const bneIdx = ret.indexOf('b.jsx(bne');
const xneIdx = ret.indexOf('b.jsx(xne');
const wneIdx = ret.indexOf('b.jsx(wne');
const dieIdx = ret.indexOf('b.jsx(die');
const pushNotifIdx = ret.indexOf('jn&&b.jsx(se.div');
const mieIdx = ret.indexOf('b.jsx(mie');
const navDockIdx = ret.indexOf('b.jsx(se.nav');

console.log({
  vieIdx,
  cardModalIdx,
  screensIdx,
  bneIdx,
  xneIdx,
  wneIdx,
  dieIdx,
  pushNotifIdx,
  mieIdx,
  navDockIdx
});
