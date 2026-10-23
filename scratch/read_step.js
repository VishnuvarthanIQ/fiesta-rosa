const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/MR.VISHNU/.gemini/antigravity/brain/fcce3f6b-3d0c-422d-ac33-2f0d545e1194/.system_generated/logs/transcript_full.jsonl')
});
rl.on('line', (line) => {
  if (line.includes('"step_index":2330,')) {
    const obj = JSON.parse(line);
    console.log(obj.content);
    process.exit(0);
  }
});
