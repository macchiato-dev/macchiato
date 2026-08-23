// MicroQuickJS intentionally has no Proxy. The build lowers static dataset
// access to these ordinary DOM calls, preserving the browser-facing data-* API
// without adding a proxy implementation to the resident runtime.
globalThis.__resourcesDatasetGet = function (element, name) {
  var value = element.getAttribute(name);
  return value === null ? undefined : value;
};
globalThis.__resourcesDatasetSet = function (element, name, value) {
  element.setAttribute(name, String(value));
  return value;
};
globalThis.__resourcesDatasetDelete = function (element, name) {
  element.removeAttribute(name);
  return true;
};
