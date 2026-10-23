const fs = require('fs');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const cssFiles = ['assets/css/style.css'];

const allImages = new Map();

function addRef(img, source) {
  // Normalize
  let clean = img.replace(/['"]/g, '').trim();
  if (clean.startsWith('../')) clean = 'assets/' + clean.replace('../', '');
  if (clean.includes('data:') || clean.includes('favicon') || clean.includes('logo')) return;
  // If it's unsplash, normalize by photo ID
  let key = clean;
  const unsplashMatch = clean.match(/photo-([a-zA-Z0-9\-]+)/);
  if (unsplashMatch) {
    key = 'unsplash:' + unsplashMatch[1];
  }

  if (!allImages.has(key)) {
    allImages.set(key, { raw: clean, sources: [] });
  }
  allImages.get(key).sources.push(source);
}

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /(?:src=["']|url\(['"]?)([^'")]+?\.(?:jpg|jpeg|png|webp|svg)[^'")]*)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    addRef(match[1], file);
  }
});

cssFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /url\(['"]?([^'")]+?\.(?:jpg|jpeg|png|webp|svg)[^'")]*)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    addRef(match[1], file);
  }
});

console.log('=== DETAILED IMAGE AUDIT ===');
let duplicates = 0;
for (const [key, data] of allImages.entries()) {
  const uniqueSources = [...new Set(data.sources)];
  // We allow a hero to be referenced in both its html file and style.css
  const htmlSources = uniqueSources.filter(s => s.endsWith('.html'));
  if (htmlSources.length > 1) {
    console.log(`[DUPLICATE ACROSS HTML PAGES] ${key} (${data.raw}) in:`, htmlSources);
    duplicates++;
  }
}
if (duplicates === 0) {
  console.log('No duplicates found across HTML pages!');
}
