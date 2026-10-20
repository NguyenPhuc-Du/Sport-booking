const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.PASSCLOUDDIARY,
});

const streamUpload = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// 1 ảnh (cơ sở, đồ uống, ...)
module.exports.upload = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const result = await streamUpload(req.file.buffer);
    req.body[req.file.fieldname] = result.secure_url;
    next();
  } catch (err) {
    next(err);
  }
};

// Nhiều ảnh (sân con)
module.exports.uploadMany = async (req, res, next) => {
  if (!req.files?.length) return next();
  try {
    const urls = [];
    for (const file of req.files) {
      const result = await streamUpload(file.buffer);
      urls.push(result.secure_url);
    }
    req.body.image_urls = urls;
    next();
  } catch (err) {
    next(err);
  }
};
