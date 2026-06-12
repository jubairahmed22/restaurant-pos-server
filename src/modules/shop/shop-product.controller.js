const ShopProduct = require('./shop-product.model');

const SORT_MAP = {
  newest:    { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc:{ price: -1 },
  name_asc:  { title: 1 },
};

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, category, minPrice, maxPrice, featured, sort = 'newest' } = req.query;
    const filter = { isActive: true };

    if (search)   filter.title    = { $regex: search, $options: 'i' };
    if (category) filter.category = category;
    if (featured === 'true') filter.isFeatured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const sortObj = SORT_MAP[sort] || SORT_MAP.newest;
    const skip = (Number(page) - 1) * Number(limit);

    const [data, total] = await Promise.all([
      ShopProduct.find(filter).populate('category', 'name slug').sort(sortObj).skip(skip).limit(Number(limit)),
      ShopProduct.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const isObjectId = /^[a-f\d]{24}$/i.test(req.params.id);
    const product = await ShopProduct.findOne(
      isObjectId ? { _id: req.params.id } : { slug: req.params.id }
    ).populate('category', 'name slug');
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const product = await ShopProduct.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    const product = await ShopProduct.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('category', 'name slug');
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const product = await ShopProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.toggleFeatured = async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    product.isFeatured = !product.isFeatured;
    await product.save();
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.bulkDiscount = async (req, res) => {
  try {
    const { productIds, discountType, discountValue, discountEndDate } = req.body;
    if (!productIds?.length) return res.status(400).json({ success: false, error: 'No products selected' });

    await ShopProduct.updateMany(
      { _id: { $in: productIds } },
      { $set: { discountType, discountValue: Number(discountValue), discountEndDate: discountEndDate || null } }
    );

    res.json({ success: true, message: `Updated ${productIds.length} products` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, featured } = req.query;
    const filter = {};
    if (search)   filter.title    = { $regex: search, $options: 'i' };
    if (category) filter.category = category;
    if (featured === 'true') filter.isFeatured = true;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      ShopProduct.find(filter).populate('category', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ShopProduct.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
