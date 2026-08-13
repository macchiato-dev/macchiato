import { createSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";
import { ElementUseHost } from "./host.js";

function splitSource(source) {
  const css = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((
    match,
  ) => match[1]).join("\n");
  const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1]);
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(source)?.[1] || source;
  return {
    css,
    scripts,
    html: body.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      "",
    ),
  };
}

export async function mountElementUseRuntime(
  { root, project, onStatus = () => {} },
) {
  const { html, css, scripts } = splitSource(
    project.file || project.html || "",
  );
  const host = new ElementUseHost(root);
  const snapshot = host.mount(html, css);
  const guestSource = await fetch(new URL("./guest.js", import.meta.url)).then(
    (response) => {
      if (!response.ok) {
        throw new Error(`element-use guest response: ${response.status}`);
      }
      return response.text();
    },
  );
  const sandbox = await createSandbox({
    memoryLimitBytes: 32 * 1024 * 1024,
    maxStackBytes: 512 * 1024,
  });
  let alive = true;
  try {
    sandbox.installJsonHostFunction(
      "__elementUseHost",
      (message) =>
        host.dispatch(
          message,
          (listener) =>
            sandbox.callJsonFunction("__elementUseEvent", listener, {
              rawArgument: true,
            }),
        ),
    );
    sandbox.evalGlobal(guestSource, "element-use-guest.js");
    sandbox.callJsonFunction("__elementUseInit", snapshot, {
      rawArgument: true,
    });
    const resources = Object.fromEntries(
      Object.entries(project.fetchResources || {}).map((
        [url, resource],
      ) => [url, resource.dataUrl]),
    );
    sandbox.evalGlobal(
      `globalThis.__elementUseResources=${
        JSON.stringify(resources)
      };globalThis.fetch=async function(url){var data=globalThis.__elementUseResources[String(url)];if(!data)throw new TypeError("Fetch URL is outside the element-use grant");return Object.freeze({ok:true,status:200,async resourceUrl(){return data},async dataUrl(){return data}})}`,
      "element-use-resources.js",
    );
    for (const [index, code] of scripts.entries()) {
      if (code.trim()) {
        await sandbox.evalModuleAsync(code, `element-use-game-${index}.js`);
      }
    }
  } catch (error) {
    alive = false;
    host.destroy();
    sandbox.dispose?.();
    throw error;
  }
  const timer = setInterval(() => {
    if (!alive) return;
    try {
      sandbox.callJsonFunction("__elementUseTimers", Date.now(), {
        rawArgument: true,
      });
    } catch (error) {
      alive = false;
      onStatus({ type: "blocked", message: error.message });
    }
  }, 50);
  root.dataset.runtime = "quickjs-element-use";
  onStatus({ type: "mounted", runtime: "quickjs-element-use" });
  return {
    destroy() {
      alive = false;
      clearInterval(timer);
      host.destroy();
      sandbox.dispose?.();
      delete root.dataset.runtime;
    },
  };
}
