const fs = require('fs');
const content = fs.readFileSync('portfolio.html', 'utf8');

// Check all image sources in portfolio.html
const srcRegex = /<img[^>]+src=["']([^"']+)["']/g;
let match;
const sources = [];
while ((match = srcRegex.exec(content)) !== null) {
  sources.push(match[1]);
}

console.log('Total img src in portfolio.html:', sources.length);
let missing = 0;
sources.forEach(src => {
  if (src.startsWith('http')) {
    console.log('EXTERNAL HTTP:', src);
    return;
  }
  // Decode URL entities if any (like &amp;)
  const cleanPath = src.replace(/&amp;/g, '&');
  if (!fs.existsSync(cleanPath)) {
    console.error('MISSING FILE:', cleanPath);
    missing++;
  } else {
    const stat = fs.statSync(cleanPath);
    console.log('EXISTS OK:', cleanPath, `(${stat.size} bytes)`);
  }
});

// Check all data-img attributes
const dataImgRegex = /data-img=["']([^"']+)["']/g;
const dataImgs = [];
while ((match = dataImgRegex.exec(content)) !== null) {
  dataImgs.push(match[1]);
}
console.log('\nTotal data-img in portfolio.html:', dataImgs.length);
dataImgs.forEach(src => {
  const cleanPath = src.replace(/&amp;/g, '&');
  if (!fs.existsSync(cleanPath)) {
    console.error('MISSING data-img:', cleanPath);
    missing++;
  } else {
    console.log('EXISTS data-img OK:', cleanPath);
  }
});

// Check all data-src in fav buttons
const dataSrcRegex = /data-src=["']([^"']+)["']/g;
const dataSrcs = [];
while ((match = dataSrcRegex.exec(content)) !== null) {
  dataSrcs.push(match[1]);
}
console.log('\nTotal data-src in portfolio.html:', dataSrcs.length);
dataSrcs.forEach(src => {
  const cleanPath = src.replace(/&amp;/g, '&');
  if (!fs.existsSync(cleanPath)) {
    console.error('MISSING data-src:', cleanPath);
    missing++;
  } else {
    console.log('EXISTS data-src OK:', cleanPath);
  }
});

console.log('\nTOTAL MISSING FILES:', missing);
