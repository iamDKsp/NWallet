const fs = require('fs');
const code = fs.readFileSync('public/assets/index-DGDPhK2a.js', 'utf8');

const matches = [...code.matchAll(/addEventListener\(\s*["']([^"']+)["']/g)].map(m => m[1]);
console.log('Event listeners added:', [...new Set(matches)]);

const touchMatches = [...code.matchAll(/onTouchMove|touchmove|onWheel|wheel/gi)].map(m => m[0]);
console.log('Wheel/touch matches:', [...new Set(touchMatches)]);
