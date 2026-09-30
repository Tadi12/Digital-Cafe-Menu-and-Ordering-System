const fs = require('fs');
let c = fs.readFileSync('src/components/customer/CartDrawer.jsx', 'utf8');

c = c.replace(/dark:hover:bg-recipe-pill/g, 'dark:hover:bg-recipe-bg'); // For close button
c = c.replace(/dark:hover:bg-recipe-border/g, 'dark:hover:bg-recipe-pill'); // For +/- buttons
c = c.replace(/dark:hover:bg-recipe-orangeDark/g, 'dark:hover:bg-recipe-orange'); // For checkout button

c = c.replace(/dark:hover:bg-orange-500\/20 dark:hover:text-orange-300/g, 'dark:hover:bg-transparent');
c = c.replace(/dark:hover:bg-orange-400/g, 'dark:hover:bg-recipe-orange');

fs.writeFileSync('src/components/customer/CartDrawer.jsx', c);
console.log('CartDrawer updated');
