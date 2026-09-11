// Guest-side selector parsing. Keep this file ES5 so the same source can run
// in MicroQuickJS without Babel. The host receives semantic pieces, not CSS.
// Unsupported syntax fails at its source position; nothing is discarded.
function parseConstrainedSelector(source) {
  var at = 0, remaining = 512;
  function fail() { throw new SyntaxError("Selector is not understood at " + at); }
  if (typeof source !== "string" || !source.length || source.length > 8192) fail();
  function space(character) { return !!character && /[\t\n\f\r ]/.test(character); }
  function trivia() {
    var whitespace = false;
    while (at < source.length) {
      if (space(source[at])) { whitespace = true; at++; }
      else if (source.slice(at, at + 2) === "/*") {
        var end = source.indexOf("*/", at + 2);
        if (end < 0) fail();
        at = end + 2;
      } else break;
    }
    return whitespace;
  }
  function escape() {
    at++;
    if (at === source.length || /[\n\r\f]/.test(source[at])) fail();
    var hex = source.slice(at).match(/^[0-9a-fA-F]{1,6}/);
    if (!hex) return source[at++];
    at += hex[0].length;
    if (source[at] === "\r" && source[at + 1] === "\n") at++;
    if (space(source[at])) at++;
    var scalar = parseInt(hex[0], 16);
    if (!scalar || scalar > 0x10ffff || (scalar >= 0xd800 && scalar <= 0xdfff)) return "\ufffd";
    if (scalar < 0x10000) return String.fromCharCode(scalar);
    scalar -= 0x10000;
    return String.fromCharCode(0xd800 + (scalar >> 10), 0xdc00 + (scalar & 1023));
  }
  function identifier() {
    var value = "", first = source[at], next = source[at + 1];
    function start(c) { return !!c && /[a-zA-Z_\u0080-\uffff\\]/.test(c); }
    if (!start(first) && !(first === "-" && (start(next) || next === "-"))) fail();
    while (at < source.length) {
      var c = source[at];
      if (c === "\\") value += escape();
      else if (/[a-zA-Z0-9_\u0080-\uffff-]/.test(c)) { value += c; at++; }
      else break;
    }
    if (value.length > 256) fail();
    return value;
  }
  function string() {
    var quote = source[at++], value = "";
    while (at < source.length && source[at] !== quote) {
      if (source[at] === "\\") {
        if (/[\n\r\f]/.test(source[at + 1] || "")) {
          at++;
          if (source[at] === "\r" && source[at + 1] === "\n") at++;
          at++;
        } else value += escape();
      } else {
        if (/[\x00-\x1f\x7f]/.test(source[at])) fail();
        value += source[at++];
      }
    }
    if (source[at++] !== quote || value.length > 512) fail();
    return value;
  }
  function attribute() {
    at++; trivia();
    var name = identifier(), operator = "", value = "";
    trivia();
    if (source[at] !== "]") {
      operator = source[at++];
      if (operator !== "=") {
        if (!/^[~|^$*]$/.test(operator) || source[at++] !== "=") fail();
        operator += "=";
      }
      trivia();
      value = source[at] === '"' || source[at] === "'" ? string() : identifier();
      trivia();
    }
    if (source[at++] !== "]") fail();
    return ["attribute", name, operator, value];
  }
  function pseudo(depth) {
    at++;
    var element = source[at] === ":";
    if (element) at++;
    var name = identifier().toLowerCase();
    if (source[at] !== "(") {
      if (/^(before|after|first-line|first-letter)$/.test(name)) element = true;
      return [element ? "element" : "pseudo", name];
    }
    if (element) fail();
    at++;
    var term;
    if (/^(is|where|not|has)$/.test(name)) term = [name, group(name === "has", depth + 1)];
    else if (/^nth-(last-)?(child|of-type)$/.test(name)) {
      var start = at;
      while (at < source.length && source[at] !== ")") at++;
      var formula = source.slice(start, at).trim().toLowerCase(), a = 0, b;
      if (formula === "odd" || formula === "even") { a = 2; b = formula === "odd" ? 1 : 0; }
      else if (/^[+-]?\d+$/.test(formula)) b = Number(formula);
      else {
        var match = formula.match(/^([+-]?\d*)n(?:[\t\n\f\r ]*([+-])[\t\n\f\r ]*(\d+))?$/);
        if (!match) fail();
        a = match[1] === "" || match[1] === "+" ? 1 : match[1] === "-" ? -1 : Number(match[1]);
        b = match[3] ? Number(match[2] + match[3]) : 0;
      }
      if (Math.abs(a) > 0x7fffffff || Math.abs(b) > 0x7fffffff) fail();
      term = ["nth", name, a, b];
    } else fail();
    if (source[at++] !== ")") fail();
    return term;
  }
  function group(relative, depth) {
    if (depth > 8) fail();
    var selectors = [], parts = [], join = "";
    trivia();
    while (at < source.length) {
      if (/[>+~]/.test(source[at])) {
        if (!parts.length && !relative) fail();
        join = source[at++]; trivia();
      }
      var terms = [], element = false;
      while (at < source.length) {
        var c = source[at], term;
        if (c === "." || c === "#") { at++; term = [c === "." ? "class" : "id", identifier()]; }
        else if (c === "[") term = attribute();
        else if (c === ":") term = pseudo(depth);
        else if (!terms.length && c === "*") { at++; term = ["tag", "*"]; }
        else if (!terms.length && /[a-zA-Z_\u0080-\uffff\\-]/.test(c)) term = ["tag", identifier()];
        else break;
        if (--remaining < 0 || element) fail();
        element = term[0] === "element";
        terms.push(term);
        // Comments do not introduce a descendant combinator by themselves.
        while (source.slice(at, at + 2) === "/*") {
          var end = source.indexOf("*/", at + 2);
          if (end < 0) fail();
          at = end + 2;
        }
      }
      if (!terms.length) fail();
      parts.push([join, terms]);
      var whitespace = trivia();
      if (at === source.length || source[at] === ")") break;
      if (source[at] === ",") {
        selectors.push(parts); parts = []; join = ""; at++; trivia();
        if (at === source.length || source[at] === ")") fail();
      } else {
        if (element || (!whitespace && !/[>+~]/.test(source[at]))) fail();
        join = " ";
      }
    }
    if (!parts.length) fail();
    selectors.push(parts);
    return selectors;
  }
  var selectors = group(false, 0);
  if (at !== source.length) fail();
  return selectors;
}

// Version 1: counted selector lists, counted compounds, then counted terms.
// Each term carries only its fields; punctuation is supplied by the renderer.
// The surrounding message already bounds the byte slice. Integers use the
// existing unsigned LEB128 writer; nth coefficients use zigzag encoding.
function writeConstrainedSelector(writer, selectors) {
  var kinds = ["tag", "id", "class", "pseudo", "element", "attribute", "is", "where", "not", "has", "nth"];
  var joins = ["", " ", ">", "+", "~"];
  var operators = ["", "=", "~=", "|=", "^=", "$=", "*="];
  var positions = ["nth-child", "nth-last-child", "nth-of-type", "nth-last-of-type"];
  function group(list) {
    writer.uint(list.length);
    list.forEach(function (parts) {
      writer.uint(parts.length);
      parts.forEach(function (part) {
        writer.byte(joins.indexOf(part[0])); writer.uint(part[1].length);
        part[1].forEach(function (term) {
          var kind = kinds.indexOf(term[0]); writer.byte(kind);
          if (kind < 5) writer.text(term[1]);
          else if (kind === 5) {
            writer.text(term[1]); writer.byte(operators.indexOf(term[2])); writer.text(term[3]);
          } else if (kind === 10) {
            writer.byte(positions.indexOf(term[1]));
            writer.uint(term[2] < 0 ? -2 * term[2] - 1 : 2 * term[2]);
            writer.uint(term[3] < 0 ? -2 * term[3] - 1 : 2 * term[3]);
          } else group(term[1]);
        });
      });
    });
  }
  writer.uint(1);
  group(selectors);
}

export { parseConstrainedSelector, writeConstrainedSelector };
