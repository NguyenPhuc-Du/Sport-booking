const Audit = require("../../models/admin-audit.model");
const { byCode, AUDIT_ACTIONS } = require("./catalog");

async function write(actorId, action, targetId, detail) {
  await Audit.create({
    actor_id: actorId,
    action,
    target_id: targetId || null,
    detail: String(detail || ""),
  });
}

async function list(filter) {
  const rows = await Audit.find(filter || {})
    .populate("actor_id", "fullName email")
    .sort({ created_at: -1 })
    .limit(50)
    .lean();

  return rows.map((row) => {
    const action = byCode(AUDIT_ACTIONS, row.action);
    return {
      when: row.created_at
        ? new Date(row.created_at).toLocaleString("vi-VN")
        : "—",
      actorName: row.actor_id ? row.actor_id.fullName : "—",
      actionLabel: action ? action.label : row.action,
      detail: row.detail || "",
    };
  });
}

module.exports = { write, list };
