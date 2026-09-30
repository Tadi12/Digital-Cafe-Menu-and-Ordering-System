const fs = require('fs');
let c = fs.readFileSync('src/components/admin/AdminSidebar.jsx', 'utf8');

c = c.replace(/dark:hover:bg-orange-500\/20 dark:hover:text-orange-300/g, 'dark:hover:bg-transparent dark:hover:text-white');

fs.writeFileSync('src/components/admin/AdminSidebar.jsx', c);
console.log('Sidebar updated');
