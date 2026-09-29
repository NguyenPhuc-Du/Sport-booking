
// [GET] /admin/accounts/index
module.exports.index = async (req, res) => {
    res.render("admin/pages/accounts/index", {
        pageTitle: "Trang tài khoản"
    });
}