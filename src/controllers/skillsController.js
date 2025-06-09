const asyncErrorHandler = require("../middlewares/helpers/asyncErrorHandler")
const { SkillMst } = require('../models/skillMstModel')
const { formatDate } = require("../middlewares/helpers/formatDate")
// const { redisClient, setAsync, getAsync } = require("../config/redisConfig")

// Create Skill
exports.createSkill = asyncErrorHandler(async (req, res) => {
  console.log("createSkill API called");

  try {
    // Validate request body (ensure required fields exist)
    if (!req.body || !req.body.name) {
      return res.status(400).json({
        success: false,
        message: "Skill name is required.",
      });
    }

    // Check if skill already exists
    const existingSkill = await SkillMst.findOne({
      name: req.body.name.trim(),
      status: 1
    });
    if (existingSkill) {
      return res.status(500).json({
        success: false,
        message: "Skill already exists.",
      });
    }

    // Create Skill Entry
    const skillData = await SkillMst.create({
      name: req.body.name.trim(), // Trim extra spaces
      createdBy: req.body.createdBy,
    });

    // Delete all cached skills list data in Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys("skills-page-*"); // Find all related cache keys
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key))); // Delete multiple keys
          console.log("Deleted cached skills list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Skill created successfully",
      skillData,
    });

  } catch (error) {
    console.error("Error in createSkill:", error);

    return res.status(500).json({
      success: false,
      message: "There was an error in createSkill.",
      error: error.message || error,
    });
  }
});

// Update Skill
exports.updateSkill = asyncErrorHandler(async (req, res) => {
  console.log("updateSkill API called");
  const { name, updatedBy } = req.body;

  try {

    // Check if skill already exists
    const existingSkill = await SkillMst.findOne({
      name: req.body.name.trim(),
      status: 1
    });
    if (existingSkill) {
      return res.status(500).json({
        success: false,
        message: "Skill already exists.",
      });
    }

    const Skilldata = await SkillMst.findByIdAndUpdate(
      req.params.id,
      {
        name,
        updatedBy,
        updatedAt: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!Skilldata) {
      return res.status(500).json({
        success: false,
        message: "Skill not found"
      });
    }

    // Delete all cached skills list data in Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys("skills-page-*")
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key)))
          console.log("Deleted cached skills list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Skill updated successfully',
      Skilldata
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in updateSkill.",
      error: error.message || error,
    });
  }
});

// List Skills with Pagination
exports.listSkills = asyncErrorHandler(async (req, res) => {
  console.log("listSkills API called")
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { search } = req.body;
  const cacheKey = `skills-page-${page}-limit-${limit}-${search || "all"}`;

  try {
    // **Try Redis Cache First**
    const cachedData = await getAsync(cacheKey);
    if (cachedData) {
      const cachedResponse = JSON.parse(cachedData);
      return res.status(200).json({
        success: true,
        message: "Skills fetched from cache",
        ...cachedResponse,
      });
    }

    // **MongoDB Query**
    const query = search ? { name: { $regex: search, $options: "i" } } : {};
    const totalCount = await SkillMst.countDocuments(query);
    const Skilldata = await SkillMst.find(query)
      .populate({ path: "createdBy", select: "name email" })
      .populate({ path: "updatedBy", select: "name email" })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // **Format Data**
    const formattedSkills = Skilldata.map((skill) => ({
      ...skill._doc,
      createdAt: formatDate(skill.createdAt),
      updatedAt: formatDate(skill.updatedAt),
    }));

    // **Prepare Cache Data**
    const cacheData = {
      Skill: formattedSkills,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        pageSize: limit,
      },
    };

    // **Try Storing in Redis**
    await setAsync(cacheKey, 3600, JSON.stringify(cacheData));

    return res.status(200).json({
      success: true,
      message: "Skills fetched from MongoDB",
      ...cacheData,
    });

  } catch (error) {
    console.error("Error in listSkills:", error);
    return res.status(500).json({
      success: false,
      message: "There was an error in listSkills.",
      error: error.message || error,
    });
  }
});

// Get Skill by ID
exports.getSkill = asyncErrorHandler(async (req, res) => {
  console.log("getSkill API called");
  try {
    const Skilldata = await SkillMst.findById(req.params.id)
      .populate({ path: 'createdBy', select: 'name email' })
      .populate({ path: 'updatedBy', select: 'name email' })

    if (!Skilldata) {
      return res.status(500).json({
        success: false,
        message: 'Skill not found',
      });
    }

    const formattedSkill = {
      ...Skilldata._doc,
      createdAt: formatDate(Skilldata.createdAt),
      updatedAt: formatDate(Skilldata.updatedAt)
    };

    return res.status(200).json({
      success: true,
      message: 'Skill fetched successfully',
      Skill: formattedSkill
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in getSkill.",
      error: error.message || error,
    });
  }
});

// Update Status of Skill
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

    const Skilldata = await SkillMst.findByIdAndUpdate(
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

    // If Skill not found, return 404
    if (!Skilldata) {
      return res.status(404).json({
        success: false,
        message: "Skill not found"
      });
    }

    // Delete all cached skills list data in Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys("skills-page-*")
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key)))
          console.log("Deleted cached skills list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      Skilldata
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in updateStatus.",
      error: error.message || error,
    });
  }
});

// Delete Skill
exports.deleteSkill = asyncErrorHandler(async (req, res) => {
  console.log("deleteSkill API called");
  try {

    const Skilldata = await SkillMst.findByIdAndDelete(req.params.id);

    if (!Skilldata) {
      return res.status(500).json({
        success: false,
        message: "Skill not found"
      });
    }

    // Delete all cached skills list data in Redis
    if (redisClient) {
      try {
        const keys = await redisClient.keys("skills-page-*"); // Find all related cache keys
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => redisClient.del(key))); // Delete multiple keys
          console.log("Deleted cached skills list:", keys);
        }
      } catch (redisError) {
        console.error("Redis Cache Delete Error:", redisError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in deleteSkill.",
      error: error.message || error,
    });
  }
});

// skillDropDown 
exports.skillDropDown = asyncErrorHandler(async (req, res) => {
  console.log("skillDropDown API called",req.body);
  try {
    const { search } = req.body;
    const query = search ? { status: 1, name: { $regex: search, $options: "i" } } : { status: 1 };
    const skilldata = await SkillMst.find(query).limit(5)
    if (!skilldata) {
      return res.status(500).json({
        success: false,
        message: "Skill not found"
      });
    }
    return res.status(200).json({
      success: true,
      message: 'skill dropdown fetched successfully',
      skills: skilldata.map(skill => ({
        value: skill._id,
        label: skill.name
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error in skillDropDown.",
      error: error.message || error,
    });
  }
})