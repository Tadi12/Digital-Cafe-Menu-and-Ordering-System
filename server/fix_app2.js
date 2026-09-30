const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');
c = c.replace(/\n\}\);\n\n\/\/ API Routes/, '\n\n// API Routes');
fs.writeFileSync('app.js', c);
console.log('Fixed');
