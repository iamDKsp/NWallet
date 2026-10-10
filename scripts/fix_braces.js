const fs = require('fs');

let bundle = fs.readFileSync('public/assets/index-DGDPhK2a.js', 'utf8');

const endBie = bundle.indexOf('function xie(');
const beforeXie = bundle.slice(0, endBie);
const afterXie = bundle.slice(endBie);

// Let's count open vs closed braces in function bie
const bieStart = bundle.indexOf('function bie(');
const bieCode = bundle.slice(bieStart, endBie);

let openCount = 0;
for (const char of bieCode) {
  if (char === '{') openCount++;
  if (char === '}') openCount--;
}

console.log('Open braces balance in bie:', openCount);
// If openCount is 1, we need one more '}'!
if (openCount === 1) {
  bundle = beforeXie + '\n}\n' + afterXie;
  fs.writeFileSync('public/assets/index-DGDPhK2a.js', bundle);
  console.log('Added missing closing brace!');
} else if (openCount > 1) {
  bundle = beforeXie + '\n' + '}'.repeat(openCount) + '\n' + afterXie;
  fs.writeFileSync('public/assets/index-DGDPhK2a.js', bundle);
  console.log('Added ' + openCount + ' missing closing braces!');
}
