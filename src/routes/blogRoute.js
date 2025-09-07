const express = require("express");
const { create, deletePost, updatePost, getposts } = require("../controllers/blogController");
const { isAuthenticatedUser } = require("../middlewares/user_actions/auth");

const router = express.Router();

// Create Post
router.route("/create").post(isAuthenticatedUser, create);

// Get Posts
router.route("/getblogs").get(getposts);

// Delete Post
router.route("/deletepost/:postId/:userId").delete(isAuthenticatedUser, deletePost);

// Update Post
router.route("/updatepost/:postId/:userId").put(isAuthenticatedUser, updatePost);

module.exports = router;
