const Venue = require("../../models/facilities.model");
const Refreshment = require("../../models/refreshment.model");
const searchHelper = require("../../helpers/search");

//[GET] /owner/refreshments
module.exports.index = async (req, res) => {
    const ownerId = res.locals.user.id;
    const venues = await Venue.find({
        owner_id: ownerId
    }).select("_id name").lean();

    const venueIds = venues.map(item => item._id);
  
    const status = req.query.status;
    const venueIdQuery = req.query.venueId;

    let find = {};
    
    const objectSearch = searchHelper(req.query);
    if (objectSearch.regex) {
        find.name = objectSearch.regex;
    }

    if(status == "low"){
        find.stock = {
            $lte: 10
        };
    } else if(status === "active" || status === "inactive") {
        find.status = status;
    }

    // Xử lý lọc theo venueId
    if (venueIdQuery && venueIds.some(id => String(id) === String(venueIdQuery))) {
        find.venueId = venueIdQuery;
    } else {
        find.venueId = { $in: venueIds };
    }

    const refreshments = await Refreshment.find(find).populate("venueId", "name");

    const stats = {
        total: refreshments.length,
        active: refreshments.filter((item) => item.status === "active").length,
        inactive: refreshments.filter((item) => item.status === "inactive").length,
        lowStock: refreshments.filter((item) => Number(item.stock) <= 10).length,
        stockValue: refreshments.reduce((sum, item) => {
            return sum + (Number(item.price) || 0) * (Number(item.stock) || 0);
        }, 0)
    }

    res.render("admin/pages/refreshments/index",{
        pageTitle: "Giải khát",
        activeMenu: "refreshments",
        refreshments,
        venues,
        filter: req.query,
        stats
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

module.exports.changeStatus = async (req, res) => {
    try {
        const refreshId = req.params.id;
        const status = req.body.status;

        await Refreshment.updateOne({
            _id: refreshId
        }, {
            status
        });

        req.flash("success", "Cập nhật trạng thái nước uống thành công");
        res.redirect(req.get("Referrer"));
    } catch (error) {
        req.flash("error", "Cập nhật trạng thái nước uống thất bại!");
        res.redirect(req.get("Referrer"));
    }
}