const fs = require('fs');
let c = fs.readFileSync('src/components/customer/FoodCard.jsx', 'utf8');

// Disable card hover
c = c.replace(/dark:hover:bg-recipe-cardHover/g, 'dark:hover:bg-recipe-card');
// Disable button hover
c = c.replace(/dark:hover:bg-recipe-orangeDark/g, 'dark:hover:bg-recipe-orange');
// If any light orange was applied
c = c.replace(/dark:hover:bg-orange-500\/20 dark:hover:text-orange-300/g, 'dark:hover:bg-recipe-card');
c = c.replace(/dark:hover:bg-orange-400/g, 'dark:hover:bg-recipe-orange');

fs.writeFileSync('src/components/customer/FoodCard.jsx', c);
console.log('FoodCard updated');
