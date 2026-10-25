const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isHex = (v) => typeof v === "string" && HEX_RE.test(v);

const clampNum = (v, min, max, fallback) => {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"];
const ALIGNS = ["left", "center", "right"];
const OBJECT_FITS = ["cover", "contain"];

const defTypography = (fontSize, fontWeight, lineHeight) => ({
  fontSize,
  fontFamily: "",
  fontWeight,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  transform: "none",
  align: "left",
  letterSpacing: 0,
  wordSpacing: 0,
  lineHeight,
  shadow: { enabled: false, color: "#0f172a", blur: 4 },
});

const cloneDefault = () => ({
  title: defTypography(16, 700, 1.3),
  desc: defTypography(14, 400, 1.5),
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
});

const normalizeTypography = (raw, defaults) => {
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
};

// Whitelist and validate the per-service style object before saving.
// Falls back to sensible defaults for any missing section/key.
// Carry over any legacy top-level color fields (old docs stored titleColor /
// descColor / bgColor directly on the document) before merging the styled object
// over them.
const applyLegacy = (base, legacy) => {
  if (isHex(legacy.titleColor)) base.colors.title = legacy.titleColor;
  if (isHex(legacy.descColor)) base.colors.desc = legacy.descColor;
  if (isHex(legacy.bgColor)) base.card.bgColor = legacy.bgColor;
};

// Whitelist and validate the per-service style object before saving.
// Falls back to sensible defaults for any missing section/key.
export function normalizeServiceStyle(raw, legacy = {}) {
  const base = cloneDefault();
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
    base.card.padding = Math.round(clampNum(c.padding, 0, 64, base.card.padding));
    base.card.spacing = Math.round(clampNum(c.spacing, 0, 40, base.card.spacing));
    base.card.borderColor = isHex(c.borderColor) ? c.borderColor : base.card.borderColor;
    base.card.borderWidth = Math.round(clampNum(c.borderWidth, 0, 20, base.card.borderWidth));
    base.card.borderRadius = Math.round(clampNum(c.borderRadius, 0, 48, base.card.borderRadius));
    const sh = c.shadow && typeof c.shadow === "object" ? c.shadow : {};
    base.card.shadow = {
      enabled: Boolean(sh.enabled),
      color: isHex(sh.color) ? sh.color : base.card.shadow.color,
      blur: Math.round(clampNum(sh.blur, 0, 40, base.card.shadow.blur)),
    };

    const i = raw.icon && typeof raw.icon === "object" ? raw.icon : {};
    base.icon.color = isHex(i.color) ? i.color : base.icon.color;
    base.icon.bgColor = isHex(i.bgColor) ? i.bgColor : base.icon.bgColor;
    base.icon.size = Math.round(clampNum(i.size, 12, 96, base.icon.size));
    base.icon.containerSize = Math.round(clampNum(i.containerSize, 24, 140, base.icon.containerSize));
    base.icon.padding = Math.round(clampNum(i.padding, 0, 40, base.icon.padding));
    base.icon.radius = Math.round(clampNum(i.radius, 0, 64, base.icon.radius));

    const im = raw.image && typeof raw.image === "object" ? raw.image : {};
    base.image.width = Math.round(clampNum(im.width, 0, 400, base.image.width));
    base.image.height = Math.round(clampNum(im.height, 0, 400, base.image.height));
    base.image.objectFit = OBJECT_FITS.includes(im.objectFit) ? im.objectFit : "cover";
    base.image.radius = Math.round(clampNum(im.radius, 0, 64, base.image.radius));
    base.image.borderColor = isHex(im.borderColor) ? im.borderColor : base.image.borderColor;
    base.image.borderWidth = Math.round(clampNum(im.borderWidth, 0, 20, base.image.borderWidth));
  }
  return base;
}

export { isHex };
