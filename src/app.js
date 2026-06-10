const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const errorHandler = require('./middleware/error');

// Module Route Imports
const authRoutes = require('./modules/auth/auth.routes');
const categoryRoutes = require('./modules/category/category.routes');
const tagRoutes = require('./modules/tags/tag.routes');
const foodRoutes = require('./modules/foods/food.routes');
const orderRoutes = require('./modules/orders/order.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const reservationRoutes = require('./modules/reservation/reservation.routes');
const tableRoutes     = require('./modules/tables/table.routes');
const sessionRoutes   = require('./modules/sessions/session.routes');
const bootstrapRoutes = require('./modules/bootstrap/bootstrap.routes');
const floorPlanRoutes = require('./modules/floor-plans/floor-plan.routes');
const paymentRoutes   = require('./modules/payments/payment.routes');
const app = express();

sadfsad

// ── Allowed CORS origins ──────────────────────────────────
// Set CLIENT_ORIGIN in cPanel env vars to your frontend URL.
// Multiple origins: comma-separated, e.g. "https://app.ortazz.com.au,http://localhost:51000"
const buildAllowedOrigins = () => {
  const base = [
    'http://localhost:3000',
    'https://rin-frontend.vercel.app/',
    'http://127.0.0.1:3000',
    'http://localhost:51000',
    'http://ortazz.com.au',
  ];
  const extra = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return [...new Set([...base, ...extra])];
};

const allowedOrigins = buildAllowedOrigins();

// Security and Network Layer Utilities Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser tools (Postman, server-to-server) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(morgan('dev'));

// Routing Mount Structures
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/foods', foodRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/bootstrap', bootstrapRoutes);
app.use('/api/v1/floor-plans', floorPlanRoutes);
app.use('/api/v1/payments',   paymentRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: "Production Ready Restaurant Management System Backend Layer Running Active." });
});

app.use(errorHandler);

module.exports = app;