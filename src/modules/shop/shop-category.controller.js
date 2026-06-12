const ShopCategory = require('./shop-category.model');

exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      ShopCategory.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      ShopCategory.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const cat = await ShopCategory.findOne({ $or: [{ _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }, { slug: req.params.id }] });
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const cat = await ShopCategory.create(req.body);
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const cat = await ShopCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const cat = await ShopCategory.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
