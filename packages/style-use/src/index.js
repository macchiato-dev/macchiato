/**
 * @macchiato-dev/style-use
 *
 * Govern permitted CSS styles — inline and stylesheet.
 */

const DEFAULT_LIMITS = {
  maxStylesheetLength: 100000,
  maxPropertyLength: 128,
  maxValueLength: 4096,
  maxUrlLength: 2048,
  maxImports: 32,
};

const TROUBLESOME_CONTENT_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069\uFFFE\uFFFF]/u;

function patternMatches(pattern, value) {
  if (pattern instanceof RegExp) return pattern.test(value);
  if (typeof pattern === "string") return new RegExp(pattern).test(value);
  if (typeof pattern === "function") return pattern(value);
  return false;
}

export class StyleUse {
  /**
   * @param {object} schema
   */
  constructor(schema = {}) {
    this.schema = schema;
    this.assertUnambiguousDefinitions();
  }

  assertUnambiguousDefinitions() {
    const seen = new Map();
    for (const [name, definition] of Object.entries(this.schema.definitions || {})) {
      const selector = definition.element || definition.selector;
      if (!selector) continue;
      if (seen.has(selector)) {
        throw new Error(`Ambiguous CSS style definitions for ${selector}: ${seen.get(selector)}, ${name}`);
      }
      seen.set(selector, name);
    }
  }

  normalizeProperty(property) {
    return String(property)
      .replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      .trim()
      .toLowerCase();
  }

  limits() {
    return { ...DEFAULT_LIMITS, ...(this.schema.limits || {}) };
  }

  styleDefinition(name) {
    const definitions = this.schema.definitions || {};
    const entry = definitions[String(name)] || {};
    return entry.properties ? entry.properties : entry;
  }

  effectiveProperties() {
    const properties = {};
    const uses = this.schema.useStyles || this.schema["use-styles"] || [];
    for (const name of uses) {
      Object.assign(properties, this.styleDefinition(name));
    }
    Object.assign(properties, this.schema.properties || {});
    return properties;
  }

  validateContent(value, kind) {
    const text = String(value);
    const content = this.schema.content || {};
    if (content.allowTroublesomeSpecialCharacters !== true && TROUBLESOME_CONTENT_RE.test(text)) {
      throw new Error(`Troublesome special character in CSS ${kind}`);
    }
    if (content.rejectPattern && patternMatches(content.rejectPattern, text)) {
      throw new Error(`Rejected CSS ${kind}`);
    }
    if (content.allowedPattern && !patternMatches(content.allowedPattern, text)) {
      throw new Error(`CSS ${kind} not allowed`);
    }
  }

  isAllowedByRule(rule, value, property) {
    if (rule === true) return true;
    if (rule instanceof RegExp) return rule.test(value);
    if (typeof rule === "function") return rule(value, property);
    if (typeof rule === "string") return rule === value;
    if (Array.isArray(rule)) return rule.some((entry) => this.isAllowedByRule(entry, value, property));
    return false;
  }

  extractUrls(value) {
    const urls = [];
    const re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
    for (const match of String(value).matchAll(re)) {
      urls.push((match[1] ?? match[2] ?? match[3] ?? "").trim());
    }
    return urls;
  }

  validateUrl(url, property = "url") {
    const value = String(url).trim();
    const maxUrlLength = this.limits().maxUrlLength;
    if (maxUrlLength && value.length > maxUrlLength) {
      throw new Error(`CSS URL exceeds maxUrlLength ${maxUrlLength}`);
    }
    this.validateContent(value, "URL");
    if (!value) throw new Error(`Empty CSS URL for ${property}`);
    if (!this.rejectDangerousValue(value)) {
      throw new Error(`Disallowed CSS URL for ${property}`);
    }

    const rules = this.schema.urls;
    const rule = rules && typeof rules === "object" && !(rules instanceof RegExp) && !Array.isArray(rules)
      ? (rules[property] ?? rules["*"])
      : rules;
    if (rule === undefined || rule === false) {
      throw new Error(`CSS URLs are not allowed for ${property}`);
    }
    if (!this.isAllowedByRule(rule, value, property)) {
      throw new Error(`CSS URL not allowed for ${property}: ${value}`);
    }
    return true;
  }

  extractImportUrls(css) {
    const urls = [];
    const re = /@import\s+(?:url\(\s*)?(?:"([^"]*)"|'([^']*)'|([^;\s)]+))/gi;
    for (const match of String(css).matchAll(re)) {
      urls.push((match[1] ?? match[2] ?? match[3] ?? "").trim());
    }
    return urls;
  }

  rejectDangerousValue(value) {
    const normalized = String(value).replace(/\s+/g, "").toLowerCase();
    return !normalized.includes("javascript:")
      && !normalized.includes("expression(")
      && !normalized.includes("behavior:");
  }

  /**
   * Validate an inline style declaration.
   * @param {string} property
   * @param {string} value
   * @returns {boolean}
   */
  validateInline(property, value) {
    const prop = this.normalizeProperty(property);
    const val = String(value).trim();
    const { maxPropertyLength, maxValueLength } = this.limits();
    if (maxPropertyLength && prop.length > maxPropertyLength) {
      throw new Error(`CSS property exceeds maxPropertyLength ${maxPropertyLength}`);
    }
    if (maxValueLength && val.length > maxValueLength) {
      throw new Error(`CSS value exceeds maxValueLength ${maxValueLength}`);
    }
    this.validateContent(prop, "property");
    this.validateContent(val, "value");
    if (!prop || !val) throw new Error("Style property and value are required");
    if (!this.rejectDangerousValue(val)) {
      throw new Error(`Disallowed CSS value for ${prop}`);
    }
    for (const url of this.extractUrls(val)) {
      this.validateUrl(url, prop);
    }

    const properties = this.effectiveProperties();
    const rule = properties[prop];
    if (rule === undefined) {
      if (Object.keys(properties).length === 0) return true;
      throw new Error(`CSS property not allowed: ${prop}`);
    }
    if (!this.isAllowedByRule(rule, val, prop)) {
      throw new Error(`CSS value not allowed for ${prop}: ${val}`);
    }
    return true;
  }

  /**
   * Validate a CSS stylesheet text.
   * @param {string} css
   * @returns {boolean}
   */
  validateStylesheet(css) {
    const text = String(css);
    const { maxStylesheetLength, maxImports } = this.limits();
    if (maxStylesheetLength && text.length > maxStylesheetLength) {
      throw new Error(`Stylesheet exceeds maxStylesheetLength ${maxStylesheetLength}`);
    }
    this.validateContent(text, "stylesheet");
    if (!this.rejectDangerousValue(text)) {
      throw new Error("Disallowed CSS value in stylesheet");
    }
    const imports = this.extractImportUrls(text);
    if (maxImports !== undefined && imports.length > maxImports) {
      throw new Error(`Stylesheet exceeds maxImports ${maxImports}`);
    }
    if (imports.length > 0) {
      if (this.schema.imports !== true) {
        throw new Error("CSS imports are not allowed");
      }
      for (const url of imports) this.validateUrl(url, "import");
    }
    const declarationText = text.replace(/@import[^;]+;/gi, "");

    const selectorRule = this.schema.selectors;
    if (selectorRule) {
      for (const match of declarationText.matchAll(/([^{}@][^{]*)\{([^}]*)\}/g)) {
        const selector = match[1].trim();
        if (!this.isAllowedByRule(selectorRule, selector, "selector")) {
          throw new Error(`CSS selector not allowed: ${selector}`);
        }
      }
    }

    for (const match of declarationText.matchAll(/([a-zA-Z-]+)\s*:\s*([^;}{]+)[;}]/g)) {
      this.validateInline(match[1], match[2]);
    }
    return true;
  }
}
