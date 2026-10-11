const User = require("../../models/user.model");

module.exports.updatePatch = async (req, res, next) => {
  const id = res.locals.user.id;
  const { fullName, phone, email } = req.body;

  if (!fullName || !phone || !email) {
    req.flash("error", "Vui lòng không bỏ trống thông tin");
    return res.redirect(req.get("Referrer"));
  }

  if (!/^0\d{9}$/.test(phone)) {
    req.flash("error", "Số điện thoại không đúng định dạng");
    res.redirect(req.get("Referrer"));
    return;
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
    req.flash("error", "Email không đúng định dạng");
    res.redirect(req.get("Referrer"));
    return;
  }

  const isDuplicate = await User.findOne(
    {
      _id: {
        $ne: id,
      },
    $or: [
        {
            email: email.trim()
        },
        {
            phone
        }
    ]
}
  );

  if (isDuplicate) {
    req.flash("error", "Thông tin bị trùng");
    return res.redirect(req.get("Referrer"));
  }

  next();
};
