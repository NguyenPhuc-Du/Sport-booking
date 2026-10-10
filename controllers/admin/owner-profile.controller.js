const User = require("../../models/user.model");

module.exports.index = async (req, res) => {
  const ownerId = res.locals.user.id;

  const owner = await User.findOne({
    _id: ownerId
  });

  res.render("admin/pages/owner-profile/index", {
    pageTitle: "Hồ sơ chủ sân",
    activeMenu: "profile",
    saved: req.query.saved === "1",
    owner: owner
  });
};

module.exports.update = async (req, res) => {
  res.redirect("/owner/profile?saved=1");
};
