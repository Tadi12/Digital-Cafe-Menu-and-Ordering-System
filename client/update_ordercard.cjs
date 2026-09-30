const fs = require('fs');
let c = fs.readFileSync('src/components/admin/OrderCard.jsx', 'utf8');

c = c.replace(/dark:hover:bg-recipe-cardHover/g, 'dark:hover:bg-recipe-card');
c = c.replace(/dark:hover:bg-orange-500\/20 dark:hover:text-orange-300/g, 'dark:hover:bg-recipe-card');

fs.writeFileSync('src/components/admin/OrderCard.jsx', c);
console.log('OrderCard updated');
