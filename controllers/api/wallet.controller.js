const catalog = require("../../services/catalog.service");
const store = require("../../services/user-app.store");

const TOP_UP_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];
const TOP_UP_METHODS = catalog.paymentMethods.filter((item) => item.id !== "wallet" && item.id !== "onsite");

module.exports.index = (req, res) => {
  res.json({
    balance: store.balanceOf(req.auth.userId),
    amounts: TOP_UP_AMOUNTS,
    methods: TOP_UP_METHODS,
  });
};

module.exports.topUp = (req, res) => {
  const amount = Number(req.body.amount);
  const method = req.body.method;
  if (!TOP_UP_AMOUNTS.includes(amount)) {
    return res.status(400).json({ message: "Mệnh giá nạp không hợp lệ" });
  }
  if (!TOP_UP_METHODS.some((item) => item.id === method)) {
    return res.status(400).json({ message: "Phương thức nạp không hợp lệ" });
  }
  const balance = store.setBalance(req.auth.userId, store.balanceOf(req.auth.userId) + amount);
  return res.json({ balance, amount, method });
};
