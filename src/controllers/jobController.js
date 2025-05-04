const asyncErrorHandler = require("../middlewares/helpers/asyncErrorHandler");
const mongoose = require('mongoose');
const { Cities } = require("../models/citiesModel");
const { JobListing } = require("../models/jobListingModel");
const { JobRole } = require("../models/jobRoleMasterModel");
const { User } = require('../models/userModel');
const { SkillMst } = require("../models/skillMstModel");
const { States } = require("../models/statesModel");
const { IndustryMaster } = require("../models/industryMasterModel");
const { Education } = require("../models/educationModel");
const { FunctionCategory } = require("../models/functionCategoryModel");
const { CompanyDetails } = require("../models/companyDetailsModel");
const {formatDate} = require("../middlewares/helpers/formatDate");

// createJob api
exports.createJob = asyncErrorHandler(async (req, res, next) => {
  console.log("createJob API called");
  try {
    const requiredFields = [
      "companies", "job_role", "edu_id", "vacancy", "min_exp", "max_exp",
      "min_ctc", "max_ctc", "age", "notice_period", "industry_id", "mode_work",
      "func_category_id", "city_id", "skill",
      "job_desc"
    ];

    // Validate required fields
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(500).json({ message: `${missingFields.join(", ")} is required` });
    }

    // Fetch company details
    const companyData = await CompanyDetails.findById(req.body.companies);
    if (!companyData) {
      return res.status(500).json({ message: "Company not found" });
    }
    let resumeUrl = '';
    console.log("req.files", req.files); // Log the entire files object
    if(req.files && req.files.resume && req.files.resume.length > 0) {
      console.log("Resume file found");
      console.log("Resume file details:", req.files.resume[0]);
      resumeUrl = req.files.resume[0].path; // Use path instead of location
    }


    // Construct Job Data
    const jobData = {
      ...req.body,
      user_id:companyData.user_id,
      resume: resumeUrl,
      createdBy: req.user._id,
      city_id: req.body.city_id ? req.body.city_id.split(",") : [],
      skill: req.body.skill ? req.body.skill.split(",") : []
    };

    // Create job listing
    const job = await JobListing.create(jobData);

    return res.status(200).json({
      success: true,
      message: "Job created successfully",
      data: job
    });

  } catch (error) {
    console.error("Error creating job:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
});

exports.updateJob = asyncErrorHandler(async (req, res, next) => {
  console.log("updateJob API called");
  try {
    const { id } = req.params;
    const job = await JobListing.findById(id);
    if (!job) {
      return res.status(500).json({
        success: false,
        message: "Job not found"
      });
    }

    // Fetch company details
    const companyData = await CompanyDetails.findById(req.body.company);
    if (!companyData) {
      return res.status(500).json({ message: "Company not found" });
    }
   
    const jobData = {
      ...req.body,
      user_id: companyData.user_id,
      city_id: req.body.city_id ? req.body.city_id.split(",") : [],
      skill: req.body.skill ? req.body.skill.split(",") : []
    };
    // Upload files to S3 (if provided)
    const uploadFile = async (file, path) => file ? uploadToS3(file[0], path) : "";
    const [resumeUrl, audio1Url, audio2Url] = await Promise.all([
      uploadFile(req.files?.resume, "uploadedfiles"),
      uploadFile(req.files?.audio_1, "job_audio"),
      uploadFile(req.files?.audio_2, "job_audio")
    ]);
    jobData.resume = resumeUrl || job.resume;
    jobData.audio_1 = audio1Url || job.audio_1;
    jobData.audio_2 = audio2Url || job.audio_2;
    
    // Update job listing
    const updatedJob = await JobListing.findByIdAndUpdate(id, jobData, { new: true });
    
    // Delete cached job listings from Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys("jobs-page-admin-*");
        if (keys.length > 0) {
          await Promise.all(keys.map(key => redisClient.del(key)));
          console.log("Deleted cached jobs list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }
    if(req.body.whatappSend){
      // await jobUpdatesendWhatsApp(user.mobile, user.name);
    }
    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob
    });
  } catch (error) {
    console.error("Error updating job:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
});   

// AdminJobListing api
exports.AdminJobListing = asyncErrorHandler(async (req, res, next) => {
  console.log("AdminJobListing API called");
  try {
    const { mode_work, company, industry, jobRole, cities, rpa, min_salary, max_salary, trending, search, page=1, member_id, limit = 10 } = req.body.params;
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    let matchStage = {}
    // if (req?.user?.user_type == 1) {
    //   matchStage = {}
    // } else {
    //   const assignedUser = await UserManagement.find({ user_id: req.user._id })
    //     .select('assign_user_id')
    //     .populate({ path: 'assign_user_id', select: '_id' })
    //   matchStage = assignedUser.length > 0 ? { member_id: { $in: assignedUser.map(user => mongoose.Types.ObjectId(user.assign_user_id._id.toString())) } } : {  }
    // }
    const parsedMinSalary = parseFloat(min_salary);
    const parsedMaxSalary = parseFloat(max_salary);
 
    // Filters
    const filters = [
      mode_work &&  { "mode_work": { $eq: mode_work } },
      company && { "companyDetails._id": { $in: company.split(',').map(id => mongoose.Types.ObjectId(id.trim())) } },
      industry && { "industry_id": { $in: industry.split(',').map(id => mongoose.Types.ObjectId(id.trim())) } },
      jobRole && { "job_role": { $in: jobRole.split(',').map(id => mongoose.Types.ObjectId(id.trim())) } },
      cities && { "city_id": { $in: cities.split(',').map(id => id.trim()) } },
      trending && { "job_type": { $eq: parseFloat(trending) } },
      min_salary && { "min_ctc": { $gte: parsedMinSalary } },
      max_salary && { "max_ctc": { $lte: parsedMaxSalary } },
      member_id && { "member_id": { $in: member_id.split(',').map(id => mongoose.Types.ObjectId(id.trim())) } },
      rpa && { "jobIncentivesData.retention": { $in: rpa.split(',').map(id => id.trim()) } },
      search && {
        $or: [
          { "companyDetails.company_name": { $regex: search, $options: "i" } }, // Case-insensitive search in company name
          { "jobRoleData.name": { $regex: search, $options: "i" } } // Case-insensitive search in job title
        ]
      },
    ].filter(Boolean);

    // Common Aggregation Pipeline
    const basePipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "job_roles",
          localField: "job_role",
          foreignField: "_id",
          as: "jobRoleData",
        }
      },
      {
        $lookup: {
          from: "company_details",
          localField: "user_id",
          foreignField: "user_id",
          as: "companyDetails",
        }
      },
      {
        $addFields: {
          jobDetails: { $arrayElemAt: ["$jobRoleData", 0] },
          companyDetails: { $arrayElemAt: ["$companyDetails", 0] },
        }
      },
      ...filters.map(filter => ({ $match: filter })),
    ];
    // Fetch paginated candidate list
    const jobListRaw = await JobListing.aggregate([
      ...basePipeline,
      { $sort: { _id: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
    // let jobList = [];
    const jobList = await Promise.all(
      jobListRaw
        .map(async job => {
          const member = job.member_id 
            ? await User.findById(job.member_id) 
            : null;
          const job_role = job.job_role 
            ? await JobRole.findById(job.job_role) 
            : null;
          const industry = job.industry_id   
            ? await IndustryMaster.findById(job.industry_id) 
            : null;
          const education = job.edu_id   
            ? await Education.findById(job.edu_id) 
            : null;
          const func_category = job.func_category_id   
            ? await FunctionCategory.findById(job.func_category_id) 
            : null;
          return {
            _id: job._id,
            company_name: job?.companyDetails?.company_name || '',
            company_logo: job?.companyDetails?.logo || '',
            company_id: job?.companyDetails?._id || '',
            jobIncentivesData: job?.jobIncentivesData || '',
            retention: job?.jobIncentivesData?.retention ? job?.jobIncentivesData?.retention : "",
            hirring_amount: job?.jobIncentivesData?.amount ? job?.jobIncentivesData?.amount?.toString() : '',
            job_role: job_role? {label: job_role?.name, value: job_role?._id} : '',
            title: job_role? {label: job_role?.name, value: job_role?._id} : '',
            status: job.status === 0 ? 'Inactive' : job.status === 1 ? 'Active' : 'Deleted or Expired',
            hunter_status: job.hunter_status == 0 ? 'Inactive' : 'Active',
            job_type: job.job_type == 0 ? 'Default' : job.job_type == 1 ? 'Trending' : 'Hot',
            position_close: job.position_close == 0 ? 'Open' : 'Closed',
            cities: job.city_id
              ? (await Cities.find({ _id: { $in: job.city_id } }))
              .map(city => ({ label: city.city_name, value: city._id }))
              : [],
            skill: job.skill
              ? (await SkillMst.find({ _id: { $in: job.skill } }))
              .map(skill => ({ label: skill.name, value: skill._id }))
              : [],
            member: member 
              ? { label: member.name, value: member._id }
              : '',
            min_exp: job.min_exp?.toString() || '',
            max_exp: job.max_exp?.toString() || '',
            vacancy: job.vacancy || '',
            min_ctc: job.min_ctc?.toString() || '',
            max_ctc: job.max_ctc?.toString() || '',
            member_id: job.member_id?.toString() || '',
            job_desc: job.job_desc || '',
            mode_work: job.mode_work || '',
            industry_id: industry ? {label: industry.industry_name, value: industry._id} : '',
            education: education ? {label: education.name, value: education._id} : '',
            func_category: func_category ? {label: func_category.func_category_name, value: func_category._id} : '',
            age: job.age || '',
            notice_period: job.notice_period || '',
            resume: job.resume || '',
            audio_1: job.audio_1 || '',
            audio_2: job.audio_2 || '',
            expired_date: formatDate(job.expired_date) || '',
            createdAt: formatDate(job.createdAt) || '',
            updatedAt: formatDate(job.updatedAt) || '',
            createdBy: (await User.findById(job.createdBy))?.name,
          };
        })
    );
    const totalJobs = await JobListing.aggregate([
      ...basePipeline,
      { $count: "totalJobs" }
    ]);
    const totalJobsCount = totalJobs[0]?.totalJobs || 0;

    // **Prepare Cache Data**
    const cacheData = {
      jobList: { count: jobList.length, jobList: jobList },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalJobsCount / limit),
        totalItems: totalJobsCount,
        itemsPerPage: limit
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Job List successfully fetched',
      ...cacheData
    });
  } catch (error) {
    console.error("Error in jobListing:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error in fetching job listings.",
      error: error.message || error,
    });
  }
});

// jobDetails api
exports.jobDetails = asyncErrorHandler(async (req, res, next) => {
  console.log("jobDetails API called")
  try {
    const { id } = req?.body?.params;
    if (!id) {
      return res.status(500).json({
        success: false,
        message: "Job ID is required.",
      });
    }

    const jobListRaw = await JobListing.findById(id).lean();
    if (!jobListRaw) {
      return res.status(500).json({
        success: false,
        message: "Job not found.",
      });
    }

    const companyDetails = await CompanyDetails.findOne({ user_id: jobListRaw.user_id }).lean();

    const [jobRole, state, cities, skills, member, industry, education, funcCategory, createdBy] = await Promise.all([
      JobRole.findById(jobListRaw.job_role).lean(),
      States.findById(jobListRaw.state_id).lean(),
      jobListRaw.city_id ? Cities.find({ _id: { $in: jobListRaw.city_id } }).lean() : [],
      jobListRaw.skill ? SkillMst.find({ _id: { $in: jobListRaw.skill } }).lean() : [],
      User.findById(jobListRaw.member_id).lean(),
      IndustryMaster.findById(jobListRaw.industry_id).lean(),
      Education.findById(jobListRaw.edu_id).lean(),
      FunctionCategory.findById(jobListRaw.func_category_id).lean(),
      User.findById(jobListRaw.createdBy).lean(),
    ]);

    const jobDetails = {
      _id: jobListRaw._id,
      company_name: companyDetails?.company_name || "",
      company_logo: companyDetails?.logo || "",
      company_address: companyDetails?.address || "",
      company_website: companyDetails?.website || "",
      job_no: jobListRaw.job_no || "",
      job_role: jobRole?.name || "",
      title: jobRole?.name || "",
      job_desc: jobListRaw?.job_desc || "",
      status: jobListRaw.status === 0 ? "Inactive" : jobListRaw.status === 1 ? "Active" : "Deleted or Expired",
      hunter_status: jobListRaw.hunter_status == 0 ? "Inactive" : "Active",
      job_type: jobListRaw.job_type == 0 ? "Default" : jobListRaw.job_type == 1 ? "Trending" : "Hot",
      position_close: jobListRaw.position_close == 0 ? "Open" : "Closed",
      state: state?.state_name || "",
      cities: cities.map((city) => ({ label: city.city_name, value: city._id })) || [],
      skill: skills.map((skill) => ({ label: skill.name, value: skill._id })) || [],
      member: member?.name || "",
      min_exp: jobListRaw.min_exp?.toString() || "",
      max_exp: jobListRaw.max_exp?.toString() || "",
      vacancy: jobListRaw.vacancy || "",
      min_ctc: jobListRaw.min_ctc?.toString() || "",
      max_ctc: jobListRaw.max_ctc?.toString() || "",
      mode_work: jobListRaw.mode_work || "",
      industry_id: industry?.industry_name || "",
      education: education?.name || "",
      func_category: funcCategory?.func_category_name || "",
      age: jobListRaw.age || "",
      notice_period: jobListRaw.notice_period || "",
      resume: jobListRaw.resume || "",
      expired_date: jobListRaw.expired_date || "",
      createdAt: jobListRaw.createdAt || "",
      updatedAt: jobListRaw.updatedAt || "",
      createdBy: createdBy?.name || "",
    };

    return res.status(200).json({
      success: true,
      message: "Job Details successfully fetched",
      data: jobDetails,
    });
  } catch (error) {
    console.error("Error in jobDetails:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error in fetching job details.",
      error: error.message || error,
    });
  }
});

//jobFilters api
exports.jobFilters = asyncErrorHandler(async (req, res, next) => {
  console.log("jobFilters API called");
  try {
    // Build query object
    let matchStage = {}
    if (req.user.user_type == 5) {
      matchStage = {
        status: 1,
        hunter_status: 1,
      };
    } else if (req.user.user_type == 1) {
      matchStage = {}
    } else {
      const assignedUser = await UserManagement.find({ user_id: req.user._id })
      .select('assign_user_id')
      .populate({ path: 'assign_user_id', select: '_id' })
      matchStage = assignedUser.length > 0 ? { member_id: { $in: assignedUser.map(user => mongoose.Types.ObjectId(user.assign_user_id._id.toString())) } } : {  }
    }
    // Fetch dropdown data
    const [companyList, industriesList, jobRolesList, statesList, citiesList, rpaList, genderList, skillsList, functionsList, educationList, JobappliedStatusList, myTeamsListJob] = await Promise.all([
      (async () => {
        const companyIds = await JobListing.distinct('user_id', { ...matchStage, user_id: { $ne: null } });
        const companies = await CompanyDetails.find({ user_id: { $in: companyIds } }).sort({ company_name: 1 }).lean();
        return companies.map(company => ({ value: company._id, label: company.company_name, user_id: company.user_id }));
      })(),
      (async () => {
        const industryIds = await JobListing.distinct('industry_id', { ...matchStage, industry_id: { $ne: null } });
        const industries = await IndustryMaster.find({ _id: { $in: industryIds }, status: 1 }).sort({ industry_name: 1 }).lean();
        return industries.map(industry => ({ value: industry._id, label: industry.industry_name }));
      })(),
      (async () => {
        const jobRoleIds = await JobListing.distinct('job_role', { ...matchStage, job_role: { $ne: null } });
        const jobRoles = await JobRole.find({ _id: { $in: jobRoleIds }, status: 1 }).sort({ name: 1 }).lean();
        return jobRoles.map(jobRole => ({ value: jobRole._id, label: jobRole.name }));
      })(),
      (async () => {
        const stateIds = await JobListing.distinct('state_id', { ...matchStage, state_id: { $ne: null } });
        const states = await States.find({ _id: { $in: stateIds }, status: 1 }).sort({ state_name: 1 }).lean();
        return states.map(state => ({ value: state._id, label: state.state_name }));
      })(),
      (async () => {
        const citiesIds = await JobListing.aggregate([
          { $match: { ...matchStage } },
          { $unwind: "$city_id" },  // Flatten city_id array
          { $match: { city_id: { $ne: null } } },  // Exclude null values
          { $group: { _id: "$city_id" } }  // Get distinct city IDs
        ]);
        const cityObjectIds = citiesIds.map(city => city._id);
        const citiesList = await Cities.find({ _id: { $in: cityObjectIds } }).sort({ city_name: 1 }).lean();
        return citiesList.map(city => ({ value: city._id, label: city.city_name }));
      })(),
      (async () => {
        const jobIncentiveIds = await JobListing.distinct('job_incentive_id', { ...matchStage, job_incentive_id: { $ne: null } });
        const rpas = await JobIncentives.find({ _id: { $in: jobIncentiveIds }, inc_type: 3, status: 1, retention: { $ne: 0 } }).sort({ retention: 1 }).lean();
        return rpas.map(rpa => ({ value: rpa?.retention, label: rpa?.retention + ` Days` }));
      })(),
      [{ value: 1, label: 'Male' }, { value: 2, label: 'Female' }, { value: 3, label: 'Other' }],
      (async () => {
        const skillIds = await JobListing.aggregate([
          { $match: { ...matchStage } },
          { $unwind: "$skill" },  // Flatten skill array
          { $match: { skill: { $ne: null } } },  // Exclude null values
          { $group: { _id: "$skill" } }  // Get distinct skill IDs
        ]);
        const skillObjectIds = skillIds.map(skill => skill._id);
        const skillsList = await SkillMst.find({ _id: { $in: skillObjectIds }, status: 1 }).sort({ name: 1 }).lean();
        return skillsList.map(skill => ({ value: skill._id, label: skill.name }));
      })(),
      (async () => {
        const funCategoryIds = await JobListing.distinct('func_category_id', { ...matchStage, func_category_id: { $ne: null } });
        const funCategorys = await FunctionCategory.find({ _id: { $in: funCategoryIds }, status: 1 }).sort({ func_category_name: 1 }).lean();
        return funCategorys.map(funcategory => ({ value: funcategory?._id, label: funcategory?.func_category_name }));
      })(),
      (async () => {
        const educationIds = await JobListing.distinct('edu_id', { ...matchStage, edu_id: { $ne: null } });
        const educations = await Education.find({ _id: { $in: educationIds }, status: 1 }).sort({ name: 1 }).lean();
        return educations.map(education => ({ value: education?._id, label: education?.name }));
      })(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'jobFilters fetched successfully',
      data: {
        company: { count: companyList.length, companyList },
        industry: { count: industriesList.length, industryList: industriesList },
        job_Role: { count: jobRolesList.length, job_RoleList: jobRolesList },
        state: { count: statesList.length, statesList },
        cities: { count: citiesList.length, citiesList },
        rpa: { count: rpaList.length, rpaList },
        gender: { count: genderList.length, genderList },
        skills: { count: skillsList.length, skillsList },
        functions: { count: functionsList.length, functionsList },
        education: { count: educationList.length, educationList },
      },
    });
  } catch (error) {
    console.error("Error in candidateFilters:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error in fetching job listings.",
      error: error.message || error,
    });
  }
});

//jobFilters api
exports.masterFilters = asyncErrorHandler(async (req, res, next) => {
  console.log("masterFilters API called");
  try {
    // Fetch dropdown data
    const [companyList, industriesList, jobRolesList, statesList, citiesList, genderList, skillsList, functionsList, educationList, workModeList] = await Promise.all([
      CompanyDetails.find({ status: 1 }).sort({ company_name: 1 }).then(companies =>
        companies.map(company => ({ value: company._id, label: company.company_name }))
      ),
      IndustryMaster.find({ status: 1 }).sort({ industry_name: 1 }).then(industries =>
        industries.map(industry => ({ value: industry._id, label: industry.industry_name }))
      ),
      JobRole.find({ status: 1 }).sort({ name: 1 }).then(jobRoles =>
        jobRoles.map(jobRole => ({ value: jobRole._id, label: jobRole.name }))
      ),
      States.find({ status: 1 }).sort({ state_name: 1 }).then(states =>
        states.map(state => ({ value: state._id, label: state.state_name }))
      ),
      Cities.find({ status: 1 }).sort({ city_name: 1 }).then(cities =>
        cities.map(city => ({ value: city._id, label: city.city_name }))
      ),
      [{ value: 1, label: 'Male' }, { value: 2, label: 'Female' }, { value: 3, label: 'Other' }],
      SkillMst.find({ status: 1 }).sort({ name: 1 }).then(skills =>
        skills.map(skill => ({ value: skill._id, label: skill.name }))
      ),
      FunctionCategory.find({ status: 1 }).sort({ func_category_name: 1 }).then(functions =>
        functions.map(functions => ({ value: functions._id, label: functions.func_category_name }))
      ),
      Education.find({ status: 1 }).sort({ name: 1 }).then(education =>
        education.map(education => ({ value: education._id, label: education.name }))
      ),
      [{ value: 'onsite', label: 'OnSite' }, { value: 'wfh', label: 'WFH' }, { value: 'hybrid', label: 'Hybrid' }],
    ]);

    return res.status(200).json({
      success: true,
      message: 'masterFilters fetched successfully',
      data: {
        companies: { count: companyList.length, companyList },
        industries: { count: industriesList.length, industryList: industriesList },
        job_roles: { count: jobRolesList.length, job_RoleList: jobRolesList },
        state: { count: statesList.length, statesList },
        cities: { count: citiesList.length, citiesList },
        gender: { count: genderList.length, genderList },
        skills: { count: skillsList.length, skillsList },
        func_categories: { count: functionsList.length, functionsList },
        educations: { count: educationList.length, educationList },
        work_mode: { count: workModeList.length, workModeList },
      },
    });
  } catch (error) {
    console.error("Error in jobListing:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error in fetching job listings.",
      error: error.message || error,
    });
  }
});

exports.categoryFilters = asyncErrorHandler(async (req, res, next) => {
  console.log("categoryFilters API called");

  try {
    // Fetch all active industries
    const industries = await IndustryMaster.find({ status: 1 }).sort({ industry_name: 1 });

    // Map each industry to its formatted structure with vacancy count
    const industryList = await Promise.all(
      industries.map(async (industry) => {
        const vacancies = await JobListing.countDocuments({
          industry_id: industry._id,
          status: 1,
        });

        return {
          value: industry._id,
          label: industry.industry_name,
          vacancies,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'categoryFilters fetched successfully',
      data: {
        industries: {
          count: industryList.length,
          industryList,
        },
      },
    });
  } catch (error) {
    console.error("Error in categoryFilters:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error in fetching job listings.",
      error: error.message || error,
    });
  }
});


