const fs = require('fs');

const css = fs.readFileSync('public/assets/index-DFBZ4wGm.css', 'utf8');

// Find all occurrences of 'hidden' or 'overflow' or 'height' or 'fixed'
const rules = css.split('}');
for (const rule of rules) {
  if (rule.includes('overflow') || rule.includes('height:100%') || rule.includes('height:100vh') || rule.includes('touch-action')) {
    console.log(rule.trim());
  }
}
