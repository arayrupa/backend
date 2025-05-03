const mongoose = require('mongoose');
const Schema = mongoose.Schema

const statesSchema = new mongoose.Schema({
    state_id  : {
        type: Number,
    },
    state_name: {
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

const States = mongoose.model('states', statesSchema);

module.exports = { States }; 
