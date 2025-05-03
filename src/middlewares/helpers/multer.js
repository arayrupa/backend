const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage setup
const storageProfile = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use absolute path from project root
        const uploadsDir = path.join(__dirname,'../..', '/public/uploads/profile');

        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const storageResume = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use absolute path from project root
        const uploadsDir = path.join(__dirname,'../..', '/public/uploads/resume');
        console.log("file", file)
        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        console.log("file", file)
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const storageHowToSource = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use absolute path from project root
        const uploadsDir = path.join(__dirname,'../..', '/public/uploads/howToSource');

        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const storageCompanyLogo = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use absolute path from project root
        const uploadsDir = path.join(__dirname,'../..', '/public/uploads/companyLogo');

        // Create the directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// File filter
const jobFilter = (req, file, cb) => {
    // Accept images and audio files only
    if (!file.originalname.match(/\.(pdf|doc|docx|mp3|wma|wav)$/i)) {
        return cb(new Error('Only PDF/DOC files and audio files (PDF, DOC, DOCX, MP3, WMA, WAV) are allowed!'), false);
    }
    cb(null, true);
};

// File filter
const resumeFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(pdf|doc|docx)$/)) {
        return cb(new Error('Only PDF/DOC files are allowed!'), false);
    }
    cb(null, true);
};


// Multer middleware for profile file upload
const uploadProfile = multer({
    storage: storageProfile,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
}).single('profile'); // 'profile' is the field name in form data


// Multer middleware for howToSource file upload
const uploadHowToSource = multer({
    storage: storageHowToSource,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
}).single('img_url'); // 'img_url' is the field name in form data


const uploadCompanyLogo = multer({
    storage: storageCompanyLogo,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('logo')


const uploadJob = multer({
    storage: storageResume,
    fileFilter: jobFilter,
    limits: {
        fileSize: 10* 1024 * 1024 // 10MB limit
    }
})
.fields([
    { name: 'resume', maxCount: 1 }, // Allow up to 1 resume file
    { name: 'audio_1', maxCount: 1 },
    { name: 'audio_2', maxCount: 1 }
]);

const uploadResume = multer({
    storage: storageResume,
    fileFilter: resumeFilter,
    limits: {
        fileSize: 10* 1024 * 1024 // 10MB limit
    }
}).single('resume');


// Global error handler for multer
const handleMulterError = (err, req, res, next) => {
    console.error('Multer error:', err);
    if (err instanceof multer.MulterError) {
        // Multer-specific error
        return res.status(500).json({ success: false, message: err.message });
    } else if (err) {
        // Any other error
        return res.status(500).json({ success: false, message: err.message });
    }
    next();
};

module.exports = {
    uploadProfile,
    uploadHowToSource,
    uploadCompanyLogo,
    uploadResume,
    uploadJob,
    handleMulterError
};
