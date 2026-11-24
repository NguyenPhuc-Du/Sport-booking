const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeProductIds(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(String).filter(Boolean);
}

module.exports.creatPost = (req, res, next) => {
  const {
    code,
    name,
    discount_type,
    discount_value,
    quantity,
    campaign_id,
    apply_scope,
    day_type,
    time_start,
    time_end,
  } = req.body;

  if (
    !code ||
    !name ||
    !discount_type ||
    !discount_value ||
    !quantity ||
    !campaign_id
  ) {
    req.flash("error", "Vui lòng nhập đủ thông tin voucher");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }

  const scope = apply_scope || "court";
  if (!["court", "drink", "order"].includes(scope)) {
    req.flash("error", "Loại áp dụng không hợp lệ");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }
  if (day_type && !["all", "weekday", "weekend"].includes(day_type)) {
    req.flash("error", "Loại ngày không hợp lệ");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }

  const start = (time_start || "").trim();
  const end = (time_end || "").trim();
  if ((start && !HHMM.test(start)) || (end && !HHMM.test(end))) {
    req.flash("error", "Khung giờ phải dạng HH:mm");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }
  if ((start && !end) || (!start && end)) {
    req.flash("error", "Nhập đủ giờ bắt đầu và kết thúc, hoặc để trống cả hai");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }
  if (start && end && end <= start) {
    req.flash("error", "Giờ kết thúc phải sau giờ bắt đầu");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }

  if (scope === "drink" && !normalizeProductIds(req.body.product_ids).length) {
    req.flash("error", "Voucher đồ uống cần chọn ít nhất 1 sản phẩm");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }

  next();
};

module.exports.editPatch = module.exports.creatPost;
