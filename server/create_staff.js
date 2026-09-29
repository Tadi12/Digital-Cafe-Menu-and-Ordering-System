require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cafe').then(async () => {
  try {
    const chef = new Admin({ name: 'Head Chef', email: 'chef@cafe.com', password: 'password123', role: 'chef' });
    const waiter = new Admin({ name: 'Front Desk', email: 'waiter@cafe.com', password: 'password123', role: 'waiter' });
    await chef.save();
    await waiter.save();
    console.log('Chef and Waiter created successfully!');
  } catch (err) {
    if (err.code === 11000) console.log('Staff already exists.');
    else console.error(err);
  }
  process.exit();
});
