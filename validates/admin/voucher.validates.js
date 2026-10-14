module.exports.creatPost = (req, res, next) => {
  if (
    !req.body.code ||
    !req.body.name ||
    !req.body.discount_type ||
    !req.body.venue_id ||
    !req.body.discount_value ||
    !req.body.quantity ||
    !req.body.start_date ||
    !req.body.end_date
  ) {
    req.flash("error", "vui lòng nhập tiêu đề");
    res.redirect(req.get("Referer"));
    return;
  }
  next();
};
