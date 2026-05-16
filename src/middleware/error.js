const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('💥 Error Stack:', err.stack);

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    error.message = 'Resource not found.';
    return res.status(404).json({ success: false, error: error.message });
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    error.message = 'Duplicate field value entered.';
    return res.status(400).json({ success: false, error: error.message });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

module.exports = errorHandler;