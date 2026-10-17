const Venue = require("../../models/facilities.model");

// [GET] /owner/facilities/price-rules
module.exports.index = async (req, res) => {
  res.render("owner/pages/facilities/indexPriceRules", {
    pageTitle: "Bảng giá"
  });
};


//[GET] /owner/facilities/price-rules/create
module.exports.create = async (req, res) => {
  const ownerId = res.locals.user.id;

  const venues = await Venue.find({
    owner_id: ownerId,
    status: "active"
  });

  res.render("owner/pages/facilities/createPriceRules", {
    pageTitle: "Cấu hình quy tắc giá",
    error: null,
    values: {},
    sports: [],
    courts: [],
    venues
  });
};