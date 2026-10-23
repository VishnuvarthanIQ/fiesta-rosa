const fs = require('fs');

console.log('=== 1. VERIFYING BLOG PAGE ELEMENTS & DATA ATTRIBUTES ===');
const blogHtml = fs.readFileSync('blog.html', 'utf8');

// 1. Verify sort dropdown exists
if (!blogHtml.includes('id="blogSort"')) throw new Error("Missing #blogSort in blog.html");
if (!blogHtml.includes('id="blogSearch"')) throw new Error("Missing #blogSearch in blog.html");
if (!blogHtml.includes('id="noPosts"')) throw new Error("Missing #noPosts in blog.html");
if (!blogHtml.includes('id="resetBlogFiltersBtn"')) throw new Error("Missing #resetBlogFiltersBtn in blog.html");

// 2. Verify all 12 posts have data-cat, data-date, data-title, data-text
const postRegex = /<div class="col-md-6 post"([^>]+)>/g;
let postCount = 0;
let match;
while ((match = postRegex.exec(blogHtml)) !== null) {
  postCount++;
  const attrs = match[1];
  if (!attrs.includes('data-cat=')) throw new Error(`Post #${postCount} missing data-cat`);
  if (!attrs.includes('data-date=')) throw new Error(`Post #${postCount} missing data-date`);
  if (!attrs.includes('data-title=')) throw new Error(`Post #${postCount} missing data-title`);
  if (!attrs.includes('data-text=')) throw new Error(`Post #${postCount} missing data-text`);
}
console.log(`Verified ${postCount} blog posts have complete structured metadata (data-cat, data-date, data-title, data-text).`);
if (postCount !== 12) throw new Error(`Expected 12 posts, found ${postCount}`);

// 3. Verify all categories have matching filter chips
const chipRegex = /data-bcat="([^"]+)"/g;
const chips = new Set();
while ((match = chipRegex.exec(blogHtml)) !== null) {
  chips.add(match[1]);
}
console.log(`Found categories with chips: ${[...chips].join(', ')}`);
['all', 'themes', 'dresses', 'decor', 'budget', 'venues', 'traditions', 'catering', 'photo', 'music', 'tips'].forEach(cat => {
  if (!chips.has(cat)) throw new Error(`Missing filter chip for category: ${cat}`);
});
console.log('✅ Blog HTML markup verified!\n');

console.log('=== 2. VERIFYING PACKAGES PAGE ELEMENTS & DELIVERABLES ===');
const pkgHtml = fs.readFileSync('packages.html', 'utf8');

// 1. Verify Packages Hero was NOT modified and matches hero rules
if (!pkgHtml.includes('class="hero hero-packages" style="background-image: url(\'assets/img/hero/packages.jpg\');"')) {
  throw new Error("Packages hero section background image was modified!");
}
if (!pkgHtml.includes('<h1 class="mb-3">Packages &amp; Transparent Pricing</h1>')) {
  throw new Error("Packages hero title was modified!");
}
console.log('✅ Packages hero section is verified 100% UNTOUCHED.');

// 2. Verify estimator slider & add-ons
if (!pkgHtml.includes('id="guests"')) throw new Error("Missing #guests slider");
if (!pkgHtml.includes('id="guestOut"')) throw new Error("Missing #guestOut readout");
if (!pkgHtml.includes('id="ad1"') || !pkgHtml.includes('id="ad2"') || !pkgHtml.includes('id="ad3"') || !pkgHtml.includes('id="ad4"')) {
  throw new Error("Missing one or more addon checkboxes ad1-ad4");
}

// 3. Verify 3 package tiers
const expectedTiers = ['Sparkle', 'Royal', 'Grand Gala'];
expectedTiers.forEach(tier => {
  if (!pkgHtml.includes(`data-name="${tier}"`)) throw new Error(`Missing package card: ${tier}`);
  if (!pkgHtml.includes(`data-pkg="${tier}"`)) throw new Error(`Missing select button for: ${tier}`);
});

// 4. Verify Royal is marked popular/recommended
if (!pkgHtml.includes('data-name="Royal"') || !pkgHtml.includes('Most Popular &bull; Recommended')) {
  throw new Error("Royal card missing popular/recommended badge");
}

// 5. Verify feature comparison table
if (!pkgHtml.includes('id="compare"')) throw new Error("Missing #compare anchor on comparison table section");
if (!pkgHtml.includes('table-col-featured')) throw new Error("Missing table-col-featured class on Royal column");

// 6. Verify guarantees section
if (!pkgHtml.includes('100% Bilingual Execution')) throw new Error("Missing bilingual guarantee");
if (!pkgHtml.includes('Transparent Guaranteed Pricing')) throw new Error("Missing pricing guarantee");
if (!pkgHtml.includes('Dedicated Lead Director')) throw new Error("Missing dedicated director guarantee");

// 7. Verify consultation CTA links
const consultationLinks = (pkgHtml.match(/href="contact\.html#booking"/g) || []).length;
console.log(`Found ${consultationLinks} consultation CTA links pointing to contact.html#booking`);
if (consultationLinks < 3) throw new Error("Expected at least 3 consultation CTAs on packages page");

console.log('✅ Packages page markup verified!\n');

console.log('=== 3. VERIFYING SCRIPT LOGIC IN MAIN.JS ===');
const mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// Verify blog filter logic
if (/(^|[^$])\$\('\.post',\s*postsGrid\)/.test(mainJs)) {
  throw new Error("Found buggy $('.post', postsGrid) instead of $$('.post', postsGrid)");
}
if (!mainJs.includes("$$('.post', postsGrid)")) {
  throw new Error("Missing $$('.post', postsGrid) in main.js");
}
if (/(^|[^$])\$\('\[data-bcat\]'\)/.test(mainJs)) {
  throw new Error("Found buggy $('[data-bcat]') instead of $$('[data-bcat]')");
}
if (!mainJs.includes("blogSort")) {
  throw new Error("Missing blogSort logic in main.js");
}
if (!mainJs.includes("resetBlogFiltersBtn")) {
  throw new Error("Missing resetBlogFiltersBtn logic in main.js");
}
if (!mainJs.includes("pkgMsg")) {
  throw new Error("Missing pkgMsg logic in main.js");
}

console.log('✅ main.js logic verified!\n');

console.log('=== 4. VERIFYING CSS STYLING IN STYLE.CSS ===');
const styleCss = fs.readFileSync('assets/css/style.css', 'utf8');

if (!styleCss.includes('.btn-chip:hover:not(.active)')) {
  throw new Error("Missing .btn-chip:hover:not(.active) style distinction");
}
if (!styleCss.includes('.btn-chip.active')) {
  throw new Error("Missing .btn-chip.active style");
}
if (!styleCss.includes('.border-dashed')) {
  throw new Error("Missing .border-dashed empty state style");
}
if (!styleCss.includes('.border-gold-premium')) {
  throw new Error("Missing .border-gold-premium style");
}
if (!styleCss.includes('.pkg-addon-card')) {
  throw new Error("Missing .pkg-addon-card style");
}
if (!styleCss.includes('.table-col-featured')) {
  throw new Error("Missing .table-col-featured style");
}

console.log('✅ style.css rules verified!\n');
console.log('🎉 ALL COMPREHENSIVE TESTS PASSED WITH 0 ERRORS!');
