import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadProjectContentSpace } from "../../../packages/website/catalog-content.js";
import { createTranslator, loadResourcesLocales, parseLocaleMarkdown } from "../../../packages/website/i18n.js";
import { localizedObjectKey, negotiateLocale, parseLanguageRoute, parseLanguageSelection } from "../../../packages/website/edge/i18n.js";

test("Resources locale Markdown has matching English and Spanish message keys", () => {
  const locales = loadResourcesLocales();
  assert.deepEqual(Object.keys(locales.en).sort(), Object.keys(locales.es).sort());
  assert.equal(createTranslator("es", locales).text("projects.many", { count: 4 }), "4 proyectos");
  assert.throws(() => parseLocaleMarkdown("# Empty", "empty"), /Empty empty locale/);
});

test("Resources locale negotiation prefers the explicit cookie, then browser languages", () => {
  assert.equal(negotiateLocale(new Request("https://resources.example/", {
    headers: { cookie: "resources_locale=en", "accept-language": "es" },
  })), "en");
  assert.equal(negotiateLocale(new Request("https://resources.example/", {
    headers: { "accept-language": "fr-CA, es-MX;q=0.8, en;q=0.5" },
  })), "es");
  assert.equal(negotiateLocale(new Request("https://resources.example/")), "en");
  assert.deepEqual(parseLanguageRoute("/language/es/about"), { locale: "es", pathname: "/about" });
  assert.deepEqual(
    parseLanguageSelection(new URL("https://resources.example/language?locale=es&return=/about")),
    { locale: "es", pathname: "/about" },
  );
  assert.equal(parseLanguageRoute("/language/fr/about"), null);
});

test("localized routes leave host-owned example assets outside locale trees", () => {
  assert.equal(localizedObjectKey("es", "blog/index.html"), "locales/es/blog/index.html");
  assert.equal(localizedObjectKey("es", "-/blog-examples/vtv/index.html"), "-/blog-examples/vtv/index.html");
});

test("Resources catalogue descriptions can come from an external mirrored content root", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "resources-content-space-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "macchiato", "app"), { recursive: true });
  await writeFile(
    join(root, "macchiato", "app", "es.md"),
    "# macchiato/app\n\n- **description**: Descripción externa.\n",
  );
  const content = loadProjectContentSpace([
    { path: "/macchiato/app", description: "External description." },
  ], { root, locales: ["es"] });
  assert.deepEqual(content["/macchiato/app"], {
    es: "Descripción externa.",
  });
});
