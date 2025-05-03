const express = require('express');
const { createCompany, updateCompany, listCompanys, deleteCompany, updateStatus, getCompany, filtersCompany } = require('../controllers/companyController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/user_actions/auth')
const { uploadCompanyLogo, handleMulterError } = require('../middlewares/helpers/multer');
const router = express.Router()

router.route('/create-company')
    .post(uploadCompanyLogo, isAuthenticatedUser, authorizeRoles(2), createCompany, handleMulterError) // Create
router.route('/update-company/:id').put(uploadCompanyLogo, isAuthenticatedUser, authorizeRoles(2), updateCompany, handleMulterError) // Update
router.route('/company-listings').post(isAuthenticatedUser, authorizeRoles(2), listCompanys) // List
router.route('/company/:id').get(isAuthenticatedUser, authorizeRoles(2), getCompany) // Get
router.route('/company/:id/status').patch(isAuthenticatedUser, authorizeRoles(2), updateStatus); // Update Status
router.route('/delete-company/:id').delete(isAuthenticatedUser, authorizeRoles(2), deleteCompany) // Delete
router.route('/filters-company').get(isAuthenticatedUser, authorizeRoles(2), filtersCompany) // Filters

module.exports = router;