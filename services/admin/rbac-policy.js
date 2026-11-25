const ServiceError = require("./service-error");

const SECRET_KEYS = ["password", "password_hash", "newPassword"];

function deny(message) {
  throw new ServiceError(message);
}

function sameId(left, right) {
  return String(left) === String(right);
}

function includesAll(owned, wanted) {
  const granted = new Set(owned || []);
  return (wanted || []).every((code) => granted.has(code));
}

function assertSelf(actorId, targetId, message) {
  if (sameId(actorId, targetId)) deny(message);
}

function assertCanTouchProtected(actorPermissions, targetIsProtected) {
  if (!targetIsProtected) return;
  if ((actorPermissions || []).includes("system:override")) return;
  deny("Không được thao tác lên tài khoản quản trị cao nhất");
}

function assertCanGrant(actorPermissions, rolePermissions) {
  const owned = actorPermissions || [];
  // Super Admin có system:override nên được gán cả vai trò có quyền mà mình không dùng, ví dụ trang hồ sơ.
  if (owned.includes("system:override")) return;
  if (includesAll(owned, rolePermissions)) return;
  deny("Không được cấp quyền cao hơn quyền của bạn");
}

function assertKeepLastProtected({ wasProtected, willBeProtected, protectedCount }) {
  const isLastProtected =
    wasProtected && !willBeProtected && (Number(protectedCount) || 0) <= 1;
  if (isLastProtected) deny("Phải giữ ít nhất một tài khoản quản trị cao nhất");
}

function assertDeletableRole(role, userCount) {
  if (role.is_system) deny("Không xóa vai trò của hệ thống");
  if (userCount > 0) {
    deny(
      `Vai trò đang có ${userCount} tài khoản. Chuyển họ sang vai trò khác trước khi xóa`,
    );
  }
}

function stripSecrets(value) {
  if (!value || typeof value !== "object") return value;
  const copy = { ...value };
  SECRET_KEYS.forEach((key) => delete copy[key]);
  return copy;
}

module.exports = {
  sameId,
  includesAll,
  assertSelf,
  assertCanTouchProtected,
  assertCanGrant,
  assertKeepLastProtected,
  assertDeletableRole,
  stripSecrets,
};
