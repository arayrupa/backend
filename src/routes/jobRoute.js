const express = require('express');
const { jobDetails, jobFilters, masterFilters, categoryFilters, createJob, updateJob, AdminJobListing, activeInactiveJob, jobDropDown } = require('../controllers/jobController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/user_actions/auth');
const router = express.Router();
const { uploadResume } = require('../middlewares/helpers/multer');
const { handleMulterError } = require('../middlewares/helpers/multer');

router.route('/job_details').post(jobDetails)
router.route('/job_filters').get(isAuthenticatedUser, authorizeRoles(5,2,1), jobFilters)
router.route('/master_filters').get(isAuthenticatedUser, authorizeRoles(5,2,1), masterFilters)
router.route('/category_filters').get(categoryFilters)

// Admin create jobs
router.route('/create-job')
    .post(uploadResume, isAuthenticatedUser, authorizeRoles(2,1), createJob, handleMulterError)
router.route('/update-job/:id')
    .put(uploadResume, isAuthenticatedUser, authorizeRoles(2,1), updateJob, handleMulterError)
router.route('/admin_job_listing').post(AdminJobListing)
router.route('/active-inactive-job/:id').post(isAuthenticatedUser, authorizeRoles(2,1), activeInactiveJob)
router.route('/job_dropdown').post(jobDropDown) // List
module.exports = router;