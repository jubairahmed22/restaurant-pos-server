const Food = require('./food.model');
const cloudinary = require('../../config/cloudinary');

exports.getFoods = async (req, res, next) => {
  try {
    const { category, tag, search, minPrice, maxPrice, page = 1, limit = 9 } = req.query;
    let query = {};

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (search) query.title = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skipIdx = (Number(page) - 1) * Number(limit);
    const total = await Food.countDocuments(query);
    const foods = await Food.find(query)
      .populate('category')
      .populate('tags')
      .skip(skipIdx)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
      data: foods
    });
  } catch (error) {
    next(error);
  }
};

exports.getFoodBySlug = async (req, res, next) => {
  try {
    const food = await Food.findOne({ slug: req.params.slug }).populate('category').populate('tags');
    if (!food) return res.status(404).json({ success: false, error: 'Food item not found' });
    res.status(200).json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

exports.createFood = async (req, res, next) => {
  try {
    let imageUrl = 'https://placehold.co/600x400?text=Food';
    if (req.file) {
      const base64Image = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;
      const uploadRes = await cloudinary.uploader.upload(dataURI, { folder: 'restaurant/foods' });
      imageUrl = uploadRes.secure_url;
    }

    const foodData = { ...req.body, image: imageUrl };
    if (typeof foodData.tags === 'string') foodData.tags = JSON.parse(foodData.tags || '[]');

    const food = await Food.create(foodData);
    res.status(201).json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

exports.deleteFood = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ success: false, error: 'Food items not found' });
    await food.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};