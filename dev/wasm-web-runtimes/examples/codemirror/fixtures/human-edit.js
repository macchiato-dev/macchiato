export class ProjectRegistry {
  constructor(storage = new Map(), clock = Date.now) {
    this.storage = storage;
    this.listeners = new Set();
    this.clock = clock;
  }

  get size() {
    return this.storage.size;
  }

  has(name) {
    return this.storage.has(name);
  }

  add(name, files = []) {
    if (this.storage.has(name)) {
      throw new Error(`Project ${name} already exists`);
    }
    const project = this.normalize({ name, files });
    this.storage.set(name, project);
    this.notify("added", project);
    return project;
  }

  update(name, patch) {
    const current = this.require(name);
    const next = this.normalize({ ...current, ...patch, name });
    this.storage.set(name, next);
    this.notify("updated", next);
    return next;
  }

  remove(name) {
    const project = this.require(name);
    this.storage.delete(name);
    this.notify("removed", project);
    return project;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  require(name) {
    const project = this.storage.get(name);
    if (!project) {
      throw new Error(`Unknown project: ${name}`);
    }
    return project;
  }

  normalize(project) {
    return {
      ...project,
      files: [...new Set(project.files)],
      updatedAt: this.clock(),
    };
  }

  notify(type, project) {
    for (const listener of this.listeners) {
      listener({ type, project });
    }
  }
}
