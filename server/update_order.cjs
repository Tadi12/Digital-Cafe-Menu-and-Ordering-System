const fs = require('fs');
let c = fs.readFileSync('models/Order.js', 'utf8');

const insertAfter =       paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid',
    },;

const newFields =     paymentReference: {
      type: String,
      sparse: true,
      unique: true,
    },
    receiptData: {
      type: Object,
      default: null,
    },;

c = c.replace(/    paymentStatus: \{\s+type: String,\s+enum: \['Unpaid', 'Paid'\],\s+default: 'Unpaid',\s+\},/, insertAfter + '\n' + newFields);
c = c.replace(/enum: \['Cash'\]/, "enum: ['Cash', 'Telebirr', 'CBE', 'Dashen', 'Awash', 'BOA', 'Zemen']");

fs.writeFileSync('models/Order.js', c);
console.log('Order model updated');
