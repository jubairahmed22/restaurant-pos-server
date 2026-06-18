const Blog      = require('./blog.model');
const cloudinary = require('../../config/cloudinary');

async function uploadToCloudinary(file) {
  const b64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(b64, { folder: 'blogs', resource_type: 'image' });
  return result.secure_url;
}

exports.getBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (err) { next(err); }
};

exports.createBlog = async (req, res, next) => {
  try {
    const { title, paragraph, videoLink } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

    const images = req.files && req.files.length > 0
      ? await Promise.all(req.files.map(uploadToCloudinary))
      : [];

    const blog = await Blog.create({ title, paragraph: paragraph || '', images, videoLink: videoLink || '' });
    res.status(201).json({ success: true, data: blog });
  } catch (err) { next(err); }
};

exports.updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, error: 'Blog not found' });

    const { title, paragraph, videoLink, existingImages } = req.body;

    // Keep existing images that the client didn't remove
    let images = existingImages
      ? (Array.isArray(existingImages) ? existingImages : [existingImages])
      : [];

    // Upload any newly attached images
    if (req.files && req.files.length > 0) {
      const newUrls = await Promise.all(req.files.map(uploadToCloudinary));
      images = [...images, ...newUrls];
    }

    if (title)                           blog.title     = title;
    if (typeof paragraph  !== 'undefined') blog.paragraph = paragraph;
    if (typeof videoLink  !== 'undefined') blog.videoLink = videoLink;
    blog.images = images;

    await blog.save();
    res.json({ success: true, data: blog });
  } catch (err) { next(err); }
};

exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, error: 'Blog not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};
