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
const settingsRoutes = require('./routes/settingsRoutes');
const globalRateLimiter = require('./middleware/globalRateLimiter');

const app = express();

// Render forwards the originating client through its internal proxy chain. Its
// service is not directly reachable, so trusting that chain lets req.ip resolve
// to the left-most client address rather than a private 10.x Render hop.
// Locally, proxy headers remain untrusted unless explicitly enabled.
const trustProxy = String(process.env.TRUST_PROXY || '').toLowerCase();
app.set(
  'trust proxy',
  trustProxy
    ? ['true', '1'].includes(trustProxy) || Number(trustProxy) || false
    : process.env.NODE_ENV === 'production',
);


app.use(cors({ origin: true, credentials: true }));

// Body Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiting to all API requests
app.use('/api/', globalRateLimiter);

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hable Cafe API is running smoothly' });
});

// A lightweight frontend startup check. The IP is evaluated solely from the
// server request/proxy chain; no client-provided IP value is accepted.

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;

