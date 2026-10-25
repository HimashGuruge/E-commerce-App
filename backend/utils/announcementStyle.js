const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isHex = (v) => typeof v === "string" && HEX_RE.test(v);

const clampNum = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"];
const ALIGNS = ["left", "center", "right"];

// Whitelist and validate the per-announcement style object before saving.
export function normalizeAnnouncementStyle(raw) {
  const s = {
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
    color: isHex(sh.color) ? sh.color : "#0f172a",
    blur: Math.round(clampNum(sh.blur, 0, 24, 4)),
  };
  return s;
}

export { isHex };
