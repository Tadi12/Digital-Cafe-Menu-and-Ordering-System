const fs = require('fs');
const f = 'routes/orderRoutes.js';
let content = fs.readFileSync(f, 'utf8');
content = content.replace(/const \{ requireGeofence \} = require\('\.\.\/middleware\/geofenceMiddleware'\);\n?/, '');
content = content.replace(/, requireGeofence/g, '');
content = content.replace(/requireGeofence, /g, '');
fs.writeFileSync(f, content);
console.log('Removed from orderRoutes');
