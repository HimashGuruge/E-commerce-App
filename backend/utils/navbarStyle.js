// Server-side whitelist/normalization for the main navbar customization.
// An empty string stays empty and means "use the fallback" (brand color /
// navbar text color) — the frontend resolves those fallbacks.

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const isHex = (v) => typeof v === "string" && HEX_RE.test(v);

const clampNum = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(max, Math.max(min, n)));
};

export const DEFAULT_NAVBAR_STYLE = {
  height: 60,
  logoSize: 36,
  brandTextSize: 20,
  brandTextColor: "",
  searchBg: "#ffffff",
  searchBorder: "#e2e8f0",
  searchText: "#0f172a",
  searchBtnBg: "",
  searchBtnText: "#ffffff",
  cartColor: "",
  loginColor: "#475569",
  signupBtnBg: "",
  signupBtnText: "#ffffff",
  letterSize: 18,
  letterColor: "#ffffff",
  logoBg: "#f97316",
  sellerLinkEnabled: true,
  sellerLinkColor: "",
};

/**
 * Whitelist and clamp the navbar style object before saving.
 * Falls back to sensible defaults for any missing/invalid key.
 */
export function normalizeNavbarStyle(raw = {}) {
  const base = { ...DEFAULT_NAVBAR_STYLE };
  if (!raw || typeof raw !== "object") return base;

  base.height = clampNum(raw.height, 40, 120, base.height);
  base.logoSize = clampNum(raw.logoSize, 20, 96, base.logoSize);
  base.brandTextSize = clampNum(raw.brandTextSize, 12, 36, base.brandTextSize);
  base.letterSize = clampNum(raw.letterSize, 8, 72, base.letterSize);

  // Keys where an empty string is a valid value meaning "use fallback".
  const fallbackKeys = ["brandTextColor", "searchBtnBg", "cartColor", "signupBtnBg", "sellerLinkColor"];
  // Keys that must be a valid HEX (no empty fallback).
  const requiredHexKeys = ["searchBg", "searchBorder", "searchText", "searchBtnText", "loginColor", "signupBtnText", "letterColor", "logoBg"];

  for (const key of fallbackKeys) {
    base[key] = isHex(raw[key]) ? raw[key] : "";
  }
  for (const key of requiredHexKeys) {
    base[key] = isHex(raw[key]) ? raw[key] : DEFAULT_NAVBAR_STYLE[key];
  }
  // Boolean field — keep the saved value (default `true` when missing/not boolean).
  if (typeof raw.sellerLinkEnabled === "boolean") base.sellerLinkEnabled = raw.sellerLinkEnabled;
  return base;
}
