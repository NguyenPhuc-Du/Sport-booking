const asyncHandler = require("../../middlewares/admin/async-handler");
const commission = require("../../services/admin/commission.service");
const ledger = require("../../services/admin/ledger.service");
const rate = require("../../services/admin/rate.service");
const { ServiceError } = require("../../services/admin/auth.service");

function fail(req, res, error, tab) {
  const message =
    error instanceof ServiceError ? error.message : "Thao tác thất bại";
  req.flash("error", message);
  return res.redirect(
    tab ? `/admin/commissions?tab=${tab}` : "/admin/commissions",
  );
}

const index = asyncHandler(async (req, res) => {
  await ledger.syncPaidBookings();
  const data = await commission.page(req.query);
  res.render("admin/pages/platform/commissions", {
    pageTitle: "Hoa hồng",
    activeMenu: "commissions",
    ...data,
  });
});

const save = asyncHandler(async (req, res) => {
  try {
    await rate.saveSetting(req.user._id, req.body);
    req.flash("success", "Đã lưu cấu hình hoa hồng");
  } catch (error) {
    return fail(req, res, error, "config");
  }
  return res.redirect("/admin/commissions?tab=config");
});

const ownerRate = asyncHandler(async (req, res) => {
  try {
    await rate.saveOwnerRate(req.user._id, req.body);
    req.flash("success", "Đã lưu tỷ lệ riêng");
  } catch (error) {
    return fail(req, res, error, "config");
  }
  return res.redirect("/admin/commissions?tab=config");
});

const close = asyncHandler(async (req, res) => {
  try {
    await commission.closePeriod(req.user._id, req.body);
    req.flash("success", "Đã chốt kỳ");
  } catch (error) {
    return fail(req, res, error);
  }
  const query = new URLSearchParams({
    from: req.body.from,
    to: req.body.to,
    cycle: req.body.cycle || "",
  });
  return res.redirect(`/admin/commissions?${query.toString()}`);
});

module.exports = { index, save, ownerRate, close };
