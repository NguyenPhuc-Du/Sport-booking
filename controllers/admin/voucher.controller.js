module.exports.index = async (req, res) => {
  res.render("admin/pages/voucher/index", {
    pageTitle: "Trang Khuyến mãi",
  });
};
