const mongoose = require('mongoose');
const Schema = mongoose.Schema

const userSchema = new mongoose.Schema({
    job_role_id : {
        type: Number,
    },
    name: {
        type: String
    },
    status: {
        type: Number,
        default: 1,
        enum:[0, 1]
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

const JobRole = mongoose.model('job_role', userSchema);

module.exports = { JobRole }; 
