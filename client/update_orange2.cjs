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

  // Revert light mode hovers
  content = content.replace(/hover:bg-gold-600/g, 'hover:bg-cafe-900');
  content = content.replace(/hover:bg-gold-500(?!\/)/g, 'hover:bg-cafe-800');

  // Ensure dark mode buttons turn orange on hover
  // Previously they were dark:hover:bg-gold-500 from the last script. I will leave them as dark:hover:bg-gold-500!
  // Wait, if I replaced hover:bg-gold-500 with hover:bg-cafe-800, I might accidentally replace dark:hover:bg-gold-500!
  // Let me be precise:
  content = content.replace(/dark:hover:bg-cafe-800/g, 'dark:hover:bg-gold-500');

  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
console.log('done');
