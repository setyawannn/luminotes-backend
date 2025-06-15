// middleware/uploadMiddleware.js

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadDir = "public/uploads";

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    cb(null, `${basename}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "file") {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'application/msword' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error("Only .pdf, .doc, .docx files are allowed for the main file!"), false);
    }
  } else if (file.fieldname === "thumbnail") {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
      cb(null, true);
    } else {
      cb(new Error("Only .jpg, .png, .gif files are allowed for the thumbnail!"), false);
    }
  } else {
    cb(null, false);
  }
};

const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

module.exports = uploadMiddleware;