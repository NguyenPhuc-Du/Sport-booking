const cache = require("./memory-cache");

const NAM_PHUT = 5 * 60 * 1000;

function nho(key, loader) {
  return cache.remember(key, NAM_PHUT, loader);
}

function xoa(prefix) {
  cache.forget(prefix);
}

module.exports = { NAM_PHUT, nho, xoa };
