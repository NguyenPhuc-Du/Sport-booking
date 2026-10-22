const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");

module.exports.login = async (email) => {
  const user = await User.findOne({
    email: email,
    status: "active",
  })
    .select("-password_hash")
    .lean();

  const recordUser = {
    id: user._id,
    email: email,
    phone: user.phone,
  };

  const accessToken = jwt.sign(recordUser, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return { user, accessToken };
};

module.exports.register = async (body) => {
  const { fullName, phone, email, password } = body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  return await User.create({
    fullName,
    phone,
    email,
    password_hash: hashedPassword,
    role: "USER",
  });
};
