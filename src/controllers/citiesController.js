const asyncErrorHandler = require("../middlewares/helpers/asyncErrorHandler");
const { Cities } = require('../models/citiesModel');
const { formatDate } = require("../middlewares/helpers/formatDate");


// Create City
exports.createCities = asyncErrorHandler(async (req, res) => {
  console.log("createCities API called");

  try {
    // Validate request body (ensure required fields exist)
    if (!req.body || !req.body.city_name) {
      return res.status(400).json({
        success: false,
        message: "City name is required.",
      });
    }

    // Check if city already exists
    const existingCity = await Cities.findOne({
      city_name: req.body.city_name.trim(),
      state: req.body.state
    });

    if (existingCity) {
      return res.status(500).json({
        success: false,
        message: "City already exists.",
      });
    }

    // Create City Entry
    const cityData = await Cities.create({
      city_name: req.body.city_name.trim(), // Trim extra spaces
      createdBy: req.body.createdBy,
      state: req.body.state,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: "City created successfully",
      cityData,
    });

  } catch (error) {
    console.error("Error in createCities:", error);

    return res.status(500).json({
      success: false,
      message: "There was an error in createCities.",
      error: error.message || error,
    });
  }
});


// Update City
exports.updateCities = asyncErrorHandler(async (req, res) => {
  console.log("updateCities API called");
  const { city_name, state, updatedBy } = req.body;

  try {

     // Check if city already exists
     const existingCity = await Cities.findOne({
      city_name: req.body.city_name.trim(),
      state: req.body.state
    });

    if (existingCity) {
      return res.status(500).json({
        success: false,
        message: "City already exists.",
      });
    }

    const Citiesdata = await Cities.findByIdAndUpdate(
      req.params.id,
      {
        city_name,
        state,
        updatedBy,
        updatedAt: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!Citiesdata) {
      return res.status(500).json({
        success: false,
        message: "City not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: 'City updated successfully',
      Citiesdata
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in updateCities.",
      error: error.message || error,
    });
  }
});

// List Citys with Pagination
exports.listCitiess = asyncErrorHandler(async (req, res) => {
  console.log("listCitiess API called");
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { search } = req.body;

  try {
    const query = { };
    // Search Filter
    if (search) {
      query.$or = [
        { "city_name": { $regex: search, $options: "i" } },
      ];
    }
    const totalCount = await Cities.countDocuments(query);

    const Citiesdata = await Cities.find(query)
      .populate({ path: 'createdBy', select: 'name email' })
      .populate({ path: 'updatedBy', select: 'name email' })
      .populate({ path: 'state', select: 'state_name' })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const formattedCitiess = Citiesdata.map(role => ({
      ...role._doc,
      createdAt: formatDate(role.createdAt),
      updatedAt: formatDate(role.updatedAt)
    }));

    return res.status(200).json({
      success: true,
      message: 'Citys fetched successfully',
      Cities: formattedCitiess,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        pageSize: limit
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in listCitiess.",
      error: error.message || error,
    });
  }
});

// Get City by ID
exports.getCities = asyncErrorHandler(async (req, res) => {
  console.log("getCities API called");
  try {
    const Citiesdata = await Cities.findById(req.params.id)
      .populate({ path: 'createdBy', select: 'name email' })
      .populate({ path: 'updatedBy', select: 'name email' })
      .populate({ path: 'state', select: 'state_name' });

    if (!Citiesdata) {
      return res.status(500).json({
        success: false,
        message: 'City not found',
      });
    }

    const formattedCities = {
      ...Citiesdata._doc,
      createdAt: formatDate(Citiesdata.createdAt),
      updatedAt: formatDate(Citiesdata.updatedAt)
    };

    return res.status(200).json({
      success: true,
      message: 'City fetched successfully',
      Cities: formattedCities
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in getCities.",
      error: error.message || error,
    });
  }
});

// Update Status of City
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
    const Citiesdata = await Cities.findByIdAndUpdate(
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

    // If City not found, return 404
    if (!Citiesdata) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      Citiesdata
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in updateStatus.",
      error: error.message || error,
    });
  }
});

// Delete City
exports.deleteCities = asyncErrorHandler(async (req, res) => {
  console.log("deleteCities API called");
  try {
    const Citiesdata = await Cities.findByIdAndDelete(req.params.id);

    if (!Citiesdata) {
      return res.status(500).json({
        success: false,
        message: "City not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: 'City deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in deleteCities.",
      error: error.message || error,
    })
  }
});

// citiesDropDown
exports.citiesDropDown = asyncErrorHandler(async (req, res) => {
  console.log("citiesDropDown API called");
  try {
    const { search } = req.body
    const query = search ? { status: 1, city_name: { $regex: search, $options: "i" } } : { status: 1 };
    const citiesdata = await Cities.find(query).limit(10)
    if (!citiesdata) {
      return res.status(500).json({
        success: false,
        message: "City not found"
      })
    }
    return res.status(200).json({
      success: true,
      message: 'city dropdown fetched successfully',
      cities: citiesdata.map(city => ({
        value: city._id,
        label: city.city_name
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in citiesDropDown.",
      error: error.message || error,
    })
  }
})
