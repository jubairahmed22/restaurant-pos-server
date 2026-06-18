const Review = require('./review.model');

exports.getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
};

exports.createReview = async (req, res, next) => {
  try {
    const { url, title, description, image, favicon, domain, siteName } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
    const review = await Review.create({ url, title, description, image, favicon, domain, siteName });
    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};
