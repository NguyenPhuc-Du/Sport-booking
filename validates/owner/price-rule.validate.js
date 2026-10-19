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
    dayType: { $in: dayTypes },
    timeStart: { $lt: timeEnd },
    timeEnd: { $gt: timeStart },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return PriceRule.findOne(query);
}

function validatePriceRule({ isEdit } = {}) {
  return async (req, res, next) => {
    const ownerId = res.locals.user.id;
    const { dayType, court } = req.body;

    if (!(req.body.name || "").trim()) {
      req.flash("error", "Vui lòng không bỏ trống tên khung giá");
      return res.redirect(req.get("Referrer"));
    }

    if (!req.body.venueId || !mongoose.Types.ObjectId.isValid(req.body.venueId)) {
      req.flash("error", "Cơ sở không tồn tại");
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

    let courtIds = [];
    let excludeId;
    
    if (isEdit) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        req.flash("error", "Bảng giá không tồn tại");
        return res.redirect(req.get("Referrer"));
      }

      const priceRule = await PriceRule.findById(req.params.id).select("court");
      const currentCourt = priceRule
        ? await Court.findOne({
            _id: priceRule.court,
            deleted: false,
          }).select("venueId")
        : null;
      const ownsCurrent = currentCourt
        ? await Venue.findOne({
            _id: currentCourt.venueId,
            owner_id: ownerId,
            deleted: false,
          }).select("_id")
        : null;

      if (!priceRule || !ownsCurrent) {
        req.flash("error", "Bảng giá không tồn tại");
        return res.redirect(req.get("Referrer"));
      }

      excludeId = priceRule._id;
    }
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
    } else if (isEdit) {
      req.flash("error", "Vui lòng chọn sân");
      return res.redirect(req.get("Referrer"));
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

    const pricePerHour = Number(req.body.pricePerHour);
    if (!Number.isFinite(pricePerHour) || pricePerHour < 0) {
      req.flash("error", "Giá thuê không hợp lệ");
      return res.redirect(req.get("Referrer"));
    }

    for (const id of courtIds) {
      const duplicated = await checkDuplicatedTime({
        court: id,
        dayType,
        timeStart,
        timeEnd,
        excludeId,
      });
      if (duplicated) {
        req.flash("error", "Khung giờ này đã có bảng giá");
        return res.redirect(req.get("Referrer"));
      }
    }
    next();
  }
}
module.exports.createPost = validatePriceRule();
module.exports.editPatch = validatePriceRule({ isEdit: true });