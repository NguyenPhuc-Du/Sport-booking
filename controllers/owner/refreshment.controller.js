const venueService = require("../../services/owner/facility.service");
const refreshmentService = require("../../services/owner/refreshment.service");

//[GET] /owner/refreshments
module.exports.index = async (req, res) => {
    const ownerId = res.locals.user.id;
    const venues = await venueService.getAllVenueByOwnerId(ownerId);
    const venueIds = venues.map(item => item._id);
  
    const find = refreshmentService.buildRefreshmentFilterQuery(req.query, venueIds);

    const refreshments = await refreshmentService.getRefreshments(find);

    const stats = refreshmentService.calculateRefreshmentStats(refreshments);

    res.render("owner/pages/refreshments/index",{
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

    const venues = await venueService.getAllVenueByOwnerId(ownerId);

    res.render("owner/pages/refreshments/create", {
        pageTitle: "Giải khát",
        activeMenu: "refreshments",
        venues
    });
}

//[POST] /owner/refreshments/create
module.exports.createPost = async (req, res) => {
    try {
        await refreshmentService.createAnRefreshment(req.body);

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

    const refreshment = await refreshmentService.getRefreshmentWithVenueById(refreshId);
    const venues = await venueService.getAllVenueByOwnerId(ownerId);

    res.render("owner/pages/refreshments/edit", {
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
        
        await refreshmentService.updateRefreshment(refreshId, req.body);

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

        await refreshmentService.updateRefreshmentStatus(refreshId, status);

        req.flash("success", "Cập nhật trạng thái nước uống thành công");
        res.redirect(req.get("Referrer"));
    } catch (error) {
        req.flash("error", "Cập nhật trạng thái nước uống thất bại!");
        res.redirect(req.get("Referrer"));
    }
}