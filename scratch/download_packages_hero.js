const https = require('https');
const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../assets/img/hero/packages.jpg');
const backupPath = path.join(__dirname, '../assets/img/hero/packages.jpg.bak');

if (fs.existsSync(targetPath) && !fs.existsSync(backupPath)) {
  fs.copyFileSync(targetPath, backupPath);
  console.log('Backed up original packages.jpg');
}

const url = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=85';

const file = fs.createWriteStream(targetPath);
https.get(url, response => {
  if (response.statusCode === 200) {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      const stats = fs.statSync(targetPath);
      console.log('Successfully downloaded packages.jpg, size:', stats.size, 'bytes');
    });
  } else {
    console.error('Failed to download image. Status:', response.statusCode);
  }
}).on('error', err => {
  fs.unlinkSync(targetPath);
  console.error('Error downloading:', err.message);
});
