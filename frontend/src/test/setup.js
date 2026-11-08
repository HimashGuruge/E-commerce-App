// Vitest setup: guarantee a working `localStorage` in the jsdom environment.
//
// On Node 22+, a native (experimental, flag-gated) global `localStorage` shadows
// jsdom's, so the bare `localStorage` and even `window.localStorage` can be
// `undefined`. Tests that call `localStorage.clear()` in `beforeEach` would
// crash before anything renders. We install a tiny in-memory shim only when it
// is genuinely missing, so jsdom's own storage is preferred when available.

function makeLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    key: (i) => Object.keys(store)[i] ?? null,
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
  };
}

function installIfMissing(target) {
  if (!target || target.localStorage) return; // jsdom (or Node) already provides it
  Object.defineProperty(target, "localStorage", {
    value: makeLocalStorage(),
    configurable: true,
    writable: true,
  });
}

if (typeof window !== "undefined") installIfMissing(window);
if (typeof globalThis !== "undefined") installIfMissing(globalThis);
