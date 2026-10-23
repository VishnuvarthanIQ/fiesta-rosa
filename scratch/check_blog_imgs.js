const fs = require('fs');

const content = fs.readFileSync('blog.html', 'utf8');
const regex = /(?:src=["']|url\(['"]?)([^'")]+)/gi;
let m;
const imgs = [];
while ((m = regex.exec(content)) !== null) {
  let img = m[1].replace(/['"]/g, '').trim();
  if (img.startsWith('../')) img = 'assets/' + img.replace('../', '');
  if (img.endsWith('.js') || img.endsWith('.css') || img.startsWith('#') || img.startsWith('mailto:') || img.startsWith('tel:')) continue;
  imgs.push(img);
}
console.log(`Total images referenced in blog.html: ${imgs.length}`);
const counts = {};
imgs.forEach(i => {
  const unsplashMatch = i.match(/photo-([a-zA-Z0-9\-]+)/);
  const key = unsplashMatch ? 'unsplash:' + unsplashMatch[1] : i;
  counts[key] = (counts[key] || 0) + 1;
});
for (const [img, count] of Object.entries(counts)) {
  if (count > 1) {
    console.log(`[Duplicate inside blog.html] ${count}x: ${img}`);
  }
}

// Also check all images across other HTML files
const otherFiles = fs.readdirSync('.').filter(f => f.endsWith('.html') && f !== 'blog.html');
const otherImgs = new Set();
otherFiles.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(c)) !== null) {
    let clean = match[1].replace(/['"]/g, '').trim();
    if (clean.startsWith('../')) clean = 'assets/' + clean.replace('../', '');
    if (clean.endsWith('.js') || clean.endsWith('.css') || clean.startsWith('#') || clean.startsWith('mailto:') || clean.startsWith('tel:')) continue;
    const unsplashMatch = clean.match(/photo-([a-zA-Z0-9\-]+)/);
    if (unsplashMatch) otherImgs.add(unsplashMatch[1]);
    else otherImgs.add(clean);
  }
});

console.log(`\nChecking if blog images collide with any other HTML page:`);
imgs.forEach(img => {
  const unsplashMatch = img.match(/photo-([a-zA-Z0-9\-]+)/);
  const key = unsplashMatch ? unsplashMatch[1] : img;
  if (otherImgs.has(key) && !img.includes('logo') && !img.includes('hero/blog.jpg')) {
    console.log(`[Collision with other page]: ${img}`);
  }
});
