const venueService = require("../../services/owner/facility.service");
const drinkService = require("../../services/owner/drink.service");
const saleService = require("../../services/owner/sale.service");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");
const { taiExcel } = require("../../helpers/xuat-excel");
const { xuatPhieu, tien, gio } = require("../../helpers/xuat-pdf");

function salesPath(suffix = "") {
  return `${systemConfig.prefixOwner}/drinks/sales${suffix}`;
}

module.exports.index = async (req, res) => {
    const { venues, drinks } = await drinkService.danhSachDaNho(res.locals.user.id);
    const stats = drinkService.calculateDrinkStats(drinks);

    res.render("owner/pages/drinks/index",{
        pageTitle: "Giải khát",
        activeMenu: "drinks",
        drinks,
        venues,
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
        await drinkService.createDrink(res.locals.user.id, req.body);

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
        
        await drinkService.updateDrink(res.locals.user.id, drinkId, req.body);

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

        await drinkService.updateDrinkStatus(res.locals.user.id, drinkId, status);

        req.flash("success", "Cập nhật trạng thái nước uống thành công");
        res.redirect(req.get("Referrer"));
    } catch (error) {
        req.flash("error", "Cập nhật trạng thái nước uống thất bại!");
        res.redirect(req.get("Referrer"));
    }
}

async function saleLoc(req, res) {
    const venues = await venueService.getAllVenueByOwnerId(res.locals.user.id);
    const venueIds = venues.map((item) => item._id);
    const { find, filter } = saleService.buildSaleFilter(req.query, venueIds);
    return { venues, find, filter };
}

const CACH_TRA = { cash: "Tiền mặt", vnpay: "Chuyển khoản" };

function dongBan(sale) {
    const at = sale.paidAt || sale.createdAt;
    return {
        code: sale.code || "",
        time: gio(at),
        guest: sale.guestName || "",
        phone: sale.guestPhone || "",
        venue: sale.venueName || "",
        pay: CACH_TRA[sale.paymentMethod] || sale.paymentMethod || "",
        status: sale.status === "cancelled" ? "Đã hủy" : "Đã thu",
        amount: Number(sale.amount) || 0,
        items: (sale.items || []).map((line) => `${line.name} x${line.qty}`).join(", "),
    };
}

module.exports.sales = async (req, res) => {
    const { venues, find, filter } = await saleLoc(req, res);
    const tong = await saleService.tongTheoLoc(find);
    const pagination = paginationHelper({ limitPage: 8 }, req.query, tong.soPhieu);
    const sales = tong.soPhieu ? await saleService.listSales(find, pagination) : [];

    res.render("owner/pages/drinks/sales", {
        pageTitle: "Phiếu bán giải khát",
        activeMenu: "drinks",
        sales,
        venues,
        filter,
        pagination,
        tongTien: tong.tongTien,
        soPhieu: tong.soPhieu,
    });
};

//[GET] /owner/drinks/sales/export
module.exports.exportSales = async (req, res) => {
    const { find } = await saleLoc(req, res);
    const sales = await saleService.listAllSales(find);
    await taiExcel(res, "phieu-ban.xlsx", [
        { header: "Mã phiếu", key: "code", width: 22 },
        { header: "Thời gian", key: "time", width: 22 },
        { header: "Khách", key: "guest", width: 24 },
        { header: "Số điện thoại", key: "phone", width: 16 },
        { header: "Cơ sở", key: "venue", width: 24 },
        { header: "Thanh toán", key: "pay", width: 16 },
        { header: "Trạng thái", key: "status", width: 14 },
        { header: "Tổng tiền", key: "amount", width: 14 },
        { header: "Món", key: "items", width: 40 },
    ], sales.map(dongBan));
};

//[GET] /owner/drinks/sales/:id/pdf
module.exports.salePdf = async (req, res) => {
    const sale = await saleService.findOwnedSale(res.locals.user.id, req.params.id);
    if (!sale) return res.status(404).type("text/plain").send("Không thấy phiếu bán");
    const row = dongBan(sale);
    xuatPhieu(res, `${sale.code}.pdf`, {
        tieuDe: "Phiếu bán nước",
        thongTin: [
            ["Mã phiếu", row.code],
            ["Thời gian", row.time],
            ["Khách", row.guest],
            ["Số điện thoại", row.phone],
            ["Cơ sở", row.venue],
            ["Thanh toán", row.pay],
            ["Trạng thái", row.status],
        ],
        mon: (sale.items || []).map((line) => ({
            ten: line.name,
            sl: line.qty,
            tien: tien(line.lineTotal),
        })),
        tongNhan: "Tổng thu",
        tong: tien(sale.amount),
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
        return res.redirect(salesPath());
    } catch (error) {
        req.flash("error", error.message || "Tạo phiếu bán thất bại");
        return res.redirect(salesPath("/create"));
    }
};