function toUser(user) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatar_url || null,
    status: user.status,
  };
}

module.exports = { toUser };
