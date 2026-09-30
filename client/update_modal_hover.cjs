const fs = require('fs');
let c = fs.readFileSync('src/components/customer/FoodDetailModal.jsx', 'utf8');

c = c.replace(/dark:hover:bg-recipe-cardHover/g, 'dark:hover:bg-recipe-pill/90');
c = c.replace(/dark:hover:bg-recipe-orangeDark/g, 'dark:hover:bg-recipe-orange');
c = c.replace(/dark:hover:bg-recipe-border/g, 'dark:hover:bg-recipe-cardHover');

c = c.replace(/dark:hover:bg-orange-500\/20 dark:hover:text-orange-300/g, 'dark:hover:bg-recipe-pill/90');
c = c.replace(/dark:hover:bg-orange-400/g, 'dark:hover:bg-recipe-orange');

fs.writeFileSync('src/components/customer/FoodDetailModal.jsx', c);
console.log('FoodDetailModal updated');
