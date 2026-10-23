const User = require("../../models/user.model");

module.exports.getOwnerById = async (id) => {
  return await User.findOne({
    _id: id,
  });
};

module.exports.updateOwnerProfile = async (userId, body) => {
  const { email, phone, fullName, avatar_url } = body;

  const update = { email, phone, fullName };
  if (avatar_url) update.avatar_url = avatar_url;

  return await User.updateOne({ _id: userId }, update);
};
