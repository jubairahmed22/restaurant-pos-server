// backend/src/modules/foods/food.controller.js

const Food = require('./food.model');
const cloudinary = require('../../config/cloudinary');

exports.getFoods = async (req, res, next) => {
  try {
    const {
      category,
      tag,
      search,
      minPrice,
      maxPrice,
      isFeatured,
      page = 1,
      limit = 30,
    } = req.query;

    let query = {};

    if (category) query.category = category;
    if (tag) query.tags = tag;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (typeof isFeatured !== 'undefined') {
      query.isFeatured = isFeatured === 'true';
    }

    if (minPrice || maxPrice) {
      query.price = {};

      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const currentPage = Number(page);
    const currentLimit = Number(limit);

    const skipIdx = (currentPage - 1) * currentLimit;

    const total = await Food.countDocuments(query);

    const foods = await Food.find(query)
      .populate('category')
      .populate('tags')
      .skip(skipIdx)
      .limit(currentLimit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      pagination: {
        total,
        page: currentPage,
        limit: currentLimit,
        pages: Math.ceil(total / currentLimit),
      },
      data: foods,
    });
  } catch (error) {
    next(error);
  }
};

exports.getFoodBySlug = async (req, res, next) => {
  try {
    const food = await Food.findOne({
      slug: req.params.slug,
    })
      .populate('category')
      .populate('tags');

    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Food item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: food,
    });
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

      const uploadRes = await cloudinary.uploader.upload(dataURI, {
        folder: 'restaurant/foods',
      });

      imageUrl = uploadRes.secure_url;
    }

    const foodData = {
      ...req.body,
      image: imageUrl,
    };

    if (typeof foodData.tags === 'string') {
      foodData.tags = JSON.parse(foodData.tags || '[]');
    }

    const food = await Food.create(foodData);

    res.status(201).json({
      success: true,
      data: food,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFood = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Food item not found',
      });
    }

    let imageUrl = food.image;

    if (req.file) {
      const base64Image = Buffer.from(req.file.buffer).toString('base64');

      const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

      const uploadRes = await cloudinary.uploader.upload(dataURI, {
        folder: 'restaurant/foods',
      });

      imageUrl = uploadRes.secure_url;
    }

    const updateData = {
      ...req.body,
      image: imageUrl,
    };

    if (typeof updateData.tags === 'string') {
      updateData.tags = JSON.parse(updateData.tags || '[]');
    }

    if (updateData.title) {
      updateData.slug = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    const updatedFood = await Food.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: updatedFood,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteFood = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Food items not found',
      });
    }

    await food.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};