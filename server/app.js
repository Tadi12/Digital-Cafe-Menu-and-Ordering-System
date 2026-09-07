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

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:1573',
  'http://localhost:5173',
].filter(Boolean);

// Configure CORS with explicit handling for missing CLIENT_URL (development fallback).
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an origin (e.g., curl) or whitelisted origins.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // If CLIENT_URL is not defined, allow any origin (development mode).
    if (!process.env.CLIENT_URL) {
      console.warn('CLIENT_URL not set – allowing all origins for CORS (development fallback)');
      return callback(null, true);
    }
    // Otherwise reject the request.
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Body Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hable Cafe API is running smoothly' });
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
