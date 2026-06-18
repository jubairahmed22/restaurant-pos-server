const express  = require('express');
const router   = express.Router();
const upload   = require('../../middleware/upload');
const { getBlogs, createBlog, updateBlog, deleteBlog } = require('./blog.controller');

router.get('/',          getBlogs);
router.post('/',         upload.array('images', 10), createBlog);
router.put('/:id',       upload.array('images', 10), updateBlog);
router.delete('/:id',    deleteBlog);

module.exports = router;
