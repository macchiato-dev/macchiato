import assert from "node:assert/strict";
import test from "node:test";
import { createTranslator, loadResourcesLocales, parseLocaleMarkdown } from "../../../examples/resources-site/i18n.js";
import { negotiateLocale, parseLanguageRoute } from "../../../examples/resources-site/edge/i18n.js";

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
  assert.equal(parseLanguageRoute("/language/fr/about"), null);
});
