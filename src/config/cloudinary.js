const cloudinary = require('cloudinary').v2;
// Add this line below to load the .env file
require('dotenv').config(); 

cloudinary.config({
  // Now process.env will actually contain your values
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;