const fs = require('fs');

const files = ['controllers/foodController.js', 'controllers/categoryController.js'];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/return await clearCache\('__express__\/api\/\*'\);/g, "await clearCache('__express__/api/*');");
  fs.writeFileSync(f, content);
  console.log('Fixed return await', f);
});
