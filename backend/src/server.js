require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { startSeatHoldExpiry } = require('./utils/seatHoldExpiry');

// Route modules
const authRoutes         = require('./modules/auth/auth.routes');
const categoryRoutes     = require('./modules/categories/categories.routes');
const vehicleRoutes      = require('./modules/vehicles/vehicles.routes');
const pricingRulesRoutes = require('./modules/vehicles/pricingRules.routes');
const reviewsRoutes      = require('./modules/vehicles/reviews.routes');
const routeRoutes        = require('./modules/routes/routes.routes');
const tripRoutes         = require('./modules/trips/trips.routes');
const seatRoutes         = require('./modules/seats/seats.routes');
const bookingRoutes      = require('./modules/bookings/bookings.routes');
const paymentRoutes      = require('./modules/payments/payments.routes');
const adminRoutes        = require('./modules/admin/admin.routes');
const userRoutes         = require('./modules/users/users.routes');

const app = express();

// ── CORS ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Body parsing ─────────────────────────────────────────────
// Note: webhook route uses raw body, so we parse JSON for all others
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static file serving (vehicle images) ────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rate limiting ────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Multi-Transport Platform API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/categories',  categoryRoutes);
app.use('/api/vehicles',    vehicleRoutes);
app.use('/api/vehicles',    pricingRulesRoutes); // handles /:id/pricing-rules
app.use('/api/vehicles',    reviewsRoutes);      // handles /:id/reviews
app.use('/api/routes',      routeRoutes);
app.use('/api/trips',       tripRoutes);
app.use('/api/seats',       seatRoutes);
app.use('/api/bookings',    bookingRoutes);
app.use('/api/payments',    paymentRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/users',       userRoutes);

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ─────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────────┐
  │   Multi-Transport Platform API               │
  │   Running on http://localhost:${PORT}           │
  │   Environment: ${process.env.NODE_ENV || 'development'}                  │
  └─────────────────────────────────────────────┘
  `);
  // Start seat hold auto-expiry background job
  startSeatHoldExpiry();
});

module.exports = app;
