const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const scripts = [...content.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
  if (scripts.length > 0) {
    console.log(`[${f}] has ${scripts.length} inline scripts:`);
    scripts.forEach((s, i) => {
      console.log(`  Script ${i+1}: ${s[1].substring(0, 100).replace(/\s+/g, ' ')}`);
    });
  }
});
