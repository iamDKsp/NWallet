const fs = require('fs');
const code = fs.readFileSync('public/assets/index-DGDPhK2a.js', 'utf8');
const elseIdx = code.indexOf('} else {', 830000);
const statIdx = code.indexOf('Statistic', elseIdx + 2000);
console.log('Screen Statistic at:', statIdx);
if (statIdx !== -1) {
  console.log(code.slice(statIdx - 50, statIdx + 200));
}
