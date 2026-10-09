import api from "@/utils/api";

let cache = null;
let pending = null;
const listeners = new Set();

const notify = (settings) => {
  listeners.forEach((cb) => {
    try { cb(settings); } catch (e) { console.error(e); }
  });
};

export function getPublicSettings({ force = false } = {}) {
  if (!force && cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = api
    .get("/api/settings/public")
    .then((res) => {
      if (res.data?.success && res.data.settings) {
        cache = res.data.settings;
        pending = null;
        notify(cache);
        return cache;
      }
      pending = null;
      throw new Error("Invalid settings response");
    })
    .catch((err) => {
      pending = null;
      throw err;
    });

  return pending;
}

export function getCachedSettings() {
  return cache;
}

export function subscribeToSettings(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Admin saves trigger this; next fetch will refetch fresh data.
export function invalidatePublicSettings() {
  cache = null;
}
