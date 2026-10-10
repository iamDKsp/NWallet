const fs = require('fs');

const bieCode = fs.readFileSync('scratch_bie.js', 'utf8');
console.log('bieCode length:', bieCode.length);

// Let's find the main return in bieCode:
// It starts with 'return pd.useEffect('
const retStart = bieCode.indexOf('return pd.useEffect(');
console.log('retStart:', retStart);

// Let's find the JSX returned by bie
const beforeRet = bieCode.slice(0, retStart);
console.log('State & hooks length:', beforeRet.length);

// Let's see the JSX tree from retStart to the end
const retCode = bieCode.slice(retStart);
fs.writeFileSync('scratch_ret.js', retCode);
console.log('JSX tree saved to scratch_ret.js');
