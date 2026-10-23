const fs = require('fs');
const p = 'C:/Users/MR.VISHNU/.gemini/antigravity/brain/16d690a5-8b39-4e44-b0f5-136fffa6f1d3/.system_generated/logs/transcript.jsonl';
if (!fs.existsSync(p)) {
  console.log('not found');
  process.exit(0);
}
const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
console.log('Total lines in transcript:', lines.length);

for (let i = 0; i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.type === 'USER_INPUT') {
      console.log(`\n=== USER INPUT (line ${i}) ===`);
      console.log(obj.content);
    }
  } catch (e) {}
}
