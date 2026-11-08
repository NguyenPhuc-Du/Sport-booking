const asyncHandler = require("../../middlewares/admin/async-handler");
const ledger = require("../../services/admin/ledger.service");
const { ServiceError } = require("../../services/admin/auth.service");

const index = asyncHandler(async (req, res) => {
  const data = await ledger.list(req.query);
  res.render("admin/pages/platform/ledger", {
    pageTitle: "Sổ cái",
    activeMenu: "ledger",
    ...data,
  });
});

const exportCsv = asyncHandler(async (req, res) => {
  const file = await ledger.csv(req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=so-cai.csv");
  res.send(file);
});

const adjust = asyncHandler(async (req, res) => {
  try {
    await ledger.adjust(req.user._id, req.body);
    req.flash("success", "Đã ghi bút toán điều chỉnh");
  } catch (error) {
    const message =
      error instanceof ServiceError ? error.message : "Không ghi được bút toán";
    req.flash("error", message);
  }
  return res.redirect("/admin/ledger");
});

module.exports = { index, exportCsv, adjust };
