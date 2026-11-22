function back(req, res, message) {
  req.flash("error", message);
  return res.redirect(req.get("Referrer") || "/admin/roles");
}

function create(req, res, next) {
  const missingName = !String(req.body.name || "").trim();
  const missingCode = !String(req.body.code || "").trim();
  if (missingName || missingCode) return back(req, res, "Nhập mã và tên vai trò");
  return next();
}

function update(req, res, next) {
  if (!String(req.body.name || "").trim()) return back(req, res, "Nhập tên vai trò");
  return next();
}

module.exports = { create, update };
