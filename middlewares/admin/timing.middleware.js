const { AsyncLocalStorage } = require("async_hooks");
const mongoose = require("mongoose");

const als = new AsyncLocalStorage();

/**
 * Bật nghe thời gian lệnh Mongo khi DEBUG_TIMING=1.
 * Không làm gì nếu biến môi trường tắt, để request thường không tốn thêm.
 */
function batNgheDb() {
  if (process.env.DEBUG_TIMING !== "1") return;
  const gan = () => {
    const client = mongoose.connection.getClient();
    if (!client || client.__adTiming) return;
    client.__adTiming = true;
    const cong = (event) => {
      const store = als.getStore();
      if (!store) return;
      const began = store.starts.get(event.requestId);
      if (!began) return;
      store.db += Date.now() - began;
      store.starts.delete(event.requestId);
    };
    client.on("commandStarted", (event) => {
      const store = als.getStore();
      if (store) store.starts.set(event.requestId, Date.now());
    });
    client.on("commandSucceeded", cong);
    client.on("commandFailed", cong);
  };
  if (mongoose.connection.readyState === 1) gan();
  else mongoose.connection.once("connected", gan);
}

batNgheDb();

/**
 * Gắn header thời gian tổng và thời gian DB.
 * Nhận request, trả next. Chỉ chạy khi DEBUG_TIMING=1.
 */
function doThoiGian(req, res, next) {
  if (process.env.DEBUG_TIMING !== "1") return next();
  const store = { db: 0, starts: new Map() };
  const began = Date.now();
  als.run(store, () => {
    res.on("finish", () => {
      const total = Date.now() - began;
      console.log(`[timing] ${req.method} ${req.originalUrl} total=${total}ms db=${store.db}ms`);
    });
    res.setHeader("X-Response-Ms", "0");
    const end = res.end;
    res.end = function patched(...args) {
      res.setHeader("X-Response-Ms", String(Date.now() - began));
      res.setHeader("X-Db-Ms", String(store.db));
      return end.apply(this, args);
    };
    next();
  });
}

module.exports = doThoiGian;
