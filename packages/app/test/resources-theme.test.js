import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { buildResourcesSiteRoutesForRuntime } from "../../../packages/website/seed.js";
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
  for (const route of routes) assert.equal(route.head, themeBootstrapHtml);
});

test("the initial-theme script has an exact CSP grant, without allowing other inline scripts", () => {
  assert.equal(themeBootstrapCsp, `sha256-${createHash("sha256").update(themeBootstrapScript).digest("base64")}`);
  const csp = publicResponseHeaders("index.html").get("content-security-policy");
  const scripts = csp.split(";").find((directive) => directive.includes("script-src"));
  assert.ok(scripts.includes(`'${themeBootstrapCsp}'`));
  assert.ok(!scripts.includes("'unsafe-inline'"));
});
