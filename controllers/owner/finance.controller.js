const finance = require("../../services/owner/finance.service");
const facilities = require("../../services/owner/facility.service");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");

const PREFIX = systemConfig.prefixOwner;

module.exports.index = async (req, res) => {
  const userId = res.locals.user.id;
  const countCampaign = await finance.countCampaignByOwnerId(userId);
  const pagination = paginationHelper(
    { currentPage: 1, limitPage: 4 },
    req.query,
    countCampaign,
  );
  const campaigns = await finance.getCampaignsByOwnerId(userId, pagination);
  res.render("owner/pages/finance/index", {
    pageTitle: "Chương trình khuyến mãi",
    activeMenu: "finance",
    campaigns,
    pagination,
  });
};

module.exports.createCampaign = async (req, res) => {
  const userId = res.locals.user.id;
  const venues = await facilities.getAllVenueByOwnerId(userId);
  res.render("owner/pages/finance/campaign-create", {
    pageTitle: "Tạo chương trình",
    activeMenu: "finance",
    venues,
  });
};

module.exports.createCampaignPost = async (req, res) => {
  try {
    await finance.createCampaign(req.body, res.locals.user.id);
    req.flash("success", "Tạo chương trình thành công");
    res.redirect(`${PREFIX}/finance`);
  } catch (error) {
    req.flash("error", "Tạo chương trình thất bại");
    res.redirect(req.get("Referer") || `${PREFIX}/finance`);
  }
};

module.exports.editCampaign = async (req, res) => {
  const userId = res.locals.user.id;
  const campaign = await finance.findCampaignById(req.params.id, userId);
  if (!campaign) {
    req.flash("error", "Không tìm thấy chương trình");
    return res.redirect(`${PREFIX}/finance`);
  }
  const venues = await facilities.getAllVenueByOwnerId(userId);
  res.render("owner/pages/finance/campaign-edit", {
    pageTitle: "Sửa chương trình",
    activeMenu: "finance",
    campaign,
    venues,
  });
};

module.exports.editCampaignPatch = async (req, res) => {
  try {
    const updated = await finance.updateCampaign(
      req.params.id,
      res.locals.user.id,
      req.body,
    );
    if (!updated) {
      req.flash("error", "Không tìm thấy chương trình");
      return res.redirect(`${PREFIX}/finance`);
    }
    req.flash("success", "Cập nhật chương trình thành công");
    res.redirect(`${PREFIX}/finance`);
  } catch (error) {
    req.flash("error", "Cập nhật chương trình thất bại");
    res.redirect(req.get("Referer") || `${PREFIX}/finance`);
  }
};

module.exports.deleteCampaign = async (req, res) => {
  try {
    const ok = await finance.deleteCampaign(req.params.id, res.locals.user.id);
    req.flash(
      "success",
      ok ? "Đã xoá chương trình và voucher con" : "Không tìm thấy chương trình",
    );
  } catch (error) {
    req.flash("error", "Xoá chương trình thất bại");
  }
  res.redirect(req.get("Referer") || `${PREFIX}/finance`);
};

module.exports.vouchersIndex = async (req, res) => {
  const userId = res.locals.user.id;
  const campaignId = req.params.id;
  const campaign = await finance.findCampaignById(campaignId, userId);
  if (!campaign) {
    req.flash("error", "Không tìm thấy chương trình");
    return res.redirect(`${PREFIX}/finance`);
  }
  const countVoucher = await finance.countVoucherByCampaignId(
    campaignId,
    userId,
  );
  const pagination = paginationHelper(
    { currentPage: 1, limitPage: 4 },
    req.query,
    countVoucher,
  );
  const vouchers = await finance.getVouchersByCampaignId(
    campaignId,
    userId,
    pagination,
  );
  res.render("owner/pages/finance/vouchers", {
    pageTitle: `Voucher · ${campaign.name}`,
    activeMenu: "finance",
    campaign,
    voucher: vouchers,
    pagination,
  });
};

module.exports.create = async (req, res) => {
  const userId = res.locals.user.id;
  const campaignId = req.params.id || req.query.campaign_id;
  const campaign = await finance.findCampaignById(campaignId, userId);
  if (!campaign) {
    req.flash("error", "Vui lòng chọn chương trình trước khi tạo voucher");
    return res.redirect(`${PREFIX}/finance`);
  }
  res.render("owner/pages/finance/create", {
    pageTitle: "Tạo Voucher",
    activeMenu: "finance",
    campaign,
    ownerId: userId,
  });
};

module.exports.createPost = async (req, res) => {
  const userId = res.locals.user.id;
  try {
    await finance.createVoucher(
      { ...req.body, campaign_id: req.body.campaign_id },
      userId,
    );
    req.flash("success", "Tạo voucher thành công");
    res.redirect(`${PREFIX}/finance/campaigns/${req.body.campaign_id}/vouchers`);
  } catch (error) {
    req.flash("error", error.message || "Tạo voucher thất bại");
    res.redirect(req.get("Referer") || `${PREFIX}/finance`);
  }
};

module.exports.delete = async (req, res) => {
  try {
    await finance.deleteVoucher(req.params.id, res.locals.user.id);
    req.flash("success", "Bạn đã xoá voucher thành công");
  } catch (error) {
    req.flash("error", "Bạn đã xoá voucher thất bại");
  }
  res.redirect(req.get("Referer") || `${PREFIX}/finance`);
};

module.exports.edit = async (req, res) => {
  const userId = res.locals.user.id;
  const voucher = await finance.findOneVoucherById(req.params.id, userId);
  if (!voucher) {
    req.flash("error", "Không tìm thấy voucher");
    return res.redirect(`${PREFIX}/finance`);
  }
  const campaign = await finance.findCampaignById(voucher.campaign_id, userId);
  res.render("owner/pages/finance/edit", {
    pageTitle: "Sửa voucher",
    activeMenu: "finance",
    voucher,
    campaign,
  });
};

module.exports.editPatch = async (req, res) => {
  const userId = res.locals.user.id;
  try {
    const updated = await finance.updateOneVoucher(
      req.params.id,
      userId,
      req.body,
    );
    if (!updated) {
      req.flash("error", "Không tìm thấy voucher");
      return res.redirect(`${PREFIX}/finance`);
    }
    req.flash("success", "Sửa đổi voucher thành công");
    res.redirect(
      `${PREFIX}/finance/campaigns/${updated.campaign_id}/vouchers`,
    );
  } catch (error) {
    req.flash("error", "Sửa đổi voucher thất bại");
    res.redirect(req.get("Referer") || `${PREFIX}/finance`);
  }
};
