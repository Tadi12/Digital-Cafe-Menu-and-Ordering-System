const fs = require('fs');
let c = fs.readFileSync('src/pages/admin/DashboardPage.jsx', 'utf8');
c = c.replace(/"https:\/\/images\.unsplash\.com\/photo-1583337130417-3346a1be7dee\?auto=format&fit=crop&q=80&w=800"/, '"/kitchen-dashboard.jpg"');
fs.writeFileSync('src/pages/admin/DashboardPage.jsx', c);
console.log('done');
