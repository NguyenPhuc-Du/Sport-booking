const Setting = require("../../models/platform-setting.model");
const OwnerRate = require("../../models/owner-rate.model");
const User = require("../../models/user.model");
const { ServiceError } = require("./auth.service");
const audit = require("./audit.service");
const { percentLabel } = require("./present");
const { CYCLE_CODES } = require("./catalog");

async function readSetting() {
  const found = await Setting.findOne({ key: "commission" }).lean();
  return {
    commissionRate: found ? found.commissionRate : 0.05,
    payoutCycle: found ? found.payoutCycle : "weekly",
    minPayout: found ? found.minPayout : 1000000,
  };
}

async function resolveRate(ownerId) {
  if (ownerId) {
    const own = await OwnerRate.findOne({ user_id: ownerId }).lean();
    if (own && Number.isFinite(own.commissionRate)) return own.commissionRate;
  }
  const setting = await readSetting();
  return setting.commissionRate;
}

async function saveSetting(actorId, body) {
  const percent = Number(body.ratePercent);
  const minPayout = Number(body.minPayout);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ServiceError("Tỷ lệ hoa hồng từ 0 đến 100");
  }
  if (!CYCLE_CODES.includes(body.cycle)) {
    throw new ServiceError("Chu kỳ không hợp lệ");
  }
  if (!Number.isFinite(minPayout) || minPayout < 0) {
    throw new ServiceError("Hạn mức không hợp lệ");
  }

  const before = await readSetting();
  await Setting.findOneAndUpdate(
    { key: "commission" },
    {
      key: "commission",
      commissionRate: percent / 100,
      payoutCycle: body.cycle,
      minPayout,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await audit.write(
    actorId,
    "commission.rate",
    null,
    `${percentLabel(before.commissionRate)} → ${percent}% · ${body.cycle} · hạn mức ${minPayout}`,
  );
}

async function listOverrides() {
  return OwnerRate.find().populate("user_id", "fullName email").lean();
}

async function saveOwnerRate(actorId, body) {
  const percent = Number(body.ratePercent);
  const user = await User.findOne({ _id: body.userId, role: "OWNER" }).lean();
  if (!user) throw new ServiceError("Chỉ đặt tỷ lệ cho tài khoản chủ sân");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ServiceError("Tỷ lệ hoa hồng từ 0 đến 100");
  }

  await OwnerRate.findOneAndUpdate(
    { user_id: user._id },
    { user_id: user._id, commissionRate: percent / 100 },
    { upsert: true, new: true },
  );
  await audit.write(
    actorId,
    "commission.ownerRate",
    user._id,
    `${user.fullName} · ${percent}%`,
  );
}

module.exports = {
  readSetting,
  resolveRate,
  saveSetting,
  listOverrides,
  saveOwnerRate,
};
