/**
 * @macchiato-dev/render-html
 * Serialises a dom-tiny VDocument or VElement tree to an HTML string.
 */

/**
 * @param {string} str
 * @returns {string}
 */
function escapeText(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {string} str
 * @returns {string}
 */
function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Renders a single node (VElement or VText) to an HTML string.
 * @param {import('@macchiato-dev/dom-tiny').VElement | import('@macchiato-dev/dom-tiny').VText} node
 * @returns {string}
 */
function renderNode(node) {
  if ('tagName' in node) return renderElement(node);
  return escapeText(node.textContent);
}

/**
 * Renders a VElement to an HTML string.
 * @param {import('@macchiato-dev/dom-tiny').VElement} element
 * @returns {string}
 */
export function renderElement(element) {
  const attrs = [...element.attributes]
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join('');
  const content = element.ownTextContent !== null
    ? escapeText(element.ownTextContent)
    : element.childNodes.map(renderNode).join('');
  return `<${element.tagName}${attrs}>${content}</${element.tagName}>`;
}

/**
 * Renders a VDocument to a full HTML string, including the DOCTYPE declaration.
 * @param {import('@macchiato-dev/dom-tiny').VDocument} document
 * @returns {string}
 */
export function renderDocument(document) {
  return (
    '<!DOCTYPE html>\n' +
    '<html>\n' +
    renderElement(document.head) + '\n' +
    renderElement(document.body) + '\n' +
    '</html>\n'
  );
}
