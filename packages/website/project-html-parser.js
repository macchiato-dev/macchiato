class ParsedNode {
  constructor(type, name = "", text = "", attributes = []) {
    this.nodeType = type;
    this.localName = name;
    this.nodeValue = type === 3 ? text : null;
    this.childNodes = [];
    this.parentElement = null;
    this.attributeEntries = attributes;
    this.attributes = attributes.map(([attributeName, value]) => ({ name: attributeName, value }));
    this.namespaceURI = null;
  }
  append(node) {
    node.parentElement = this.nodeType === 1 ? this : this.parentElement;
    this.childNodes.push(node);
  }
  hasAttribute(name) { return this.attributeEntries.some(([key]) => key === name); }
  getAttribute(name) { return this.attributeEntries.find(([key]) => key === name)?.[1] ?? null; }
  get textContent() {
    return this.nodeType === 3 ? this.nodeValue : this.childNodes.map((node) => node.textContent).join("");
  }
  querySelectorAll(selector) {
    const match = /^([a-z][a-z0-9-]*)(.*)$/i.exec(selector);
    if (!match) throw new SyntaxError(`Unsupported inert selector: ${selector}`);
    const attributes = [];
    const expression = /\[([a-z][a-z0-9-]*)(?:="([^"]*)")?\]/gi;
    let entry;
    while ((entry = expression.exec(match[2]))) attributes.push([entry[1].toLowerCase(), entry[2]]);
    if (attributes.map(([name, value]) => value === undefined ? `[${name}]` : `[${name}="${value}"]`).join("") !== match[2]) {
      throw new SyntaxError(`Unsupported inert selector: ${selector}`);
    }
    const found = [];
    const visit = (node) => {
      if (node.nodeType === 1 && node.localName === match[1].toLowerCase() &&
          attributes.every(([name, value]) => node.hasAttribute(name) &&
            (value === undefined || node.getAttribute(name) === value))) found.push(node);
      for (const child of node.childNodes) visit(child);
    };
    visit(this);
    return found;
  }
}

const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const rawElements = new Set(["script", "style", "textarea", "title"]);

function parsedAttributes(source) {
  const entries = [];
  let rest = source.trim();
  while (rest) {
    const match = /^([A-Za-z_:][A-Za-z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?\s*/.exec(rest);
    if (!match) throw new SyntaxError(`HTML attribute input was not consumed: ${rest.slice(0, 32)}`);
    entries.push([match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? ""]);
    rest = rest.slice(match[0].length);
  }
  return entries;
}

export function parseProjectHtml(source) {
  const document = new ParsedNode(9);
  const html = new ParsedNode(1, "html");
  const body = new ParsedNode(1, "body");
  html.namespaceURI = body.namespaceURI = "http://www.w3.org/1999/xhtml";
  document.append(html); html.append(body);
  document.body = body;
  const stack = [body];
  let at = 0;
  while (at < source.length) {
    if (source.startsWith("<!--", at)) {
      const end = source.indexOf("-->", at + 4);
      if (end < 0) throw new SyntaxError("HTML comment is not closed");
      at = end + 3;
      continue;
    }
    if (/^<!doctype\b/i.test(source.slice(at))) {
      const end = source.indexOf(">", at + 2);
      if (end < 0) throw new SyntaxError("HTML doctype is not closed");
      at = end + 1;
      continue;
    }
    if (source[at] !== "<") {
      const end = source.indexOf("<", at);
      stack.at(-1).append(new ParsedNode(3, "", source.slice(at, end < 0 ? source.length : end)));
      at = end < 0 ? source.length : end;
      continue;
    }
    const close = /^<\/\s*([A-Za-z][A-Za-z0-9-]*)\s*>/.exec(source.slice(at));
    if (close) {
      const name = close[1].toLowerCase();
      if (stack.length === 1 || stack.at(-1).localName !== name) throw new SyntaxError(`Unexpected closing tag: ${name}`);
      stack.pop(); at += close[0].length; continue;
    }
    const open = /^<\s*([A-Za-z][A-Za-z0-9-]*)([^>]*)>/.exec(source.slice(at));
    if (!open) throw new SyntaxError(`HTML tag input was not consumed at byte ${at}`);
    const name = open[1].toLowerCase();
    const selfClosing = /\/\s*$/.test(open[2]);
    const node = new ParsedNode(1, name, "", parsedAttributes(open[2].replace(/\/\s*$/, "")));
    node.namespaceURI = stack.some((parent) => parent.localName === "svg") || name === "svg"
      ? "http://www.w3.org/2000/svg" : "http://www.w3.org/1999/xhtml";
    stack.at(-1).append(node); at += open[0].length;
    if (rawElements.has(name) && !selfClosing) {
      const expression = new RegExp(`<\\/\\s*${name}\\s*>`, "ig");
      expression.lastIndex = at;
      const end = expression.exec(source);
      if (!end) throw new SyntaxError(`HTML ${name} element is not closed`);
      node.append(new ParsedNode(3, "", source.slice(at, end.index)));
      at = expression.lastIndex;
    } else if (!selfClosing && !voidElements.has(name)) stack.push(node);
  }
  if (stack.length !== 1) throw new SyntaxError(`HTML element is not closed: ${stack.at(-1).localName}`);
  return document;
}
