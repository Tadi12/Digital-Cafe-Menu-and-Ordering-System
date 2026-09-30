const fs = require('fs');
const file = 'controllers/orderController.js';
let content = fs.readFileSync(file, 'utf8');

const target = `      // Business Rule: Validate valid status transition flow (Pending -> Preparing -> Ready -> Completed)
      if (status && status !== order.status) {
        const validTransitions = {`;

const replacement = `      // Business Rule: Validate valid status transition flow (Pending -> Preparing -> Ready -> Completed)
      if (status && status !== order.status) {
        // Role-Based Status Enforcement
        const role = req.user.role || 'super_admin';
        if (role === 'chef' && !['Preparing', 'Ready'].includes(status)) {
           return res.status(403).json({ success: false, message: 'Access Denied: Chefs can only change status to Preparing or Ready.' });
        }
        if (role === 'waiter' && status !== 'Completed') {
           return res.status(403).json({ success: false, message: 'Access Denied: Waiters can only change status to Completed.' });
        }

        const validTransitions = {`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Done');
