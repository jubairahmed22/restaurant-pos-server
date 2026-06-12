const ShopOffer = require('./shop-offer.model');

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.activeOnly === 'true') filter.isActive = true;

    const data = await ShopOffer.find(filter).populate('products', 'title price images discountType discountValue').sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const offer = await ShopOffer.findById(req.params.id).populate('products', 'title price images');
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const offer = await ShopOffer.create(req.body);
    await offer.populate('products', 'title price images');
    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const offer = await ShopOffer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('products', 'title price images');
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
    res.json({ success: true, data: offer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const offer = await ShopOffer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
