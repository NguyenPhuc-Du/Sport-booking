const User = require("../../models/user.model");
const UserRole = require("../../models/user-role.model");
const jwt = require("jsonwebtoken");

module.exports.login = async (req, res) =>{
    res.render("client/pages/auth/login", {
        pageTitle: "Đăng nhập"
    });
}

module.exports.loginPost = async (req, res) => {
    const email = req.body.email;

    const user = await User.findOne({
        email: email,
        status: "active"
    }).select("-password_hash").lean();

    const recordUser = {
        id: user._id,
        email: email,
        phone: user.phone
    }

    const accessToken = jwt.sign(
        recordUser,
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    )

    res.cookie("access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 1000,
    });

    if(user.role == "OWNER"){
        return res.redirect("/owner/dashboard");
    } 

    return res.redirect("/");
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