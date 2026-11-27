const asyncHandler = require("../../middlewares/admin/async-handler");
const commission = require("../../services/admin/commission.service");
const rate = require("../../services/admin/rate.service");
const { ServiceError } = require("../../services/admin/auth.service");

function fail(req, res, error) {
  const message =
    error instanceof ServiceError ? error.message : "Thao tác thất bại";
  req.flash("error", message);
  return res.redirect("/admin/commissions");
}

const index = asyncHandler(async (req, res) => {
  const data = await commission.page(req.query);
  const tab = req.query.tab === "cau-hinh" ? "cau-hinh" : "doi-soat";
  const cauHinh = tab === "cau-hinh" ? await rate.bangCauHinh(req.query) : null;
  res.render("admin/pages/platform/commissions", {
    pageTitle: "Hoa hồng và đối soát",
    activeMenu: "commissions",
    tab,
    cauHinh,
    ...data,
  });
});

const luuCauHinh = asyncHandler(async (req, res) => {
  try {
    await rate.luu(req.body, req.user._id);
    req.flash("success", "Đã lưu tỷ lệ. Chỉ giao dịch sau ngày hiệu lực dùng tỷ lệ mới.");
  } catch (error) {
    req.flash("error", error.message || "Không lưu được tỷ lệ");
  }
  return res.redirect("/admin/commissions?tab=cau-hinh");
});

const close = asyncHandler(async (req, res) => {
  try {
    await commission.closePeriod(req.user._id, req.body);
    req.flash("success", "Đã chốt giá kỳ này");
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

const collect = asyncHandler(async (req, res) => {
  try {
    const count = await commission.danhDauDaThu(req.body.ownerId, req.body);
    req.flash("success", count ? `Đã đánh dấu đã thu ${count} dòng` : "Không còn dòng nào cần đánh dấu");
  } catch (error) {
    return fail(req, res, error);
  }
  return res.redirect("/admin/commissions");
});

module.exports = { index, close, collect, luuCauHinh };
