const Tag = require('./tag.model');

exports.getTags = async (req, res, next) => {
  try {
    const tags = await Tag.find();
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
};

exports.createTag = async (req, res, next) => {
  try {
    const tag = await Tag.create(req.body);
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    next(error);
  }
};