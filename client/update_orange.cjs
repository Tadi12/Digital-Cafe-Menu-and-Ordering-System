const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Make all main buttons turn orange on hover instead of black/dark-brown
  content = content.replace(/hover:bg-cafe-900/g, 'hover:bg-gold-600');
  content = content.replace(/hover:bg-cafe-800/g, 'hover:bg-gold-500');

  // Also in dark mode, let's make sure hover is visibly orange
  content = content.replace(/dark:hover:bg-recipe-orange/g, 'dark:hover:bg-gold-500');

  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
console.log('done');
