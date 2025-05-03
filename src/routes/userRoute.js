const express = require('express');
const { registerUser, loginUser,
     logoutUser, forgotPassword,linkActivate ,updatePassword, resetPassword,
    getUserDetails, updateProfile } = require('../controllers/userController');
const { isAuthenticatedUser } = require('../middlewares/user_actions/auth');
const { uploadProfile } = require('../middlewares/helpers/multer');
const { handleMulterError } = require('../middlewares/helpers/multer');
const router = express.Router();

router.route('/link-activate/:token/:expiry').get(linkActivate);
router.route('/logout').get(logoutUser);
router.route('/me').get(isAuthenticatedUser, getUserDetails);
router.route('/login').post(loginUser);
router.route('/register').post(registerUser);
router.route('/password/forgot').post(forgotPassword);
router.route('/password/reset/:token').put(resetPassword);
router.route('/password/update').put(isAuthenticatedUser, updatePassword);
// Route to update profile with file upload 
router.route('/me/update')
    .put(uploadProfile, isAuthenticatedUser, updateProfile, handleMulterError);

module.exports = router;