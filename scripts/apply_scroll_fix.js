const fs = require('fs');

const bundle = fs.readFileSync('public/assets/index-DGDPhK2a.js', 'utf8');

const elseMarker = '} else {';
const elseIdx = bundle.indexOf(elseMarker, 830000);
const endBie = bundle.indexOf('function xie(');

if (elseIdx === -1 || endBie === -1) {
  console.error('Could not find elseIdx or endBie!');
  process.exit(1);
}

console.log('Found elseIdx at:', elseIdx);
console.log('Found endBie at:', endBie);

// Read desktopJsxV3
const newDesktopJsx = fs.readFileSync('scratch_desktop_jsx.js', 'utf8');

// Build updated bundle
const updatedBundle = bundle.slice(0, elseIdx + elseMarker.length) + '\n' + newDesktopJsx + '\n}' + bundle.slice(endBie);

console.log('Original bundle length:', bundle.length);
console.log('Updated bundle length:', updatedBundle.length);

fs.writeFileSync('public/assets/index-DGDPhK2a.js', updatedBundle);
console.log('Successfully updated public/assets/index-DGDPhK2a.js!');
