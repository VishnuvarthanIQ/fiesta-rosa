const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const baseLines = fs.readFileSync('index.html', 'utf8').match(/<header[\s\S]*?<\/header>/)[0].split(/\r?\n/);

files.forEach(f => {
  const m = fs.readFileSync(f, 'utf8').match(/<header[\s\S]*?<\/header>/);
  if (!m) return;
  const fLines = m[0].split(/\r?\n/);
  const diffs = [];
  for (let i = 0; i < Math.max(baseLines.length, fLines.length); i++) {
    if (baseLines[i] !== fLines[i]) {
      diffs.push({ line: i+1, base: baseLines[i], other: fLines[i] });
    }
  }
  if (diffs.length > 0) {
    console.log(`\n=== Diffs in ${f} (total ${diffs.length}) ===`);
    diffs.forEach(d => {
      console.log(`  L${d.line}:`);
      console.log(`    base:  ${d.base ? d.base.trim() : 'EOF'}`);
      console.log(`    other: ${d.other ? d.other.trim() : 'EOF'}`);
    });
  }
});
