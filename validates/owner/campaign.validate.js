module.exports.createPost = (req, res, next) => {
  const { name, venue_id, start_date, end_date } = req.body;
  if (!name || !venue_id || !start_date || !end_date) {
    req.flash("error", "Vui lòng nhập đủ thông tin chương trình");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }
  if (new Date(end_date) <= new Date(start_date)) {
    req.flash("error", "Ngày kết thúc phải sau ngày bắt đầu");
    return res.redirect(req.get("Referer") || "/owner/finance");
  }
  next();
};

module.exports.editPatch = module.exports.createPost;
