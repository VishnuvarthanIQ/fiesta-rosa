const fs = require('fs');
const p = 'C:/Users/MR.VISHNU/.gemini/antigravity/brain/16d690a5-8b39-4e44-b0f5-136fffa6f1d3/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(p, 'utf8').trim().split('\n');

lines.forEach((l, idx) => {
  try {
    const obj = JSON.parse(l);
    if (obj.media && obj.media.length > 0) {
      console.log(`Line ${idx} has media:`, JSON.stringify(obj.media));
    }
  } catch (e) {}
});
