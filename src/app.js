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

const app = express();

// Security and Network Layer Utilities Middlewares
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
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

app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: "Production Ready Restaurant Management System Backend Layer Running Active." });
});

app.use(errorHandler);

module.exports = app;