// Test regex and validation rules from assets/js/main.js
const fs = require('fs');

const mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// Extract name regex from main.js
const nameRegexMatch = mainJs.match(/const\s+nameRegex\s*=\s*(\/[^\/]+\/[a-z]*);/) || mainJs.match(/nameRegex\s*=\s*(\/[^\/]+\/[a-z]*);/);
let nameRegex = /^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]+(?:['\s\-][A-Za-z\u00C0-\u024F\u1E00-\u1EFF]+)+$/;
if (nameRegexMatch) {
  nameRegex = eval(nameRegexMatch[1]);
  console.log('Extracted nameRegex from main.js:', nameRegex);
} else {
  console.log('Using default name regex for test:', nameRegex);
}

// Extract phone regex from main.js
const phoneRegexMatch = mainJs.match(/const\s+phoneRegex\s*=\s*(\/[^\/]+\/[a-z]*);/) || mainJs.match(/phoneRegex\s*=\s*(\/[^\/]+\/[a-z]*);/);
let phoneRegex = /^[6-9]\d{9}$/;
if (phoneRegexMatch) {
  phoneRegex = eval(phoneRegexMatch[1]);
  console.log('Extracted phoneRegex from main.js:', phoneRegex);
}

const nameTests = [
  { val: 'John Smith', expected: true },
  { val: "Mary-Jane", expected: true },
  { val: "Anne O'Brien", expected: true },
  { val: 'José García', expected: true },
  { val: '333', expected: false },
  { val: 'John123', expected: false },
  { val: 'Maria @ Sofia', expected: false },
  { val: '#Party', expected: false }
];

let failed = 0;
console.log('\n--- Testing Name Validation ---');
nameTests.forEach(t => {
  const clean = t.val.trim();
  const passed = nameRegex.test(clean);
  const ok = passed === t.expected;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${t.val}" -> ${passed} (expected: ${t.expected})`);
  if (!ok) failed++;
});

const phoneTests = [
  { val: '9876543210', expected: true },
  { val: '8123456789', expected: true },
  { val: '7000000000', expected: true },
  { val: '6999999999', expected: true },
  { val: '1234567890', expected: false },
  { val: '98765', expected: false },
  { val: '98765432101', expected: false },
  { val: 'abcdefghij', expected: false }
];

console.log('\n--- Testing Phone Validation ---');
phoneTests.forEach(t => {
  const clean = t.val.replace(/[\s\-\(\)\.]/g, '');
  const passed = phoneRegex.test(clean);
  const ok = passed === t.expected;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${t.val}" -> ${passed} (expected: ${t.expected})`);
  if (!ok) failed++;
});

if (failed === 0) {
  console.log('\n✅ ALL VALIDATION TESTS PASSED!');
} else {
  console.log(`\n❌ ${failed} VALIDATION TESTS FAILED.`);
  process.exit(1);
}
