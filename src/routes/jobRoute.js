const express = require('express');
const { jobDetails, jobFilters, masterFilters, createJob, updateJob, AdminJobListing } = require('../controllers/jobController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/user_actions/auth');
const router = express.Router();
const { uploadJob } = require('../middlewares/helpers/multer');
const { handleMulterError } = require('../middlewares/helpers/multer');

router.route('/job_details').post(isAuthenticatedUser, authorizeRoles(5,2,1), jobDetails)
router.route('/job_filters').get(isAuthenticatedUser, authorizeRoles(5,2,1), jobFilters)
router.route('/master_filters').get(isAuthenticatedUser, authorizeRoles(5,2,1), masterFilters)

// Admin create jobs
router.route('/create-job')
    .post(uploadJob, isAuthenticatedUser, authorizeRoles(2,1), createJob, handleMulterError)
router.route('/update-job/:id')
    .put(uploadJob, isAuthenticatedUser, authorizeRoles(2,1), updateJob, handleMulterError)
router.route('/admin_job_listing').post(isAuthenticatedUser, authorizeRoles(1,2), AdminJobListing)
module.exports = router;