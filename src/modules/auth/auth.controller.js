const User = require('../users/user.model');

// Helper to get token from model, sign cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = require('jsonwebtoken').sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

  const options = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  user.password = undefined; // Strip password before responding

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // Creating user (role assignment logic can be restricted down the road)
    const user = await User.create({ name, email, password, phone, address, role });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  res.status(200).cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  }).json({ success: true, message: 'User logged out successfully' });
};