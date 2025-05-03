const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    func_category_id    : {
        type: Number,
    },
    func_category_name: {
        type: String
    },
    status: {
        type: Number,
        default: 1,
        enum:[0, 1]
    },
    page_name: {
        type: String
    },
    link_text: {
        type: String
    },
    fnc_icon: {
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

const FunctionCategory = mongoose.model('function_category', userSchema);

module.exports = { FunctionCategory }; 
