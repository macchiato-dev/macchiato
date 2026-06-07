const DEFAULT_TRANSITION_POLICY = {
  mode: "auto",
  sameOrigin: true,
  trustedSources: [],
  presanitizedCache: {
    required: false,
    writeAccess: "restricted",
    allowedWriters: [],
  },
  wasmFallback: true,
};

const SAFE_HEADER_VALUE = /^[\t\x20-\x7e]*$/;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function normalizeTrustedSource(source) {
  if (typeof source === "string") return { type: "prefix", value: source };
  if (!source || typeof source !== "object") throw new Error("Trusted source must be a string or object");
  if (!source.type || !source.value) throw new Error("Trusted source requires type and value");
  if (!["origin", "prefix"].includes(source.type)) {
    throw new Error(`Unsupported trusted source type: ${source.type}`);
  }
  return {
    type: source.type,
    value: String(source.value),
  };
}

export function createSitePolicy(policy = {}) {
  const merged = {
    ...DEFAULT_TRANSITION_POLICY,
    ...policy,
    trustedSources: (policy.trustedSources || DEFAULT_TRANSITION_POLICY.trustedSources).map(normalizeTrustedSource),
    presanitizedCache: {
      ...DEFAULT_TRANSITION_POLICY.presanitizedCache,
      ...(policy.presanitizedCache || {}),
    },
  };
  validateSitePolicy(merged);
  return merged;
}

export function validateSitePolicy(policy) {
  if (!["auto", "trusted-only", "wasm-only", "document"].includes(policy.mode)) {
    throw new Error(`Unsupported transition mode: ${policy.mode}`);
  }
  if (typeof policy.sameOrigin !== "boolean") throw new Error("sameOrigin must be boolean");
  if (typeof policy.wasmFallback !== "boolean") throw new Error("wasmFallback must be boolean");
  validatePresanitizedCache(policy.presanitizedCache || {});
}

export function validatePresanitizedCache(cache = {}) {
  const writeAccess = cache.writeAccess || "restricted";
  if (writeAccess !== "restricted") {
    throw new Error("Pre-sanitized HTML cache writeAccess must be restricted");
  }
  if (!Array.isArray(cache.allowedWriters)) {
    throw new Error("Pre-sanitized HTML cache allowedWriters must be an array");
  }
  if (cache.allowedWriters.length === 0 && cache.required) {
    throw new Error("Required pre-sanitized cache must declare allowedWriters");
  }
}

export function trustedSourceMatches(source, requestUrl) {
  const url = new URL(requestUrl);
  if (source.type === "origin") return url.origin === source.value;
  if (source.type === "prefix") return requestUrl.startsWith(source.value);
  return false;
}

export function isTrustedTransitionSource(requestUrl, policy = createSitePolicy()) {
  return policy.trustedSources.some((source) => trustedSourceMatches(source, requestUrl));
}

export function chooseTransitionMode({
  requestUrl,
  currentOrigin = "",
  cacheHit = false,
  clientWasm = false,
  policy = createSitePolicy(),
} = {}) {
  if (policy.mode === "document") return "document";
  if (policy.sameOrigin && currentOrigin && requestUrl) {
    const nextOrigin = new URL(requestUrl).origin;
    if (nextOrigin !== currentOrigin) return "document";
  }
  if (policy.mode !== "wasm-only" && cacheHit && isTrustedTransitionSource(requestUrl, policy)) {
    return "trusted-presanitized-swap";
  }
  if (policy.mode !== "trusted-only" && policy.wasmFallback && clientWasm) {
    return "client-wasm-sanitize";
  }
  return "document";
}

export function renderDocument({
  title = "",
  lang = "en",
  head = "",
  body = "",
  csp = "",
  transitionManifest = null,
} = {}) {
  const cspMeta = csp ? `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(assertHeaderValue(csp))}">` : "";
  const manifest = transitionManifest
    ? `<script type="application/json" id="macchiato-site-transitions">${escapeHtml(JSON.stringify(transitionManifest))}</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${cspMeta}
<title>${escapeHtml(title)}</title>
${head}
</head>
<body>
${body}
${manifest}
</body>
</html>`;
}

function assertHeaderValue(value) {
  const text = String(value);
  if (!SAFE_HEADER_VALUE.test(text)) throw new Error("Header value contains disallowed characters");
  return text;
}

export function createTransitionManifest(policy) {
  const safePolicy = createSitePolicy(policy);
  return {
    mode: safePolicy.mode,
    sameOrigin: safePolicy.sameOrigin,
    wasmFallback: safePolicy.wasmFallback,
    trustedSources: safePolicy.trustedSources,
  };
}
