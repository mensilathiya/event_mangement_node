const multer = require("multer");
const AppError = require("../utils/AppError");
const path = require("path");
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
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/octet-stream", // fallback
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    return cb(null, true);
  }

  return cb(
    new AppError(
      "Only JPG, JPEG, PNG and WEBP images are allowed.",
      400
    ),
    false
  );
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