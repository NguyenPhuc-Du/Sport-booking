const venueService = require("../../services/owner/facility.service");
const drinkService = require("../../services/owner/drink.service");
const saleService = require("../../services/owner/sale.service");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");

function salesPath(suffix = "") {
  return `${systemConfig.prefixOwner}/drinks/sales${suffix}`;
}

//[GET] /owner/drinks
module.exports.index = async (req, res) => {
    const ownerId = res.locals.user.id;
    const venues = await venueService.getAllVenueByOwnerId(ownerId);
    const venueIds = venues.map(item => item._id);
  
    const find = drinkService.buildDrinkFilterQuery(req.query, venueIds);

    const drinks = await drinkService.getDrinks(find);

    const stats = drinkService.calculateDrinkStats(drinks);

    res.render("owner/pages/drinks/index",{
        pageTitle: "Giải khát",
        activeMenu: "drinks",
        drinks,
        venues,
        filter: req.query,
        stats
    });
}

//[GET] /owner/drinks/create
module.exports.create = async (req, res) => {
    const ownerId = res.locals.user.id;

    const venues = await venueService.getAllVenueByOwnerId(ownerId);

    res.render("owner/pages/drinks/create", {
        pageTitle: "Giải khát",
        activeMenu: "drinks",
        venues
    });
}

//[POST] /owner/drinks/create
module.exports.createPost = async (req, res) => {
    try {
        await drinkService.createDrink(req.body);

        req.flash("success", "Đã thêm sản phẩm. Tồn đang là 0 — hãy lập phiếu nhập kho khi có hàng.");
        res.redirect(req.get("Referrer"));

    } catch (error) {
        req.flash("error", "Thêm mới nước uống thất bại");
        res.redirect(req.get("Referrer"));
    }
}

//[GET] /owner/drinks/edit/:id
module.exports.edit = async(req, res) => {
    const drinkId = req.params.id;
    const ownerId = res.locals.user.id;

    const drink = await drinkService.getDrinkWithVenueById(drinkId);
    const venues = await venueService.getAllVenueByOwnerId(ownerId);

    res.render("owner/pages/drinks/edit", {
        pageTitle: "Giải khát",
        activeMenu: "drinks",
        drink,
        venues
    });
}

//[PATCH] /owner/drinks/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const drinkId = req.params.id;
        
        await drinkService.updateDrink(drinkId, req.body);

        req.flash("success", "Cập nhật nước uống thành công");
        res.redirect(req.get("Referrer"));
    } catch (error) {
        req.flash("error", "Cập nhật nước uống thất bại!");
        res.redirect(req.get("Referrer"));
    }
}

module.exports.changeStatus = async (req, res) => {
    try {
        const drinkId = req.params.id;
        const status = req.body.status;

        await drinkService.updateDrinkStatus(drinkId, status);

        req.flash("success", "Cập nhật trạng thái nước uống thành công");
        res.redirect(req.get("Referrer"));
    } catch (error) {
        req.flash("error", "Cập nhật trạng thái nước uống thất bại!");
        res.redirect(req.get("Referrer"));
    }
}

//[GET] /owner/drinks/sales
module.exports.sales = async (req, res) => {
    const ownerId = res.locals.user.id;
    const venues = await venueService.getAllVenueByOwnerId(ownerId);
    const venueIds = venues.map((item) => item._id);
    const find = saleService.buildSaleFilter(req.query, venueIds);

    const count = await saleService.countSales(find);
    const pagination = paginationHelper({ limitPage: 10 }, req.query, count);
    const sales = await saleService.listSales(find, pagination);

    res.render("owner/pages/drinks/sales", {
        pageTitle: "Phiếu bán giải khát",
        activeMenu: "drinks",
        sales,
        venues,
        filter: req.query,
        pagination,
    });
};

//[GET] /owner/drinks/sales/create
module.exports.createSale = async (req, res) => {
    const { venues, catalog } = await saleService.getSaleCatalog(res.locals.user.id);

    res.render("owner/pages/drinks/create-sale", {
        pageTitle: "Tạo phiếu bán",
        activeMenu: "drinks",
        venues,
        catalog,
    });
};

//[POST] /owner/drinks/sales/create
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

//[GET] /owner/drinks/sales/:id
module.exports.saleDetail = async (req, res) => {
    const sale = await saleService.getSaleForOwner(res.locals.user.id, req.params.id);
    if (!sale) {
        req.flash("error", "Không tìm thấy phiếu bán");
        return res.redirect(salesPath());
    }

    res.render("owner/pages/drinks/sale-detail", {
        pageTitle: `Phiếu ${sale.code}`,
        activeMenu: "drinks",
        sale,
    });
};