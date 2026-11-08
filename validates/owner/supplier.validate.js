const systemConfig = require("../../config/system");

function back(req, res) {
  const fallback = req.params.id
    ? `${systemConfig.prefixOwner}/drinks/suppliers/edit/${req.params.id}`
    : `${systemConfig.prefixOwner}/drinks/suppliers/create`;
  return res.redirect(req.get("Referrer") || fallback);
}

function readSupplier(body) {
  return {
    name: body.name ? body.name.trim().slice(0, 120) : "",
    phone: String(body.phone || "").replace(/\D/g, ""),
    address: body.address ? body.address.trim().slice(0, 200) : "",
    note: body.note ? body.note.trim().slice(0, 200) : "",
    status: body.status === "inactive" ? "inactive" : "active",
  };
}

function checkSupplier(req, res, next) {
  const data = readSupplier(req.body);
  if (!data.name) {
    req.flash("error", "Vui lòng nhập tên nhà cung cấp");
    return back(req, res);
  }
  if (data.phone && !/^0\d{9}$/.test(data.phone)) {
    req.flash("error", "Số điện thoại phải gồm 10 số và bắt đầu bằng 0");
    return back(req, res);
  }

  req.body.name = data.name;
  req.body.phone = data.phone;
  req.body.address = data.address;
  req.body.note = data.note;
  req.body.status = data.status;
  next();
}

module.exports.createPost = checkSupplier;
module.exports.editPatch = checkSupplier;
