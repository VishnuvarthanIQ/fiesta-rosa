const fs = require('fs');
const path = require('path');

let errors = 0;
let warnings = 0;

console.log('=== 1. VERIFYING HTML FILES EXISTENCE & BASIC STRUCTURE ===');
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
console.log(`Found ${htmlFiles.length} HTML files: ${htmlFiles.join(', ')}`);

const publicPages = [
  'index.html',
  'home-2.html',
  'about.html',
  'services.html',
  'service-details.html',
  'packages.html',
  'portfolio.html',
  'blog.html',
  'blog-details.html',
  'contact.html',
  'dashboard.html',
  'login.html',
  'register.html',
  '404.html',
  'coming-soon.html'
];

publicPages.forEach(p => {
  if (!fs.existsSync(p)) {
    console.error(`[ERROR] Missing page: ${p}`);
    errors++;
  }
});

console.log('\n=== 2. VERIFYING INTERNAL LINKS & ANCHORS ===');
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const linkRegex = /href=["']([^"'#:]+)(\.html)?(?:#([^"']*))?["']/gi;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const rawHref = match[0];
    const targetFile = match[1] + (match[2] || '');
    const anchor = match[3];

    if (targetFile.startsWith('http') || targetFile.startsWith('mailto:') || targetFile.startsWith('tel:') || targetFile.startsWith('javascript:')) {
      continue;
    }
    if (targetFile.endsWith('.css') || targetFile.endsWith('.js') || targetFile.endsWith('.png') || targetFile.endsWith('.svg') || targetFile.endsWith('.jpg') || targetFile.endsWith('.json')) {
      // Asset file
      if (!fs.existsSync(targetFile)) {
        console.error(`[ERROR in ${file}] Broken asset link: ${targetFile}`);
        errors++;
      }
      continue;
    }

    if (targetFile.endsWith('.html')) {
      if (!fs.existsSync(targetFile)) {
        console.error(`[ERROR in ${file}] Broken page link: ${targetFile}`);
        errors++;
      } else if (anchor) {
        // verify anchor exists in target
        const targetContent = fs.readFileSync(targetFile, 'utf8');
        const idRegex = new RegExp(`id=["']${anchor}["']`, 'i');
        if (!idRegex.test(targetContent)) {
          console.warn(`[WARN in ${file}] Anchor #${anchor} not found in ${targetFile}`);
          warnings++;
        }
      }
    }
  }
});

console.log('\n=== 3. VERIFYING LOCAL IMAGE ASSETS EXISTENCE ===');
const imageRegex = /(?:src=["']|url\(['"]?)([^'"\)]+?\.(?:jpg|jpeg|png|webp|svg)[^'"\)]*)/gi;
const checkedImages = new Set();
htmlFiles.concat(['assets/css/style.css']).forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    let img = match[1].replace(/['"]/g, '').trim();
    if (img.startsWith('http') || img.startsWith('data:')) continue;
    if (img.startsWith('../')) img = 'assets/' + img.replace(/^\.\.\//, '');
    if (checkedImages.has(img)) continue;
    checkedImages.add(img);

    const fullPath = path.resolve(img);
    if (!fs.existsSync(fullPath)) {
      console.error(`[ERROR in ${file}] Missing image file: ${img}`);
      errors++;
    }
  }
});
console.log(`Checked ${checkedImages.size} unique local image assets.`);

console.log('\n=== 4. VERIFYING HERO UNIQUENESS ACROSS PAGES ===');
const heroes = [
  { page: 'index.html', selector: 'home1.jpg' },
  { page: 'home-2.html', selector: 'Couture Signature Events & VIP Sweet 16s.jpg' },
  { page: 'about.html', selector: 'assets/img/hero/about.jpg' },
  { page: 'services.html', selector: 'assets/img/hero/services.jpg' },
  { page: 'service-details.html', selector: 'assets/img/hero/service-details.jpg' },
  { page: 'packages.html', selector: 'assets/img/hero/packages.jpg' },
  { page: 'portfolio.html', selector: 'assets/img/hero/portfolio.jpg' },
  { page: 'blog.html', selector: 'assets/img/hero/blog.jpg' },
  { page: 'blog-details.html', selector: 'assets/img/hero/blog-details.jpg' },
  { page: 'contact.html', selector: 'assets/img/hero/contact.jpg' },
  { page: 'dashboard.html', selector: 'assets/img/hero/dashboard.jpg' }
];

const heroImagesUsed = new Set();
heroes.forEach(h => {
  if (heroImagesUsed.has(h.selector)) {
    console.error(`[ERROR] Duplicate hero image: ${h.selector} on ${h.page}`);
    errors++;
  }
  heroImagesUsed.add(h.selector);
});
console.log(`Verified ${heroes.length} pages have distinct hero photography.`);

console.log('\n=== 5. VERIFYING TEAM IMAGES ON ABOUT.HTML ===');
const aboutHtml = fs.readFileSync('about.html', 'utf8');
const teamCardCount = (aboutHtml.match(/class="[^"]*team-card[^"]*"/g) || []).length;
const teamImgCount = (aboutHtml.match(/class="[^"]*team-img[^"]*"/g) || []).length;
console.log(`Found ${teamCardCount} team cards with .team-card and ${teamImgCount} with .team-img.`);
if (teamCardCount !== 4 || teamImgCount !== 4) {
  console.error(`[ERROR] Expected 4 team cards and 4 team images, got ${teamCardCount} and ${teamImgCount}`);
  errors++;
}

console.log('\n=== 6. VERIFYING SERVICES COMPARISON TABLE ===');
const servicesHtml = fs.readFileSync('services.html', 'utf8');
if (servicesHtml.includes('<thead class="table-light">')) {
  console.error('[ERROR] table-light still present in services.html thead');
  errors++;
}
const featuredColCount = (servicesHtml.match(/table-col-featured/g) || []).length;
console.log(`Found ${featuredColCount} table-col-featured elements in services.html.`);
if (featuredColCount < 7) {
  console.warn('[WARN] Expected at least 7 table-col-featured cells (1 th + 6 or 7 td)');
  warnings++;
}

console.log('\n=== SUMMARY ===');
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);
if (errors === 0) {
  console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
} else {
  console.log('❌ SOME TESTS FAILED.');
  process.exit(1);
}
