const mongoose = require("mongoose");
const Audit = require("../../models/admin-audit.model");
const User = require("../../models/user.model");
const { byCode, AUDIT_ACTIONS } = require("./catalog");
const { stripSecrets } = require("./rbac-policy");

async function write(actorId, action, targetId, detail, extra) {
  const more = extra || {};
  await Audit.create({
    actor_id: actorId,
    action,
    target_id: targetId || null,
    target_type: more.targetType || "",
    detail: String(detail || ""),
    ip: more.ip || "",
    before: more.before ? stripSecrets(more.before) : null,
    after: more.after ? stripSecrets(more.after) : null,
  });
}

function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

async function search(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = 8;
  const actors = await User.find().select("fullName email").sort({ fullName: 1 }).lean();
  const view = {
    actors,
    actor: query.actor || "",
    action: query.action || "",
    from: query.from || "",
    to: query.to || "",
  };
  if (query.actor && !mongoose.Types.ObjectId.isValid(query.actor)) {
    return { ...view, audits: [], page: 1, pages: 1, total: 0 };
  }

  const filter = {};
  if (query.actor) filter.actor_id = query.actor;
  if (query.action) filter.action = query.action;
  if (query.from || query.to) {
    filter.created_at = {};
    if (query.from) filter.created_at.$gte = new Date(query.from);
    if (query.to) filter.created_at.$lte = endOfDay(query.to);
  }

  const total = await Audit.countDocuments(filter);
  const rows = await Audit.find(filter)
    .populate("actor_id", "fullName email")
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    ...view,
    audits: rows.map(present),
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
    total,
  };
}

function present(row) {
  const action = byCode(AUDIT_ACTIONS, row.action);
  return {
    when: row.created_at
      ? new Date(row.created_at).toLocaleString("vi-VN")
      : "—",
    actorName: row.actor_id ? row.actor_id.fullName : "—",
    actionLabel: action ? action.label : row.action,
    action: row.action,
    detail: row.detail || "",
    ip: row.ip || "—",
    beforeText: row.before ? JSON.stringify(row.before) : "—",
    afterText: row.after ? JSON.stringify(row.after) : "—",
  };
}

async function list(filter) {
  const rows = await Audit.find(filter || {})
    .populate("actor_id", "fullName email")
    .sort({ created_at: -1 })
    .limit(50)
    .lean();
  return rows.map(present);
}

module.exports = { write, list, search };
