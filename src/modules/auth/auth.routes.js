const express = require('express');
const { register, login, getMe, logout } = require('./auth.controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;