const User = require("../../models/user.model");

module.exports.getOwnerById = async (id) => {
  return await User.findOne({
    _id: id,
  });
};

module.exports.updateOwnerProfile = async (userId, body) => {
  const { email, phone, fullName, avatar_url } = body;

  return await User.updateOne(
    { _id: userId },
    {
      email,
      phone,
      fullName,
      avatar_url,
    },
  );
};
