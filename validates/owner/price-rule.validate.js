const mongoose = require("mongoose");
const Venue = require("../../models/facilities.model");
const Court = require("../../models/court.model");
const PriceRule = require("../../models/price-rule.model");

async function checkDuplicatedTime({
  court,
  dayType,
  timeStart,
  timeEnd,
  excludeId,
}) {
  const dayTypes =
    dayType === "all" ? ["weekday", "weekend", "all"] : [dayType, "all"];
  const query = {
    court,
    status: "active",
    dayType: {
      $in: dayTypes,
    },
    timeStart: {
      $lt: timeEnd,
    },
    timeEnd: {
      $gt: timeStart,
    },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return PriceRule.findOne(query);
}

module.exports.createPost = async (req, res, next) => {
  const ownerId = res.locals.user.id;
  const { dayType, court } = req.body;

  if (!(req.body.name || "").trim()) {
    req.flash("error", "Vui lòng không bỏ trống tên khung giá");
    return res.redirect(req.get("Referrer"));
  }

  if (!req.body.venueId) {
    req.flash("error", "Vui lòng không bỏ trống cơ sở");
    return res.redirect(req.get("Referrer"));
  }

  const isRightVenue = await Venue.findOne({
    _id: req.body.venueId,
    owner_id: ownerId,
    deleted: false,
  });

  if (!isRightVenue) {
    req.flash("error", "Cơ sở không tồn tại");
    return res.redirect(req.get("Referrer"));
  }

  if (!mongoose.Types.ObjectId.isValid(req.body.venueId)) {
    req.flash("error", "Cơ sở không tồn tại");
    return res.redirect(req.get("Referrer"));
  }

  let courtIds = [];

  if (court) {
    if (!mongoose.Types.ObjectId.isValid(court)) {
      req.flash("error", "Sân con không tồn tại");
      return res.redirect(req.get("Referrer"));
    }

    const isBelongToVenue = await Court.findOne({
      _id: court,
      venueId: isRightVenue._id,
      deleted: false,
    });

    if (!isBelongToVenue) {
      req.flash("error", "Sân con không tồn tại");
      return res.redirect(req.get("Referrer"));
    }
    courtIds = [isBelongToVenue._id];
  } else {
    const courts = await Court.find({
      venueId: isRightVenue._id,
      deleted: false,
    }).select("_id");

    if (!courts.length) {
      req.flash("error", "Cơ sở chưa có sân");
      return res.redirect(req.get("Referrer"));
    }

    courtIds = courts.map((item) => item._id);
  }

  if (!["all", "weekday", "weekend"].includes(dayType)) {
    req.flash("error", "Ngày áp dụng không hợp lệ");
    return res.redirect(req.get("Referrer"));
  }

  const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
  const timeStart = (req.body.timeStart || "").trim();
  const timeEnd = (req.body.timeEnd || "").trim();

  if (!HHMM.test(timeStart) || !HHMM.test(timeEnd)) {
    req.flash("error", "Giờ không đúng định dạng");
    return res.redirect(req.get("Referrer"));
  }

  if (timeStart >= timeEnd) {
    req.flash("error", "Giờ bắt đầu phải nhỏ hơn giờ kết thúc");
    return res.redirect(req.get("Referrer"));
  }

  for (const id of courtIds) {
    const duplicated = await checkDuplicatedTime({
      court: id,
      dayType,
      timeStart,
      timeEnd,
    });
    if (duplicated) {
      req.flash("error", "Khung giờ này đã có bảng giá");
      return res.redirect(req.get("Referrer"));
    }
  }

  next();
};
