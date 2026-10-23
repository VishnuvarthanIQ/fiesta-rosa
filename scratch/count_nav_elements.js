const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const headers = content.match(/<header[^>]*>/g) || [];
  const navs = content.match(/<nav[^>]*>/g) || [];
  const togglers = content.match(/navbar-toggler/g) || [];
  const collapses = content.match(/navbar-collapse/g) || [];
  console.log(`${f.padEnd(20)} headers: ${headers.length}, navs: ${navs.length}, togglers: ${togglers.length}, collapses: ${collapses.length}`);
});
