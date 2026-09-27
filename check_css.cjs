const fs = require('fs');
const raw = fs.readFileSync('tw_raw.css', 'utf8');
const at = [...raw.matchAll(/@[a-zA-Z-]+/g)].map((m) => m[0]);
const counts = {};
for (const a of at) counts[a] = (counts[a] || 0) + 1;
console.log('at-rules:', counts);
console.log('total @ :', at.length);
