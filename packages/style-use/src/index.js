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
    if (Array.isArray(rule)) return rule.includes(value);
    return false;
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

    const selectorRule = this.schema.selectors;
    if (selectorRule) {
      for (const match of text.matchAll(/([^{}@][^{]*)\{([^}]*)\}/g)) {
        const selector = match[1].trim();
        if (!this.isAllowedByRule(selectorRule, selector, "selector")) {
          throw new Error(`CSS selector not allowed: ${selector}`);
        }
      }
    }

    for (const match of text.matchAll(/([a-zA-Z-]+)\s*:\s*([^;}{]+)[;}]/g)) {
      this.validateInline(match[1], match[2]);
    }
    return true;
  }
}
