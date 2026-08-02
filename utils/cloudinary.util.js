const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

/**
 * Upload Buffer to Cloudinary
 * @param {Buffer} buffer
 * @param {String} folder
 * @param {String} resourceType
 * @returns {Promise}
 */
const uploadToCloudinary = (
  buffer,
  folder,
  resourceType = "image"
) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          public_id: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = uploadToCloudinary;