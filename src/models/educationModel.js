const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    edu_id   : {
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
        type: String
    },
    updatedAt: {
        type: Date,
    },
    updatedBy:{
        type: String
    }
});

const Education = mongoose.model('education', userSchema);

module.exports = { Education }; 
