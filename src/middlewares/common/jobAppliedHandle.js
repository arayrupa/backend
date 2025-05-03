const {JobApplied} = require("../../models/jobAppliedModel");
const {JobappliedStatusMaster} = require("../../models/jobappliedStatusMasterModel");

module.exports = async (req,res,user_id,job_id,job_incentive_id,interview_date,createdBy,message) => {   
   try {  
      const { _id: jobAppliedStatusId } = await JobappliedStatusMaster.findOne({ jobapplied_status_masterid: 1 }) || {};  
   
      // Check if the user has already applied for the job
      const existingApplication = await JobApplied.findOne({  
         user_id: user_id,  
         job_id: job_id,  
         createdBy: createdBy  
      });
   
      if (existingApplication) {  
         // Update the existing application  
         await JobApplied.updateOne(  
            { _id: existingApplication._id },  
            { $set: { user_id: user_id, createdBy: createdBy } }  
         );  
      } else {  
         // Create a new job application  
         await JobApplied.create({  
            user_id: user_id,  
            job_id: job_id,  
            job_app_id: "",  
            job_applied_status: jobAppliedStatusId,
            job_incentive_id: job_incentive_id,  
            interview_date: interview_date,  
            createdBy: createdBy  
         });  
      }  
   
      // Count total applications for the job with the given status  
      const totaljobApplied = await JobApplied.countDocuments({  
         job_id: job_id,  
         job_applied_status: jobAppliedStatusId  
      });
   
      return res.status(200).json({  
         success: true,  
         totaljobApplied: totaljobApplied,  
         message: message,
      });  
   } catch (error) {  
      return res.status(500).json({  
         success: false,  
         message: "An error occurred while applying for the job",  
         error: error.message  
      });  
   }
   
};