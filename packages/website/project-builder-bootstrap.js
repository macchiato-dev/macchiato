import { compileProjectFiles, compileSingleFileProject } from "../project-editor/src/single-file-compiler.js";
import { compileTemplate, parse as parseVueSfc } from "@vue/compiler-sfc";
import { compile as compileSvelte } from "svelte/compiler";
import { FRAMEWORK_RUNTIMES } from "./generated/framework-runtimes.js";

globalThis.__resourcesBuildProject = (json) => {
  const request = JSON.parse(json);
  return JSON.stringify(compileSingleFileProject(request.source));
};

globalThis.__resourcesCompileFiles = (json) => {
  try {
    const request = JSON.parse(json);
    return JSON.stringify({ ok: true, value: compileProjectFiles(request.files, request.config) });
  } catch (error) {
    return JSON.stringify({ ok: false, error: error?.message || String(error), stack: error?.stack || "" });
  }
};

function projectModule(source, api, runtime) {
  const module = { exports: {} };
  Function("module", "exports", "BUILD_API", "runtime", `"use strict";\n${source}`)(
    module, module.exports, api, runtime,
  );
  return module.exports;
}

globalThis.__resourcesBuildFiles = (json) => {
  const request = JSON.parse(json);
  const files = Array.isArray(request.files) ? request.files : [];
  const config = request.config && typeof request.config === "object" ? request.config : {};
  const build = config.build;
  if (!build || typeof build !== "object") return JSON.stringify({ files, config });
  const byPath = new Map();
  for (const file of files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string") {
      throw new TypeError("Build input files must contain text paths and content");
    }
    byPath.set(file.path, file.content);
  }
  const sourceAt = (name, kind) => {
    if (typeof name !== "string" || !name || !byPath.has(name)) throw new Error(`${kind} file is missing: ${name}`);
    return byPath.get(name);
  };
  const api = Object.freeze({
    file(path) { return sourceAt(path, "Build input"); },
    files() { return files.map((file) => ({ ...file })); },
    runtime(name) {
      if (!Object.hasOwn(FRAMEWORK_RUNTIMES, name)) throw new Error(`Unknown framework runtime: ${name}`);
      return FRAMEWORK_RUNTIMES[name];
    },
    compileVue(source, filename = "App.vue") {
      const parsed = parseVueSfc(source, { filename });
      if (parsed.errors.length) throw new Error(`Vue SFC: ${parsed.errors[0].message || parsed.errors[0]}`);
      const descriptor = parsed.descriptor;
      const template = compileTemplate({ source: descriptor.template?.content || "", filename,
        id: "project-app", compilerOptions: { mode: "function" } });
      if (template.errors.length) throw new Error(`Vue template: ${template.errors[0].message || template.errors[0]}`);
      return { render: template.code, script: descriptor.script?.content || "export default {}",
        styles: descriptor.styles.map((style) => style.content).join("\n") };
    },
    compileSvelte(source, filename = "App.svelte") {
      const result = compileSvelte(source, { filename, generate: "client", css: "injected" });
      return { code: result.js.code };
    },
  });
  const runtime = projectModule(sourceAt(build.runtime, "Build runtime"), api, null);
  const application = sourceAt(build.application, "Build application");
  const builder = projectModule(sourceAt(build.script, "Build script"), api, runtime);
  const run = typeof builder === "function" ? builder : builder?.build;
  if (typeof run !== "function") throw new Error("Build script must export a function or a build function");
  const result = run({ application, applicationPath: build.application, config, files: api.files(), runtime });
  if (!result || !Array.isArray(result.files) || !result.config || typeof result.config !== "object") {
    throw new Error("Build result must contain files and configuration");
  }
  return JSON.stringify(result);
};
