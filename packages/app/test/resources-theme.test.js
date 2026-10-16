import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { buildResourcesSiteRoutesForRuntime, validateResourcesStylesheet } from "../../../packages/website/seed.js";
import { createResourcesTheme, RESOURCES_EXPERIMENTAL_THEME, resourcesThemeCss } from "../../../packages/website/theme.js";
import { RESOURCES_RUNTIME_PROFILES, resourcesRuntimeProfile } from "../../../packages/website/runtime.js";
import { themeBootstrapCsp, themeBootstrapHtml, themeBootstrapScript } from "../../website/theme-bootstrap.js";
import { publicResponseHeaders } from "../../website/edge/models.js";

test("Resources.co theme model supports allowlisted palette overrides", () => {
  const theme = createResourcesTheme({ dark: { "--accent": "#ffb86b" }, light: { "--accent": "#8a3ffc" } });
  assert.equal(theme.dark.tokens["--accent"], "#ffb86b");
  assert.equal(theme.fallback.tokens["--accent"], "#ffb86b");
  assert.match(resourcesThemeCss({ dark: { "--accent": "#ffb86b" } }), /--accent: #ffb86b/);
  assert.equal(RESOURCES_EXPERIMENTAL_THEME.dark["--active-bg"], "#7c3aed");
  assert.throws(() => createResourcesTheme({ dark: { "--unknown": "red" } }), /not allowed/);
});

test("Resources.co runtime profiles select behavior without changing models", () => {
  assert.equal(resourcesRuntimeProfile("local"), RESOURCES_RUNTIME_PROFILES.local);
  assert.equal(resourcesRuntimeProfile("document"), RESOURCES_RUNTIME_PROFILES.edge);
  const routes = buildResourcesSiteRoutesForRuntime({ runtime: "edge", theme: { dark: { "--accent": "#ffb86b" } } });
  assert.match(routes[0].css, /--accent: #ffb86b/);
  assert.equal(routes[0].transition.mode, "document");
  assert.doesNotMatch(routes[0].html, /<script/);
  // Focused workspace routes also mark the document for first-paint workspace styles.
  const workspaceMarker = '<meta name="resources-workspace" content="true">\n';
  for (const route of routes) assert.ok(route.head === themeBootstrapHtml || route.head === workspaceMarker + themeBootstrapHtml, route.path);
  assert.ok(routes.some((route) => route.head.startsWith(workspaceMarker)));
});

test("output color schemes accept only the two resolved appearance values", () => {
  for (const value of ["light", "dark"]) {
    assert.doesNotThrow(() => validateResourcesStylesheet(`.project-editor__output-frame { color-scheme: ${value}; }`));
  }
  for (const value of ["normal", "light dark", "url(https://outside.test/)"]) {
    assert.throws(() => validateResourcesStylesheet(`.project-editor__output-frame { color-scheme: ${value}; }`));
  }
});

test("page content can disable entrance animation without broadening animation syntax", () => {
  assert.doesNotThrow(() => validateResourcesStylesheet('#content > * { animation: none; }'));
  for (const value of ['none, slide 1s', 'url(https://outside.test/)', 'arbitrary']) {
    assert.throws(() => validateResourcesStylesheet(`#content > * { animation: ${value}; }`));
  }
});

test("the initial-theme script has an exact CSP grant, without allowing other inline scripts", () => {
  assert.equal(themeBootstrapCsp, `sha256-${createHash("sha256").update(themeBootstrapScript).digest("base64")}`);
  const csp = publicResponseHeaders("index.html").get("content-security-policy");
  const scripts = csp.split(";").find((directive) => directive.includes("script-src"));
  assert.ok(scripts.includes(`'${themeBootstrapCsp}'`));
  assert.ok(!scripts.includes("'unsafe-inline'"));
});
