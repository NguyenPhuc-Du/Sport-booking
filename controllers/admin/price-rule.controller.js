// [GET] /owner/facilities/price-rules
module.exports.index = async (req, res) => {
  res.render("admin/pages/facilities/indexPriceRules", {
    pageTitle: "Bảng giá"
  });
};


//[GET] /owner/facilities/price-rules/create
module.exports.create = (req, res) => {
    res.render("admin/pages/facilities/createPriceRules");
}