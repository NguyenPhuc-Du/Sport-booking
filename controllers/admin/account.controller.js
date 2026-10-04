// [GET] /admin/accounts
module.exports.index = async (req, res) => {
  res.redirect(res.locals.prefixAdmin + "/users");
};
