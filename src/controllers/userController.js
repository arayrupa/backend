const mongoose = require('mongoose');
const asyncErrorHandler = require("../middlewares/helpers/asyncErrorHandler");
const sendToken = require("../utils/sendToken");
const sendEmail = require("../utils/sendEmail");
const sendWhatsAppMessage = require("../utils/sendWhatsAppMessage");
const jwt = require("jsonwebtoken"); 
const crypto = require('crypto');
const { User } = require('../models/userModel');
const { States } = require('../models/statesModel');
const { Cities } = require('../models/citiesModel');
const { WorkingAs } = require('../models/workingAsModel');
const { IndustryMaster } = require('../models/industryMasterModel');
const { EarnAmount } = require('../models/earnAmountModel');
const { HrUsed } = require('../models/hrUsedModel');
const { FunctionCategory } = require('../models/functionCategoryModel');

// Register User
exports.registerUser = asyncErrorHandler(async (req, res, next) => {
  console.log("Register API called")
  const { name, email, password, mobile, refer_code } = req.body;

  // Validate input fields
  if (!name || !email || !password || !mobile) {
    return res.status(400).json({
      success: false,
      message: "All fields are required.",
    });
  }
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({
        success: false,
        message: "User already exists with this email.",
      });
    }
    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      // password_has: password,
      mobile,
      refer_code,
      // avatar: {
      //   public_id: "default_avatar",
      //   url: "",
      // },
    });
    // Send token response
    sendToken(user, 200, res, req, 'register');
  } catch (error) {
    console.log("error", error)
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(500).json({
        success: false,
        message: "Duplicate entry detected. Email already exists.",
      });
    }
    // General server error response
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later.",
    });
  }
});

// linkActivate User
exports.linkActivate = asyncErrorHandler(async (req, res, next) => {
  console.log("linkActivate API called with token:")
  try {
    // Verify the token (assuming it's a JWT token)
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const expiry = req.params.expiry
    const currentTime = Math.floor(Date.now() / 1000);

    if (currentTime > expiry) {
      return res.status(400).json({ message: "Activation link expired." });
    }
    // Find the user by ID (decoded from the token)
    const user = await User.findById(decoded.id).select("+status");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or invalid activation link.",
      });
    }

    if (user.status === 1) {
      return res.status(400).json({
        success: false,
        message: "Account is already activated.",
      });
    }

    // Activate the user's account
    user.status = 1;
    await user.save();
    const htmlData = `<p><strong>Hello ${user.name},</strong></p>
                </br></br>
                <p>Welcome to <b>SnapFind</b>, where opportunities meet earnings! We are delighted to have you on board, and we can't wait to see you thrive in the world of freelance success.</p>
                
                <p><strong>The Power of Earnings:</strong></p>

                <p>Do you know, the average income of freelance recruiters across India is INR 20 lakh per annum and 23% of them make over INR 40 lakh per annum? According to recent studies, freelancers are making a significant income, and you too can be a part of this success story!</p>
                <p><strong>Your Earning Potential with SnapFind:</strong></p>

                <p>SnapFind is not just a platform; it's your ticket to unlocking similar success. With a seamless process and a supportive community, you can earn substantial amounts by referring candidates for job opportunities.</p>
                
                <p><strong>How It Works - Step by Step:</strong></p>
                <ol>
                <li><a href='https://snapfinds.co.in/login.php'><strong>Login</strong></a> from your created credentials and explore the opportunities on our dashboard</li>
                <li>Check the job requirements and criteria shared by different companies on your dashboard</li>
                <li>Refer candidates with the matching job criteria on the dashboard (<em>In The Add New Candidate Button</em>)</li>
                <li>Get daily updates and feedback on your referred candidates</li>
                <li>Once the candidate gets selected or hired by the company then get your hiring commissions in your bank accounts</li>
                </ol>
                
                <p><strong>Watch How It Works:</strong> For a detailed guide, check out our step-by-step video <a href='https://www.youtube.com/watch?v=4bkaUpX27Dg'>here</a></p>
                
                <p><strong>Join Our Community:</strong> Connect with thousands of freelancers like yourself in our professional WhatsApp and Telegram groups. Share tips, seek advice, and celebrate success together!</p>
                <p>🔗 <a href='https://chat.whatsapp.com/L3nZtGhqSOMIiXQsjBj2u8'>WhatsApp Group Link</a></p>
                <p>🔗 <a href='https://t.me/snapfind'>Telegram Group Link</a></p>

                <p>Your journey to freelance success starts now! If you have any questions or need assistance, feel free to reach out to our support team at snap_hunters@snapfind.co.in.</p>

                <p>Let's embark on this exciting journey together! </p>

                <br>
                <br>
                <p>Best regards, </p>
                <p>The SnapFind Team</p>`;
    const emailOptions = {
      email: user.email,
      subject: "Welcome to SnapFind - Unlock Your Freelance Earnings!",
      html: htmlData,
    };
    await sendEmail(emailOptions);
    await sendWhatsAppMessage(user.mobile, user.name);
    return res.redirect(`${req.protocol}://${process.env.HOST}/login`);
  } catch (error) {
    console.error("Error in linkActivate:", error.message);

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired activation link.",
      });
    }

    res.status(500).json({
      success: false,
      message: "An error occurred while activating the account.",
    });
  }
});

// Login User
exports.loginUser = asyncErrorHandler(async (req, res, next) => {
  console.log("login API called");
  const { email, password, user_type } = req.body;

  // Check if email and password are provided
  if (!email || !password || !user_type) {
    return res.status(400).json({
      success: false,
      message: "Please enter both email and password.",
    });
  }

  // Find user by email
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  if (user_type != user?.user_type) {
    return res.status(400).json({
      success: false,
      message: "Invalid User Type for that email",
    });
  }

  // Check if the password matches
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return res.status(400).json({
      success: false,
      message: "Invalid email or password.",
    });
  }
  sendToken(user, 200, res, req, 'login');
});

// Logout User
exports.logoutUser = asyncErrorHandler(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged Out",
  });
});

// Forgot Password
exports.forgotPassword = asyncErrorHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User not found",
    });
  }

  // Generate reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Construct the password reset URL
  const resetPasswordUrl = `${req.protocol}://${process.env.HOST}/change-password/${resetToken}`;
  const emailOptions = {
    email: user.email,
    subject: "SnapFind Password Reset - Create Your New Password",
    html: `
        <p>Hello ${user.name},</p>
        <p>We received a request to reset your SnapFind password. To reset your password, click the link below:</p>
        <a href="${resetPasswordUrl}">Reset Password link</a>
        <p>If you didn’t request this, please ignore this email.</p>
        <p>For assistance, contact us at support@snapfind.co.in.</p>
        <p>Best regards,<br>The SnapFind Team</p>
      `,
  };

  try {
    // Send the email
    await sendEmail(emailOptions);

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    console.error("Email sending error:", error);

    // Reset the token if email fails
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(400).json({
      success: false,
      message: "Could not send email. Please try again later.",
    });
  }
});

// Reset Password
exports.resetPassword = asyncErrorHandler(async (req, res, next) => {
  const { password } = req.body
  // create hash token
  const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid reset password token",
    });
  }
  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Please Enter Your Password",
    });
  }
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();
  sendToken(user, 200, res);
});

// Update Password
exports.updatePassword = asyncErrorHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");
  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
  if (!isPasswordMatched) {
    return res.status(400).json({
      success: false,
      message: "Old Password is Invalid.",
    });
  }

  user.password = req.body.newPassword;
  console.log("user", req.body.newPassword)
  await user.save();
  sendToken(user, 200, res);
});

// Get User Details
exports.getUserDetails = asyncErrorHandler(async (req, res, next) => {
  console.log("getUserDetails API called");
  try {
    // Fetch user details
    const userData = await User.findById(req.user.id);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Fetch associated thDetails
    const thDetails = await ThDetails.findOne({ user_id: req.user.id });
    const statesData = await States.findOne({ _id: userData?.state });
    const citiesData = await Cities.findOne({ _id: userData?.city });
    const workingAsData = await WorkingAs.findOne({ _id: thDetails?.working_as });
    const candidateSourceData = await CandidateSource.find({ _id: { $in: thDetails?.candidate_source || [] } });
    const earnAmountData = await EarnAmount.findOne({ _id: thDetails?.earn_amount });
    const hrUsedData = await HrUsed.findOne({ _id: thDetails?.hr_used });
    const functionCategoryData = await FunctionCategory.find({ _id: { $in: thDetails?.func_category_id || [] } });
    const industryData = await IndustryMaster.find({ _id: { $in: thDetails?.industry_id || [] } });
    const memberData = await User.findOne({ _id: thDetails?.member_id });

    // Map arrays to label and ID pairs
    const candidateSources = candidateSourceData.map(item => ({ label: item.name, id: item._id }));
    const funcCategories = functionCategoryData.map(item => ({ label: item.func_category_name, id: item.id }));
    const industries = industryData.map(item => ({ label: item.industry_name, id: item.id }));

    // Prepare response data
    const user = {
      id: userData?.id,
      name: userData?.name || '',
      email: userData?.email || '',
      mobile: userData?.mobile || '',
      state: userData?.state ? { label: statesData?.state_name, id: statesData?.id } : '',
      city: userData?.city ? { label: citiesData?.city_name, id: citiesData?.id } : '',
      refer_code: userData?.refer_code || '',
      loginDomain: userData?.loginDomain,
      uid: userData?.uid || '',
      profile: userData?.profile || '',
      currentRole: thDetails?.working_as ? { label: workingAsData?.name, id: workingAsData?.id } : '',
      bank_details: [{
        account_holder_name: thDetails?.bank_details.length > 0 ? thDetails?.bank_details[0]?.account_holder_name : '',
        bank_name: thDetails?.bank_details.length > 0 ? thDetails?.bank_details[0]?.bank_name : '',
        account_number: thDetails?.bank_details.length > 0 ? thDetails?.bank_details[0]?.account_number : '',
        ifsc_code: thDetails?.bank_details.length > 0 ? thDetails?.bank_details[0]?.ifsc_code : '',
        account_type: thDetails?.bank_details.length > 0 ? thDetails?.bank_details[0]?.account_type == 1 ? { label: 'Savings', id: 1 } : { label: 'Current', id: 2 } : '',
        branch: thDetails?.bank_details.length > 0 ? thDetails?.bank_details[0]?.branch : '',
      }],
      address: thDetails?.address || '',
      pincode: thDetails?.pincode || '',
      adhaar_card: thDetails?.adhaar_card || '',
      industry_id: industries,
      candidate_source: candidateSources,
      earn_amount: thDetails?.earn_amount ? { label: earnAmountData?.name, id: earnAmountData?.id } : '',
      hr_used: thDetails?.hr_used ? { label: hrUsedData?.name, id: hrUsedData?.id } : '',
      whatsapp_no: thDetails?.whatsapp_no || '',
      whatsapp_status: thDetails?.whatsapp_status || '',
      func_category_id: funcCategories,
      badge_status: thDetails?.badge_status,
      member_id: thDetails?.member_id ? { label: memberData?.name, id: memberData?.id } : '',
      current_status: thDetails?.current_status || '',
    };

    // Send success response
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    // Log the error and send a response
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user details',
      error: error.message,
    });
  }
});

// Update User Profile 
exports.updateProfile = asyncErrorHandler(async (req, res, next) => {
  try {
    const candidateSource = JSON.parse(req.body.candidate_source) || [];
    const funcCategory = JSON.parse(req.body.func_category_id) || [];
    const industry = JSON.parse(req.body.industry_id) || [];

    // Check if the provided ID exists in the database
    const existingEntry = await User.findById(req.user.id);
    if (!existingEntry) {
      return res.status(500).json({
        success: false,
        message: "User ID not found",
      });
    }

    // **Upload Files to S3 (if provided)** 
    const fileUploads = {
      profile: req.file ? uploadToS3(req.file, "hunter_profile_image") : Promise.resolve(""),
    }
    const [profileUrl] = await Promise.all([fileUploads.profile])

    // Prepare the new user data
    const newUserData = {
      name: req.body.name,
      mobile: req.body.mobile,
      state: req.body.state,
      city: req.body.city,
      profile: profileUrl ? profileUrl : existingEntry?.profile,
    };

    // Prepare the new ThDetails data
    const newThDetailsData = {
      whatsapp_no: req.body.whatsapp_no,
      industry_id: industry.length > 0 ? industry : [],
      working_as: req.body.working_as,
      candidate_source: candidateSource.length > 0 ? candidateSource : [],
      func_category_id: funcCategory.length > 0 ? funcCategory : [],
      earn_amount: req.body.earn_amount,
      hr_used: req.body.hr_used,
      bank_details: [{
        account_holder_name: req.body.account_holder_name,
        bank_name: req.body.bank_name,
        account_number: req.body.account_number,
        ifsc_code: req.body.ifsc_code,
        account_type: req.body.account_type,
        branch: req.body.branch,
      }],
      user_id: req.user.id,
    };

    // Update User details
    await User.findByIdAndUpdate(
      req.user.id,
      newUserData,
      { new: true, runValidators: true }
    );

    // Update or create ThDetails
    const thDetailsData = await ThDetails.findOne({ user_id: req.user.id });
    if (!thDetailsData) {
      await ThDetails.create(newThDetailsData);
    } else {
      await ThDetails.findByIdAndUpdate(
        thDetailsData._id,
        newThDetailsData,
        { new: true, runValidators: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error updating your profile.",
      error: error.message || error,
    });
  }
});