const fs = require('fs');
const code = fs.readFileSync('public/assets/index-DGDPhK2a.js', 'utf8');
const idx = code.indexOf('e==="Setting"?');
console.log(code.slice(idx, idx + 500));
