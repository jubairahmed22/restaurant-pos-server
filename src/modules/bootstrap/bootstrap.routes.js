const express = require('express');
const { getBootstrap } = require('./bootstrap.controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.get('/', protect, getBootstrap);

module.exports = router;
