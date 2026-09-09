const encoder = new TextEncoder();
const limits = { local: 8192, session: 128 * 1024 };

// The controller supplies the project identity. Guest keys never address the
// website's own storage or another project's namespace.
export class ProjectOutputStorage {
  constructor(window, scope) {
    if (typeof scope !== "string" || !scope || scope.length > 2048) {
      throw new TypeError("Project storage requires a bounded controller identity");
    }
    this.window = window;
    this.prefix = `resources-output:${encodeURIComponent(scope)}:`;
    this.listeners = new Set();
    this.changed = event => {
      for (const entry of this.listeners) {
        if (event.storageArea === this.area(entry.kind) &&
            (event.key === null || event.key === this.key(entry.key))) entry.listener();
      }
    };
    window.addEventListener("storage", this.changed);
  }
  area(kind) {
    if (!Object.hasOwn(limits, kind)) throw new TypeError("Unknown project storage area");
    return kind === "local" ? this.window.localStorage : this.window.sessionStorage;
  }
  key(key) {
    if (typeof key !== "string" || key.length > 1024) throw new TypeError("Project storage key is too long");
    return this.prefix + key;
  }
  get(kind, key) { return this.area(kind).getItem(this.key(key)); }
  set(kind, key, value) {
    const area = this.area(kind), target = this.key(key);
    if (typeof value !== "string") throw new TypeError("Project storage values must be strings");
    let size = encoder.encode(key).length + encoder.encode(value).length;
    // Count the namespace, not the entire origin. Replacements are atomic and
    // other tabs may have changed localStorage since our last operation.
    for (let index = 0; index < area.length && size <= limits[kind]; index++) {
      const existing = area.key(index);
      if (existing?.startsWith(this.prefix) && existing !== target) {
        size += encoder.encode(existing.slice(this.prefix.length)).length;
        size += encoder.encode(area.getItem(existing) || "").length;
      }
    }
    if (size > limits[kind]) throw new RangeError(`Project ${kind} storage quota exceeded`);
    area.setItem(target, value);
  }
  delete(kind, key) { this.area(kind).removeItem(this.key(key)); }
  listen(kind, key, listener) {
    this.area(kind); this.key(key);
    this.listeners.add({ kind, key, listener });
  }
  destroy() {
    this.window.removeEventListener("storage", this.changed);
    this.listeners.clear();
  }
}
