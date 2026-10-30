const Voucher = require("../../models/finance.model");
const Campaign = require("../../models/campaign.model");
const Venues = require("../../models/facilities.model");

function formatDate(dateObj) {
  if (!dateObj) return "";
  return new Date(dateObj).toISOString().split("T")[0];
}

function formatDateTimeLocal(dateObj) {
  if (!dateObj) return "";
  return new Date(dateObj).toISOString().slice(0, 16);
}

function mapVoucherDisplay(item) {
  item.display_value = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(item.discount_value);
  item.display_minorder = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(item.min_order_amount || 0);
  item.percentUsed =
    item.quantity > 0 ? (item.used_count / item.quantity) * 100 : 0;
  item.start_date_display = formatDate(item.start_date);
  item.end_date_display = formatDate(item.end_date);
  return item;
}

async function getOwnedCampaign(campaignId, ownerId) {
  return Campaign.findOne({
    _id: campaignId,
    owner_id: ownerId,
    deleted: false,
  });
}

module.exports.countCampaignByOwnerId = async (ownerId) => {
  return Campaign.countDocuments({ deleted: false, owner_id: ownerId });
};

module.exports.getCampaignsByOwnerId = async (ownerId, pagination) => {
  const campaigns = await Campaign.find({ deleted: false, owner_id: ownerId })
    .populate("venue_id", "name")
    .sort({ createdAt: -1 })
    .skip(pagination.skipPage)
    .limit(pagination.limitPage)
    .lean();

  const ids = campaigns.map((c) => c._id);
  const counts = await Voucher.aggregate([
    {
      $match: {
        campaign_id: { $in: ids },
        deleted: false,
      },
    },
    { $group: { _id: "$campaign_id", total: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((row) => {
    countMap[String(row._id)] = row.total;
  });

  return campaigns.map((item) => ({
    ...item,
    venue_name: item.venue_id ? item.venue_id.name : "—",
    voucher_count: countMap[String(item._id)] || 0,
    start_date_display: formatDate(item.start_date),
    end_date_display: formatDate(item.end_date),
    start_date_formatted: formatDateTimeLocal(item.start_date),
    end_date_formatted: formatDateTimeLocal(item.end_date),
  }));
};

module.exports.findCampaignById = async (id, ownerId) => {
  const campaign = await Campaign.findOne({
    _id: id,
    owner_id: ownerId,
    deleted: false,
  })
    .populate("venue_id", "name")
    .lean();
  if (!campaign) return null;
  campaign.venue_name = campaign.venue_id ? campaign.venue_id.name : "—";
  campaign.start_date_display = formatDate(campaign.start_date);
  campaign.end_date_display = formatDate(campaign.end_date);
  campaign.start_date_formatted = formatDateTimeLocal(campaign.start_date);
  campaign.end_date_formatted = formatDateTimeLocal(campaign.end_date);
  return campaign;
};

module.exports.createCampaign = async (body, ownerId) => {
  const start = new Date(body.start_date);
  const end = new Date(body.end_date);
  const campaign = new Campaign({
    owner_id: ownerId,
    venue_id: body.venue_id,
    name: body.name,
    description: body.description || "",
    start_date: start,
    end_date: end,
    status: body.status || "active",
  });
  await campaign.save();
  return campaign;
};

module.exports.updateCampaign = async (id, ownerId, body) => {
  const campaign = await getOwnedCampaign(id, ownerId);
  if (!campaign) return null;

  const start = new Date(body.start_date);
  const end = new Date(body.end_date);
  const venueId = body.venue_id;

  campaign.name = body.name;
  campaign.description = body.description || "";
  campaign.venue_id = venueId;
  campaign.start_date = start;
  campaign.end_date = end;
  campaign.status = body.status || campaign.status;
  await campaign.save();

  await Voucher.updateMany(
    { campaign_id: campaign._id, deleted: false },
    {
      start_date: start,
      end_date: end,
      venue_id: venueId,
      owner_id: ownerId,
    },
  );

  return campaign;
};

module.exports.deleteCampaign = async (id, ownerId) => {
  const campaign = await getOwnedCampaign(id, ownerId);
  if (!campaign) return false;
  await Campaign.updateOne({ _id: id }, { deleted: true });
  await Voucher.updateMany({ campaign_id: id }, { deleted: true });
  return true;
};

module.exports.countVoucherByCampaignId = async (campaignId, ownerId) => {
  const campaign = await getOwnedCampaign(campaignId, ownerId);
  if (!campaign) return 0;
  return Voucher.countDocuments({
    deleted: false,
    campaign_id: campaignId,
    owner_id: ownerId,
  });
};

module.exports.getVouchersByCampaignId = async (
  campaignId,
  ownerId,
  pagination,
) => {
  const campaign = await getOwnedCampaign(campaignId, ownerId);
  if (!campaign) return [];
  const vouchers = await Voucher.find({
    deleted: false,
    campaign_id: campaignId,
    owner_id: ownerId,
  })
    .sort({ createdAt: -1 })
    .skip(pagination.skipPage)
    .limit(pagination.limitPage)
    .lean();
  return vouchers.map(mapVoucherDisplay);
};

module.exports.createVoucher = async (body, ownerId) => {
  const campaign = await getOwnedCampaign(body.campaign_id, ownerId);
  if (!campaign) {
    const err = new Error("Không tìm thấy chương trình");
    err.status = 400;
    throw err;
  }

  const voucher = new Voucher({
    campaign_id: campaign._id,
    code: (body.code || "").trim().toUpperCase(),
    name: body.name,
    owner_id: ownerId,
    venue_id: campaign.venue_id,
    discount_type: body.discount_type,
    discount_value: parseInt(body.discount_value, 10) || 0,
    max_discount: parseInt(body.max_discount, 10) || 0,
    min_order_amount: parseInt(body.min_order_amount, 10) || 0,
    quantity: parseInt(body.quantity, 10) || 0,
    used_count: 0,
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    status: body.status || "active",
  });
  await voucher.save();
  return voucher;
};

module.exports.deleteVoucher = async (id, ownerId) => {
  const result = await Voucher.updateOne(
    { _id: id, owner_id: ownerId },
    { deleted: true },
  );
  return result.modifiedCount > 0;
};

module.exports.findOneVoucherById = async (id, ownerId) => {
  const voucher = await Voucher.findOne({
    _id: id,
    owner_id: ownerId,
    deleted: false,
  }).lean();
  if (!voucher) return null;
  mapVoucherDisplay(voucher);
  return voucher;
};

module.exports.updateOneVoucher = async (id, ownerId, body) => {
  const voucher = await Voucher.findOne({
    _id: id,
    owner_id: ownerId,
    deleted: false,
  });
  if (!voucher) return null;

  const campaign = await getOwnedCampaign(voucher.campaign_id, ownerId);
  if (!campaign) return null;

  voucher.code = (body.code || voucher.code).trim().toUpperCase();
  voucher.name = body.name;
  voucher.discount_type = body.discount_type;
  voucher.discount_value = parseInt(body.discount_value, 10) || 0;
  voucher.max_discount = parseInt(body.max_discount, 10) || 0;
  voucher.min_order_amount = parseInt(body.min_order_amount, 10) || 0;
  voucher.quantity = parseInt(body.quantity, 10) || 0;
  voucher.status = body.status || voucher.status;
  voucher.owner_id = ownerId;
  voucher.venue_id = campaign.venue_id;
  voucher.start_date = campaign.start_date;
  voucher.end_date = campaign.end_date;
  await voucher.save();
  return voucher;
};

module.exports.getOwnedVenues = async (ownerId) => {
  return Venues.find({ deleted: false, owner_id: ownerId }).lean();
};
