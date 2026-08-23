export const RESOURCES_RUNTIME_PROFILES = Object.freeze({
  local: Object.freeze({
    name: "browser-use",
    navigation: "same-origin-ssr-swap",
    browserJavaScript: true,
    storage: "sqlite-routes",
  }),
  edge: Object.freeze({
    name: "document",
    navigation: "document",
    browserJavaScript: "host-owned machine controller",
    storage: "manifest-objects",
  }),
});

export function resourcesRuntimeProfile(value = "local") {
  if (value && typeof value === "object") {
    if (!Object.values(RESOURCES_RUNTIME_PROFILES).includes(value)) throw new Error("Resources.co runtime profile must be a known immutable profile");
    return value;
  }
  const profile = RESOURCES_RUNTIME_PROFILES[value] || Object.values(RESOURCES_RUNTIME_PROFILES).find((item) => item.name === value);
  if (!profile) throw new Error(`Unsupported Resources.co runtime profile: ${value}`);
  return profile;
}
