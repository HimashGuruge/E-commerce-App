import api from "@/utils/api";

const LS_KEY = "sitePublicSettings";

function readStoredSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Only accept a plain object; ignore corrupt or unexpected values.
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeStoredSettings(settings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode, quota) — in-memory cache still works.
  }
}

let cache = readStoredSettings();
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
        writeStoredSettings(cache);
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

// Admin save triggers this; next fetch will refetch fresh data.
export function invalidatePublicSettings() {
  cache = null;
}
