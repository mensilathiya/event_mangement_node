const multer = require("multer");
const AppError = require("../utils/AppError");

// Memory Storage
const storage = multer.memoryStorage();

// Allowed MIME Types
const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// File Filter
const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new AppError(
        "Only JPG, JPEG, PNG and WEBP images are allowed.",
        400
      ),
      false
    );
  }

  cb(null, true);
};

// Upload Middleware
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter,
});

module.exports = upload;