const bcrypt = require("bcrypt");
const User = require("../../models/user.model");
const UserRole = require("../../models/user-role.model");

module.exports.login = async (req, res) =>{
    res.render("client/pages/auth/login", {
        pageTitle: "Đăng nhập"
    });
}

module.exports.loginPost = async (req, res) => {
    const role = res.locals.user.role;

    if(role == "OWNER"){
        res.redirect("/owner/dashboard");
    } else if (role == "USER") {
        res.redirect("/");
    }
}

module.exports.register = (req, res) => {
    res.render("client/pages/auth/register", {
        pageTitle: "Đăng kí"
    });
}

module.exports.registerPost = async (req, res) => {
    try {
        const {
            fullName,
            phone,
            email,
            password
        } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        await User.create({
            fullName,
            phone,
            email,
            password_hash: hashedPassword,
            role: "USER"
        });

        req.flash("success", "Đăng kí thành công");
        return res.redirect("/auth/login");

    } catch (error) {
        req.flash("error", "Đăng kí thất bại");
        return res.redirect("/auth/register");
    }
}