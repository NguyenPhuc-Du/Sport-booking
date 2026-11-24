require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const Venue = require("../models/facilities.model");
const CourtType = require("../models/court-types.model");
const Court = require("../models/court.model");
const Booking = require("../models/booking.model");
const Setting = require("../models/platform-setting.model");
const OwnerRate = require("../models/owner-rate.model");
const Ledger = require("../models/ledger-entry.model");

const id = (hex) => new mongoose.Types.ObjectId(hex);
const at = (y, m, d, hh = 9, mm = 0) => new Date(y, m - 1, d, hh, mm, 0);

const IDS = {
  admin: id("664a00000000000000000001"),
  admin2: id("664a00000000000000000002"),
  adminLock: id("664a00000000000000000003"),
  ha: id("664a00000000000000000011"),
  khoa: id("664a00000000000000000012"),
  tu: id("664a00000000000000000013"),
  mai: id("664a00000000000000000014"),
  quan: id("664a00000000000000000021"),
  lan: id("664a00000000000000000022"),
  old: id("664a00000000000000000023"),
  type: id("664c00000000000000000001"),
  venueHa: id("664b00000000000000000011"),
  venueKhoa: id("664b00000000000000000012"),
  venueTu: id("664b00000000000000000013"),
  courtHa: id("664d00000000000000000011"),
  courtKhoa: id("664d00000000000000000012"),
  courtTu: id("664d00000000000000000013"),
};

const USER_IDS = Object.values(IDS).slice(0, 10);
const BOOKING_IDS = [
  "665000000000000000000001",
  "665000000000000000000002",
  "665000000000000000000003",
  "665000000000000000000004",
  "665000000000000000000005",
  "665000000000000000000006",
  "665000000000000000000007",
].map(id);

function booking(fields) {
  return {
    guestName: "Khách test",
    guestPhone: "0900000000",
    statusLabel: "SẮP DIỄN RA",
    date: "2026-11-04",
    timeStart: "10:00",
    timeEnd: "11:00",
    time: "10:00 - 11:00",
    discount: 0,
    drinks: [],
    drinkTotal: 0,
    ...fields,
    courtPrice: fields.amount,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);
  const password_hash = await bcrypt.hash("Admin@123456", 10);

  await Ledger.deleteMany({ booking_id: { $in: BOOKING_IDS } });
  await Booking.deleteMany({ _id: { $in: BOOKING_IDS } });
  await Court.deleteMany({
    _id: { $in: [IDS.courtHa, IDS.courtKhoa, IDS.courtTu] },
  });
  await Venue.deleteMany({
    _id: { $in: [IDS.venueHa, IDS.venueKhoa, IDS.venueTu] },
  });
  await CourtType.deleteMany({ _id: IDS.type });
  await OwnerRate.deleteMany({ user_id: { $in: USER_IDS } });
  await User.deleteMany({ _id: { $in: USER_IDS } });

  const users = [
    [
      "admin",
      "Super Admin",
      "admin@sportzone.test",
      "0901000001",
      "ADMIN",
      "active",
      at(2026, 10, 1),
    ],
    [
      "admin2",
      "Admin Hai",
      "admin2@sportzone.test",
      "0901000002",
      "ADMIN",
      "active",
      at(2026, 11, 3),
    ],
    [
      "adminLock",
      "Admin Khoa",
      "admin.lock@sportzone.test",
      "0901000003",
      "ADMIN",
      "inactive",
      at(2026, 10, 15),
    ],
    [
      "ha",
      "Trần Thu Hà",
      "ha.owner@sportzone.test",
      "0901000011",
      "OWNER",
      "active",
      at(2026, 10, 20),
    ],
    [
      "khoa",
      "Đỗ Minh Khoa",
      "khoa.owner@sportzone.test",
      "0901000012",
      "OWNER",
      "active",
      at(2026, 11, 4),
    ],
    [
      "tu",
      "Phạm Anh Tú",
      "tu.owner@sportzone.test",
      "0901000013",
      "OWNER",
      "active",
      at(2026, 11, 1),
    ],
    [
      "mai",
      "Lê Mai",
      "mai.owner@sportzone.test",
      "0901000014",
      "OWNER",
      "active",
      at(2026, 9, 1),
    ],
    [
      "quan",
      "Nguyễn Minh Quân",
      "quan.user@sportzone.test",
      "0901000021",
      "USER",
      "active",
      at(2026, 11, 5),
    ],
    [
      "lan",
      "Ngô Lan",
      "lan.user@sportzone.test",
      "0901000022",
      "USER",
      "inactive",
      at(2026, 11, 2),
    ],
    [
      "old",
      "Khách Cũ",
      "old.user@sportzone.test",
      "0901000023",
      "USER",
      "active",
      at(2026, 8, 1),
    ],
  ].map(([key, fullName, email, phone, role, status, createdAt]) => ({
    _id: IDS[key],
    fullName,
    email,
    phone,
    password_hash,
    role,
    status,
    createdAt,
    updatedAt: createdAt,
  }));
  await User.collection.insertMany(users);

  await CourtType.create({
    _id: IDS.type,
    name: "Cầu lông test",
    description: "Loại sân cho bộ test admin",
  });

  const venues = [
    [IDS.venueHa, IDS.ha, "Sân Hà"],
    [IDS.venueKhoa, IDS.khoa, "Sân Khoa"],
    [IDS.venueTu, IDS.tu, "Sân Tú"],
  ];
  await Venue.create(
    venues.map(([venueId, ownerId, name]) => ({
      _id: venueId,
      owner_id: ownerId,
      name,
      address: "1 Test",
      district: "Cầu Giấy",
      city: "Hà Nội",
      status: "active",
    })),
  );

  await Court.create([
    {
      _id: IDS.courtHa,
      venue_id: IDS.venueHa,
      court_type_id: IDS.type,
      name: "Sân 1",
    },
    {
      _id: IDS.courtKhoa,
      venue_id: IDS.venueKhoa,
      court_type_id: IDS.type,
      name: "Sân 1",
    },
    {
      _id: IDS.courtTu,
      venue_id: IDS.venueTu,
      court_type_id: IDS.type,
      name: "Sân 1",
    },
  ]);

  await Booking.collection.insertMany([
    booking({
      _id: id("665000000000000000000001"),
      code: "TEST-HA-VNP",
      userId: IDS.quan,
      facilityId: IDS.venueHa,
      facilityName: "Sân Hà",
      courtId: IDS.courtHa,
      courtName: "Sân 1",
      amount: 2000000,
      paymentMethod: "vnpay",
      status: "upcoming",
      paidAt: at(2026, 11, 4, 10),
      timeStart: "10:00",
      timeEnd: "11:00",
      time: "10:00 - 11:00",
    }),
    booking({
      _id: id("665000000000000000000002"),
      code: "TEST-HA-CASH",
      userId: IDS.quan,
      facilityId: IDS.venueHa,
      facilityName: "Sân Hà",
      courtId: IDS.courtHa,
      courtName: "Sân 1",
      amount: 1200000,
      paymentMethod: "cash",
      status: "completed",
      statusLabel: "HOÀN THÀNH",
      paidAt: at(2026, 11, 3, 9),
      date: "2026-11-03",
      timeStart: "08:00",
      timeEnd: "09:00",
      time: "08:00 - 09:00",
    }),
    booking({
      _id: id("665000000000000000000003"),
      code: "TEST-HA-OLD",
      userId: IDS.old,
      facilityId: IDS.venueHa,
      facilityName: "Sân Hà",
      courtId: IDS.courtHa,
      courtName: "Sân 1",
      amount: 500000,
      paymentMethod: "vnpay",
      status: "completed",
      statusLabel: "HOÀN THÀNH",
      paidAt: at(2026, 10, 20, 9),
      date: "2026-10-20",
      timeStart: "07:00",
      timeEnd: "08:00",
      time: "07:00 - 08:00",
    }),
    booking({
      _id: id("665000000000000000000004"),
      code: "TEST-KHOA-CASH",
      facilityId: IDS.venueKhoa,
      facilityName: "Sân Khoa",
      courtId: IDS.courtKhoa,
      courtName: "Sân 1",
      amount: 800000,
      paymentMethod: "cash",
      status: "upcoming",
      paidAt: at(2026, 11, 4, 11),
      timeStart: "11:00",
      timeEnd: "12:00",
      time: "11:00 - 12:00",
    }),
    booking({
      _id: id("665000000000000000000005"),
      code: "TEST-TU-CASH",
      facilityId: IDS.venueTu,
      facilityName: "Sân Tú",
      courtId: IDS.courtTu,
      courtName: "Sân 1",
      amount: 200000,
      paymentMethod: "cash",
      status: "upcoming",
      paidAt: at(2026, 11, 5, 9),
      date: "2026-11-05",
      timeStart: "09:00",
      timeEnd: "10:00",
      time: "09:00 - 10:00",
    }),
    booking({
      _id: id("665000000000000000000006"),
      code: "TEST-TU-WAIT",
      facilityId: IDS.venueTu,
      facilityName: "Sân Tú",
      courtId: IDS.courtTu,
      courtName: "Sân 1",
      amount: 150000,
      paymentMethod: "vnpay",
      status: "pending_payment",
      statusLabel: "CHỜ THANH TOÁN",
      paidAt: null,
      date: "2026-11-06",
      timeStart: "14:00",
      timeEnd: "15:00",
      time: "14:00 - 15:00",
    }),
    booking({
      _id: id("665000000000000000000007"),
      code: "TEST-TU-CANCEL",
      facilityId: IDS.venueTu,
      facilityName: "Sân Tú",
      courtId: IDS.courtTu,
      courtName: "Sân 1",
      amount: 180000,
      paymentMethod: "cash",
      status: "cancelled",
      statusLabel: "ĐÃ HỦY",
      paidAt: null,
      date: "2026-11-06",
      timeStart: "16:00",
      timeEnd: "17:00",
      time: "16:00 - 17:00",
    }),
  ]);

  await Setting.findOneAndUpdate(
    { key: "commission" },
    {
      key: "commission",
      commissionRate: 0.05,
      payoutCycle: "weekly",
      minPayout: 50000,
    },
    { upsert: true },
  );
  await OwnerRate.create({ user_id: IDS.khoa, commissionRate: 0.1 });

  console.log("Đã nạp bộ test. Mở /admin/dashboard để ghi sổ.");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
