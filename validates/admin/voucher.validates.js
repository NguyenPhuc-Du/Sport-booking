module.exports.creatPost = (req, res, next) => {
  const { code, name, discount_type, discount_value, quantity, campaign_id } =
    req.body;
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
  next();
};

module.exports.editPatch = module.exports.creatPost;
