const express = require('express');
const { createSkill, updateSkill, listSkills, deleteSkill, updateStatus, getSkill } = require('../controllers/skillsController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/user_actions/auth')
const router = express.Router()

router.route('/create-skill').post(isAuthenticatedUser, authorizeRoles(2), createSkill) // Create
router.route('/update-skill/:id').put(isAuthenticatedUser, authorizeRoles(2), updateSkill) // Update
router.route('/skill-listings').post(isAuthenticatedUser, authorizeRoles(2), listSkills) // List
router.route('/skill/:id').get(isAuthenticatedUser, authorizeRoles(2), getSkill) // Get
router.route('/skill/:id/status').patch(isAuthenticatedUser, authorizeRoles(2), updateStatus); // Update Status
router.route('/delete-skill/:id').delete(isAuthenticatedUser, authorizeRoles(2), deleteSkill) // Delete

module.exports = router;