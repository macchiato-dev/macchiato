import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { validateStandardAppConfig } from "./standard-app.js";

export async function detectAppConfiguration(directory = ".") {
  directory = resolve(directory);
  const candidates = ["macchiato.app.json", "package.json"];
  for (const filename of candidates) {
    const path = join(directory, filename);
    try { await access(path); } catch { continue; }
    try {
      const json = JSON.parse(await readFile(path, "utf8"));
      const config = filename === "package.json" ? json.macchiato : json;
      if (!config) continue;
      validateStandardAppConfig(config);
      const required = [config.entry, config.schemas.html, config.schemas.css, config.runtime.bootstrap];
      const missing = [];
      for (const relative of required) try { await access(join(directory, relative)); } catch { missing.push(relative); }
      return { detected: true, directory, source: filename, config, missing, runnable: missing.length === 0 };
    } catch (error) {
      return { detected: true, directory, source: filename, runnable: false, error: error.message };
    }
  }
  return { detected: false, directory, runnable: false, error: "No macchiato.app.json or package.json#macchiato configuration" };
}
