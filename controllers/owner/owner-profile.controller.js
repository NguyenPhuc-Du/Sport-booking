const venueService = require("../../services/owner/facility.service");
const ownerService = require("../../services/owner/owner-profile.service");

module.exports.index = async (req, res) => {
  const ownerId = res.locals.user.id;

  const owner = await ownerService.getOwnerById(ownerId);

  const venues = await venueService.getAllVenueByOwnerId(ownerId, req.body);

  res.render("owner/pages/owner-profile/index", {
    pageTitle: "Hồ sơ chủ sân",
    activeMenu: "profile",
    owner: owner,
    venues
  });
};

module.exports.update = async (req, res) => {
  try {
    const id = res.locals.user.id;

    if (!req.body.avatar_url && req.body.current_avatar_url) {
      req.body.avatar_url = req.body.current_avatar_url;
    }

    await ownerService.updateOwnerProfile(id, req.body);

    req.flash("success", "Cập nhật thông tin thành công");
    res.redirect(req.get("Referrer") || "/owner/profile");
  } catch (error) {
    req.flash("error", "Cập nhật thông tin thất bại");
    res.redirect(req.get("Referrer") || "/owner/profile");
  }
};
