const mongoose = require('mongoose');
const Schema = mongoose.Schema

const citiesSchema = new mongoose.Schema({
    city_id  : {
        type: Number,
    },
    city_name: {
        type: String
    },
    state : {
        type: Schema.Types.ObjectId,
        ref: 'states',
    },
    status: {
        type: Number,
        default: 1,
        enum:[0, 1]
    },
    for_job: {
        type: Number,
        default: 0,
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

const Cities = mongoose.model('cities', citiesSchema);

module.exports = { Cities }; 
