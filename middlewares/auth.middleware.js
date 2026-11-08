const jwt = require("jsonwebtoken");
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

module.exports.requireAuth = async (req, res, next) => {
    const accessToken = req.cookies.access_token;

    if (!accessToken || typeof accessToken !== "string") {
        return res.redirect("/auth/login");
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password_hash").lean();

        if (!user || user.status !== "active") {
            res.clearCookie("access_token");
            return res.redirect("/auth/login");
        }

        res.locals.user = user;
        res.locals.user.id = user._id.toString();
        return next();
    } catch (error) {
        // Token cũ / JWT_SECRET đổi / chữ ký không khớp → xóa cookie và bắt login lại
        res.clearCookie("access_token");
        return res.redirect("/auth/login");
    }
};