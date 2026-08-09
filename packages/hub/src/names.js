export const NAMESPACE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_NAMESPACE_NAMES = Object.freeze(new Set([
  "admin", "administrator", "api", "auth", "blog", "docs", "help", "login",
  "logout", "organizations", "projects", "root", "security", "settings",
  "signup", "support", "system", "try", "www",
]));

export function namespaceName(value, { field = "name", minimum = 4 } = {}) {
  const result = String(value || "").trim().toLowerCase();
  if (result.length < minimum || result.length > 63) throw new Error(`${field} must be between ${minimum} and 63 characters`);
  if (!NAMESPACE_NAME.test(result)) throw new Error(`${field} must use lowercase letters, numbers, and single hyphens`);
  if (RESERVED_NAMESPACE_NAMES.has(result)) throw new Error(`That ${field} is reserved`);
  return result;
}
