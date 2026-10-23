const fs = require('fs');
const css = fs.readFileSync('assets/css/style.css', 'utf8');
const lines = css.split(/\r?\n/);

lines.forEach((line, idx) => {
  if (line.match(/(navbar|site-header|header-actions|nav-link|nav-item|dropdown-menu)/i) && line.includes('{')) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
