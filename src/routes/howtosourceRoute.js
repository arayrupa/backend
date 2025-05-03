const express = require('express');
const { createhowToSource, updatehowToSource, listhowToSources, deletehowToSource, updateStatus, gethowToSource } = require('../controllers/howToSourceController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/user_actions/auth')
const { uploadHowToSource, handleMulterError } = require('../middlewares/helpers/multer');
const router = express.Router()

router.route('/create-howToSource')
    .post(uploadHowToSource, isAuthenticatedUser, authorizeRoles(2), createhowToSource, handleMulterError);
router.route('/update-howToSource/:id').put(uploadHowToSource, isAuthenticatedUser, authorizeRoles(2), updatehowToSource, handleMulterError) // Update
router.route('/howToSource-listings').post(isAuthenticatedUser, authorizeRoles(2), listhowToSources) // List
router.route('/howToSource/:id').get(isAuthenticatedUser, authorizeRoles(2), gethowToSource) // Get
router.route('/howToSource/:id/status').patch(isAuthenticatedUser, authorizeRoles(2), updateStatus); // Update Status
router.route('/delete-howToSource/:id').delete(isAuthenticatedUser, authorizeRoles(2), deletehowToSource) // Delete

module.exports = router;