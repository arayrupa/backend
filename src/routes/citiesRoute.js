const express = require('express');
const { createCities, updateCities, listCitiess, deleteCities, updateStatus, getCities } = require('../controllers/citiesController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/user_actions/auth')
const router = express.Router()

router.route('/create-cities').post(isAuthenticatedUser, authorizeRoles(2), createCities) // Create
router.route('/cities/:id').put(isAuthenticatedUser, authorizeRoles(2), updateCities) // Update
router.route('/cities').post(isAuthenticatedUser, authorizeRoles(2), listCitiess) // List
router.route('/cities/:id').get(isAuthenticatedUser, authorizeRoles(2), getCities) // Get
router.route('/cities/:id/status').patch(isAuthenticatedUser, authorizeRoles(2), updateStatus); // Update Status
router.route('/cities/:id').delete(isAuthenticatedUser, authorizeRoles(2), deleteCities) // Delete

module.exports = router;