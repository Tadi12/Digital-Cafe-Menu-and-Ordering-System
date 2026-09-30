const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');
c = c.replace(/\n\/\/ A lightweight frontend startup check\.[^\n]*\n\/\/ server request\/proxy chain[^\n]*\n\}\);\n/, '\n');
fs.writeFileSync('app.js', c);
