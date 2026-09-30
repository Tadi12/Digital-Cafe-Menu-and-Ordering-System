const fs = require('fs');
let c = fs.readFileSync('src/components/customer/CategoryFilter.jsx', 'utf8');

c = c.replace(/dark:hover:bg-recipe-cardHover/g, 'dark:hover:bg-recipe-pill');
c = c.replace(/dark:hover:bg-orange-500\/20 dark:hover:text-orange-300/g, 'dark:hover:bg-recipe-pill');

fs.writeFileSync('src/components/customer/CategoryFilter.jsx', c);
console.log('CategoryFilter updated');
