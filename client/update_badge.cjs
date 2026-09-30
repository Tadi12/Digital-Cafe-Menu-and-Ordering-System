const fs = require('fs');
let c = fs.readFileSync('src/components/customer/OrderStatusBadge.jsx', 'utf8');
c = c.replace(/ dark:bg-[^\s']+/g, '');
c = c.replace(/ dark:text-[^\s']+/g, '');
c = c.replace(/ dark:border-[^\s']+/g, '');
fs.writeFileSync('src/components/customer/OrderStatusBadge.jsx', c);
console.log('done');
