const venueService = require("../../services/owner/facility.service");
const refreshmentService = require("../../services/owner/refreshment.service");
const saleService = require("../../services/owner/sale.service");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");

function salesPath(suffix = "") {
  return `${systemConfig.prefixOwner}/refreshments/sales${suffix}`;
}

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

//[GET] /owner/refreshments/sales
module.exports.sales = async (req, res) => {
    const ownerId = res.locals.user.id;
    const venues = await venueService.getAllVenueByOwnerId(ownerId);
    const venueIds = venues.map((item) => item._id);
    const find = saleService.buildSaleFilter(req.query, venueIds);

    const count = await saleService.countSales(find);
    const pagination = paginationHelper({ limitPage: 10 }, req.query, count);
    const sales = await saleService.listSales(find, pagination);

    res.render("owner/pages/refreshments/sales", {
        pageTitle: "Phiếu bán giải khát",
        activeMenu: "refreshments",
        sales,
        venues,
        filter: req.query,
        pagination,
    });
};

//[GET] /owner/refreshments/sales/create
module.exports.createSale = async (req, res) => {
    const { venues, catalog } = await saleService.getSaleCatalog(res.locals.user.id);

    res.render("owner/pages/refreshments/create-sale", {
        pageTitle: "Tạo phiếu bán",
        activeMenu: "refreshments",
        venues,
        catalog,
    });
};

//[POST] /owner/refreshments/sales/create
module.exports.createSalePost = async (req, res) => {
    try {
        const sale = await saleService.createWalkInSale(res.locals.user.id, req.body);
        req.flash("success", `Đã tạo phiếu ${sale.code}`);
        return res.redirect(salesPath(`/${sale._id}`));
    } catch (error) {
        req.flash("error", error.message || "Tạo phiếu bán thất bại");
        return res.redirect(salesPath("/create"));
    }
};

//[GET] /owner/refreshments/sales/:id
module.exports.saleDetail = async (req, res) => {
    const sale = await saleService.getSaleForOwner(res.locals.user.id, req.params.id);
    if (!sale) {
        req.flash("error", "Không tìm thấy phiếu bán");
        return res.redirect(salesPath());
    }

    res.render("owner/pages/refreshments/sale-detail", {
        pageTitle: `Phiếu ${sale.code}`,
        activeMenu: "refreshments",
        sale,
    });
};