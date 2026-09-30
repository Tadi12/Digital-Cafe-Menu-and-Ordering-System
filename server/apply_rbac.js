const fs = require('fs');
const file = 'controllers/orderController.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = 
      // Role-based status enforcement
      if (status && status !== order.status) {
        const role = req.user.role || 'super_admin';
        
        if (role === 'chef' && !['Preparing', 'Ready'].includes(status)) {
           return res.status(403).json({ success: false, message: 'Access Denied: Chefs can only change status to Preparing or Ready.' });
        }
        
        if (role === 'waiter' && status !== 'Completed') {
           return res.status(403).json({ success: false, message: 'Access Denied: Waiters can only change status to Completed.' });
        }

        const validTransitions = {
          Pending: ['Preparing', 'Cancelled'],
          Preparing: ['Ready', 'Cancelled'],
          Ready: ['Completed'],
          Completed: [],
          Cancelled: [],
        };
;

content = content.replace(
  /if \(status && status !== order\.status\) \{\s+const validTransitions = \{/,
  replacement
);

fs.writeFileSync(file, content);
console.log('Role enforcement added');
