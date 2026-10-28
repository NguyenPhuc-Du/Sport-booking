const store = new Map();
const pending = new Map();

function read(key) {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

function clone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

async function remember(key, ttlMs, loader) {
  const cached = read(key);
  if (cached !== undefined) return clone(cached);

  if (pending.has(key)) return clone(await pending.get(key));

  const job = Promise.resolve()
    .then(loader)
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      pending.delete(key);
      return value;
    })
    .catch((error) => {
      pending.delete(key);
      throw error;
    });

  pending.set(key, job);
  return clone(await job);
}

function forget(prefix) {
  for (const key of store.keys()) {
    if (String(key).startsWith(prefix)) store.delete(key);
  }
}

function clearCatalog() {
  forget("owner:venues:");
  forget("owner:courts:");
  forget("catalog:");
  forget("price:");
  forget("app:");
}

module.exports = { remember, forget, clearCatalog };
