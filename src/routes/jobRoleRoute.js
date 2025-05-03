const express = require('express');
const { createJobRole, updateJobRole, listJobRoles, deleteJobRole, updateStatus, getJobRole } = require('../controllers/jobRoleController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/user_actions/auth')
const router = express.Router()

router.route('/job-role').post(isAuthenticatedUser, authorizeRoles(2), createJobRole) // Create
router.route('/job-role/:id').put(isAuthenticatedUser, authorizeRoles(2), updateJobRole) // Update
router.route('/job-roles').post(isAuthenticatedUser, authorizeRoles(2), listJobRoles) // List
router.route('/job-role/:id').get(isAuthenticatedUser, authorizeRoles(2), getJobRole) // Get
router.route('/job-role/:id/status').patch(isAuthenticatedUser, authorizeRoles(2), updateStatus); // Update Status
router.route('/job-role/:id').delete(isAuthenticatedUser, authorizeRoles(2), deleteJobRole) // Delete

module.exports = router;