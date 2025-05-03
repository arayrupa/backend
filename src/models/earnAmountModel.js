const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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

const EarnAmount = mongoose.model('earn_amount', userSchema);

module.exports = { EarnAmount }; 
