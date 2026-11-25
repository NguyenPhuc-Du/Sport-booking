/* eslint-disable no-console */
require("dotenv").config();
const mongoose = require("mongoose");
const tokenService = require("../services/app/token.service");
const User = require("../models/user.model");
const Voucher = require("../models/finance.model");
const Venue = require("../models/facilities.model");
const Court = require("../models/court.model");
const Campaign = require("../models/campaign.model");
const Drink = require("../models/drink.model");

const BASE = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000/api/v1";
const VENUE_ID = process.env.SMOKE_VENUE_ID || "6718a4000000000000000003";

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function ensureTestVouchers(venueId, ownerId) {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let campaign = await Campaign.findOne({ venue_id: venueId }).lean();
  if (!campaign) {
    campaign = await Campaign.create({
      name: "Smoke voucher campaign",
      venue_id: venueId,
      owner_id: ownerId,
      status: "active",
      start_date: now,
      end_date: end,
    });
  }

  const specs = [
    {
      code: "SMOKECOURT",
      name: "Smoke court 20k",
      apply_scope: "court",
      discount_type: "fixed",
      discount_value: 20000,
      min_order_amount: 0,
    },
    {
      code: "SMOKEDRINK",
      name: "Smoke drink 5k",
      apply_scope: "drink",
      discount_type: "fixed",
      discount_value: 5000,
      min_order_amount: 0,
    },
    {
      code: "SMOKEORDER",
      name: "Smoke order 10%",
      apply_scope: "order",
      discount_type: "percent",
      discount_value: 10,
      max_discount: 50000,
      min_order_amount: 0,
    },
  ];

  for (const spec of specs) {
    await Voucher.findOneAndUpdate(
      { code: spec.code },
      {
        $set: {
          campaign_id: campaign._id,
          owner_id: ownerId,
          venue_id: venueId,
          name: spec.name,
          apply_scope: spec.apply_scope,
          day_type: "all",
          time_start: "",
          time_end: "",
          product_ids: [],
          discount_type: spec.discount_type,
          discount_value: spec.discount_value,
          max_discount: spec.max_discount || 0,
          min_order_amount: spec.min_order_amount || 0,
          quantity: 100,
          used_count: 0,
          deleted: false,
          status: "active",
          start_date: now,
          end_date: end,
        },
      },
      { upsert: true, new: true },
    );
  }
  return specs.map((s) => s.code);
}

async function main() {
  const results = [];
  const log = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  };

  await mongoose.connect(process.env.MONGODB_URL);

  const user = await User.findOne({ role: "USER", status: "active" }).lean();
  assert(user, "Không có USER active để test");
  const token = tokenService.sign(user._id);

  const venue = await Venue.findById(VENUE_ID).lean();
  assert(venue, `Không tìm thấy venue ${VENUE_ID}`);
  const court = await Court.findOne({
    venue_id: VENUE_ID,
    $or: [{ deleted: false }, { deleted: { $exists: false } }],
  }).lean();
  let courtId = court && String(court._id);
  if (!courtId) {
    const detail = await api("GET", `/facilities/${VENUE_ID}`, { token });
    assert(detail.status === 200, `facility detail ${detail.status}: ${JSON.stringify(detail.data)}`);
    courtId = detail.data.facility?.courts?.[0]?.id;
  }
  assert(courtId, "Không có sân để quote");

  const ownerId = venue.owner_id || venue.ownerId || user._id;
  await ensureTestVouchers(VENUE_ID, ownerId);

  // Pick a near future date + available slot (try next 7 days)
  let date = null;
  let time = null;
  let available = null;
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const slotsRes = await api(
      "GET",
      `/facilities/${VENUE_ID}/slots?courtId=${courtId}&date=${dateStr}`,
      { token },
    );
    if (slotsRes.status !== 200) continue;
    available = (slotsRes.data.slots || []).find((s) => s.available);
    if (available) {
      date = dateStr;
      time = String(available.time).split(" - ")[0].trim();
      break;
    }
  }
  assert(date && time, "Không có slot trống trong 7 ngày tới");

  const drinks = await Drink.find({
    venueId: VENUE_ID,
    status: "active",
    stock: { $gt: 0 },
  })
    .limit(3)
    .lean();
  const drinkPayload = drinks.slice(0, 1).map((d) => ({ drinkId: String(d._id), qty: 1 }));

  // 1) checkout options
  const options = await api("GET", `/checkout/options?facilityId=${VENUE_ID}`, { token });
  const optOk = options.status === 200 && Array.isArray(options.data.vouchers);
  const scopes = new Set((options.data.vouchers || []).map((v) => v.applyScope));
  log(
    "GET /checkout/options",
    optOk,
    optOk
      ? `${options.data.vouchers.length} vouchers, scopes=[${[...scopes].join(",")}]`
      : JSON.stringify(options.data),
  );

  const baseBody = {
    facilityId: VENUE_ID,
    courtId: String(courtId),
    date,
    time,
    hours: 1,
    drinks: drinkPayload,
  };

  // 2) quote no voucher
  const q0 = await api("POST", "/bookings/quote", { token, body: baseBody });
  log(
    "POST /bookings/quote (no voucher)",
    q0.status === 200 && typeof q0.data.amount === "number",
    q0.status === 200
      ? `amount=${q0.data.amount} court=${q0.data.courtPrice} drink=${q0.data.drinkTotal}`
      : JSON.stringify(q0.data),
  );

  // 3) single court voucher
  const q1 = await api("POST", "/bookings/quote", {
    token,
    body: { ...baseBody, voucherCodes: ["SMOKECOURT"] },
  });
  log(
    "quote 1 court voucher",
    q1.status === 200 && q1.data.discount > 0 && (q1.data.voucherCodes || []).includes("SMOKECOURT"),
    q1.status === 200
      ? `discount=${q1.data.discount} codes=${JSON.stringify(q1.data.voucherCodes)} amount=${q1.data.amount}`
      : JSON.stringify(q1.data),
  );

  // 4) stack court + drink + order
  const stackCodes = drinkPayload.length
    ? ["SMOKECOURT", "SMOKEDRINK", "SMOKEORDER"]
    : ["SMOKECOURT", "SMOKEORDER"];
  const q2 = await api("POST", "/bookings/quote", {
    token,
    body: { ...baseBody, voucherCodes: stackCodes },
  });
  const stackedOk =
    q2.status === 200 &&
    Array.isArray(q2.data.voucherCodes) &&
    q2.data.voucherCodes.length === stackCodes.length &&
    q2.data.discount > (q1.data.discount || 0);
  log(
    "quote stack multi-scope",
    stackedOk,
    q2.status === 200
      ? `discount=${q2.data.discount} codes=${JSON.stringify(q2.data.voucherCodes)} breakdown=${JSON.stringify(q2.data.voucherDiscounts)} amount=${q2.data.amount}`
      : JSON.stringify(q2.data),
  );

  // 5) reject two same-scope
  await Voucher.findOneAndUpdate(
    { code: "SMOKECOURT2" },
    {
      $set: {
        campaign_id: (await Voucher.findOne({ code: "SMOKECOURT" }).lean()).campaign_id,
        owner_id: ownerId,
        venue_id: VENUE_ID,
        name: "Smoke court 2",
        apply_scope: "court",
        day_type: "all",
        discount_type: "fixed",
        discount_value: 10000,
        max_discount: 0,
        min_order_amount: 0,
        quantity: 100,
        used_count: 0,
        deleted: false,
        status: "active",
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 86400000),
      },
    },
    { upsert: true },
  );
  const qBad = await api("POST", "/bookings/quote", {
    token,
    body: { ...baseBody, voucherCodes: ["SMOKECOURT", "SMOKECOURT2"] },
  });
  log(
    "reject 2 vouchers same scope",
    qBad.status === 400,
    `${qBad.status}: ${qBad.data?.message || JSON.stringify(qBad.data)}`,
  );

  // 6) create booking (pending payment) then cancel
  const created = await api("POST", "/bookings", {
    token,
    body: {
      ...baseBody,
      voucherCodes: stackCodes,
      paymentMethod: "vnpay",
    },
  });
  const createOk = created.status === 200 || created.status === 201;
  log(
    "POST /bookings create with stacked vouchers",
    createOk && !!created.data?.booking?.code,
    createOk
      ? `code=${created.data.booking.code} amount=${created.data.booking.amount} voucher=${created.data.booking.voucherCode} payUrl=${created.data.paymentUrl ? "yes" : "no"}`
      : JSON.stringify(created.data),
  );

  if (createOk && created.data?.booking?.code) {
    const cancelled = await api("POST", `/bookings/${created.data.booking.code}/cancel`, { token });
    log(
      "cancel test booking",
      cancelled.status === 200,
      `${cancelled.status}: ${cancelled.data?.booking?.status || cancelled.data?.message || ""}`,
    );
  }

  await mongoose.disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- SUMMARY ---");
  console.log(`passed=${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("SMOKE FATAL", err);
  process.exit(1);
});
