import "./project-builder-environment.js";
import { compileProjectFiles, compileSingleFileProject, PROJECT_SOURCE_LIMITS } from "../project-editor/src/single-file-compiler.js";

// Ordinary document/CSS compilation does not need framework compilers or
// their bundled client runtimes. Those belong to the demand-loaded build guest.
globalThis.__resourcesBuildProject = (json) => {
  const request = JSON.parse(json);
  return JSON.stringify(compileSingleFileProject(request.source));
};

globalThis.__resourcesCompileFiles = (json) => {
  try {
    const request = JSON.parse(json);
    return JSON.stringify({ ok: true, value: compileProjectFiles(request.files, request.config,
      { limits: PROJECT_SOURCE_LIMITS }) });
  } catch (error) {
    return JSON.stringify({ ok: false, error: error?.message || String(error), stack: error?.stack || "" });
  }
};
