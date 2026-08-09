import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RESOURCES_CONTENT_ROOT = join(directory, "content-space");

function parseDescription(markdown, file) {
  const matches = [...markdown.matchAll(/^- \*\*description\*\*: (.+)$/gm)];
  if (matches.length !== 1) throw new Error(`Expected one description in ${file}`);
  const description = matches[0][1].trim();
  if (!description || description.length > 500) throw new Error(`Invalid description in ${file}`);
  return description;
}

export function resourcesContentRoot(value = globalThis.process?.env?.RESOURCES_CONTENT_ROOT) {
  return resolve(value || DEFAULT_RESOURCES_CONTENT_ROOT);
}

export function loadProjectContentSpace(projects, {
  root = resourcesContentRoot(),
  locales = ["en", "es"],
} = {}) {
  const content = {};
  for (const project of projects) {
    const relative = project.path.replace(/^\/+/, "");
    if (!relative || relative.split("/").some((part) => !/^[a-z0-9-]+$/.test(part))) {
      throw new Error(`Unsafe project content path: ${project.path}`);
    }
    content[project.path] = {};
    for (const locale of locales) {
      if (!/^[a-z]{2}$/.test(locale)) throw new Error(`Invalid project content locale: ${locale}`);
      const file = join(root, relative, `${locale}.md`);
      content[project.path][locale] = parseDescription(readFileSync(file, "utf8"), file);
    }
    content[project.path] = Object.freeze(content[project.path]);
  }
  return Object.freeze(content);
}
