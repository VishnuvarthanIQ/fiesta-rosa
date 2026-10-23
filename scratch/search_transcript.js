const fs = require('fs');
const p = 'C:/Users/MR.VISHNU/.gemini/antigravity/brain/16d690a5-8b39-4e44-b0f5-136fffa6f1d3/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(p, 'utf8').trim().split('\n');

lines.forEach((line, idx) => {
  if (line.includes('two different') || line.includes('menu design') || line.includes('two different menu')) {
    const obj = JSON.parse(line);
    console.log(`Line ${idx} [${obj.type}] [${obj.source}]:`);
    console.log(obj.content ? obj.content.substring(0, 300) : 'no content');
  }
});
