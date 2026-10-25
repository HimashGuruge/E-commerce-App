// Shared helpers for service card styling.
// Used by the admin page (ManageServices) and the homepage services section (HomeInfomationsCard).

export const DEFAULT_SERVICE_STYLE = {
  title: {
    fontSize: 16,
    fontFamily: "",
    fontWeight: 700,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    transform: "none",
    align: "left",
    letterSpacing: 0,
    wordSpacing: 0,
    lineHeight: 1.3,
    shadow: { enabled: false, color: "#0f172a", blur: 4 },
  },
  desc: {
    fontSize: 14,
    fontFamily: "",
    fontWeight: 400,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    transform: "none",
    align: "left",
    letterSpacing: 0,
    wordSpacing: 0,
    lineHeight: 1.5,
    shadow: { enabled: false, color: "#0f172a", blur: 4 },
  },
  colors: { title: "#0f172a", desc: "#64748b" },
  card: {
    bgColor: "#f8fafc",
    gradient: { enabled: false, from: "#f8fafc", to: "#eef2f7" },
    bgOpacity: 100,
    padding: 20,
    spacing: 16,
    borderColor: "#e2e8f0",
    borderWidth: 0,
    borderRadius: 16,
    shadow: { enabled: false, color: "#0f172a", blur: 10 },
  },
  icon: {
    color: "#F85606",
    bgColor: "#ffffff",
    size: 32,
    containerSize: 64,
    padding: 0,
    radius: 12,
  },
  image: {
    width: 40,
    height: 40,
    objectFit: "contain",
    radius: 8,
    borderColor: "#e2e8f0",
    borderWidth: 0,
  },
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
const OBJECT_FITS = ["cover", "contain"];

// Carry over legacy top-level color fields (old docs stored titleColor /
// descColor / bgColor directly on the document) before merging the style object.
const applyLegacy = (base, legacy) => {
  if (isHex(legacy.titleColor)) base.colors.title = legacy.titleColor;
  if (isHex(legacy.descColor)) base.colors.desc = legacy.descColor;
  if (isHex(legacy.bgColor)) base.card.bgColor = legacy.bgColor;
};

export function normalizeServiceStyle(raw, legacy = {}) {
  const base = JSON.parse(JSON.stringify(DEFAULT_SERVICE_STYLE));
  applyLegacy(base, legacy);
  if (raw && typeof raw === "object") {
    base.title = normalizeTypography(raw.title, base.title);
    base.desc = normalizeTypography(raw.desc, base.desc);
    if (raw.colors && typeof raw.colors === "object") {
      base.colors.title = isHex(raw.colors.title) ? raw.colors.title : base.colors.title;
      base.colors.desc = isHex(raw.colors.desc) ? raw.colors.desc : base.colors.desc;
    }
    const c = raw.card && typeof raw.card === "object" ? raw.card : {};
    base.card.bgColor = isHex(c.bgColor) ? c.bgColor : base.card.bgColor;
    if (c.gradient && typeof c.gradient === "object") {
      base.card.gradient.enabled = Boolean(c.gradient.enabled);
      base.card.gradient.from = isHex(c.gradient.from) ? c.gradient.from : base.card.gradient.from;
      base.card.gradient.to = isHex(c.gradient.to) ? c.gradient.to : base.card.gradient.to;
    }
    base.card.bgOpacity = Math.round(clampNum(c.bgOpacity, 0, 100, 100));
    base.card.padding = Math.round(clampNum(c.padding, 0, 64, 20));
    base.card.spacing = Math.round(clampNum(c.spacing, 0, 40, 16));
    base.card.borderColor = isHex(c.borderColor) ? c.borderColor : base.card.borderColor;
    base.card.borderWidth = Math.round(clampNum(c.borderWidth, 0, 20, 0));
    base.card.borderRadius = Math.round(clampNum(c.borderRadius, 0, 48, 16));
    const sh = c.shadow && typeof c.shadow === "object" ? c.shadow : {};
    base.card.shadow = {
      enabled: Boolean(sh.enabled),
      color: isHex(sh.color) ? sh.color : "#0f172a",
      blur: Math.round(clampNum(sh.blur, 0, 40, 10)),
    };
    const i = raw.icon && typeof raw.icon === "object" ? raw.icon : {};
    base.icon.color = isHex(i.color) ? i.color : base.icon.color;
    base.icon.bgColor = isHex(i.bgColor) ? i.bgColor : base.icon.bgColor;
    base.icon.size = Math.round(clampNum(i.size, 12, 96, 32));
    base.icon.containerSize = Math.round(clampNum(i.containerSize, 24, 140, 64));
    base.icon.padding = Math.round(clampNum(i.padding, 0, 40, 0));
    base.icon.radius = Math.round(clampNum(i.radius, 0, 64, 12));
    const im = raw.image && typeof raw.image === "object" ? raw.image : {};
    base.image.width = Math.round(clampNum(im.width, 0, 400, 40));
    base.image.height = Math.round(clampNum(im.height, 0, 400, 40));
    base.image.objectFit = OBJECT_FITS.includes(im.objectFit) ? im.objectFit : "cover";
    base.image.radius = Math.round(clampNum(im.radius, 0, 64, 8));
    base.image.borderColor = isHex(im.borderColor) ? im.borderColor : base.image.borderColor;
    base.image.borderWidth = Math.round(clampNum(im.borderWidth, 0, 20, 0));
  }
  return base;
}

function normalizeTypography(raw, defaults) {
  const t = { ...defaults, shadow: { ...defaults.shadow } };
  if (!raw || typeof raw !== "object") return t;
  t.bold = Boolean(raw.bold);
  t.italic = Boolean(raw.italic);
  t.underline = Boolean(raw.underline);
  t.strike = Boolean(raw.strike);
  t.fontSize = clampNum(raw.fontSize, 10, 48, defaults.fontSize);
  t.fontFamily = typeof raw.fontFamily === "string" ? raw.fontFamily.slice(0, 200) : "";
  t.fontWeight = Math.round(clampNum(raw.fontWeight, 100, 900, defaults.fontWeight));
  t.transform = TRANSFORMS.includes(raw.transform) ? raw.transform : "none";
  t.align = ALIGNS.includes(raw.align) ? raw.align : "left";
  t.letterSpacing = clampNum(raw.letterSpacing, -5, 20, 0);
  t.wordSpacing = clampNum(raw.wordSpacing, 0, 40, 0);
  t.lineHeight = clampNum(raw.lineHeight, 0.8, 3, defaults.lineHeight);
  const sh = raw.shadow && typeof raw.shadow === "object" ? raw.shadow : {};
  t.shadow = {
    enabled: Boolean(sh.enabled),
    color: isHex(sh.color) ? sh.color : defaults.shadow.color,
    blur: Math.round(clampNum(sh.blur, 0, 24, defaults.shadow.blur)),
  };
  return t;
}

export function hexToRgba(hex, alpha = 1) {
  if (!isHex(hex)) return `rgba(24, 60, 90, ${alpha})`;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function textStyle(t, color) {
  const weight = Math.max(t.bold ? 700 : 0, Math.round(clampNum(t.fontWeight, 100, 900, 400)));
  const decorations = [t.underline ? "underline" : "", t.strike ? "line-through" : ""].filter(Boolean);
  return {
    fontSize: `${clampNum(t.fontSize, 10, 48, 14)}px`,
    fontFamily: t.fontFamily || undefined,
    fontWeight: weight,
    fontStyle: t.italic ? "italic" : undefined,
    textDecoration: decorations.length ? decorations.join(" ") : undefined,
    textTransform: TRANSFORMS.includes(t.transform) ? t.transform : "none",
    textAlign: ALIGNS.includes(t.align) ? t.align : "left",
    color,
    letterSpacing: `${clampNum(t.letterSpacing, -5, 20, 0)}px`,
    wordSpacing: `${clampNum(t.wordSpacing, 0, 40, 0)}px`,
    lineHeight: clampNum(t.lineHeight, 0.8, 3, 1.4),
    textShadow:
      t.shadow && t.shadow.enabled && isHex(t.shadow.color)
        ? `0 0 ${clampNum(t.shadow.blur, 0, 24, 4)}px ${t.shadow.color}`
        : undefined,
  };
}

// CSS for the service card container (background, padding, spacing, border, radius, shadow).
export function serviceCardStyle(style) {
  const s = style || {};
  const card = s.card || {};
  const alpha = clampNum(card.bgOpacity, 0, 100, 100) / 100;
  const solid = hexToRgba(card.bgColor || DEFAULT_SERVICE_STYLE.card.bgColor, alpha);
  const gradEnabled = card.gradient && card.gradient.enabled;
  const from = hexToRgba(isHex(card.gradient?.from) ? card.gradient.from : card.bgColor || DEFAULT_SERVICE_STYLE.card.bgColor, alpha);
  const to = hexToRgba(isHex(card.gradient?.to) ? card.gradient.to : card.bgColor || DEFAULT_SERVICE_STYLE.card.bgColor, alpha);
  const borderWidth = Math.round(clampNum(card.borderWidth, 0, 20, 0));
  const radius = clampNum(card.borderRadius, 0, 48, 16);
  const shadowEnabled = card.shadow && card.shadow.enabled;
  return {
    background: gradEnabled
      ? `linear-gradient(135deg, ${from}, ${to})`
      : solid,
    padding: `${clampNum(card.padding, 0, 64, 20)}px`,
    gap: `${clampNum(card.spacing, 0, 40, 16)}px`,
    border:
      borderWidth > 0
        ? `${borderWidth}px solid ${isHex(card.borderColor) ? card.borderColor : DEFAULT_SERVICE_STYLE.card.borderColor}`
        : "1px solid transparent",
    borderRadius: `${radius}px`,
    boxShadow: shadowEnabled
      ? `0 ${Math.round(clampNum(card.shadow.blur, 0, 40, 10) / 2)}px ${clampNum(card.shadow.blur, 0, 40, 10)}px ${hexToRgba(card.shadow.color, 0.12)}`
      : "0 1px 2px rgba(15, 23, 42, 0.06)",
  };
}

export function serviceTitleStyle(style) {
  const s = style || {};
  const color = isHex(s.colors?.title) ? s.colors.title : DEFAULT_SERVICE_STYLE.colors.title;
  return textStyle(s.title || DEFAULT_SERVICE_STYLE.title, color);
}

export function serviceDescStyle(style) {
  const s = style || {};
  const color = isHex(s.colors?.desc) ? s.colors.desc : DEFAULT_SERVICE_STYLE.colors.desc;
  return textStyle(s.desc || DEFAULT_SERVICE_STYLE.desc, color);
}

export function serviceIconContainerStyle(style) {
  const s = style || {};
  const icon = s.icon || {};
  const size = Math.round(clampNum(icon.containerSize, 24, 140, 64));
  return {
    width: `${size}px`,
    height: `${size}px`,
    background: isHex(icon.bgColor) ? icon.bgColor : DEFAULT_SERVICE_STYLE.icon.bgColor,
    borderRadius: `${clampNum(icon.radius, 0, 64, 12)}px`,
    padding: `${clampNum(icon.padding, 0, 40, 0)}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: "0",
  };
}

export function serviceIconColor(style) {
  const s = style || {};
  const icon = s.icon || {};
  return isHex(icon.color) ? icon.color : DEFAULT_SERVICE_STYLE.icon.color;
}

export function serviceIconSize(style) {
  const s = style || {};
  const icon = s.icon || {};
  return Math.round(clampNum(icon.size, 12, 96, 32));
}

export function serviceImageStyle(style) {
  const s = style || {};
  const im = s.image || {};
  const width = Math.round(clampNum(im.width, 0, 400, 40));
  const height = Math.round(clampNum(im.height, 0, 400, 40));
  const fit = OBJECT_FITS.includes(im.objectFit) ? im.objectFit : "cover";
  const radius = clampNum(im.radius, 0, 64, 8);
  const borderWidth = Math.round(clampNum(im.borderWidth, 0, 20, 0));
  return {
    width: width > 0 ? `${width}px` : "auto",
    height: height > 0 ? `${height}px` : "auto",
    objectFit: fit,
    borderRadius: `${radius}px`,
    border:
      borderWidth > 0
        ? `${borderWidth}px solid ${isHex(im.borderColor) ? im.borderColor : DEFAULT_SERVICE_STYLE.image.borderColor}`
        : undefined,
  };
}
