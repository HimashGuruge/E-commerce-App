function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function blendWithWhite(r, g, b, ratio) {
  return [
    r + (255 - r) * ratio,
    g + (255 - g) * ratio,
    b + (255 - b) * ratio,
  ];
}

function blendWithBlack(r, g, b, ratio) {
  return [
    r * (1 - ratio),
    g * (1 - ratio),
    b * (1 - ratio),
  ];
}

export function generateBrandShades(hex) {
  const [r, g, b] = hexToRgb(hex);
  return {
    50: rgbToHex(...blendWithWhite(r, g, b, 0.95)),
    100: rgbToHex(...blendWithWhite(r, g, b, 0.85)),
    200: rgbToHex(...blendWithWhite(r, g, b, 0.6)),
    300: rgbToHex(...blendWithWhite(r, g, b, 0.35)),
    400: rgbToHex(...blendWithWhite(r, g, b, 0.15)),
    500: hex,
    600: rgbToHex(...blendWithBlack(r, g, b, 0.15)),
    700: rgbToHex(...blendWithBlack(r, g, b, 0.35)),
    800: rgbToHex(...blendWithBlack(r, g, b, 0.55)),
    900: rgbToHex(...blendWithBlack(r, g, b, 0.75)),
  };
}

export function injectTheme(primaryColor) {
  const shades = generateBrandShades(primaryColor);
  const css = `
:root {
  --color-brand: ${primaryColor};
  --color-brand-dark: ${shades[600]};
  --color-brand-light: ${shades[400]};
  --color-brand-50: ${shades[50]};
  --color-brand-100: ${shades[100]};
  --color-brand-200: ${shades[200]};
  --color-brand-300: ${shades[300]};
  --color-brand-400: ${shades[400]};
  --color-brand-500: ${shades[500]};
  --color-brand-600: ${shades[600]};
  --color-brand-700: ${shades[700]};
  --color-brand-800: ${shades[800]};
  --color-brand-900: ${shades[900]};
}
`;
  let style = document.getElementById("theme-variables");
  if (!style) {
    style = document.createElement("style");
    style.id = "theme-variables";
    document.head.appendChild(style);
  }
  style.textContent = css;
}

// Resolve the advanced navbar style object to concrete values.
// Empty strings mean "use fallback" (brand color / navbar text color).
export function resolveNavbarStyle(settings) {
  const n = settings && typeof settings.navbar === "object" ? settings.navbar : {};
  const num = (v, fallback) => {
    const parsed = Number(v);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
  };
  return {
    height: num(n.height, 60),
    logoSize: num(n.logoSize, 36),
    brandTextSize: num(n.brandTextSize, 20),
    brandText: n.brandTextColor || "",
    searchBg: n.searchBg || "#ffffff",
    searchBorder: n.searchBorder || "#e2e8f0",
    searchText: n.searchText || "#0f172a",
    searchBtnBg: n.searchBtnBg || "",
    searchBtnText: n.searchBtnText || "#ffffff",
    cart: n.cartColor || "",
    login: n.loginColor || "",
    signupBg: n.signupBtnBg || "",
    signupText: n.signupBtnText || "#ffffff",
    letterSize: num(n.letterSize, 18),
    letterColor: n.letterColor || "#ffffff",
    logoBg: n.logoBg || "#f97316",
  };
}

export function injectNavbar(navbarSettings) {
  const nav = resolveNavbarStyle(navbarSettings);
  const mobileVars = `
:root {
  --navbar-bg: ${navbarSettings.navbarBg || "#ffffff"};
  --navbar-text: ${navbarSettings.navbarText || "#475569"};
  --navbar-border: ${navbarSettings.navbarBorder || "#f1f5f9"};
  --topbar-bg: ${navbarSettings.topbarBg || "#f5f5f5"};
  --topbar-text: ${navbarSettings.topbarText || "#737373"};
  --navbar-height: 56px;
  --navbar-pad: 8px;
  --navbar-logo: ${Math.min(nav.logoSize, 8 * 4)}px;
  --navbar-brand-size: ${Math.min(nav.brandTextSize, 18)}px;
  --navbar-brand: ${nav.brandText};
  --navbar-search-bg: ${nav.searchBg};
  --navbar-search-border: ${nav.searchBorder};
  --navbar-search-text: ${nav.searchText};
  --navbar-search-btn: ${nav.searchBtnBg || "var(--color-brand-500)"};
  --navbar-search-btn-text: ${nav.searchBtnText};
  --navbar-cart: ${nav.cart};
  --navbar-login: ${nav.login};
  --navbar-signup: ${nav.signupBg || "var(--color-brand-600)"};
  --navbar-signup-text: ${nav.signupText};
  --navbar-letter: ${Math.min(nav.letterSize, 24)}px;
  --navbar-letter-color: ${nav.letterColor};
  --navbar-logo-bg: ${nav.logoBg};
}
.navbar-text-base { color: var(--navbar-text); }
@media (min-width: 1024px) {
  :root {
    --navbar-height: ${nav.height}px;
    --navbar-pad: 10px;
    --navbar-logo: ${nav.logoSize}px;
    --navbar-brand-size: ${nav.brandTextSize}px;
    --navbar-letter: ${nav.letterSize}px;
  }
}
`;
  const css = mobileVars;
  let style = document.getElementById("navbar-variables");
  if (!style) {
    style = document.createElement("style");
    style.id = "navbar-variables";
    document.head.appendChild(style);
  }
  style.textContent = css;
}

export function injectFont(fontFamily, fontUrl) {
  if (fontUrl) {
    let link = document.getElementById("font-stylesheet");
    if (!link) {
      link = document.createElement("link");
      link.id = "font-stylesheet";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = fontUrl;
  } else {
    const link = document.getElementById("font-stylesheet");
    if (link) link.remove();
  }
  const css = `:root { --font-family: ${fontFamily}; }`;
  let style = document.getElementById("font-variables");
  if (!style) {
    style = document.createElement("style");
    style.id = "font-variables";
    document.head.appendChild(style);
  }
  style.textContent = css;
}

// Load a font stylesheet dedicated to the announcement bar (does not touch
// the site-wide font-stylesheet).
export function injectBarFont(fontUrl) {
  const id = "bar-font-stylesheet";
  let link = document.getElementById(id);
  if (fontUrl) {
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = fontUrl;
  } else {
    if (link) link.remove();
  }
}
