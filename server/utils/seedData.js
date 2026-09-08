const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const Category = require('../models/Category');
const Food = require('../models/Food');
const Table = require('../models/Table');
const Order = require('../models/Order');
const { generateTableQRCode } = require('../services/qrService');

const seedData = async () => {
  try {
    await connectDB();

    console.log('[Seeding]: Clearing existing database data...');
    await Admin.deleteMany({});
    await Category.deleteMany({});
    await Food.deleteMany({});
    await Table.deleteMany({});
    await Order.deleteMany({});

    console.log('[Seeding]: Creating default Admin account...');
    const admin = await Admin.create({
      name: 'Café Manager',
      email: 'admin@cafe.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log(`[Admin Created]: ${admin.email} (Password: admin123)`);

    console.log('[Seeding]: Creating initial Categories...');
    const categoriesData = [
      {
        type: 'drink',
        name: { en: 'Coffee & Espresso', am: 'ቡና እና ኤስፕሬሶ' },
        image: {
          url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_cat_coffee',
        },
      },
      {
        type: 'drink',
        name: { en: 'Traditional Drinks', am: 'ባህላዊ መጠጦች' },
        image: {
          url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_cat_drinks',
        },
      },
      {
        type: 'food',
        name: { en: 'Burgers & Sandwiches', am: 'በርገር እና ሳንድዊች' },
        image: {
          url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_cat_burgers',
        },
      },
      {
        type: 'food',
        name: { en: 'Breakfast & Pastry', am: 'ቁርስ እና ኬክ' },
        image: {
          url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_cat_breakfast',
        },
      },
    ];

    const categories = await Category.insertMany(categoriesData);

    const coffeeCat = categories.find((c) => c.name.en === 'Coffee & Espresso')._id;
    const drinksCat = categories.find((c) => c.name.en === 'Traditional Drinks')._id;
    const burgersCat = categories.find((c) => c.name.en === 'Burgers & Sandwiches')._id;
    const breakfastCat = categories.find((c) => c.name.en === 'Breakfast & Pastry')._id;

    console.log('[Seeding]: Creating initial Food items...');
    const foodsData = [
      {
        name: { en: 'Ethiopian Macchiato', am: 'የኢትዮጵያ ማኪያቶ' },
        price: 70,
        ingredients: {
          en: ['Espresso Roast', 'Steamed Milk', 'Milk Foam'],
          am: ['የቡና ኤስፕሬሶ', 'የሞቀ ወተት', 'የወተት አረፋ'],
        },
        image: {
          url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_food_macchiato',
        },
        category: coffeeCat,
        available: true,
      },
      {
        name: { en: 'Special Yergacheffe Brew', am: 'ልዩ የይርጋጨፌ ቡና' },
        price: 60,
        ingredients: {
          en: ['100% Arabica Beans', 'Spiced Cardamom (Optional)'],
          am: ['100% አረቢካ ቡና', 'ኮረሪማ'],
        },
        image: {
          url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_food_yergacheffe',
        },
        category: coffeeCat,
        available: true,
      },
      {
        name: { en: 'Fresh Spris Juice', am: 'ትኩስ እስፕሪስ ጭማቂ' },
        price: 120,
        ingredients: {
          en: ['Avocado', 'Mango', 'Papaya', 'Lime'],
          am: ['አቮካዶ', 'ማንጎ', 'ፓፓያ', 'ሎሚ'],
        },
        image: {
          url: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b7?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_food_spris',
        },
        category: drinksCat,
        available: true,
      },
      {
        name: { en: 'Spiced Ethiopian Spiced Tea', am: 'የቀመማ ቅመም ሻይ' },
        price: 40,
        ingredients: {
          en: ['Black Tea', 'Cinnamon', 'Cloves', 'Ginger'],
          am: ['ጥቁር ሻይ', 'ቀረፋ', 'ቅርንፉድ', 'ዝንጅብል'],
        },
        image: {
          url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_food_spiced_tea',
        },
        category: drinksCat,
        available: true,
      },
      {
        name: { en: 'Special House Cheeseburger', am: 'ልዩ የቤቱ ቺዝበርገር' },
        price: 320,
        ingredients: {
          en: ['Prime Beef Patty', 'Cheddar Cheese', 'Caramelized Onion', 'Lettuce', 'House Sauce'],
          am: ['የበሬ ሥጋ', 'ቺዝ', 'የተጠበሰ ሽንኩርት', 'ሰላጣ', 'የቤቱ ሶስ'],
        },
        image: {
          url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_food_burger',
        },
        category: burgersCat,
        available: true,
      },
      {
        name: { en: 'Club Sandwich & Fries', am: 'ክለብ ሳንድዊች ከቺፕስ ጋር' },
        price: 290,
        ingredients: {
          en: ['Grilled Chicken', 'Egg', 'Tomato', 'Mayo', 'French Fries'],
          am: ['የተጠበሰ ዶሮ', 'እንቁላል', 'ቲማቲም', 'ማዮኔዝ', 'ቺፕስ'],
        },
        image: {
          url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_food_club',
        },
        category: burgersCat,
        available: true,
      },
      {
        name: { en: 'Special Chechebsa', am: 'ልዩ ጨጨብሳ' },
        price: 220,
        ingredients: {
          en: ["Flatbread Bits", "Nit'ir Qibe (Clarified Butter)", "Berbere Spice", "Honey", "Boiled Egg"],
          am: ['ቂጣ', 'ንጥር ቅቤ', 'በርበሬ', 'ማር', 'ቀቀል እንቁላል'],
        },
        image: {
          url: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_food_chechebsa',
        },
        category: breakfastCat,
        available: true,
      },
      {
        name: { en: 'Croissant with Butter & Honey', am: 'ክሮሰንት ከቅቤ እና ማር ጋር' },
        price: 130,
        ingredients: {
          en: ['Butter Croissant', 'Organic Honey'],
          am: ['ቅቤ ክሮሰንት', 'ተፈጥሮአዊ ማር'],
        },
        image: {
          url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
          publicId: 'seed_food_croissant',
        },
        category: breakfastCat,
        available: true,
      },
    ];

    await Food.insertMany(foodsData);

    console.log('[Seeding]: Creating Tables with unique QR Codes...');
    const tablesInfo = [
      { tableNumber: 1, tableName: 'VIP Corner Table 1' },
      { tableNumber: 2, tableName: 'Window View Table 2' },
      { tableNumber: 3, tableName: 'Garden Terrace Table 3' },
      { tableNumber: 4, tableName: 'Main Hall Table 4' },
      { tableNumber: 5, tableName: 'Main Hall Table 5' },
    ];

    for (const info of tablesInfo) {
      const table = new Table({
        tableNumber: info.tableNumber,
        tableName: info.tableName,
        active: true,
      });
      await table.save();

      // Generate Data URI QR Code
      const qrCodeUrl = await generateTableQRCode(table._id);
      table.qrCodeUrl = qrCodeUrl;
      await table.save();
      console.log(`[Table Created]: Table #${table.tableNumber} (ID: ${table._id})`);
    }

    console.log('✅ Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Seeding Failed:', error);
    process.exit(1);
  }
};

seedData();
