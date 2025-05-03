const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    industry_id      : {
        type: Number,
    },
    industry_name: {
        type: String
    },
    status: {
        type: Number,
        default: 1,
        enum:[0, 1]
    },
    ind_icons: {
        type: String
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

const IndustryMaster = mongoose.model('industry', userSchema);

module.exports = { IndustryMaster }; 
