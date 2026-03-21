/**
 * @macchiato-dev/layout-render-small
 * Applies layout hypertokens to the DOM and receives content_title from
 * content-render-small. Hypertoken table is defined in this package's README.
 */
export class LayoutRenderer {
  /** @type {import('@macchiato-dev/dom-tiny').VDocument} */
  #document;
  /** @type {import('@macchiato-dev/dom-tiny').VElement} */
  #main;
  /** @type {string | undefined} */
  #titleTemplate = undefined;
  /** @type {string} */
  #contentTitle = '';

  /**
   * @param {object} params
   * @param {import('@macchiato-dev/dom-tiny').VDocument} params.document
   */
  constructor({ document }) {
    this.#document = document;
    this.#main = document.createElement('main');
    document.body.appendChild(this.#main);
  }

  /** @returns {import('@macchiato-dev/dom-tiny').VElement} */
  get main() {
    return this.#main;
  }

  /**
   * Called by content-render-small when it encounters an h1.
   * @param {string} text
   */
  setContentTitle(text) {
    this.#contentTitle = text;
    this.#updateTitle();
  }

  /** @private */
  #updateTitle() {
    this.#document.title = this.#titleTemplate === undefined
      ? this.#contentTitle
      : this.#titleTemplate.replace('{title}', this.#contentTitle);
  }

  /**
   * Sets the title template from the layout config (`- title: ...`).
   * Use `{title}` as a placeholder for the page title, e.g. `My Site | {title}`.
   * If not set, the page title is used as-is.
   * @param {string} template
   */
  setTitleTemplate(template) {
    this.#titleTemplate = template;
    this.#updateTitle();
  }

  // TODO: render(input) — parses the layout-parse-small hypertoken stream
  // (Uint8Array), reads the title template token (0x00) and calls
  // setTitleTemplate(). The template comes from `- title: ...` in the layout
  // config (typically from .macchiato.dev). content_title (0x01) is sent
  // by content-render-small via setContentTitle(), not by this method.
}
