const asyncErrorHandler = require("../middlewares/helpers/asyncErrorHandler");
const { CompanyDetails } = require('../models/companyDetailsModel');
const { JobListing } = require("../models/jobListingModel");
const { User } = require('../models/userModel');
const { States } = require('../models/statesModel');
const { Cities } = require('../models/citiesModel');
const { formatDate } = require("../middlewares/helpers/formatDate");
const mongoose = require('mongoose');
const { uploadToS3 } = require("../middlewares/helpers/uploadToS3");
const { redisClient, setAsync, getAsync } = require("../config/redisConfig")

// Create Company
exports.createCompany = asyncErrorHandler(async (req, res) => {
  console.log("createCompany API called");

  const {
    name, email, password, mobile, state, city, company_name,
    website, address, createdBy
  } = req.body;

  // **Validate Required Fields**
  if (!name || !email || !password || !mobile || !state || !city || !company_name || !website || !address) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    // **Check if user already exists**
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({ success: false, message: "Company already exists with this email." });
    }

    // **Create new user**
    const user = await User.create({
      name, email, password, mobile, user_type: 3, uid: 0,
      state, city, refer_code: "", status: 1, createdBy
    }); 
    // **Upload Files to S3 (if provided)** 
    const fileUploads = {
      logo: req.file ? uploadToS3(req.file, "uploadedfiles") : Promise.resolve(""),
    }
    const [logoUrl] = await Promise.all([fileUploads.logo])

    // **Create Company Record**
    if (user) {
      await CompanyDetails.create({
        user_id: user._id,
        company_name,
        website,
        logo: logoUrl,
        address,
        created_by: createdBy,
      });
    }

    // Delete all cached Companies list data in Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys("Company-page-*")
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key)))
          console.log("Deleted cached Company list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }

    return res.status(200).json({ success: true, message: "Company created successfully.", user });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error. Please try again later.", error: error.message });
  }
});

// Update Company
exports.updateCompany = asyncErrorHandler(async (req, res) => {
  console.log("updateCompany API called");

  const {
    name, email, mobile, state, city, company_name,
    website, address, updatedBy
  } = req.body;

  try {
    // **Update User Collection**
    const Companydata = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        mobile,
        state,
        city,
        updatedBy,
        updatedAt: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    // **Handle Not Found Case**
    if (!Companydata) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // **Upload Files to S3 (if provided)** 
    const fileUploads = {
      logo: req.file ? uploadToS3(req.file, "uploadedfiles") : Promise.resolve(""),
    }
    const [logoUrl] = await Promise.all([fileUploads.logo])

    // **Build Update Object Dynamically**
    const updateData = {
      company_name,
      website,
      address,
      updatedBy: updatedBy,
      updatedAt: Date.now()
    };

    if (logoUrl) {
      updateData.logo = logoUrl; // Only update logo if a new one is provided
    }
    const companyDetails = await CompanyDetails.findOne({ user_id: Companydata._id });
    if (!companyDetails) {
      await CompanyDetails.create({
        user_id: Companydata._id,
        createdAt: Date.now(),
        created_by: updatedBy,
        ...updateData,
      });
    } else {
      // **Update Company Details**
      await CompanyDetails.findOneAndUpdate(
        { user_id: Companydata._id },
        { $set: updateData },
        {
          new: true,
          runValidators: true
        }
      );
    }

    // **Delete Cached Company List in Redis (if applicable)**
    if (redisClient) {
      try {
        const keys = await redisClient.keys("Company-page-*");
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key)));
          console.log("Deleted cached Company list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }

    // **Success Response**
    return res.status(200).json({
      success: true,
      message: "Company updated successfully",
      Companydata
    });

  } catch (error) {
    console.error("Error in updateCompany:", error);

    return res.status(500).json({
      success: false,
      message: "There was an error in updateCompany.",
      error: error.message || error,
    });
  }
});

// List Companys with Pagination
exports.listCompanys = asyncErrorHandler(async (req, res) => {
  console.log("listCompanys API called", req.body);
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { search, company, state, city, created_from, created_to } = req.body;
  const cacheKey = `Company-page-${company || "all"}-${state || "all"}-${city || "all"}-${created_from || "all"}-${created_to || "all"}-${page}-limit-${limit}-${search || "all"}`;

  try {
    // **Try Redis Cache First**
    const cachedData = await getAsync(cacheKey);
    if (cachedData) {
      const cachedResponse = JSON.parse(cachedData);
      return res.status(200).json({
        success: true,
        message: "Companies fetched from cache",
        ...cachedResponse,
      });
    }
        
    const query = { user_type: 3};

    // Search Filter
    if (search) {
      query.$or = [
        { "name": { $regex: search, $options: "i" } },
        { "email": { $regex: search, $options: "i" } },
        { "mobile": { $regex: search, $options: "i" } }
      ];
    }

    // Company Filter (Multiple Companies by ID from CompanyDetails)
    if (company) {
      const companyArray = company.split(',').map(id => mongoose.Types.ObjectId(id.trim()));
      
      // Get user_ids from CompanyDetails where company_id matches
      const companyDetails = await CompanyDetails.find({ _id: { $in: companyArray } }).select('user_id');
      const userIds = companyDetails.map(details => details.user_id);

      // Filter main query with user_ids
      query._id = { $in: userIds };
    }

    // State Filter (Multiple States)
    if (state) {
      const stateArray = state.split(',').map(id => mongoose.Types.ObjectId(id.trim()));
      query.state = { $in: stateArray };
    }

    // City Filter (Multiple Cities)
    if (city) {
      const cityArray = city.split(',').map(id => mongoose.Types.ObjectId(id.trim()));
      query.city = { $in: cityArray };
    }

    // Date Range Filter (Created From and To)
    if (created_from || created_to) {
      query.createdAt = {};  // Initialize createdAt filter object
    
      if (created_from) {
        const startOfDay = new Date(created_from.split("/").reverse().join("-") + "T00:00:00.000Z") ;
        query.createdAt.$gte = startOfDay;
      }
    
      if (created_to) {
        const endOfDay = new Date(created_to.split("/").reverse().join("-") + "T23:59:59.999Z")
        query.createdAt.$lte = endOfDay;
      }
    }

    const totalCount = await User.countDocuments(query);

    const Companydata = await User.find(query)
      .populate({ path: 'createdBy', select: 'name email' })
      .populate({ path: 'updatedBy', select: 'name email' })
      .populate({ path: 'state', select: 'state_name' })
      .populate({ path: 'city', select: 'city_name' })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Format users and add assigned users
    const formattedCompanys = await Promise.all(Companydata.map(async (user) => {
      const companyDetails = user?._id 
        ? await CompanyDetails.findOne({ user_id: user._id })
          .select('company_name address logo website user_id') 
        : {};
        const jobs = companyDetails?.user_id 
        ? await JobListing.find({ user_id: companyDetails.user_id }).countDocuments() 
        : 0;
      return {
        ...user._doc,
        companyDetails: companyDetails,
        jobs: jobs,
        createdAt: formatDate(user.createdAt),
        updatedAt: formatDate(user.updatedAt)
      };
    }));

    // **Prepare Cache Data**
    const cacheData = {
      Company: formattedCompanys,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        pageSize: limit
      }
    }
    // **Try Storing in Redis**
    await setAsync(cacheKey, 3600, JSON.stringify(cacheData));


    return res.status(200).json({
      success: true,
      message: 'Companys fetched successfully',
      ...cacheData
    });

  } catch (error) {
    console.error("Error in listCompanys:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error in listCompanys.",
      error: error.message || error,
    });
  }
});

// Get Company by ID
exports.getCompany = asyncErrorHandler(async (req, res) => {
  console.log("getCompany API called");
  try {
    const Companydata = await User.findById(req.params.id)
    .populate({ path: 'createdBy', select: 'name email' })
    .populate({ path: 'updatedBy', select: 'name email' })
    .populate({ path: 'state', select: 'state_name' })
    .populate({ path: 'city', select: 'city_name' })
    const companyDetails = req.params.id ? await CompanyDetails.findOne({ user_id: req.params.id})
        .select('company_name address logo website') : {};

    if (!Companydata) {
      return res.status(500).json({
        success: false,
        message: 'Company not found',
      });
    }

    const formattedCompany = {
      ...Companydata._doc,
      companyDetails:companyDetails,
      createdAt: formatDate(Companydata.createdAt),
      updatedAt: formatDate(Companydata.updatedAt)
    };

    return res.status(200).json({
      success: true,
      message: 'Company fetched successfully',
      Company: formattedCompany
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in getCompany.",
      error: error.message || error,
    });
  }
});

// Update Status of Company
exports.updateStatus = asyncErrorHandler(async (req, res) => {
  console.log("updateStatus API called");
  const { status, updatedBy } = req.body;

  // Validate status value
  if (![0, 1].includes(status)) {
    return res.status(500).json({
      success: false,
      message: "Invalid status value. Must be 0 or 1."
    });
  }

  try {

    const Companydata = await User.findByIdAndUpdate(
      req.params.id,
      {
        status,
        updatedBy,
        updatedAt: Date.now()  // Set updatedAt to current date
      },
      {
        new: true,
        runValidators: true
      }
    );

    // If Company not found, return 500
    if (!Companydata) {
      return res.status(500).json({
        success: false,
        message: "Company not found"
      });
    }

    // Delete all cached Companies list data in Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys("Company-page-*")
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key)))
          console.log("Deleted cached Company list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      Companydata
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in updateStatus.",
      error: error.message || error,
    });
  }
});

// Delete Company
exports.deleteCompany = asyncErrorHandler(async (req, res) => {
  console.log("deleteCompany API called");

  try {
    // Delete Company Details first
    await CompanyDetails.findOneAndDelete({ user_id: req.params.id });

    // Delete Company
    const Companydata = await User.findByIdAndDelete(req.params.id);

    if (!Companydata) {
      return res.status(500).json({
        success: false,
        message: "Company not found"
      });
    }

    // Delete all cached Companies list data in Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys("Company-page-*")
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key)))
          console.log("Deleted cached Company list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error("Error in deleteCompany:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error in deleteCompany.",
      error: error.message || error,
    });
  }
});

exports.filtersCompany = asyncErrorHandler(async (req, res) => {
  console.log("filtersCompany API called");
  try {
    // Fetch dropdown data
    const [stateList, citiesList] = await Promise.all([
      (async () => {
        const stateIds = await User.distinct('state', { status: 1, user_type: 3, state: { $ne: null } });
        const states = await States.find({ _id: { $in: stateIds },status: 1 }).sort({ state_name: 1 }).lean();
        return states.map(state => ({ value: state._id, label: state.state_name }));
      })(),
      (async () => {
        const citiesIds = await User.aggregate([
          { $match: { status: 1, user_type: 3 } },
          { $unwind: "$city" },
          { $match: { city: { $ne: null } } },
          { $group: { _id: "$city" } }
        ]);
        const cityObjectIds = citiesIds.map(city => city._id);
        const citiesList = await Cities.find({ _id: { $in: cityObjectIds } }).sort({ city_name: 1 }).lean();
        return citiesList.map(city => ({ value: city._id, label: city.city_name }));
      })()
    ]);

    return res.status(200).json({
      success: true,
      message: 'jobFilters fetched successfully',
      data: {
        state: { count: stateList.length, stateList },
        cities: { count: citiesList.length, citiesList }
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
