const fs = require('fs');
let content = fs.readFileSync('src/api/axiosClient.js', 'utf8');
content = content.replace(/import \{ getCachedLocation \} from '\.\.\/hooks\/useLocationGuard';\n?/, '');
content = content.replace(/const location = getCachedLocation\(\);\n\s+if \(location\) \{\n\s+config\.headers\['x-client-lat'\] = location\.lat;\n\s+config\.headers\['x-client-lon'\] = location\.lon;\n\s+\}/, '');
fs.writeFileSync('src/api/axiosClient.js', content);
console.log('Removed from axiosClient');
