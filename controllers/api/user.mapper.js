const store = require("../../services/user-app.store");

function toUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url || null,
    status: user.status,
    walletBalance: store.balanceOf(user._id),
  };
}

module.exports = { toUser };
