export const LOCALE_COOKIE = "resources_locale";
const SUPPORTED = Object.freeze(["en", "es"]);

function cookieValue(header, name) {
  for (const part of String(header || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0 && part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return "";
}

export function negotiateLocale(request, { locales = SUPPORTED, defaultLocale = "en" } = {}) {
  const selected = cookieValue(request.headers.get("cookie"), LOCALE_COOKIE);
  if (locales.includes(selected)) return selected;
  const accepted = String(request.headers.get("accept-language") || "")
    .split(",")
    .map((entry, order) => {
      const [tag, ...parameters] = entry.trim().split(";");
      const quality = parameters.map((part) => /^q=(0(?:\.\d+)?|1(?:\.0+)?)$/.exec(part.trim())).find(Boolean);
      return { locale: tag.toLowerCase().split("-")[0], quality: quality ? Number(quality[1]) : 1, order };
    })
    .filter((entry) => locales.includes(entry.locale) && entry.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.order - right.order);
  return accepted[0]?.locale || defaultLocale;
}

export function parseLanguageRoute(pathname, locales = SUPPORTED) {
  const match = /^\/language\/([a-z]{2})(\/.*)?$/.exec(pathname);
  if (!match || !locales.includes(match[1])) return null;
  return Object.freeze({ locale: match[1], pathname: match[2] || "/" });
}

export function parseLanguageSelection(url, locales = SUPPORTED) {
  if (url.pathname !== "/language") return null;
  const locale = url.searchParams.get("locale");
  const pathname = url.searchParams.get("return") || "/";
  if (!locales.includes(locale) || !pathname.startsWith("/") || pathname.startsWith("//") || pathname.startsWith("/language")) return null;
  return Object.freeze({ locale, pathname });
}

export function localeCookie(locale, { secure = true } = {}) {
  if (!SUPPORTED.includes(locale)) throw new Error("Unsupported locale cookie");
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function localizedObjectKey(locale, publicKey) {
  if (!SUPPORTED.includes(locale) || typeof publicKey !== "string") throw new Error("Invalid localized object key");
  return publicKey.endsWith(".html") && !publicKey.startsWith("-/") ? `locales/${locale}/${publicKey}` : publicKey;
}
