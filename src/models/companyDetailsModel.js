const mongoose = require('mongoose');
const Schema = mongoose.Schema 
 
const userSchema = new mongoose.Schema({
    cdetail_id  : {
        type: Number,
    },
    user_id : {
        type: Schema.Types.ObjectId,
        ref: 'User', // Refers to 'users' model
    },
    company_name: {
        type: String
    },
    address: {
        type: String
    },
    logo: {
        type: String
    },
    website: {
        type: String
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Refers to 'users' model
    },   
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
    },
    updatedBy:{
        type: Schema.Types.ObjectId,
        ref: 'User', // Refers to 'users' model
    }
});

const CompanyDetails = mongoose.model('company_details', userSchema);

module.exports = { CompanyDetails }; 
