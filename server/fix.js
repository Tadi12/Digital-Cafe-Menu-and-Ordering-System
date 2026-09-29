const fs = require('fs');

const files = ['controllers/foodController.js', 'controllers/categoryController.js'];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // I need to replace the literal string ```await clearCache(`"__express__/api/categories*`");`n    return``` with valid JS.
  // The exact string was: await clearCache(`"__express__/api/foods*`");`n    return
  
  content = content.replace(/await clearCache\(`"__express__\/api\/[^`]+`"\);`n\s+return/g, "await clearCache('__express__/api/*');\n    return");
  fs.writeFileSync(f, content);
  console.log('Fixed', f);
});
