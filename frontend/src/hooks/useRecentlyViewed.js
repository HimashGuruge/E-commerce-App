import { useEffect, useState } from "react";

const KEY = "recentlyViewedProducts";
const MAX = 6;

function readIds() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

function writeIds(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  } catch {
    // Storage unavailable (private mode, quota) — no-op.
  }
}

/**
 * Records a product id at the front of a small recency list (max MAX ids).
 * Safe to call repeatedly for the same product: re-records move it first.
 */
export function recordProductView(productId) {
  if (!productId || typeof productId !== "string") return;
  const next = [productId, ...readIds().filter((id) => id !== productId)];
  writeIds(next);
  // Notify same-tab pages (the hook subscribes to this CustomEvent too).
  window.dispatchEvent(new CustomEvent("recently-viewed-updated"));
}

/**
 * Returns the list of recently viewed product ids (most recent first).
 * The list updates live when other tabs record a view, or when a view is
 * recorded anywhere in this tab.
 */
export function useRecentlyViewed() {
  const [ids, setIds] = useState(readIds);

  useEffect(() => {
    const refresh = () => setIds(readIds());
    const onStorage = (e) => {
      if (e.key === KEY) refresh();
    };
    window.addEventListener("recently-viewed-updated", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("recently-viewed-updated", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return ids;
}
