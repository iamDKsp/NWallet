const fs = require('fs');

const ret = fs.readFileSync('scratch_ret.js', 'utf8');

const statIdx = ret.indexOf('e==="Statistic"?');
const setIdx = ret.indexOf('e==="Setting"?');
const otherIdx = ret.indexOf('b.jsx("div",{className:"flex items-center justify-center h-[60vh]');
console.log({ statIdx, setIdx, otherIdx });

// The Home screen JSX is from 4066 to statIdx!
console.log('Home screen JSX length:', statIdx - 4066);
