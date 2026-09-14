const express = require('express');
const cors = require('cors');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const foodRoutes = require('./routes/foodRoutes');
const tableRoutes = require('./routes/tableRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { requireCafeWifi } = require('./middleware/cafeWifiMiddleware');

const app = express();

// Render forwards the originating client in X-Forwarded-For. In production,
// trust only its immediately connected proxy. Locally, leave proxy headers
// untrusted unless TRUST_PROXY is explicitly configured.
const trustProxy = process.env.TRUST_PROXY;
app.set('trust proxy', trustProxy === undefined
  ? process.env.NODE_ENV === 'production'
  : trustProxy === 'true' ? 1 : Number(trustProxy) || false);

app.use(cors({ origin: true, credentials: true }));

// Body Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hable Cafe API is running smoothly' });
});

// A lightweight frontend startup check. The IP is evaluated solely from the
// server request/proxy chain; no client-provided IP value is accepted.
app.get('/api/access/menu', requireCafeWifi, (req, res) => {
  res.json({ success: true });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
