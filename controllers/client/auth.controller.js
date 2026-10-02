module.exports.login = async (req, res) =>{
    res.render("client/pages/auth/login", {
        pageTitle: "Đăng nhập"
    });
}