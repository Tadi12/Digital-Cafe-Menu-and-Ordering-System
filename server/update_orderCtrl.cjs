const fs = require('fs');
let c = fs.readFileSync('controllers/orderController.js', 'utf8');

const newCode = 
// NOTE: Require axios at top if not present
// const axios = require('axios');

const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { bank, reference } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    if (order.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'Order is already paid.' });
    }

    // Connect to the Python verification microservice
    // e.g. const pythonService = process.env.RECEIPT_VERIFIER_URL || 'http://localhost:8000';
    // For now, we mock the call if the python service is not defined, 
    // but in production we will enforce it.
    
    // Simulate Microservice Response for implementation testing:
    let receiptData = null;
    try {
      // const response = await axios.get(\\/verify?bank=\&url=\\);
      // if (!response.data.success) throw new Error("Invalid receipt");
      // receiptData = response.data.data;
      
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
    }

    // 1. Check receiver account matches Cafe's account
    const cafeAccount = process.env.CAFE_BANK_ACCOUNT || "1000123456";
    if (receiptData.receiver_account !== cafeAccount) {
      return res.status(400).json({ success: false, message: 'Receipt receiver account does not match cafe account!' });
    }

    // 2. Check Amount
    if (parseFloat(receiptData.amount) < order.totalPrice) {
      return res.status(400).json({ success: false, message: 'Paid amount is less than order total!' });
    }

    // 3. Check Status and Currency
    if (receiptData.status !== 'SUCCESS' || receiptData.currency !== 'ETB') {
      return res.status(400).json({ success: false, message: 'Payment status is not SUCCESS or currency is not ETB.' });
    }

    // 4. Freshness check (within last 30 mins)
    const receiptDate = new Date(receiptData.date);
    const now = new Date();
    const diffMins = (now - receiptDate) / (1000 * 60);
    if (diffMins > 30 || diffMins < -5) {
      return res.status(400).json({ success: false, message: 'Receipt is too old to be valid.' });
    }

    // All checks passed! Update Order.
    order.paymentStatus = 'Paid';
    order.paymentMethod = bank;
    order.paymentReference = reference;
    order.receiptData = receiptData;
    
    await order.save(); // Unique index on paymentReference will automatically throw error if reused!

    // Notify kitchen/admin via socket if you want...

    res.json({ success: true, message: 'Payment verified successfully.', data: order });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'This receipt reference has already been used for another order!' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};
;

c = c.replace('module.exports = {', newCode + '\nmodule.exports = {\n  verifyPayment,');
fs.writeFileSync('controllers/orderController.js', c);
console.log('done controller');
