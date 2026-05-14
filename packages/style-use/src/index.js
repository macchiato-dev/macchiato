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

  /**
   * Validate an inline style declaration.
   * @param {string} property
   * @param {string} value
   * @returns {boolean}
   */
  validateInline(property, value) {
    // TODO: implement against schema
    void property;
    void value;
    return true;
  }

  /**
   * Validate a CSS stylesheet text.
   * @param {string} css
   * @returns {boolean}
   */
  validateStylesheet(css) {
    // TODO: implement against schema
    void css;
    return true;
  }
}
