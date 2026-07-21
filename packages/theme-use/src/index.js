const TOKEN_NAME = /^--[a-z][a-z0-9-]*$/;
const SELECTOR = /^(?::root|html(?:\[[a-z-]+=(?:"[a-z0-9-]+"|'[a-z0-9-]+')\])?|html:not\(\[[a-z-]+\]\))$/;
const TROUBLESOME = /[\u0000-\u001f\u007f{};<>]/u;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function safeValue(value, label) {
  const text = String(value).trim();
  if (!text || text.length > 512 || TROUBLESOME.test(text)) throw new Error(`Unsafe theme value for ${label}`);
  const compact = text.replace(/\s+/g, "").toLowerCase();
  if (compact.includes("url(") || compact.includes("javascript:") || compact.includes("expression(")) {
    throw new Error(`Theme value may not load or execute content: ${label}`);
  }
  return text;
}

export function defineTheme({ name, selector, tokens }, { allowedTokens = [] } = {}) {
  const themeName = String(name || "").trim();
  if (!/^[a-z][a-z0-9-]*$/.test(themeName)) throw new Error(`Invalid theme name: ${name}`);
  if (!SELECTOR.test(selector || "")) throw new Error(`Invalid theme selector: ${selector}`);
  plainObject(tokens, `theme ${themeName} tokens`);
  const allowlist = new Set(allowedTokens);
  const normalized = {};
  for (const [token, value] of Object.entries(tokens)) {
    if (!TOKEN_NAME.test(token)) throw new Error(`Invalid theme token: ${token}`);
    if (allowlist.size && !allowlist.has(token)) throw new Error(`Theme token is not allowed: ${token}`);
    normalized[token] = safeValue(value, token);
  }
  return Object.freeze({ name: themeName, selector, tokens: Object.freeze(normalized) });
}

export function mergeTheme(theme, overrides = {}, options = {}) {
  plainObject(overrides, "theme overrides");
  return defineTheme({ ...theme, tokens: { ...theme.tokens, ...overrides } }, options);
}

export function renderThemeCss(themes) {
  if (!Array.isArray(themes) || !themes.length) throw new Error("At least one theme is required");
  return themes.map((theme) => {
    const declarations = Object.entries(theme.tokens).map(([token, value]) => `  ${token}: ${value};`).join("\n");
    return `${theme.selector} {\n${declarations}\n}`;
  }).join("\n\n");
}
