import { parseConstrainedCss } from "./constrained-css.js";

class Writer {
  constructor() { this.bytes = []; }
  byte(value) { this.bytes.push(value); }
  uint(value) {
    do {
      const next = value % 128;
      value = Math.floor(value / 128);
      this.byte(next | (value ? 128 : 0));
    } while (value);
  }
  text(value) {
    const bytes = [];
    for (let index = 0; index < value.length; index++) {
      let scalar = value.charCodeAt(index);
      if (scalar >= 0xd800 && scalar <= 0xdbff && index + 1 < value.length) {
        scalar = 0x10000 + ((scalar - 0xd800) << 10) +
          (value.charCodeAt(++index) - 0xdc00);
      }
      if (scalar < 0x80) bytes.push(scalar);
      else if (scalar < 0x800) bytes.push(0xc0 | scalar >> 6, 0x80 | scalar & 63);
      else if (scalar < 0x10000) {
        bytes.push(0xe0 | scalar >> 12, 0x80 | scalar >> 6 & 63, 0x80 | scalar & 63);
      } else {
        bytes.push(0xf0 | scalar >> 18, 0x80 | scalar >> 12 & 63,
          0x80 | scalar >> 6 & 63, 0x80 | scalar & 63);
      }
    }
    this.uint(bytes.length);
    this.bytes.push(...bytes);
  }
}

function writeValue(writer, node) {
  writer.byte(node[0]);
  if ((node[0] >= 1 && node[0] <= 4) || node[0] === 9) writer.text(node[1]);
  else if (node[0] === 7) { writer.text(node[1]); writeValue(writer, node[2]); }
  else if (node[0] === 10) {
    writer.byte(node[1]);
    writer.uint(node[2].length);
    node[2].forEach((child) => writeValue(writer, child));
  } else throw new TypeError("CSS value node is not understood");
}

export function encodeConstrainedCss(source) {
  const rules = parseConstrainedCss(source);
  const writer = new Writer();
  writer.uint(4);
  writer.uint(rules.length);
  function writeDeclarations(declarations) {
    for (const declaration of declarations) {
      if (declaration.comment !== undefined) {
        writer.byte(0); writer.text(declaration.comment);
        continue;
      }
      writer.byte(declaration.value ? 2 : 1);
      writer.text(declaration.property);
      writer.byte(declaration.important ? 1 : 0);
      if (declaration.value) writeValue(writer, declaration.value);
      else {
        writer.uint(declaration.tokens.length);
        for (const token of declaration.tokens) {
          writer.byte(token[0]);
          if (token.length > 1) writer.text(token[1]);
        }
      }
    }
  }
  let writeRules;
  writeRules = function (items) {
  const ordered = items.filter((rule) => rule.keyframes !== undefined)
    .concat(items.filter((rule) => rule.keyframes === undefined));
  for (const rule of ordered) {
    if (rule.comment !== undefined) {
      writer.byte(0); writer.text(rule.comment);
      continue;
    }
    if (rule.media !== undefined) {
      writer.byte(3); writer.text(rule.media); writer.uint(rule.rules.length);
      writeRules(rule.rules);
      continue;
    }
    if (rule.keyframes !== undefined) {
      writer.byte(4); writer.text(rule.keyframes); writer.uint(rule.frames.length);
      for (const frame of rule.frames) {
        writer.text(frame.selector); writer.uint(frame.declarations.length);
        writeDeclarations(frame.declarations);
      }
      continue;
    }
    writer.byte(1); writer.text(rule.selector); writer.uint(rule.declarations.length);
    writeDeclarations(rule.declarations);
  }
  };
  writeRules(rules);
  return Uint8Array.from(writer.bytes);
}
