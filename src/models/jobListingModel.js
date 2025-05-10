const mongoose = require('mongoose');
const Schema = mongoose.Schema

const userSchema = new mongoose.Schema({
    job_id: {
        type: Number,
    },
    user_id : {
        type: Schema.Types.ObjectId,
        ref: 'User',  //company id	
    },
    job_role: {
        type: Schema.Types.ObjectId,
        ref: 'job_role',
    },
    job_desc: {
        type: String
    },
    audio_1: {
        type: String
    },
    audio_2: {
        type: String
    },
    status: {
        type: Number,
        default: 1,
        enum:[0, 1,2] 	//0:inactive,1:active,2:delete or expire
    },
    hunter_status: {
        type: Number,
        default: 0,
        enum:[0, 1] 	//0:Inactive,1:active
    },
    job_type: {
        type: Number,
        default: 0,
        enum:[0, 1,2,3] 	//0:default,1:trending,2:hot'	
    },
    position_close : {
        type: Number,
        default: 0,
        enum:[0, 1] 	//0:open,1:close
    },
    city_id: {
        type:  Array,
        ref: 'cities',
    },
    skill: {
        type:  Array,
        ref: 'skill_mst',
    },
    state_id: {
        type: Schema.Types.ObjectId,
        ref: 'states',
    },
    member_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    job_incentive_id: {
        type: Schema.Types.ObjectId,
        ref: 'job_incentive',
    },
    min_exp: {
        type: mongoose.Schema.Types.Decimal128,
    },
    max_exp: {
        type: mongoose.Schema.Types.Decimal128,
    },
    vacancy: {
        type: Number,
    },
    min_ctc: {
        type: mongoose.Schema.Types.Decimal128,
    },
    max_ctc: {
        type: mongoose.Schema.Types.Decimal128,
    },
    mode_work: {
        type: String,
        default: 'onsite',
        enum:['onsite', 'wfh', 'hybrid']
    },
    industry_id: {
        type: Schema.Types.ObjectId,
        ref: 'industry',
    }, 
    edu_id: {
        type: Schema.Types.ObjectId,
        ref: 'education',
    }, 
    func_category_id: {
        type: Schema.Types.ObjectId,
        ref: 'function_category',
    }, 
    age: {
        type: Number,
    }, 
    notice_period: {
        type: Number,
    }, 
    resume: {
        type: String
    },
    applied_url: {
        type: String
    },
    job_no: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy:{
        type: Schema.Types.ObjectId,
        ref: 'User', // Refers to 'users' model
    },
    expired_date: {
        type: Date,
        default: () => new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    },
    updatedAt: {
        type: Date,
    },
    updatedBy:{
        type: Schema.Types.ObjectId,
        ref: 'User', // Refers to 'users' model
    }
}); 

const JobListing = mongoose.model('job_listing', userSchema);

module.exports = { JobListing };  
