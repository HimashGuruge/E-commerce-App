// Shared helpers for the announcement ticker styling.
// Used by the admin page (AnnouncementManagement) and the homepage ticker (HomeContainer).

export const DEFAULT_ANNOUNCEMENT_STYLE = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  fontSize: 18,
  fontFamily: "",
  fontWeight: 600,
  transform: "none",
  align: "left",
  color: "",
  highlight: "",
  letterSpacing: 0,
  wordSpacing: 0,
  lineHeight: 1.4,
  shadow: { enabled: false, color: "#0f172a", blur: 4 },
};

export const DEFAULT_BAR_STYLE = {
  speed: 12,
  bgColor: "#F85606",
  textColor: "#ffffff",
  fontFamily: "",
  fontUrl: "",
  gradient: { enabled: false, from: "#FF8A3D", to: "#C2410C" },
  bgOpacity: 100,
  padding: 8,
  borderColor: "#ffffff",
  borderWidth: 0,
  borderRadius: 0,
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const isHex = (v) => typeof v === "string" && HEX_RE.test(v);

export function clampNum(v, min, max, fallback) {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"];
const ALIGNS = ["left", "center", "right"];

export function normalizeAnnouncementStyle(raw) {
  const s = { ...DEFAULT_ANNOUNCEMENT_STYLE, shadow: { ...DEFAULT_ANNOUNCEMENT_STYLE.shadow } };
  if (!raw || typeof raw !== "object") return s;
  s.bold = Boolean(raw.bold);
  s.italic = Boolean(raw.italic);
  s.underline = Boolean(raw.underline);
  s.strike = Boolean(raw.strike);
  s.fontSize = clampNum(raw.fontSize, 10, 48, 18);
  s.fontFamily = typeof raw.fontFamily === "string" ? raw.fontFamily.slice(0, 200) : "";
  s.fontWeight = Math.round(clampNum(raw.fontWeight, 100, 900, 600));
  s.transform = TRANSFORMS.includes(raw.transform) ? raw.transform : "none";
  s.align = ALIGNS.includes(raw.align) ? raw.align : "left";
  s.color = isHex(raw.color) ? raw.color : "";
  s.highlight = isHex(raw.highlight) ? raw.highlight : "";
  s.letterSpacing = clampNum(raw.letterSpacing, -5, 20, 0);
  s.wordSpacing = clampNum(raw.wordSpacing, 0, 40, 0);
  s.lineHeight = clampNum(raw.lineHeight, 0.8, 3, 1.4);
  const sh = raw.shadow && typeof raw.shadow === "object" ? raw.shadow : {};
  s.shadow = {
    enabled: Boolean(sh.enabled),
    color: isHex(sh.color) ? sh.color : DEFAULT_ANNOUNCEMENT_STYLE.shadow.color,
    blur: Math.round(clampNum(sh.blur, 0, 24, 4)),
  };
  return s;
}

export function normalizeBarStyle(raw) {
  const b = { ...DEFAULT_BAR_STYLE, gradient: { ...DEFAULT_BAR_STYLE.gradient } };
  if (!raw || typeof raw !== "object") return b;
  b.speed = clampNum(raw.speed, 5, 120, 12);
  b.bgColor = isHex(raw.bgColor) ? raw.bgColor : DEFAULT_BAR_STYLE.bgColor;
  b.textColor = isHex(raw.textColor) ? raw.textColor : DEFAULT_BAR_STYLE.textColor;
  b.fontFamily = typeof raw.fontFamily === "string" ? raw.fontFamily.slice(0, 200) : "";
  b.fontUrl = typeof raw.fontUrl === "string" ? raw.fontUrl.slice(0, 500) : "";
  if (raw.gradient && typeof raw.gradient === "object") {
    b.gradient.enabled = Boolean(raw.gradient.enabled);
    b.gradient.from = isHex(raw.gradient.from) ? raw.gradient.from : b.gradient.from;
    b.gradient.to = isHex(raw.gradient.to) ? raw.gradient.to : b.gradient.to;
  }
  b.bgOpacity = clampNum(raw.bgOpacity, 10, 100, 100);
  b.padding = clampNum(raw.padding, 0, 40, 8);
  b.borderColor = isHex(raw.borderColor) ? raw.borderColor : b.borderColor;
  b.borderWidth = Math.round(clampNum(raw.borderWidth, 0, 10, 0));
  b.borderRadius = clampNum(raw.borderRadius, 0, 24, 0);
  return b;
}

export function hexToRgba(hex, alpha = 1) {
  if (!isHex(hex)) return `rgba(248, 86, 6, ${alpha})`;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function announcementTextColor(style, bar) {
  const s = style || {};
  return isHex(s.color) ? s.color : bar?.textColor || "#ffffff";
}

// CSS for one ticker item. Falls back to the global bar colors for old items
// that have no style of their own.
export function announcementItemStyle(style, bar) {
  const s = style || {};
  const baseWeight = clampNum(s.fontWeight, 100, 900, 600);
  const weight = Math.max(s.bold ? 700 : 0, baseWeight);
  const decorations = [s.underline ? "underline" : "", s.strike ? "line-through" : ""].filter(Boolean);
  return {
    fontSize: `${clampNum(s.fontSize, 10, 48, 18)}px`,
    fontFamily: s.fontFamily || bar?.fontFamily || undefined,
    fontWeight: weight,
    fontStyle: s.italic ? "italic" : undefined,
    textDecoration: decorations.length ? decorations.join(" ") : undefined,
    textTransform: TRANSFORMS.includes(s.transform) ? s.transform : "none",
    textAlign: ALIGNS.includes(s.align) ? s.align : "left",
    color: announcementTextColor(s, bar),
    letterSpacing: `${clampNum(s.letterSpacing, -5, 20, 0)}px`,
    wordSpacing: `${clampNum(s.wordSpacing, 0, 40, 0)}px`,
    lineHeight: clampNum(s.lineHeight, 0.8, 3, 1.4),
    background: isHex(s.highlight) ? s.highlight : undefined,
    padding: isHex(s.highlight) ? "2px 8px" : undefined,
    borderRadius: isHex(s.highlight) ? "6px" : undefined,
    textShadow:
      s.shadow && s.shadow.enabled && isHex(s.shadow.color)
        ? `0 0 ${clampNum(s.shadow.blur, 0, 24, 4)}px ${s.shadow.color}`
        : undefined,
  };
}

// CSS for the whole ticker bar (background, padding, border, radius).
export function barBackgroundStyle(bar) {
  const b = bar || {};
  const alpha = clampNum(b.bgOpacity, 10, 100, 100) / 100;
  const solid = hexToRgba(b.bgColor || DEFAULT_BAR_STYLE.bgColor, alpha);
  const gradEnabled = b.gradient && b.gradient.enabled;
  const from = hexToRgba(isHex(b.gradient?.from) ? b.gradient.from : b.bgColor || DEFAULT_BAR_STYLE.bgColor, alpha);
  const to = hexToRgba(isHex(b.gradient?.to) ? b.gradient.to : b.bgColor || DEFAULT_BAR_STYLE.bgColor, alpha);
  const borderWidth = Math.round(clampNum(b.borderWidth, 0, 10, 0));
  const radius = clampNum(b.borderRadius, 0, 24, 0);
  return {
    background: gradEnabled ? `linear-gradient(90deg, ${from}, ${to})` : solid,
    padding: `${clampNum(b.padding, 0, 40, 8)}px 0`,
    border:
      borderWidth > 0
        ? `${borderWidth}px solid ${isHex(b.borderColor) ? b.borderColor : DEFAULT_BAR_STYLE.borderColor}`
        : undefined,
    borderRadius: radius > 0 ? `${radius}px` : undefined,
  };
}
