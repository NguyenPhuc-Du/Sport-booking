const supplierService = require("../../services/owner/supplier.service");
const systemConfig = require("../../config/system");

function suppliersPath(suffix = "") {
  return `${systemConfig.prefixOwner}/drinks/suppliers${suffix}`;
}

module.exports.index = async (req, res) => {
  const suppliers = await supplierService.listSuppliers(res.locals.user.id, req.query);
  res.render("owner/pages/drinks/suppliers", {
    pageTitle: "Nhà cung cấp",
    activeMenu: "drinks",
    suppliers,
    filter: req.query,
  });
};

module.exports.create = (req, res) => {
  res.render("owner/pages/drinks/supplier-form", {
    pageTitle: "Thêm nhà cung cấp",
    activeMenu: "drinks",
    supplier: {},
    mode: "create",
  });
};

module.exports.createPost = async (req, res) => {
  try {
    await supplierService.createSupplier(res.locals.user.id, req.body);
    req.flash("success", "Đã thêm nhà cung cấp");
    return res.redirect(suppliersPath());
  } catch (error) {
    req.flash("error", error.message || "Thêm nhà cung cấp thất bại");
    return res.redirect(suppliersPath("/create"));
  }
};

module.exports.edit = async (req, res) => {
  const supplier = await supplierService.getSupplier(res.locals.user.id, req.params.id);
  if (!supplier) {
    req.flash("error", "Không tìm thấy nhà cung cấp");
    return res.redirect(suppliersPath());
  }

  res.render("owner/pages/drinks/supplier-form", {
    pageTitle: "Sửa nhà cung cấp",
    activeMenu: "drinks",
    supplier,
    mode: "edit",
  });
};

module.exports.editPatch = async (req, res) => {
  try {
    await supplierService.updateSupplier(res.locals.user.id, req.params.id, req.body);
    req.flash("success", "Đã cập nhật nhà cung cấp");
    return res.redirect(suppliersPath());
  } catch (error) {
    req.flash("error", error.message || "Cập nhật nhà cung cấp thất bại");
    return res.redirect(suppliersPath(`/edit/${req.params.id}`));
  }
};

module.exports.changeStatus = async (req, res) => {
  try {
    await supplierService.updateSupplierStatus(
      res.locals.user.id,
      req.params.id,
      req.body.status,
    );
    req.flash("success", "Đã cập nhật trạng thái nhà cung cấp");
  } catch (error) {
    req.flash("error", error.message || "Cập nhật trạng thái thất bại");
  }
  return res.redirect(req.get("Referrer") || suppliersPath());
};
