const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

const headers = {};
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const m = content.match(/<header[\s\S]*?<\/header>/);
  if (m) {
    headers[f] = m[0];
  }
});

console.log('Total files with header:', Object.keys(headers).length);
// Compare against index.html
const base = headers['index.html'];
Object.keys(headers).forEach(f => {
  if (f === 'index.html') return;
  const isExact = headers[f] === base;
  console.log(f, 'Matches index.html exactly:', isExact);
  if (!isExact) {
    // Find diff
    const baseLines = base.split(/\r?\n/);
    const fLines = headers[f].split(/\r?\n/);
    for (let i = 0; i < Math.max(baseLines.length, fLines.length); i++) {
      if (baseLines[i] !== fLines[i]) {
        console.log(`  Diff at line ${i+1}:`);
        console.log(`    index.html: ${baseLines[i]}`);
        console.log(`    ${f}:       ${fLines[i]}`);
      }
    }
  }
});
