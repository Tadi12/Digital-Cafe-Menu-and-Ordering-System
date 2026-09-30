const fs = require('fs');
const files = ['routes/foodRoutes.js', 'routes/categoryRoutes.js', 'routes/tableRoutes.js'];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/const \{ requireGeofence \} = require\('\.\.\/middleware\/geofenceMiddleware'\);\n?/, '');
  content = content.replace(/, requireGeofence/g, '');
  content = content.replace(/requireGeofence, /g, '');
  fs.writeFileSync(f, content);
});
console.log('Removed geofence from routes');
