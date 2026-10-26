const profileService = require("../../services/app/profile.service");
const { toUser } = require("./user.mapper");

function fail(res, error, fallback) {
  if (error.status) return res.status(error.status).json({ message: error.message });
  console.error(error);
  return res.status(500).json({ message: fallback });
}

module.exports.index = async (req, res) => {
  try {
    const user = await profileService.getProfile(req.auth.userId);
    return res.json({ user: toUser(user), notifications: [], reviews: [] });
  } catch (error) {
    return fail(res, error, "Không tải được hồ sơ");
  }
};

module.exports.update = async (req, res) => {
  try {
    const user = await profileService.updateProfile(req.auth.userId, req.body);
    return res.json({ user: toUser(user) });
  } catch (error) {
    return fail(res, error, "Cập nhật hồ sơ thất bại");
  }
};

module.exports.avatar = async (req, res) => {
  try {
    const user = await profileService.updateAvatar(req.auth.userId, req.body.avatar);
    return res.json({ user: toUser(user) });
  } catch (error) {
    return fail(res, error, "Cập nhật ảnh đại diện thất bại");
  }
};
