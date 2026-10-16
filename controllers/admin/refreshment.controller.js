const Venue = require("../../models/facilities.model");
const Refreshment = require("../../models/refreshment.model");

//[GET] /owner/refreshments
module.exports.index = async (req, res) => {
    const ownerId = res.locals.user.id;
    const venues = await Venue.find({
        owner_id: ownerId
    }).select("_id").lean();

    const venueIds = venues.map(item => item._id);

    const refreshments = await Refreshment.find({
        venueId: {
            $in: venueIds
        }
    }).populate("venueId", "name");

    res.render("admin/pages/refreshments/index",{
        pageTitle: "Giải khát",
        activeMenu: "refreshments",
        refreshments,
        venues
    });
}

//[GET] /owner/refreshments/create
module.exports.create = async (req, res) => {
    const ownerId = res.locals.user.id;


    const venues = await Venue.find({
        owner_id: ownerId
    });

    res.render("admin/pages/refreshments/create", {
        pageTitle: "Giải khát",
        activeMenu: "refreshments",
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

//[GET] /owner/refreshments/edit/:id
module.exports.edit = async(req, res) => {
    const refreshId = req.params.id;
    const ownerId = res.locals.user.id;

    const refreshment = await Refreshment.findOne({
        _id: refreshId
    }).populate("venueId", "name");

    const venues = await Venue.find({
        owner_id: ownerId
    });

    res.render("admin/pages/refreshments/edit", {
        pageTitle: "Giải khát",
        activeMenu: "refreshments",
        refreshment,
        venues
    });
}

//[PATCH] /owner/refreshments/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const refreshId = req.params.id;
        const {
            name,
            venueId,
            price,
            stock,
            supplier,
            status,
            image
        } = req.body;

        await Refreshment.updateOne({
            _id: refreshId
        },{
            name,
            venueId,
            price: Number(price),
            stock: Number(stock),
            supplier,
            status,
            image
        });

        req.flash("success", "Cập nhật nước uống thành công");
        res.redirect(req.get("Referrer"));
    } catch (error) {
        req.flash("error", "Cập nhật nước uống thất bại!");
        res.redirect(req.get("Referrer"));
    }
}