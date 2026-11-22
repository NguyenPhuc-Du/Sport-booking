const asyncHandler = require("../../middlewares/admin/async-handler");
const audit = require("../../services/admin/audit.service");
const { AUDIT_ACTIONS } = require("../../services/admin/catalog");

const index = asyncHandler(async (req, res) => {
  const data = await audit.search(req.query);
  res.render("admin/pages/platform/audit", {
    pageTitle: "Nhật ký thao tác",
    activeMenu: "audit",
    actions: AUDIT_ACTIONS,
    ...data,
  });
});

module.exports = { index };
