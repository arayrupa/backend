const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Destination folder invoked");
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    console.log("Filename logic invoked. File details:", file);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}`);
  }
});

const uploadAdminDoc = multer({ 
  storage: storage,
}).single('fileUpload');

module.exports = { uploadAdminDoc };