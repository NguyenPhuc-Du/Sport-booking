const User = require("../models/user.model");

module.exports.checkRole = async (role) => {
    const id = res.locals.user.id;

    const isTrueRole = await User.findOne({
        _id: id,
        role: role
    });

    if(!isTrueRole) {
        req.flash("error", "Cấp bậc không hợp lệ");
        res.redirect(req.get("Referrer"));
        return;
    }

    next();
}