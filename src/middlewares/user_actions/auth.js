const jwt = require('jsonwebtoken');
const { User } = require('../../models/userModel');
const mongoose = require('mongoose');

const asyncErrorHandler = require('../helpers/asyncErrorHandler');

exports.isAuthenticatedUser = asyncErrorHandler(async (req, res, next) => {
    // const { token } = req.cookies;
    const token  = req.headers.authorization;
    // console.log("cookies",req.headers.cookies)
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Please Login to Access.",
        });
    }
    try {
        const decodedData = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        const userId = decodedData.id;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid User ID in the token.",
            });
        }

        req.user = await User.findById(userId);
        if (!req.user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
});

exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {

        if (!roles.includes(req.user.user_type)) {
            return res.status(403).json({
                success: false,
                message: `Role: ${req.user.user_type == 1 ? "superadmin" : req.user.user_type == 2 ? "admin" : req.user.user_type == 3 ? "company" : req.user.user_type == 4 ? "candidate" : "hunters"} is not allowed`,
              });
        }
        next();
    }
}