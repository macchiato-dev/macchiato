/**
 * @macchiato-dev/style-use
 *
 * Govern permitted CSS styles — inline and stylesheet.
 */

export class StyleUse {
  /**
   * @param {object} schema
   */
  constructor(schema = {}) {
    this.schema = schema;
  }

  normalizeProperty(property) {
    return String(property)
      .replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      .trim()
      .toLowerCase();
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
    if (!prop || !val) throw new Error("Style property and value are required");
    if (!this.rejectDangerousValue(val)) {
      throw new Error(`Disallowed CSS value for ${prop}`);
    }
    for (const url of this.extractUrls(val)) {
      this.validateUrl(url, prop);
    }

    const properties = this.schema.properties || {};
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
    if (!this.rejectDangerousValue(text)) {
      throw new Error("Disallowed CSS value in stylesheet");
    }
    const imports = this.extractImportUrls(text);
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
