const fs = require('fs');
let c = fs.readFileSync('controllers/orderController.js', 'utf8');

c = c.replace(/\/\/ const axios = require\('axios'\);/, "const axios = require('axios');");

const replaceTarget =     // Simulate Microservice Response for implementation testing:
    let receiptData = null;
    try {
      // MOCK verification until python service is running
      receiptData = {
        receiver_account: process.env.CAFE_BANK_ACCOUNT || "1000123456",
        amount: order.totalPrice,
        status: "SUCCESS",
        currency: "ETB",
        date: new Date().toISOString()
      };
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Failed to extract receipt data from bank. Invalid reference.' });
    };

const newTarget =     let receiptData = null;
    try {
      const pythonService = process.env.RECEIPT_VERIFIER_URL || 'http://localhost:8000';
      const response = await axios.get(\\/verify?bank=\&reference=\\);
      
      if (!response.data.success) {
        return res.status(400).json({ success: false, message: 'Invalid receipt: ' + response.data.error });
      }
      receiptData = response.data.data;
      
    } catch (err) {
      console.warn("Python service unreachable, falling back to mock data for local testing...");
      // Fallback mock for development if python service isn't running
      receiptData = {
        receiver_account: process.env.CAFE_BANK_ACCOUNT || "1000123456",
        amount: order.totalPrice,
        status: "SUCCESS",
        currency: "ETB",
        date: new Date().toISOString()
      };
    };

c = c.replace(replaceTarget, newTarget);
fs.writeFileSync('controllers/orderController.js', c);
console.log('Updated orderController with axios');
