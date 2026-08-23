// Canonical constrained CSS parser shared by server, browser, and guest builds.
// Keep this source ES5-compatible so MicroQuickJS builds can concatenate it.
function cssSpace(source, at) {
  while (at < source.length && /\s/.test(source[at])) at++;
  return at;
}

function cssTrivia(source, at) {
  var comments = [];
  while (at < source.length) {
    if (/\s/.test(source[at])) { at = cssSpace(source, at); continue; }
    if (source.slice(at, at + 2) !== "/*") break;
    var end = source.indexOf("*/", at + 2);
    if (end < 0) throw new SyntaxError("CSS comment is incomplete at " + at);
    comments.push(source.slice(at + 2, end));
    at = end + 2;
  }
  return { at: at, comments: comments };
}

function cssParts(value) {
  var result = [], start = 0, depth = 0, quote = "";
  for (var index = 0; index <= value.length; index++) {
    var character = value[index] || " ";
    if (quote) {
      if (character === "\\") index++;
      else if (character === quote) quote = "";
    } else if (character === "\"" || character === "'") quote = character;
    else if (character === "(") depth++;
    else if (character === ")") {
      if (!depth) throw new SyntaxError("CSS function syntax does not balance");
      depth--;
    } else if (/\s/.test(character) && depth === 0) {
      if (index > start) result.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (quote || depth) throw new SyntaxError("CSS value does not balance");
  return result;
}

function cssEdges(property, value) {
  var parts = cssParts(value);
  if (!parts.length || parts.length > 4) throw new SyntaxError(property + " shorthand is not understood");
  var top = parts[0], right = parts[1] || top;
  var bottom = parts[2] || top, left = parts[3] || right;
  return [
    [property + "-top", top], [property + "-right", right],
    [property + "-bottom", bottom], [property + "-left", left]
  ];
}

function cssBorder(value) {
  if (value === "0" || value === "none") {
    return ["top", "right", "bottom", "left"].map(function (side) {
      return ["border-" + side + (value === "0" ? "-width" : "-style"), value];
    });
  }
  var parts = cssParts(value);
  if (parts.length !== 3 || !/^\d/.test(parts[0]) ||
      !/^(?:solid|dashed|dotted|double|none)$/.test(parts[1])) {
    throw new SyntaxError("border shorthand is not understood: " + value);
  }
  var result = [];
  ["top", "right", "bottom", "left"].forEach(function (side) {
    result.push(["border-" + side + "-width", parts[0]]);
    result.push(["border-" + side + "-style", parts[1]]);
    result.push(["border-" + side + "-color", parts[2]]);
  });
  return result;
}

function cssBorderSide(property, value) {
  var side = property.slice("border-".length);
  if (value === "0") return [[property + "-width", "0"]];
  if (value === "none") return [[property + "-style", "none"]];
  var parts = cssParts(value);
  if (parts.length === 2 && /^\d/.test(parts[0])) {
    return [[property + "-width", parts[0]], [property + "-color", parts[1]]];
  }
  if (parts.length !== 3 || !/^\d/.test(parts[0]) ||
      !/^(?:solid|dashed|dotted|double|none)$/.test(parts[1])) {
    throw new SyntaxError(property + " shorthand is not understood: " + value);
  }
  return [
    ["border-" + side + "-width", parts[0]],
    ["border-" + side + "-style", parts[1]],
    ["border-" + side + "-color", parts[2]]
  ];
}

function cssRadius(value) {
  var halves = value.split("/");
  if (halves.length > 2) throw new SyntaxError("border radius is not understood");
  var horizontal = cssParts(halves[0].trim());
  var vertical = halves.length === 2 ? cssParts(halves[1].trim()) : horizontal;
  if (!horizontal.length || horizontal.length > 4 || !vertical.length || vertical.length > 4) {
    throw new SyntaxError("border radius is not understood");
  }
  function corners(parts) {
    return [parts[0], parts[1] || parts[0], parts[2] || parts[0],
      parts[3] || parts[1] || parts[0]];
  }
  var x = corners(horizontal), y = corners(vertical);
  return [
    ["border-top-left-radius", x[0] + (x[0] === y[0] ? "" : " / " + y[0])],
    ["border-top-right-radius", x[1] + (x[1] === y[1] ? "" : " / " + y[1])],
    ["border-bottom-right-radius", x[2] + (x[2] === y[2] ? "" : " / " + y[2])],
    ["border-bottom-left-radius", x[3] + (x[3] === y[3] ? "" : " / " + y[3])]
  ];
}

function canonicalCss(property, value) {
  if (property === "-moz-tab-size") return [];
  if (property === "padding" || property === "margin") return cssEdges(property, value);
  if (property === "border") return cssBorder(value);
  if (/^border-(?:top|right|bottom|left)$/.test(property)) {
    return cssBorderSide(property, value);
  }
  if (property === "border-radius") return cssRadius(value);
  if (property === "gap") return [["row-gap", value], ["column-gap", value]];
  if (property === "overflow") {
    var overflow = cssParts(value);
    if (!overflow.length || overflow.length > 2) {
      throw new SyntaxError("overflow shorthand is not understood: " + value);
    }
    return [["overflow-x", overflow[0]], ["overflow-y", overflow[1] || overflow[0]]];
  }
  if (property === "border-color") return ["top", "right", "bottom", "left"].map(
    function (side) { return ["border-" + side + "-color", value]; }
  );
  if (property === "inset") return cssEdges("", value).map(function (entry) {
    return [entry[0].slice(1), entry[1]];
  });
  return [[property, value]];
}

function cssTokens(value) {
  var tokens = [], at = 0;
  while (at < value.length) {
    if (/\s/.test(value[at])) {
      at = cssSpace(value, at);
      if (tokens.length && tokens[tokens.length - 1][0] !== 0) tokens.push([0]);
      continue;
    }
    var rest = value.slice(at), match;
    if (value.slice(at, at + 2) === "/*") {
      var commentEnd = value.indexOf("*/", at + 2);
      if (commentEnd < 0) throw new SyntaxError("CSS value comment is incomplete at " + at);
      tokens.push([9, value.slice(at + 2, commentEnd)]);
      at = commentEnd + 2;
    } else
    if (value[at] === "\"" || value[at] === "'") {
      var quote = value[at++], text = "";
      while (at < value.length && value[at] !== quote) {
        if (value[at] === "\\") {
          if (++at >= value.length) throw new SyntaxError("CSS string escape is incomplete");
        }
        text += value[at++];
      }
      if (value[at++] !== quote) throw new SyntaxError("CSS string is incomplete");
      tokens.push([4, text]);
    } else if ((match = /^#([0-9a-f]{3,8})\b/i.exec(rest))) {
      tokens.push([3, match[1]]); at += match[0].length;
    } else if ((match = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[a-z]+|%)?/i.exec(rest))) {
      tokens.push([2, match[0]]); at += match[0].length;
    } else if ((match = /^(--?[a-z_][a-z0-9_-]*|[a-z_][a-z0-9_-]*)/i.exec(rest))) {
      at += match[0].length;
      if (value[at] === "(") { tokens.push([7, match[0]]); at++; }
      else tokens.push([1, match[0]]);
    } else if (value[at] === ",") { tokens.push([5]); at++; }
    else if (value[at] === "/") { tokens.push([6]); at++; }
    else if (value[at] === "+" || value[at] === "-" || value[at] === "*") {
      tokens.push([11, value[at++]]);
    }
    else if (value[at] === ")") { tokens.push([8]); at++; }
    else throw new SyntaxError("CSS value token is not understood at " + at);
  }
  if (tokens.length && tokens[tokens.length - 1][0] === 0) tokens.pop();
  return tokens;
}

function cssValueTree(value) {
  var tokens = cssTokens(value), at = 0;

  function grouped(items, separator, code) {
    var groups = [], group = [];
    items.forEach(function (item) {
      if (item.separator === separator) { groups.push(group); group = []; }
      else group.push(item);
    });
    groups.push(group);
    if (groups.length === 1) return null;
    return [10, code, groups.map(valueList)];
  }

  function valueList(items) {
    while (items.length && items[0].separator === " ") items.shift();
    while (items.length && items[items.length - 1].separator === " ") items.pop();
    var result = grouped(items, ",", 1) || grouped(items, "/", 2) ||
      grouped(items, " ", 0);
    if (result) return result;
    if (items.length !== 1 || items[0].separator) {
      throw new SyntaxError("CSS value list is not understood");
    }
    return items[0];
  }

  function read(end) {
    var items = [];
    while (at < tokens.length) {
      var token = tokens[at++];
      if (token[0] === 8) {
        if (!end) throw new SyntaxError("CSS function closes without opening");
        return valueList(items);
      }
      if (token[0] === 7) items.push([7, token[1], read(true)]);
      else if (token[0] === 0) {
        if (items.length && !items[items.length - 1].separator) items.push({ separator: " " });
      } else if (token[0] === 5) {
        while (items.length && items[items.length - 1].separator === " ") items.pop();
        items.push({ separator: "," });
      } else if (token[0] === 6) {
        while (items.length && items[items.length - 1].separator === " ") items.pop();
        items.push({ separator: "/" });
      } else items.push(token);
    }
    if (end) throw new SyntaxError("CSS function is incomplete");
    return valueList(items);
  }

  return read(false);
}

function parseCss(source) {
  var at = 0;
  function readDeclarations() {
    var declarations = [];
    while (true) {
      var declarationTrivia = cssTrivia(source, at);
      at = declarationTrivia.at;
      declarationTrivia.comments.forEach(function (comment) {
        declarations.push({ comment: comment });
      });
      if (source[at] === "}") { at++; return declarations; }
      var propertyMatch = /^(--?[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)\s*:/i.exec(source.slice(at));
      if (!propertyMatch) throw new SyntaxError("CSS declaration is not understood at " + at);
      var property = propertyMatch[1];
      at += propertyMatch[0].length;
      var start = at, depth = 0, quote = "";
      while (at < source.length) {
        var character = source[at];
        if (quote) {
          if (character === "\\") at++;
          else if (character === quote) quote = "";
        } else if (character === "\"" || character === "'") quote = character;
        else if (character === "(") depth++;
        else if (character === ")") {
          if (!depth) throw new SyntaxError("CSS function closes without opening");
          depth--;
        } else if (!depth && (character === ";" || character === "}")) break;
        at++;
      }
      if (quote || depth || at >= source.length) throw new SyntaxError("CSS declaration is incomplete");
      var value = source.slice(start, at).trim(), important = false;
      if (/\s*!important$/i.test(value)) {
        important = true; value = value.replace(/\s*!important$/i, "").trim();
      }
      if (!value) throw new SyntaxError("CSS declaration value is empty");
      try {
        canonicalCss(property, value).forEach(function (entry) {
          var structured = entry[0] === "background" || entry[0] === "background-image";
          declarations.push({ property: entry[0], tokens: structured ? null : cssTokens(entry[1]),
            value: structured ? cssValueTree(entry[1]) : null, important: important });
        });
      } catch (error) {
        throw new SyntaxError(property + ": " + value + ": " + error.message);
      }
      if (source[at] === ";") at++;
      else { at++; return declarations; }
    }
  }
  function readRules(nested) {
    var rules = [];
    while (at < source.length) {
    var trivia = cssTrivia(source, at);
    at = trivia.at;
    trivia.comments.forEach(function (comment) { rules.push({ comment: comment }); });
    if (nested && source[at] === "}") { at++; return rules; }
    if (at >= source.length) {
      if (nested) throw new SyntaxError("CSS media rule is incomplete");
      break;
    }
    var brace = source.indexOf("{", at);
    if (brace < 0) throw new SyntaxError("CSS rule is missing an opening brace");
    var selector = source.slice(at, brace).trim();
    var keyframes = /^@keyframes\s+([a-z_][a-z0-9_-]*)$/i.exec(selector);
    if (keyframes) {
      at = brace + 1;
      var frames = [];
      while (true) {
        at = cssTrivia(source, at).at;
        if (source[at] === "}") { at++; break; }
        var frameBrace = source.indexOf("{", at);
        if (frameBrace < 0) throw new SyntaxError("CSS keyframes rule is incomplete");
        var frameSelector = source.slice(at, frameBrace).trim().toLowerCase();
        if (!frameSelector.split(/\s*,\s*/).every(function (part) {
          return part === "from" || part === "to" || /^(?:100|\d{1,2})(?:\.\d+)?%$/.test(part);
        })) throw new SyntaxError("CSS keyframe selector is not understood: " + frameSelector);
        at = frameBrace + 1;
        frames.push({ selector: frameSelector, declarations: readDeclarations() });
      }
      rules.push({ keyframes: keyframes[1], frames: frames });
      continue;
    }
    var media = /^@media\s+(\([^{}]+\)(?:\s+(?:and|or)\s+\([^{}]+\)|\s*,\s*\([^{}]+\))*)$/i.exec(selector);
    if (media) {
      at = brace + 1;
      rules.push({ media: media[1].toLowerCase().replace(/:\s*/g, ": ")
        .replace(/\s*,\s*/g, ", ").replace(/\s+(and|or)\s+/g, " $1 "),
        rules: readRules(true) });
      continue;
    }
    if (!selector || selector.indexOf("@") >= 0 || selector.indexOf("}") >= 0) {
      throw new SyntaxError("CSS selector is not understood: " + selector.slice(0, 120));
    }
    at = brace + 1;
    var declarations = readDeclarations();
    rules.push({ selector: selector, declarations: declarations });
  }
    if (nested) throw new SyntaxError("CSS media rule is incomplete");
    return rules;
  }
  var rules = readRules(false);
  if (cssSpace(source, at) !== source.length) throw new SyntaxError("CSS input was not consumed");
  return rules;
}


export { parseCss as parseConstrainedCss };
