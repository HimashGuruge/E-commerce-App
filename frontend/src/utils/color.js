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

export function injectNavbar(navbarSettings) {
  const css = `
:root {
  --navbar-bg: ${navbarSettings.navbarBg || "#ffffff"};
  --navbar-text: ${navbarSettings.navbarText || "#475569"};
  --navbar-border: ${navbarSettings.navbarBorder || "#f1f5f9"};
  --topbar-bg: ${navbarSettings.topbarBg || "#f5f5f5"};
  --topbar-text: ${navbarSettings.topbarText || "#737373"};
}
.navbar-text-base { color: var(--navbar-text); }
`;
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
