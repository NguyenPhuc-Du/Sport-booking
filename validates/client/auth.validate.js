const User = require("../../models/user.model");

module.exports.registerPost = async (req, res,next ) =>{
    if(!req.body.fullName || !req.body.fullName.trim()){
        req.flash("error","Họ tên không được để trống");
        res.redirect(req.get("Referrer"));
        return;
    }

    if(!req.body.password){
        req.flash("error", "Mật khẩu không được để trống");
        res.redirect(req.get("Referrer"));
        return;
    }

    if(!req.body.phone){
        req.flash("error", "Số điện thoại không được để trống");
        res.redirect(req.get("Referrer"));
        return;
    }

    if(!(/^0\d{9}$/).test(req.body.phone)){
        req.flash("error", "Số điện thoại không được để trống");
        res.redirect(req.get("Referrer"));
        return;
    }

    const email = (req.body.email || "").trim();

    if(!email){
        req.flash("error","Email không được để trống");
        res.redirect(req.get("Referrer"));
        return;
    }

    if(!(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/).test(email)){
        req.flash("error","Email không đúng định dạng");
        res.redirect(req.get("Referrer"));
        return;
    }

    const isExistUser = await User.findOne({
        $or: [
            {
                email: req.body.email
            },
            {
                phone: req.body.phone
            }
        ]
    });

    if (isExistUser) {
        if (isExistUser.email === email) {
            req.flash("error", "Email này đã được đăng ký!");
        } else {
            req.flash("error", "Số điện thoại này đã được đăng ký!");
        }
        res.redirect(req.get("Referrer"));
        return;
    }

    next();
}