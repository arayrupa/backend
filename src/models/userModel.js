const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Schema = mongoose.Schema

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: [true, "Please Enter Your Name"],
    },
    email: {
        type: String,
        trim: true,
        // required: [true, "Please Enter Your Email"],
        // unique: true,
    },
    user_id: {
        type: String
    },
    password: {
        type: String,
        // required: [true, "Please Enter Your Password"],
        // minLength: [8, "Password should have atleast 8 chars"],
        select: false,
    },
    mobile: {
        type: String,
        trim: true,
        // required: [true, "Please Enter Mobile"],
    },
    state: {
        type: Schema.Types.ObjectId,
        ref: 'states',
    }, 
    city: {
        type: Schema.Types.ObjectId,
        ref: 'cities',
    },
    refer_code: {
        type: String
    },
    uid: {
        type: Number
    },
    login_count : {
        type: Number,
        default: 0
    },
    profile: {
        type: String,
    },
    user_type: {
        type: Number,
        enum: [ 1,2,3,4, 5],
        default: 5 // 1:superadmin,2:admin,3:company,4:candidate,5:hunters	  
    },
    role_id: {
        type: Schema.Types.ObjectId,
        ref: 'User_roles',
    },
    loginDomain: {
        type: String,
        default: "system",
        enum:['system', 'facebook', 'google']
    },
    status: {
        type: Number,
        default: 0,
        enum:[0, 1, 2] //0:inactive,1:active,2:deleted
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy:{
        type: Schema.Types.ObjectId,
        ref: 'User', // Refers to 'users' model
    },
    updatedAt: {
        type: Date,
    },
    updatedBy:{
        type: Schema.Types.ObjectId,
        ref: 'User', // Refers to 'users' model
    }
});

userSchema.pre("save", async function (next) {

    if (!this.isModified("password")) {
        next();
    }

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.getJWTToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
}

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

userSchema.methods.getResetPasswordToken = function () {
    // Generate a token
    const resetToken = crypto.randomBytes(20).toString('hex');
  
    // Hash the token and set it to `resetPasswordToken` field
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
    // Set the expiration time for the reset token
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes
  
    return resetToken;
  };
  
const User = mongoose.model('User', userSchema);

module.exports = { User }; // or module.exports = User;
