module.exports.index = async (req, res) => {
  res.render("admin/pages/owner-profile/index", {
    pageTitle: "Hồ sơ chủ sân",
    activeMenu: "profile",
    saved: req.query.saved === "1",
    owner: {
      name: "Trần Thu Hà",
      phone: "0912 888 999",
      email: "ha.tt@sportpro.vn",
      wallet: "14.250.000đ",
      avatar: "https://i.pravatar.cc/160?img=5",
      facility: "SportPro Complex - Cầu Giấy",
      plan: "Gói Pro Club",
      joined: "03/2025",
    },
  });
};

module.exports.update = async (req, res) => {
  res.redirect("/owner/profile?saved=1");
};
