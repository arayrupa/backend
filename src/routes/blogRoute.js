const express = require('express');
const {
  createBlogs,
  updateBlogs,
  listBlogs,
  getBlogs,
  updateStatus,
  deleteBlogs,
} = require('../controllers/blogController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/user_actions/auth');

const router = express.Router();

// Create Blog
router.route('/create-blogs').post(isAuthenticatedUser, authorizeRoles(1), createBlogs);

// Update Blog
router.route('/blogs/:id').put(isAuthenticatedUser, authorizeRoles(2), updateBlogs);

// List Blogs (public access)
router.route('/blogs').post(listBlogs);
router.route('/blog/list').get(listBlogs);

// Get Blog by ID (public access)
router.route('/blogs/:id').get(getBlogs);

// Update Status of Blog
router.route('/blogs/:id/status').patch(isAuthenticatedUser, authorizeRoles(2), updateStatus);

// Delete Blog
router.route('/blogs/:id').delete(isAuthenticatedUser, authorizeRoles(2), deleteBlogs);

module.exports = router;
