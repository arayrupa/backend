const sendEmail = require("./sendEmail");
const { User } = require("../models/userModel");

const sendToken = async (user, statusCode, res, req = null, type = null) => {
  const token = user.getJWTToken();

  // Cookie options
  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // Check if the user's status is inactive and send an activation email
  if (user.status === 0 && req) {
    const generateExpiryTime = () => {
      return Math.floor(Date.now() / 1000) + 1800; // Current timestamp + 30 minutes (1800 seconds)
    };
    const expiry = generateExpiryTime(); // Get expiry timestamp
    const activationLink = `${req.protocol}://${req.get("host")}/api/v1/link-activate/${token}/${expiry}`;
    console.log("activationLink", activationLink);
    const htmlData = `<p>Hello ${user.name},</p>
                </br></br>
                <p><strong>Welcome to SnapFind - Your Gateway to Freelance Success!</strong></p>
                <p>Congratulations on taking the first step towards endless opportunities! We are thrilled to welcome you to SnapFind, your gateway to a world of freelance success.</p>
                <p>To kick start your journey, simply click on the activation link below. It's time to unleash your potential and embark on a path filled with exciting opportunities.</p>
                <br>
                <a href='${activationLink}' target='_blank'>Activation Link</a>
                <br>
                <p>If you have any questions or need assistance, feel free to reach out to our support team at snap_hunters@snapfind.co.in. We're here to ensure your SnapFind experience is seamless and rewarding.</p>
                <p>Get ready to elevate your freelance career to new heights!</p>
                
                <br>
                <br>
                <p>Best regards, </p>
                <p>The SnapFind Team</p>`;

    const emailOptions = {
      email: user.email,
      subject: "Activate Your SnapFind Account Now!",
      html: htmlData,
      // <p>Hello ${user.name},</p>
      //   <p>Welcome to SnapFind - Your Gateway to Freelance Success!</p>
      //   <p>To activate your account and start your journey, click the link below:</p>
      //   <a href="${activationLink}">Activate Account</a>
      //   <p>If you have any questions or need assistance, feel free to reach out to our support team at snap_hunters@snapfind.co.in.</p>
      //   <p>Best regards,<br>The SnapFind Team</p>
    };

    try {
      await sendEmail(emailOptions);
    } catch (error) {
      console.error("Error sending activation email:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send activation email. Please try again later.",
      });
    }
    return res.status(400).json({
      success: false,
      message:
        type == "register"
          ? "Your Account Register Successfully. Please check your email to activate your SnapFind account."
          : "Your account is inactive. Please check your email to activate your SnapFind account.",
    });
  }

  // Update User details
  await User.findByIdAndUpdate(
    user.id,
    { login_count: user?.login_count + 1, updatedAt: Date.now() },
    {
      new: true,
      runValidators: true,
    }
  );
  // Send token and response
  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        user_type: user?.user_type,
        gender: user?.gender,
        mobile: user?.mobile,
        refer_code: user?.refer_code,
        loginDomain: user?.loginDomain,
        profile: user?.profile,
        status: user?.status,
        createdAt: user?.createdAt,
        avatar: user?.avatar,
      },
      token,
    });
};

module.exports = sendToken;
