import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
export const RESOURCE_LOCALES = Object.freeze(["en", "es"]);
export const DEFAULT_RESOURCE_LOCALE = "en";

export function parseLocaleMarkdown(markdown, locale) {
  const messages = {};
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("- **")) continue;
    const match = /^- \*\*([A-Za-z][A-Za-z0-9.]+)\*\*: (.+)$/.exec(line);
    if (!match) throw new Error(`Invalid ${locale} locale Markdown line: ${line}`);
    if (messages[match[1]]) throw new Error(`Duplicate ${locale} locale key: ${match[1]}`);
    messages[match[1]] = match[2];
  }
  if (!Object.keys(messages).length) throw new Error(`Empty ${locale} locale`);
  return Object.freeze(messages);
}

export function loadResourcesLocales() {
  const locales = Object.fromEntries(RESOURCE_LOCALES.map((locale) => [
    locale,
    parseLocaleMarkdown(readFileSync(join(directory, "content", `${locale}.md`), "utf8"), locale),
  ]));
  const englishKeys = Object.keys(locales.en).sort();
  for (const locale of RESOURCE_LOCALES) {
    const keys = Object.keys(locales[locale]).sort();
    if (JSON.stringify(keys) !== JSON.stringify(englishKeys)) {
      throw new Error(`Locale ${locale} does not define the same keys as English`);
    }
  }
  return Object.freeze(locales);
}

export function createTranslator(locale, locales = loadResourcesLocales()) {
  const selected = RESOURCE_LOCALES.includes(locale) ? locale : DEFAULT_RESOURCE_LOCALE;
  return Object.freeze({
    locale: selected,
    messages: locales[selected],
    text(key, variables = {}) {
      const source = locales[selected][key] ?? locales.en[key];
      if (source === undefined) throw new Error(`Missing locale key: ${key}`);
      return source.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, name) => {
        if (!(name in variables)) throw new Error(`Missing locale variable: ${key}.${name}`);
        return String(variables[name]);
      });
    },
  });
}
