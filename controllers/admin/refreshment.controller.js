const Venue = require("../../models/facilities.model");
const Refreshment = require("../../models/refreshment.model");

//[GET] /owner/refreshments
module.exports.index = async (req, res) => {
    res.render("admin/pages/refreshments/index");
}

//[GET] /owner/refreshments/create
module.exports.create = async (req, res) => {
    const ownerId = res.locals.user.id;


    const venues = await Venue.find({
        owner_id: ownerId
    });

    res.render("admin/pages/refreshments/create", {
        pageTitle: "Giải khát",
        venues
    });
}

//[POST] /owner/refreshments/create
module.exports.createPost = async (req, res) => {
    try {
        const refreshment = new Refreshment(req.body);
        await refreshment.save();

        req.flash("success", "Thêm mới nước uống thành công");
        res.redirect(req.get("Referrer"));

    } catch (error) {
        req.flash("error", "Thêm mới nước uống thất bại");
        res.redirect(req.get("Referrer"));
    }
}