const cloudinary = require('../../config/cloudinary');

// Upload a single image → returns { url }
exports.uploadSingle = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const base64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'restaurant/shop',
      resource_type: 'image',
    });

    res.json({ success: true, url: result.secure_url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Upload multiple images (up to 5) → returns { urls: [] }
exports.uploadMultiple = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const uploads = await Promise.all(
      req.files.map((file) => {
        const base64 = Buffer.from(file.buffer).toString('base64');
        const dataURI = `data:${file.mimetype};base64,${base64}`;
        return cloudinary.uploader.upload(dataURI, {
          folder: 'restaurant/shop',
          resource_type: 'image',
        });
      })
    );

    res.json({ success: true, urls: uploads.map((r) => r.secure_url) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
