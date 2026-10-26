const multer = require("multer");
const uploadCloud = require("../owner/uploadCloud.middleware");

const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new Error("Chỉ nhận ảnh JPG, PNG hoặc WEBP"));
    }
    cb(null, true);
  },
});

function avatar(req, res, next) {
  upload.single("avatar")(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Ảnh tối đa 2MB" });
    }
    return res.status(400).json({ message: error.message || "Ảnh không hợp lệ" });
  });
}

module.exports = {
  avatar,
  toCloud: uploadCloud.upload,
};
