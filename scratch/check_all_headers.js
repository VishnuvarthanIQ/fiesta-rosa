const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const m = content.match(/<header[\s\S]*?<\/header>/);
  if (m) {
    const navItems = [...m[0].matchAll(/<li class="nav-item[^"]*">([\s\S]*?)<\/li>/g)].map(x => x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    const hasCollapse = m[0].includes('navbar-collapse');
    const toggler = m[0].includes('navbar-toggler');
    const actions = m[0].includes('header-actions');
    console.log(f.padEnd(22), 'collapse:', hasCollapse, 'toggler:', toggler, 'actions:', actions, 'items count:', navItems.length);
  } else {
    console.log(f.padEnd(22), 'NO HEADER');
  }
});
