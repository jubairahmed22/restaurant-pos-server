const express = require('express');
const {
  getDashboardStats,
  getFinancialReport,
  getMarketingReport,
  getConversionFunnel,
  getAttributionReport,
  getBusinessReport,
} = require('./analytics.controller');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

const admin = [protect, authorize('admin')];

router.get('/',           ...admin, getDashboardStats);
router.get('/financial',  ...admin, getFinancialReport);
router.get('/marketing',  ...admin, getMarketingReport);
router.get('/conversion', ...admin, getConversionFunnel);
router.get('/attribution',...admin, getAttributionReport);
router.get('/business',   ...admin, getBusinessReport);

module.exports = router;
