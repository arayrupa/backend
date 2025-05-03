const mongoose = require('mongoose')
const { JobappliedStatusMaster } = require('../models/jobappliedStatusMasterModel');
const { User } = require('../models/userModel');
const { ThDetails } = require('../models/thDetailsModel');
const { HunterStatusRemark } = require('../models/hunterStatusRemarkModel');
const { JobApplied } = require('../models/jobAppliedModel');
const { States } = require('../models/statesModel');
const { Cities } = require('../models/citiesModel');
const { IndustryMaster } = require('../models/industryMasterModel');
const { CandidateSource } = require('../models/candidateSourceModel');
const { HrUsed } = require('../models/hrUsedModel');
const { HunterStatusMaster } = require('../models/hunterStatusMasterModel');
const { FunctionCategory } = require('../models/functionCategoryModel');
const { DownloadedFile } = require('../models/DownloadedFileModel');
const { EarnAmount } = require('../models/earnAmountModel');
const { WorkingAs } = require('../models/workingAsModel');
const { SkillMst } = require('../models/skillMstModel');
const { ChatList } = require('../models/chatListModel');
const { CandidateStatusRemark } = require("../models/candidateStatusRemarkModel");
const { JobRole } = require("../models/jobRoleMasterModel");
const { Education } = require("../models/educationModel");
const moment = require('moment');
const { formatDate } = require("../middlewares/helpers/formatDate")
const ExcelJS = require('exceljs')
const { uploadToS3 } = require("../middlewares/helpers/uploadToS3");

const exportHuntersToExcel = async (jobData) => {
  console.log("exportHuntersToExcel API called")
  try {
    const { body, user } = jobData.data;
    const {
      state, city, industry_id, candidate_source, hr_used, func_category_id,
      created_from, created_to, status, current_status, search, member_id, lastDayContacted, lastDayLogin
    } = body;
    const joined = await JobappliedStatusMaster.findOne({ jobapplied_status_masterid: 12 }).lean();
    const shortlist = await JobappliedStatusMaster.findOne({ jobapplied_status_masterid: 3 }).lean();
    const query = { user_type: 5 };

    // Search Filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } }
      ];
    }

    // State & City Filters
    if (state) query.state = { $in: state.split(',').map(id => mongoose.Types.ObjectId(id.trim())) };
    if (city) query.city = { $in: city.split(',').map(id => mongoose.Types.ObjectId(id.trim())) };

    // ThDetails Filter
    const thDetailsQuery = {};
    if (industry_id) thDetailsQuery.industry_id = { $in: industry_id.split(',').map(id => id.trim()) };
    if (candidate_source) thDetailsQuery.candidate_source = { $in: candidate_source.split(',').map(id => id.trim()) };
    if (hr_used) thDetailsQuery.hr_used = { $in: hr_used.split(',').map(id => id.trim()) };
    if (func_category_id) thDetailsQuery.func_category_id = { $in: func_category_id.split(',').map(id => id.trim()) };
    if (current_status) thDetailsQuery.current_status = { $in: current_status.split(',').map(id => id.trim()) };
    if (member_id) thDetailsQuery.member_id = { $in: member_id.split(',').map(id => mongoose.Types.ObjectId(id.trim())) };
    if (lastDayContacted) {
      const days = parseInt(lastDayContacted, 10);  // Convert to integer

      const toDate = new Date();  // Today
      toDate.setHours(23, 59, 59, 999);  // End of the day

      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - days);  // Go back 'days' from today
      fromDate.setHours(0, 0, 0, 0);  // Start of the day

      const fromContacted = `${fromDate.toISOString().split('T')[0]}T00:00:00.000Z`;
      const toContacted = `${toDate.toISOString().split('T')[0]}T23:59:59.999Z`;

      const lastDayContactData = await HunterStatusRemark.find({
        createdAt: { $gte: fromContacted, $lte: toContacted }
      })
        .select('hunter_id remark createdAt')
        .lean();
      thDetailsQuery.user_id = { $in: lastDayContactData.map(data => data.hunter_id) };
    }
    if (lastDayLogin) {
      const days = parseInt(lastDayLogin, 10);  // Convert to integer

      const toDate = new Date();  // Today
      toDate.setHours(23, 59, 59, 999);  // End of the day

      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - days);  // Go back 'days' from today
      fromDate.setHours(0, 0, 0, 0);  // Start of the day

      const fromLogin = `${fromDate.toISOString().split('T')[0]}T00:00:00.000Z`;
      const toLogin = `${toDate.toISOString().split('T')[0]}T23:59:59.999Z`;

      const lastDayLoginData = await JobApplied.find({
        createdAt: { $gte: fromLogin, $lte: toLogin }
      })
        .select('createdBy createdAt')
        .lean();

      thDetailsQuery.user_id = { $in: lastDayLoginData.map(data => data.createdBy) };
    }
    // Date Range Filter
    if (created_from || created_to) {
      query.createdAt = {};
      if (created_from) query.createdAt.$gte = new Date(created_from.split("/").reverse().join("-") + "T00:00:00.000Z");
      if (created_to) query.createdAt.$lte = new Date(created_to.split("/").reverse().join("-") + "T23:59:59.999Z");
    }

    if (status) query.status = { $in: status.split(',').map(id => Number(id.trim())) };

    // Fetch ThDetails User IDs in Parallel
    const [beginnerUsers, learnerUsers, hustlerUsers, runnerUsers, sniperUsers] = await Promise.all([
      ThDetails.find({ ...thDetailsQuery, badge_status: 1 }).select('user_id').lean(),
      ThDetails.find({ ...thDetailsQuery, badge_status: 2 }).select('user_id').lean(),
      ThDetails.find({ ...thDetailsQuery, badge_status: 3 }).select('user_id').lean(),
      ThDetails.find({ ...thDetailsQuery, badge_status: 4 }).select('user_id').lean(),
      ThDetails.find({ ...thDetailsQuery, badge_status: 5 }).select('user_id').lean()
    ]);

    const beginnerIds = beginnerUsers.map(detail => detail.user_id);
    const learnerIds = learnerUsers.map(detail => detail.user_id);
    const hustlerIds = hustlerUsers.map(detail => detail.user_id);
    const runnerIds = runnerUsers.map(detail => detail.user_id);
    const sniperIds = sniperUsers.map(detail => detail.user_id);

    // Build Queries for Beginners & Learners
    const queryBeginner = beginnerIds.length ? { ...query, _id: { $in: beginnerIds } } : null;
    const queryLearner = learnerIds.length ? { ...query, _id: { $in: learnerIds } } : null;
    const queryHustler = hustlerIds.length ? { ...query, _id: { $in: hustlerIds } } : null;
    const queryRunner = runnerIds.length ? { ...query, _id: { $in: runnerIds } } : null;
    const querySniper = sniperIds.length ? { ...query, _id: { $in: sniperIds } } : null;

    // Fetch Users and Counts in Parallel
    const [beginnerData, learnerData, hustlerData, runnerData, sniperData] = await Promise.all([
      queryBeginner ? User.find(queryBeginner)
        .populate({ path: 'createdBy', select: 'name email' })
        .populate({ path: 'updatedBy', select: 'name email' })
        .populate({ path: 'state', select: 'state_name', model: States })
        .populate({ path: 'city', select: 'city_name', model: Cities })
        .sort({ createdAt: -1 })
        .lean() : [],

      queryLearner ? User.find(queryLearner)
        .populate({ path: 'createdBy', select: 'name email' })
        .populate({ path: 'updatedBy', select: 'name email' })
        .populate({ path: 'state', select: 'state_name', model: States })
        .populate({ path: 'city', select: 'city_name', model: Cities })
        .sort({ createdAt: -1 })
        .lean() : [],

      queryHustler ? User.find(queryHustler)
        .populate({ path: 'createdBy', select: 'name email' })
        .populate({ path: 'updatedBy', select: 'name email' })
        .populate({ path: 'state', select: 'state_name', model: States })
        .populate({ path: 'city', select: 'city_name', model: Cities })
        .sort({ createdAt: -1 })
        .lean() : [],

      queryRunner ? User.find(queryRunner)
        .populate({ path: 'createdBy', select: 'name email' })
        .populate({ path: 'updatedBy', select: 'name email' })
        .populate({ path: 'state', select: 'state_name', model: States })
        .populate({ path: 'city', select: 'city_name', model: Cities })
        .sort({ createdAt: -1 })
        .lean() : [],

      querySniper ? User.find(querySniper)
        .populate({ path: 'createdBy', select: 'name email' })
        .populate({ path: 'updatedBy', select: 'name email' })
        .populate({ path: 'state', select: 'state_name', model: States })
        .populate({ path: 'city', select: 'city_name', model: Cities })
        .sort({ createdAt: -1 })
        .lean() : [],
    ]);

    // Fetch ThDetails and Candidate Stats in Parallel
    const userIds = [
      ...beginnerData.map(user => user._id),
      ...learnerData.map(user => user._id),
      ...hustlerData.map(user => user._id),
      ...runnerData.map(user => user._id),
      ...sniperData.map(user => user._id)
    ];

    const [thDetails, candidateStats, hunterRemarks] = await Promise.all([
      ThDetails.find({ user_id: { $in: userIds } })
        .select('user_id whatsapp_no whatsapp_status bank_details badge_status address pincode adhaar_card member_id')
        .populate({ path: 'working_as', select: 'name', model: WorkingAs })
        .populate({ path: 'industry_id', select: 'industry_name', model: IndustryMaster })
        .populate({ path: 'candidate_source', select: 'name', model: CandidateSource })
        .populate({ path: 'hr_used', select: 'name', model: HrUsed })
        .populate({ path: 'earn_amount', select: 'name', model: EarnAmount })
        .populate({ path: 'func_category_id', select: 'func_category_name', model: FunctionCategory })
        .populate({ path: 'current_status', select: 'name', model: HunterStatusMaster })
        .populate({ path: 'member_id', select: 'name', model: User })
        .lean(),

      User.aggregate([
        {
          $match: { user_type: 4, createdBy: { $in: userIds } }
        },
        {
          $lookup: {
            from: "job_applieds",
            localField: "_id",
            foreignField: "user_id",
            as: "jobApplied"
          }
        },
        {
          $addFields: {
            shortlistedCount: {
              $size: {
                $filter: {
                  input: "$jobApplied",
                  as: "app",
                  cond: {
                    $eq: ["$$app.job_applied_status", mongoose.Types.ObjectId(shortlist?._id || '')]
                  }
                }
              }
            },
            hiredCount: {
              $size: {
                $filter: {
                  input: "$jobApplied",
                  as: "app",
                  cond: {
                    $eq: ["$$app.job_applied_status", mongoose.Types.ObjectId(joined?._id || '')]
                  }
                }
              }
            },
            latestApplicationDate: {    // Renamed for better clarity
              $max: "$jobApplied.createdAt"
            }
          }
        },
        {
          $group: {
            _id: "$createdBy",
            candidateCount: { $sum: 1 },
            latestApplicationDate: { $max: "$latestApplicationDate" },
            shortlistedCount: { $sum: "$shortlistedCount" },
            hiredCount: { $sum: "$hiredCount" }
          }
        }
      ]),

      // Fetch hunter remarks for all users in parallel
      HunterStatusRemark.find({ hunter_id: { $in: userIds } })
        .select('hunter_id remark createdAt')
        .lean()
    ]);

    // Map remarks by hunter ID for quick lookup
    const remarksMap = hunterRemarks.reduce((acc, remark) => {
      const id = remark.hunter_id.toString();
      // Format the createdAt field
      remark.createdAt = formatDate(remark.createdAt);
      if (!acc[id]) acc[id] = [];
      acc[id].push(remark);
      return acc;
    }, {});

    const statsMap = candidateStats.reduce((acc, stat) => {
      acc[stat._id] = stat;
      return acc;
    }, {});


    // Prepare Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Hunters');

    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Address', key: 'address', width: 20 },
      { header: 'Profile', key: 'profile', width: 20 },
      { header: 'Login Domain', key: 'loginDomain', width: 20 },
      { header: 'Badge', key: 'badge', width: 12 },
      { header: 'Adhaar Card', key: 'adhaar_card', width: 20 },
      { header: 'Industry', key: 'industry', width: 20 },
      { header: 'Candidate Source', key: 'candidate_source', width: 20 },
      { header: 'HR Used', key: 'hr_used', width: 20 },
      { header: 'Earn Amount', key: 'earn_amount', width: 20 },
      { header: 'Working As', key: 'working_as', width: 20 },
      { header: 'Whatsapp Status', key: 'whatsapp_status', width: 20 },
      { header: 'Function Category', key: 'func_category_id', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 30 },
      { header: 'Member', key: 'member_id', width: 20 },
      { header: 'Current Status', key: 'current_status', width: 20 },
      { header: 'Bank Details', key: 'bank_details', width: 20 },
      { header: 'Candidate Count', key: 'candidateCount', width: 20 },
      { header: 'Hired Count', key: 'hiredCount', width: 20 },
      { header: 'Shortlisted Count', key: 'shortlistedCount', width: 20 },
      { header: 'Last Applied', key: 'lastApplied', width: 20 },
      { header: 'Last Days', key: 'last_days', width: 20 },
      { header: 'Last Contacted', key: 'lastContacted', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 }
    ];

    // Format Final Response
    const formatUsers = (users) => users.map(user => {
      const details = thDetails.find(th => th.user_id.toString() === user._id.toString()) || {};
      const stats = statsMap[user._id.toString()] || {}
      const remarks = remarksMap[user._id.toString()] || [];
      const lastContacted = remarks[remarks.length - 1]?.createdAt || null;
      const badgeMap = {
        1: "Beginner",
        2: "Learner",
        3: "Hustler",
        4: "Runner",
        5: "Sniper"
      };

      worksheet.addRow({
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        state: user.state?.state_name || '',
        city: user.city?.city_name || '',
        address: details.address || '',
        profile: user.profile || '',
        loginDomain: user.loginDomain || '',
        badge: badgeMap[details.badge_status] || "Unknown",
        adhaar_card: details.adhaar_card || '',
        industry: details.industry_id?.map(industry => industry.industry_name).join(', ') || '',
        candidate_source: details.candidate_source?.map(source => source.name).join(', ') || '',
        hr_used: details.hr_used?.name || '',
        earn_amount: details.earn_amount?.name || '',
        working_as: details.working_as?.name || '',
        whatsapp_status: details.whatsapp_status || '',
        func_category_id: details.func_category_id?.map(category => category.func_category_name).join(', ') || '',
        remarks: remarks?.map(r => `${r.remark} (${r.createdAt})`).join('\n'),
        member_id: details.member_id?.name || '',
        current_status: details.current_status?.name || '',
        bank_details: details.bank_details?.map(bank => `${bank.account_holder_name} - ${bank.bank_name} - ${bank.account_number}`).join(', ') || '',
        candidateCount: stats.candidateCount || 0,
        shortlistedCount: stats.shortlistedCount || 0,
        hiredCount: stats.hiredCount || 0,
        lastApplied: stats.latestApplicationDate ? moment(stats.latestApplicationDate).format('DD-MM-YYYY') : null,
        last_days: stats.latestApplicationDate ? moment(stats.latestApplicationDate).fromNow() : null,
        lastContacted: lastContacted,
        createdAt: new Date(user.createdAt).toLocaleString(),
        updatedAt: new Date(user.updatedAt).toLocaleString()
      });

    });

    formatUsers(beginnerData)
    formatUsers(learnerData)
    formatUsers(hustlerData)
    formatUsers(runnerData)
    formatUsers(sniperData)

    // Save the workbook to a buffer (instead of a file)
    workbook.xlsx.writeBuffer()
      .then(async (buffer) => {
        // **Upload Files to S3 (if provided)** 
        const fileName = `Hunters_${Date.now()}.xlsx`
        const fileUploads = {
          uploadfile: buffer ? uploadToS3(buffer, "uploadedfiles", { ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName: fileName }) : Promise.resolve(""),
        }
        const [fileUrl] = await Promise.all([fileUploads.uploadfile])
        if (fileUrl) {
          // const emailOptions = {
          //   email: user.email,
          //   subject: "SnapFind: Your Hunters Excel File is Available for Download",
          //   html: `<html>
          //         <body>
          //           <p>Your Hunters Excel file is now ready for download. Please find the link below:</p>
          //           <p>File URL: <a href="${fileUrl}" target="_blank">${fileUrl}</a></p>
          //           <p>Thank you for using our service!</p>
          //           <p>Best regards,<br>SnapFind Team</p>
          //         </body>
          //       </html>`,
          // };
          // await sendEmail(emailOptions);
          await DownloadedFile.create({
            fileUrl: fileUrl,
            originalFileName: fileName,
            type: jobData.type,
            downloadedBy: user._id
          })
        }
      })
      .catch((error) => {
        console.error("Error creating Excel file:", error);
      });
  } catch (error) {
    console.error("Error streaming Excel file:", error);
  }
};

const exportAdminVpListingToExcel = async (jobData) => {
  console.log("exportAdminVpListingToExcel API called")
  try {
    const { body, user } = jobData.data;
    const { state, city, gender, candidate_job_role_id, industry_id, func_category_id, min_salary, max_salary, 
      exp_from, exp_to, age_from, age_to, from_date, to_date, job_applied_status_id, company_id,
      job_role_id, job_id, search, hunter_search } = body;
    // Match Stage
    const createdAt = {};
    if (from_date) {
      createdAt.$gte = new Date(from_date.split("/").reverse().join("-") + "T00:00:00.000Z");
    }
    if (to_date) {
      createdAt.$lte = new Date(to_date.split("/").reverse().join("-") + "T23:59:59.999Z");
    }
    
    const matchStage = {
      status: 1,
      ...(job_id && { job_id: new mongoose.Types.ObjectId(job_id.trim()) }),
      ...(Object.keys(createdAt).length > 0 && { createdAt }),
      ...(job_applied_status_id && {
        job_applied_status: {
          $in: job_applied_status_id.split(",").map(id => new mongoose.Types.ObjectId(id.trim()))
        }
      }),
    }

    // Filters
    const filters = [
      state && { "candidateData.state": { $in: state.split(",").map(id => new mongoose.Types.ObjectId(id.trim())) } },
      city && { "candidateData.city": { $in: city.split(",").map(id => new mongoose.Types.ObjectId(id.trim())) } },
      gender && {"candidateDetails.gender" : parseInt(gender) },
      candidate_job_role_id && {"candidateDetails.job_role_id" : { $in: candidate_job_role_id.split(",").map(id => new mongoose.Types.ObjectId(id.trim())) } },
      industry_id && {"candidateDetails.industry_id" : { $in: industry_id.split(",").map(id => new mongoose.Types.ObjectId(id.trim())) } },
      func_category_id && {"candidateDetails.func_category_id" : { $in: func_category_id.split(",").map(id => new mongoose.Types.ObjectId(id.trim())) } },
      min_salary && { "jobDetails.min_ctc": { $gte: parseFloat(min_salary) } },
      max_salary && { "jobDetails.max_ctc": { $lte: parseFloat(max_salary) } },
      exp_from && {"candidateDetails.exp": { $gte: parseInt(exp_from) }},
      exp_to && {"candidateDetails.exp": { $lte: parseInt(exp_to) }},
      age_from && {"candidateDetails.age": { $gte: parseInt(age_from) }},
      age_to && {"candidateDetails.age": { $lte: parseInt(age_to) }},
      job_role_id && { "jobDetails.job_role": { $in: job_role_id.split(",").map(id => new mongoose.Types.ObjectId(id.trim())) } },
      company_id && { "companyDetails._id": { $in: company_id.split(",").map(id => new mongoose.Types.ObjectId(id.trim())) } },
      search && {
        $or: [
          { "candidateData.name": { $regex: search, $options: "i" } },
          { "candidateData.email": { $regex: search, $options: "i" } },
          { "candidateData.mobile": { $regex: search, $options: "i" } }
        ]
      },
      hunter_search && {
        $or: [
          { "hunterData.name": { $regex: hunter_search, $options: "i" } }, 
          { "hunterData.email": { $regex: hunter_search, $options: "i" } }, 
          { "hunterData.mobile": { $regex: hunter_search, $options: "i" } } 
        ]
      }
    ].filter(Boolean);

    // Common Aggregation Pipeline
    const basePipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "job_listings",
          localField: "job_id",
          foreignField: "_id",
          as: "jobDetails",
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "candidateData",
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "candidateData.createdBy",
          foreignField: "_id",
          as: "hunterData",
        }
      },
      {
        $lookup: {
          from: "company_details",
          localField: "jobDetails.user_id",
          foreignField: "user_id",
          as: "companyDetails",
        }
      },
      {
        $lookup: {
          from: "candidate_details",
          localField: "user_id",
          foreignField: "user_id",
          as: "candidateDetails",
        }
      },
      {
        $addFields: {
          jobDetails: { $arrayElemAt: ["$jobDetails", 0] },
          candidateData: { $arrayElemAt: ["$candidateData", 0] },
          companyDetails: { $arrayElemAt: ["$companyDetails", 0] },
          candidateDetails: { $arrayElemAt: ["$candidateDetails", 0] },
          hunterData: { $arrayElemAt: ["$hunterData", 0] },
          remarksData: { $arrayElemAt: ["$remarksData", 0] },
        }
      },
      {
        $set: {
          "candidateDetails.salary": { $toDouble: "$candidateDetails.salary" },
          "candidateDetails.exp": { $toDouble: "$candidateDetails.exp" },
          "candidateDetails.age": {
            $dateDiff: {
              startDate: "$candidateDetails.dob",
              endDate: "$$NOW",  // Current date
              unit: "year"
            }
          }
        }
      },
      ...filters.map(filter => ({ $match: filter })),
    ];

    const [candidateListRaw] = await Promise.all([
      JobApplied.aggregate([...basePipeline, { $sort: { createdAt: -1 } }]),
    ]);

     const interviewList = await JobappliedStatusMaster.find({ jobapplied_status_masterid: { $in: [6, 8, 17] } }).lean();
     const interviewListIds = interviewList.map((interview) => interview._id);

    // Process candidate details in parallel
    const candidateList = await Promise.all(candidateListRaw.map(async (candidate) => {
      const [
        chats,
        remarks,
        state,
        jobCities,
        candidateJobRoles,
        candidateState,
        candidateCities,
        candidateSkills,
        candidateIndustries,
        candidateEducation,
        candidateFuncCategories,
        jobRoleData,
        createdByUser
      ] = await Promise.all([
        ChatList.find({ job_id: candidate.job_id, user_id: candidate?.candidateData?._id }, "state_id user_id job_id status read_status remark createdBy createdAt"),
        CandidateStatusRemark.find(
          { job_id: candidate.job_id, user_id: candidate?.candidateData?._id },
          "remarks createdBy createdAt user_id"
        ).then(async (remarks) => {
          return formattedRemarks = await Promise.all(
            remarks.map(async (remark) => {
              const createdByUser = await User.findById(remark.createdBy).select("name"); // Fetch name
              return {
                _id: remark._id,
                user_id: remark.user_id,
                remark: remark.remarks,
                createdBy: createdByUser ? createdByUser.name : null, // Handle null case
                user_type: createdByUser ? createdByUser.user_type : null, // Handle null case
                createdAt: moment(remark.createdAt).format("DD-MMM-YYYY"),
              }
            })
          )
        }),
        States.findById(candidate?.jobDetails?.state_id),
        Cities.find({ _id: { $in: candidate?.jobDetails?.city_id || [] } }),
        JobRole.find({ _id: { $in: candidate?.candidateDetails?.job_role_id || [] } }),
        States.findById(candidate?.candidateData?.state),
        Cities.find({ _id: { $in: candidate?.candidateData?.city || [] } }),
        SkillMst.find({ _id: { $in: candidate?.candidateDetails?.skill || [] } }),
        IndustryMaster.find({ _id: { $in: candidate?.candidateDetails?.industry_id || [] } }),
        Education.findById(candidate?.candidateDetails?.edu_id),
        FunctionCategory.find({ _id: { $in: candidate?.candidateDetails?.func_category_id || [] } }),
        candidate?.jobDetails?.job_role
          ? JobRole.findById(candidate?.jobDetails?.job_role)
          : null,
        User.findById(candidate?.candidateData?.createdBy),
      ]);

      const chatDetails = await Promise.all(chats.map(async (chat) => {
        const [chatState, creator] = await Promise.all([
          States.findById(chat.state_id),
          User.findById(chat.createdBy),
        ]);
        return {
          id: chat._id,
          read_status: chat.read_status,
          state: chatState?.state_name || "",
          remark: chat.remark || "",
          createdBy: creator?.name || "",
          createdAt: moment(chat.createdAt).format("DD-MMM-YYYY"),
        };
      }));

      const jobAppliedStatusDoc = await JobappliedStatusMaster.findById(candidate?.job_applied_status);
      const interviewCount= await JobApplied.countDocuments({ user_id: candidate?.candidateData?._id, job_applied_status: { $in: interviewListIds } })
      const genderOptions = [
        { value: 3, label: 'Other' },
        { value: 1, label: 'Male' },
        { value: 2, label: 'Female' },
      ];
      return {
        _id: candidate?.candidateData?._id,
        app_id:candidate?._id,
        name: candidate?.candidateData?.name || "",
        email: candidate?.candidateData?.email || "",
        mobile: candidate?.candidateData?.mobile || "",
        current_company_name: candidate?.candidateDetails?.company_name || "",
        job_id: candidate?.jobDetails?._id,
        company_name: candidate?.companyDetails?.company_name || "",
        company_id: candidate?.companyDetails?._id || "",
        company_logo: candidate?.companyDetails?.logo || "",
        retention: candidate?.jobDetails?.job_incentive_id ? await JobIncentives.findOne({ _id: candidate?.jobDetails?.job_incentive_id, inc_type: 3, status: 1 }).retention || 0 : 0,
        job_role: {label: jobRoleData?.name, value:jobRoleData?._id},
        job_applied_status: jobAppliedStatusDoc
          ? { label: jobAppliedStatusDoc.name, value: jobAppliedStatusDoc._id }
          : { label: '', value: '' },
        inlist: candidate?.job_applied_status ? (await JobappliedStatusMaster.findById(candidate?.job_applied_status)).inlist || "" : '',
        hiring_amount: candidate?.jobDetails?.job_incentive_id ? await JobIncentives.findOne({ _id: candidate?.jobDetails?.job_incentive_id, inc_type: 3, status: 1 }).amount?.toString() || 0 : 0,
        min_exp: candidate?.jobDetails?.min_exp?.toString() || '',
        max_exp: candidate?.jobDetails?.max_exp?.toString() || '',
        vacancy: candidate?.jobDetails?.vacancy || '',
        min_ctc: candidate?.jobDetails?.min_ctc?.toString() || '',
        max_ctc: candidate?.jobDetails?.max_ctc?.toString() || '',
        job_state: state?.state_name || '',
        job_cities: jobCities.map(city => (city.city_name)),
        candidate_job_role: candidateJobRoles.map(role => (role.name)),
        status: ["Inactive", "Active", "Deleted or Expired"][candidate?.candidateData?.status] || "Unknown",
        state: ({label: candidateState?.state_name, value: candidateState?._id}) || {label: "", value: ""},
        cities: candidateCities.map(city => (city.city_name)),
        skill: candidateSkills.map(skill => (skill.name)),
        salary: candidate?.candidateDetails?.salary || "",
        ectc: candidate?.candidateDetails?.ectc || '',
        experience: candidate?.candidateDetails?.exp,
        industry: candidateIndustries.map(industry => (industry.industry_name)),
        education: ({label: candidateEducation?.name, value: candidateEducation?._id}) || {label: "", value: ""},
        func_category: candidateFuncCategories.map(fc => (fc.func_category_name)),
        gender:
          genderOptions.find(opt => opt.value === candidate?.candidateDetails?.gender) ||
          { label: "Other", value: 3 },
        dob: moment(candidate?.candidateDetails?.dob).format("DD-MMM-YYYY") || "",
        job_applied_date: moment(candidate?.createdAt).format("DD-MMM-YYYY") || "",
        interview:interviewCount,
        age:candidate?.candidateDetails?.age || "",
        lastContacted: remarks[remarks.length - 1]?.createdAt || null,
        lastContactedFromNow: remarks.length > 0 ? moment(remarks[remarks.length - 1]?.createdAt).fromNow() : null,
        notice_period: candidate?.candidateDetails?.notice_period || "",
        resume: candidate?.candidateDetails?.resume || "",
        ref: ({label: createdByUser?.name, value: createdByUser?._id}) || {label: "", value: ""},
        chats: chatDetails,
        remarks: remarks
      }
    }))

    // Prepare Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('AdminVpListing')
    
    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Current Company Name', key: 'current_company_name', width: 15 },
      { header: 'Company Name', key: 'company_name', width: 15 },
      { header: 'Company Logo', key: 'company_logo', width: 20 },
      { header: 'Retention', key: 'retention', width: 20 },
      { header: 'Job Role', key: 'job_role.label', width: 12 },
      { header: 'Job Applied Status', key: 'job_applied_status.label', width: 12 },
      { header: 'Hiring Amount', key: 'hiring_amount', width: 20 },
      { header: 'Min Exp', key: 'min_exp', width: 20 },
      { header: 'Max Exp', key: 'max_exp', width: 20 },
      { header: 'Vacancy', key: 'vacancy', width: 20 },
      { header: 'Min CTC', key: 'min_ctc', width: 20 },
      { header: 'Max CTC', key: 'max_ctc', width: 20 },
      { header: 'Job State', key: 'job_state', width: 20 },
      { header: 'Job Cities', key: 'job_cities', width: 20 },
      { header: 'Candidate Job Role', key: 'candidate_job_role.label', width: 20 },
      { header: 'State', key: 'state.label', width: 20 },
      { header: 'Cities', key: 'cities', width: 20 },
      { header: 'Skill', key: 'skill', width: 20 },
      { header: 'Salary', key: 'salary', width: 20 },
      { header: 'Ectc', key: 'ectc', width: 20 },
      { header: 'Experience', key: 'experience', width: 20 },
      { header: 'Industry', key: 'industry', width: 20 },
      { header: 'Education', key: 'education.label', width: 20 },
      { header: 'Function Category', key: 'func_category', width: 20 },
      { header: 'Gender', key: 'gender.label', width: 20 },
      { header: 'Dob', key: 'dob', width: 20 },
      { header: 'Job Applied Date', key: 'job_applied_date', width: 20 },
      { header: 'Interview', key: 'interview', width: 20 },
      { header: 'Age', key: 'age', width: 20 },
      { header: 'Last Contacted', key: 'lastContacted', width: 20 },
      { header: 'Last Contacted From Now', key: 'lastContactedFromNow', width: 20 },
      { header: 'Notice Period', key: 'notice_period', width: 20 },
      { header: 'Resume', key: 'resume', width: 20 },
      { header: 'Ref', key: 'ref.label', width: 20 },
      { header: 'Chats', key: 'chats', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ];

    // Add data to the worksheet
    worksheet.addRows(candidateList);

    // Save the workbook to a buffer (instead of a file)
    workbook.xlsx.writeBuffer()
      .then(async (buffer) => {
        // **Upload Files to S3 (if provided)** 
        const fileName = `AdminVpListing_${Date.now()}.xlsx`
        const fileUploads = {
          uploadfile: buffer ? uploadToS3(buffer, "uploadedfiles", { ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName: fileName }) : Promise.resolve(""),
        }
        const [fileUrl] = await Promise.all([fileUploads.uploadfile])
        if (fileUrl) {
          await DownloadedFile.create({
            fileUrl: fileUrl,
            originalFileName: fileName,
            type: jobData.type,
            downloadedBy: user._id
          })
        }
      })
      .catch((error) => {
        console.error("Error creating Excel file:", error);
      });

  } catch (error) {
    console.error("Error in candidateListing:", error);
    res.status(500).json({ success: false, message: "Error fetching candidate listings.", error: error.message });
  }
};

module.exports = { exportHuntersToExcel, exportAdminVpListingToExcel };
