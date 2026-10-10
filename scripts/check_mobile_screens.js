const fs = require('fs');
const code = fs.readFileSync('public/assets/index-DGDPhK2a.js', 'utf8');
const elseIdx = code.indexOf('} else {');
const mobile = code.slice(elseIdx - 25000, elseIdx);
const matches = [...mobile.matchAll(/e\s*===\s*["'](\w+)["']/g)];
console.log('Screen matches:', matches.map(m => m[1]));
for (const m of matches) {
  const idx = mobile.indexOf(m[0]);
  console.log('--- ' + m[1] + ' ---');
  console.log(mobile.slice(idx, idx + 250));
}
