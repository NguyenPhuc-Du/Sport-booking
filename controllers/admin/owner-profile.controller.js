const Venue = require("../../models/facilities.model");
const User = require("../../models/user.model");

module.exports.index = async (req, res) => {
  const ownerId = res.locals.user.id;

  const owner = await User.findOne({
    _id: ownerId,
  });

  const venues = await Venue.find({
    owner_id: ownerId
  });

  res.render("admin/pages/owner-profile/index", {
    pageTitle: "Hồ sơ chủ sân",
    activeMenu: "profile",
    owner: owner,
    venues
  });
};

module.exports.update = async (req, res) => {
  try {
    const id = res.locals.user.id;

    const { email, phone, fullName, avatar_url } = req.body;

    await User.updateOne(
      {
        _id: id,
      },
      {
        email,
        phone,
        fullName,
        avatar_url
      },
    );

    req.flash("success", "Cập nhật thông tin thành công");
    res.redirect(req.get("Referrer"));
  } catch (error) {
    req.flash("error", "Cập nhật thông tin thất bại");
    res.redirect(req.get("Referrer"));
  }
};
