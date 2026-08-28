function _createForOfIteratorHelperLoose(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (t) return (t = t.call(r)).next.bind(t); if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var o = 0; return function () { return o >= r.length ? { done: !0 } : { done: !1, value: r[o++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _inheritsLoose(t, o) { t.prototype = Object.create(o.prototype), t.prototype.constructor = t, _setPrototypeOf(t, o); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
(function () {
  var rangeFrom = [];
  var rangeTo = [];
  (function () {
    var numbers = "lc,34,7n,7,7b,19,,,,2,,2,,,20,b,1c,l,g,,2t,7,2,6,2,2,,4,z,,u,r,2j,b,1m,9,9,,o,4,,9,,3,,5,17,3,3b,f,,w,1j,,,,4,8,4,,3,7,a,2,t,,1m,,,,2,4,8,,9,,a,2,q,,2,2,1l,,4,2,4,2,2,3,3,,u,2,3,,b,2,1l,,4,5,,2,4,,k,2,m,6,,,1m,,,2,,4,8,,7,3,a,2,u,,1n,,,,c,,9,,14,,3,,1l,3,5,3,,4,7,2,b,2,t,,1m,,2,,2,,3,,5,2,7,2,b,2,s,2,1l,2,,,2,4,8,,9,,a,2,t,,20,,4,,2,3,,,8,,29,,2,7,c,8,2q,,2,9,b,6,22,2,r,,,,,,1j,e,,5,,2,5,b,,10,9,,2u,4,,6,,2,2,2,p,2,4,3,g,4,d,,2,2,6,,f,,jj,3,qa,3,t,3,t,2,u,2,1s,2,,7,8,,2,b,9,,19,3,3b,2,y,,3a,3,4,2,9,,6,3,63,2,2,,1m,,,7,,,,,2,8,6,a,2,,1c,h,1r,4,1c,7,,,5,,14,9,c,2,w,4,2,2,,3,1k,,,2,3,,,3,1m,8,2,2,48,3,,d,,7,4,,6,,3,2,5i,1m,,5,ek,,5f,x,2da,3,3x,,2o,w,fe,6,2x,2,n9w,4,,a,w,2,28,2,7k,,3,,4,,p,2,5,,47,2,q,i,d,,12,8,p,b,1a,3,1c,,2,4,2,2,13,,1v,6,2,2,2,2,c,,8,,1b,,1f,,,3,2,2,5,2,,,16,2,8,,6m,,2,,4,,fn4,,kh,g,g,g,a6,2,gt,,6a,,45,5,1ae,3,,2,5,4,14,3,4,,4l,2,fx,4,ar,2,49,b,4w,,1i,f,1k,3,1d,4,2,2,1x,3,10,5,,8,1q,,c,2,1g,9,a,4,2,,2n,3,2,,,2,6,,4g,,3,8,l,2,1l,2,,,,,m,,e,7,3,5,5f,8,2,3,,,n,,29,,2,6,,,2,,,2,,2,6j,,2,4,6,2,,2,r,2,2d,8,2,,,2,2y,,,,2,6,,,2t,3,2,4,,5,77,9,,2,6t,,a,2,,,4,,40,4,2,2,4,,w,a,14,6,2,4,8,,9,6,2,3,1a,d,,2,ba,7,,6,,,2a,m,2,7,,2,,2,3e,6,3,,,2,,7,,,20,2,3,,,,9n,2,f0b,5,1n,7,t4,,1r,4,29,,f5k,2,43q,,,3,4,5,8,8,2,7,u,4,44,3,1iz,1j,4,1e,8,,e,,m,5,,f,11s,7,,h,2,7,,2,,5,79,7,c5,4,15s,7,31,7,240,5,gx7k,2o,3k,6o".split(",").map(function (s) {
      return s ? parseInt(s, 36) : 1;
    });
    for (var i2 = 0, n = 0; i2 < numbers.length; i2++) (i2 % 2 ? rangeTo : rangeFrom).push(n = n + numbers[i2]);
  })();
  function isExtendingChar(code2) {
    if (code2 < 768) return false;
    for (var from = 0, to = rangeFrom.length;;) {
      var mid = from + to >> 1;
      if (code2 < rangeFrom[mid]) to = mid;else if (code2 >= rangeTo[mid]) from = mid + 1;else return true;
      if (from == to) return false;
    }
  }
  function isRegionalIndicator(code2) {
    return code2 >= 127462 && code2 <= 127487;
  }
  var ZWJ = 8205;
  function findClusterBreak(str, pos, forward, includeExtending) {
    if (forward === void 0) {
      forward = true;
    }
    if (includeExtending === void 0) {
      includeExtending = true;
    }
    return (forward ? nextClusterBreak : prevClusterBreak)(str, pos, includeExtending);
  }
  function nextClusterBreak(str, pos, includeExtending) {
    if (pos == str.length) return pos;
    if (pos && surrogateLow(str.charCodeAt(pos)) && surrogateHigh(str.charCodeAt(pos - 1))) pos--;
    var prev = codePointAt(str, pos);
    pos += codePointSize(prev);
    while (pos < str.length) {
      var next = codePointAt(str, pos);
      if (prev == ZWJ || next == ZWJ || includeExtending && isExtendingChar(next)) {
        pos += codePointSize(next);
        prev = next;
      } else if (isRegionalIndicator(next)) {
        var countBefore = 0,
          i2 = pos - 2;
        while (i2 >= 0 && isRegionalIndicator(codePointAt(str, i2))) {
          countBefore++;
          i2 -= 2;
        }
        if (countBefore % 2 == 0) break;else pos += 2;
      } else {
        break;
      }
    }
    return pos;
  }
  function prevClusterBreak(str, pos, includeExtending) {
    while (pos > 1) {
      var found = nextClusterBreak(str, pos - 2, includeExtending);
      if (found < pos) return found;
      pos--;
    }
    return 0;
  }
  function codePointAt(str, pos) {
    var code0 = str.charCodeAt(pos);
    if (!surrogateHigh(code0) || pos + 1 == str.length) return code0;
    var code1 = str.charCodeAt(pos + 1);
    if (!surrogateLow(code1)) return code0;
    return (code0 - 55296 << 10) + (code1 - 56320) + 65536;
  }
  function surrogateLow(ch) {
    return ch >= 56320 && ch < 57344;
  }
  function surrogateHigh(ch) {
    return ch >= 55296 && ch < 56320;
  }
  function codePointSize(code2) {
    return code2 < 65536 ? 1 : 2;
  }
  var Text = function () {
    function _Text() {}
    var _proto = _Text.prototype;
    _proto.lineAt = function lineAt(pos) {
      if (pos < 0 || pos > this.length) throw new RangeError("Invalid position " + pos + " in document of length " + this.length);
      return this.lineInner(pos, false, 1, 0);
    };
    _proto.line = function line(n) {
      if (n < 1 || n > this.lines) throw new RangeError("Invalid line number " + n + " in " + this.lines + "-line document");
      return this.lineInner(n, true, 1, 0);
    };
    _proto.replace = function replace(from, to, text) {
      var _clip = clip(this, from, to);
      from = _clip[0];
      to = _clip[1];
      var parts = [];
      this.decompose(0, from, parts, 2);
      if (text.length) text.decompose(0, text.length, parts, 1 | 2);
      this.decompose(to, this.length, parts, 1);
      return TextNode.from(parts, this.length - (to - from) + text.length);
    };
    _proto.append = function append(other) {
      return this.replace(this.length, this.length, other);
    };
    _proto.slice = function slice(from, to) {
      if (to === void 0) {
        to = this.length;
      }
      var _clip2 = clip(this, from, to);
      from = _clip2[0];
      to = _clip2[1];
      var parts = [];
      this.decompose(from, to, parts, 0);
      return TextNode.from(parts, to - from);
    };
    _proto.eq = function eq(other) {
      if (other == this) return true;
      if (other.length != this.length || other.lines != this.lines) return false;
      var start = this.scanIdentical(other, 1),
        end = this.length - this.scanIdentical(other, -1);
      var a = new RawTextCursor(this),
        b = new RawTextCursor(other);
      for (var skip = start, pos = start;;) {
        a.next(skip);
        b.next(skip);
        skip = 0;
        if (a.lineBreak != b.lineBreak || a.done != b.done || a.value != b.value) return false;
        pos += a.value.length;
        if (a.done || pos >= end) return true;
      }
    };
    _proto.iter = function iter(dir) {
      if (dir === void 0) {
        dir = 1;
      }
      return new RawTextCursor(this, dir);
    };
    _proto.iterRange = function iterRange(from, to) {
      if (to === void 0) {
        to = this.length;
      }
      return new PartialTextCursor(this, from, to);
    };
    _proto.iterLines = function iterLines(from, to) {
      var inner;
      if (from == null) {
        inner = this.iter();
      } else {
        if (to == null) to = this.lines + 1;
        var start = this.line(from).from;
        inner = this.iterRange(start, Math.max(start, to == this.lines + 1 ? this.length : to <= 1 ? 0 : this.line(to - 1).to));
      }
      return new LineCursor(inner);
    };
    _proto.toString = function toString() {
      return this.sliceString(0);
    };
    _proto.toJSON = function toJSON() {
      var lines = [];
      this.flatten(lines);
      return lines;
    };
    _Text.of = function of(text) {
      if (text.length == 0) throw new RangeError("A document must have at least one line");
      if (text.length == 1 && !text[0]) return _Text.empty;
      return text.length <= 32 ? new TextLeaf(text) : TextNode.from(TextLeaf.split(text, []));
    };
    return _Text;
  }();
  var TextLeaf = function (_Text2) {
    function _TextLeaf(text, length) {
      var _this;
      if (length === void 0) {
        length = textLength(text);
      }
      _this = _Text2.call(this) || this;
      _this.text = text;
      _this.length = length;
      return _this;
    }
    _inheritsLoose(_TextLeaf, _Text2);
    var _proto2 = _TextLeaf.prototype;
    _proto2.lineInner = function lineInner(target, isLine, line, offset) {
      for (var i2 = 0;; i2++) {
        var string2 = this.text[i2],
          end = offset + string2.length;
        if ((isLine ? line : end) >= target) return new Line(offset, end, line, string2);
        offset = end + 1;
        line++;
      }
    };
    _proto2.decompose = function decompose(from, to, target, open) {
      var text = from <= 0 && to >= this.length ? this : new _TextLeaf(sliceText(this.text, from, to), Math.min(to, this.length) - Math.max(0, from));
      if (open & 1) {
        var prev = target.pop();
        var joined = appendText(text.text, prev.text.slice(), 0, text.length);
        if (joined.length <= 32) {
          target.push(new _TextLeaf(joined, prev.length + text.length));
        } else {
          var mid = joined.length >> 1;
          target.push(new _TextLeaf(joined.slice(0, mid)), new _TextLeaf(joined.slice(mid)));
        }
      } else {
        target.push(text);
      }
    };
    _proto2.replace = function replace(from, to, text) {
      if (!(text instanceof _TextLeaf)) return _Text2.prototype.replace.call(this, from, to, text);
      var _clip3 = clip(this, from, to);
      from = _clip3[0];
      to = _clip3[1];
      var lines = appendText(this.text, appendText(text.text, sliceText(this.text, 0, from)), to);
      var newLen = this.length + text.length - (to - from);
      if (lines.length <= 32) return new _TextLeaf(lines, newLen);
      return TextNode.from(_TextLeaf.split(lines, []), newLen);
    };
    _proto2.sliceString = function sliceString(from, to, lineSep) {
      if (to === void 0) {
        to = this.length;
      }
      if (lineSep === void 0) {
        lineSep = "\n";
      }
      var _clip4 = clip(this, from, to);
      from = _clip4[0];
      to = _clip4[1];
      var result = "";
      for (var pos = 0, i2 = 0; pos <= to && i2 < this.text.length; i2++) {
        var line = this.text[i2],
          end = pos + line.length;
        if (pos > from && i2) result += lineSep;
        if (from < end && to > pos) result += line.slice(Math.max(0, from - pos), to - pos);
        pos = end + 1;
      }
      return result;
    };
    _proto2.flatten = function flatten(target) {
      for (var _iterator = _createForOfIteratorHelperLoose(this.text), _step; !(_step = _iterator()).done;) {
        var line = _step.value;
        target.push(line);
      }
    };
    _proto2.scanIdentical = function scanIdentical() {
      return 0;
    };
    _TextLeaf.split = function split(text, target) {
      var part = [],
        len = -1;
      for (var _iterator2 = _createForOfIteratorHelperLoose(text), _step2; !(_step2 = _iterator2()).done;) {
        var line = _step2.value;
        part.push(line);
        len += line.length + 1;
        if (part.length == 32) {
          target.push(new _TextLeaf(part, len));
          part = [];
          len = -1;
        }
      }
      if (len > -1) target.push(new _TextLeaf(part, len));
      return target;
    };
    return _createClass(_TextLeaf, [{
      key: "lines",
      get: function get() {
        return this.text.length;
      }
    }, {
      key: "children",
      get: function get() {
        return null;
      }
    }]);
  }(Text);
  var TextNode = function (_Text3) {
    function _TextNode(children, length) {
      var _this2;
      _this2 = _Text3.call(this) || this;
      _this2.children = children;
      _this2.length = length;
      _this2.lines = 0;
      for (var _iterator3 = _createForOfIteratorHelperLoose(children), _step3; !(_step3 = _iterator3()).done;) {
        var child = _step3.value;
        _this2.lines += child.lines;
      }
      return _this2;
    }
    _inheritsLoose(_TextNode, _Text3);
    var _proto3 = _TextNode.prototype;
    _proto3.lineInner = function lineInner(target, isLine, line, offset) {
      for (var i2 = 0;; i2++) {
        var child = this.children[i2],
          end = offset + child.length,
          endLine = line + child.lines - 1;
        if ((isLine ? endLine : end) >= target) return child.lineInner(target, isLine, line, offset);
        offset = end + 1;
        line = endLine + 1;
      }
    };
    _proto3.decompose = function decompose(from, to, target, open) {
      for (var i2 = 0, pos = 0; pos <= to && i2 < this.children.length; i2++) {
        var child = this.children[i2],
          end = pos + child.length;
        if (from <= end && to >= pos) {
          var childOpen = open & ((pos <= from ? 1 : 0) | (end >= to ? 2 : 0));
          if (pos >= from && end <= to && !childOpen) target.push(child);else child.decompose(from - pos, to - pos, target, childOpen);
        }
        pos = end + 1;
      }
    };
    _proto3.replace = function replace(from, to, text) {
      var _clip5 = clip(this, from, to);
      from = _clip5[0];
      to = _clip5[1];
      if (text.lines < this.lines) for (var i2 = 0, pos = 0; i2 < this.children.length; i2++) {
        var child = this.children[i2],
          end = pos + child.length;
        if (from >= pos && to <= end) {
          var updated = child.replace(from - pos, to - pos, text);
          var totalLines = this.lines - child.lines + updated.lines;
          if (updated.lines < totalLines >> 5 - 1 && updated.lines > totalLines >> 5 + 1) {
            var copy = this.children.slice();
            copy[i2] = updated;
            return new _TextNode(copy, this.length - (to - from) + text.length);
          }
          return _Text3.prototype.replace.call(this, pos, end, updated);
        }
        pos = end + 1;
      }
      return _Text3.prototype.replace.call(this, from, to, text);
    };
    _proto3.sliceString = function sliceString(from, to, lineSep) {
      if (to === void 0) {
        to = this.length;
      }
      if (lineSep === void 0) {
        lineSep = "\n";
      }
      var _clip6 = clip(this, from, to);
      from = _clip6[0];
      to = _clip6[1];
      var result = "";
      for (var i2 = 0, pos = 0; i2 < this.children.length && pos <= to; i2++) {
        var child = this.children[i2],
          end = pos + child.length;
        if (pos > from && i2) result += lineSep;
        if (from < end && to > pos) result += child.sliceString(from - pos, to - pos, lineSep);
        pos = end + 1;
      }
      return result;
    };
    _proto3.flatten = function flatten(target) {
      for (var _iterator4 = _createForOfIteratorHelperLoose(this.children), _step4; !(_step4 = _iterator4()).done;) {
        var child = _step4.value;
        child.flatten(target);
      }
    };
    _proto3.scanIdentical = function scanIdentical(other, dir) {
      if (!(other instanceof _TextNode)) return 0;
      var length = 0;
      var _ref = dir > 0 ? [0, 0, this.children.length, other.children.length] : [this.children.length - 1, other.children.length - 1, -1, -1],
        iA = _ref[0],
        iB = _ref[1],
        eA = _ref[2],
        eB = _ref[3];
      for (;; iA += dir, iB += dir) {
        if (iA == eA || iB == eB) return length;
        var chA = this.children[iA],
          chB = other.children[iB];
        if (chA != chB) return length + chA.scanIdentical(chB, dir);
        length += chA.length + 1;
      }
    };
    _TextNode.from = function from(children, length) {
      if (length === void 0) {
        length = children.reduce(function (l, ch) {
          return l + ch.length + 1;
        }, -1);
      }
      var lines = 0;
      for (var _iterator5 = _createForOfIteratorHelperLoose(children), _step5; !(_step5 = _iterator5()).done;) {
        var _ch = _step5.value;
        lines += _ch.lines;
      }
      if (lines < 32) {
        var flat = [];
        for (var _iterator6 = _createForOfIteratorHelperLoose(children), _step6; !(_step6 = _iterator6()).done;) {
          var ch = _step6.value;
          ch.flatten(flat);
        }
        return new TextLeaf(flat, length);
      }
      var chunk = Math.max(32, lines >> 5),
        maxChunk = chunk << 1,
        minChunk = chunk >> 1;
      var chunked = [],
        currentLines = 0,
        currentLen = -1,
        currentChunk = [];
      function add2(child) {
        var last;
        if (child.lines > maxChunk && child instanceof _TextNode) {
          for (var _iterator7 = _createForOfIteratorHelperLoose(child.children), _step7; !(_step7 = _iterator7()).done;) {
            var node = _step7.value;
            add2(node);
          }
        } else if (child.lines > minChunk && (currentLines > minChunk || !currentLines)) {
          flush();
          chunked.push(child);
        } else if (child instanceof TextLeaf && currentLines && (last = currentChunk[currentChunk.length - 1]) instanceof TextLeaf && child.lines + last.lines <= 32) {
          currentLines += child.lines;
          currentLen += child.length + 1;
          currentChunk[currentChunk.length - 1] = new TextLeaf(last.text.concat(child.text), last.length + 1 + child.length);
        } else {
          if (currentLines + child.lines > chunk) flush();
          currentLines += child.lines;
          currentLen += child.length + 1;
          currentChunk.push(child);
        }
      }
      function flush() {
        if (currentLines == 0) return;
        chunked.push(currentChunk.length == 1 ? currentChunk[0] : _TextNode.from(currentChunk, currentLen));
        currentLen = -1;
        currentLines = currentChunk.length = 0;
      }
      for (var _iterator8 = _createForOfIteratorHelperLoose(children), _step8; !(_step8 = _iterator8()).done;) {
        var child = _step8.value;
        add2(child);
      }
      flush();
      return chunked.length == 1 ? chunked[0] : new _TextNode(chunked, length);
    };
    return _TextNode;
  }(Text);
  Text.empty = new TextLeaf([""], 0);
  function textLength(text) {
    var length = -1;
    for (var _iterator9 = _createForOfIteratorHelperLoose(text), _step9; !(_step9 = _iterator9()).done;) {
      var line = _step9.value;
      length += line.length + 1;
    }
    return length;
  }
  function appendText(text, target, from, to) {
    if (from === void 0) {
      from = 0;
    }
    if (to === void 0) {
      to = 1e9;
    }
    for (var pos = 0, i2 = 0, first = true; i2 < text.length && pos <= to; i2++) {
      var line = text[i2],
        end = pos + line.length;
      if (end >= from) {
        if (end > to) line = line.slice(0, to - pos);
        if (pos < from) line = line.slice(from - pos);
        if (first) {
          target[target.length - 1] += line;
          first = false;
        } else target.push(line);
      }
      pos = end + 1;
    }
    return target;
  }
  function sliceText(text, from, to) {
    return appendText(text, [""], from, to);
  }
  var RawTextCursor = function () {
    function RawTextCursor(text, dir) {
      if (dir === void 0) {
        dir = 1;
      }
      this.dir = dir;
      this.done = false;
      this.lineBreak = false;
      this.value = "";
      this.nodes = [text];
      this.offsets = [dir > 0 ? 1 : (text instanceof TextLeaf ? text.text.length : text.children.length) << 1];
    }
    var _proto4 = RawTextCursor.prototype;
    _proto4.nextInner = function nextInner(skip, dir) {
      this.done = this.lineBreak = false;
      for (;;) {
        var last = this.nodes.length - 1;
        var top2 = this.nodes[last],
          offsetValue = this.offsets[last],
          offset = offsetValue >> 1;
        var size = top2 instanceof TextLeaf ? top2.text.length : top2.children.length;
        if (offset == (dir > 0 ? size : 0)) {
          if (last == 0) {
            this.done = true;
            this.value = "";
            return this;
          }
          if (dir > 0) this.offsets[last - 1]++;
          this.nodes.pop();
          this.offsets.pop();
        } else if ((offsetValue & 1) == (dir > 0 ? 0 : 1)) {
          this.offsets[last] += dir;
          if (skip == 0) {
            this.lineBreak = true;
            this.value = "\n";
            return this;
          }
          skip--;
        } else if (top2 instanceof TextLeaf) {
          var next = top2.text[offset + (dir < 0 ? -1 : 0)];
          this.offsets[last] += dir;
          if (next.length > Math.max(0, skip)) {
            this.value = skip == 0 ? next : dir > 0 ? next.slice(skip) : next.slice(0, next.length - skip);
            return this;
          }
          skip -= next.length;
        } else {
          var _next = top2.children[offset + (dir < 0 ? -1 : 0)];
          if (skip > _next.length) {
            skip -= _next.length;
            this.offsets[last] += dir;
          } else {
            if (dir < 0) this.offsets[last]--;
            this.nodes.push(_next);
            this.offsets.push(dir > 0 ? 1 : (_next instanceof TextLeaf ? _next.text.length : _next.children.length) << 1);
          }
        }
      }
    };
    _proto4.next = function next(skip) {
      if (skip === void 0) {
        skip = 0;
      }
      if (skip < 0) {
        this.nextInner(-skip, -this.dir);
        skip = this.value.length;
      }
      return this.nextInner(skip, this.dir);
    };
    return RawTextCursor;
  }();
  var PartialTextCursor = function () {
    function PartialTextCursor(text, start, end) {
      this.value = "";
      this.done = false;
      this.cursor = new RawTextCursor(text, start > end ? -1 : 1);
      this.pos = start > end ? text.length : 0;
      this.from = Math.min(start, end);
      this.to = Math.max(start, end);
    }
    var _proto5 = PartialTextCursor.prototype;
    _proto5.nextInner = function nextInner(skip, dir) {
      if (dir < 0 ? this.pos <= this.from : this.pos >= this.to) {
        this.value = "";
        this.done = true;
        return this;
      }
      skip += Math.max(0, dir < 0 ? this.pos - this.to : this.from - this.pos);
      var limit = dir < 0 ? this.pos - this.from : this.to - this.pos;
      if (skip > limit) skip = limit;
      limit -= skip;
      var _this$cursor$next = this.cursor.next(skip),
        value = _this$cursor$next.value;
      this.pos += (value.length + skip) * dir;
      this.value = value.length <= limit ? value : dir < 0 ? value.slice(value.length - limit) : value.slice(0, limit);
      this.done = !this.value;
      return this;
    };
    _proto5.next = function next(skip) {
      if (skip === void 0) {
        skip = 0;
      }
      if (skip < 0) skip = Math.max(skip, this.from - this.pos);else if (skip > 0) skip = Math.min(skip, this.to - this.pos);
      return this.nextInner(skip, this.cursor.dir);
    };
    return _createClass(PartialTextCursor, [{
      key: "lineBreak",
      get: function get() {
        return this.cursor.lineBreak && this.value != "";
      }
    }]);
  }();
  var LineCursor = function () {
    function LineCursor(inner) {
      this.inner = inner;
      this.afterBreak = true;
      this.value = "";
      this.done = false;
    }
    var _proto6 = LineCursor.prototype;
    _proto6.next = function next(skip) {
      if (skip === void 0) {
        skip = 0;
      }
      var _this$inner$next = this.inner.next(skip),
        done = _this$inner$next.done,
        lineBreak = _this$inner$next.lineBreak,
        value = _this$inner$next.value;
      if (done && this.afterBreak) {
        this.value = "";
        this.afterBreak = false;
      } else if (done) {
        this.done = true;
        this.value = "";
      } else if (lineBreak) {
        if (this.afterBreak) {
          this.value = "";
        } else {
          this.afterBreak = true;
          this.next();
        }
      } else {
        this.value = value;
        this.afterBreak = false;
      }
      return this;
    };
    return _createClass(LineCursor, [{
      key: "lineBreak",
      get: function get() {
        return false;
      }
    }]);
  }();
  if (typeof Symbol != "undefined") {
    Text.prototype[Symbol.iterator] = function () {
      return this.iter();
    };
    RawTextCursor.prototype[Symbol.iterator] = PartialTextCursor.prototype[Symbol.iterator] = LineCursor.prototype[Symbol.iterator] = function () {
      return this;
    };
  }
  var Line = function () {
    function Line(from, to, number2, text) {
      this.from = from;
      this.to = to;
      this.number = number2;
      this.text = text;
    }
    return _createClass(Line, [{
      key: "length",
      get: function get() {
        return this.to - this.from;
      }
    }]);
  }();
  function clip(text, from, to) {
    from = Math.max(0, Math.min(text.length, from));
    return [from, Math.max(from, Math.min(text.length, to))];
  }
  function findClusterBreak2(str, pos, forward, includeExtending) {
    if (forward === void 0) {
      forward = true;
    }
    if (includeExtending === void 0) {
      includeExtending = true;
    }
    return findClusterBreak(str, pos, forward, includeExtending);
  }
  function surrogateLow2(ch) {
    return ch >= 56320 && ch < 57344;
  }
  function surrogateHigh2(ch) {
    return ch >= 55296 && ch < 56320;
  }
  function codePointAt2(str, pos) {
    var code0 = str.charCodeAt(pos);
    if (!surrogateHigh2(code0) || pos + 1 == str.length) return code0;
    var code1 = str.charCodeAt(pos + 1);
    if (!surrogateLow2(code1)) return code0;
    return (code0 - 55296 << 10) + (code1 - 56320) + 65536;
  }
  function codePointSize2(code2) {
    return code2 < 65536 ? 1 : 2;
  }
  var DefaultSplit = /\r\n?|\n/;
  var MapMode = function (MapMode2) {
    MapMode2[MapMode2["Simple"] = 0] = "Simple";
    MapMode2[MapMode2["TrackDel"] = 1] = "TrackDel";
    MapMode2[MapMode2["TrackBefore"] = 2] = "TrackBefore";
    MapMode2[MapMode2["TrackAfter"] = 3] = "TrackAfter";
    return MapMode2;
  }(MapMode || (MapMode = {}));
  var ChangeDesc = function () {
    function _ChangeDesc(sections) {
      this.sections = sections;
    }
    var _proto7 = _ChangeDesc.prototype;
    _proto7.iterGaps = function iterGaps(f) {
      for (var i2 = 0, posA = 0, posB = 0; i2 < this.sections.length;) {
        var len = this.sections[i2++],
          ins = this.sections[i2++];
        if (ins < 0) {
          f(posA, posB, len);
          posB += len;
        } else {
          posB += ins;
        }
        posA += len;
      }
    };
    _proto7.iterChangedRanges = function iterChangedRanges(f, individual) {
      if (individual === void 0) {
        individual = false;
      }
      _iterChanges(this, f, individual);
    };
    _proto7.composeDesc = function composeDesc(other) {
      return this.empty ? other : other.empty ? this : composeSets(this, other);
    };
    _proto7.mapDesc = function mapDesc(other, before) {
      if (before === void 0) {
        before = false;
      }
      return other.empty ? this : mapSet(this, other, before);
    };
    _proto7.mapPos = function mapPos(pos, assoc, mode) {
      if (assoc === void 0) {
        assoc = -1;
      }
      if (mode === void 0) {
        mode = MapMode.Simple;
      }
      var posA = 0,
        posB = 0;
      for (var i2 = 0; i2 < this.sections.length;) {
        var len = this.sections[i2++],
          ins = this.sections[i2++],
          endA = posA + len;
        if (ins < 0) {
          if (endA > pos) return posB + (pos - posA);
          posB += len;
        } else {
          if (mode != MapMode.Simple && endA >= pos && (mode == MapMode.TrackDel && posA < pos && endA > pos || mode == MapMode.TrackBefore && posA < pos || mode == MapMode.TrackAfter && endA > pos)) return null;
          if (endA > pos || endA == pos && assoc < 0 && !len) return pos == posA || assoc < 0 ? posB : posB + ins;
          posB += ins;
        }
        posA = endA;
      }
      if (pos > posA) throw new RangeError("Position " + pos + " is out of range for changeset of length " + posA);
      return posB;
    };
    _proto7.touchesRange = function touchesRange(from, to) {
      if (to === void 0) {
        to = from;
      }
      for (var i2 = 0, pos = 0; i2 < this.sections.length && pos <= to;) {
        var len = this.sections[i2++],
          ins = this.sections[i2++],
          end = pos + len;
        if (ins >= 0 && pos <= to && end >= from) return pos < from && end > to ? "cover" : true;
        pos = end;
      }
      return false;
    };
    _proto7.toString = function toString() {
      var result = "";
      for (var i2 = 0; i2 < this.sections.length;) {
        var len = this.sections[i2++],
          ins = this.sections[i2++];
        result += (result ? " " : "") + len + (ins >= 0 ? ":" + ins : "");
      }
      return result;
    };
    _proto7.toJSON = function toJSON() {
      return this.sections;
    };
    _ChangeDesc.fromJSON = function fromJSON(json) {
      if (!Array.isArray(json) || json.length % 2 || json.some(function (a) {
        return typeof a != "number";
      })) throw new RangeError("Invalid JSON representation of ChangeDesc");
      return new _ChangeDesc(json);
    };
    _ChangeDesc.create = function create(sections) {
      return new _ChangeDesc(sections);
    };
    return _createClass(_ChangeDesc, [{
      key: "length",
      get: function get() {
        var result = 0;
        for (var i2 = 0; i2 < this.sections.length; i2 += 2) result += this.sections[i2];
        return result;
      }
    }, {
      key: "newLength",
      get: function get() {
        var result = 0;
        for (var i2 = 0; i2 < this.sections.length; i2 += 2) {
          var ins = this.sections[i2 + 1];
          result += ins < 0 ? this.sections[i2] : ins;
        }
        return result;
      }
    }, {
      key: "empty",
      get: function get() {
        return this.sections.length == 0 || this.sections.length == 2 && this.sections[1] < 0;
      }
    }, {
      key: "invertedDesc",
      get: function get() {
        var sections = [];
        for (var i2 = 0; i2 < this.sections.length;) {
          var len = this.sections[i2++],
            ins = this.sections[i2++];
          if (ins < 0) sections.push(len, ins);else sections.push(ins, len);
        }
        return new _ChangeDesc(sections);
      }
    }]);
  }();
  var ChangeSet = function (_ChangeDesc2) {
    function _ChangeSet(sections, inserted) {
      var _this3;
      _this3 = _ChangeDesc2.call(this, sections) || this;
      _this3.inserted = inserted;
      return _this3;
    }
    _inheritsLoose(_ChangeSet, _ChangeDesc2);
    var _proto8 = _ChangeSet.prototype;
    _proto8.apply = function apply(doc2) {
      if (this.length != doc2.length) throw new RangeError("Applying change set to a document with the wrong length");
      _iterChanges(this, function (fromA, toA, fromB, _toB, text) {
        return doc2 = doc2.replace(fromB, fromB + (toA - fromA), text);
      }, false);
      return doc2;
    };
    _proto8.mapDesc = function mapDesc(other, before) {
      if (before === void 0) {
        before = false;
      }
      return mapSet(this, other, before, true);
    };
    _proto8.invert = function invert(doc2) {
      var sections = this.sections.slice(),
        inserted = [];
      for (var i2 = 0, pos = 0; i2 < sections.length; i2 += 2) {
        var len = sections[i2],
          ins = sections[i2 + 1];
        if (ins >= 0) {
          sections[i2] = ins;
          sections[i2 + 1] = len;
          var index = i2 >> 1;
          while (inserted.length < index) inserted.push(Text.empty);
          inserted.push(len ? doc2.slice(pos, pos + len) : Text.empty);
        }
        pos += len;
      }
      return new _ChangeSet(sections, inserted);
    };
    _proto8.compose = function compose(other) {
      return this.empty ? other : other.empty ? this : composeSets(this, other, true);
    };
    _proto8.map = function map(other, before) {
      if (before === void 0) {
        before = false;
      }
      return other.empty ? this : mapSet(this, other, before, true);
    };
    _proto8.iterChanges = function iterChanges(f, individual) {
      if (individual === void 0) {
        individual = false;
      }
      _iterChanges(this, f, individual);
    };
    _proto8.filter = function filter(ranges) {
      var resultSections = [],
        resultInserted = [],
        filteredSections = [];
      var iter = new SectionIter(this);
      done: for (var i2 = 0, pos = 0;;) {
        var next = i2 == ranges.length ? 1e9 : ranges[i2++];
        while (pos < next || pos == next && iter.len == 0) {
          if (iter.done) break done;
          var len = Math.min(iter.len, next - pos);
          addSection(filteredSections, len, -1);
          var ins = iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0;
          addSection(resultSections, len, ins);
          if (ins > 0) addInsert(resultInserted, resultSections, iter.text);
          iter.forward(len);
          pos += len;
        }
        var end = ranges[i2++];
        while (pos < end) {
          if (iter.done) break done;
          var _len = Math.min(iter.len, end - pos);
          addSection(resultSections, _len, -1);
          addSection(filteredSections, _len, iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0);
          iter.forward(_len);
          pos += _len;
        }
      }
      return {
        changes: new _ChangeSet(resultSections, resultInserted),
        filtered: ChangeDesc.create(filteredSections)
      };
    };
    _proto8.toJSON = function toJSON() {
      var parts = [];
      for (var i2 = 0; i2 < this.sections.length; i2 += 2) {
        var len = this.sections[i2],
          ins = this.sections[i2 + 1];
        if (ins < 0) parts.push(len);else if (ins == 0) parts.push([len]);else parts.push([len].concat(this.inserted[i2 >> 1].toJSON()));
      }
      return parts;
    };
    _ChangeSet.of = function of(changes, length, lineSep) {
      var sections = [],
        inserted = [],
        pos = 0;
      var total = null;
      function flush(force) {
        if (force === void 0) {
          force = false;
        }
        if (!force && !sections.length) return;
        if (pos < length) addSection(sections, length - pos, -1);
        var set = new _ChangeSet(sections, inserted);
        total = total ? total.compose(set.map(total)) : set;
        sections = [];
        inserted = [];
        pos = 0;
      }
      function process(spec) {
        if (Array.isArray(spec)) {
          for (var _iterator0 = _createForOfIteratorHelperLoose(spec), _step0; !(_step0 = _iterator0()).done;) {
            var sub = _step0.value;
            process(sub);
          }
        } else if (spec instanceof _ChangeSet) {
          if (spec.length != length) throw new RangeError("Mismatched change set length (got " + spec.length + ", expected " + length + ")");
          flush();
          total = total ? total.compose(spec.map(total)) : spec;
        } else {
          var from = spec.from,
            _spec$to = spec.to,
            to = _spec$to === void 0 ? from : _spec$to,
            insert2 = spec.insert;
          if (from > to || from < 0 || to > length) throw new RangeError("Invalid change range " + from + " to " + to + " (in doc of length " + length + ")");
          var insText = !insert2 ? Text.empty : typeof insert2 == "string" ? Text.of(insert2.split(lineSep || DefaultSplit)) : insert2;
          var insLen = insText.length;
          if (from == to && insLen == 0) return;
          if (from < pos) flush();
          if (from > pos) addSection(sections, from - pos, -1);
          addSection(sections, to - from, insLen);
          addInsert(inserted, sections, insText);
          pos = to;
        }
      }
      process(changes);
      flush(!total);
      return total;
    };
    _ChangeSet.empty = function empty(length) {
      return new _ChangeSet(length ? [length, -1] : [], []);
    };
    _ChangeSet.fromJSON = function fromJSON(json) {
      if (!Array.isArray(json)) throw new RangeError("Invalid JSON representation of ChangeSet");
      var sections = [],
        inserted = [];
      for (var i2 = 0; i2 < json.length; i2++) {
        var part = json[i2];
        if (typeof part == "number") {
          sections.push(part, -1);
        } else if (!Array.isArray(part) || typeof part[0] != "number" || part.some(function (e, i3) {
          return i3 && typeof e != "string";
        })) {
          throw new RangeError("Invalid JSON representation of ChangeSet");
        } else if (part.length == 1) {
          sections.push(part[0], 0);
        } else {
          while (inserted.length < i2) inserted.push(Text.empty);
          inserted[i2] = Text.of(part.slice(1));
          sections.push(part[0], inserted[i2].length);
        }
      }
      return new _ChangeSet(sections, inserted);
    };
    _ChangeSet.createSet = function createSet(sections, inserted) {
      return new _ChangeSet(sections, inserted);
    };
    return _createClass(_ChangeSet, [{
      key: "desc",
      get: function get() {
        return ChangeDesc.create(this.sections);
      }
    }]);
  }(ChangeDesc);
  function addSection(sections, len, ins, forceJoin) {
    if (forceJoin === void 0) {
      forceJoin = false;
    }
    if (len == 0 && ins <= 0) return;
    var last = sections.length - 2;
    if (last >= 0 && ins <= 0 && ins == sections[last + 1]) sections[last] += len;else if (last >= 0 && len == 0 && sections[last] == 0) sections[last + 1] += ins;else if (forceJoin) {
      sections[last] += len;
      sections[last + 1] += ins;
    } else sections.push(len, ins);
  }
  function addInsert(values, sections, value) {
    if (value.length == 0) return;
    var index = sections.length - 2 >> 1;
    if (index < values.length) {
      values[values.length - 1] = values[values.length - 1].append(value);
    } else {
      while (values.length < index) values.push(Text.empty);
      values.push(value);
    }
  }
  function _iterChanges(desc, f, individual) {
    var inserted = desc.inserted;
    for (var posA = 0, posB = 0, i2 = 0; i2 < desc.sections.length;) {
      var len = desc.sections[i2++],
        ins = desc.sections[i2++];
      if (ins < 0) {
        posA += len;
        posB += len;
      } else {
        var endA = posA,
          endB = posB,
          text = Text.empty;
        for (;;) {
          endA += len;
          endB += ins;
          if (ins && inserted) text = text.append(inserted[i2 - 2 >> 1]);
          if (individual || i2 == desc.sections.length || desc.sections[i2 + 1] < 0) break;
          len = desc.sections[i2++];
          ins = desc.sections[i2++];
        }
        f(posA, endA, posB, endB, text);
        posA = endA;
        posB = endB;
      }
    }
  }
  function mapSet(setA, setB, before, mkSet) {
    if (mkSet === void 0) {
      mkSet = false;
    }
    var sections = [],
      insert2 = mkSet ? [] : null;
    var a = new SectionIter(setA),
      b = new SectionIter(setB);
    for (var inserted = -1;;) {
      if (a.done && b.len || b.done && a.len) {
        throw new Error("Mismatched change set lengths");
      } else if (a.ins == -1 && b.ins == -1) {
        var len = Math.min(a.len, b.len);
        addSection(sections, len, -1);
        a.forward(len);
        b.forward(len);
      } else if (b.ins >= 0 && (a.ins < 0 || inserted == a.i || a.off == 0 && (b.len < a.len || b.len == a.len && !before))) {
        var _len2 = b.len;
        addSection(sections, b.ins, -1);
        while (_len2) {
          var piece = Math.min(a.len, _len2);
          if (a.ins >= 0 && inserted < a.i && a.len <= piece) {
            addSection(sections, 0, a.ins);
            if (insert2) addInsert(insert2, sections, a.text);
            inserted = a.i;
          }
          a.forward(piece);
          _len2 -= piece;
        }
        b.next();
      } else if (a.ins >= 0) {
        var _len3 = 0,
          left = a.len;
        while (left) {
          if (b.ins == -1) {
            var _piece = Math.min(left, b.len);
            _len3 += _piece;
            left -= _piece;
            b.forward(_piece);
          } else if (b.ins == 0 && b.len < left) {
            left -= b.len;
            b.next();
          } else {
            break;
          }
        }
        addSection(sections, _len3, inserted < a.i ? a.ins : 0);
        if (insert2 && inserted < a.i) addInsert(insert2, sections, a.text);
        inserted = a.i;
        a.forward(a.len - left);
      } else if (a.done && b.done) {
        return insert2 ? ChangeSet.createSet(sections, insert2) : ChangeDesc.create(sections);
      } else {
        throw new Error("Mismatched change set lengths");
      }
    }
  }
  function composeSets(setA, setB, mkSet) {
    if (mkSet === void 0) {
      mkSet = false;
    }
    var sections = [];
    var insert2 = mkSet ? [] : null;
    var a = new SectionIter(setA),
      b = new SectionIter(setB);
    for (var open = false;;) {
      if (a.done && b.done) {
        return insert2 ? ChangeSet.createSet(sections, insert2) : ChangeDesc.create(sections);
      } else if (a.ins == 0) {
        addSection(sections, a.len, 0, open);
        a.next();
      } else if (b.len == 0 && !b.done) {
        addSection(sections, 0, b.ins, open);
        if (insert2) addInsert(insert2, sections, b.text);
        b.next();
      } else if (a.done || b.done) {
        throw new Error("Mismatched change set lengths");
      } else {
        var len = Math.min(a.len2, b.len),
          sectionLen = sections.length;
        if (a.ins == -1) {
          var insB = b.ins == -1 ? -1 : b.off ? 0 : b.ins;
          addSection(sections, len, insB, open);
          if (insert2 && insB) addInsert(insert2, sections, b.text);
        } else if (b.ins == -1) {
          addSection(sections, a.off ? 0 : a.len, len, open);
          if (insert2) addInsert(insert2, sections, a.textBit(len));
        } else {
          addSection(sections, a.off ? 0 : a.len, b.off ? 0 : b.ins, open);
          if (insert2 && !b.off) addInsert(insert2, sections, b.text);
        }
        open = (a.ins > len || b.ins >= 0 && b.len > len) && (open || sections.length > sectionLen);
        a.forward2(len);
        b.forward(len);
      }
    }
  }
  var SectionIter = function () {
    function SectionIter(set) {
      this.set = set;
      this.i = 0;
      this.next();
    }
    var _proto9 = SectionIter.prototype;
    _proto9.next = function next() {
      var sections = this.set.sections;
      if (this.i < sections.length) {
        this.len = sections[this.i++];
        this.ins = sections[this.i++];
      } else {
        this.len = 0;
        this.ins = -2;
      }
      this.off = 0;
    };
    _proto9.textBit = function textBit(len) {
      var inserted = this.set.inserted,
        index = this.i - 2 >> 1;
      return index >= inserted.length && !len ? Text.empty : inserted[index].slice(this.off, len == null ? void 0 : this.off + len);
    };
    _proto9.forward = function forward(len) {
      if (len == this.len) this.next();else {
        this.len -= len;
        this.off += len;
      }
    };
    _proto9.forward2 = function forward2(len) {
      if (this.ins == -1) this.forward(len);else if (len == this.ins) this.next();else {
        this.ins -= len;
        this.off += len;
      }
    };
    return _createClass(SectionIter, [{
      key: "done",
      get: function get() {
        return this.ins == -2;
      }
    }, {
      key: "len2",
      get: function get() {
        return this.ins < 0 ? this.len : this.ins;
      }
    }, {
      key: "text",
      get: function get() {
        var inserted = this.set.inserted,
          index = this.i - 2 >> 1;
        return index >= inserted.length ? Text.empty : inserted[index];
      }
    }]);
  }();
  var SelectionRange = function () {
    function _SelectionRange(from, to, flags, goalColumn) {
      this.from = from;
      this.to = to;
      this.flags = flags;
      this.goalColumn = goalColumn;
    }
    var _proto0 = _SelectionRange.prototype;
    _proto0.map = function map(change, assoc) {
      if (assoc === void 0) {
        assoc = -1;
      }
      var from, to;
      if (this.empty) {
        from = to = change.mapPos(this.from, assoc);
      } else {
        from = change.mapPos(this.from, 1);
        to = change.mapPos(this.to, -1);
      }
      return from == this.from && to == this.to ? this : new _SelectionRange(from, to, this.flags, this.goalColumn);
    };
    _proto0.extend = function extend(from, to, assoc) {
      if (to === void 0) {
        to = from;
      }
      if (assoc === void 0) {
        assoc = 0;
      }
      if (from <= this.anchor && to >= this.anchor) return EditorSelection.range(from, to, void 0, void 0, assoc);
      var head = Math.abs(from - this.anchor) > Math.abs(to - this.anchor) ? from : to;
      return EditorSelection.range(this.anchor, head, void 0, void 0, assoc);
    };
    _proto0.eq = function eq(other, includeAssoc) {
      if (includeAssoc === void 0) {
        includeAssoc = false;
      }
      return this.anchor == other.anchor && this.head == other.head && this.goalColumn == other.goalColumn && (!includeAssoc || !this.empty || this.assoc == other.assoc);
    };
    _proto0.toJSON = function toJSON() {
      return {
        anchor: this.anchor,
        head: this.head
      };
    };
    _SelectionRange.fromJSON = function fromJSON(json) {
      if (!json || typeof json.anchor != "number" || typeof json.head != "number") throw new RangeError("Invalid JSON representation for SelectionRange");
      return EditorSelection.range(json.anchor, json.head);
    };
    _SelectionRange.create = function create(from, to, flags, goalColumn) {
      return new _SelectionRange(from, to, flags, goalColumn);
    };
    return _createClass(_SelectionRange, [{
      key: "anchor",
      get: function get() {
        return this.flags & 32 ? this.to : this.from;
      }
    }, {
      key: "head",
      get: function get() {
        return this.flags & 32 ? this.from : this.to;
      }
    }, {
      key: "empty",
      get: function get() {
        return this.from == this.to;
      }
    }, {
      key: "assoc",
      get: function get() {
        return this.flags & 8 ? -1 : this.flags & 16 ? 1 : 0;
      }
    }, {
      key: "undirectional",
      get: function get() {
        return (this.flags & 64) > 0;
      }
    }, {
      key: "bidiLevel",
      get: function get() {
        var level = this.flags & 7;
        return level == 7 ? null : level;
      }
    }]);
  }();
  var EditorSelection = function () {
    function _EditorSelection(ranges, mainIndex) {
      this.ranges = ranges;
      this.mainIndex = mainIndex;
    }
    var _proto1 = _EditorSelection.prototype;
    _proto1.map = function map(change, assoc) {
      if (assoc === void 0) {
        assoc = -1;
      }
      if (change.empty) return this;
      return _EditorSelection.create(this.ranges.map(function (r) {
        return r.map(change, assoc);
      }), this.mainIndex);
    };
    _proto1.eq = function eq(other, includeAssoc) {
      if (includeAssoc === void 0) {
        includeAssoc = false;
      }
      if (this.ranges.length != other.ranges.length || this.mainIndex != other.mainIndex) return false;
      for (var i2 = 0; i2 < this.ranges.length; i2++) if (!this.ranges[i2].eq(other.ranges[i2], includeAssoc)) return false;
      return true;
    };
    _proto1.asSingle = function asSingle() {
      return this.ranges.length == 1 ? this : new _EditorSelection([this.main], 0);
    };
    _proto1.addRange = function addRange(range, main) {
      if (main === void 0) {
        main = true;
      }
      return _EditorSelection.create([range].concat(this.ranges), main ? 0 : this.mainIndex + 1);
    };
    _proto1.replaceRange = function replaceRange(range, which) {
      if (which === void 0) {
        which = this.mainIndex;
      }
      var ranges = this.ranges.slice();
      ranges[which] = range;
      return _EditorSelection.create(ranges, this.mainIndex);
    };
    _proto1.toJSON = function toJSON() {
      return {
        ranges: this.ranges.map(function (r) {
          return r.toJSON();
        }),
        main: this.mainIndex
      };
    };
    _EditorSelection.fromJSON = function fromJSON(json) {
      if (!json || !Array.isArray(json.ranges) || typeof json.main != "number" || json.main >= json.ranges.length) throw new RangeError("Invalid JSON representation for EditorSelection");
      return new _EditorSelection(json.ranges.map(function (r) {
        return SelectionRange.fromJSON(r);
      }), json.main);
    };
    _EditorSelection.single = function single(anchor, head) {
      if (head === void 0) {
        head = anchor;
      }
      return new _EditorSelection([_EditorSelection.range(anchor, head)], 0);
    };
    _EditorSelection.create = function create(ranges, mainIndex) {
      if (mainIndex === void 0) {
        mainIndex = 0;
      }
      if (ranges.length == 0) throw new RangeError("A selection needs at least one range");
      for (var pos = 0, i2 = 0; i2 < ranges.length; i2++) {
        var range = ranges[i2];
        if (range.empty ? range.from <= pos : range.from < pos) return _EditorSelection.normalized(ranges.slice(), mainIndex);
        pos = range.to;
      }
      return new _EditorSelection(ranges, mainIndex);
    };
    _EditorSelection.cursor = function cursor(pos, assoc, bidiLevel, goalColumn) {
      if (assoc === void 0) {
        assoc = 0;
      }
      return SelectionRange.create(pos, pos, (assoc == 0 ? 0 : assoc < 0 ? 8 : 16) | (bidiLevel == null ? 7 : Math.min(6, bidiLevel)), goalColumn);
    };
    _EditorSelection.range = function range(anchor, head, goalColumn, bidiLevel, assoc) {
      var flags = bidiLevel == null ? 7 : Math.min(6, bidiLevel);
      if (!assoc && anchor != head) assoc = head < anchor ? 1 : -1;
      if (assoc) flags |= assoc < 0 ? 8 : 16;
      return head < anchor ? SelectionRange.create(head, anchor, flags | 32, goalColumn) : SelectionRange.create(anchor, head, flags, goalColumn);
    };
    _EditorSelection.undirectionalRange = function undirectionalRange(from, to) {
      return SelectionRange.create(from, to, 64, void 0);
    };
    _EditorSelection.normalized = function normalized(ranges, mainIndex) {
      if (mainIndex === void 0) {
        mainIndex = 0;
      }
      var main = ranges[mainIndex];
      ranges.sort(function (a, b) {
        return a.from - b.from;
      });
      mainIndex = ranges.indexOf(main);
      for (var i2 = 1; i2 < ranges.length; i2++) {
        var range = ranges[i2],
          prev = ranges[i2 - 1];
        if (range.empty ? range.from <= prev.to : range.from < prev.to) {
          var from = prev.from,
            to = Math.max(range.to, prev.to);
          if (i2 <= mainIndex) mainIndex--;
          ranges.splice(--i2, 2, range.anchor > range.head ? _EditorSelection.range(to, from) : _EditorSelection.range(from, to));
        }
      }
      return new _EditorSelection(ranges, mainIndex);
    };
    return _createClass(_EditorSelection, [{
      key: "main",
      get: function get() {
        return this.ranges[this.mainIndex];
      }
    }]);
  }();
  function checkSelection(selection, docLength) {
    for (var _iterator1 = _createForOfIteratorHelperLoose(selection.ranges), _step1; !(_step1 = _iterator1()).done;) {
      var range = _step1.value;
      if (range.to > docLength) throw new RangeError("Selection points outside of document");
    }
  }
  var nextID = 0;
  var Facet = function () {
    function _Facet(combine, compareInput, compare2, isStatic, enables) {
      this.combine = combine;
      this.compareInput = compareInput;
      this.compare = compare2;
      this.isStatic = isStatic;
      this.id = nextID++;
      this.default = combine([]);
      this.extensions = typeof enables == "function" ? enables(this) : enables;
    }
    _Facet.define = function define(config) {
      if (config === void 0) {
        config = {};
      }
      return new _Facet(config.combine || function (a) {
        return a;
      }, config.compareInput || function (a, b) {
        return a === b;
      }, config.compare || (!config.combine ? sameArray : function (a, b) {
        return a === b;
      }), !!config.static, config.enables);
    };
    var _proto10 = _Facet.prototype;
    _proto10.of = function of(value) {
      return new FacetProvider([], this, 0, value);
    };
    _proto10.compute = function compute(deps, get) {
      if (this.isStatic) throw new Error("Can't compute a static facet");
      return new FacetProvider(deps, this, 1, get);
    };
    _proto10.computeN = function computeN(deps, get) {
      if (this.isStatic) throw new Error("Can't compute a static facet");
      return new FacetProvider(deps, this, 2, get);
    };
    _proto10.from = function from(field, get) {
      if (!get) get = function get(x) {
        return x;
      };
      return this.compute([field], function (state) {
        return get(state.field(field));
      });
    };
    return _createClass(_Facet, [{
      key: "reader",
      get: function get() {
        return this;
      }
    }]);
  }();
  function sameArray(a, b) {
    return a == b || a.length == b.length && a.every(function (e, i2) {
      return e === b[i2];
    });
  }
  var FacetProvider = function () {
    function FacetProvider(dependencies, facet, type, value) {
      this.dependencies = dependencies;
      this.facet = facet;
      this.type = type;
      this.value = value;
      this.id = nextID++;
    }
    var _proto11 = FacetProvider.prototype;
    _proto11.dynamicSlot = function dynamicSlot(addresses) {
      var _this4 = this;
      var _a2;
      var getter = this.value;
      var compare2 = this.facet.compareInput;
      var id = this.id,
        idx = addresses[id] >> 1,
        multi = this.type == 2;
      var depDoc = false,
        depSel = false,
        depAddrs = [];
      for (var _iterator10 = _createForOfIteratorHelperLoose(this.dependencies), _step10; !(_step10 = _iterator10()).done;) {
        var dep = _step10.value;
        if (dep == "doc") depDoc = true;else if (dep == "selection") depSel = true;else if ((((_a2 = addresses[dep.id]) !== null && _a2 !== void 0 ? _a2 : 1) & 1) == 0) depAddrs.push(addresses[dep.id]);
      }
      return {
        create: function create(state) {
          state.values[idx] = getter(state);
          return 1;
        },
        update: function update(state, tr) {
          if (depDoc && tr.docChanged || depSel && (tr.docChanged || tr.selection) || ensureAll(state, depAddrs)) {
            var newVal = getter(state);
            if (multi ? !compareArray(newVal, state.values[idx], compare2) : !compare2(newVal, state.values[idx])) {
              state.values[idx] = newVal;
              return 1;
            }
          }
          return 0;
        },
        reconfigure: function reconfigure(state, oldState) {
          var newVal,
            oldAddr = oldState.config.address[id];
          if (oldAddr != null) {
            var oldVal = getAddr(oldState, oldAddr);
            if (_this4.dependencies.every(function (dep) {
              return dep instanceof Facet ? oldState.facet(dep) === state.facet(dep) : dep instanceof StateField ? oldState.field(dep, false) == state.field(dep, false) : true;
            }) || (multi ? compareArray(newVal = getter(state), oldVal, compare2) : compare2(newVal = getter(state), oldVal))) {
              state.values[idx] = oldVal;
              return 0;
            }
          } else {
            newVal = getter(state);
          }
          state.values[idx] = newVal;
          return 1;
        }
      };
    };
    return _createClass(FacetProvider, [{
      key: "extension",
      get: function get() {
        return this;
      }
    }]);
  }();
  function compareArray(a, b, compare2) {
    if (a.length != b.length) return false;
    for (var i2 = 0; i2 < a.length; i2++) if (!compare2(a[i2], b[i2])) return false;
    return true;
  }
  function ensureAll(state, addrs) {
    var changed = false;
    for (var _iterator11 = _createForOfIteratorHelperLoose(addrs), _step11; !(_step11 = _iterator11()).done;) {
      var addr = _step11.value;
      if (ensureAddr(state, addr) & 1) changed = true;
    }
    return changed;
  }
  function dynamicFacetSlot(addresses, facet, providers) {
    var providerAddrs = providers.map(function (p) {
      return addresses[p.id];
    });
    var providerTypes = providers.map(function (p) {
      return p.type;
    });
    var dynamic = providerAddrs.filter(function (p) {
      return !(p & 1);
    });
    var idx = addresses[facet.id] >> 1;
    function get(state) {
      var values = [];
      for (var i2 = 0; i2 < providerAddrs.length; i2++) {
        var value = getAddr(state, providerAddrs[i2]);
        if (providerTypes[i2] == 2) {
          for (var _iterator12 = _createForOfIteratorHelperLoose(value), _step12; !(_step12 = _iterator12()).done;) {
            var val = _step12.value;
            values.push(val);
          }
        } else values.push(value);
      }
      return facet.combine(values);
    }
    return {
      create: function create(state) {
        for (var _iterator13 = _createForOfIteratorHelperLoose(providerAddrs), _step13; !(_step13 = _iterator13()).done;) {
          var addr = _step13.value;
          ensureAddr(state, addr);
        }
        state.values[idx] = get(state);
        return 1;
      },
      update: function update(state, tr) {
        if (!ensureAll(state, dynamic)) return 0;
        var value = get(state);
        if (facet.compare(value, state.values[idx])) return 0;
        state.values[idx] = value;
        return 1;
      },
      reconfigure: function reconfigure(state, oldState) {
        var depChanged = ensureAll(state, providerAddrs);
        var oldProviders = oldState.config.facets[facet.id],
          oldValue = oldState.facet(facet);
        if (oldProviders && !depChanged && sameArray(providers, oldProviders)) {
          state.values[idx] = oldValue;
          return 0;
        }
        var value = get(state);
        if (facet.compare(value, oldValue)) {
          state.values[idx] = oldValue;
          return 0;
        }
        state.values[idx] = value;
        return 1;
      }
    };
  }
  var initField = Facet.define({
    static: true
  });
  var StateField = function () {
    function _StateField(id, createF, updateF, compareF, spec) {
      this.id = id;
      this.createF = createF;
      this.updateF = updateF;
      this.compareF = compareF;
      this.spec = spec;
      this.provides = void 0;
    }
    _StateField.define = function define(config) {
      var field = new _StateField(nextID++, config.create, config.update, config.compare || function (a, b) {
        return a === b;
      }, config);
      if (config.provide) field.provides = config.provide(field);
      return field;
    };
    var _proto12 = _StateField.prototype;
    _proto12.create = function create(state) {
      var _this5 = this;
      var init = state.facet(initField).find(function (i2) {
        return i2.field == _this5;
      });
      return ((init === null || init === void 0 ? void 0 : init.create) || this.createF)(state);
    };
    _proto12.slot = function slot(addresses) {
      var _this6 = this;
      var idx = addresses[this.id] >> 1;
      return {
        create: function create(state) {
          state.values[idx] = _this6.create(state);
          return 1;
        },
        update: function update(state, tr) {
          var oldVal = state.values[idx];
          var value = _this6.updateF(oldVal, tr);
          if (_this6.compareF(oldVal, value)) return 0;
          state.values[idx] = value;
          return 1;
        },
        reconfigure: function reconfigure(state, oldState) {
          var init = state.facet(initField),
            oldInit = oldState.facet(initField),
            reInit;
          if ((reInit = init.find(function (i2) {
            return i2.field == _this6;
          })) && reInit != oldInit.find(function (i2) {
            return i2.field == _this6;
          })) {
            state.values[idx] = reInit.create(state);
            return 1;
          }
          if (oldState.config.address[_this6.id] != null) {
            state.values[idx] = oldState.field(_this6);
            return 0;
          }
          state.values[idx] = _this6.create(state);
          return 1;
        }
      };
    };
    _proto12.init = function init(create) {
      return [this, initField.of({
        field: this,
        create: create
      })];
    };
    return _createClass(_StateField, [{
      key: "extension",
      get: function get() {
        return this;
      }
    }]);
  }();
  var Prec_ = {
    lowest: 4,
    low: 3,
    default: 2,
    high: 1,
    highest: 0
  };
  function prec(value) {
    return function (ext) {
      return new PrecExtension(ext, value);
    };
  }
  var Prec = {
    highest: prec(Prec_.highest),
    high: prec(Prec_.high),
    default: prec(Prec_.default),
    low: prec(Prec_.low),
    lowest: prec(Prec_.lowest)
  };
  var PrecExtension = function () {
    function PrecExtension(inner, prec2) {
      this.inner = inner;
      this.prec = prec2;
    }
    return _createClass(PrecExtension, [{
      key: "extension",
      get: function get() {
        return this;
      }
    }]);
  }();
  var Compartment = function () {
    function _Compartment() {}
    var _proto13 = _Compartment.prototype;
    _proto13.of = function of(ext) {
      return new CompartmentInstance(this, ext);
    };
    _proto13.reconfigure = function reconfigure(content2) {
      return _Compartment.reconfigure.of({
        compartment: this,
        extension: content2
      });
    };
    _proto13.get = function get(state) {
      return state.config.compartments.get(this);
    };
    return _Compartment;
  }();
  var CompartmentInstance = function () {
    function CompartmentInstance(compartment, inner) {
      this.compartment = compartment;
      this.inner = inner;
    }
    return _createClass(CompartmentInstance, [{
      key: "extension",
      get: function get() {
        return this;
      }
    }]);
  }();
  var Configuration = function () {
    function _Configuration(base2, compartments, dynamicSlots, address, staticValues, facets) {
      this.base = base2;
      this.compartments = compartments;
      this.dynamicSlots = dynamicSlots;
      this.address = address;
      this.staticValues = staticValues;
      this.facets = facets;
      this.statusTemplate = [];
      while (this.statusTemplate.length < dynamicSlots.length) this.statusTemplate.push(0);
    }
    var _proto14 = _Configuration.prototype;
    _proto14.staticFacet = function staticFacet(facet) {
      var addr = this.address[facet.id];
      return addr == null ? facet.default : this.staticValues[addr >> 1];
    };
    _Configuration.resolve = function resolve(base2, compartments, oldState) {
      var fields = [];
      var facets = Object.create(null);
      var newCompartments = new Map();
      for (var _iterator14 = _createForOfIteratorHelperLoose(flatten(base2, compartments, newCompartments)), _step14; !(_step14 = _iterator14()).done;) {
        var ext = _step14.value;
        if (ext instanceof StateField) fields.push(ext);else (facets[ext.facet.id] || (facets[ext.facet.id] = [])).push(ext);
      }
      var address = Object.create(null);
      var staticValues = [];
      var dynamicSlots = [];
      var _loop = function _loop() {
        var field = _fields[_i];
        address[field.id] = dynamicSlots.length << 1;
        dynamicSlots.push(function (a) {
          return field.slot(a);
        });
      };
      for (var _i = 0, _fields = fields; _i < _fields.length; _i++) {
        _loop();
      }
      var oldFacets = oldState === null || oldState === void 0 ? void 0 : oldState.config.facets;
      var _loop2 = function _loop2() {
        var providers = facets[id],
          facet = providers[0].facet;
        var oldProviders = oldFacets && oldFacets[id] || [];
        if (providers.every(function (p) {
          return p.type == 0;
        })) {
          address[facet.id] = staticValues.length << 1 | 1;
          if (sameArray(oldProviders, providers)) {
            staticValues.push(oldState.facet(facet));
          } else {
            var value = facet.combine(providers.map(function (p) {
              return p.value;
            }));
            staticValues.push(oldState && facet.compare(value, oldState.facet(facet)) ? oldState.facet(facet) : value);
          }
        } else {
          var _loop3 = function _loop3() {
            var p = _step15.value;
            if (p.type == 0) {
              address[p.id] = staticValues.length << 1 | 1;
              staticValues.push(p.value);
            } else {
              address[p.id] = dynamicSlots.length << 1;
              dynamicSlots.push(function (a) {
                return p.dynamicSlot(a);
              });
            }
          };
          for (var _iterator15 = _createForOfIteratorHelperLoose(providers), _step15; !(_step15 = _iterator15()).done;) {
            _loop3();
          }
          address[facet.id] = dynamicSlots.length << 1;
          dynamicSlots.push(function (a) {
            return dynamicFacetSlot(a, facet, providers);
          });
        }
      };
      for (var id in facets) {
        _loop2();
      }
      var dynamic = dynamicSlots.map(function (f) {
        return f(address);
      });
      return new _Configuration(base2, newCompartments, dynamic, address, staticValues, facets);
    };
    return _Configuration;
  }();
  function flatten(extension, compartments, newCompartments) {
    var result = [[], [], [], [], []];
    var seen = new Map();
    function inner(ext, prec2) {
      var known = seen.get(ext);
      if (known != null) {
        if (known <= prec2) return;
        var found = result[known].indexOf(ext);
        if (found > -1) result[known].splice(found, 1);
        if (ext instanceof CompartmentInstance) newCompartments.delete(ext.compartment);
      }
      seen.set(ext, prec2);
      if (Array.isArray(ext)) {
        for (var _iterator16 = _createForOfIteratorHelperLoose(ext), _step16; !(_step16 = _iterator16()).done;) {
          var e = _step16.value;
          inner(e, prec2);
        }
      } else if (ext instanceof CompartmentInstance) {
        if (newCompartments.has(ext.compartment)) throw new RangeError("Duplicate use of compartment in extensions");
        var content2 = compartments.get(ext.compartment) || ext.inner;
        newCompartments.set(ext.compartment, content2);
        inner(content2, prec2);
      } else if (ext instanceof PrecExtension) {
        inner(ext.inner, ext.prec);
      } else if (ext instanceof StateField) {
        result[prec2].push(ext);
        if (ext.provides) inner(ext.provides, prec2);
      } else if (ext instanceof FacetProvider) {
        result[prec2].push(ext);
        if (ext.facet.extensions) inner(ext.facet.extensions, Prec_.default);
      } else {
        var _content2 = ext.extension;
        if (!_content2) throw new Error("Unrecognized extension value in extension set (" + ext + ").");
        if (_content2 == ext) throw new Error("Unrecognized extension value in extension set (" + ext + "). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.");
        inner(_content2, prec2);
      }
    }
    inner(extension, Prec_.default);
    return result.reduce(function (a, b) {
      return a.concat(b);
    });
  }
  function ensureAddr(state, addr) {
    if (addr & 1) return 2;
    var idx = addr >> 1;
    var status2 = state.status[idx];
    if (status2 == 4) throw new Error("Cyclic dependency between fields and/or facets");
    if (status2 & 2) return status2;
    state.status[idx] = 4;
    var changed = state.computeSlot(state, state.config.dynamicSlots[idx]);
    return state.status[idx] = 2 | changed;
  }
  function getAddr(state, addr) {
    return addr & 1 ? state.config.staticValues[addr >> 1] : state.values[addr >> 1];
  }
  var languageData = Facet.define();
  var allowMultipleSelections = Facet.define({
    combine: function combine(values) {
      return values.some(function (v) {
        return v;
      });
    },
    static: true
  });
  var lineSeparator = Facet.define({
    combine: function combine(values) {
      return values.length ? values[0] : void 0;
    },
    static: true
  });
  var changeFilter = Facet.define();
  var transactionFilter = Facet.define();
  var transactionExtender = Facet.define();
  var readOnly = Facet.define({
    combine: function combine(values) {
      return values.length ? values[0] : false;
    }
  });
  var Annotation = function () {
    function Annotation(type, value) {
      this.type = type;
      this.value = value;
    }
    Annotation.define = function define() {
      return new AnnotationType();
    };
    return Annotation;
  }();
  var AnnotationType = function () {
    function AnnotationType() {}
    var _proto15 = AnnotationType.prototype;
    _proto15.of = function of(value) {
      return new Annotation(this, value);
    };
    return AnnotationType;
  }();
  var StateEffectType = function () {
    function StateEffectType(map) {
      this.map = map;
    }
    var _proto16 = StateEffectType.prototype;
    _proto16.of = function of(value) {
      return new StateEffect(this, value);
    };
    return StateEffectType;
  }();
  var StateEffect = function () {
    function _StateEffect(type, value) {
      this.type = type;
      this.value = value;
    }
    var _proto17 = _StateEffect.prototype;
    _proto17.map = function map(mapping) {
      var mapped = this.type.map(this.value, mapping);
      return mapped === void 0 ? void 0 : mapped == this.value ? this : new _StateEffect(this.type, mapped);
    };
    _proto17.is = function is(type) {
      return this.type == type;
    };
    _StateEffect.define = function define(spec) {
      if (spec === void 0) {
        spec = {};
      }
      return new StateEffectType(spec.map || function (v) {
        return v;
      });
    };
    _StateEffect.mapEffects = function mapEffects(effects, mapping) {
      if (!effects.length) return effects;
      var result = [];
      for (var _iterator17 = _createForOfIteratorHelperLoose(effects), _step17; !(_step17 = _iterator17()).done;) {
        var effect = _step17.value;
        var mapped = effect.map(mapping);
        if (mapped) result.push(mapped);
      }
      return result;
    };
    return _StateEffect;
  }();
  StateEffect.reconfigure = StateEffect.define();
  StateEffect.appendConfig = StateEffect.define();
  var Transaction = function () {
    function _Transaction(startState, changes, selection, effects, annotations, scrollIntoView2) {
      this.startState = startState;
      this.changes = changes;
      this.selection = selection;
      this.effects = effects;
      this.annotations = annotations;
      this.scrollIntoView = scrollIntoView2;
      this._doc = null;
      this._state = null;
      if (selection) checkSelection(selection, changes.newLength);
      if (!annotations.some(function (a) {
        return a.type == _Transaction.time;
      })) this.annotations = annotations.concat(_Transaction.time.of(Date.now()));
    }
    _Transaction.create = function create(startState, changes, selection, effects, annotations, scrollIntoView2) {
      return new _Transaction(startState, changes, selection, effects, annotations, scrollIntoView2);
    };
    var _proto18 = _Transaction.prototype;
    _proto18.annotation = function annotation(type) {
      for (var _iterator18 = _createForOfIteratorHelperLoose(this.annotations), _step18; !(_step18 = _iterator18()).done;) {
        var ann = _step18.value;
        if (ann.type == type) return ann.value;
      }
      return void 0;
    };
    _proto18.isUserEvent = function isUserEvent(event) {
      var e = this.annotation(_Transaction.userEvent);
      return !!(e && (e == event || e.length > event.length && e.slice(0, event.length) == event && e[event.length] == "."));
    };
    return _createClass(_Transaction, [{
      key: "newDoc",
      get: function get() {
        return this._doc || (this._doc = this.changes.apply(this.startState.doc));
      }
    }, {
      key: "newSelection",
      get: function get() {
        return this.selection || this.startState.selection.map(this.changes);
      }
    }, {
      key: "state",
      get: function get() {
        if (!this._state) this.startState.applyTransaction(this);
        return this._state;
      }
    }, {
      key: "docChanged",
      get: function get() {
        return !this.changes.empty;
      }
    }, {
      key: "reconfigured",
      get: function get() {
        return this.startState.config != this.state.config;
      }
    }]);
  }();
  Transaction.time = Annotation.define();
  Transaction.userEvent = Annotation.define();
  Transaction.addToHistory = Annotation.define();
  Transaction.remote = Annotation.define();
  function joinRanges(a, b) {
    var result = [];
    for (var iA = 0, iB = 0;;) {
      var from = void 0,
        to = void 0;
      if (iA < a.length && (iB == b.length || b[iB] >= a[iA])) {
        from = a[iA++];
        to = a[iA++];
      } else if (iB < b.length) {
        from = b[iB++];
        to = b[iB++];
      } else return result;
      if (!result.length || result[result.length - 1] < from) result.push(from, to);else if (result[result.length - 1] < to) result[result.length - 1] = to;
    }
  }
  function mergeTransaction(a, b, sequential) {
    var _a2;
    var mapForA, mapForB, changes;
    if (sequential) {
      mapForA = b.changes;
      mapForB = ChangeSet.empty(b.changes.length);
      changes = a.changes.compose(b.changes);
    } else {
      mapForA = b.changes.map(a.changes);
      mapForB = a.changes.mapDesc(b.changes, true);
      changes = a.changes.compose(mapForA);
    }
    return {
      changes: changes,
      selection: b.selection ? b.selection.map(mapForB) : (_a2 = a.selection) === null || _a2 === void 0 ? void 0 : _a2.map(mapForA),
      effects: StateEffect.mapEffects(a.effects, mapForA).concat(StateEffect.mapEffects(b.effects, mapForB)),
      annotations: a.annotations.length ? a.annotations.concat(b.annotations) : b.annotations,
      scrollIntoView: a.scrollIntoView || b.scrollIntoView
    };
  }
  function resolveTransactionInner(state, spec, docSize) {
    var sel = spec.selection,
      annotations = asArray(spec.annotations);
    if (spec.userEvent) annotations = annotations.concat(Transaction.userEvent.of(spec.userEvent));
    return {
      changes: spec.changes instanceof ChangeSet ? spec.changes : ChangeSet.of(spec.changes || [], docSize, state.facet(lineSeparator)),
      selection: sel && (sel instanceof EditorSelection ? sel : EditorSelection.single(sel.anchor, sel.head)),
      effects: asArray(spec.effects),
      annotations: annotations,
      scrollIntoView: !!spec.scrollIntoView
    };
  }
  function resolveTransaction(state, specs, filter) {
    var s = resolveTransactionInner(state, specs.length ? specs[0] : {}, state.doc.length);
    if (specs.length && specs[0].filter === false) filter = false;
    for (var i2 = 1; i2 < specs.length; i2++) {
      if (specs[i2].filter === false) filter = false;
      var seq = !!specs[i2].sequential;
      s = mergeTransaction(s, resolveTransactionInner(state, specs[i2], seq ? s.changes.newLength : state.doc.length), seq);
    }
    var tr = Transaction.create(state, s.changes, s.selection, s.effects, s.annotations, s.scrollIntoView);
    return extendTransaction(filter ? filterTransaction(tr) : tr);
  }
  function filterTransaction(tr) {
    var state = tr.startState;
    var result = true;
    for (var _iterator19 = _createForOfIteratorHelperLoose(state.facet(changeFilter)), _step19; !(_step19 = _iterator19()).done;) {
      var filter = _step19.value;
      var value = filter(tr);
      if (value === false) {
        result = false;
        break;
      }
      if (Array.isArray(value)) result = result === true ? value : joinRanges(result, value);
    }
    if (result !== true) {
      var changes, back;
      if (result === false) {
        back = tr.changes.invertedDesc;
        changes = ChangeSet.empty(state.doc.length);
      } else {
        var filtered = tr.changes.filter(result);
        changes = filtered.changes;
        back = filtered.filtered.mapDesc(filtered.changes).invertedDesc;
      }
      tr = Transaction.create(state, changes, tr.selection && tr.selection.map(back), StateEffect.mapEffects(tr.effects, back), tr.annotations, tr.scrollIntoView);
    }
    var filters = state.facet(transactionFilter);
    for (var i2 = filters.length - 1; i2 >= 0; i2--) {
      var _filtered = filters[i2](tr);
      if (_filtered instanceof Transaction) tr = _filtered;else if (Array.isArray(_filtered) && _filtered.length == 1 && _filtered[0] instanceof Transaction) tr = _filtered[0];else tr = resolveTransaction(state, asArray(_filtered), false);
    }
    return tr;
  }
  function extendTransaction(tr) {
    var state = tr.startState,
      extenders = state.facet(transactionExtender),
      spec = tr;
    for (var i2 = extenders.length - 1; i2 >= 0; i2--) {
      var extension = extenders[i2](tr);
      if (extension && Object.keys(extension).length) spec = mergeTransaction(spec, resolveTransactionInner(state, extension, tr.changes.newLength), true);
    }
    return spec == tr ? tr : Transaction.create(state, tr.changes, tr.selection, spec.effects, spec.annotations, spec.scrollIntoView);
  }
  var none = [];
  function asArray(value) {
    return value == null ? none : Array.isArray(value) ? value : [value];
  }
  var CharCategory = function (CharCategory2) {
    CharCategory2[CharCategory2["Word"] = 0] = "Word";
    CharCategory2[CharCategory2["Space"] = 1] = "Space";
    CharCategory2[CharCategory2["Other"] = 2] = "Other";
    return CharCategory2;
  }(CharCategory || (CharCategory = {}));
  var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
  var wordChar;
  try {
    wordChar = new RegExp("[\\p{Alphabetic}\\p{Number}_]", "u");
  } catch (_2) {}
  function hasWordChar(str) {
    if (wordChar) return wordChar.test(str);
    for (var i2 = 0; i2 < str.length; i2++) {
      var ch = str[i2];
      if (/\w/.test(ch) || ch > "\x80" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))) return true;
    }
    return false;
  }
  function makeCategorizer(wordChars) {
    return function (char) {
      if (!/\S/.test(char)) return CharCategory.Space;
      if (hasWordChar(char)) return CharCategory.Word;
      for (var i2 = 0; i2 < wordChars.length; i2++) if (char.indexOf(wordChars[i2]) > -1) return CharCategory.Word;
      return CharCategory.Other;
    };
  }
  var EditorState = function () {
    function _EditorState(config, doc2, selection, values, computeSlot, tr) {
      this.config = config;
      this.doc = doc2;
      this.selection = selection;
      this.values = values;
      this.status = config.statusTemplate.slice();
      this.computeSlot = computeSlot;
      if (tr) tr._state = this;
      for (var i2 = 0; i2 < this.config.dynamicSlots.length; i2++) ensureAddr(this, i2 << 1);
      this.computeSlot = null;
    }
    var _proto19 = _EditorState.prototype;
    _proto19.field = function field(_field, require2) {
      if (require2 === void 0) {
        require2 = true;
      }
      var addr = this.config.address[_field.id];
      if (addr == null) {
        if (require2) throw new RangeError("Field is not present in this state");
        return void 0;
      }
      ensureAddr(this, addr);
      return getAddr(this, addr);
    };
    _proto19.update = function update() {
      for (var _len4 = arguments.length, specs = new Array(_len4), _key = 0; _key < _len4; _key++) {
        specs[_key] = arguments[_key];
      }
      return resolveTransaction(this, specs, true);
    };
    _proto19.applyTransaction = function applyTransaction(tr) {
      var _this7 = this;
      var conf = this.config,
        _conf = conf,
        base2 = _conf.base,
        compartments = _conf.compartments;
      for (var _iterator20 = _createForOfIteratorHelperLoose(tr.effects), _step20; !(_step20 = _iterator20()).done;) {
        var effect = _step20.value;
        if (effect.is(Compartment.reconfigure)) {
          if (conf) {
            compartments = new Map();
            conf.compartments.forEach(function (val, key) {
              return compartments.set(key, val);
            });
            conf = null;
          }
          compartments.set(effect.value.compartment, effect.value.extension);
        } else if (effect.is(StateEffect.reconfigure)) {
          conf = null;
          base2 = effect.value;
        } else if (effect.is(StateEffect.appendConfig)) {
          conf = null;
          base2 = asArray(base2).concat(effect.value);
        }
      }
      var startValues;
      if (!conf) {
        conf = Configuration.resolve(base2, compartments, this);
        var intermediateState = new _EditorState(conf, this.doc, this.selection, conf.dynamicSlots.map(function () {
          return null;
        }), function (state, slot) {
          return slot.reconfigure(state, _this7);
        }, null);
        startValues = intermediateState.values;
      } else {
        startValues = tr.startState.values.slice();
      }
      var selection = tr.startState.facet(allowMultipleSelections) ? tr.newSelection : tr.newSelection.asSingle();
      new _EditorState(conf, tr.newDoc, selection, startValues, function (state, slot) {
        return slot.update(state, tr);
      }, tr);
    };
    _proto19.replaceSelection = function replaceSelection(text) {
      if (typeof text == "string") text = this.toText(text);
      return this.changeByRange(function (range) {
        return {
          changes: {
            from: range.from,
            to: range.to,
            insert: text
          },
          range: EditorSelection.cursor(range.from + text.length)
        };
      });
    };
    _proto19.changeByRange = function changeByRange(f) {
      var sel = this.selection;
      var result1 = f(sel.ranges[0]);
      var changes = this.changes(result1.changes),
        ranges = [result1.range];
      var effects = asArray(result1.effects);
      for (var i2 = 1; i2 < sel.ranges.length; i2++) {
        var result = f(sel.ranges[i2]);
        var newChanges = this.changes(result.changes),
          newMapped = newChanges.map(changes);
        for (var j = 0; j < i2; j++) ranges[j] = ranges[j].map(newMapped);
        var mapBy = changes.mapDesc(newChanges, true);
        ranges.push(result.range.map(mapBy));
        changes = changes.compose(newMapped);
        effects = StateEffect.mapEffects(effects, newMapped).concat(StateEffect.mapEffects(asArray(result.effects), mapBy));
      }
      return {
        changes: changes,
        selection: EditorSelection.create(ranges, sel.mainIndex),
        effects: effects
      };
    };
    _proto19.changes = function changes(spec) {
      if (spec === void 0) {
        spec = [];
      }
      if (spec instanceof ChangeSet) return spec;
      return ChangeSet.of(spec, this.doc.length, this.facet(_EditorState.lineSeparator));
    };
    _proto19.toText = function toText(string2) {
      return Text.of(string2.split(this.facet(_EditorState.lineSeparator) || DefaultSplit));
    };
    _proto19.sliceDoc = function sliceDoc(from, to) {
      if (from === void 0) {
        from = 0;
      }
      if (to === void 0) {
        to = this.doc.length;
      }
      return this.doc.sliceString(from, to, this.lineBreak);
    };
    _proto19.facet = function facet(_facet) {
      var addr = this.config.address[_facet.id];
      if (addr == null) return _facet.default;
      ensureAddr(this, addr);
      return getAddr(this, addr);
    };
    _proto19.toJSON = function toJSON(fields) {
      var result = {
        doc: this.sliceDoc(),
        selection: this.selection.toJSON()
      };
      if (fields) for (var prop in fields) {
        var value = fields[prop];
        if (value instanceof StateField && this.config.address[value.id] != null) result[prop] = value.spec.toJSON(this.field(fields[prop]), this);
      }
      return result;
    };
    _EditorState.fromJSON = function fromJSON(json, config, fields) {
      if (config === void 0) {
        config = {};
      }
      if (!json || typeof json.doc != "string") throw new RangeError("Invalid JSON representation for EditorState");
      var fieldInit = [];
      if (fields) {
        var _loop4 = function _loop4() {
          if (Object.prototype.hasOwnProperty.call(json, prop)) {
            var field = fields[prop],
              value = json[prop];
            fieldInit.push(field.init(function (state) {
              return field.spec.fromJSON(value, state);
            }));
          }
        };
        for (var prop in fields) {
          _loop4();
        }
      }
      return _EditorState.create({
        doc: json.doc,
        selection: EditorSelection.fromJSON(json.selection),
        extensions: config.extensions ? fieldInit.concat([config.extensions]) : fieldInit
      });
    };
    _EditorState.create = function create(config) {
      if (config === void 0) {
        config = {};
      }
      var configuration = Configuration.resolve(config.extensions || [], new Map());
      var doc2 = config.doc instanceof Text ? config.doc : Text.of((config.doc || "").split(configuration.staticFacet(_EditorState.lineSeparator) || DefaultSplit));
      var selection = !config.selection ? EditorSelection.single(0) : config.selection instanceof EditorSelection ? config.selection : EditorSelection.single(config.selection.anchor, config.selection.head);
      checkSelection(selection, doc2.length);
      if (!configuration.staticFacet(allowMultipleSelections)) selection = selection.asSingle();
      return new _EditorState(configuration, doc2, selection, configuration.dynamicSlots.map(function () {
        return null;
      }), function (state, slot) {
        return slot.create(state);
      }, null);
    };
    _proto19.phrase = function phrase(_phrase) {
      for (var _len5 = arguments.length, insert2 = new Array(_len5 > 1 ? _len5 - 1 : 0), _key2 = 1; _key2 < _len5; _key2++) {
        insert2[_key2 - 1] = arguments[_key2];
      }
      for (var _iterator21 = _createForOfIteratorHelperLoose(this.facet(_EditorState.phrases)), _step21; !(_step21 = _iterator21()).done;) {
        var map = _step21.value;
        if (Object.prototype.hasOwnProperty.call(map, _phrase)) {
          _phrase = map[_phrase];
          break;
        }
      }
      if (insert2.length) _phrase = _phrase.replace(new RegExp("\\$(\\$|\\d*)", "g"), function (m, i2) {
        if (i2 == "$") return "$";
        var n = +(i2 || 1);
        return !n || n > insert2.length ? m : insert2[n - 1];
      });
      return _phrase;
    };
    _proto19.languageDataAt = function languageDataAt(name2, pos, side) {
      if (side === void 0) {
        side = -1;
      }
      var values = [];
      for (var _iterator22 = _createForOfIteratorHelperLoose(this.facet(languageData)), _step22; !(_step22 = _iterator22()).done;) {
        var provider = _step22.value;
        for (var _iterator23 = _createForOfIteratorHelperLoose(provider(this, pos, side)), _step23; !(_step23 = _iterator23()).done;) {
          var result = _step23.value;
          if (Object.prototype.hasOwnProperty.call(result, name2)) values.push(result[name2]);
        }
      }
      return values;
    };
    _proto19.charCategorizer = function charCategorizer(at) {
      var chars = this.languageDataAt("wordChars", at);
      return makeCategorizer(chars.length ? chars[0] : "");
    };
    _proto19.wordAt = function wordAt(pos) {
      var _this$doc$lineAt = this.doc.lineAt(pos),
        text = _this$doc$lineAt.text,
        from = _this$doc$lineAt.from,
        length = _this$doc$lineAt.length;
      var cat = this.charCategorizer(pos);
      var start = pos - from,
        end = pos - from;
      while (start > 0) {
        var prev = findClusterBreak2(text, start, false);
        if (cat(text.slice(prev, start)) != CharCategory.Word) break;
        start = prev;
      }
      while (end < length) {
        var next = findClusterBreak2(text, end);
        if (cat(text.slice(end, next)) != CharCategory.Word) break;
        end = next;
      }
      return start == end ? null : EditorSelection.range(start + from, end + from);
    };
    return _createClass(_EditorState, [{
      key: "tabSize",
      get: function get() {
        return this.facet(_EditorState.tabSize);
      }
    }, {
      key: "lineBreak",
      get: function get() {
        return this.facet(_EditorState.lineSeparator) || "\n";
      }
    }, {
      key: "readOnly",
      get: function get() {
        return this.facet(readOnly);
      }
    }]);
  }();
  EditorState.allowMultipleSelections = allowMultipleSelections;
  EditorState.tabSize = Facet.define({
    combine: function combine(values) {
      return values.length ? values[0] : 4;
    }
  });
  EditorState.lineSeparator = lineSeparator;
  EditorState.readOnly = readOnly;
  EditorState.phrases = Facet.define({
    compare: function compare(a, b) {
      var kA = Object.keys(a),
        kB = Object.keys(b);
      return kA.length == kB.length && kA.every(function (k) {
        return a[k] == b[k];
      });
    }
  });
  EditorState.languageData = languageData;
  EditorState.changeFilter = changeFilter;
  EditorState.transactionFilter = transactionFilter;
  EditorState.transactionExtender = transactionExtender;
  Compartment.reconfigure = StateEffect.define();
  function combineConfig(configs, defaults, combine) {
    if (combine === void 0) {
      combine = {};
    }
    var result = {};
    for (var _iterator24 = _createForOfIteratorHelperLoose(configs), _step24; !(_step24 = _iterator24()).done;) {
      var config = _step24.value;
      for (var _i2 = 0, _Object$keys = Object.keys(config); _i2 < _Object$keys.length; _i2++) {
        var _key3 = _Object$keys[_i2];
        var value = config[_key3],
          current = result[_key3];
        if (current === void 0) result[_key3] = value;else if (current === value || value === void 0) ;else if (Object.hasOwnProperty.call(combine, _key3)) result[_key3] = combine[_key3](current, value);else throw new Error("Config merge conflict for field " + _key3);
      }
    }
    for (var key in defaults) if (result[key] === void 0) result[key] = defaults[key];
    return result;
  }
  var RangeValue = function () {
    function RangeValue() {}
    var _proto20 = RangeValue.prototype;
    _proto20.eq = function eq(other) {
      return this == other;
    };
    _proto20.range = function range(from, to) {
      if (to === void 0) {
        to = from;
      }
      return Range.create(from, to, this);
    };
    return RangeValue;
  }();
  RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
  RangeValue.prototype.point = false;
  RangeValue.prototype.mapMode = MapMode.TrackDel;
  function cmpVal(a, b) {
    return a == b || a.constructor == b.constructor && a.eq(b);
  }
  var Range = function () {
    function _Range(from, to, value) {
      this.from = from;
      this.to = to;
      this.value = value;
    }
    _Range.create = function create(from, to, value) {
      return new _Range(from, to, value);
    };
    return _Range;
  }();
  function cmpRange(a, b) {
    return a.from - b.from || a.value.startSide - b.value.startSide;
  }
  var Chunk = function () {
    function _Chunk(from, to, value, maxPoint) {
      this.from = from;
      this.to = to;
      this.value = value;
      this.maxPoint = maxPoint;
    }
    var _proto21 = _Chunk.prototype;
    _proto21.findIndex = function findIndex(pos, side, end, startAt) {
      if (startAt === void 0) {
        startAt = 0;
      }
      var arr = end ? this.to : this.from;
      for (var lo = startAt, hi = arr.length;;) {
        if (lo == hi) return lo;
        var mid = lo + hi >> 1;
        var diff = arr[mid] - pos || (end ? this.value[mid].endSide : this.value[mid].startSide) - side;
        if (mid == lo) return diff >= 0 ? lo : hi;
        if (diff >= 0) hi = mid;else lo = mid + 1;
      }
    };
    _proto21.between = function between(offset, from, to, f) {
      for (var i2 = this.findIndex(from, -1e9, true), e = this.findIndex(to, 1e9, false, i2); i2 < e; i2++) if (f(this.from[i2] + offset, this.to[i2] + offset, this.value[i2]) === false) return false;
    };
    _proto21.map = function map(offset, changes) {
      var value = [],
        from = [],
        to = [],
        newPos = -1,
        maxPoint = -1;
      for (var i2 = 0; i2 < this.value.length; i2++) {
        var val = this.value[i2],
          curFrom = this.from[i2] + offset,
          curTo = this.to[i2] + offset,
          newFrom = void 0,
          newTo = void 0;
        if (curFrom == curTo) {
          var mapped = changes.mapPos(curFrom, val.startSide, val.mapMode);
          if (mapped == null) continue;
          newFrom = newTo = mapped;
          if (val.startSide != val.endSide) {
            newTo = changes.mapPos(curFrom, val.endSide);
            if (newTo < newFrom) continue;
          }
        } else {
          newFrom = changes.mapPos(curFrom, val.startSide);
          newTo = changes.mapPos(curTo, val.endSide);
          if (newFrom > newTo || newFrom == newTo && val.startSide > 0 && val.endSide <= 0) continue;
        }
        if ((newTo - newFrom || val.endSide - val.startSide) < 0) continue;
        if (newPos < 0) newPos = newFrom;
        if (val.point) maxPoint = Math.max(maxPoint, newTo - newFrom);
        value.push(val);
        from.push(newFrom - newPos);
        to.push(newTo - newPos);
      }
      return {
        mapped: value.length ? new _Chunk(from, to, value, maxPoint) : null,
        pos: newPos
      };
    };
    return _createClass(_Chunk, [{
      key: "length",
      get: function get() {
        return this.to[this.to.length - 1];
      }
    }]);
  }();
  var RangeSet = function () {
    function _RangeSet(chunkPos, chunk, nextLayer, maxPoint) {
      this.chunkPos = chunkPos;
      this.chunk = chunk;
      this.nextLayer = nextLayer;
      this.maxPoint = maxPoint;
    }
    _RangeSet.create = function create(chunkPos, chunk, nextLayer, maxPoint) {
      return new _RangeSet(chunkPos, chunk, nextLayer, maxPoint);
    };
    var _proto22 = _RangeSet.prototype;
    _proto22.chunkEnd = function chunkEnd(index) {
      return this.chunkPos[index] + this.chunk[index].length;
    };
    _proto22.update = function update(updateSpec) {
      var _updateSpec$add = updateSpec.add,
        add2 = _updateSpec$add === void 0 ? [] : _updateSpec$add,
        _updateSpec$sort = updateSpec.sort,
        sort = _updateSpec$sort === void 0 ? false : _updateSpec$sort,
        _updateSpec$filterFro = updateSpec.filterFrom,
        filterFrom = _updateSpec$filterFro === void 0 ? 0 : _updateSpec$filterFro,
        _updateSpec$filterTo = updateSpec.filterTo,
        filterTo = _updateSpec$filterTo === void 0 ? this.length : _updateSpec$filterTo;
      var filter = updateSpec.filter;
      if (add2.length == 0 && !filter) return this;
      if (sort) add2 = add2.slice().sort(cmpRange);
      if (this.isEmpty) return add2.length ? _RangeSet.of(add2) : this;
      var cur = new LayerCursor(this, null, -1).goto(0),
        i2 = 0,
        spill = [];
      var builder = new RangeSetBuilder();
      while (cur.value || i2 < add2.length) {
        if (i2 < add2.length && (cur.from - add2[i2].from || cur.startSide - add2[i2].value.startSide) >= 0) {
          var range = add2[i2++];
          if (!builder.addInner(range.from, range.to, range.value)) spill.push(range);
        } else if (cur.rangeIndex == 1 && cur.chunkIndex < this.chunk.length && (i2 == add2.length || this.chunkEnd(cur.chunkIndex) < add2[i2].from) && (!filter || filterFrom > this.chunkEnd(cur.chunkIndex) || filterTo < this.chunkPos[cur.chunkIndex]) && builder.addChunk(this.chunkPos[cur.chunkIndex], this.chunk[cur.chunkIndex])) {
          cur.nextChunk();
        } else {
          if (!filter || filterFrom > cur.to || filterTo < cur.from || filter(cur.from, cur.to, cur.value)) {
            if (!builder.addInner(cur.from, cur.to, cur.value)) spill.push(Range.create(cur.from, cur.to, cur.value));
          }
          cur.next();
        }
      }
      return builder.finishInner(this.nextLayer.isEmpty && !spill.length ? _RangeSet.empty : this.nextLayer.update({
        add: spill,
        filter: filter,
        filterFrom: filterFrom,
        filterTo: filterTo
      }));
    };
    _proto22.map = function map(changes) {
      if (changes.empty || this.isEmpty) return this;
      var chunks = [],
        chunkPos = [],
        maxPoint = -1;
      for (var i2 = 0; i2 < this.chunk.length; i2++) {
        var start = this.chunkPos[i2],
          chunk = this.chunk[i2];
        var touch = changes.touchesRange(start, start + chunk.length);
        if (touch === false) {
          maxPoint = Math.max(maxPoint, chunk.maxPoint);
          chunks.push(chunk);
          chunkPos.push(changes.mapPos(start));
        } else if (touch === true) {
          var _chunk$map = chunk.map(start, changes),
            mapped = _chunk$map.mapped,
            pos = _chunk$map.pos;
          if (mapped) {
            maxPoint = Math.max(maxPoint, mapped.maxPoint);
            chunks.push(mapped);
            chunkPos.push(pos);
          }
        }
      }
      var next = this.nextLayer.map(changes);
      return chunks.length == 0 ? next : new _RangeSet(chunkPos, chunks, next || _RangeSet.empty, maxPoint);
    };
    _proto22.between = function between(from, to, f) {
      if (this.isEmpty) return;
      for (var i2 = 0; i2 < this.chunk.length; i2++) {
        var start = this.chunkPos[i2],
          chunk = this.chunk[i2];
        if (to >= start && from <= start + chunk.length && chunk.between(start, from - start, to - start, f) === false) return;
      }
      this.nextLayer.between(from, to, f);
    };
    _proto22.iter = function iter(from) {
      if (from === void 0) {
        from = 0;
      }
      return HeapCursor.from([this]).goto(from);
    };
    _RangeSet.iter = function iter(sets, from) {
      if (from === void 0) {
        from = 0;
      }
      return HeapCursor.from(sets).goto(from);
    };
    _RangeSet.compare = function compare(oldSets, newSets, textDiff, comparator, minPointSize) {
      if (minPointSize === void 0) {
        minPointSize = -1;
      }
      var a = oldSets.filter(function (set) {
        return set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize;
      });
      var b = newSets.filter(function (set) {
        return set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize;
      });
      var sharedChunks = findSharedChunks(a, b, textDiff);
      var sideA = new SpanCursor(a, sharedChunks, minPointSize);
      var sideB = new SpanCursor(b, sharedChunks, minPointSize);
      textDiff.iterGaps(function (fromA, fromB, length) {
        return _compare(sideA, fromA, sideB, fromB, length, comparator);
      });
      if (textDiff.empty && textDiff.length == 0) _compare(sideA, 0, sideB, 0, 0, comparator);
    };
    _RangeSet.eq = function eq(oldSets, newSets, from, to) {
      if (from === void 0) {
        from = 0;
      }
      if (to == null) to = 1e9 - 1;
      var a = oldSets.filter(function (set) {
        return !set.isEmpty && newSets.indexOf(set) < 0;
      });
      var b = newSets.filter(function (set) {
        return !set.isEmpty && oldSets.indexOf(set) < 0;
      });
      if (a.length != b.length) return false;
      if (!a.length) return true;
      var sharedChunks = findSharedChunks(a, b);
      var sideA = new SpanCursor(a, sharedChunks, 0).goto(from),
        sideB = new SpanCursor(b, sharedChunks, 0).goto(from);
      for (;;) {
        if (sideA.to != sideB.to || !sameValues(sideA.active, sideB.active) || sideA.point && (!sideB.point || !cmpVal(sideA.point, sideB.point))) return false;
        if (sideA.to > to) return true;
        sideA.next();
        sideB.next();
      }
    };
    _RangeSet.spans = function spans(sets, from, to, iterator, minPointSize) {
      if (minPointSize === void 0) {
        minPointSize = -1;
      }
      var cursor = new SpanCursor(sets, null, minPointSize).goto(from),
        pos = from;
      var openRanges = cursor.openStart;
      for (;;) {
        var curTo = Math.min(cursor.to, to);
        if (cursor.point) {
          var active2 = cursor.activeForPoint(cursor.to);
          var openCount = cursor.pointFrom < from ? active2.length + 1 : cursor.point.startSide < 0 ? active2.length : Math.min(active2.length, openRanges);
          iterator.point(pos, curTo, cursor.point, active2, openCount, cursor.pointRank);
          openRanges = Math.min(cursor.openEnd(curTo), active2.length);
        } else if (curTo > pos) {
          iterator.span(pos, curTo, cursor.active, openRanges);
          openRanges = cursor.openEnd(curTo);
        }
        if (cursor.to > to) return openRanges + (cursor.point && cursor.to > to ? 1 : 0);
        pos = cursor.to;
        cursor.next();
      }
    };
    _RangeSet.of = function of(ranges, sort) {
      if (sort === void 0) {
        sort = false;
      }
      var build = new RangeSetBuilder();
      for (var _iterator25 = _createForOfIteratorHelperLoose(ranges instanceof Range ? [ranges] : sort ? lazySort(ranges) : ranges), _step25; !(_step25 = _iterator25()).done;) {
        var range = _step25.value;
        build.add(range.from, range.to, range.value);
      }
      return build.finish();
    };
    _RangeSet.join = function join(sets) {
      if (!sets.length) return _RangeSet.empty;
      var result = sets[sets.length - 1];
      for (var i2 = sets.length - 2; i2 >= 0; i2--) {
        for (var layer = sets[i2]; layer != _RangeSet.empty; layer = layer.nextLayer) result = new _RangeSet(layer.chunkPos, layer.chunk, result, Math.max(layer.maxPoint, result.maxPoint));
      }
      return result;
    };
    return _createClass(_RangeSet, [{
      key: "length",
      get: function get() {
        var last = this.chunk.length - 1;
        return last < 0 ? 0 : Math.max(this.chunkEnd(last), this.nextLayer.length);
      }
    }, {
      key: "size",
      get: function get() {
        if (this.isEmpty) return 0;
        var size = this.nextLayer.size;
        for (var _iterator26 = _createForOfIteratorHelperLoose(this.chunk), _step26; !(_step26 = _iterator26()).done;) {
          var chunk = _step26.value;
          size += chunk.value.length;
        }
        return size;
      }
    }, {
      key: "isEmpty",
      get: function get() {
        return this.nextLayer == this;
      }
    }]);
  }();
  RangeSet.empty = new RangeSet([], [], null, -1);
  function lazySort(ranges) {
    if (ranges.length > 1) for (var prev = ranges[0], i2 = 1; i2 < ranges.length; i2++) {
      var cur = ranges[i2];
      if (cmpRange(prev, cur) > 0) return ranges.slice().sort(cmpRange);
      prev = cur;
    }
    return ranges;
  }
  RangeSet.empty.nextLayer = RangeSet.empty;
  var RangeSetBuilder = function () {
    function _RangeSetBuilder() {
      this.chunks = [];
      this.chunkPos = [];
      this.chunkStart = -1;
      this.last = null;
      this.lastFrom = -1e9;
      this.lastTo = -1e9;
      this.from = [];
      this.to = [];
      this.value = [];
      this.maxPoint = -1;
      this.setMaxPoint = -1;
      this.nextLayer = null;
    }
    var _proto23 = _RangeSetBuilder.prototype;
    _proto23.finishChunk = function finishChunk(newArrays) {
      this.chunks.push(new Chunk(this.from, this.to, this.value, this.maxPoint));
      this.chunkPos.push(this.chunkStart);
      this.chunkStart = -1;
      this.setMaxPoint = Math.max(this.setMaxPoint, this.maxPoint);
      this.maxPoint = -1;
      if (newArrays) {
        this.from = [];
        this.to = [];
        this.value = [];
      }
    };
    _proto23.add = function add(from, to, value) {
      if (!this.addInner(from, to, value)) (this.nextLayer || (this.nextLayer = new _RangeSetBuilder())).add(from, to, value);
    };
    _proto23.addInner = function addInner(from, to, value) {
      var diff = from - this.lastTo || value.startSide - this.last.endSide;
      if (diff <= 0 && (from - this.lastFrom || value.startSide - this.last.startSide) < 0) throw new Error("Ranges must be added sorted by `from` position and `startSide`");
      if (diff < 0) return false;
      if (this.from.length == 250) this.finishChunk(true);
      if (this.chunkStart < 0) this.chunkStart = from;
      this.from.push(from - this.chunkStart);
      this.to.push(to - this.chunkStart);
      this.last = value;
      this.lastFrom = from;
      this.lastTo = to;
      this.value.push(value);
      if (value.point) this.maxPoint = Math.max(this.maxPoint, to - from);
      return true;
    };
    _proto23.addChunk = function addChunk(from, chunk) {
      if ((from - this.lastTo || chunk.value[0].startSide - this.last.endSide) < 0) return false;
      if (this.from.length) this.finishChunk(true);
      this.setMaxPoint = Math.max(this.setMaxPoint, chunk.maxPoint);
      this.chunks.push(chunk);
      this.chunkPos.push(from);
      var last = chunk.value.length - 1;
      this.last = chunk.value[last];
      this.lastFrom = chunk.from[last] + from;
      this.lastTo = chunk.to[last] + from;
      return true;
    };
    _proto23.finish = function finish() {
      return this.finishInner(RangeSet.empty);
    };
    _proto23.finishInner = function finishInner(next) {
      if (this.from.length) this.finishChunk(false);
      if (this.chunks.length == 0) return next;
      var result = RangeSet.create(this.chunkPos, this.chunks, this.nextLayer ? this.nextLayer.finishInner(next) : next, this.setMaxPoint);
      this.from = null;
      return result;
    };
    return _RangeSetBuilder;
  }();
  function findSharedChunks(a, b, textDiff) {
    var inA = new Map();
    for (var _iterator27 = _createForOfIteratorHelperLoose(a), _step27; !(_step27 = _iterator27()).done;) {
      var set = _step27.value;
      for (var i2 = 0; i2 < set.chunk.length; i2++) if (set.chunk[i2].maxPoint <= 0) inA.set(set.chunk[i2], set.chunkPos[i2]);
    }
    var shared = new Set();
    for (var _iterator28 = _createForOfIteratorHelperLoose(b), _step28; !(_step28 = _iterator28()).done;) {
      var _set = _step28.value;
      for (var _i3 = 0; _i3 < _set.chunk.length; _i3++) {
        var known = inA.get(_set.chunk[_i3]);
        if (known != null && (textDiff ? textDiff.mapPos(known) : known) == _set.chunkPos[_i3] && !(textDiff === null || textDiff === void 0 ? void 0 : textDiff.touchesRange(known, known + _set.chunk[_i3].length))) shared.add(_set.chunk[_i3]);
      }
    }
    return shared;
  }
  var LayerCursor = function () {
    function LayerCursor(layer, skip, minPoint, rank) {
      if (rank === void 0) {
        rank = 0;
      }
      this.layer = layer;
      this.skip = skip;
      this.minPoint = minPoint;
      this.rank = rank;
    }
    var _proto24 = LayerCursor.prototype;
    _proto24.goto = function goto(pos, side) {
      if (side === void 0) {
        side = -1e9;
      }
      this.chunkIndex = this.rangeIndex = 0;
      this.gotoInner(pos, side, false);
      return this;
    };
    _proto24.gotoInner = function gotoInner(pos, side, forward) {
      while (this.chunkIndex < this.layer.chunk.length) {
        var next = this.layer.chunk[this.chunkIndex];
        if (!(this.skip && this.skip.has(next) || this.layer.chunkEnd(this.chunkIndex) < pos || next.maxPoint < this.minPoint)) break;
        this.chunkIndex++;
        forward = false;
      }
      if (this.chunkIndex < this.layer.chunk.length) {
        var rangeIndex = this.layer.chunk[this.chunkIndex].findIndex(pos - this.layer.chunkPos[this.chunkIndex], side, true);
        if (!forward || this.rangeIndex < rangeIndex) this.setRangeIndex(rangeIndex);
      }
      this.next();
    };
    _proto24.forward = function forward(pos, side) {
      if ((this.to - pos || this.endSide - side) < 0) this.gotoInner(pos, side, true);
    };
    _proto24.next = function next() {
      for (;;) {
        if (this.chunkIndex == this.layer.chunk.length) {
          this.from = this.to = 1e9;
          this.value = null;
          break;
        } else {
          var chunkPos = this.layer.chunkPos[this.chunkIndex],
            chunk = this.layer.chunk[this.chunkIndex];
          var from = chunkPos + chunk.from[this.rangeIndex];
          this.from = from;
          this.to = chunkPos + chunk.to[this.rangeIndex];
          this.value = chunk.value[this.rangeIndex];
          this.setRangeIndex(this.rangeIndex + 1);
          if (this.minPoint < 0 || this.value.point && this.to - this.from >= this.minPoint) break;
        }
      }
    };
    _proto24.setRangeIndex = function setRangeIndex(index) {
      if (index == this.layer.chunk[this.chunkIndex].value.length) {
        this.chunkIndex++;
        if (this.skip) {
          while (this.chunkIndex < this.layer.chunk.length && this.skip.has(this.layer.chunk[this.chunkIndex])) this.chunkIndex++;
        }
        this.rangeIndex = 0;
      } else {
        this.rangeIndex = index;
      }
    };
    _proto24.nextChunk = function nextChunk() {
      this.chunkIndex++;
      this.rangeIndex = 0;
      this.next();
    };
    _proto24.compare = function compare(other) {
      return this.from - other.from || this.startSide - other.startSide || this.rank - other.rank || this.to - other.to || this.endSide - other.endSide;
    };
    return _createClass(LayerCursor, [{
      key: "startSide",
      get: function get() {
        return this.value ? this.value.startSide : 0;
      }
    }, {
      key: "endSide",
      get: function get() {
        return this.value ? this.value.endSide : 0;
      }
    }]);
  }();
  var HeapCursor = function () {
    function _HeapCursor(heap) {
      this.heap = heap;
    }
    _HeapCursor.from = function from(sets, skip, minPoint) {
      if (skip === void 0) {
        skip = null;
      }
      if (minPoint === void 0) {
        minPoint = -1;
      }
      var heap = [];
      for (var i2 = 0; i2 < sets.length; i2++) {
        for (var cur = sets[i2]; !cur.isEmpty; cur = cur.nextLayer) {
          if (cur.maxPoint >= minPoint) heap.push(new LayerCursor(cur, skip, minPoint, i2));
        }
      }
      return heap.length == 1 ? heap[0] : new _HeapCursor(heap);
    };
    var _proto25 = _HeapCursor.prototype;
    _proto25.goto = function goto(pos, side) {
      if (side === void 0) {
        side = -1e9;
      }
      for (var _iterator29 = _createForOfIteratorHelperLoose(this.heap), _step29; !(_step29 = _iterator29()).done;) {
        var cur = _step29.value;
        cur.goto(pos, side);
      }
      for (var i2 = this.heap.length >> 1; i2 >= 0; i2--) heapBubble(this.heap, i2);
      this.next();
      return this;
    };
    _proto25.forward = function forward(pos, side) {
      for (var _iterator30 = _createForOfIteratorHelperLoose(this.heap), _step30; !(_step30 = _iterator30()).done;) {
        var cur = _step30.value;
        cur.forward(pos, side);
      }
      for (var i2 = this.heap.length >> 1; i2 >= 0; i2--) heapBubble(this.heap, i2);
      if ((this.to - pos || this.value.endSide - side) < 0) this.next();
    };
    _proto25.next = function next() {
      if (this.heap.length == 0) {
        this.from = this.to = 1e9;
        this.value = null;
        this.rank = -1;
      } else {
        var top2 = this.heap[0];
        this.from = top2.from;
        this.to = top2.to;
        this.value = top2.value;
        this.rank = top2.rank;
        if (top2.value) top2.next();
        heapBubble(this.heap, 0);
      }
    };
    return _createClass(_HeapCursor, [{
      key: "startSide",
      get: function get() {
        return this.value ? this.value.startSide : 0;
      }
    }]);
  }();
  function heapBubble(heap, index) {
    for (var cur = heap[index];;) {
      var childIndex = (index << 1) + 1;
      if (childIndex >= heap.length) break;
      var child = heap[childIndex];
      if (childIndex + 1 < heap.length && child.compare(heap[childIndex + 1]) >= 0) {
        child = heap[childIndex + 1];
        childIndex++;
      }
      if (cur.compare(child) < 0) break;
      heap[childIndex] = cur;
      heap[index] = child;
      index = childIndex;
    }
  }
  var SpanCursor = function () {
    function SpanCursor(sets, skip, minPoint) {
      this.minPoint = minPoint;
      this.active = [];
      this.activeTo = [];
      this.activeRank = [];
      this.minActive = -1;
      this.point = null;
      this.pointFrom = 0;
      this.pointRank = 0;
      this.to = -1e9;
      this.endSide = 0;
      this.openStart = -1;
      this.cursor = HeapCursor.from(sets, skip, minPoint);
    }
    var _proto26 = SpanCursor.prototype;
    _proto26.goto = function goto(pos, side) {
      if (side === void 0) {
        side = -1e9;
      }
      this.cursor.goto(pos, side);
      this.active.length = this.activeTo.length = this.activeRank.length = 0;
      this.minActive = -1;
      this.to = pos;
      this.endSide = side;
      this.openStart = -1;
      this.next();
      return this;
    };
    _proto26.forward = function forward(pos, side) {
      while (this.minActive > -1 && (this.activeTo[this.minActive] - pos || this.active[this.minActive].endSide - side) < 0) this.removeActive(this.minActive);
      this.cursor.forward(pos, side);
    };
    _proto26.removeActive = function removeActive(index) {
      remove(this.active, index);
      remove(this.activeTo, index);
      remove(this.activeRank, index);
      this.minActive = findMinIndex(this.active, this.activeTo);
    };
    _proto26.addActive = function addActive(trackOpen) {
      var i2 = 0,
        _this$cursor = this.cursor,
        value = _this$cursor.value,
        to = _this$cursor.to,
        rank = _this$cursor.rank;
      while (i2 < this.activeRank.length && (rank - this.activeRank[i2] || to - this.activeTo[i2]) > 0) i2++;
      insert(this.active, i2, value);
      insert(this.activeTo, i2, to);
      insert(this.activeRank, i2, rank);
      if (trackOpen) insert(trackOpen, i2, this.cursor.from);
      this.minActive = findMinIndex(this.active, this.activeTo);
    };
    _proto26.next = function next() {
      var from = this.to,
        wasPoint = this.point;
      this.point = null;
      var trackOpen = this.openStart < 0 ? [] : null;
      for (;;) {
        var a = this.minActive;
        if (a > -1 && (this.activeTo[a] - this.cursor.from || this.active[a].endSide - this.cursor.startSide) < 0) {
          if (this.activeTo[a] > from) {
            this.to = this.activeTo[a];
            this.endSide = this.active[a].endSide;
            break;
          }
          this.removeActive(a);
          if (trackOpen) remove(trackOpen, a);
        } else if (!this.cursor.value) {
          this.to = this.endSide = 1e9;
          break;
        } else if (this.cursor.from > from) {
          this.to = this.cursor.from;
          this.endSide = this.cursor.startSide;
          break;
        } else {
          var nextVal = this.cursor.value;
          if (!nextVal.point) {
            this.addActive(trackOpen);
            this.cursor.next();
          } else if (wasPoint && this.cursor.to == this.to && this.cursor.from < this.cursor.to) {
            this.cursor.next();
          } else {
            this.point = nextVal;
            this.pointFrom = this.cursor.from;
            this.pointRank = this.cursor.rank;
            this.to = this.cursor.to;
            this.endSide = nextVal.endSide;
            this.cursor.next();
            this.forward(this.to, this.endSide);
            break;
          }
        }
      }
      if (trackOpen) {
        this.openStart = 0;
        for (var i2 = trackOpen.length - 1; i2 >= 0 && trackOpen[i2] < from; i2--) this.openStart++;
      }
    };
    _proto26.activeForPoint = function activeForPoint(to) {
      if (!this.active.length) return this.active;
      var active2 = [];
      for (var i2 = this.active.length - 1; i2 >= 0; i2--) {
        if (this.activeRank[i2] < this.pointRank) break;
        if (this.activeTo[i2] > to || this.activeTo[i2] == to && this.active[i2].endSide >= this.point.endSide) active2.push(this.active[i2]);
      }
      return active2.reverse();
    };
    _proto26.openEnd = function openEnd(to) {
      var open = 0;
      for (var i2 = this.activeTo.length - 1; i2 >= 0 && this.activeTo[i2] > to; i2--) open++;
      return open;
    };
    return SpanCursor;
  }();
  function _compare(a, startA, b, startB, length, comparator) {
    a.goto(startA);
    b.goto(startB);
    var endB = startB + length;
    var pos = startB,
      dPos = startB - startA;
    var bounds = !!comparator.boundChange;
    for (var boundChange = false;;) {
      var dEnd = a.to + dPos - b.to,
        diff = dEnd || a.endSide - b.endSide;
      var end = diff < 0 ? a.to + dPos : b.to,
        clipEnd = Math.min(end, endB);
      var point = a.point || b.point;
      if (point) {
        if (!(a.point && b.point && cmpVal(a.point, b.point) && sameValues(a.activeForPoint(a.to), b.activeForPoint(b.to)))) comparator.comparePoint(pos, clipEnd, a.point, b.point);
        boundChange = false;
      } else {
        if (boundChange) comparator.boundChange(pos);
        if (clipEnd > pos && !sameValues(a.active, b.active)) comparator.compareRange(pos, clipEnd, a.active, b.active);
        if (bounds && clipEnd < endB && (dEnd || a.openEnd(end) != b.openEnd(end))) boundChange = true;
      }
      if (end > endB) break;
      pos = end;
      if (diff <= 0) a.next();
      if (diff >= 0) b.next();
    }
  }
  function sameValues(a, b) {
    if (a.length != b.length) return false;
    for (var i2 = 0; i2 < a.length; i2++) if (a[i2] != b[i2] && !cmpVal(a[i2], b[i2])) return false;
    return true;
  }
  function remove(array, index) {
    for (var i2 = index, e = array.length - 1; i2 < e; i2++) array[i2] = array[i2 + 1];
    array.pop();
  }
  function insert(array, index, value) {
    for (var i2 = array.length - 1; i2 >= index; i2--) array[i2 + 1] = array[i2];
    array[index] = value;
  }
  function findMinIndex(value, array) {
    var found = -1,
      foundPos = 1e9;
    for (var i2 = 0; i2 < array.length; i2++) if ((array[i2] - foundPos || value[i2].endSide - value[found].endSide) < 0) {
      found = i2;
      foundPos = array[i2];
    }
    return found;
  }
  function _countColumn(string2, tabSize, to) {
    if (to === void 0) {
      to = string2.length;
    }
    var n = 0;
    for (var i2 = 0; i2 < to && i2 < string2.length;) {
      if (string2.charCodeAt(i2) == 9) {
        n += tabSize - n % tabSize;
        i2++;
      } else {
        n++;
        i2 = findClusterBreak2(string2, i2);
      }
    }
    return n;
  }
  function findColumn(string2, col, tabSize, strict) {
    for (var i2 = 0, n = 0;;) {
      if (n >= col) return i2;
      if (i2 == string2.length) break;
      n += string2.charCodeAt(i2) == 9 ? tabSize - n % tabSize : 1;
      i2 = findClusterBreak2(string2, i2);
    }
    return strict === true ? -1 : string2.length;
  }
  var C = "\u037C";
  var COUNT = typeof Symbol == "undefined" ? "__" + C : Symbol.for(C);
  var SET = typeof Symbol == "undefined" ? "__styleSet" + Math.floor(Math.random() * 1e8) : Symbol("styleSet");
  var top = typeof globalThis != "undefined" ? globalThis : typeof window != "undefined" ? window : {};
  var StyleModule = function () {
    function StyleModule(spec, options) {
      this.rules = [];
      var _ref2 = options || {},
        finish = _ref2.finish;
      function splitSelector(selector) {
        return /^@/.test(selector) ? [selector] : selector.split(/,\s*/);
      }
      function render(selectors, spec2, target, isKeyframes) {
        var local = [],
          isAt = /^@(\w+)\b/.exec(selectors[0]),
          keyframes = isAt && isAt[1] == "keyframes";
        if (isAt && spec2 == null) return target.push(selectors[0] + ";");
        for (var prop in spec2) {
          var value = spec2[prop];
          if (/&/.test(prop)) {
            render(prop.split(/,\s*/).map(function (part) {
              return selectors.map(function (sel) {
                return part.replace(/&/, sel);
              });
            }).reduce(function (a, b) {
              return a.concat(b);
            }), value, target);
          } else if (value && typeof value == "object") {
            if (!isAt) throw new RangeError("The value of a property (" + prop + ") should be a primitive value.");
            render(splitSelector(prop), value, local, keyframes);
          } else if (value != null) {
            local.push(prop.replace(/_.*/, "").replace(new RegExp("[A-Z]", "g"), function (l) {
              return "-" + l.toLowerCase();
            }) + ": " + value + ";");
          }
        }
        if (local.length || keyframes) {
          target.push((finish && !isAt && !isKeyframes ? selectors.map(finish) : selectors).join(", ") + " {" + local.join(" ") + "}");
        }
      }
      for (var prop in spec) render(splitSelector(prop), spec[prop], this.rules);
    }
    var _proto27 = StyleModule.prototype;
    _proto27.getRules = function getRules() {
      return this.rules.join("\n");
    };
    StyleModule.newName = function newName() {
      var id = top[COUNT] || 1;
      top[COUNT] = id + 1;
      return C + id.toString(36);
    };
    StyleModule.mount = function mount(root, modules, options) {
      var set = root[SET],
        nonce = options && options.nonce;
      if (!set) set = new StyleSet(root, nonce);else if (nonce) set.setNonce(nonce);
      set.mount(Array.isArray(modules) ? modules : [modules], root);
    };
    return StyleModule;
  }();
  var adoptedSet = new Map();
  var StyleSet = function () {
    function StyleSet(root, nonce) {
      var doc2 = root.ownerDocument || root,
        win = doc2.defaultView;
      if (!root.head && root.adoptedStyleSheets && win.CSSStyleSheet) {
        var adopted = adoptedSet.get(doc2);
        if (adopted) return root[SET] = adopted;
        this.sheet = new win.CSSStyleSheet();
        adoptedSet.set(doc2, this);
      } else {
        this.styleTag = doc2.createElement("style");
        if (nonce) this.styleTag.setAttribute("nonce", nonce);
      }
      this.modules = [];
      root[SET] = this;
    }
    var _proto28 = StyleSet.prototype;
    _proto28.mount = function mount(modules, root) {
      var sheet = this.sheet;
      var pos = 0,
        j = 0;
      for (var i2 = 0; i2 < modules.length; i2++) {
        var mod = modules[i2],
          index = this.modules.indexOf(mod);
        if (index < j && index > -1) {
          this.modules.splice(index, 1);
          j--;
          index = -1;
        }
        if (index == -1) {
          this.modules.splice(j++, 0, mod);
          if (sheet) for (var k = 0; k < mod.rules.length; k++) sheet.insertRule(mod.rules[k], pos++);
        } else {
          while (j < index) pos += this.modules[j++].rules.length;
          pos += mod.rules.length;
          j++;
        }
      }
      if (sheet) {
        if (root.adoptedStyleSheets.indexOf(this.sheet) < 0) root.adoptedStyleSheets = [this.sheet].concat(root.adoptedStyleSheets);
      } else {
        var text = "";
        for (var _i4 = 0; _i4 < this.modules.length; _i4++) text += this.modules[_i4].getRules() + "\n";
        this.styleTag.textContent = text;
        var target = root.head || root;
        if (this.styleTag.parentNode != target) target.insertBefore(this.styleTag, target.firstChild);
      }
    };
    _proto28.setNonce = function setNonce(nonce) {
      if (this.styleTag && this.styleTag.getAttribute("nonce") != nonce) this.styleTag.setAttribute("nonce", nonce);
    };
    return StyleSet;
  }();
  var base = {
    8: "Backspace",
    9: "Tab",
    10: "Enter",
    12: "NumLock",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    44: "PrintScreen",
    45: "Insert",
    46: "Delete",
    59: ";",
    61: "=",
    91: "Meta",
    92: "Meta",
    106: "*",
    107: "+",
    108: ",",
    109: "-",
    110: ".",
    111: "/",
    144: "NumLock",
    145: "ScrollLock",
    160: "Shift",
    161: "Shift",
    162: "Control",
    163: "Control",
    164: "Alt",
    165: "Alt",
    173: "-",
    186: ";",
    187: "=",
    188: ",",
    189: "-",
    190: ".",
    191: "/",
    192: "`",
    219: "[",
    220: "\\",
    221: "]",
    222: "'"
  };
  var shift = {
    48: ")",
    49: "!",
    50: "@",
    51: "#",
    52: "$",
    53: "%",
    54: "^",
    55: "&",
    56: "*",
    57: "(",
    59: ":",
    61: "+",
    173: "_",
    186: ":",
    187: "+",
    188: "<",
    189: "_",
    190: ">",
    191: "?",
    192: "~",
    219: "{",
    220: "|",
    221: "}",
    222: '"'
  };
  var mac = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
  var ie = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
  for (i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);
  var i;
  for (i = 1; i <= 24; i++) base[i + 111] = "F" + i;
  var i;
  for (i = 65; i <= 90; i++) {
    base[i] = String.fromCharCode(i + 32);
    shift[i] = String.fromCharCode(i);
  }
  var i;
  for (code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];
  var code;
  function keyName(event) {
    var ignoreKey = mac && event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey || ie && event.shiftKey && event.key && event.key.length == 1 || event.key == "Unidentified";
    var name2 = !ignoreKey && event.key || (event.shiftKey ? shift : base)[event.keyCode] || event.key || "Unidentified";
    if (name2 == "Esc") name2 = "Escape";
    if (name2 == "Del") name2 = "Delete";
    if (name2 == "Left") name2 = "ArrowLeft";
    if (name2 == "Up") name2 = "ArrowUp";
    if (name2 == "Right") name2 = "ArrowRight";
    if (name2 == "Down") name2 = "ArrowDown";
    return name2;
  }
  var nav = typeof navigator != "undefined" ? navigator : {
    userAgent: "",
    vendor: "",
    platform: ""
  };
  var doc = typeof document != "undefined" ? document : {
    documentElement: {
      style: {}
    }
  };
  var ie_edge = /Edge\/(\d+)/.exec(nav.userAgent);
  var ie_upto10 = /MSIE \d/.test(nav.userAgent);
  var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent);
  var ie2 = !!(ie_upto10 || ie_11up || ie_edge);
  var gecko = !ie2 && new RegExp("gecko\\/(\\d+)", "i").test(nav.userAgent);
  var chrome = !ie2 && /Chrome\/(\d+)/.exec(nav.userAgent);
  var webkit = "webkitFontSmoothing" in doc.documentElement.style;
  var safari = !ie2 && /Apple Computer/.test(nav.vendor);
  var ios = safari && (/Mobile\/\w+/.test(nav.userAgent) || nav.maxTouchPoints > 2);
  var browser = {
    mac: ios || /Mac/.test(nav.platform),
    windows: /Win/.test(nav.platform),
    linux: /Linux|X11/.test(nav.platform),
    ie: ie2,
    ie_version: ie_upto10 ? doc.documentMode || 6 : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0,
    gecko: gecko,
    gecko_version: gecko ? +(/Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    chrome: !!chrome,
    chrome_version: chrome ? +chrome[1] : 0,
    ios: ios,
    android: /Android\b/.test(nav.userAgent),
    webkit: webkit,
    webkit_version: webkit ? +(/\bAppleWebKit\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    safari: safari,
    safari_version: safari ? +(/\bVersion\/(\d+(\.\d+)?)/.exec(nav.userAgent) || [0, 0])[1] : 0,
    tabSize: doc.documentElement.style.tabSize != null ? "tab-size" : "-moz-tab-size"
  };
  function combineAttrs(source, target) {
    for (var name2 in source) {
      if (name2 == "class" && target.class) target.class += " " + source.class;else if (name2 == "style" && target.style) target.style += ";" + source.style;else target[name2] = source[name2];
    }
    return target;
  }
  var noAttrs = Object.create(null);
  function attrsEq(a, b, ignore) {
    if (a == b) return true;
    if (!a) a = noAttrs;
    if (!b) b = noAttrs;
    var keysA = Object.keys(a),
      keysB = Object.keys(b);
    if (keysA.length - (ignore && keysA.indexOf(ignore) > -1 ? 1 : 0) != keysB.length - (ignore && keysB.indexOf(ignore) > -1 ? 1 : 0)) return false;
    for (var _i5 = 0, _keysA = keysA; _i5 < _keysA.length; _i5++) {
      var key = _keysA[_i5];
      if (key != ignore && (keysB.indexOf(key) == -1 || a[key] !== b[key])) return false;
    }
    return true;
  }
  function setAttrs(dom, attrs) {
    for (var i2 = dom.attributes.length - 1; i2 >= 0; i2--) {
      var name2 = dom.attributes[i2].name;
      if (attrs[name2] == null) dom.removeAttribute(name2);
    }
    for (var _name in attrs) {
      var value = attrs[_name];
      if (_name == "style") dom.style.cssText = value;else if (dom.getAttribute(_name) != value) dom.setAttribute(_name, value);
    }
  }
  function _updateAttrs(dom, prev, attrs) {
    var changed = false;
    if (prev) {
      for (var name2 in prev) if (!(attrs && name2 in attrs)) {
        changed = true;
        if (name2 == "style") dom.style.cssText = "";else dom.removeAttribute(name2);
      }
    }
    if (attrs) {
      for (var _name2 in attrs) if (!(prev && prev[_name2] == attrs[_name2])) {
        changed = true;
        if (_name2 == "style") dom.style.cssText = attrs[_name2];else dom.setAttribute(_name2, attrs[_name2]);
      }
    }
    return changed;
  }
  function getAttrs(dom) {
    var attrs = Object.create(null);
    for (var i2 = 0; i2 < dom.attributes.length; i2++) {
      var attr = dom.attributes[i2];
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }
  var WidgetType = function () {
    function WidgetType() {}
    var _proto29 = WidgetType.prototype;
    _proto29.eq = function eq(widget) {
      return false;
    };
    _proto29.updateDOM = function updateDOM(dom, view, from) {
      return false;
    };
    _proto29.compare = function compare(other) {
      return this == other || this.constructor == other.constructor && this.eq(other);
    };
    _proto29.ignoreEvent = function ignoreEvent(event) {
      return true;
    };
    _proto29.coordsAt = function coordsAt(dom, pos, side) {
      return null;
    };
    _proto29.destroy = function destroy(dom) {};
    return _createClass(WidgetType, [{
      key: "estimatedHeight",
      get: function get() {
        return -1;
      }
    }, {
      key: "lineBreaks",
      get: function get() {
        return 0;
      }
    }, {
      key: "isHidden",
      get: function get() {
        return false;
      }
    }, {
      key: "editable",
      get: function get() {
        return false;
      }
    }]);
  }();
  var BlockType = function (BlockType2) {
    BlockType2[BlockType2["Text"] = 0] = "Text";
    BlockType2[BlockType2["WidgetBefore"] = 1] = "WidgetBefore";
    BlockType2[BlockType2["WidgetAfter"] = 2] = "WidgetAfter";
    BlockType2[BlockType2["WidgetRange"] = 3] = "WidgetRange";
    return BlockType2;
  }(BlockType || (BlockType = {}));
  var Decoration = function (_RangeValue) {
    function Decoration(startSide, endSide, widget, spec) {
      var _this8;
      _this8 = _RangeValue.call(this) || this;
      _this8.startSide = startSide;
      _this8.endSide = endSide;
      _this8.widget = widget;
      _this8.spec = spec;
      return _this8;
    }
    _inheritsLoose(Decoration, _RangeValue);
    Decoration.mark = function mark(spec) {
      return new MarkDecoration(spec);
    };
    Decoration.widget = function widget(spec) {
      var side = Math.max(-1e4, Math.min(1e4, spec.side || 0)),
        block = !!spec.block;
      side += block && !spec.inlineOrder ? side > 0 ? 3e8 : -4e8 : side > 0 ? 1e8 : -1e8;
      return new PointDecoration(spec, side, side, block, spec.widget || null, false);
    };
    Decoration.replace = function replace(spec) {
      var block = !!spec.block,
        startSide,
        endSide;
      if (spec.isBlockGap) {
        startSide = -5e8;
        endSide = 4e8;
      } else {
        var _getInclusive = getInclusive(spec, block),
          start = _getInclusive.start,
          end = _getInclusive.end;
        startSide = (start ? block ? -3e8 : -1 : 5e8) - 1;
        endSide = (end ? block ? 2e8 : 1 : -6e8) + 1;
      }
      return new PointDecoration(spec, startSide, endSide, block, spec.widget || null, true);
    };
    Decoration.line = function line(spec) {
      return new LineDecoration(spec);
    };
    Decoration.set = function set(of, sort) {
      if (sort === void 0) {
        sort = false;
      }
      return RangeSet.of(of, sort);
    };
    var _proto30 = Decoration.prototype;
    _proto30.hasHeight = function hasHeight() {
      return this.widget ? this.widget.estimatedHeight > -1 : false;
    };
    return _createClass(Decoration, [{
      key: "heightRelevant",
      get: function get() {
        return false;
      }
    }]);
  }(RangeValue);
  Decoration.none = RangeSet.empty;
  var MarkDecoration = function (_Decoration) {
    function _MarkDecoration(spec) {
      var _this9;
      var _getInclusive2 = getInclusive(spec),
        start = _getInclusive2.start,
        end = _getInclusive2.end;
      _this9 = _Decoration.call(this, start ? -1 : 5e8, end ? 1 : -6e8, null, spec) || this;
      _this9.tagName = spec.tagName || "span";
      _this9.attrs = spec.class && spec.attributes ? combineAttrs(spec.attributes, {
        class: spec.class
      }) : spec.class ? {
        class: spec.class
      } : spec.attributes || noAttrs;
      return _this9;
    }
    _inheritsLoose(_MarkDecoration, _Decoration);
    var _proto31 = _MarkDecoration.prototype;
    _proto31.eq = function eq(other) {
      return this == other || other instanceof _MarkDecoration && this.tagName == other.tagName && attrsEq(this.attrs, other.attrs);
    };
    _proto31.range = function range(from, to) {
      if (to === void 0) {
        to = from;
      }
      if (from >= to) throw new RangeError("Mark decorations may not be empty");
      return _Decoration.prototype.range.call(this, from, to);
    };
    return _MarkDecoration;
  }(Decoration);
  MarkDecoration.prototype.point = false;
  var LineDecoration = function (_Decoration2) {
    function _LineDecoration(spec) {
      return _Decoration2.call(this, -2e8, -2e8, null, spec) || this;
    }
    _inheritsLoose(_LineDecoration, _Decoration2);
    var _proto32 = _LineDecoration.prototype;
    _proto32.eq = function eq(other) {
      return other instanceof _LineDecoration && this.spec.class == other.spec.class && attrsEq(this.spec.attributes, other.spec.attributes);
    };
    _proto32.range = function range(from, to) {
      if (to === void 0) {
        to = from;
      }
      if (to != from) throw new RangeError("Line decoration ranges must be zero-length");
      return _Decoration2.prototype.range.call(this, from, to);
    };
    return _LineDecoration;
  }(Decoration);
  LineDecoration.prototype.mapMode = MapMode.TrackBefore;
  LineDecoration.prototype.point = true;
  var PointDecoration = function (_Decoration3) {
    function _PointDecoration(spec, startSide, endSide, block, widget, isReplace) {
      var _this0;
      _this0 = _Decoration3.call(this, startSide, endSide, widget, spec) || this;
      _this0.block = block;
      _this0.isReplace = isReplace;
      _this0.mapMode = !block ? MapMode.TrackDel : startSide <= 0 ? MapMode.TrackBefore : MapMode.TrackAfter;
      return _this0;
    }
    _inheritsLoose(_PointDecoration, _Decoration3);
    var _proto33 = _PointDecoration.prototype;
    _proto33.eq = function eq(other) {
      return other instanceof _PointDecoration && widgetsEq(this.widget, other.widget) && this.block == other.block && this.startSide == other.startSide && this.endSide == other.endSide;
    };
    _proto33.range = function range(from, to) {
      if (to === void 0) {
        to = from;
      }
      if (this.isReplace && (from > to || from == to && this.startSide > 0 && this.endSide <= 0)) throw new RangeError("Invalid range for replacement decoration");
      if (!this.isReplace && to != from) throw new RangeError("Widget decorations can only have zero-length ranges");
      return _Decoration3.prototype.range.call(this, from, to);
    };
    return _createClass(_PointDecoration, [{
      key: "type",
      get: function get() {
        return this.startSide != this.endSide ? BlockType.WidgetRange : this.startSide <= 0 ? BlockType.WidgetBefore : BlockType.WidgetAfter;
      }
    }, {
      key: "heightRelevant",
      get: function get() {
        return this.block || !!this.widget && (this.widget.estimatedHeight >= 5 || this.widget.lineBreaks > 0);
      }
    }]);
  }(Decoration);
  PointDecoration.prototype.point = true;
  function getInclusive(spec, block) {
    if (block === void 0) {
      block = false;
    }
    var start = spec.inclusiveStart,
      end = spec.inclusiveEnd;
    if (start == null) start = spec.inclusive;
    if (end == null) end = spec.inclusive;
    return {
      start: start !== null && start !== void 0 ? start : block,
      end: end !== null && end !== void 0 ? end : block
    };
  }
  function widgetsEq(a, b) {
    return a == b || !!(a && b && a.compare(b));
  }
  function addRange(from, to, ranges, margin) {
    if (margin === void 0) {
      margin = 0;
    }
    var last = ranges.length - 1;
    if (last >= 0 && ranges[last] + margin >= from) ranges[last] = Math.max(ranges[last], to);else ranges.push(from, to);
  }
  var BlockWrapper = function (_RangeValue2) {
    function _BlockWrapper(tagName, attributes, rank) {
      var _this1;
      _this1 = _RangeValue2.call(this) || this;
      _this1.tagName = tagName;
      _this1.attributes = attributes;
      _this1.rank = rank;
      return _this1;
    }
    _inheritsLoose(_BlockWrapper, _RangeValue2);
    var _proto34 = _BlockWrapper.prototype;
    _proto34.eq = function eq(other) {
      return other == this || other instanceof _BlockWrapper && this.tagName == other.tagName && attrsEq(this.attributes, other.attributes);
    };
    _BlockWrapper.create = function create(spec) {
      return new _BlockWrapper(spec.tagName, spec.attributes || noAttrs, spec.rank == null ? 50 : Math.max(0, Math.min(spec.rank, 100)));
    };
    _BlockWrapper.set = function set(of, sort) {
      if (sort === void 0) {
        sort = false;
      }
      return RangeSet.of(of, sort);
    };
    return _BlockWrapper;
  }(RangeValue);
  BlockWrapper.prototype.startSide = BlockWrapper.prototype.endSide = -1;
  function getSelection(root) {
    var target;
    if (root.nodeType == 11) {
      target = root.getSelection ? root : root.ownerDocument;
    } else {
      target = root;
    }
    return target.getSelection();
  }
  function contains(dom, node) {
    return node ? dom == node || dom.contains(node.nodeType != 1 ? node.parentNode : node) : false;
  }
  function hasSelection(dom, selection) {
    if (!selection.anchorNode) return false;
    try {
      return contains(dom, selection.anchorNode);
    } catch (_3) {
      return false;
    }
  }
  function clientRectsFor(dom) {
    if (dom.nodeType == 3) return textRange(dom, 0, dom.nodeValue.length).getClientRects();else if (dom.nodeType == 1) return dom.getClientRects();else return [];
  }
  function isEquivalentPosition(node, off, targetNode, targetOff) {
    return targetNode ? scanFor(node, off, targetNode, targetOff, -1) || scanFor(node, off, targetNode, targetOff, 1) : false;
  }
  function domIndex(node) {
    for (var index = 0;; index++) {
      node = node.previousSibling;
      if (!node) return index;
    }
  }
  function isBlockElement(node) {
    return node.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
  }
  function scanFor(node, off, targetNode, targetOff, dir) {
    for (;;) {
      if (node == targetNode && off == targetOff) return true;
      if (off == (dir < 0 ? 0 : maxOffset(node))) {
        if (node.nodeName == "DIV") return false;
        var parent = node.parentNode;
        if (!parent || parent.nodeType != 1) return false;
        off = domIndex(node) + (dir < 0 ? 0 : 1);
        node = parent;
      } else if (node.nodeType == 1) {
        node = node.childNodes[off + (dir < 0 ? -1 : 0)];
        if (node.nodeType == 1 && node.contentEditable == "false") return false;
        off = dir < 0 ? maxOffset(node) : 0;
      } else {
        return false;
      }
    }
  }
  function maxOffset(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
  }
  function flattenRect(rect, toLeft) {
    var left = rect.left,
      right = rect.right;
    if (left == right) return rect;
    var x = toLeft ? left : right;
    return {
      left: x,
      right: x,
      top: rect.top,
      bottom: rect.bottom
    };
  }
  function windowRect(win) {
    var vp = win.visualViewport;
    if (vp) return {
      left: 0,
      right: vp.width,
      top: 0,
      bottom: vp.height
    };
    return {
      left: 0,
      right: win.innerWidth,
      top: 0,
      bottom: win.innerHeight
    };
  }
  function getScale(elt, rect) {
    var scaleX = rect.width / elt.offsetWidth;
    var scaleY = rect.height / elt.offsetHeight;
    if (scaleX > 0.995 && scaleX < 1.005 || !isFinite(scaleX) || Math.abs(rect.width - elt.offsetWidth) < 1) scaleX = 1;
    if (scaleY > 0.995 && scaleY < 1.005 || !isFinite(scaleY) || Math.abs(rect.height - elt.offsetHeight) < 1) scaleY = 1;
    return {
      scaleX: scaleX,
      scaleY: scaleY
    };
  }
  function scrollRectIntoView(dom, rect, side, x, y, xMargin, yMargin, ltr) {
    var doc2 = dom.ownerDocument,
      win = doc2.defaultView || window;
    for (var cur = dom, stop = false; cur && !stop;) {
      if (cur.nodeType == 1) {
        var bounding = void 0,
          top2 = cur == doc2.body;
        var scaleX = 1,
          scaleY = 1;
        if (top2) {
          bounding = windowRect(win);
        } else {
          if (/^(fixed|sticky)$/.test(getComputedStyle(cur).position)) stop = true;
          if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
            cur = cur.assignedSlot || cur.parentNode;
            continue;
          }
          var rect2 = cur.getBoundingClientRect();
          var _getScale = getScale(cur, rect2);
          scaleX = _getScale.scaleX;
          scaleY = _getScale.scaleY;
          bounding = {
            left: rect2.left,
            right: rect2.left + cur.clientWidth * scaleX,
            top: rect2.top,
            bottom: rect2.top + cur.clientHeight * scaleY
          };
        }
        var moveX = 0,
          moveY = 0;
        if (y == "nearest") {
          if (rect.top < bounding.top + yMargin) {
            moveY = rect.top - (bounding.top + yMargin);
            if (side > 0 && rect.bottom > bounding.bottom + moveY) moveY = rect.bottom - bounding.bottom + yMargin;
          } else if (rect.bottom > bounding.bottom - yMargin) {
            moveY = rect.bottom - bounding.bottom + yMargin;
            if (side < 0 && rect.top - moveY < bounding.top) moveY = rect.top - (bounding.top + yMargin);
          }
        } else {
          var rectHeight = rect.bottom - rect.top,
            boundingHeight = bounding.bottom - bounding.top;
          var targetTop = y == "center" && rectHeight <= boundingHeight ? rect.top + rectHeight / 2 - boundingHeight / 2 : y == "start" || y == "center" && side < 0 ? rect.top - yMargin : rect.bottom - boundingHeight + yMargin;
          moveY = targetTop - bounding.top;
        }
        if (x == "nearest") {
          if (rect.left < bounding.left + xMargin) {
            moveX = rect.left - (bounding.left + xMargin);
            if (side > 0 && rect.right > bounding.right + moveX) moveX = rect.right - bounding.right + xMargin;
          } else if (rect.right > bounding.right - xMargin) {
            moveX = rect.right - bounding.right + xMargin;
            if (side < 0 && rect.left < bounding.left + moveX) moveX = rect.left - (bounding.left + xMargin);
          }
        } else {
          var targetLeft = x == "center" ? rect.left + (rect.right - rect.left) / 2 - (bounding.right - bounding.left) / 2 : x == "start" == ltr ? rect.left - xMargin : rect.right - (bounding.right - bounding.left) + xMargin;
          moveX = targetLeft - bounding.left;
        }
        if (moveX || moveY) {
          if (top2) {
            win.scrollBy(moveX, moveY);
          } else {
            var movedX = 0,
              movedY = 0;
            if (moveY) {
              var start = cur.scrollTop;
              cur.scrollTop += moveY / scaleY;
              movedY = (cur.scrollTop - start) * scaleY;
            }
            if (moveX) {
              var _start = cur.scrollLeft;
              cur.scrollLeft += moveX / scaleX;
              movedX = (cur.scrollLeft - _start) * scaleX;
            }
            rect = {
              left: rect.left - movedX,
              top: rect.top - movedY,
              right: rect.right - movedX,
              bottom: rect.bottom - movedY
            };
            if (movedX && Math.abs(movedX - moveX) < 1) x = "nearest";
            if (movedY && Math.abs(movedY - moveY) < 1) y = "nearest";
          }
        }
        if (top2) break;
        if (rect.top < bounding.top || rect.bottom > bounding.bottom || rect.left < bounding.left || rect.right > bounding.right) rect = {
          left: Math.max(rect.left, bounding.left),
          right: Math.min(rect.right, bounding.right),
          top: Math.max(rect.top, bounding.top),
          bottom: Math.min(rect.bottom, bounding.bottom)
        };
        cur = cur.assignedSlot || cur.parentNode;
      } else if (cur.nodeType == 11) {
        cur = cur.host;
      } else {
        break;
      }
    }
  }
  function scrollableParents(dom, getX) {
    if (getX === void 0) {
      getX = true;
    }
    var doc2 = dom.ownerDocument,
      x = null,
      y = null;
    for (var cur = dom.parentNode; cur;) {
      if (cur == doc2.body || (!getX || x) && y) {
        break;
      } else if (cur.nodeType == 1) {
        if (!y && cur.scrollHeight > cur.clientHeight) y = cur;
        if (getX && !x && cur.scrollWidth > cur.clientWidth) x = cur;
        cur = cur.assignedSlot || cur.parentNode;
      } else if (cur.nodeType == 11) {
        cur = cur.host;
      } else {
        break;
      }
    }
    return {
      x: x,
      y: y
    };
  }
  var DOMSelectionState = function () {
    function DOMSelectionState() {
      this.anchorNode = null;
      this.anchorOffset = 0;
      this.focusNode = null;
      this.focusOffset = 0;
    }
    var _proto35 = DOMSelectionState.prototype;
    _proto35.eq = function eq(domSel) {
      return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset && this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
    };
    _proto35.setRange = function setRange(range) {
      var anchorNode = range.anchorNode,
        focusNode = range.focusNode;
      this.set(anchorNode, Math.min(range.anchorOffset, anchorNode ? maxOffset(anchorNode) : 0), focusNode, Math.min(range.focusOffset, focusNode ? maxOffset(focusNode) : 0));
    };
    _proto35.set = function set(anchorNode, anchorOffset, focusNode, focusOffset) {
      this.anchorNode = anchorNode;
      this.anchorOffset = anchorOffset;
      this.focusNode = focusNode;
      this.focusOffset = focusOffset;
    };
    return DOMSelectionState;
  }();
  function getScrollStack(target) {
    var stack = [];
    for (var cur = target; cur; cur = cur.nodeType == 11 ? cur.host : cur.parentNode) {
      if (cur.nodeType == 1) stack.push({
        node: cur,
        left: cur.scrollLeft,
        top: cur.scrollTop
      });
    }
    return stack;
  }
  function restoreScrollStack(stack, vert) {
    if (vert === void 0) {
      vert = true;
    }
    for (var _iterator31 = _createForOfIteratorHelperLoose(stack), _step31; !(_step31 = _iterator31()).done;) {
      var _step31$value = _step31.value,
        node = _step31$value.node,
        left = _step31$value.left,
        top2 = _step31$value.top;
      if (vert && node.scrollTop != top2) node.scrollTop = top2;
      if (node.scrollLeft != left) node.scrollLeft = left;
    }
  }
  var preventScrollSupported = null;
  if (browser.safari && browser.safari_version >= 26) preventScrollSupported = false;
  function focusPreventScroll(dom) {
    if (dom.setActive) return dom.setActive();
    if (preventScrollSupported) return dom.focus(preventScrollSupported);
    var stack = getScrollStack(dom);
    dom.focus(preventScrollSupported == null ? {
      get preventScroll() {
        preventScrollSupported = {
          preventScroll: true
        };
        return true;
      }
    } : void 0);
    if (!preventScrollSupported) {
      preventScrollSupported = false;
      restoreScrollStack(stack);
    }
  }
  var scratchRange;
  function textRange(node, from, to) {
    if (to === void 0) {
      to = from;
    }
    var range = scratchRange || (scratchRange = document.createRange());
    range.setEnd(node, to);
    range.setStart(node, from);
    return range;
  }
  function dispatchKey(elt, name2, code2, mods) {
    var options = {
      key: name2,
      code: name2,
      keyCode: code2,
      which: code2,
      cancelable: true
    };
    if (mods) {
      options.altKey = mods.altKey;
      options.ctrlKey = mods.ctrlKey;
      options.shiftKey = mods.shiftKey;
      options.metaKey = mods.metaKey;
    }
    var down = new KeyboardEvent("keydown", options);
    down.synthetic = true;
    elt.dispatchEvent(down);
    var up = new KeyboardEvent("keyup", options);
    up.synthetic = true;
    elt.dispatchEvent(up);
    return down.defaultPrevented || up.defaultPrevented;
  }
  function getRoot(node) {
    while (node) {
      if (node && (node.nodeType == 9 || node.nodeType == 11 && node.host)) return node;
      node = node.assignedSlot || node.parentNode;
    }
    return null;
  }
  function atElementStart(doc2, selection) {
    var node = selection.focusNode,
      offset = selection.focusOffset;
    if (!node || selection.anchorNode != node || selection.anchorOffset != offset) return false;
    offset = Math.min(offset, maxOffset(node));
    for (;;) {
      if (offset) {
        if (node.nodeType != 1) return false;
        var prev = node.childNodes[offset - 1];
        if (prev.contentEditable == "false") offset--;else {
          node = prev;
          offset = maxOffset(node);
        }
      } else if (node == doc2) {
        return true;
      } else {
        offset = domIndex(node);
        node = node.parentNode;
      }
    }
  }
  function isScrolledToBottom(elt) {
    if (elt instanceof Window) return elt.pageYOffset > Math.max(0, elt.document.documentElement.scrollHeight - elt.innerHeight - 4);
    return elt.scrollTop > Math.max(1, elt.scrollHeight - elt.clientHeight - 4);
  }
  function textNodeBefore(startNode, startOffset) {
    for (var node = startNode, offset = startOffset;;) {
      if (node.nodeType == 3 && offset > 0) {
        return {
          node: node,
          offset: offset
        };
      } else if (node.nodeType == 1 && offset > 0) {
        if (node.contentEditable == "false") return null;
        node = node.childNodes[offset - 1];
        offset = maxOffset(node);
      } else if (node.parentNode && !isBlockElement(node)) {
        offset = domIndex(node);
        node = node.parentNode;
      } else {
        return null;
      }
    }
  }
  function textNodeAfter(startNode, startOffset) {
    for (var node = startNode, offset = startOffset;;) {
      if (node.nodeType == 3 && offset < node.nodeValue.length) {
        return {
          node: node,
          offset: offset
        };
      } else if (node.nodeType == 1 && offset < node.childNodes.length) {
        if (node.contentEditable == "false") return null;
        node = node.childNodes[offset];
        offset = 0;
      } else if (node.parentNode && !isBlockElement(node)) {
        offset = domIndex(node) + 1;
        node = node.parentNode;
      } else {
        return null;
      }
    }
  }
  var DOMPos = function () {
    function _DOMPos(node, offset, precise) {
      if (precise === void 0) {
        precise = true;
      }
      this.node = node;
      this.offset = offset;
      this.precise = precise;
    }
    _DOMPos.before = function before(dom, precise) {
      return new _DOMPos(dom.parentNode, domIndex(dom), precise);
    };
    _DOMPos.after = function after(dom, precise) {
      return new _DOMPos(dom.parentNode, domIndex(dom) + 1, precise);
    };
    return _DOMPos;
  }();
  var Direction = function (Direction2) {
    Direction2[Direction2["LTR"] = 0] = "LTR";
    Direction2[Direction2["RTL"] = 1] = "RTL";
    return Direction2;
  }(Direction || (Direction = {}));
  var LTR = Direction.LTR;
  var RTL = Direction.RTL;
  function dec(str) {
    var result = [];
    for (var i2 = 0; i2 < str.length; i2++) result.push(1 << +str[i2]);
    return result;
  }
  var LowTypes = dec("88888888888888888888888888888888888666888888787833333333337888888000000000000000000000000008888880000000000000000000000000088888888888888888888888888888888888887866668888088888663380888308888800000000000000000000000800000000000000000000000000000008");
  var ArabicTypes = dec("4444448826627288999999999992222222222222222222222222222222222222222222222229999999999999999999994444444444644222822222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222999999949999999229989999223333333333");
  var Brackets = Object.create(null);
  var BracketStack = [];
  for (var _i6 = 0, _arr = ["()", "[]", "{}"]; _i6 < _arr.length; _i6++) {
    var p = _arr[_i6];
    var l = p.charCodeAt(0),
      r = p.charCodeAt(1);
    Brackets[l] = r;
    Brackets[r] = -l;
  }
  function charType(ch) {
    return ch <= 247 ? LowTypes[ch] : 1424 <= ch && ch <= 1524 ? 2 : 1536 <= ch && ch <= 1785 ? ArabicTypes[ch - 1536] : 1774 <= ch && ch <= 2220 ? 4 : 8192 <= ch && ch <= 8204 ? 256 : 64336 <= ch && ch <= 65023 ? 4 : 1;
  }
  var BidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac\ufb50-\ufdff]/;
  var BidiSpan = function () {
    function BidiSpan(from, to, level) {
      this.from = from;
      this.to = to;
      this.level = level;
    }
    var _proto36 = BidiSpan.prototype;
    _proto36.side = function side(end, dir) {
      return this.dir == dir == end ? this.to : this.from;
    };
    _proto36.forward = function forward(_forward, dir) {
      return _forward == (this.dir == dir);
    };
    BidiSpan.find = function find(order, index, level, assoc) {
      var maybe = -1;
      for (var i2 = 0; i2 < order.length; i2++) {
        var span = order[i2];
        if (span.from <= index && span.to >= index) {
          if (span.level == level) return i2;
          if (maybe < 0 || (assoc != 0 ? assoc < 0 ? span.from < index : span.to > index : order[maybe].level > span.level)) maybe = i2;
        }
      }
      if (maybe < 0) throw new RangeError("Index out of range");
      return maybe;
    };
    return _createClass(BidiSpan, [{
      key: "dir",
      get: function get() {
        return this.level % 2 ? RTL : LTR;
      }
    }]);
  }();
  function isolatesEq(a, b) {
    if (a.length != b.length) return false;
    for (var i2 = 0; i2 < a.length; i2++) {
      var iA = a[i2],
        iB = b[i2];
      if (iA.from != iB.from || iA.to != iB.to || iA.direction != iB.direction || !isolatesEq(iA.inner, iB.inner)) return false;
    }
    return true;
  }
  var types = [];
  function computeCharTypes(line, rFrom, rTo, isolates, outerType) {
    for (var iI = 0; iI <= isolates.length; iI++) {
      var from = iI ? isolates[iI - 1].to : rFrom,
        to = iI < isolates.length ? isolates[iI].from : rTo;
      var prevType = iI ? 256 : outerType;
      for (var i2 = from, prev = prevType, prevStrong = prevType; i2 < to; i2++) {
        var type = charType(line.charCodeAt(i2));
        if (type == 512) type = prev;else if (type == 8 && prevStrong == 4) type = 16;
        types[i2] = type == 4 ? 2 : type;
        if (type & 7) prevStrong = type;
        prev = type;
      }
      for (var _i7 = from, _prev = prevType, _prevStrong = prevType; _i7 < to; _i7++) {
        var _type2 = types[_i7];
        if (_type2 == 128) {
          if (_i7 < to - 1 && _prev == types[_i7 + 1] && _prev & 24) _type2 = types[_i7] = _prev;else types[_i7] = 256;
        } else if (_type2 == 64) {
          var end = _i7 + 1;
          while (end < to && types[end] == 64) end++;
          var replace2 = _i7 && _prev == 8 || end < rTo && types[end] == 8 ? _prevStrong == 1 ? 1 : 8 : 256;
          for (var j = _i7; j < end; j++) types[j] = replace2;
          _i7 = end - 1;
        } else if (_type2 == 8 && _prevStrong == 1) {
          types[_i7] = 1;
        }
        _prev = _type2;
        if (_type2 & 7) _prevStrong = _type2;
      }
    }
  }
  function processBracketPairs(line, rFrom, rTo, isolates, outerType) {
    var oppositeType = outerType == 1 ? 2 : 1;
    for (var iI = 0, sI = 0, context = 0; iI <= isolates.length; iI++) {
      var from = iI ? isolates[iI - 1].to : rFrom,
        to = iI < isolates.length ? isolates[iI].from : rTo;
      for (var i2 = from, ch, br, type; i2 < to; i2++) {
        if (br = Brackets[ch = line.charCodeAt(i2)]) {
          if (br < 0) {
            for (var sJ = sI - 3; sJ >= 0; sJ -= 3) {
              if (BracketStack[sJ + 1] == -br) {
                var flags = BracketStack[sJ + 2];
                var type2 = flags & 2 ? outerType : !(flags & 4) ? 0 : flags & 1 ? oppositeType : outerType;
                if (type2) types[i2] = types[BracketStack[sJ]] = type2;
                sI = sJ;
                break;
              }
            }
          } else if (BracketStack.length == 189) {
            break;
          } else {
            BracketStack[sI++] = i2;
            BracketStack[sI++] = ch;
            BracketStack[sI++] = context;
          }
        } else if ((type = types[i2]) == 2 || type == 1) {
          var embed = type == outerType;
          context = embed ? 0 : 1;
          for (var _sJ = sI - 3; _sJ >= 0; _sJ -= 3) {
            var cur = BracketStack[_sJ + 2];
            if (cur & 2) break;
            if (embed) {
              BracketStack[_sJ + 2] |= 2;
            } else {
              if (cur & 4) break;
              BracketStack[_sJ + 2] |= 4;
            }
          }
        }
      }
    }
  }
  function processNeutrals(rFrom, rTo, isolates, outerType) {
    for (var iI = 0, prev = outerType; iI <= isolates.length; iI++) {
      var from = iI ? isolates[iI - 1].to : rFrom,
        to = iI < isolates.length ? isolates[iI].from : rTo;
      for (var i2 = from; i2 < to;) {
        var type = types[i2];
        if (type == 256) {
          var end = i2 + 1;
          for (;;) {
            if (end == to) {
              if (iI == isolates.length) break;
              end = isolates[iI++].to;
              to = iI < isolates.length ? isolates[iI].from : rTo;
            } else if (types[end] == 256) {
              end++;
            } else {
              break;
            }
          }
          var beforeL = prev == 1;
          var afterL = (end < rTo ? types[end] : outerType) == 1;
          var replace2 = beforeL == afterL ? beforeL ? 1 : 2 : outerType;
          for (var j = end, jI = iI, fromJ = jI ? isolates[jI - 1].to : rFrom; j > i2;) {
            if (j == fromJ) {
              j = isolates[--jI].from;
              fromJ = jI ? isolates[jI - 1].to : rFrom;
            }
            types[--j] = replace2;
          }
          i2 = end;
        } else {
          prev = type;
          i2++;
        }
      }
    }
  }
  function emitSpans(line, from, to, level, baseLevel, isolates, order) {
    var ourType = level % 2 ? 2 : 1;
    if (level % 2 == baseLevel % 2) {
      for (var iCh = from, iI = 0; iCh < to;) {
        var sameDir = true,
          isNum = false;
        if (iI == isolates.length || iCh < isolates[iI].from) {
          var next = types[iCh];
          if (next != ourType) {
            sameDir = false;
            isNum = next == 16;
          }
        }
        var recurse = !sameDir && ourType == 1 ? [] : null;
        var localLevel = sameDir ? level : level + 1;
        var iScan = iCh;
        run: for (;;) {
          if (iI < isolates.length && iScan == isolates[iI].from) {
            if (isNum) break run;
            var iso = isolates[iI];
            if (!sameDir) for (var upto = iso.to, jI = iI + 1;;) {
              if (upto == to) break run;
              if (jI < isolates.length && isolates[jI].from == upto) upto = isolates[jI++].to;else if (types[upto] == ourType) break run;else break;
            }
            iI++;
            if (recurse) {
              recurse.push(iso);
            } else {
              if (iso.from > iCh) order.push(new BidiSpan(iCh, iso.from, localLevel));
              var dirSwap = iso.direction == LTR != !(localLevel % 2);
              computeSectionOrder(line, dirSwap ? level + 1 : level, baseLevel, iso.inner, iso.from, iso.to, order);
              iCh = iso.to;
            }
            iScan = iso.to;
          } else if (iScan == to || (sameDir ? types[iScan] != ourType : types[iScan] == ourType)) {
            break;
          } else {
            iScan++;
          }
        }
        if (recurse) emitSpans(line, iCh, iScan, level + 1, baseLevel, recurse, order);else if (iCh < iScan) order.push(new BidiSpan(iCh, iScan, localLevel));
        iCh = iScan;
      }
    } else {
      for (var _iCh = to, _iI = isolates.length; _iCh > from;) {
        var _sameDir = true,
          _isNum = false;
        if (!_iI || _iCh > isolates[_iI - 1].to) {
          var _next2 = types[_iCh - 1];
          if (_next2 != ourType) {
            _sameDir = false;
            _isNum = _next2 == 16;
          }
        }
        var _recurse = !_sameDir && ourType == 1 ? [] : null;
        var _localLevel = _sameDir ? level : level + 1;
        var _iScan = _iCh;
        run: for (;;) {
          if (_iI && _iScan == isolates[_iI - 1].to) {
            if (_isNum) break run;
            var _iso = isolates[--_iI];
            if (!_sameDir) for (var _upto = _iso.from, _jI = _iI;;) {
              if (_upto == from) break run;
              if (_jI && isolates[_jI - 1].to == _upto) _upto = isolates[--_jI].from;else if (types[_upto - 1] == ourType) break run;else break;
            }
            if (_recurse) {
              _recurse.push(_iso);
            } else {
              if (_iso.to < _iCh) order.push(new BidiSpan(_iso.to, _iCh, _localLevel));
              var _dirSwap = _iso.direction == LTR != !(_localLevel % 2);
              computeSectionOrder(line, _dirSwap ? level + 1 : level, baseLevel, _iso.inner, _iso.from, _iso.to, order);
              _iCh = _iso.from;
            }
            _iScan = _iso.from;
          } else if (_iScan == from || (_sameDir ? types[_iScan - 1] != ourType : types[_iScan - 1] == ourType)) {
            break;
          } else {
            _iScan--;
          }
        }
        if (_recurse) emitSpans(line, _iScan, _iCh, level + 1, baseLevel, _recurse, order);else if (_iScan < _iCh) order.push(new BidiSpan(_iScan, _iCh, _localLevel));
        _iCh = _iScan;
      }
    }
  }
  function computeSectionOrder(line, level, baseLevel, isolates, from, to, order) {
    var outerType = level % 2 ? 2 : 1;
    computeCharTypes(line, from, to, isolates, outerType);
    processBracketPairs(line, from, to, isolates, outerType);
    processNeutrals(from, to, isolates, outerType);
    emitSpans(line, from, to, level, baseLevel, isolates, order);
  }
  function computeOrder(line, direction, isolates) {
    if (!line) return [new BidiSpan(0, 0, direction == RTL ? 1 : 0)];
    if (direction == LTR && !isolates.length && !BidiRE.test(line)) return trivialOrder(line.length);
    if (isolates.length) while (line.length > types.length) types[types.length] = 256;
    var order = [],
      level = direction == LTR ? 0 : 1;
    computeSectionOrder(line, level, level, isolates, 0, line.length, order);
    return order;
  }
  function trivialOrder(length) {
    return [new BidiSpan(0, length, 0)];
  }
  var movedOver = "";
  function moveVisually(line, order, dir, start, forward) {
    var _a2;
    var startIndex = start.head - line.from;
    var spanI = BidiSpan.find(order, startIndex, (_a2 = start.bidiLevel) !== null && _a2 !== void 0 ? _a2 : -1, start.assoc);
    var span = order[spanI],
      spanEnd = span.side(forward, dir);
    if (startIndex == spanEnd) {
      var nextI = spanI += forward ? 1 : -1;
      if (nextI < 0 || nextI >= order.length) return null;
      span = order[spanI = nextI];
      startIndex = span.side(!forward, dir);
      spanEnd = span.side(forward, dir);
    }
    var nextIndex = findClusterBreak2(line.text, startIndex, span.forward(forward, dir));
    if (nextIndex < span.from || nextIndex > span.to) nextIndex = spanEnd;
    movedOver = line.text.slice(Math.min(startIndex, nextIndex), Math.max(startIndex, nextIndex));
    var nextSpan = spanI == (forward ? order.length - 1 : 0) ? null : order[spanI + (forward ? 1 : -1)];
    if (nextSpan && nextIndex == spanEnd && nextSpan.level + (forward ? 0 : 1) < span.level) return EditorSelection.cursor(nextSpan.side(!forward, dir) + line.from, nextSpan.forward(forward, dir) ? 1 : -1, nextSpan.level);
    return EditorSelection.cursor(nextIndex + line.from, span.forward(forward, dir) ? -1 : 1, span.level);
  }
  function autoDirection(text, from, to) {
    for (var i2 = from; i2 < to; i2++) {
      var type = charType(text.charCodeAt(i2));
      if (type == 1) return LTR;
      if (type == 2 || type == 4) return RTL;
    }
    return LTR;
  }
  var clickAddsSelectionRange = Facet.define();
  var dragMovesSelection$1 = Facet.define();
  var mouseSelectionStyle = Facet.define();
  var exceptionSink = Facet.define();
  var updateListener = Facet.define();
  var inputHandler = Facet.define();
  var focusChangeEffect = Facet.define();
  var clipboardInputFilter = Facet.define();
  var clipboardOutputFilter = Facet.define();
  var perLineTextDirection = Facet.define({
    combine: function combine(values) {
      return values.some(function (x) {
        return x;
      });
    }
  });
  var nativeSelectionHidden = Facet.define({
    combine: function combine(values) {
      return values.some(function (x) {
        return x;
      });
    }
  });
  var scrollHandler = Facet.define();
  var ScrollTarget = function () {
    function _ScrollTarget(range, y, x, yMargin, xMargin, isSnapshot) {
      if (isSnapshot === void 0) {
        isSnapshot = false;
      }
      this.range = range;
      this.y = y;
      this.x = x;
      this.yMargin = yMargin;
      this.xMargin = xMargin;
      this.isSnapshot = isSnapshot;
    }
    var _proto37 = _ScrollTarget.prototype;
    _proto37.map = function map(changes) {
      return changes.empty ? this : new _ScrollTarget(this.range.map(changes), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
    };
    _proto37.clip = function clip(state) {
      return this.range.to <= state.doc.length ? this : new _ScrollTarget(EditorSelection.cursor(state.doc.length), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
    };
    return _ScrollTarget;
  }();
  var _scrollIntoView = StateEffect.define({
    map: function map(t2, ch) {
      return t2.map(ch);
    }
  });
  var setEditContextFormatting = StateEffect.define();
  function logException(state, exception, context) {
    var handler = state.facet(exceptionSink);
    if (handler.length) handler[0](exception);else if (window.onerror && window.onerror(String(exception), context, void 0, void 0, exception)) ;else if (context) console.error(context + ":", exception);else console.error(exception);
  }
  var editable = Facet.define({
    combine: function combine(values) {
      return values.length ? values[0] : true;
    }
  });
  var nextPluginID = 0;
  var viewPlugin = Facet.define({
    combine: function combine(plugins) {
      return plugins.filter(function (p, i2) {
        for (var j = 0; j < i2; j++) if (plugins[j].plugin == p.plugin) return false;
        return true;
      });
    }
  });
  var ViewPlugin = function () {
    function _ViewPlugin(id, create, domEventHandlers, domEventObservers, buildExtensions) {
      this.id = id;
      this.create = create;
      this.domEventHandlers = domEventHandlers;
      this.domEventObservers = domEventObservers;
      this.baseExtensions = buildExtensions(this);
      this.extension = this.baseExtensions.concat(viewPlugin.of({
        plugin: this,
        arg: void 0
      }));
    }
    var _proto38 = _ViewPlugin.prototype;
    _proto38.of = function of(arg) {
      return this.baseExtensions.concat(viewPlugin.of({
        plugin: this,
        arg: arg
      }));
    };
    _ViewPlugin.define = function define(create, spec) {
      var _ref3 = spec || {},
        eventHandlers = _ref3.eventHandlers,
        eventObservers = _ref3.eventObservers,
        provide = _ref3.provide,
        deco = _ref3.decorations;
      return new _ViewPlugin(nextPluginID++, create, eventHandlers, eventObservers, function (plugin) {
        var ext = [];
        if (deco) ext.push(decorations.of(function (view) {
          var pluginInst = view.plugin(plugin);
          return pluginInst ? deco(pluginInst) : Decoration.none;
        }));
        if (provide) ext.push(provide(plugin));
        return ext;
      });
    };
    _ViewPlugin.fromClass = function fromClass(cls, spec) {
      return _ViewPlugin.define(function (view, arg) {
        return new cls(view, arg);
      }, spec);
    };
    return _ViewPlugin;
  }();
  var PluginInstance = function () {
    function PluginInstance(spec) {
      this.spec = spec;
      this.mustUpdate = null;
      this.value = null;
    }
    var _proto39 = PluginInstance.prototype;
    _proto39.update = function update(view) {
      if (!this.value) {
        if (this.spec) {
          try {
            this.value = this.spec.plugin.create(view, this.spec.arg);
          } catch (_e) {
            logException(view.state, _e, "CodeMirror plugin crashed");
            this.deactivate();
          }
        }
      } else if (this.mustUpdate) {
        var _update = this.mustUpdate;
        this.mustUpdate = null;
        if (this.value.update) {
          try {
            this.value.update(_update);
          } catch (_e2) {
            logException(_update.state, _e2, "CodeMirror plugin crashed");
            if (this.value.destroy) try {
              this.value.destroy();
            } catch (_4) {}
            this.deactivate();
          }
        }
      }
      return this;
    };
    _proto39.destroy = function destroy(view) {
      var _a2;
      if ((_a2 = this.value) === null || _a2 === void 0 ? void 0 : _a2.destroy) {
        try {
          this.value.destroy();
        } catch (_e3) {
          logException(view.state, _e3, "CodeMirror plugin crashed");
        }
      }
    };
    _proto39.deactivate = function deactivate() {
      this.spec = this.value = null;
    };
    return _createClass(PluginInstance, [{
      key: "plugin",
      get: function get() {
        return this.spec && this.spec.plugin;
      }
    }]);
  }();
  var editorAttributes = Facet.define();
  var contentAttributes = Facet.define();
  var decorations = Facet.define();
  var blockWrappers = Facet.define();
  var outerDecorations = Facet.define();
  var atomicRanges = Facet.define();
  var bidiIsolatedRanges = Facet.define();
  function getIsolatedRanges(view, line) {
    var isolates = view.state.facet(bidiIsolatedRanges);
    if (!isolates.length) return isolates;
    var sets = isolates.map(function (i2) {
      return i2 instanceof Function ? i2(view) : i2;
    });
    var result = [];
    RangeSet.spans(sets, line.from, line.to, {
      point: function point() {},
      span: function span(fromDoc, toDoc, active2, open) {
        var from = fromDoc - line.from,
          to = toDoc - line.from;
        var level = result;
        for (var i2 = active2.length - 1; i2 >= 0; i2--, open--) {
          var direction = active2[i2].spec.bidiIsolate,
            update = void 0;
          if (direction == null) direction = autoDirection(line.text, from, to);
          if (open > 0 && level.length && (update = level[level.length - 1]).to == from && update.direction == direction) {
            update.to = to;
            level = update.inner;
          } else {
            var add2 = {
              from: from,
              to: to,
              direction: direction,
              inner: []
            };
            level.push(add2);
            level = add2.inner;
          }
        }
      }
    });
    return result;
  }
  var scrollMargins = Facet.define();
  function getScrollMargins(view) {
    var left = 0,
      right = 0,
      top2 = 0,
      bottom = 0;
    for (var _iterator32 = _createForOfIteratorHelperLoose(view.state.facet(scrollMargins)), _step32; !(_step32 = _iterator32()).done;) {
      var source = _step32.value;
      var m = source(view);
      if (m) {
        if (m.left != null) left = Math.max(left, m.left);
        if (m.right != null) right = Math.max(right, m.right);
        if (m.top != null) top2 = Math.max(top2, m.top);
        if (m.bottom != null) bottom = Math.max(bottom, m.bottom);
      }
    }
    return {
      left: left,
      right: right,
      top: top2,
      bottom: bottom
    };
  }
  var styleModule = Facet.define();
  var ChangedRange = function () {
    function _ChangedRange(fromA, toA, fromB, toB) {
      this.fromA = fromA;
      this.toA = toA;
      this.fromB = fromB;
      this.toB = toB;
    }
    var _proto40 = _ChangedRange.prototype;
    _proto40.join = function join(other) {
      return new _ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
    };
    _proto40.addToSet = function addToSet(set) {
      var i2 = set.length,
        me = this;
      for (; i2 > 0; i2--) {
        var range = set[i2 - 1];
        if (range.fromA > me.toA) continue;
        if (range.toA < me.fromA) break;
        me = me.join(range);
        set.splice(i2 - 1, 1);
      }
      set.splice(i2, 0, me);
      return set;
    };
    _ChangedRange.extendWithRanges = function extendWithRanges(diff, ranges) {
      if (ranges.length == 0) return diff;
      var result = [];
      for (var dI = 0, rI = 0, off = 0;;) {
        var nextD = dI < diff.length ? diff[dI].fromB : 1e9;
        var nextR = rI < ranges.length ? ranges[rI] : 1e9;
        var fromB = Math.min(nextD, nextR);
        if (fromB == 1e9) break;
        var fromA = fromB + off,
          toB = fromB,
          toA = fromA;
        for (;;) {
          if (rI < ranges.length && ranges[rI] <= toB) {
            var end = ranges[rI + 1];
            rI += 2;
            toB = Math.max(toB, end);
            for (var i2 = dI; i2 < diff.length && diff[i2].fromB <= toB; i2++) off = diff[i2].toA - diff[i2].toB;
            toA = Math.max(toA, end + off);
          } else if (dI < diff.length && diff[dI].fromB <= toB) {
            var next = diff[dI++];
            toB = Math.max(toB, next.toB);
            toA = Math.max(toA, next.toA);
            off = next.toA - next.toB;
          } else {
            break;
          }
        }
        result.push(new _ChangedRange(fromA, toA, fromB, toB));
      }
      return result;
    };
    return _ChangedRange;
  }();
  var ViewUpdate = function () {
    function _ViewUpdate(view, state, transactions) {
      this.view = view;
      this.state = state;
      this.transactions = transactions;
      this.flags = 0;
      this.startState = view.state;
      this.changes = ChangeSet.empty(this.startState.doc.length);
      for (var _iterator33 = _createForOfIteratorHelperLoose(transactions), _step33; !(_step33 = _iterator33()).done;) {
        var tr = _step33.value;
        this.changes = this.changes.compose(tr.changes);
      }
      var changedRanges = [];
      this.changes.iterChangedRanges(function (fromA, toA, fromB, toB) {
        return changedRanges.push(new ChangedRange(fromA, toA, fromB, toB));
      });
      this.changedRanges = changedRanges;
    }
    _ViewUpdate.create = function create(view, state, transactions) {
      return new _ViewUpdate(view, state, transactions);
    };
    return _createClass(_ViewUpdate, [{
      key: "viewportChanged",
      get: function get() {
        return (this.flags & 4) > 0;
      }
    }, {
      key: "viewportMoved",
      get: function get() {
        return (this.flags & 8) > 0;
      }
    }, {
      key: "heightChanged",
      get: function get() {
        return (this.flags & 2) > 0;
      }
    }, {
      key: "geometryChanged",
      get: function get() {
        return this.docChanged || (this.flags & (16 | 2)) > 0;
      }
    }, {
      key: "focusChanged",
      get: function get() {
        return (this.flags & 1) > 0;
      }
    }, {
      key: "docChanged",
      get: function get() {
        return !this.changes.empty;
      }
    }, {
      key: "selectionSet",
      get: function get() {
        return this.transactions.some(function (tr) {
          return tr.selection;
        });
      }
    }, {
      key: "empty",
      get: function get() {
        return this.flags == 0 && this.transactions.length == 0;
      }
    }]);
  }();
  var noChildren = [];
  var Tile = function () {
    function Tile(dom, length, flags) {
      if (flags === void 0) {
        flags = 0;
      }
      this.dom = dom;
      this.length = length;
      this.flags = flags;
      this.parent = null;
      dom.cmTile = this;
    }
    var _proto41 = Tile.prototype;
    _proto41.isWidget = function isWidget() {
      return false;
    };
    _proto41.isComposite = function isComposite() {
      return false;
    };
    _proto41.isLine = function isLine() {
      return false;
    };
    _proto41.isText = function isText() {
      return false;
    };
    _proto41.isBlock = function isBlock() {
      return false;
    };
    _proto41.sync = function sync(track) {
      this.flags |= 2;
      if (this.flags & 4) {
        this.flags &= ~4;
        var attrs = this.domAttrs;
        if (attrs) setAttrs(this.dom, attrs);
      }
    };
    _proto41.toString = function toString() {
      return this.constructor.name + (this.children.length ? "(" + this.children + ")" : "") + (this.breakAfter ? "#" : "");
    };
    _proto41.destroy = function destroy() {
      this.parent = null;
    };
    _proto41.setDOM = function setDOM(dom) {
      this.dom = dom;
      dom.cmTile = this;
    };
    _proto41.posBefore = function posBefore(tile, start) {
      if (start === void 0) {
        start = this.posAtStart;
      }
      var pos = start;
      for (var _iterator34 = _createForOfIteratorHelperLoose(this.children), _step34; !(_step34 = _iterator34()).done;) {
        var child = _step34.value;
        if (child == tile) return pos;
        pos += child.length + child.breakAfter;
      }
      throw new RangeError("Invalid child in posBefore");
    };
    _proto41.posAfter = function posAfter(tile) {
      return this.posBefore(tile) + tile.length;
    };
    _proto41.covers = function covers(side) {
      return true;
    };
    _proto41.coordsIn = function coordsIn(pos, side, rtl) {
      return null;
    };
    _proto41.domPosFor = function domPosFor(off, side) {
      var index = domIndex(this.dom);
      var after = this.length ? off > 0 : side > 0;
      return new DOMPos(this.parent.dom, index + (after ? 1 : 0), off == 0 || off == this.length);
    };
    _proto41.markDirty = function markDirty(attrs) {
      this.flags &= ~2;
      if (attrs) this.flags |= 4;
      if (this.parent && this.parent.flags & 2) this.parent.markDirty(false);
    };
    Tile.get = function get(dom) {
      return dom.cmTile;
    };
    return _createClass(Tile, [{
      key: "breakAfter",
      get: function get() {
        return this.flags & 1;
      }
    }, {
      key: "children",
      get: function get() {
        return noChildren;
      }
    }, {
      key: "isHidden",
      get: function get() {
        return false;
      }
    }, {
      key: "domAttrs",
      get: function get() {
        return null;
      }
    }, {
      key: "posAtStart",
      get: function get() {
        return this.parent ? this.parent.posBefore(this) : 0;
      }
    }, {
      key: "posAtEnd",
      get: function get() {
        return this.posAtStart + this.length;
      }
    }, {
      key: "overrideDOMText",
      get: function get() {
        return null;
      }
    }, {
      key: "root",
      get: function get() {
        for (var t2 = this; t2; t2 = t2.parent) if (t2 instanceof DocTile) return t2;
        return null;
      }
    }]);
  }();
  var CompositeTile = function (_Tile) {
    function CompositeTile(dom) {
      var _this10;
      _this10 = _Tile.call(this, dom, 0) || this;
      _this10._children = [];
      return _this10;
    }
    _inheritsLoose(CompositeTile, _Tile);
    var _proto42 = CompositeTile.prototype;
    _proto42.isComposite = function isComposite() {
      return true;
    };
    _proto42.append = function append(child) {
      this.children.push(child);
      child.parent = this;
    };
    _proto42.sync = function sync(track) {
      if (this.flags & 2) return;
      _Tile.prototype.sync.call(this, track);
      var parent = this.dom,
        prev = null,
        next;
      var tracking = (track === null || track === void 0 ? void 0 : track.node) == parent ? track : null;
      var length = 0;
      for (var _iterator35 = _createForOfIteratorHelperLoose(this.children), _step35; !(_step35 = _iterator35()).done;) {
        var child = _step35.value;
        child.sync(track);
        length += child.length + child.breakAfter;
        next = prev ? prev.nextSibling : parent.firstChild;
        if (tracking && next != child.dom) tracking.written = true;
        if (child.dom.parentNode == parent) {
          while (next && next != child.dom) next = rm$1(next);
        } else {
          parent.insertBefore(child.dom, next);
        }
        prev = child.dom;
      }
      next = prev ? prev.nextSibling : parent.firstChild;
      if (tracking && next) tracking.written = true;
      while (next) next = rm$1(next);
      this.length = length;
    };
    return _createClass(CompositeTile, [{
      key: "children",
      get: function get() {
        return this._children;
      }
    }, {
      key: "lastChild",
      get: function get() {
        return this.children.length ? this.children[this.children.length - 1] : null;
      }
    }]);
  }(Tile);
  function rm$1(dom) {
    var next = dom.nextSibling;
    dom.parentNode.removeChild(dom);
    return next;
  }
  var DocTile = function (_CompositeTile) {
    function DocTile(view, dom) {
      var _this11;
      _this11 = _CompositeTile.call(this, dom) || this;
      _this11.view = view;
      return _this11;
    }
    _inheritsLoose(DocTile, _CompositeTile);
    var _proto43 = DocTile.prototype;
    _proto43.owns = function owns(tile) {
      for (; tile; tile = tile.parent) if (tile == this) return true;
      return false;
    };
    _proto43.isBlock = function isBlock() {
      return true;
    };
    _proto43.nearest = function nearest(dom) {
      for (;;) {
        if (!dom) return null;
        var tile = Tile.get(dom);
        if (tile && this.owns(tile)) return tile;
        dom = dom.parentNode;
      }
    };
    _proto43.blockTiles = function blockTiles(f) {
      for (var stack = [], cur = this, i2 = 0, pos = 0;;) {
        if (i2 == cur.children.length) {
          if (!stack.length) return;
          cur = cur.parent;
          if (cur.breakAfter) pos++;
          i2 = stack.pop();
        } else {
          var next = cur.children[i2++];
          if (next instanceof BlockWrapperTile) {
            stack.push(i2);
            cur = next;
            i2 = 0;
          } else {
            var end = pos + next.length;
            var result = f(next, pos);
            if (result !== void 0) return result;
            pos = end + next.breakAfter;
          }
        }
      }
    };
    _proto43.resolveBlock = function resolveBlock(pos, side) {
      var before,
        beforeOff = -1,
        after,
        afterOff = -1;
      this.blockTiles(function (tile, off) {
        var end = off + tile.length;
        if (pos >= off && pos <= end) {
          if (tile.isWidget() && side >= -1 && side <= 1) {
            if (tile.flags & 32) return true;
            if (tile.flags & 16) before = void 0;
          }
          if ((off < pos || pos == end && (side < -1 ? tile.length : tile.covers(1))) && (!before || !tile.isWidget() && before.isWidget())) {
            before = tile;
            beforeOff = pos - off;
          }
          if ((end > pos || pos == off && (side > 1 ? tile.length : tile.covers(-1))) && (!after || !tile.isWidget() && after.isWidget())) {
            after = tile;
            afterOff = pos - off;
          }
        }
      });
      if (!before && !after) throw new Error("No tile at position " + pos);
      return before && side < 0 || !after ? {
        tile: before,
        offset: beforeOff
      } : {
        tile: after,
        offset: afterOff
      };
    };
    return DocTile;
  }(CompositeTile);
  var BlockWrapperTile = function (_CompositeTile2) {
    function _BlockWrapperTile(dom, wrapper) {
      var _this12;
      _this12 = _CompositeTile2.call(this, dom) || this;
      _this12.wrapper = wrapper;
      return _this12;
    }
    _inheritsLoose(_BlockWrapperTile, _CompositeTile2);
    var _proto44 = _BlockWrapperTile.prototype;
    _proto44.isBlock = function isBlock() {
      return true;
    };
    _proto44.covers = function covers(side) {
      if (!this.children.length) return false;
      return side < 0 ? this.children[0].covers(-1) : this.lastChild.covers(1);
    };
    _BlockWrapperTile.of = function of(wrapper, dom) {
      var tile = new _BlockWrapperTile(dom || document.createElement(wrapper.tagName), wrapper);
      if (!dom) tile.flags |= 4;
      return tile;
    };
    return _createClass(_BlockWrapperTile, [{
      key: "domAttrs",
      get: function get() {
        return this.wrapper.attributes;
      }
    }]);
  }(CompositeTile);
  var LineTile = function (_CompositeTile3) {
    function _LineTile(dom, attrs) {
      var _this13;
      _this13 = _CompositeTile3.call(this, dom) || this;
      _this13.attrs = attrs;
      return _this13;
    }
    _inheritsLoose(_LineTile, _CompositeTile3);
    var _proto45 = _LineTile.prototype;
    _proto45.isLine = function isLine() {
      return true;
    };
    _LineTile.start = function start(attrs, dom, keepAttrs) {
      var line = new _LineTile(dom || document.createElement("div"), attrs);
      if (!dom || !keepAttrs) line.flags |= 4;
      return line;
    };
    _proto45.resolveInline = function resolveInline(pos, side, forCoords) {
      var before = null,
        beforeOff = -1,
        after = null,
        afterOff = -1;
      function scan(tile, pos2) {
        for (var i2 = 0, off = 0; i2 < tile.children.length && off <= pos2; i2++) {
          var child = tile.children[i2],
            end = off + child.length;
          if (end >= pos2) {
            if (child.isComposite()) {
              scan(child, pos2 - off);
            } else if ((!after || after.isHidden && (side > 0 && !(after.flags & 32) || forCoords && onSameLine(after, child))) && (end > pos2 || child.flags & 32 && side <= 1)) {
              after = child;
              afterOff = pos2 - off;
            } else if (off < pos2 || child.flags & 16 && !child.isHidden && side >= -1) {
              before = child;
              beforeOff = pos2 - off;
            }
          }
          off = end;
        }
      }
      scan(this, pos);
      var target = (side < 0 ? before : after) || before || after;
      return target ? {
        tile: target,
        offset: target == before ? beforeOff : afterOff
      } : null;
    };
    _proto45.coordsIn = function coordsIn(pos, side, rtl) {
      var found = this.resolveInline(pos, side, true);
      if (!found) return fallbackRect(this);
      return found.tile.coordsIn(Math.max(0, found.offset), side, rtl);
    };
    _proto45.domIn = function domIn(pos, side) {
      var found = this.resolveInline(pos, side);
      if (found) {
        var tile = found.tile,
          offset = found.offset;
        if (this.dom.contains(tile.dom)) {
          if (tile.isText()) return new DOMPos(tile.dom, Math.min(tile.dom.nodeValue.length, offset));
          return tile.domPosFor(offset, tile.flags & 16 ? 1 : tile.flags & 32 ? -1 : side);
        }
        var parent = found.tile.parent,
          saw = false;
        for (var _iterator36 = _createForOfIteratorHelperLoose(parent.children), _step36; !(_step36 = _iterator36()).done;) {
          var ch = _step36.value;
          if (saw) return new DOMPos(ch.dom, 0);
          if (ch == found.tile) {
            saw = true;
          }
        }
      }
      return new DOMPos(this.dom, 0);
    };
    return _createClass(_LineTile, [{
      key: "domAttrs",
      get: function get() {
        return this.attrs;
      }
    }]);
  }(CompositeTile);
  function fallbackRect(tile) {
    var last = tile.dom.lastChild;
    if (!last) return tile.dom.getBoundingClientRect();
    var rects = clientRectsFor(last);
    return rects[rects.length - 1] || null;
  }
  function onSameLine(a, b) {
    var posA = a.coordsIn(0, 1),
      posB = b.coordsIn(0, 1);
    return posA && posB && posB.top < posA.bottom;
  }
  var MarkTile = function (_CompositeTile4) {
    function _MarkTile(dom, mark) {
      var _this14;
      _this14 = _CompositeTile4.call(this, dom) || this;
      _this14.mark = mark;
      return _this14;
    }
    _inheritsLoose(_MarkTile, _CompositeTile4);
    _MarkTile.of = function of(mark, dom) {
      var tile = new _MarkTile(dom || document.createElement(mark.tagName), mark);
      if (!dom) tile.flags |= 4;
      return tile;
    };
    return _createClass(_MarkTile, [{
      key: "domAttrs",
      get: function get() {
        return this.mark.attrs;
      }
    }]);
  }(CompositeTile);
  var TextTile = function (_Tile2) {
    function _TextTile(dom, text) {
      var _this15;
      _this15 = _Tile2.call(this, dom, text.length) || this;
      _this15.text = text;
      return _this15;
    }
    _inheritsLoose(_TextTile, _Tile2);
    var _proto46 = _TextTile.prototype;
    _proto46.sync = function sync(track) {
      if (this.flags & 2) return;
      _Tile2.prototype.sync.call(this, track);
      if (this.dom.nodeValue != this.text) {
        if (track && track.node == this.dom) track.written = true;
        this.dom.nodeValue = this.text;
      }
    };
    _proto46.isText = function isText() {
      return true;
    };
    _proto46.toString = function toString() {
      return JSON.stringify(this.text);
    };
    _proto46.coordsIn = function coordsIn(pos, side, rtl) {
      var length = this.dom.nodeValue.length;
      if (pos > length) pos = length;
      var from = pos,
        to = pos,
        flatten2 = 0;
      if (pos == 0 && side < 0 || pos == length && side >= 0) {
        if (!(browser.chrome || browser.gecko)) {
          if (pos) {
            from--;
            flatten2 = 1;
          } else if (to < length) {
            to++;
            flatten2 = -1;
          }
        }
      } else {
        if (side < 0) from--;else if (to < length) to++;
      }
      var rects = textRange(this.dom, from, to).getClientRects();
      if (!rects.length) return null;
      var rect = rects[(flatten2 ? flatten2 < 0 : side >= 0) ? 0 : rects.length - 1];
      if (browser.safari && !flatten2 && rect.width == 0) rect = Array.prototype.find.call(rects, function (r) {
        return r.width;
      }) || rect;
      return rtl == null ? rect : flattenRect(rect, (flatten2 ? flatten2 > 0 : side < 0) == rtl);
    };
    _TextTile.of = function of(text, dom) {
      var tile = new _TextTile(dom || document.createTextNode(text), text);
      if (!dom) tile.flags |= 2;
      return tile;
    };
    return _TextTile;
  }(Tile);
  var WidgetTile = function (_Tile3) {
    function _WidgetTile(dom, length, widget, flags) {
      var _this16;
      _this16 = _Tile3.call(this, dom, length, flags) || this;
      _this16.widget = widget;
      return _this16;
    }
    _inheritsLoose(_WidgetTile, _Tile3);
    var _proto47 = _WidgetTile.prototype;
    _proto47.isWidget = function isWidget() {
      return true;
    };
    _proto47.covers = function covers(side) {
      if (this.flags & 48) return false;
      return (this.flags & (side < 0 ? 64 : 128)) > 0;
    };
    _proto47.coordsIn = function coordsIn(pos, side) {
      return this.coordsInWidget(pos, side, false);
    };
    _proto47.coordsInWidget = function coordsInWidget(pos, side, block) {
      var custom = this.widget.coordsAt(this.dom, pos, side);
      if (custom) return custom;
      if (block) {
        return flattenRect(this.dom.getBoundingClientRect(), this.length ? pos == 0 : side <= 0);
      } else {
        var rects = this.dom.getClientRects(),
          rect = null;
        if (!rects.length) return null;
        var fromBack = this.flags & 16 ? true : this.flags & 32 ? false : pos > 0;
        for (var i2 = fromBack ? rects.length - 1 : 0;; i2 += fromBack ? -1 : 1) {
          rect = rects[i2];
          if (pos > 0 ? i2 == 0 : i2 == rects.length - 1 || rect.top < rect.bottom) break;
        }
        return flattenRect(rect, !fromBack);
      }
    };
    _proto47.destroy = function destroy() {
      _Tile3.prototype.destroy.call(this);
      this.widget.destroy(this.dom);
    };
    _WidgetTile.of = function of(widget, view, length, flags, dom) {
      if (!dom) {
        dom = widget.toDOM(view);
        if (!widget.editable) dom.contentEditable = "false";
      }
      return new _WidgetTile(dom, length, widget, flags);
    };
    return _createClass(_WidgetTile, [{
      key: "isHidden",
      get: function get() {
        return this.widget.isHidden;
      }
    }, {
      key: "overrideDOMText",
      get: function get() {
        if (!this.length) return Text.empty;
        var root = this.root;
        if (!root) return Text.empty;
        var start = this.posAtStart;
        return root.view.state.doc.slice(start, start + this.length);
      }
    }]);
  }(Tile);
  var WidgetBufferTile = function (_Tile4) {
    function WidgetBufferTile(flags) {
      var img = document.createElement("img");
      img.className = "cm-widgetBuffer";
      img.setAttribute("aria-hidden", "true");
      return _Tile4.call(this, img, 0, flags) || this;
    }
    _inheritsLoose(WidgetBufferTile, _Tile4);
    var _proto48 = WidgetBufferTile.prototype;
    _proto48.coordsIn = function coordsIn(pos, side, rtl) {
      var rect = this.dom.getBoundingClientRect();
      return rtl == null ? rect : flattenRect(rect, side > 0 == rtl);
    };
    return _createClass(WidgetBufferTile, [{
      key: "isHidden",
      get: function get() {
        return true;
      }
    }, {
      key: "overrideDOMText",
      get: function get() {
        return Text.empty;
      }
    }]);
  }(Tile);
  var TilePointer = function () {
    function TilePointer(top2) {
      this.index = 0;
      this.beforeBreak = false;
      this.parents = [];
      this.tile = top2;
    }
    var _proto49 = TilePointer.prototype;
    _proto49.advance = function advance(dist2, side, walker) {
      var tile = this.tile,
        index = this.index,
        beforeBreak = this.beforeBreak,
        parents = this.parents;
      while (dist2 || side > 0) {
        if (!tile.isComposite()) {
          var len = tile.length;
          if (index < len && dist2) {
            var take = Math.min(dist2, len - index);
            if (walker) walker.skip(tile, index, index + take);
            dist2 -= take;
            index += take;
          }
          if (index == len) {
            beforeBreak = !!tile.breakAfter;
            var _parents$pop = parents.pop();
            tile = _parents$pop.tile;
            index = _parents$pop.index;
            index++;
          } else if (!dist2) {
            break;
          }
        } else if (beforeBreak) {
          if (!dist2) break;
          if (walker) walker.break();
          dist2--;
          beforeBreak = false;
        } else if (index == tile.children.length) {
          if (!dist2 && !parents.length) break;
          if (walker) walker.leave(tile);
          beforeBreak = !!tile.breakAfter;
          var _parents$pop2 = parents.pop();
          tile = _parents$pop2.tile;
          index = _parents$pop2.index;
          index++;
        } else {
          var next = tile.children[index],
            brk = next.breakAfter;
          if ((side > 0 ? next.length <= dist2 : next.length < dist2) && (!walker || walker.skip(next, 0, next.length) !== false || !next.isComposite)) {
            beforeBreak = !!brk;
            index++;
            dist2 -= next.length;
          } else {
            parents.push({
              tile: tile,
              index: index
            });
            tile = next;
            index = 0;
            if (walker && next.isComposite()) walker.enter(next);
          }
        }
      }
      this.tile = tile;
      this.index = index;
      this.beforeBreak = beforeBreak;
      return this;
    };
    return _createClass(TilePointer, [{
      key: "root",
      get: function get() {
        return this.parents.length ? this.parents[0].tile : this.tile;
      }
    }]);
  }();
  var OpenWrapper = function OpenWrapper(from, to, wrapper, rank) {
    this.from = from;
    this.to = to;
    this.wrapper = wrapper;
    this.rank = rank;
  };
  var TileBuilder = function () {
    function TileBuilder(cache, root, blockWrappers2) {
      this.cache = cache;
      this.root = root;
      this.blockWrappers = blockWrappers2;
      this.curLine = null;
      this.lastBlock = null;
      this.afterWidget = null;
      this.pos = 0;
      this.wrappers = [];
      this.wrapperPos = 0;
    }
    var _proto50 = TileBuilder.prototype;
    _proto50.addText = function addText(text, marks2, openStart, tile) {
      var _a2;
      this.flushBuffer();
      var parent = this.ensureMarks(marks2, openStart);
      var prev = parent.lastChild;
      if (prev && prev.isText() && !(prev.flags & 8) && prev.length + text.length < 512) {
        this.cache.reused.set(prev, 2);
        var tile2 = parent.children[parent.children.length - 1] = new TextTile(prev.dom, prev.text + text);
        tile2.parent = parent;
      } else {
        parent.append(tile || TextTile.of(text, (_a2 = this.cache.find(TextTile)) === null || _a2 === void 0 ? void 0 : _a2.dom));
      }
      this.pos += text.length;
      this.afterWidget = null;
    };
    _proto50.addComposition = function addComposition(composition, context) {
      var line = this.curLine;
      if (line.dom != context.line.dom) {
        line.setDOM(this.cache.reused.has(context.line) ? freeNode(context.line.dom) : context.line.dom);
        this.cache.reused.set(context.line, 2);
      }
      var head = line;
      for (var i2 = context.marks.length - 1; i2 >= 0; i2--) {
        var mark = context.marks[i2];
        var last = head.lastChild;
        if (last instanceof MarkTile && last.mark.eq(mark.mark)) {
          if (last.dom != mark.dom) last.setDOM(freeNode(mark.dom));
          head = last;
        } else {
          if (this.cache.reused.get(mark)) {
            var tile = Tile.get(mark.dom);
            if (tile) tile.setDOM(freeNode(mark.dom));
          }
          var nw = MarkTile.of(mark.mark, mark.dom);
          head.append(nw);
          head = nw;
        }
        this.cache.reused.set(mark, 2);
      }
      var oldTile = Tile.get(composition.text);
      if (oldTile) this.cache.reused.set(oldTile, 2);
      var text = new TextTile(composition.text, composition.text.nodeValue);
      text.flags |= 8;
      this.pos = composition.range.toB;
      head.append(text);
    };
    _proto50.addInlineWidget = function addInlineWidget(widget, marks2, openStart) {
      var noSpace = this.afterWidget && widget.flags & 48 && (this.afterWidget.flags & 48) == (widget.flags & 48);
      if (!noSpace) this.flushBuffer();
      var parent = this.ensureMarks(marks2, openStart);
      if (!noSpace && !(widget.flags & 16)) parent.append(this.getBuffer(1));
      parent.append(widget);
      this.pos += widget.length;
      this.afterWidget = widget;
    };
    _proto50.addMark = function addMark(tile, marks2, openStart) {
      this.flushBuffer();
      var parent = this.ensureMarks(marks2, openStart);
      parent.append(tile);
      this.pos += tile.length;
      this.afterWidget = null;
    };
    _proto50.addBlockWidget = function addBlockWidget(widget) {
      this.getBlockPos().append(widget);
      this.pos += widget.length;
      this.lastBlock = widget;
      this.endLine();
    };
    _proto50.continueWidget = function continueWidget(length) {
      var widget = this.afterWidget || this.lastBlock;
      widget.length += length;
      this.pos += length;
    };
    _proto50.addLineStart = function addLineStart(attrs, dom) {
      var _a2;
      if (!attrs) attrs = lineBaseAttrs;
      var tile = LineTile.start(attrs, dom || ((_a2 = this.cache.find(LineTile)) === null || _a2 === void 0 ? void 0 : _a2.dom), !!dom);
      this.getBlockPos().append(this.lastBlock = this.curLine = tile);
    };
    _proto50.addLine = function addLine(tile) {
      this.getBlockPos().append(tile);
      this.pos += tile.length;
      this.lastBlock = tile;
      this.endLine();
    };
    _proto50.addBreak = function addBreak() {
      this.lastBlock.flags |= 1;
      this.endLine();
      this.pos++;
    };
    _proto50.addLineStartIfNotCovered = function addLineStartIfNotCovered(attrs) {
      if (!this.blockPosCovered()) this.addLineStart(attrs);
    };
    _proto50.ensureLine = function ensureLine(attrs) {
      if (!this.curLine) this.addLineStart(attrs);
    };
    _proto50.ensureMarks = function ensureMarks(marks2, openStart) {
      var _this17 = this;
      var _a2;
      var parent = this.curLine;
      var _loop5 = function _loop5() {
        var mark = marks2[i2],
          last;
        if (openStart > 0 && (last = parent.lastChild) && last instanceof MarkTile && last.mark.eq(mark)) {
          parent = last;
          openStart--;
        } else {
          var tile = MarkTile.of(mark, (_a2 = _this17.cache.find(MarkTile, function (m) {
            return m.mark.eq(mark);
          })) === null || _a2 === void 0 ? void 0 : _a2.dom);
          parent.append(tile);
          parent = tile;
          openStart = 0;
        }
      };
      for (var i2 = marks2.length - 1; i2 >= 0; i2--) {
        _loop5();
      }
      return parent;
    };
    _proto50.endLine = function endLine() {
      if (this.curLine) {
        this.flushBuffer();
        var last = this.curLine.lastChild;
        if (!last || !hasContent(this.curLine, false) || last.dom.nodeName != "BR" && last.isWidget() && !(browser.ios && hasContent(this.curLine, true))) this.curLine.append(this.cache.findWidget(BreakWidget, 0, 32) || new WidgetTile(BreakWidget.toDOM(), 0, BreakWidget, 32));
        this.curLine = this.afterWidget = null;
      }
    };
    _proto50.updateBlockWrappers = function updateBlockWrappers() {
      if (this.wrapperPos > this.pos + 1e4) {
        this.blockWrappers.goto(this.pos);
        this.wrappers.length = 0;
      }
      for (var i2 = this.wrappers.length - 1; i2 >= 0; i2--) if (this.wrappers[i2].to < this.pos) this.wrappers.splice(i2, 1);
      for (var cur = this.blockWrappers; cur.value && cur.from <= this.pos; cur.next()) if (cur.to >= this.pos) {
        var rank = cur.rank * 102 + cur.value.rank;
        var wrap = new OpenWrapper(cur.from, cur.to, cur.value, rank),
          _i8 = this.wrappers.length;
        while (_i8 > 0 && (this.wrappers[_i8 - 1].rank - wrap.rank || this.wrappers[_i8 - 1].to - wrap.to) < 0) _i8--;
        this.wrappers.splice(_i8, 0, wrap);
      }
      this.wrapperPos = this.pos;
    };
    _proto50.getBlockPos = function getBlockPos() {
      var _this18 = this;
      var _a2;
      this.updateBlockWrappers();
      var parent = this.root;
      var _loop6 = function _loop6() {
        var wrap = _step37.value;
        var last = parent.lastChild;
        if (wrap.from < _this18.pos && last instanceof BlockWrapperTile && last.wrapper.eq(wrap.wrapper)) {
          parent = last;
        } else {
          var tile = BlockWrapperTile.of(wrap.wrapper, (_a2 = _this18.cache.find(BlockWrapperTile, function (t2) {
            return t2.wrapper.eq(wrap.wrapper);
          })) === null || _a2 === void 0 ? void 0 : _a2.dom);
          parent.append(tile);
          parent = tile;
        }
      };
      for (var _iterator37 = _createForOfIteratorHelperLoose(this.wrappers), _step37; !(_step37 = _iterator37()).done;) {
        _loop6();
      }
      return parent;
    };
    _proto50.blockPosCovered = function blockPosCovered() {
      var last = this.lastBlock;
      return last != null && !last.breakAfter && (!last.isWidget() || (last.flags & (32 | 128)) > 0);
    };
    _proto50.getBuffer = function getBuffer(side) {
      var flags = 2 | (side < 0 ? 16 : 32);
      var found = this.cache.find(WidgetBufferTile, void 0, 1);
      if (found) found.flags = flags;
      return found || new WidgetBufferTile(flags);
    };
    _proto50.flushBuffer = function flushBuffer() {
      if (this.afterWidget && !(this.afterWidget.flags & 32)) {
        this.afterWidget.parent.append(this.getBuffer(-1));
        this.afterWidget = null;
      }
    };
    return TileBuilder;
  }();
  var TextStream = function () {
    function TextStream(doc2) {
      this.skipCount = 0;
      this.text = "";
      this.textOff = 0;
      this.cursor = doc2.iter();
    }
    var _proto51 = TextStream.prototype;
    _proto51.skip = function skip(len) {
      if (this.textOff + len <= this.text.length) {
        this.textOff += len;
      } else {
        this.skipCount += len - (this.text.length - this.textOff);
        this.text = "";
        this.textOff = 0;
      }
    };
    _proto51.next = function next(maxLen) {
      if (this.textOff == this.text.length) {
        var _this$cursor$next2 = this.cursor.next(this.skipCount),
          value = _this$cursor$next2.value,
          lineBreak = _this$cursor$next2.lineBreak,
          done = _this$cursor$next2.done;
        this.skipCount = 0;
        if (done) throw new Error("Ran out of text content when drawing inline views");
        this.text = value;
        var len = this.textOff = Math.min(maxLen, value.length);
        return lineBreak ? null : value.slice(0, len);
      }
      var end = Math.min(this.text.length, this.textOff + maxLen);
      var chars = this.text.slice(this.textOff, end);
      this.textOff = end;
      return chars;
    };
    return TextStream;
  }();
  var buckets = [WidgetTile, LineTile, TextTile, MarkTile, WidgetBufferTile, BlockWrapperTile, DocTile];
  for (var i2 = 0; i2 < buckets.length; i2++) buckets[i2].bucket = i2;
  var TileCache = function () {
    function TileCache(view) {
      this.view = view;
      this.buckets = buckets.map(function () {
        return [];
      });
      this.index = buckets.map(function () {
        return 0;
      });
      this.reused = new Map();
    }
    var _proto52 = TileCache.prototype;
    _proto52.add = function add(tile) {
      var i2 = tile.constructor.bucket,
        bucket = this.buckets[i2];
      if (bucket.length < 6) bucket.push(tile);else bucket[this.index[i2] = (this.index[i2] + 1) % 6] = tile;
    };
    _proto52.find = function find(cls, test, type) {
      if (type === void 0) {
        type = 2;
      }
      var i2 = cls.bucket;
      var bucket = this.buckets[i2],
        off = this.index[i2];
      for (var j = 0; j < bucket.length; j++) {
        var index = (j + off) % bucket.length,
          tile = bucket[index];
        if ((!test || test(tile)) && !this.reused.has(tile)) {
          bucket.splice(index, 1);
          if (index < off) this.index[i2]--;
          this.reused.set(tile, type);
          return tile;
        }
      }
      return null;
    };
    _proto52.findWidget = function findWidget(widget, length, flags) {
      var widgets = this.buckets[0];
      if (widgets.length) for (var _i9 = 0, pass = 0;; _i9++) {
        if (_i9 == widgets.length) {
          if (pass) return null;
          pass = 1;
          _i9 = 0;
        }
        var tile = widgets[_i9];
        if (!this.reused.has(tile) && (pass == 0 ? tile.widget.compare(widget) : tile.widget.constructor == widget.constructor && widget.updateDOM(tile.dom, this.view, tile.widget))) {
          widgets.splice(_i9, 1);
          if (_i9 < this.index[0]) this.index[0]--;
          if (tile.widget == widget && tile.length == length && (tile.flags & (496 | 1)) == flags) {
            this.reused.set(tile, 1);
            return tile;
          } else {
            this.reused.set(tile, 2);
            return new WidgetTile(tile.dom, length, widget, tile.flags & ~(496 | 1) | flags);
          }
        }
      }
    };
    _proto52.reuse = function reuse(tile) {
      this.reused.set(tile, 1);
      return tile;
    };
    _proto52.maybeReuse = function maybeReuse(tile, type) {
      if (type === void 0) {
        type = 2;
      }
      if (this.reused.has(tile)) return void 0;
      this.reused.set(tile, type);
      return tile.dom;
    };
    _proto52.clear = function clear() {
      for (var _i0 = 0; _i0 < this.buckets.length; _i0++) this.buckets[_i0].length = this.index[_i0] = 0;
    };
    return TileCache;
  }();
  var TileUpdate = function () {
    function TileUpdate(view, old, blockWrappers2, decorations2, disallowBlockEffectsFor) {
      var _this19 = this;
      this.view = view;
      this.decorations = decorations2;
      this.disallowBlockEffectsFor = disallowBlockEffectsFor;
      this.openWidget = false;
      this.openMarks = 0;
      this.cache = new TileCache(view);
      this.text = new TextStream(view.state.doc);
      this.builder = new TileBuilder(this.cache, new DocTile(view, view.contentDOM), RangeSet.iter(blockWrappers2));
      this.cache.reused.set(old, 2);
      this.old = new TilePointer(old);
      this.reuseWalker = {
        skip: function skip(tile, from, to) {
          _this19.cache.add(tile);
          if (tile.isComposite()) return false;
        },
        enter: function enter(tile) {
          return _this19.cache.add(tile);
        },
        leave: function leave() {},
        break: function _break() {}
      };
    }
    var _proto53 = TileUpdate.prototype;
    _proto53.run = function run(changes, composition) {
      var compositionContext = composition && this.getCompositionContext(composition.text);
      for (var posA = 0, posB = 0, _i1 = 0;;) {
        var next = _i1 < changes.length ? changes[_i1++] : null;
        var skipA = next ? next.fromA : this.old.root.length;
        if (skipA > posA) {
          var len = skipA - posA;
          this.preserve(len, !_i1, !next);
          posA = skipA;
          posB += len;
        }
        if (!next) break;
        if (composition && next.fromA <= composition.range.fromA && next.toA >= composition.range.toA) {
          this.forward(next.fromA, composition.range.fromA, composition.range.fromA < composition.range.toA ? 1 : -1);
          this.emit(posB, composition.range.fromB);
          this.builder.flushBuffer();
          this.cache.clear();
          this.builder.addComposition(composition, compositionContext);
          this.text.skip(composition.range.toB - composition.range.fromB);
          this.forward(composition.range.fromA, next.toA);
          this.emit(composition.range.toB, next.toB);
        } else {
          this.forward(next.fromA, next.toA);
          this.emit(posB, next.toB);
        }
        posB = next.toB;
        posA = next.toA;
      }
      if (this.builder.curLine) this.builder.endLine();
      return this.builder.root;
    };
    _proto53.preserve = function preserve(length, incStart, incEnd) {
      var _this20 = this;
      var activeMarks = getMarks(this.old),
        openMarks = this.openMarks;
      this.old.advance(length, incEnd ? 1 : -1, {
        skip: function skip(tile, from, to) {
          if (tile.isWidget()) {
            if (_this20.openWidget) {
              _this20.builder.continueWidget(to - from);
            } else {
              var widget = to > 0 || from < tile.length ? WidgetTile.of(tile.widget, _this20.view, to - from, tile.flags & 496, _this20.cache.maybeReuse(tile)) : _this20.cache.reuse(tile);
              if (widget.flags & 256) {
                widget.flags &= ~1;
                _this20.builder.addBlockWidget(widget);
              } else {
                _this20.builder.ensureLine(null);
                _this20.builder.addInlineWidget(widget, activeMarks, openMarks);
                openMarks = activeMarks.length;
              }
            }
          } else if (tile.isText()) {
            _this20.builder.ensureLine(null);
            if (!from && to == tile.length && !_this20.cache.reused.has(tile)) {
              _this20.builder.addText(tile.text, activeMarks, openMarks, _this20.cache.reuse(tile));
            } else {
              _this20.cache.add(tile);
              _this20.builder.addText(tile.text.slice(from, to), activeMarks, openMarks);
            }
            openMarks = activeMarks.length;
          } else if (tile.isLine()) {
            tile.flags &= ~1;
            _this20.cache.reused.set(tile, 1);
            _this20.builder.addLine(tile);
          } else if (tile instanceof WidgetBufferTile) {
            _this20.cache.add(tile);
          } else if (tile instanceof MarkTile) {
            _this20.builder.ensureLine(null);
            _this20.builder.addMark(tile, activeMarks, openMarks);
            _this20.cache.reused.set(tile, 1);
            openMarks = activeMarks.length;
          } else {
            return false;
          }
          _this20.openWidget = false;
        },
        enter: function enter(tile) {
          if (tile.isLine()) {
            _this20.builder.addLineStart(tile.attrs, _this20.cache.maybeReuse(tile));
          } else {
            _this20.cache.add(tile);
            if (tile instanceof MarkTile) activeMarks.unshift(tile.mark);
          }
          _this20.openWidget = false;
        },
        leave: function leave(tile) {
          if (tile.isLine()) {
            if (activeMarks.length) activeMarks.length = openMarks = 0;
          } else if (tile instanceof MarkTile) {
            activeMarks.shift();
            openMarks = Math.min(openMarks, activeMarks.length);
          }
        },
        break: function _break() {
          _this20.builder.addBreak();
          _this20.openWidget = false;
        }
      });
      this.text.skip(length);
    };
    _proto53.emit = function emit(from, to) {
      var _this21 = this;
      var pendingLineAttrs = null;
      var b = this.builder,
        markCount = -1;
      var openEnd = RangeSet.spans(this.decorations, from, to, {
        point: function point(from2, to2, deco, active2, openStart, index) {
          if (deco instanceof PointDecoration) {
            if (_this21.disallowBlockEffectsFor[index]) {
              if (deco.block) throw new RangeError("Block decorations may not be specified via plugins");
              if (to2 > _this21.view.state.doc.lineAt(from2).to) throw new RangeError("Decorations that replace line breaks may not be specified via plugins");
            }
            markCount = active2.length;
            if (openStart > active2.length) {
              b.continueWidget(to2 - from2);
            } else {
              var widget = deco.widget || (deco.block ? NullWidget.block : NullWidget.inline);
              var flags = widgetFlags(deco);
              var tile = _this21.cache.findWidget(widget, to2 - from2, flags) || WidgetTile.of(widget, _this21.view, to2 - from2, flags);
              if (deco.block) {
                if (deco.startSide > 0) b.addLineStartIfNotCovered(pendingLineAttrs);
                b.addBlockWidget(tile);
              } else {
                b.ensureLine(pendingLineAttrs);
                b.addInlineWidget(tile, active2, openStart);
              }
            }
            pendingLineAttrs = null;
          } else {
            pendingLineAttrs = addLineDeco(pendingLineAttrs, deco);
          }
          if (to2 > from2) _this21.text.skip(to2 - from2);
        },
        span: function span(from2, to2, active2, openStart) {
          for (var pos = from2; pos < to2;) {
            var chars = _this21.text.next(Math.min(512, to2 - pos));
            if (chars == null) {
              b.addLineStartIfNotCovered(pendingLineAttrs);
              b.addBreak();
              pos++;
            } else {
              b.ensureLine(pendingLineAttrs);
              b.addText(chars, active2, pos == from2 ? openStart : active2.length);
              pos += chars.length;
            }
            pendingLineAttrs = null;
          }
          markCount = active2.length;
        }
      });
      if (markCount > -1) this.openWidget = openEnd > markCount;
      if (!this.openWidget) b.addLineStartIfNotCovered(pendingLineAttrs);
      this.openMarks = openEnd;
    };
    _proto53.forward = function forward(from, to, side) {
      if (side === void 0) {
        side = 1;
      }
      if (to - from <= 10) {
        this.old.advance(to - from, side, this.reuseWalker);
      } else {
        this.old.advance(5, -1, this.reuseWalker);
        this.old.advance(to - from - 10, -1);
        this.old.advance(5, side, this.reuseWalker);
      }
    };
    _proto53.getCompositionContext = function getCompositionContext(text) {
      var marks2 = [],
        line = null;
      for (var parent = text.parentNode;; parent = parent.parentNode) {
        var tile = Tile.get(parent);
        if (parent == this.view.contentDOM) break;
        if (tile instanceof MarkTile) marks2.push(tile);else if (tile === null || tile === void 0 ? void 0 : tile.isLine()) line = tile;else if (tile instanceof BlockWrapperTile) ;else if (parent.nodeName == "DIV" && !line && parent != this.view.contentDOM) line = new LineTile(parent, lineBaseAttrs);else if (!line) marks2.push(MarkTile.of(new MarkDecoration({
          tagName: parent.nodeName.toLowerCase(),
          attributes: getAttrs(parent)
        }), parent));
      }
      return {
        line: line,
        marks: marks2
      };
    };
    return TileUpdate;
  }();
  function hasContent(tile, requireText) {
    var _scan = function scan(tile2) {
      for (var _iterator38 = _createForOfIteratorHelperLoose(tile2.children), _step38; !(_step38 = _iterator38()).done;) {
        var ch = _step38.value;
        if ((requireText ? ch.isText() : ch.length) || _scan(ch)) return true;
      }
      return false;
    };
    return _scan(tile);
  }
  function widgetFlags(deco) {
    var flags = deco.isReplace ? (deco.startSide < 0 ? 64 : 0) | (deco.endSide > 0 ? 128 : 0) : deco.startSide > 0 ? 32 : 16;
    if (deco.block) flags |= 256;
    return flags;
  }
  var lineBaseAttrs = {
    class: "cm-line"
  };
  function addLineDeco(value, deco) {
    var attrs = deco.spec.attributes,
      cls = deco.spec.class;
    if (!attrs && !cls) return value;
    if (!value) value = {
      class: "cm-line"
    };
    if (attrs) combineAttrs(attrs, value);
    if (cls) value.class += " " + cls;
    return value;
  }
  function getMarks(ptr) {
    var found = [];
    for (var _i10 = ptr.parents.length; _i10 > 1; _i10--) {
      var tile = _i10 == ptr.parents.length ? ptr.tile : ptr.parents[_i10].tile;
      if (tile instanceof MarkTile) found.push(tile.mark);
    }
    return found;
  }
  function freeNode(node) {
    var tile = Tile.get(node);
    if (tile) tile.setDOM(node.cloneNode());
    return node;
  }
  var NullWidget = function (_WidgetType) {
    function NullWidget(tag) {
      var _this22;
      _this22 = _WidgetType.call(this) || this;
      _this22.tag = tag;
      return _this22;
    }
    _inheritsLoose(NullWidget, _WidgetType);
    var _proto54 = NullWidget.prototype;
    _proto54.eq = function eq(other) {
      return other.tag == this.tag;
    };
    _proto54.toDOM = function toDOM() {
      return document.createElement(this.tag);
    };
    _proto54.updateDOM = function updateDOM(elt) {
      return elt.nodeName.toLowerCase() == this.tag;
    };
    return _createClass(NullWidget, [{
      key: "isHidden",
      get: function get() {
        return true;
      }
    }]);
  }(WidgetType);
  NullWidget.inline = new NullWidget("span");
  NullWidget.block = new NullWidget("div");
  var BreakWidget = new (function (_WidgetType2) {
    function _class() {
      return _WidgetType2.apply(this, arguments) || this;
    }
    _inheritsLoose(_class, _WidgetType2);
    var _proto55 = _class.prototype;
    _proto55.toDOM = function toDOM() {
      return document.createElement("br");
    };
    return _createClass(_class, [{
      key: "isHidden",
      get: function get() {
        return true;
      }
    }, {
      key: "editable",
      get: function get() {
        return true;
      }
    }]);
  }(WidgetType))();
  var DocView = function () {
    function DocView(view) {
      this.view = view;
      this.decorations = [];
      this.blockWrappers = [];
      this.dynamicDecorationMap = [false];
      this.domChanged = null;
      this.hasComposition = null;
      this.editContextFormatting = Decoration.none;
      this.lastCompositionAfterCursor = false;
      this.minWidth = 0;
      this.minWidthFrom = 0;
      this.minWidthTo = 0;
      this.impreciseAnchor = null;
      this.impreciseHead = null;
      this.forceSelection = false;
      this.lastUpdate = Date.now();
      this.updateDeco();
      this.tile = new DocTile(view, view.contentDOM);
      this.updateInner([new ChangedRange(0, 0, 0, view.state.doc.length)], null);
    }
    var _proto56 = DocView.prototype;
    _proto56.update = function update(_update2) {
      var _this23 = this;
      var _a2;
      var changedRanges = _update2.changedRanges;
      if (this.minWidth > 0 && changedRanges.length) {
        if (!changedRanges.every(function (_ref4) {
          var fromA = _ref4.fromA,
            toA = _ref4.toA;
          return toA < _this23.minWidthFrom || fromA > _this23.minWidthTo;
        })) {
          this.minWidth = this.minWidthFrom = this.minWidthTo = 0;
        } else {
          this.minWidthFrom = _update2.changes.mapPos(this.minWidthFrom, 1);
          this.minWidthTo = _update2.changes.mapPos(this.minWidthTo, 1);
        }
      }
      this.updateEditContextFormatting(_update2);
      var readCompositionAt = -1;
      if (this.view.inputState.composing >= 0 && !this.view.observer.editContext) {
        if ((_a2 = this.domChanged) === null || _a2 === void 0 ? void 0 : _a2.newSel) readCompositionAt = this.domChanged.newSel.head;else if (!touchesComposition(_update2.changes, this.hasComposition) && !_update2.selectionSet) readCompositionAt = _update2.state.selection.main.head;
      }
      var composition = readCompositionAt > -1 ? findCompositionRange(this.view, _update2.changes, readCompositionAt) : null;
      this.domChanged = null;
      if (this.hasComposition) {
        var _this$hasComposition = this.hasComposition,
          from = _this$hasComposition.from,
          to = _this$hasComposition.to;
        changedRanges = new ChangedRange(from, to, _update2.changes.mapPos(from, -1), _update2.changes.mapPos(to, 1)).addToSet(changedRanges.slice());
      }
      this.hasComposition = composition ? {
        from: composition.range.fromB,
        to: composition.range.toB
      } : null;
      if ((browser.ie || browser.chrome) && !composition && _update2 && _update2.state.doc.lines != _update2.startState.doc.lines) this.forceSelection = true;
      var prevDeco = this.decorations,
        prevWrappers = this.blockWrappers;
      this.updateDeco();
      var decoDiff = findChangedDeco(prevDeco, this.decorations, _update2.changes);
      if (decoDiff.length) changedRanges = ChangedRange.extendWithRanges(changedRanges, decoDiff);
      var blockDiff = findChangedWrappers(prevWrappers, this.blockWrappers, _update2.changes);
      if (blockDiff.length) changedRanges = ChangedRange.extendWithRanges(changedRanges, blockDiff);
      if (composition && !changedRanges.some(function (r) {
        return r.fromA <= composition.range.fromA && r.toA >= composition.range.toA;
      })) changedRanges = composition.range.addToSet(changedRanges.slice());
      if (this.tile.flags & 2 && changedRanges.length == 0) {
        return false;
      } else {
        this.updateInner(changedRanges, composition);
        if (_update2.transactions.length) this.lastUpdate = Date.now();
        return true;
      }
    };
    _proto56.updateInner = function updateInner(changes, composition) {
      var _this24 = this;
      this.view.viewState.mustMeasureContent = true;
      var observer = this.view.observer;
      observer.ignore(function () {
        if (composition || changes.length) {
          var oldTile = _this24.tile;
          var builder = new TileUpdate(_this24.view, oldTile, _this24.blockWrappers, _this24.decorations, _this24.dynamicDecorationMap);
          if (composition && Tile.get(composition.text)) builder.cache.reused.set(Tile.get(composition.text), 2);
          _this24.tile = builder.run(changes, composition);
          destroyDropped(oldTile, builder.cache.reused);
        }
        _this24.tile.dom.style.height = _this24.view.viewState.contentHeight / _this24.view.scaleY + "px";
        _this24.tile.dom.style.flexBasis = _this24.minWidth ? _this24.minWidth + "px" : "";
        var track = browser.chrome || browser.ios ? {
          node: observer.selectionRange.focusNode,
          written: false
        } : void 0;
        _this24.tile.sync(track);
        if (track && (track.written || observer.selectionRange.focusNode != track.node || !_this24.tile.dom.contains(track.node))) _this24.forceSelection = true;
        _this24.tile.dom.style.height = "";
      });
      var gaps = [];
      if (this.view.viewport.from || this.view.viewport.to < this.view.state.doc.length) {
        for (var _iterator39 = _createForOfIteratorHelperLoose(this.tile.children), _step39; !(_step39 = _iterator39()).done;) {
          var child = _step39.value;
          if (child.isWidget() && child.widget instanceof BlockGapWidget) gaps.push(child.dom);
        }
      }
      observer.updateGaps(gaps);
    };
    _proto56.updateEditContextFormatting = function updateEditContextFormatting(update) {
      this.editContextFormatting = this.editContextFormatting.map(update.changes);
      for (var _iterator40 = _createForOfIteratorHelperLoose(update.transactions), _step40; !(_step40 = _iterator40()).done;) {
        var tr = _step40.value;
        for (var _iterator41 = _createForOfIteratorHelperLoose(tr.effects), _step41; !(_step41 = _iterator41()).done;) {
          var effect = _step41.value;
          if (effect.is(setEditContextFormatting)) {
            this.editContextFormatting = effect.value;
          }
        }
      }
    };
    _proto56.updateSelection = function updateSelection(mustRead, fromPointer) {
      var _this25 = this;
      if (mustRead === void 0) {
        mustRead = false;
      }
      if (fromPointer === void 0) {
        fromPointer = false;
      }
      if (mustRead || !this.view.observer.selectionRange.focusNode) this.view.observer.readSelectionRange();
      var dom = this.tile.dom;
      var activeElt = this.view.root.activeElement,
        focused = activeElt == dom;
      var selectionNotFocus = !focused && !(this.view.state.facet(editable) || dom.tabIndex > -1) && hasSelection(dom, this.view.observer.selectionRange) && !(activeElt && dom.contains(activeElt));
      if (!(focused || fromPointer || selectionNotFocus)) return;
      var force = this.forceSelection;
      this.forceSelection = false;
      var main = this.view.state.selection.main,
        anchor,
        head;
      if (main.empty) {
        head = anchor = this.inlineDOMNearPos(main.anchor, main.assoc || 1);
      } else {
        head = this.inlineDOMNearPos(main.head, main.head == main.from ? 1 : -1);
        anchor = this.inlineDOMNearPos(main.anchor, main.anchor == main.from ? 1 : -1);
      }
      if (browser.gecko && main.empty && !this.hasComposition && betweenUneditable(anchor)) {
        var dummy = document.createTextNode("");
        this.view.observer.ignore(function () {
          return anchor.node.insertBefore(dummy, anchor.node.childNodes[anchor.offset] || null);
        });
        anchor = head = new DOMPos(dummy, 0);
        force = true;
      }
      var domSel = this.view.observer.selectionRange;
      if (force || !domSel.focusNode || (!isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) || !isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) && !this.suppressWidgetCursorChange(domSel, main)) {
        this.view.observer.ignore(function () {
          if (browser.android && browser.chrome && dom.contains(domSel.focusNode) && inUneditable(domSel.focusNode, dom)) {
            dom.blur();
            dom.focus({
              preventScroll: true
            });
          }
          var rawSel = getSelection(_this25.view.root);
          if (!rawSel) ;else if (main.empty) {
            if (browser.gecko) {
              var nextTo = nextToUneditable(anchor.node, anchor.offset);
              if (nextTo && nextTo != (1 | 2)) {
                var text = (nextTo == 1 ? textNodeBefore : textNodeAfter)(anchor.node, anchor.offset);
                if (text) anchor = new DOMPos(text.node, text.offset);
              }
            }
            rawSel.collapse(anchor.node, anchor.offset);
            if (main.bidiLevel != null && rawSel.caretBidiLevel !== void 0) rawSel.caretBidiLevel = main.bidiLevel;
          } else if (rawSel.extend) {
            rawSel.collapse(anchor.node, anchor.offset);
            try {
              rawSel.extend(head.node, head.offset);
            } catch (_5) {}
          } else {
            var range = document.createRange();
            if (main.anchor > main.head) {
              var _ref5 = [head, anchor];
              anchor = _ref5[0];
              head = _ref5[1];
            }
            range.setEnd(head.node, head.offset);
            range.setStart(anchor.node, anchor.offset);
            rawSel.removeAllRanges();
            rawSel.addRange(range);
          }
          if (selectionNotFocus && _this25.view.root.activeElement == dom) {
            dom.blur();
            if (activeElt) activeElt.focus();
          }
        });
        this.view.observer.setSelectionRange(anchor, head);
      }
      this.impreciseAnchor = anchor.precise ? null : new DOMPos(domSel.anchorNode, domSel.anchorOffset);
      this.impreciseHead = head.precise ? null : new DOMPos(domSel.focusNode, domSel.focusOffset);
    };
    _proto56.suppressWidgetCursorChange = function suppressWidgetCursorChange(sel, cursor) {
      return this.hasComposition && cursor.empty && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset) && this.posFromDOM(sel.focusNode, sel.focusOffset) == cursor.head;
    };
    _proto56.enforceCursorAssoc = function enforceCursorAssoc() {
      if (this.hasComposition) return;
      var view = this.view,
        cursor = view.state.selection.main;
      var sel = getSelection(view.root);
      var _view$observer$select = view.observer.selectionRange,
        anchorNode = _view$observer$select.anchorNode,
        anchorOffset = _view$observer$select.anchorOffset;
      if (!sel || !cursor.empty || !cursor.assoc || !sel.modify) return;
      var line = this.lineAt(cursor.head, cursor.assoc);
      if (!line) return;
      var lineStart = line.posAtStart;
      if (cursor.head == lineStart || cursor.head == lineStart + line.length) return;
      var before = this.coordsAt(cursor.head, -1),
        after = this.coordsAt(cursor.head, 1);
      if (!before || !after || before.bottom > after.top) return;
      var dom = this.domAtPos(cursor.head + cursor.assoc, cursor.assoc);
      sel.collapse(dom.node, dom.offset);
      sel.modify("move", cursor.assoc < 0 ? "forward" : "backward", "lineboundary");
      view.observer.readSelectionRange();
      var newRange = view.observer.selectionRange;
      if (view.docView.posFromDOM(newRange.anchorNode, newRange.anchorOffset) != cursor.from) sel.collapse(anchorNode, anchorOffset);
    };
    _proto56.posFromDOM = function posFromDOM(node, offset) {
      var tile = this.tile.nearest(node);
      if (!tile) return this.tile.dom.compareDocumentPosition(node) & 2 ? 0 : this.view.state.doc.length;
      var start = tile.posAtStart;
      if (tile.isComposite()) {
        var after;
        if (node == tile.dom) {
          after = tile.dom.childNodes[offset];
        } else {
          var bias = maxOffset(node) == 0 ? 0 : offset == 0 ? -1 : 1;
          for (;;) {
            var parent = node.parentNode;
            if (parent == tile.dom) break;
            if (bias == 0 && parent.firstChild != parent.lastChild) {
              if (node == parent.firstChild) bias = -1;else bias = 1;
            }
            node = parent;
          }
          if (bias < 0) after = node;else after = node.nextSibling;
        }
        if (after == tile.dom.firstChild) return start;
        while (after && !Tile.get(after)) after = after.nextSibling;
        if (!after) return start + tile.length;
        for (var _i11 = 0, pos = start;; _i11++) {
          var child = tile.children[_i11];
          if (child.dom == after) return pos;
          pos += child.length + child.breakAfter;
        }
      } else if (tile.isText()) {
        return node == tile.dom ? start + offset : start + (offset ? tile.length : 0);
      } else {
        return start;
      }
    };
    _proto56.domAtPos = function domAtPos(pos, side) {
      var _this$tile$resolveBlo = this.tile.resolveBlock(pos, side),
        tile = _this$tile$resolveBlo.tile,
        offset = _this$tile$resolveBlo.offset;
      if (tile.isWidget()) return tile.domPosFor(offset, side);
      return tile.domIn(offset, side);
    };
    _proto56.inlineDOMNearPos = function inlineDOMNearPos(pos, side) {
      var before,
        beforeOff = -1,
        beforeBad = false;
      var after,
        afterOff = -1,
        afterBad = false;
      this.tile.blockTiles(function (tile, off) {
        if (tile.isWidget()) {
          if (tile.flags & 32 && off >= pos) return true;
          if (tile.flags & 16) beforeBad = true;
        } else {
          var end = off + tile.length;
          if (off <= pos) {
            before = tile;
            beforeOff = pos - off;
            beforeBad = end < pos;
          }
          if (end >= pos && !after) {
            after = tile;
            afterOff = pos - off;
            afterBad = off > pos;
          }
          if (off > pos && after) return true;
        }
      });
      if (!before && !after) return this.domAtPos(pos, side);
      if (beforeBad && after) before = null;else if (afterBad && before) after = null;
      return before && side < 0 || !after ? before.domIn(beforeOff, side) : after.domIn(afterOff, side);
    };
    _proto56.coordsAt = function coordsAt(pos, side, rtl) {
      var _this$tile$resolveBlo2 = this.tile.resolveBlock(pos, side),
        tile = _this$tile$resolveBlo2.tile,
        offset = _this$tile$resolveBlo2.offset;
      if (tile.isWidget()) {
        if (tile.widget instanceof BlockGapWidget) return null;
        return tile.coordsInWidget(offset, side, true);
      }
      return tile.coordsIn(offset, side, rtl);
    };
    _proto56.lineAt = function lineAt(pos, side) {
      var _this$tile$resolveBlo3 = this.tile.resolveBlock(pos, side),
        tile = _this$tile$resolveBlo3.tile;
      return tile.isLine() ? tile : null;
    };
    _proto56.coordsForChar = function coordsForChar(pos) {
      var _this$tile$resolveBlo4 = this.tile.resolveBlock(pos, 1),
        tile = _this$tile$resolveBlo4.tile,
        offset = _this$tile$resolveBlo4.offset;
      if (!tile.isLine()) return null;
      function scan(tile2, offset2) {
        if (tile2.isComposite()) {
          for (var _iterator42 = _createForOfIteratorHelperLoose(tile2.children), _step42; !(_step42 = _iterator42()).done;) {
            var ch = _step42.value;
            if (ch.length >= offset2) {
              var found = scan(ch, offset2);
              if (found) return found;
            }
            offset2 -= ch.length;
            if (offset2 < 0) break;
          }
        } else if (tile2.isText() && offset2 < tile2.length) {
          var end = findClusterBreak2(tile2.text, offset2);
          if (end == offset2) return null;
          var rects = textRange(tile2.dom, offset2, end).getClientRects();
          for (var _i12 = 0; _i12 < rects.length; _i12++) {
            var rect = rects[_i12];
            if (_i12 == rects.length - 1 || rect.top < rect.bottom && rect.left < rect.right) return rect;
          }
        }
        return null;
      }
      return scan(tile, offset);
    };
    _proto56.measureVisibleLineHeights = function measureVisibleLineHeights(viewport) {
      var _this26 = this;
      var result = [],
        from = viewport.from,
        to = viewport.to;
      var contentWidth = this.view.contentDOM.clientWidth;
      var isWider = contentWidth > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1;
      var widest = -1,
        ltr = this.view.textDirection == Direction.LTR;
      var spaceAbove = 0;
      var _scan2 = function scan(tile, pos, measureBounds) {
        for (var _i13 = 0; _i13 < tile.children.length; _i13++) {
          if (pos > to) break;
          var child = tile.children[_i13],
            end = pos + child.length;
          var childRect = child.dom.getBoundingClientRect(),
            height = childRect.height;
          if (measureBounds && !_i13) spaceAbove += childRect.top - measureBounds.top;
          if (child instanceof BlockWrapperTile) {
            if (end > from) _scan2(child, pos, childRect);
          } else if (pos >= from) {
            if (spaceAbove > 0) result.push(-spaceAbove);
            result.push(height + spaceAbove);
            spaceAbove = 0;
            if (isWider) {
              var last = child.dom.lastChild;
              var rects = last ? clientRectsFor(last) : [];
              if (rects.length) {
                var rect = rects[rects.length - 1];
                var width = ltr ? rect.right - childRect.left : childRect.right - rect.left;
                if (width > widest) {
                  widest = width;
                  _this26.minWidth = contentWidth;
                  _this26.minWidthFrom = pos;
                  _this26.minWidthTo = end;
                }
              }
            }
          }
          if (measureBounds && _i13 == tile.children.length - 1) spaceAbove += measureBounds.bottom - childRect.bottom;
          pos = end + child.breakAfter;
        }
      };
      _scan2(this.tile, 0, null);
      return result;
    };
    _proto56.textDirectionAt = function textDirectionAt(pos) {
      var _this$tile$resolveBlo5 = this.tile.resolveBlock(pos, 1),
        tile = _this$tile$resolveBlo5.tile;
      return getComputedStyle(tile.dom).direction == "rtl" ? Direction.RTL : Direction.LTR;
    };
    _proto56.measureTextSize = function measureTextSize() {
      var _this27 = this;
      var lineMeasure = this.tile.blockTiles(function (tile) {
        if (tile.isLine() && tile.children.length && tile.length <= 20) {
          var totalWidth = 0,
            textHeight2;
          for (var _iterator43 = _createForOfIteratorHelperLoose(tile.children), _step43; !(_step43 = _iterator43()).done;) {
            var child = _step43.value;
            if (!child.isText() || /[^ -~]/.test(child.text)) return void 0;
            var rects = clientRectsFor(child.dom);
            if (rects.length != 1) return void 0;
            totalWidth += rects[0].width;
            textHeight2 = rects[0].height;
          }
          if (totalWidth) return {
            lineHeight: tile.dom.getBoundingClientRect().height,
            charWidth: totalWidth / tile.length,
            textHeight: textHeight2
          };
        }
      });
      if (lineMeasure) return lineMeasure;
      var dummy = document.createElement("div"),
        lineHeight,
        charWidth,
        textHeight;
      dummy.className = "cm-line";
      dummy.style.width = "99999px";
      dummy.style.position = "absolute";
      dummy.textContent = "abc def ghi jkl mno pqr stu";
      this.view.observer.ignore(function () {
        _this27.tile.dom.appendChild(dummy);
        var rect = clientRectsFor(dummy.firstChild)[0];
        lineHeight = dummy.getBoundingClientRect().height;
        charWidth = rect && rect.width ? rect.width / 27 : 7;
        textHeight = rect && rect.height ? rect.height : lineHeight;
        dummy.remove();
      });
      return {
        lineHeight: lineHeight,
        charWidth: charWidth,
        textHeight: textHeight
      };
    };
    _proto56.computeBlockGapDeco = function computeBlockGapDeco() {
      var deco = [],
        vs = this.view.viewState;
      for (var pos = 0, _i14 = 0;; _i14++) {
        var next = _i14 == vs.viewports.length ? null : vs.viewports[_i14];
        var end = next ? next.from - 1 : this.view.state.doc.length;
        if (end > pos) {
          var height = (vs.lineBlockAt(end).bottom - vs.lineBlockAt(pos).top) / this.view.scaleY;
          deco.push(Decoration.replace({
            widget: new BlockGapWidget(height),
            block: true,
            inclusive: true,
            isBlockGap: true
          }).range(pos, end));
        }
        if (!next) break;
        pos = next.to + 1;
      }
      return Decoration.set(deco);
    };
    _proto56.updateDeco = function updateDeco() {
      var _this28 = this;
      var i2 = 1;
      var allDeco = this.view.state.facet(decorations).map(function (d) {
        var dynamic = _this28.dynamicDecorationMap[i2++] = typeof d == "function";
        return dynamic ? d(_this28.view) : d;
      });
      var dynamicOuter = false,
        outerDeco = this.view.state.facet(outerDecorations).map(function (d, i3) {
          var dynamic = typeof d == "function";
          if (dynamic) dynamicOuter = true;
          return dynamic ? d(_this28.view) : d;
        });
      if (outerDeco.length) {
        this.dynamicDecorationMap[i2++] = dynamicOuter;
        allDeco.push(RangeSet.join(outerDeco));
      }
      this.decorations = [this.editContextFormatting].concat(allDeco, [this.computeBlockGapDeco(), this.view.viewState.lineGapDeco]);
      while (i2 < this.decorations.length) this.dynamicDecorationMap[i2++] = false;
      this.blockWrappers = this.view.state.facet(blockWrappers).map(function (v) {
        return typeof v == "function" ? v(_this28.view) : v;
      });
    };
    _proto56.scrollIntoView = function scrollIntoView(target) {
      if (target.isSnapshot) {
        var ref = this.view.viewState.lineBlockAt(target.range.head);
        this.view.scrollDOM.scrollTop = ref.top - target.yMargin;
        this.view.scrollDOM.scrollLeft = target.xMargin;
        return;
      }
      for (var _iterator44 = _createForOfIteratorHelperLoose(this.view.state.facet(scrollHandler)), _step44; !(_step44 = _iterator44()).done;) {
        var handler = _step44.value;
        try {
          if (handler(this.view, target.range, target)) return true;
        } catch (_e4) {
          logException(this.view.state, _e4, "scroll handler");
        }
      }
      var range = target.range;
      var rect = this.coordsAt(range.head, range.assoc || (range.head > range.anchor ? -1 : 1)),
        other;
      if (!rect) return;
      if (!range.empty && (other = this.coordsAt(range.anchor, range.anchor > range.head ? -1 : 1))) rect = {
        left: Math.min(rect.left, other.left),
        top: Math.min(rect.top, other.top),
        right: Math.max(rect.right, other.right),
        bottom: Math.max(rect.bottom, other.bottom)
      };
      var margins = getScrollMargins(this.view);
      var targetRect = {
        left: rect.left - margins.left,
        top: rect.top - margins.top,
        right: rect.right + margins.right,
        bottom: rect.bottom + margins.bottom
      };
      var _this$view$scrollDOM = this.view.scrollDOM,
        offsetWidth = _this$view$scrollDOM.offsetWidth,
        offsetHeight = _this$view$scrollDOM.offsetHeight;
      scrollRectIntoView(this.view.scrollDOM, targetRect, range.head < range.anchor ? -1 : 1, target.x, target.y, Math.max(Math.min(target.xMargin, offsetWidth), -offsetWidth), Math.max(Math.min(target.yMargin, offsetHeight), -offsetHeight), this.view.textDirection == Direction.LTR);
      if (window.visualViewport && window.innerHeight - window.visualViewport.height > 1 && (rect.top > window.visualViewport.offsetTop + window.visualViewport.height || rect.bottom < window.visualViewport.offsetTop)) {
        var line = this.view.docView.lineAt(range.head, 1);
        if (line) {
          var stack = getScrollStack(line.dom);
          line.dom.scrollIntoView({
            block: "nearest"
          });
          restoreScrollStack(stack, false);
        }
      }
    };
    _proto56.lineHasWidget = function lineHasWidget(pos) {
      var _scan3 = function scan(child) {
        return child.isWidget() || child.children.some(_scan3);
      };
      return _scan3(this.tile.resolveBlock(pos, 1).tile);
    };
    _proto56.destroy = function destroy() {
      destroyDropped(this.tile);
    };
    return DocView;
  }();
  function destroyDropped(tile, reused) {
    var r = reused === null || reused === void 0 ? void 0 : reused.get(tile);
    if (r != 1) {
      if (r == null) tile.destroy();
      for (var _iterator45 = _createForOfIteratorHelperLoose(tile.children), _step45; !(_step45 = _iterator45()).done;) {
        var ch = _step45.value;
        destroyDropped(ch, reused);
      }
    }
  }
  function betweenUneditable(pos) {
    return pos.node.nodeType == 1 && pos.node.firstChild && (pos.offset == 0 || pos.node.childNodes[pos.offset - 1].contentEditable == "false") && (pos.offset == pos.node.childNodes.length || pos.node.childNodes[pos.offset].contentEditable == "false");
  }
  function findCompositionNode(view, headPos) {
    var sel = view.observer.selectionRange;
    if (!sel.focusNode) return null;
    var textBefore = textNodeBefore(sel.focusNode, sel.focusOffset);
    var textAfter = textNodeAfter(sel.focusNode, sel.focusOffset);
    var textNode = textBefore || textAfter;
    if (textAfter && textBefore && textAfter.node != textBefore.node) {
      var tileAfter = Tile.get(textAfter.node);
      if (!tileAfter || tileAfter.isText() && tileAfter.text != textAfter.node.nodeValue) {
        textNode = textAfter;
      } else if (view.docView.lastCompositionAfterCursor) {
        var tileBefore = Tile.get(textBefore.node);
        if (!(!tileBefore || tileBefore.isText() && tileBefore.text != textBefore.node.nodeValue)) textNode = textAfter;
      }
    }
    view.docView.lastCompositionAfterCursor = textNode != textBefore;
    if (!textNode) return null;
    var from = headPos - textNode.offset;
    return {
      from: from,
      to: from + textNode.node.nodeValue.length,
      node: textNode.node
    };
  }
  function findCompositionRange(view, changes, headPos) {
    var found = findCompositionNode(view, headPos);
    if (!found) return null;
    var textNode = found.node,
      from = found.from,
      to = found.to,
      text = textNode.nodeValue;
    if (/[\n\r]/.test(text)) return null;
    if (view.state.doc.sliceString(found.from, found.to) != text) return null;
    var inv = changes.invertedDesc;
    return {
      range: new ChangedRange(inv.mapPos(from), inv.mapPos(to), from, to),
      text: textNode
    };
  }
  function nextToUneditable(node, offset) {
    if (node.nodeType != 1) return 0;
    return (offset && node.childNodes[offset - 1].contentEditable == "false" ? 1 : 0) | (offset < node.childNodes.length && node.childNodes[offset].contentEditable == "false" ? 2 : 0);
  }
  var DecorationComparator$1 = function () {
    function DecorationComparator() {
      this.changes = [];
    }
    var _proto57 = DecorationComparator.prototype;
    _proto57.compareRange = function compareRange(from, to) {
      addRange(from, to, this.changes);
    };
    _proto57.comparePoint = function comparePoint(from, to) {
      addRange(from, to, this.changes);
    };
    _proto57.boundChange = function boundChange(pos) {
      addRange(pos, pos, this.changes);
    };
    return DecorationComparator;
  }();
  function findChangedDeco(a, b, diff) {
    var comp = new DecorationComparator$1();
    RangeSet.compare(a, b, diff, comp);
    return comp.changes;
  }
  var WrapperComparator = function () {
    function WrapperComparator() {
      this.changes = [];
    }
    var _proto58 = WrapperComparator.prototype;
    _proto58.compareRange = function compareRange(from, to) {
      addRange(from, to, this.changes);
    };
    _proto58.comparePoint = function comparePoint() {};
    _proto58.boundChange = function boundChange(pos) {
      addRange(pos, pos, this.changes);
    };
    return WrapperComparator;
  }();
  function findChangedWrappers(a, b, diff) {
    var comp = new WrapperComparator();
    RangeSet.compare(a, b, diff, comp);
    return comp.changes;
  }
  function inUneditable(node, inside) {
    for (var cur = node; cur && cur != inside; cur = cur.assignedSlot || cur.parentNode) {
      if (cur.nodeType == 1 && cur.contentEditable == "false") {
        return true;
      }
    }
    return false;
  }
  function touchesComposition(changes, composition) {
    var touched = false;
    if (composition) changes.iterChangedRanges(function (from, to) {
      if (from < composition.to && to > composition.from) touched = true;
    });
    return touched;
  }
  var BlockGapWidget = function (_WidgetType3) {
    function BlockGapWidget(height) {
      var _this29;
      _this29 = _WidgetType3.call(this) || this;
      _this29.height = height;
      return _this29;
    }
    _inheritsLoose(BlockGapWidget, _WidgetType3);
    var _proto59 = BlockGapWidget.prototype;
    _proto59.toDOM = function toDOM() {
      var elt = document.createElement("div");
      elt.className = "cm-gap";
      this.updateDOM(elt);
      return elt;
    };
    _proto59.eq = function eq(other) {
      return other.height == this.height;
    };
    _proto59.updateDOM = function updateDOM(elt) {
      elt.style.height = this.height + "px";
      return true;
    };
    _proto59.ignoreEvent = function ignoreEvent() {
      return false;
    };
    return _createClass(BlockGapWidget, [{
      key: "editable",
      get: function get() {
        return true;
      }
    }, {
      key: "estimatedHeight",
      get: function get() {
        return this.height;
      }
    }]);
  }(WidgetType);
  function groupAt(state, pos, bias) {
    if (bias === void 0) {
      bias = 1;
    }
    var categorize = state.charCategorizer(pos);
    var line = state.doc.lineAt(pos),
      linePos = pos - line.from;
    if (line.length == 0) return EditorSelection.cursor(pos);
    if (linePos == 0) bias = 1;else if (linePos == line.length) bias = -1;
    var from = linePos,
      to = linePos;
    if (bias < 0) from = findClusterBreak2(line.text, linePos, false);else to = findClusterBreak2(line.text, linePos);
    var cat = categorize(line.text.slice(from, to));
    while (from > 0) {
      var prev = findClusterBreak2(line.text, from, false);
      if (categorize(line.text.slice(prev, from)) != cat) break;
      from = prev;
    }
    while (to < line.length) {
      var next = findClusterBreak2(line.text, to);
      if (categorize(line.text.slice(to, next)) != cat) break;
      to = next;
    }
    return EditorSelection.undirectionalRange(from + line.from, to + line.from);
  }
  function posAtCoordsImprecise(view, contentRect, block, x, y) {
    var into = Math.round((x - contentRect.left) * view.defaultCharacterWidth);
    if (view.lineWrapping && block.height > view.defaultLineHeight * 1.5) {
      var textHeight = view.viewState.heightOracle.textHeight;
      var line = Math.floor((y - block.top - (view.defaultLineHeight - textHeight) * 0.5) / textHeight);
      into += line * view.viewState.heightOracle.lineLength;
    }
    var content2 = view.state.sliceDoc(block.from, block.to);
    return block.from + findColumn(content2, into, view.state.tabSize);
  }
  function blockAt(view, pos, side) {
    var line = view.lineBlockAt(pos);
    if (Array.isArray(line.type)) {
      var best;
      for (var _iterator46 = _createForOfIteratorHelperLoose(line.type), _step46; !(_step46 = _iterator46()).done;) {
        var _l = _step46.value;
        if (_l.from > pos) break;
        if (_l.to < pos) continue;
        if (_l.from < pos && _l.to > pos) return _l;
        if (!best || _l.type == BlockType.Text && (best.type != _l.type || (side < 0 ? _l.from < pos : _l.to > pos))) best = _l;
      }
      return best || line;
    }
    return line;
  }
  function _moveToLineBoundary(view, start, forward, includeWrap) {
    var line = blockAt(view, start.head, start.assoc || -1);
    var coords = !includeWrap || line.type != BlockType.Text || !(view.lineWrapping || line.widgetLineBreaks) ? null : view.coordsAtPos(start.assoc < 0 && start.head > line.from ? start.head - 1 : start.head);
    if (coords) {
      var editorRect = view.dom.getBoundingClientRect();
      var direction = view.textDirectionAt(line.from);
      var pos = view.posAtCoords({
        x: forward == (direction == Direction.LTR) ? editorRect.right - 1 : editorRect.left + 1,
        y: (coords.top + coords.bottom) / 2
      });
      if (pos != null) return EditorSelection.cursor(pos, forward ? -1 : 1);
    }
    return EditorSelection.cursor(forward ? line.to : line.from, forward ? -1 : 1);
  }
  function _moveByChar(view, start, forward, by) {
    var line = view.state.doc.lineAt(start.head),
      spans = view.bidiSpans(line);
    var direction = view.textDirectionAt(line.from);
    for (var cur = start, check = null;;) {
      var next = moveVisually(line, spans, direction, cur, forward),
        char = movedOver;
      if (!next) {
        if (line.number == (forward ? view.state.doc.lines : 1)) return cur;
        char = "\n";
        line = view.state.doc.line(line.number + (forward ? 1 : -1));
        spans = view.bidiSpans(line);
        next = view.visualLineSide(line, !forward);
      }
      if (!check) {
        if (!by) return next;
        check = by(char);
      } else if (!check(char)) {
        return cur;
      }
      cur = next;
    }
  }
  function byGroup(view, pos, start) {
    var categorize = view.state.charCategorizer(pos);
    var cat = categorize(start);
    return function (next) {
      var nextCat = categorize(next);
      if (cat == CharCategory.Space) cat = nextCat;
      return cat == nextCat;
    };
  }
  function _moveVertically(view, start, forward, distance) {
    var startPos = start.head,
      dir = forward ? 1 : -1;
    if (startPos == (forward ? view.state.doc.length : 0)) return EditorSelection.cursor(startPos, start.assoc);
    var goal = start.goalColumn,
      startY;
    var rect = view.contentDOM.getBoundingClientRect();
    var startCoords = view.coordsAtPos(startPos, start.assoc || ((start.empty ? forward : start.head == start.from) ? 1 : -1));
    var docTop = view.documentTop;
    if (startCoords) {
      if (goal == null) goal = startCoords.left - rect.left;
      startY = dir < 0 ? startCoords.top : startCoords.bottom;
    } else {
      var line = view.viewState.lineBlockAt(startPos);
      if (goal == null) goal = Math.min(rect.right - rect.left, view.defaultCharacterWidth * (startPos - line.from));
      startY = (dir < 0 ? line.top : line.bottom) + docTop;
    }
    var resolvedGoal = rect.left + goal;
    var halfText = view.viewState.heightOracle.textHeight >> 1,
      dist2 = distance !== null && distance !== void 0 ? distance : halfText;
    for (var scan = 0;; scan += halfText) {
      var y = startY + (dist2 + scan) * dir;
      var pos = _posAtCoords(view, {
        x: resolvedGoal,
        y: y
      }, false, dir);
      if (forward ? y > rect.bottom : y < rect.top) return EditorSelection.cursor(pos.pos, pos.assoc);
      var posCoords = view.coordsAtPos(pos.pos, pos.assoc),
        mid = posCoords ? (posCoords.top + posCoords.bottom) / 2 : 0;
      if (!posCoords || (forward ? mid > startY : mid < startY)) return EditorSelection.cursor(pos.pos, pos.assoc, void 0, goal);
    }
  }
  function skipAtomicRanges(atoms, pos, bias) {
    var _loop7 = function _loop7() {
        var moved = 0;
        for (var _iterator47 = _createForOfIteratorHelperLoose(atoms), _step47; !(_step47 = _iterator47()).done;) {
          var set = _step47.value;
          set.between(pos - 1, pos + 1, function (from, to, value) {
            if (pos > from && pos < to) {
              var side = moved || bias || (pos - from < to - pos ? -1 : 1);
              pos = side < 0 ? from : to;
              moved = side;
            }
          });
        }
        if (!moved) return {
          v: pos
        };
      },
      _ret;
    for (;;) {
      _ret = _loop7();
      if (_ret) return _ret.v;
    }
  }
  function skipAtomsForSelection(atoms, sel) {
    var ranges = null;
    for (var _i15 = 0; _i15 < sel.ranges.length; _i15++) {
      var range = sel.ranges[_i15],
        updated = null;
      if (range.empty) {
        var pos = skipAtomicRanges(atoms, range.from, 0);
        if (pos != range.from) updated = EditorSelection.cursor(pos, -1);
      } else {
        var from = skipAtomicRanges(atoms, range.from, -1);
        var to = skipAtomicRanges(atoms, range.to, 1);
        if (from != range.from || to != range.to) {
          if (range.undirectional) updated = EditorSelection.undirectionalRange(range.from, range.to);else updated = EditorSelection.range(range.from == range.anchor ? from : to, range.from == range.head ? from : to);
        }
      }
      if (updated) {
        if (!ranges) ranges = sel.ranges.slice();
        ranges[_i15] = updated;
      }
    }
    return ranges ? EditorSelection.create(ranges, sel.mainIndex) : sel;
  }
  function skipAtoms(view, oldPos, pos) {
    var newPos = skipAtomicRanges(view.state.facet(atomicRanges).map(function (f) {
      return f(view);
    }), pos.from, oldPos.head > pos.from ? -1 : 1);
    return newPos == pos.from ? pos : EditorSelection.cursor(newPos, newPos < pos.from ? 1 : -1);
  }
  var PosAssoc = function PosAssoc(pos, assoc) {
    this.pos = pos;
    this.assoc = assoc;
  };
  function _posAtCoords(view, coords, precise, scanY) {
    var content2 = view.contentDOM.getBoundingClientRect(),
      docTop = content2.top + view.viewState.paddingTop;
    var x = coords.x,
      y = coords.y,
      yOffset = y - docTop,
      block;
    for (;;) {
      if (yOffset < 0) return new PosAssoc(0, 1);
      if (yOffset > view.viewState.docHeight) return new PosAssoc(view.state.doc.length, -1);
      block = view.elementAtHeight(yOffset);
      if (scanY == null) break;
      if (block.type == BlockType.Text) {
        if (scanY < 0 ? block.to < view.viewport.from : block.from > view.viewport.to) break;
        var rect = view.docView.coordsAt(scanY < 0 ? block.from : block.to, scanY > 0 ? -1 : 1);
        if (rect && (scanY < 0 ? rect.top <= yOffset + docTop : rect.bottom >= yOffset + docTop)) break;
      }
      var halfLine = view.viewState.heightOracle.textHeight / 2;
      yOffset = scanY > 0 ? block.bottom + halfLine : block.top - halfLine;
    }
    if (view.viewport.from >= block.to || view.viewport.to <= block.from) {
      if (precise) return null;
      if (block.type == BlockType.Text) {
        var pos = posAtCoordsImprecise(view, content2, block, x, y);
        return new PosAssoc(pos, pos == block.from ? 1 : -1);
      }
    }
    if (block.type != BlockType.Text) return yOffset < (block.top + block.bottom) / 2 ? new PosAssoc(block.from, 1) : new PosAssoc(block.to, -1);
    var line = view.docView.lineAt(block.from, 2);
    if (!line || line.length != block.length) line = view.docView.lineAt(block.from, -2);
    return new InlineCoordsScan(view, x, y, view.textDirectionAt(block.from)).scanTile(line, block.from);
  }
  var InlineCoordsScan = function () {
    function InlineCoordsScan(view, x, y, baseDir) {
      this.view = view;
      this.x = x;
      this.y = y;
      this.baseDir = baseDir;
      this.line = null;
      this.spans = null;
    }
    var _proto60 = InlineCoordsScan.prototype;
    _proto60.bidiSpansAt = function bidiSpansAt(pos) {
      if (!this.line || this.line.from > pos || this.line.to < pos) {
        this.line = this.view.state.doc.lineAt(pos);
        this.spans = this.view.bidiSpans(this.line);
      }
      return this;
    };
    _proto60.baseDirAt = function baseDirAt(pos, side) {
      var _this$bidiSpansAt = this.bidiSpansAt(pos),
        line = _this$bidiSpansAt.line,
        spans = _this$bidiSpansAt.spans;
      var level = spans[BidiSpan.find(spans, pos - line.from, -1, side)].level;
      return level == this.baseDir;
    };
    _proto60.dirAt = function dirAt(pos, side) {
      var _this$bidiSpansAt2 = this.bidiSpansAt(pos),
        line = _this$bidiSpansAt2.line,
        spans = _this$bidiSpansAt2.spans;
      return spans[BidiSpan.find(spans, pos - line.from, -1, side)].dir;
    };
    _proto60.bidiIn = function bidiIn(from, to) {
      var _this$bidiSpansAt3 = this.bidiSpansAt(from),
        spans = _this$bidiSpansAt3.spans,
        line = _this$bidiSpansAt3.line;
      return spans.length > 1 || spans.length && (spans[0].level != this.baseDir || spans[0].to + line.from < to);
    };
    _proto60.scan = function scan(positions, getRects, recursed) {
      if (recursed === void 0) {
        recursed = false;
      }
      var lo = 0,
        hi = positions.length - 1,
        seen = new Set();
      var bidi = this.bidiIn(positions[0], positions[hi]);
      var above, below;
      var closestI = -1,
        closestDx = 1e9,
        closestRect;
      search: while (lo < hi) {
        var dist2 = hi - lo,
          mid = lo + hi >> 1;
        adjust: if (seen.has(mid)) {
          for (var _i16 = 1; _i16 < dist2; _i16++) {
            var _scan4 = mid + _i16;
            if (_scan4 >= hi) _scan4 -= dist2;
            if (!seen.has(_scan4)) {
              mid = _scan4;
              break adjust;
            }
          }
          break search;
        }
        seen.add(mid);
        var rects = getRects(mid),
          side = 0;
        if (rects) for (var _i17 = 0; _i17 < rects.length; _i17++) {
          var rect = rects[_i17];
          if (rect.width == 0 && rects.length > 1) continue;
          if (rect.bottom < this.y) {
            if (!above || above.bottom < rect.bottom) above = rect;
            side = 1;
          } else if (rect.top > this.y) {
            if (!below || below.top > rect.top) below = rect;
            side = -1;
          } else {
            var off = rect.left > this.x ? this.x - rect.left : rect.right < this.x ? this.x - rect.right : 0;
            var dx = Math.abs(off);
            if (dx < closestDx) {
              closestI = mid;
              closestDx = dx;
              closestRect = rect;
            }
            if (off) side = off < 0 == (this.baseDir == Direction.LTR) ? -1 : 1;
          }
        }
        if (side == -1 && (!bidi || this.baseDirAt(positions[mid], 1))) hi = mid;else if (side == 1 && (!bidi || this.baseDirAt(positions[mid + 1], -1))) lo = mid + 1;
      }
      if (!closestRect) {
        if (!below && !above) return {
          i: positions[0],
          after: false
        };
        var _side = above && (!below || this.y - above.bottom < below.top - this.y) ? above : below;
        this.y = (_side.top + _side.bottom) / 2;
        return this.scan(positions, getRects, true);
      }
      if (closestDx && !recursed) {
        var _closestRect = closestRect,
          top2 = _closestRect.top,
          bottom = _closestRect.bottom;
        if (above && above.bottom > (top2 + top2 + bottom) / 3) {
          this.y = above.bottom - 1;
          return this.scan(positions, getRects, true);
        }
        if (below && below.top < (top2 + bottom + bottom) / 3) {
          this.y = below.top + 1;
          return this.scan(positions, getRects, true);
        }
      }
      var ltr = (bidi ? this.dirAt(positions[closestI], 1) : this.baseDir) == Direction.LTR;
      return {
        i: closestI,
        after: this.x > (closestRect.left + closestRect.right) / 2 == ltr
      };
    };
    _proto60.scanText = function scanText(tile, offset) {
      var positions = [];
      for (var _i18 = 0; _i18 < tile.length; _i18 = findClusterBreak2(tile.text, _i18)) positions.push(offset + _i18);
      positions.push(offset + tile.length);
      var scan = this.scan(positions, function (i2) {
        var off = positions[i2] - offset,
          end = positions[i2 + 1] - offset;
        return textRange(tile.dom, off, end).getClientRects();
      });
      return scan.after ? new PosAssoc(positions[scan.i + 1], -1) : new PosAssoc(positions[scan.i], 1);
    };
    _proto60.scanTile = function scanTile(tile, offset) {
      if (!tile.length) return new PosAssoc(offset, 1);
      if (tile.children.length == 1) {
        var child2 = tile.children[0];
        if (child2.isText()) return this.scanText(child2, offset);else if (child2.isComposite()) return this.scanTile(child2, offset);
      }
      var positions = [offset];
      for (var _i19 = 0, pos2 = offset; _i19 < tile.children.length; _i19++) positions.push(pos2 += tile.children[_i19].length);
      var scan = this.scan(positions, function (i2) {
        var child2 = tile.children[i2];
        if (child2.flags & 48) return null;
        return (child2.dom.nodeType == 1 ? child2.dom : textRange(child2.dom, 0, child2.length)).getClientRects();
      });
      var child = tile.children[scan.i],
        pos = positions[scan.i];
      if (child.isText()) return this.scanText(child, pos);
      if (child.isComposite()) return this.scanTile(child, pos);
      return scan.after ? new PosAssoc(positions[scan.i + 1], -1) : new PosAssoc(pos, 1);
    };
    return InlineCoordsScan;
  }();
  var LineBreakPlaceholder = "\uFFFF";
  var DOMReader = function () {
    function DOMReader(points, view) {
      this.points = points;
      this.view = view;
      this.text = "";
      this.lineSeparator = view.state.facet(EditorState.lineSeparator);
    }
    var _proto61 = DOMReader.prototype;
    _proto61.append = function append(text) {
      this.text += text;
    };
    _proto61.lineBreak = function lineBreak() {
      this.text += LineBreakPlaceholder;
    };
    _proto61.readRange = function readRange(start, end) {
      if (!start) return this;
      var parent = start.parentNode;
      for (var cur = start;;) {
        this.findPointBefore(parent, cur);
        var oldLen = this.text.length;
        this.readNode(cur);
        var tile = Tile.get(cur),
          next = cur.nextSibling;
        if (next == end) {
          if ((tile === null || tile === void 0 ? void 0 : tile.breakAfter) && !next && parent != this.view.contentDOM) this.lineBreak();
          break;
        }
        var nextTile = Tile.get(next);
        if ((tile && nextTile ? tile.breakAfter : (tile ? tile.breakAfter : isBlockElement(cur)) || isBlockElement(next) && (cur.nodeName != "BR" || (tile === null || tile === void 0 ? void 0 : tile.isWidget())) && this.text.length > oldLen) && !isEmptyToEnd(next, end)) this.lineBreak();
        cur = next;
      }
      this.findPointBefore(parent, end);
      return this;
    };
    _proto61.readTextNode = function readTextNode(node) {
      var text = node.nodeValue;
      for (var _iterator48 = _createForOfIteratorHelperLoose(this.points), _step48; !(_step48 = _iterator48()).done;) {
        var _point = _step48.value;
        if (_point.node == node) _point.pos = this.text.length + Math.min(_point.offset, text.length);
      }
      for (var off = 0, re = this.lineSeparator ? null : new RegExp("\\r\\n?|\\n", "g");;) {
        var nextBreak = -1,
          breakSize = 1,
          m = void 0;
        if (this.lineSeparator) {
          nextBreak = text.indexOf(this.lineSeparator, off);
          breakSize = this.lineSeparator.length;
        } else if (m = re.exec(text)) {
          nextBreak = m.index;
          breakSize = m[0].length;
        }
        this.append(text.slice(off, nextBreak < 0 ? text.length : nextBreak));
        if (nextBreak < 0) break;
        this.lineBreak();
        if (breakSize > 1) {
          for (var _iterator49 = _createForOfIteratorHelperLoose(this.points), _step49; !(_step49 = _iterator49()).done;) {
            var point = _step49.value;
            if (point.node == node && point.pos > this.text.length) point.pos -= breakSize - 1;
          }
        }
        off = nextBreak + breakSize;
      }
    };
    _proto61.readNode = function readNode(node) {
      var tile = Tile.get(node);
      var fromView = tile && tile.overrideDOMText;
      if (fromView != null) {
        this.findPointInside(node, fromView.length);
        for (var _i20 = fromView.iter(); !_i20.next().done;) {
          if (_i20.lineBreak) this.lineBreak();else this.append(_i20.value);
        }
      } else if (node.nodeType == 3) {
        this.readTextNode(node);
      } else if (node.nodeName == "BR") {
        if (node.nextSibling) this.lineBreak();
      } else if (node.nodeType == 1) {
        this.readRange(node.firstChild, null);
      }
    };
    _proto61.findPointBefore = function findPointBefore(node, next) {
      for (var _iterator50 = _createForOfIteratorHelperLoose(this.points), _step50; !(_step50 = _iterator50()).done;) {
        var point = _step50.value;
        if (point.node == node && node.childNodes[point.offset] == next) point.pos = this.text.length;
      }
    };
    _proto61.findPointInside = function findPointInside(node, length) {
      for (var _iterator51 = _createForOfIteratorHelperLoose(this.points), _step51; !(_step51 = _iterator51()).done;) {
        var point = _step51.value;
        if (node.nodeType == 3 ? point.node == node : node.contains(point.node)) point.pos = this.text.length + (isAtEnd(node, point.node, point.offset) ? length : 0);
      }
    };
    return DOMReader;
  }();
  function isAtEnd(parent, node, offset) {
    for (;;) {
      if (!node || offset < maxOffset(node)) return false;
      if (node == parent) return true;
      offset = domIndex(node) + 1;
      node = node.parentNode;
    }
  }
  function isEmptyToEnd(node, end) {
    var widgets;
    for (;; node = node.nextSibling) {
      if (node == end || !node) break;
      var view = Tile.get(node);
      if (!(view === null || view === void 0 ? void 0 : view.isWidget())) return false;
      if (view) (widgets || (widgets = [])).push(view);
    }
    if (widgets) {
      for (var _iterator52 = _createForOfIteratorHelperLoose(widgets), _step52; !(_step52 = _iterator52()).done;) {
        var w = _step52.value;
        var override = w.overrideDOMText;
        if (override === null || override === void 0 ? void 0 : override.length) return false;
      }
    }
    return true;
  }
  var DOMPoint = function DOMPoint(node, offset) {
    this.node = node;
    this.offset = offset;
    this.pos = -1;
  };
  var DOMChange = function DOMChange(view, start, end, typeOver) {
    this.typeOver = typeOver;
    this.bounds = null;
    this.text = "";
    this.domChanged = start > -1;
    var _view$docView = view.docView,
      iHead = _view$docView.impreciseHead,
      iAnchor = _view$docView.impreciseAnchor,
      curSel = view.state.selection;
    if (view.state.readOnly && start > -1) {
      this.newSel = null;
    } else if (start > -1 && (this.bounds = domBoundsAround(view.docView.tile, start, end, 0))) {
      var selPoints = iHead || iAnchor ? [] : selectionPoints(view);
      var reader = new DOMReader(selPoints, view);
      reader.readRange(this.bounds.startDOM, this.bounds.endDOM);
      this.text = reader.text;
      this.newSel = selectionFromPoints(selPoints, this.bounds.from);
    } else {
      var domSel = view.observer.selectionRange;
      var head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset || !contains(view.contentDOM, domSel.focusNode) ? curSel.main.head : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
      var anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset || !contains(view.contentDOM, domSel.anchorNode) ? curSel.main.anchor : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
      var vp = view.viewport;
      if ((browser.ios || browser.chrome) && head != anchor && Math.min(head, anchor) <= curSel.main.from && Math.max(head, anchor) >= curSel.main.to && (vp.from > 0 || vp.to < view.state.doc.length)) {
        var from = Math.min(head, anchor),
          to = Math.max(head, anchor);
        var offFrom = vp.from - from,
          offTo = vp.to - to;
        if ((offFrom == 0 || offFrom == 1 || from == 0) && (offTo == 0 || offTo == -1 || to == view.state.doc.length)) {
          head = 0;
          anchor = view.state.doc.length;
        }
      }
      if (view.inputState.composing > -1 && curSel.ranges.length > 1) {
        this.newSel = curSel.replaceRange(EditorSelection.range(anchor, head));
      } else if (view.lineWrapping && anchor == head && !(curSel.main.empty && curSel.main.head == head) && view.inputState.lastTouchTime > Date.now() - 100) {
        var before = view.coordsAtPos(head, -1),
          assoc = 0;
        if (before) assoc = view.inputState.lastTouchY <= before.bottom ? -1 : 1;
        this.newSel = EditorSelection.create([EditorSelection.cursor(head, assoc)]);
      } else {
        this.newSel = EditorSelection.single(anchor, head);
      }
    }
  };
  function domBoundsAround(tile, from, to, offset) {
    if (tile.isComposite()) {
      var fromI = -1,
        fromStart = -1,
        toI = -1,
        toEnd = -1;
      for (var _i21 = 0, pos = offset, prevEnd = offset; _i21 < tile.children.length; _i21++) {
        var child = tile.children[_i21],
          end = pos + child.length;
        if (pos < from && end > to) return domBoundsAround(child, from, to, pos);
        if (end >= from && fromI == -1) {
          fromI = _i21;
          fromStart = pos;
        }
        if (pos > to && child.dom.parentNode == tile.dom) {
          toI = _i21;
          toEnd = prevEnd;
          break;
        }
        prevEnd = end;
        pos = end + child.breakAfter;
      }
      return {
        from: fromStart,
        to: toEnd < 0 ? offset + tile.length : toEnd,
        startDOM: (fromI ? tile.children[fromI - 1].dom.nextSibling : null) || tile.dom.firstChild,
        endDOM: toI < tile.children.length && toI >= 0 ? tile.children[toI].dom : null
      };
    } else if (tile.isText()) {
      return {
        from: offset,
        to: offset + tile.length,
        startDOM: tile.dom,
        endDOM: tile.dom.nextSibling
      };
    } else {
      return null;
    }
  }
  function applyDOMChange(view, domChange) {
    var change;
    var newSel = domChange.newSel,
      state = view.state,
      sel = state.selection.main;
    var lastKey = view.inputState.lastKeyTime > Date.now() - 100 ? view.inputState.lastKeyCode : -1;
    if (domChange.bounds) {
      var _domChange$bounds = domChange.bounds,
        from = _domChange$bounds.from,
        to = _domChange$bounds.to;
      var preferredPos = sel.from,
        preferredSide = null;
      if (lastKey === 8 || browser.android && domChange.text.length < to - from) {
        preferredPos = sel.to;
        preferredSide = "end";
      }
      var cmp = state.doc.sliceString(from, to, LineBreakPlaceholder),
        selEnd,
        diff;
      if (!sel.empty && sel.from >= from && sel.to <= to && (domChange.typeOver || cmp != domChange.text) && cmp.slice(0, sel.from - from) == domChange.text.slice(0, sel.from - from) && cmp.slice(sel.to - from) == domChange.text.slice(selEnd = domChange.text.length - (cmp.length - (sel.to - from)))) {
        change = {
          from: sel.from,
          to: sel.to,
          insert: Text.of(domChange.text.slice(sel.from - from, selEnd).split(LineBreakPlaceholder))
        };
      } else if (diff = findDiff(cmp, domChange.text, preferredPos - from, preferredSide)) {
        if (browser.chrome && lastKey == 13 && diff.toB == diff.from + 2 && domChange.text.slice(diff.from, diff.toB) == LineBreakPlaceholder + LineBreakPlaceholder) diff.toB--;
        change = {
          from: from + diff.from,
          to: from + diff.toA,
          insert: Text.of(domChange.text.slice(diff.from, diff.toB).split(LineBreakPlaceholder))
        };
      }
    } else if (newSel && (!view.hasFocus && state.facet(editable) || sameSelPos(newSel, sel))) {
      newSel = null;
    }
    if (!change && !newSel) return false;
    if ((browser.mac || browser.android) && change && change.from == change.to && change.from == sel.head - 1 && /^\. ?$/.test(change.insert.toString()) && view.contentDOM.getAttribute("autocorrect") == "off") {
      if (newSel && change.insert.length == 2) newSel = EditorSelection.single(newSel.main.anchor - 1, newSel.main.head - 1);
      change = {
        from: change.from,
        to: change.to,
        insert: Text.of([change.insert.toString().replace(".", " ")])
      };
    } else if (state.doc.lineAt(sel.from).to < sel.to && view.docView.lineHasWidget(sel.to) && view.inputState.insertingTextAt > Date.now() - 50) {
      change = {
        from: sel.from,
        to: sel.to,
        insert: state.toText(view.inputState.insertingText)
      };
    } else if (browser.chrome && change && change.from == change.to && change.from == sel.head && change.insert.toString() == "\n " && view.lineWrapping) {
      if (newSel) newSel = EditorSelection.single(newSel.main.anchor - 1, newSel.main.head - 1);
      change = {
        from: sel.from,
        to: sel.to,
        insert: Text.of([" "])
      };
    }
    if (change) {
      return applyDOMChangeInner(view, change, newSel, lastKey);
    } else if (newSel && !sameSelPos(newSel, sel)) {
      var scrollIntoView2 = false,
        userEvent = "select";
      if (view.inputState.lastSelectionTime > Date.now() - 50) {
        if (view.inputState.lastSelectionOrigin == "select") scrollIntoView2 = true;
        userEvent = view.inputState.lastSelectionOrigin;
        if (userEvent == "select.pointer") newSel = skipAtomsForSelection(state.facet(atomicRanges).map(function (f) {
          return f(view);
        }), newSel);
      }
      view.dispatch({
        selection: newSel,
        scrollIntoView: scrollIntoView2,
        userEvent: userEvent
      });
      return true;
    } else {
      return false;
    }
  }
  function applyDOMChangeInner(view, change, newSel, lastKey) {
    if (lastKey === void 0) {
      lastKey = -1;
    }
    if (browser.ios && view.inputState.flushIOSKey(change)) return true;
    var sel = view.state.selection.main;
    if (browser.android && (change.to == sel.to && (change.from == sel.from || change.from == sel.from - 1 && view.state.sliceDoc(change.from, sel.from) == " ") && change.insert.length == 1 && change.insert.lines == 2 && dispatchKey(view.contentDOM, "Enter", 13) || (change.from == sel.from - 1 && change.to == sel.to && change.insert.length == 0 || lastKey == 8 && change.insert.length < change.to - change.from && change.to > sel.head) && dispatchKey(view.contentDOM, "Backspace", 8) || change.from == sel.from && change.to == sel.to + 1 && change.insert.length == 0 && dispatchKey(view.contentDOM, "Delete", 46))) return true;
    var text = change.insert.toString();
    if (view.inputState.composing >= 0) view.inputState.composing++;
    var defaultTr;
    var defaultInsert = function defaultInsert() {
      return defaultTr || (defaultTr = applyDefaultInsert(view, change, newSel));
    };
    if (!view.state.facet(inputHandler).some(function (h) {
      return h(view, change.from, change.to, text, defaultInsert);
    })) view.dispatch(defaultInsert());
    return true;
  }
  function applyDefaultInsert(view, change, newSel) {
    var tr,
      startState = view.state,
      sel = startState.selection.main,
      inAtomic = -1;
    if (change.from == change.to && change.from < sel.from || change.from > sel.to) {
      var side = change.from < sel.from ? -1 : 1,
        pos = side < 0 ? sel.from : sel.to;
      var moved = skipAtomicRanges(startState.facet(atomicRanges).map(function (f) {
        return f(view);
      }), pos, side);
      if (change.from == moved) inAtomic = moved;
    }
    if (inAtomic > -1) {
      tr = {
        changes: change,
        selection: EditorSelection.cursor(change.from + change.insert.length, -1)
      };
    } else if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3 && (!newSel || newSel.main.empty && newSel.main.from == change.from + change.insert.length) && view.inputState.composing < 0) {
      var before = sel.from < change.from ? startState.sliceDoc(sel.from, change.from) : "";
      var after = sel.to > change.to ? startState.sliceDoc(change.to, sel.to) : "";
      tr = startState.replaceSelection(view.state.toText(before + change.insert.sliceString(0, void 0, view.state.lineBreak) + after));
    } else {
      var changes = startState.changes(change);
      var mainSel = newSel && newSel.main.to <= changes.newLength ? newSel.main : void 0;
      if (startState.selection.ranges.length > 1 && (view.inputState.composing >= 0 || view.inputState.compositionPendingChange) && change.to <= sel.to + 10 && change.to >= sel.to - 10) {
        var replaced = view.state.sliceDoc(change.from, change.to);
        var compositionRange,
          composition = newSel && findCompositionNode(view, newSel.main.head);
        if (composition) {
          var dLen = change.insert.length - (change.to - change.from);
          compositionRange = {
            from: composition.from,
            to: composition.to - dLen
          };
        } else {
          compositionRange = view.state.doc.lineAt(sel.head);
        }
        var offset = sel.to - change.to;
        tr = startState.changeByRange(function (range) {
          if (range.from == sel.from && range.to == sel.to) return {
            changes: changes,
            range: mainSel || range.map(changes)
          };
          var to = range.to - offset,
            from = to - replaced.length;
          if (view.state.sliceDoc(from, to) != replaced || to >= compositionRange.from && from <= compositionRange.to) return {
            range: range
          };
          var rangeChanges = startState.changes({
              from: from,
              to: to,
              insert: change.insert
            }),
            selOff = range.to - sel.to;
          return {
            changes: rangeChanges,
            range: !mainSel ? range.map(rangeChanges) : EditorSelection.range(Math.max(0, mainSel.anchor + selOff), Math.max(0, mainSel.head + selOff))
          };
        });
      } else {
        tr = {
          changes: changes,
          selection: mainSel && startState.selection.replaceRange(mainSel)
        };
      }
    }
    var userEvent = "input.type";
    if (view.composing || view.inputState.compositionPendingChange && view.inputState.compositionEndedAt > Date.now() - 50) {
      view.inputState.compositionPendingChange = false;
      userEvent += ".compose";
      if (view.inputState.compositionFirstChange) {
        userEvent += ".start";
        view.inputState.compositionFirstChange = false;
      }
    }
    return startState.update(tr, {
      userEvent: userEvent,
      scrollIntoView: true
    });
  }
  function findDiff(a, b, preferredPos, preferredSide) {
    var minLen = Math.min(a.length, b.length);
    var from = 0;
    while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from)) from++;
    if (from == minLen && a.length == b.length) return null;
    var toA = a.length,
      toB = b.length;
    while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
      toA--;
      toB--;
    }
    if (preferredSide == "end") {
      var adjust = Math.max(0, from - Math.min(toA, toB));
      preferredPos -= toA + adjust - from;
    }
    if (toA < from && a.length < b.length) {
      var move = preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
      from -= move;
      toB = from + (toB - toA);
      toA = from;
    } else if (toB < from) {
      var _move = preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
      from -= _move;
      toA = from + (toA - toB);
      toB = from;
    }
    return {
      from: from,
      toA: toA,
      toB: toB
    };
  }
  function selectionPoints(view) {
    var result = [];
    if (view.root.activeElement != view.contentDOM) return result;
    var _view$observer$select2 = view.observer.selectionRange,
      anchorNode = _view$observer$select2.anchorNode,
      anchorOffset = _view$observer$select2.anchorOffset,
      focusNode = _view$observer$select2.focusNode,
      focusOffset = _view$observer$select2.focusOffset;
    if (anchorNode) {
      result.push(new DOMPoint(anchorNode, anchorOffset));
      if (focusNode != anchorNode || focusOffset != anchorOffset) result.push(new DOMPoint(focusNode, focusOffset));
    }
    return result;
  }
  function selectionFromPoints(points, base2) {
    if (points.length == 0) return null;
    var anchor = points[0].pos,
      head = points.length == 2 ? points[1].pos : anchor;
    return anchor > -1 && head > -1 ? EditorSelection.single(anchor + base2, head + base2) : null;
  }
  function sameSelPos(selection, range) {
    return range.head == selection.main.head && range.anchor == selection.main.anchor;
  }
  var InputState = function () {
    function InputState(view) {
      this.view = view;
      this.lastKeyCode = 0;
      this.lastKeyTime = 0;
      this.touchActive = false;
      this.lastTouchTime = 0;
      this.lastTouchX = 0;
      this.lastTouchY = 0;
      this.lastFocusTime = 0;
      this.lastScrollTop = 0;
      this.lastScrollLeft = 0;
      this.lastWheelEvent = 0;
      this.pendingIOSKey = void 0;
      this.lastIOSMomentumScroll = 0;
      this.tabFocusMode = -1;
      this.lastSelectionOrigin = null;
      this.lastSelectionTime = 0;
      this.lastContextMenu = 0;
      this.scrollHandlers = [];
      this.handlers = Object.create(null);
      this.composing = -1;
      this.compositionFirstChange = null;
      this.compositionEndedAt = 0;
      this.compositionPendingKey = false;
      this.compositionPendingChange = false;
      this.insertingText = "";
      this.insertingTextAt = 0;
      this.mouseSelection = null;
      this.draggedContent = null;
      this.handleEvent = this.handleEvent.bind(this);
      this.notifiedFocused = view.hasFocus;
      if (browser.safari) view.contentDOM.addEventListener("input", function () {
        return null;
      });
      if (browser.gecko) firefoxCopyCutHack(view.contentDOM.ownerDocument);
    }
    var _proto62 = InputState.prototype;
    _proto62.setSelectionOrigin = function setSelectionOrigin(origin) {
      this.lastSelectionOrigin = origin;
      this.lastSelectionTime = Date.now();
    };
    _proto62.handleEvent = function handleEvent(event) {
      var _this30 = this;
      if (!eventBelongsToEditor(this.view, event) || this.ignoreDuringComposition(event)) return;
      if (event.type == "keydown" && this.keydown(event)) return;
      if (this.view.updateState != 0) Promise.resolve().then(function () {
        return _this30.runHandlers(event.type, event);
      });else this.runHandlers(event.type, event);
    };
    _proto62.runHandlers = function runHandlers(type, event) {
      var handlers2 = this.handlers[type];
      if (handlers2) {
        for (var _iterator53 = _createForOfIteratorHelperLoose(handlers2.observers), _step53; !(_step53 = _iterator53()).done;) {
          var observer = _step53.value;
          observer(this.view, event);
        }
        for (var _iterator54 = _createForOfIteratorHelperLoose(handlers2.handlers), _step54; !(_step54 = _iterator54()).done;) {
          var handler = _step54.value;
          if (event.defaultPrevented) break;
          if (handler(this.view, event)) {
            event.preventDefault();
            break;
          }
        }
      }
    };
    _proto62.ensureHandlers = function ensureHandlers(plugins) {
      var handlers2 = computeHandlers(plugins),
        prev = this.handlers,
        dom = this.view.contentDOM;
      for (var type in handlers2) if (type != "scroll") {
        var passive = !handlers2[type].handlers.length;
        var exists = prev[type];
        if (exists && passive != !exists.handlers.length) {
          dom.removeEventListener(type, this.handleEvent);
          exists = null;
        }
        if (!exists) dom.addEventListener(type, this.handleEvent, {
          passive: passive
        });
      }
      for (var _type3 in prev) if (_type3 != "scroll" && !handlers2[_type3]) dom.removeEventListener(_type3, this.handleEvent);
      this.handlers = handlers2;
    };
    _proto62.keydown = function keydown(event) {
      var _this31 = this;
      this.lastKeyCode = event.keyCode;
      this.lastKeyTime = Date.now();
      if (event.keyCode == 9 && this.tabFocusMode > -1 && (!this.tabFocusMode || Date.now() <= this.tabFocusMode)) return true;
      if (this.tabFocusMode > 0 && event.keyCode != 27 && modifierCodes.indexOf(event.keyCode) < 0) this.tabFocusMode = -1;
      if (browser.android && browser.chrome && !event.synthetic && (event.keyCode == 13 || event.keyCode == 8)) {
        this.view.observer.delayAndroidKey(event.key, event.keyCode);
        return true;
      }
      if (browser.ios && !event.synthetic && !event.altKey && !event.metaKey && (PendingKeys.some(function (key) {
        return key.keyCode == event.keyCode;
      }) && !event.ctrlKey || EmacsyPendingKeys.indexOf(event.key) > -1 && event.ctrlKey)) {
        var mods = {
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey
        };
        if (mods.shiftKey && browser.ios && !/^(off|none)$/.test(this.view.contentDOM.autocapitalize) && iosVirtualKeyboardOpen(this.view.win)) mods.shiftKey = false;
        this.pendingIOSKey = {
          key: event.key,
          keyCode: event.keyCode,
          mods: mods
        };
        setTimeout(function () {
          return _this31.flushIOSKey();
        }, 250);
        return true;
      }
      if (event.keyCode != 229) this.view.observer.forceFlush();
      return false;
    };
    _proto62.flushIOSKey = function flushIOSKey(change) {
      var key = this.pendingIOSKey;
      if (!key) return false;
      if (key.key == "Enter" && change && change.from < change.to && /^\S+$/.test(change.insert.toString())) return false;
      this.pendingIOSKey = void 0;
      return dispatchKey(this.view.contentDOM, key.key, key.keyCode, key.mods);
    };
    _proto62.ignoreDuringComposition = function ignoreDuringComposition(event) {
      if (!/^key/.test(event.type) || event.synthetic) return false;
      if (this.composing > 0) return true;
      if (browser.safari && !browser.ios && this.compositionPendingKey && Date.now() - this.compositionEndedAt < 100) {
        this.compositionPendingKey = false;
        return true;
      }
      return false;
    };
    _proto62.startMouseSelection = function startMouseSelection(mouseSelection) {
      if (this.mouseSelection) this.mouseSelection.destroy();
      this.mouseSelection = mouseSelection;
    };
    _proto62.update = function update(_update3) {
      this.view.observer.update(_update3);
      if (this.mouseSelection) this.mouseSelection.update(_update3);
      if (this.draggedContent && _update3.docChanged) this.draggedContent = this.draggedContent.map(_update3.changes);
      if (_update3.transactions.length) this.lastKeyCode = this.lastSelectionTime = 0;
    };
    _proto62.destroy = function destroy() {
      if (this.mouseSelection) this.mouseSelection.destroy();
    };
    return InputState;
  }();
  function iosVirtualKeyboardOpen(win) {
    if (!win.visualViewport) return false;
    return win.visualViewport.height * win.visualViewport.scale / win.document.documentElement.clientHeight < 0.85;
  }
  function bindHandler(plugin, handler) {
    return function (view, event) {
      try {
        return handler.call(plugin, event, view);
      } catch (_e5) {
        logException(view.state, _e5);
      }
    };
  }
  function computeHandlers(plugins) {
    var result = Object.create(null);
    function record(type) {
      return result[type] || (result[type] = {
        observers: [],
        handlers: []
      });
    }
    for (var _iterator55 = _createForOfIteratorHelperLoose(plugins), _step55; !(_step55 = _iterator55()).done;) {
      var plugin = _step55.value;
      var spec = plugin.spec,
        handlers2 = spec && spec.plugin.domEventHandlers,
        observers2 = spec && spec.plugin.domEventObservers;
      if (handlers2) for (var _type5 in handlers2) {
        var f = handlers2[_type5];
        if (f) record(_type5).handlers.push(bindHandler(plugin.value, f));
      }
      if (observers2) for (var _type6 in observers2) {
        var _f2 = observers2[_type6];
        if (_f2) record(_type6).observers.push(bindHandler(plugin.value, _f2));
      }
    }
    for (var type in handlers) record(type).handlers.push(handlers[type]);
    for (var _type4 in observers) record(_type4).observers.push(observers[_type4]);
    return result;
  }
  var PendingKeys = [{
    key: "Backspace",
    keyCode: 8,
    inputType: "deleteContentBackward"
  }, {
    key: "Enter",
    keyCode: 13,
    inputType: "insertParagraph"
  }, {
    key: "Enter",
    keyCode: 13,
    inputType: "insertLineBreak"
  }, {
    key: "Delete",
    keyCode: 46,
    inputType: "deleteContentForward"
  }];
  var EmacsyPendingKeys = "dthko";
  var modifierCodes = [16, 17, 18, 20, 91, 92, 224, 225];
  var dragScrollMargin = 6;
  function dragScrollSpeed(dist2) {
    return Math.max(0, dist2) * 0.7 + 8;
  }
  function dist(a, b) {
    return Math.max(Math.abs(a.clientX - b.clientX), Math.abs(a.clientY - b.clientY));
  }
  var MouseSelection = function () {
    function MouseSelection(view, startEvent, style, mustSelect) {
      this.view = view;
      this.startEvent = startEvent;
      this.style = style;
      this.mustSelect = mustSelect;
      this.scrollSpeed = {
        x: 0,
        y: 0
      };
      this.scrolling = -1;
      this.lastEvent = startEvent;
      this.scrollParents = scrollableParents(view.contentDOM);
      this.atoms = view.state.facet(atomicRanges).map(function (f) {
        return f(view);
      });
      var doc2 = view.contentDOM.ownerDocument;
      doc2.addEventListener("mousemove", this.move = this.move.bind(this));
      doc2.addEventListener("mouseup", this.up = this.up.bind(this));
      this.extend = startEvent.shiftKey;
      this.multiple = view.state.facet(EditorState.allowMultipleSelections) && addsSelectionRange(view, startEvent);
      this.dragging = isInPrimarySelection(view, startEvent) && getClickType(startEvent) == 1 ? null : false;
    }
    var _proto63 = MouseSelection.prototype;
    _proto63.start = function start(event) {
      if (this.dragging === false) this.select(event);
    };
    _proto63.move = function move(event) {
      if (event.buttons == 0) return this.destroy();
      if (this.dragging || this.dragging == null && dist(this.startEvent, event) < 10) return;
      this.select(this.lastEvent = event);
      var sx = 0,
        sy = 0;
      var left = 0,
        top2 = 0,
        right = this.view.win.innerWidth,
        bottom = this.view.win.innerHeight;
      if (this.scrollParents.x) {
        var _this$scrollParents$x = this.scrollParents.x.getBoundingClientRect();
        left = _this$scrollParents$x.left;
        right = _this$scrollParents$x.right;
      }
      if (this.scrollParents.y) {
        var _this$scrollParents$y = this.scrollParents.y.getBoundingClientRect();
        top2 = _this$scrollParents$y.top;
        bottom = _this$scrollParents$y.bottom;
      }
      var margins = getScrollMargins(this.view);
      if (event.clientX - margins.left <= left + dragScrollMargin) sx = -dragScrollSpeed(left - event.clientX);else if (event.clientX + margins.right >= right - dragScrollMargin) sx = dragScrollSpeed(event.clientX - right);
      if (event.clientY - margins.top <= top2 + dragScrollMargin) sy = -dragScrollSpeed(top2 - event.clientY);else if (event.clientY + margins.bottom >= bottom - dragScrollMargin) sy = dragScrollSpeed(event.clientY - bottom);
      this.setScrollSpeed(sx, sy);
    };
    _proto63.up = function up(event) {
      if (this.dragging == null) this.select(this.lastEvent);
      if (!this.dragging) event.preventDefault();
      this.destroy();
    };
    _proto63.destroy = function destroy() {
      this.setScrollSpeed(0, 0);
      var doc2 = this.view.contentDOM.ownerDocument;
      doc2.removeEventListener("mousemove", this.move);
      doc2.removeEventListener("mouseup", this.up);
      this.view.inputState.mouseSelection = this.view.inputState.draggedContent = null;
    };
    _proto63.setScrollSpeed = function setScrollSpeed(sx, sy) {
      var _this32 = this;
      this.scrollSpeed = {
        x: sx,
        y: sy
      };
      if (sx || sy) {
        if (this.scrolling < 0) this.scrolling = setInterval(function () {
          return _this32.scroll();
        }, 50);
      } else if (this.scrolling > -1) {
        clearInterval(this.scrolling);
        this.scrolling = -1;
      }
    };
    _proto63.scroll = function scroll() {
      var _this$scrollSpeed = this.scrollSpeed,
        x = _this$scrollSpeed.x,
        y = _this$scrollSpeed.y;
      if (x && this.scrollParents.x) {
        this.scrollParents.x.scrollLeft += x;
        x = 0;
      }
      if (y && this.scrollParents.y) {
        this.scrollParents.y.scrollTop += y;
        y = 0;
      }
      if (x || y) this.view.win.scrollBy(x, y);
      if (this.dragging === false) this.select(this.lastEvent);
    };
    _proto63.select = function select(event) {
      var view = this.view,
        selection = skipAtomsForSelection(this.atoms, this.style.get(event, this.extend, this.multiple));
      if (this.mustSelect || !selection.eq(view.state.selection, this.dragging === false)) this.view.dispatch({
        selection: selection,
        userEvent: "select.pointer"
      });
      this.mustSelect = false;
    };
    _proto63.update = function update(_update4) {
      var _this33 = this;
      if (_update4.transactions.some(function (tr) {
        return tr.isUserEvent("input.type");
      })) this.destroy();else if (this.style.update(_update4)) setTimeout(function () {
        return _this33.select(_this33.lastEvent);
      }, 20);
    };
    return MouseSelection;
  }();
  function addsSelectionRange(view, event) {
    var facet = view.state.facet(clickAddsSelectionRange);
    return facet.length ? facet[0](event) : browser.mac ? event.metaKey : event.ctrlKey;
  }
  function dragMovesSelection(view, event) {
    var facet = view.state.facet(dragMovesSelection$1);
    return facet.length ? facet[0](event) : browser.mac ? !event.altKey : !event.ctrlKey;
  }
  function isInPrimarySelection(view, event) {
    var main = view.state.selection.main;
    if (main.empty) return false;
    var sel = getSelection(view.root);
    if (!sel || sel.rangeCount == 0) return true;
    var rects = sel.getRangeAt(0).getClientRects();
    for (var _i22 = 0; _i22 < rects.length; _i22++) {
      var rect = rects[_i22];
      if (rect.left <= event.clientX && rect.right >= event.clientX && rect.top <= event.clientY && rect.bottom >= event.clientY) return true;
    }
    return false;
  }
  function eventBelongsToEditor(view, event) {
    if (!event.bubbles) return true;
    if (event.defaultPrevented) return false;
    for (var node = event.target, tile; node != view.contentDOM; node = node.parentNode) if (!node || node.nodeType == 11 || (tile = Tile.get(node)) && tile.isWidget() && !tile.isHidden && tile.widget.ignoreEvent(event)) return false;
    return true;
  }
  var handlers = Object.create(null);
  var observers = Object.create(null);
  var brokenClipboardAPI = browser.ie && browser.ie_version < 15 || browser.ios && browser.webkit_version < 604;
  function capturePaste(view) {
    var parent = view.dom.parentNode;
    if (!parent) return;
    var target = parent.appendChild(document.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.focus();
    setTimeout(function () {
      view.focus();
      target.remove();
      doPaste(view, target.value);
    }, 50);
  }
  function textFilter(state, facet, text) {
    for (var _iterator56 = _createForOfIteratorHelperLoose(state.facet(facet)), _step56; !(_step56 = _iterator56()).done;) {
      var filter = _step56.value;
      text = filter(text, state);
    }
    return text;
  }
  function doPaste(view, input) {
    input = textFilter(view.state, clipboardInputFilter, input);
    var state = view.state,
      changes,
      i2 = 1,
      text = state.toText(input);
    var byLine = text.lines == state.selection.ranges.length;
    var linewise = lastLinewiseCopy != null && state.selection.ranges.every(function (r) {
      return r.empty;
    }) && lastLinewiseCopy == text.toString();
    if (linewise) {
      var lastLine = -1;
      changes = state.changeByRange(function (range) {
        var line = state.doc.lineAt(range.from);
        if (line.from == lastLine) return {
          range: range
        };
        lastLine = line.from;
        var insert2 = state.toText((byLine ? text.line(i2++).text : input) + state.lineBreak);
        return {
          changes: {
            from: line.from,
            insert: insert2
          },
          range: EditorSelection.cursor(range.from + insert2.length)
        };
      });
    } else if (byLine) {
      changes = state.changeByRange(function (range) {
        var line = text.line(i2++);
        return {
          changes: {
            from: range.from,
            to: range.to,
            insert: line.text
          },
          range: EditorSelection.cursor(range.from + line.length)
        };
      });
    } else {
      changes = state.replaceSelection(text);
    }
    view.dispatch(changes, {
      userEvent: "input.paste",
      scrollIntoView: true
    });
  }
  observers.scroll = function (view) {
    var iState = view.inputState;
    iState.lastScrollTop = view.scrollDOM.scrollTop;
    iState.lastScrollLeft = view.scrollDOM.scrollLeft;
    if (browser.ios && !iState.touchActive) iState.lastIOSMomentumScroll = Date.now();
  };
  observers.wheel = observers.mousewheel = function (view) {
    view.inputState.lastWheelEvent = Date.now();
  };
  handlers.keydown = function (view, event) {
    view.inputState.setSelectionOrigin("select");
    if (event.keyCode == 27 && view.inputState.tabFocusMode != 0) view.inputState.tabFocusMode = Date.now() + 2e3;
    return false;
  };
  observers.touchstart = function (view, e) {
    var iState = view.inputState,
      touch = e.targetTouches[0];
    iState.touchActive = true;
    iState.lastTouchTime = Date.now();
    if (touch) {
      iState.lastTouchX = touch.clientX;
      iState.lastTouchY = touch.clientY;
    }
    iState.setSelectionOrigin("select.pointer");
  };
  observers.touchmove = function (view) {
    view.inputState.setSelectionOrigin("select.pointer");
  };
  observers.touchend = function (view, e) {
    view.inputState.touchActive = false;
  };
  handlers.mousedown = function (view, event) {
    view.observer.flush();
    if (view.inputState.lastTouchTime > Date.now() - 2e3) return false;
    var style = null;
    for (var _iterator57 = _createForOfIteratorHelperLoose(view.state.facet(mouseSelectionStyle)), _step57; !(_step57 = _iterator57()).done;) {
      var makeStyle = _step57.value;
      style = makeStyle(view, event);
      if (style) break;
    }
    if (!style && event.button == 0) style = basicMouseSelection(view, event);
    if (style) {
      var mustFocus = !view.hasFocus;
      view.inputState.startMouseSelection(new MouseSelection(view, event, style, mustFocus));
      if (mustFocus) view.observer.ignore(function () {
        focusPreventScroll(view.contentDOM);
        var active2 = view.root.activeElement;
        if (active2 && !active2.contains(view.contentDOM)) active2.blur();
      });
      var mouseSel = view.inputState.mouseSelection;
      if (mouseSel) {
        mouseSel.start(event);
        return mouseSel.dragging === false;
      }
    } else {
      view.inputState.setSelectionOrigin("select.pointer");
    }
    return false;
  };
  function rangeForClick(view, pos, bias, type) {
    if (type == 1) {
      return EditorSelection.cursor(pos, bias);
    } else if (type == 2) {
      return groupAt(view.state, pos, bias);
    } else {
      var visual = view.docView.lineAt(pos, bias),
        line = view.state.doc.lineAt(visual ? visual.posAtEnd : pos);
      var from = visual ? visual.posAtStart : line.from,
        to = visual ? visual.posAtEnd : line.to;
      if (to < view.state.doc.length && to == line.to) to++;
      return EditorSelection.undirectionalRange(from, to);
    }
  }
  var BadMouseDetail = browser.ie && browser.ie_version <= 11;
  var lastMouseDown = null;
  var lastMouseDownCount = 0;
  var lastMouseDownTime = 0;
  function getClickType(event) {
    if (!BadMouseDetail) return event.detail;
    var last = lastMouseDown,
      lastTime = lastMouseDownTime;
    lastMouseDown = event;
    lastMouseDownTime = Date.now();
    return lastMouseDownCount = !last || lastTime > Date.now() - 400 && Math.abs(last.clientX - event.clientX) < 2 && Math.abs(last.clientY - event.clientY) < 2 ? (lastMouseDownCount + 1) % 3 : 1;
  }
  function basicMouseSelection(view, event) {
    var start = view.posAndSideAtCoords({
        x: event.clientX,
        y: event.clientY
      }, false),
      type = getClickType(event);
    var startSel = view.state.selection;
    return {
      update: function update(_update5) {
        if (_update5.docChanged) {
          start.pos = _update5.changes.mapPos(start.pos);
          startSel = startSel.map(_update5.changes);
        }
      },
      get: function get(event2, extend, multiple) {
        var cur = view.posAndSideAtCoords({
            x: event2.clientX,
            y: event2.clientY
          }, false),
          removed;
        var range = rangeForClick(view, cur.pos, cur.assoc, type);
        if (start.pos != cur.pos && !extend) {
          var startRange = rangeForClick(view, start.pos, start.assoc, type);
          var from = Math.min(startRange.from, range.from),
            to = Math.max(startRange.to, range.to);
          range = from < range.from ? EditorSelection.range(from, to, range.assoc) : EditorSelection.range(to, from, range.assoc);
        }
        if (extend) return startSel.replaceRange(startSel.main.extend(range.from, range.to, range.assoc));else if (multiple && type == 1 && startSel.ranges.length > 1 && (removed = removeRangeAround(startSel, cur.pos))) return removed;else if (multiple) return startSel.addRange(range);else return EditorSelection.create([range]);
      }
    };
  }
  function removeRangeAround(sel, pos) {
    for (var _i23 = 0; _i23 < sel.ranges.length; _i23++) {
      var _sel$ranges$_i = sel.ranges[_i23],
        from = _sel$ranges$_i.from,
        to = _sel$ranges$_i.to;
      if (from <= pos && to >= pos) return EditorSelection.create(sel.ranges.slice(0, _i23).concat(sel.ranges.slice(_i23 + 1)), sel.mainIndex == _i23 ? 0 : sel.mainIndex - (sel.mainIndex > _i23 ? 1 : 0));
    }
    return null;
  }
  handlers.dragstart = function (view, event) {
    var range = view.state.selection.main;
    if (event.target.draggable) {
      var tile = view.docView.tile.nearest(event.target);
      if (tile && tile.isWidget()) {
        var from = tile.posAtStart,
          to = from + tile.length;
        if (from >= range.to || to <= range.from) range = EditorSelection.undirectionalRange(from, to);
      }
    }
    var inputState = view.inputState;
    if (inputState.mouseSelection) inputState.mouseSelection.dragging = true;
    inputState.draggedContent = range;
    if (event.dataTransfer) {
      event.dataTransfer.setData("Text", textFilter(view.state, clipboardOutputFilter, view.state.sliceDoc(range.from, range.to)));
      event.dataTransfer.effectAllowed = "copyMove";
    }
    return false;
  };
  handlers.dragend = function (view) {
    view.inputState.draggedContent = null;
    return false;
  };
  function dropText(view, event, text, direct) {
    text = textFilter(view.state, clipboardInputFilter, text);
    if (!text) return;
    var dropPos = view.posAtCoords({
      x: event.clientX,
      y: event.clientY
    }, false);
    var draggedContent = view.inputState.draggedContent;
    var del = direct && draggedContent && dragMovesSelection(view, event) ? {
      from: draggedContent.from,
      to: draggedContent.to
    } : null;
    var ins = {
      from: dropPos,
      insert: text
    };
    var changes = view.state.changes(del ? [del, ins] : ins);
    view.focus();
    view.dispatch({
      changes: changes,
      selection: {
        anchor: changes.mapPos(dropPos, -1),
        head: changes.mapPos(dropPos, 1)
      },
      userEvent: del ? "move.drop" : "input.drop"
    });
    view.inputState.draggedContent = null;
  }
  handlers.drop = function (view, event) {
    if (!event.dataTransfer) return false;
    if (view.state.readOnly) return true;
    var files = event.dataTransfer.files;
    if (files && files.length) {
      var text = Array(files.length),
        read = 0;
      var finishFile = function finishFile() {
        if (++read == files.length) dropText(view, event, text.filter(function (s) {
          return s != null;
        }).join(view.state.lineBreak), false);
      };
      var _loop8 = function _loop8(_i24) {
        var reader = new FileReader();
        reader.onerror = finishFile;
        reader.onload = function () {
          if (!/[\x00-\x08\x0e-\x1f]{2}/.test(reader.result)) text[_i24] = reader.result;
          finishFile();
        };
        reader.readAsText(files[_i24]);
      };
      for (var _i24 = 0; _i24 < files.length; _i24++) {
        _loop8(_i24);
      }
      return true;
    } else {
      var _text = event.dataTransfer.getData("Text");
      if (_text) {
        dropText(view, event, _text, true);
        return true;
      }
    }
    return false;
  };
  handlers.paste = function (view, event) {
    if (view.state.readOnly) return true;
    view.observer.flush();
    var data = brokenClipboardAPI ? null : event.clipboardData;
    if (data) {
      doPaste(view, data.getData("text/plain") || data.getData("text/uri-list"));
      return true;
    } else {
      capturePaste(view);
      return false;
    }
  };
  function captureCopy(view, text) {
    var parent = view.dom.parentNode;
    if (!parent) return;
    var target = parent.appendChild(document.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.value = text;
    target.focus();
    target.selectionEnd = text.length;
    target.selectionStart = 0;
    setTimeout(function () {
      target.remove();
      view.focus();
    }, 50);
  }
  function copiedRange(state) {
    var content2 = [],
      ranges = [],
      linewise = false;
    for (var _iterator58 = _createForOfIteratorHelperLoose(state.selection.ranges), _step58; !(_step58 = _iterator58()).done;) {
      var range = _step58.value;
      if (!range.empty) {
        content2.push(state.sliceDoc(range.from, range.to));
        ranges.push(range);
      }
    }
    if (!content2.length) {
      var upto = -1;
      for (var _iterator59 = _createForOfIteratorHelperLoose(state.selection.ranges), _step59; !(_step59 = _iterator59()).done;) {
        var from = _step59.value.from;
        var line = state.doc.lineAt(from);
        if (line.number > upto) {
          content2.push(line.text);
          ranges.push({
            from: line.from,
            to: Math.min(state.doc.length, line.to + 1)
          });
        }
        upto = line.number;
      }
      linewise = true;
    }
    return {
      text: textFilter(state, clipboardOutputFilter, content2.join(state.lineBreak)),
      ranges: ranges,
      linewise: linewise
    };
  }
  var lastLinewiseCopy = null;
  handlers.copy = handlers.cut = function (view, event) {
    if (!hasSelection(view.contentDOM, view.observer.selectionRange)) return false;
    var _copiedRange = copiedRange(view.state),
      text = _copiedRange.text,
      ranges = _copiedRange.ranges,
      linewise = _copiedRange.linewise;
    if (!text && !linewise) return false;
    lastLinewiseCopy = linewise ? text : null;
    if (event.type == "cut" && !view.state.readOnly) view.dispatch({
      changes: ranges,
      scrollIntoView: true,
      userEvent: "delete.cut"
    });
    var data = brokenClipboardAPI ? null : event.clipboardData;
    if (data) {
      data.clearData();
      data.setData("text/plain", text);
      return true;
    } else {
      captureCopy(view, text);
      return false;
    }
  };
  var isFocusChange = Annotation.define();
  function focusChangeTransaction(state, focus) {
    var effects = [];
    for (var _iterator60 = _createForOfIteratorHelperLoose(state.facet(focusChangeEffect)), _step60; !(_step60 = _iterator60()).done;) {
      var getEffect = _step60.value;
      var effect = getEffect(state, focus);
      if (effect) effects.push(effect);
    }
    return effects.length ? state.update({
      effects: effects,
      annotations: isFocusChange.of(true)
    }) : null;
  }
  function updateForFocusChange(view) {
    setTimeout(function () {
      var focus = view.hasFocus;
      if (focus != view.inputState.notifiedFocused) {
        var tr = focusChangeTransaction(view.state, focus);
        if (tr) view.dispatch(tr);else view.update([]);
      }
    }, 10);
  }
  observers.focus = function (view) {
    view.inputState.lastFocusTime = Date.now();
    if (!view.scrollDOM.scrollTop && (view.inputState.lastScrollTop || view.inputState.lastScrollLeft)) {
      view.scrollDOM.scrollTop = view.inputState.lastScrollTop;
      view.scrollDOM.scrollLeft = view.inputState.lastScrollLeft;
    }
    updateForFocusChange(view);
  };
  observers.blur = function (view) {
    view.observer.clearSelectionRange();
    updateForFocusChange(view);
  };
  observers.compositionstart = observers.compositionupdate = function (view) {
    if (view.observer.editContext) return;
    if (view.inputState.compositionFirstChange == null) view.inputState.compositionFirstChange = true;
    if (view.inputState.composing < 0) {
      view.inputState.composing = 0;
    }
  };
  observers.compositionend = function (view) {
    if (view.observer.editContext) return;
    view.inputState.composing = -1;
    view.inputState.compositionEndedAt = Date.now();
    view.inputState.compositionPendingKey = true;
    view.inputState.compositionPendingChange = view.observer.pendingRecords().length > 0;
    view.inputState.compositionFirstChange = null;
    if (browser.chrome && browser.android) {
      view.observer.flushSoon();
    } else if (view.inputState.compositionPendingChange) {
      Promise.resolve().then(function () {
        return view.observer.flush();
      });
    } else {
      setTimeout(function () {
        if (view.inputState.composing < 0 && view.docView.hasComposition) view.update([]);
      }, 50);
    }
  };
  observers.contextmenu = function (view) {
    view.inputState.lastContextMenu = Date.now();
  };
  handlers.beforeinput = function (view, event) {
    var _a2, _b;
    if (event.inputType == "insertText" || event.inputType == "insertCompositionText") {
      view.inputState.insertingText = event.data;
      view.inputState.insertingTextAt = Date.now();
    }
    if (event.inputType == "insertReplacementText" && view.observer.editContext) {
      var text = (_a2 = event.dataTransfer) === null || _a2 === void 0 ? void 0 : _a2.getData("text/plain"),
        ranges = event.getTargetRanges();
      if (text && ranges.length) {
        var _r = ranges[0];
        var from = view.posAtDOM(_r.startContainer, _r.startOffset),
          to = view.posAtDOM(_r.endContainer, _r.endOffset);
        applyDOMChangeInner(view, {
          from: from,
          to: to,
          insert: view.state.toText(text)
        }, null);
        return true;
      }
    }
    var pending;
    if (browser.chrome && browser.android && (pending = PendingKeys.find(function (key) {
      return key.inputType == event.inputType;
    }))) {
      view.observer.delayAndroidKey(pending.key, pending.keyCode);
      if (pending.key == "Backspace" || pending.key == "Delete") {
        var startViewHeight = ((_b = window.visualViewport) === null || _b === void 0 ? void 0 : _b.height) || 0;
        setTimeout(function () {
          var _a3;
          if ((((_a3 = window.visualViewport) === null || _a3 === void 0 ? void 0 : _a3.height) || 0) > startViewHeight + 10 && view.hasFocus) {
            view.contentDOM.blur();
            view.focus();
          }
        }, 100);
      }
    }
    if (browser.ios && event.inputType == "deleteContentForward") {
      view.observer.flushSoon();
    }
    if (browser.safari && event.inputType == "insertText" && view.inputState.composing >= 0) {
      setTimeout(function () {
        return observers.compositionend(view, event);
      }, 20);
    }
    return false;
  };
  var appliedFirefoxHack = new Set();
  function firefoxCopyCutHack(doc2) {
    if (!appliedFirefoxHack.has(doc2)) {
      appliedFirefoxHack.add(doc2);
      doc2.addEventListener("copy", function () {});
      doc2.addEventListener("cut", function () {});
    }
  }
  var wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line", "break-spaces"];
  var heightChangeFlag = false;
  function clearHeightChangeFlag() {
    heightChangeFlag = false;
  }
  var HeightOracle = function () {
    function HeightOracle(lineWrapping) {
      this.lineWrapping = lineWrapping;
      this.doc = Text.empty;
      this.heightSamples = {};
      this.lineHeight = 14;
      this.charWidth = 7;
      this.textHeight = 14;
      this.lineLength = 30;
    }
    var _proto64 = HeightOracle.prototype;
    _proto64.heightForGap = function heightForGap(from, to) {
      var lines = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
      if (this.lineWrapping) lines += Math.max(0, Math.ceil((to - from - lines * this.lineLength * 0.5) / this.lineLength));
      return this.lineHeight * lines;
    };
    _proto64.heightForLine = function heightForLine(length) {
      if (!this.lineWrapping) return this.lineHeight;
      var lines = 1 + Math.max(0, Math.ceil((length - this.lineLength) / Math.max(1, this.lineLength - 5)));
      return lines * this.lineHeight;
    };
    _proto64.setDoc = function setDoc(doc2) {
      this.doc = doc2;
      return this;
    };
    _proto64.mustRefreshForWrapping = function mustRefreshForWrapping(whiteSpace) {
      return wrappingWhiteSpace.indexOf(whiteSpace) > -1 != this.lineWrapping;
    };
    _proto64.mustRefreshForHeights = function mustRefreshForHeights(lineHeights) {
      var newHeight = false;
      for (var _i25 = 0; _i25 < lineHeights.length; _i25++) {
        var h = lineHeights[_i25];
        if (h < 0) {
          _i25++;
        } else if (!this.heightSamples[Math.floor(h * 10)]) {
          newHeight = true;
          this.heightSamples[Math.floor(h * 10)] = true;
        }
      }
      return newHeight;
    };
    _proto64.refresh = function refresh(whiteSpace, lineHeight, charWidth, textHeight, lineLength, knownHeights) {
      var lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
      var changed = Math.abs(lineHeight - this.lineHeight) > 0.3 || this.lineWrapping != lineWrapping;
      this.lineWrapping = lineWrapping;
      this.lineHeight = lineHeight;
      this.charWidth = charWidth;
      this.textHeight = textHeight;
      this.lineLength = lineLength;
      if (changed) {
        this.heightSamples = {};
        for (var _i26 = 0; _i26 < knownHeights.length; _i26++) {
          var h = knownHeights[_i26];
          if (h < 0) _i26++;else this.heightSamples[Math.floor(h * 10)] = true;
        }
      }
      return changed;
    };
    return HeightOracle;
  }();
  var MeasuredHeights = function () {
    function MeasuredHeights(from, heights) {
      this.from = from;
      this.heights = heights;
      this.index = 0;
    }
    return _createClass(MeasuredHeights, [{
      key: "more",
      get: function get() {
        return this.index < this.heights.length;
      }
    }]);
  }();
  var BlockInfo = function () {
    function _BlockInfo(from, length, top2, height, _content) {
      this.from = from;
      this.length = length;
      this.top = top2;
      this.height = height;
      this._content = _content;
    }
    var _proto65 = _BlockInfo.prototype;
    _proto65.join = function join(other) {
      var content2 = (Array.isArray(this._content) ? this._content : [this]).concat(Array.isArray(other._content) ? other._content : [other]);
      return new _BlockInfo(this.from, this.length + other.length, this.top, this.height + other.height, content2);
    };
    return _createClass(_BlockInfo, [{
      key: "type",
      get: function get() {
        return typeof this._content == "number" ? BlockType.Text : Array.isArray(this._content) ? this._content : this._content.type;
      }
    }, {
      key: "to",
      get: function get() {
        return this.from + this.length;
      }
    }, {
      key: "bottom",
      get: function get() {
        return this.top + this.height;
      }
    }, {
      key: "widget",
      get: function get() {
        return this._content instanceof PointDecoration ? this._content.widget : null;
      }
    }, {
      key: "widgetLineBreaks",
      get: function get() {
        return typeof this._content == "number" ? this._content : 0;
      }
    }]);
  }();
  var QueryType = function (QueryType2) {
    QueryType2[QueryType2["ByPos"] = 0] = "ByPos";
    QueryType2[QueryType2["ByHeight"] = 1] = "ByHeight";
    QueryType2[QueryType2["ByPosNoHeight"] = 2] = "ByPosNoHeight";
    return QueryType2;
  }(QueryType || (QueryType = {}));
  var Epsilon = 1e-3;
  var HeightMap = function () {
    function _HeightMap(length, height, flags) {
      if (flags === void 0) {
        flags = 2;
      }
      this.length = length;
      this.height = height;
      this.flags = flags;
    }
    var _proto66 = _HeightMap.prototype;
    _proto66.setHeight = function setHeight(height) {
      if (this.height != height) {
        if (Math.abs(this.height - height) > Epsilon) heightChangeFlag = true;
        this.height = height;
      }
    };
    _proto66.replace = function replace(_from, _to, nodes) {
      return _HeightMap.of(nodes);
    };
    _proto66.decomposeLeft = function decomposeLeft(_to, result) {
      result.push(this);
    };
    _proto66.decomposeRight = function decomposeRight(_from, result) {
      result.push(this);
    };
    _proto66.applyChanges = function applyChanges(decorations2, oldDoc, oracle, changes) {
      var me = this,
        doc2 = oracle.doc;
      for (var _i27 = changes.length - 1; _i27 >= 0; _i27--) {
        var _changes$_i = changes[_i27],
          fromA = _changes$_i.fromA,
          toA = _changes$_i.toA,
          fromB = _changes$_i.fromB,
          toB = _changes$_i.toB;
        var start = me.lineAt(fromA, QueryType.ByPosNoHeight, oracle.setDoc(oldDoc), 0, 0);
        var end = start.to >= toA ? start : me.lineAt(toA, QueryType.ByPosNoHeight, oracle, 0, 0);
        toB += end.to - toA;
        toA = end.to;
        while (_i27 > 0 && start.from <= changes[_i27 - 1].toA) {
          fromA = changes[_i27 - 1].fromA;
          fromB = changes[_i27 - 1].fromB;
          _i27--;
          if (fromA < start.from) start = me.lineAt(fromA, QueryType.ByPosNoHeight, oracle, 0, 0);
        }
        fromB += start.from - fromA;
        fromA = start.from;
        var nodes = NodeBuilder.build(oracle.setDoc(doc2), decorations2, fromB, toB);
        me = replace(me, me.replace(fromA, toA, nodes));
      }
      return me.updateHeight(oracle, 0);
    };
    _HeightMap.empty = function empty() {
      return new HeightMapText(0, 0, 0);
    };
    _HeightMap.of = function of(nodes) {
      if (nodes.length == 1) return nodes[0];
      var i2 = 0,
        j = nodes.length,
        before = 0,
        after = 0;
      for (;;) {
        if (i2 == j) {
          if (before > after * 2) {
            var split = nodes[i2 - 1];
            if (split.break) nodes.splice(--i2, 1, split.left, null, split.right);else nodes.splice(--i2, 1, split.left, split.right);
            j += 1 + split.break;
            before -= split.size;
          } else if (after > before * 2) {
            var _split = nodes[j];
            if (_split.break) nodes.splice(j, 1, _split.left, null, _split.right);else nodes.splice(j, 1, _split.left, _split.right);
            j += 2 + _split.break;
            after -= _split.size;
          } else {
            break;
          }
        } else if (before < after) {
          var next = nodes[i2++];
          if (next) before += next.size;
        } else {
          var _next3 = nodes[--j];
          if (_next3) after += _next3.size;
        }
      }
      var brk = 0;
      if (nodes[i2 - 1] == null) {
        brk = 1;
        i2--;
      } else if (nodes[i2] == null) {
        brk = 1;
        j++;
      }
      return new HeightMapBranch(_HeightMap.of(nodes.slice(0, i2)), brk, _HeightMap.of(nodes.slice(j)));
    };
    return _createClass(_HeightMap, [{
      key: "outdated",
      get: function get() {
        return (this.flags & 2) > 0;
      },
      set: function set(value) {
        this.flags = (value ? 2 : 0) | this.flags & ~2;
      }
    }]);
  }();
  function replace(old, val) {
    if (old == val) return old;
    if (old.constructor != val.constructor) heightChangeFlag = true;
    return val;
  }
  HeightMap.prototype.size = 1;
  var SpaceDeco = Decoration.replace({});
  var HeightMapBlock = function (_HeightMap2) {
    function HeightMapBlock(length, height, deco) {
      var _this34;
      _this34 = _HeightMap2.call(this, length, height) || this;
      _this34.deco = deco;
      _this34.spaceAbove = 0;
      return _this34;
    }
    _inheritsLoose(HeightMapBlock, _HeightMap2);
    var _proto67 = HeightMapBlock.prototype;
    _proto67.mainBlock = function mainBlock(top2, offset) {
      return new BlockInfo(offset, this.length, top2 + this.spaceAbove, this.height - this.spaceAbove, this.deco || 0);
    };
    _proto67.blockAt = function blockAt(height, _oracle, top2, offset) {
      return this.spaceAbove && height < top2 + this.spaceAbove ? new BlockInfo(offset, 0, top2, this.spaceAbove, SpaceDeco) : this.mainBlock(top2, offset);
    };
    _proto67.lineAt = function lineAt(_value, _type, oracle, top2, offset) {
      var main = this.mainBlock(top2, offset);
      return this.spaceAbove ? this.blockAt(0, oracle, top2, offset).join(main) : main;
    };
    _proto67.forEachLine = function forEachLine(from, to, oracle, top2, offset, f) {
      if (from <= offset + this.length && to >= offset) f(this.lineAt(0, QueryType.ByPos, oracle, top2, offset));
    };
    _proto67.setMeasuredHeight = function setMeasuredHeight(measured) {
      var next = measured.heights[measured.index++];
      if (next < 0) {
        this.spaceAbove = -next;
        next = measured.heights[measured.index++];
      } else {
        this.spaceAbove = 0;
      }
      this.setHeight(next);
    };
    _proto67.updateHeight = function updateHeight(oracle, offset, _force, measured) {
      if (offset === void 0) {
        offset = 0;
      }
      if (_force === void 0) {
        _force = false;
      }
      if (measured && measured.from <= offset && measured.more) this.setMeasuredHeight(measured);
      this.outdated = false;
      return this;
    };
    _proto67.toString = function toString() {
      return "block(" + this.length + ")";
    };
    return HeightMapBlock;
  }(HeightMap);
  var HeightMapText = function (_HeightMapBlock) {
    function _HeightMapText(length, height, above) {
      var _this35;
      _this35 = _HeightMapBlock.call(this, length, height, null) || this;
      _this35.collapsed = 0;
      _this35.widgetHeight = 0;
      _this35.breaks = 0;
      _this35.spaceAbove = above;
      return _this35;
    }
    _inheritsLoose(_HeightMapText, _HeightMapBlock);
    var _proto68 = _HeightMapText.prototype;
    _proto68.mainBlock = function mainBlock(top2, offset) {
      return new BlockInfo(offset, this.length, top2 + this.spaceAbove, this.height - this.spaceAbove, this.breaks);
    };
    _proto68.replace = function replace(_from, _to, nodes) {
      var node = nodes[0];
      if (nodes.length == 1 && (node instanceof _HeightMapText || node instanceof HeightMapGap && node.flags & 4) && Math.abs(this.length - node.length) < 10) {
        if (node instanceof HeightMapGap) node = new _HeightMapText(node.length, this.height, this.spaceAbove);else node.height = this.height;
        if (!this.outdated) node.outdated = false;
        return node;
      } else {
        return HeightMap.of(nodes);
      }
    };
    _proto68.updateHeight = function updateHeight(oracle, offset, force, measured) {
      if (offset === void 0) {
        offset = 0;
      }
      if (force === void 0) {
        force = false;
      }
      if (measured && measured.from <= offset && measured.more) {
        this.setMeasuredHeight(measured);
      } else if (force || this.outdated) {
        this.spaceAbove = 0;
        this.setHeight(Math.max(this.widgetHeight, oracle.heightForLine(this.length - this.collapsed)) + this.breaks * oracle.lineHeight);
      }
      this.outdated = false;
      return this;
    };
    _proto68.toString = function toString() {
      return "line(" + this.length + (this.collapsed ? -this.collapsed : "") + (this.widgetHeight ? ":" + this.widgetHeight : "") + ")";
    };
    return _HeightMapText;
  }(HeightMapBlock);
  var HeightMapGap = function (_HeightMap3) {
    function _HeightMapGap(length) {
      return _HeightMap3.call(this, length, 0) || this;
    }
    _inheritsLoose(_HeightMapGap, _HeightMap3);
    var _proto69 = _HeightMapGap.prototype;
    _proto69.heightMetrics = function heightMetrics(oracle, offset) {
      var firstLine = oracle.doc.lineAt(offset).number,
        lastLine = oracle.doc.lineAt(offset + this.length).number;
      var lines = lastLine - firstLine + 1;
      var perLine,
        perChar = 0;
      if (oracle.lineWrapping) {
        var totalPerLine = Math.min(this.height, oracle.lineHeight * lines);
        perLine = totalPerLine / lines;
        if (this.length > lines + 1) perChar = (this.height - totalPerLine) / (this.length - lines - 1);
      } else {
        perLine = this.height / lines;
      }
      return {
        firstLine: firstLine,
        lastLine: lastLine,
        perLine: perLine,
        perChar: perChar
      };
    };
    _proto69.blockAt = function blockAt(height, oracle, top2, offset) {
      var _this$heightMetrics = this.heightMetrics(oracle, offset),
        firstLine = _this$heightMetrics.firstLine,
        lastLine = _this$heightMetrics.lastLine,
        perLine = _this$heightMetrics.perLine,
        perChar = _this$heightMetrics.perChar;
      if (oracle.lineWrapping) {
        var guess = offset + (height < oracle.lineHeight ? 0 : Math.round(Math.max(0, Math.min(1, (height - top2) / this.height)) * this.length));
        var line = oracle.doc.lineAt(guess),
          lineHeight = perLine + line.length * perChar;
        var lineTop = Math.max(top2, height - lineHeight / 2);
        return new BlockInfo(line.from, line.length, lineTop, lineHeight, 0);
      } else {
        var _line = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top2) / perLine)));
        var _oracle$doc$line = oracle.doc.line(firstLine + _line),
          from = _oracle$doc$line.from,
          length = _oracle$doc$line.length;
        return new BlockInfo(from, length, top2 + perLine * _line, perLine, 0);
      }
    };
    _proto69.lineAt = function lineAt(value, type, oracle, top2, offset) {
      if (type == QueryType.ByHeight) return this.blockAt(value, oracle, top2, offset);
      if (type == QueryType.ByPosNoHeight) {
        var _oracle$doc$lineAt = oracle.doc.lineAt(value),
          from = _oracle$doc$lineAt.from,
          to = _oracle$doc$lineAt.to;
        return new BlockInfo(from, to - from, 0, 0, 0);
      }
      var _this$heightMetrics2 = this.heightMetrics(oracle, offset),
        firstLine = _this$heightMetrics2.firstLine,
        perLine = _this$heightMetrics2.perLine,
        perChar = _this$heightMetrics2.perChar;
      var line = oracle.doc.lineAt(value),
        lineHeight = perLine + line.length * perChar;
      var linesAbove = line.number - firstLine;
      var lineTop = top2 + perLine * linesAbove + perChar * (line.from - offset - linesAbove);
      return new BlockInfo(line.from, line.length, Math.max(top2, Math.min(lineTop, top2 + this.height - lineHeight)), lineHeight, 0);
    };
    _proto69.forEachLine = function forEachLine(from, to, oracle, top2, offset, f) {
      from = Math.max(from, offset);
      to = Math.min(to, offset + this.length);
      var _this$heightMetrics3 = this.heightMetrics(oracle, offset),
        firstLine = _this$heightMetrics3.firstLine,
        perLine = _this$heightMetrics3.perLine,
        perChar = _this$heightMetrics3.perChar;
      for (var pos = from, lineTop = top2; pos <= to;) {
        var line = oracle.doc.lineAt(pos);
        if (pos == from) {
          var linesAbove = line.number - firstLine;
          lineTop += perLine * linesAbove + perChar * (from - offset - linesAbove);
        }
        var lineHeight = perLine + perChar * line.length;
        f(new BlockInfo(line.from, line.length, lineTop, lineHeight, 0));
        lineTop += lineHeight;
        pos = line.to + 1;
      }
    };
    _proto69.replace = function replace(from, to, nodes) {
      var after = this.length - to;
      if (after > 0) {
        var last = nodes[nodes.length - 1];
        if (last instanceof _HeightMapGap) nodes[nodes.length - 1] = new _HeightMapGap(last.length + after);else nodes.push(null, new _HeightMapGap(after - 1));
      }
      if (from > 0) {
        var first = nodes[0];
        if (first instanceof _HeightMapGap) nodes[0] = new _HeightMapGap(from + first.length);else nodes.unshift(new _HeightMapGap(from - 1), null);
      }
      return HeightMap.of(nodes);
    };
    _proto69.decomposeLeft = function decomposeLeft(to, result) {
      result.push(new _HeightMapGap(to - 1), null);
    };
    _proto69.decomposeRight = function decomposeRight(from, result) {
      result.push(null, new _HeightMapGap(this.length - from - 1));
    };
    _proto69.updateHeight = function updateHeight(oracle, offset, force, measured) {
      if (offset === void 0) {
        offset = 0;
      }
      if (force === void 0) {
        force = false;
      }
      var end = offset + this.length;
      if (measured && measured.from <= offset + this.length && measured.more) {
        var nodes = [],
          pos = Math.max(offset, measured.from),
          singleHeight = -1;
        if (measured.from > offset) nodes.push(new _HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
        while (pos <= end && measured.more) {
          var len = oracle.doc.lineAt(pos).length;
          if (nodes.length) nodes.push(null);
          var height = measured.heights[measured.index++],
            above = 0;
          if (height < 0) {
            above = -height;
            height = measured.heights[measured.index++];
          }
          if (singleHeight == -1) singleHeight = height;else if (Math.abs(height - singleHeight) >= Epsilon) singleHeight = -2;
          var line = new HeightMapText(len, height, above);
          line.outdated = false;
          nodes.push(line);
          pos += len + 1;
        }
        if (pos <= end) nodes.push(null, new _HeightMapGap(end - pos).updateHeight(oracle, pos));
        var result = HeightMap.of(nodes);
        if (singleHeight < 0 || Math.abs(result.height - this.height) >= Epsilon || Math.abs(singleHeight - this.heightMetrics(oracle, offset).perLine) >= Epsilon) heightChangeFlag = true;
        return replace(this, result);
      } else if (force || this.outdated) {
        this.setHeight(oracle.heightForGap(offset, offset + this.length));
        this.outdated = false;
      }
      return this;
    };
    _proto69.toString = function toString() {
      return "gap(" + this.length + ")";
    };
    return _HeightMapGap;
  }(HeightMap);
  var HeightMapBranch = function (_HeightMap4) {
    function HeightMapBranch(left, brk, right) {
      var _this36;
      _this36 = _HeightMap4.call(this, left.length + brk + right.length, left.height + right.height, brk | (left.outdated || right.outdated ? 2 : 0)) || this;
      _this36.left = left;
      _this36.right = right;
      _this36.size = left.size + right.size;
      return _this36;
    }
    _inheritsLoose(HeightMapBranch, _HeightMap4);
    var _proto70 = HeightMapBranch.prototype;
    _proto70.blockAt = function blockAt(height, oracle, top2, offset) {
      var mid = top2 + this.left.height;
      return height < mid ? this.left.blockAt(height, oracle, top2, offset) : this.right.blockAt(height, oracle, mid, offset + this.left.length + this.break);
    };
    _proto70.lineAt = function lineAt(value, type, oracle, top2, offset) {
      var rightTop = top2 + this.left.height,
        rightOffset = offset + this.left.length + this.break;
      var left = type == QueryType.ByHeight ? value < rightTop : value < rightOffset;
      var base2 = left ? this.left.lineAt(value, type, oracle, top2, offset) : this.right.lineAt(value, type, oracle, rightTop, rightOffset);
      if (this.break || (left ? base2.to < rightOffset : base2.from > rightOffset)) return base2;
      var subQuery = type == QueryType.ByPosNoHeight ? QueryType.ByPosNoHeight : QueryType.ByPos;
      if (left) return base2.join(this.right.lineAt(rightOffset, subQuery, oracle, rightTop, rightOffset));else return this.left.lineAt(rightOffset, subQuery, oracle, top2, offset).join(base2);
    };
    _proto70.forEachLine = function forEachLine(from, to, oracle, top2, offset, f) {
      var rightTop = top2 + this.left.height,
        rightOffset = offset + this.left.length + this.break;
      if (this.break) {
        if (from < rightOffset) this.left.forEachLine(from, to, oracle, top2, offset, f);
        if (to >= rightOffset) this.right.forEachLine(from, to, oracle, rightTop, rightOffset, f);
      } else {
        var mid = this.lineAt(rightOffset, QueryType.ByPos, oracle, top2, offset);
        if (from < mid.from) this.left.forEachLine(from, mid.from - 1, oracle, top2, offset, f);
        if (mid.to >= from && mid.from <= to) f(mid);
        if (to > mid.to) this.right.forEachLine(mid.to + 1, to, oracle, rightTop, rightOffset, f);
      }
    };
    _proto70.replace = function replace(from, to, nodes) {
      var rightStart = this.left.length + this.break;
      if (to < rightStart) return this.balanced(this.left.replace(from, to, nodes), this.right);
      if (from > this.left.length) return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
      var result = [];
      if (from > 0) this.decomposeLeft(from, result);
      var left = result.length;
      for (var _iterator61 = _createForOfIteratorHelperLoose(nodes), _step61; !(_step61 = _iterator61()).done;) {
        var node = _step61.value;
        result.push(node);
      }
      if (from > 0) mergeGaps(result, left - 1);
      if (to < this.length) {
        var right = result.length;
        this.decomposeRight(to, result);
        mergeGaps(result, right);
      }
      return HeightMap.of(result);
    };
    _proto70.decomposeLeft = function decomposeLeft(to, result) {
      var left = this.left.length;
      if (to <= left) return this.left.decomposeLeft(to, result);
      result.push(this.left);
      if (this.break) {
        left++;
        if (to >= left) result.push(null);
      }
      if (to > left) this.right.decomposeLeft(to - left, result);
    };
    _proto70.decomposeRight = function decomposeRight(from, result) {
      var left = this.left.length,
        right = left + this.break;
      if (from >= right) return this.right.decomposeRight(from - right, result);
      if (from < left) this.left.decomposeRight(from, result);
      if (this.break && from < right) result.push(null);
      result.push(this.right);
    };
    _proto70.balanced = function balanced(left, right) {
      if (left.size > 2 * right.size || right.size > 2 * left.size) return HeightMap.of(this.break ? [left, null, right] : [left, right]);
      this.left = replace(this.left, left);
      this.right = replace(this.right, right);
      this.setHeight(left.height + right.height);
      this.outdated = left.outdated || right.outdated;
      this.size = left.size + right.size;
      this.length = left.length + this.break + right.length;
      return this;
    };
    _proto70.updateHeight = function updateHeight(oracle, offset, force, measured) {
      if (offset === void 0) {
        offset = 0;
      }
      if (force === void 0) {
        force = false;
      }
      var left = this.left,
        right = this.right,
        rightStart = offset + left.length + this.break,
        rebalance = null;
      if (measured && measured.from <= offset + left.length && measured.more) rebalance = left = left.updateHeight(oracle, offset, force, measured);else left.updateHeight(oracle, offset, force);
      if (measured && measured.from <= rightStart + right.length && measured.more) rebalance = right = right.updateHeight(oracle, rightStart, force, measured);else right.updateHeight(oracle, rightStart, force);
      if (rebalance) return this.balanced(left, right);
      this.height = this.left.height + this.right.height;
      this.outdated = false;
      return this;
    };
    _proto70.toString = function toString() {
      return this.left + (this.break ? " " : "-") + this.right;
    };
    return _createClass(HeightMapBranch, [{
      key: "break",
      get: function get() {
        return this.flags & 1;
      }
    }]);
  }(HeightMap);
  function mergeGaps(nodes, around) {
    var before, after;
    if (nodes[around] == null && (before = nodes[around - 1]) instanceof HeightMapGap && (after = nodes[around + 1]) instanceof HeightMapGap) nodes.splice(around - 1, 3, new HeightMapGap(before.length + 1 + after.length));
  }
  var relevantWidgetHeight = 5;
  var NodeBuilder = function () {
    function _NodeBuilder(pos, oracle) {
      this.pos = pos;
      this.oracle = oracle;
      this.nodes = [];
      this.lineStart = -1;
      this.lineEnd = -1;
      this.covering = null;
      this.writtenTo = pos;
    }
    var _proto71 = _NodeBuilder.prototype;
    _proto71.span = function span(_from, to) {
      if (this.lineStart > -1) {
        var end = Math.min(to, this.lineEnd),
          last = this.nodes[this.nodes.length - 1];
        if (last instanceof HeightMapText) last.length += end - this.pos;else if (end > this.pos || !this.isCovered) this.nodes.push(new HeightMapText(end - this.pos, -1, 0));
        this.writtenTo = end;
        if (to > end) {
          this.nodes.push(null);
          this.writtenTo++;
          this.lineStart = -1;
        }
      }
      this.pos = to;
    };
    _proto71.point = function point(from, to, deco) {
      if (from < to || deco.heightRelevant) {
        var height = deco.widget ? deco.widget.estimatedHeight : 0;
        var breaks = deco.widget ? deco.widget.lineBreaks : 0;
        if (height < 0) height = this.oracle.lineHeight;
        var len = to - from;
        if (deco.block) {
          this.addBlock(new HeightMapBlock(len, height, deco));
        } else if (len || breaks || height >= relevantWidgetHeight) {
          this.addLineDeco(height, breaks, len);
        }
      } else if (to > from) {
        this.span(from, to);
      }
      if (this.lineEnd > -1 && this.lineEnd < this.pos) this.lineEnd = this.oracle.doc.lineAt(this.pos).to;
    };
    _proto71.enterLine = function enterLine() {
      if (this.lineStart > -1) return;
      var _this$oracle$doc$line = this.oracle.doc.lineAt(this.pos),
        from = _this$oracle$doc$line.from,
        to = _this$oracle$doc$line.to;
      this.lineStart = from;
      this.lineEnd = to;
      if (this.writtenTo < from) {
        if (this.writtenTo < from - 1 || this.nodes[this.nodes.length - 1] == null) this.nodes.push(this.blankContent(this.writtenTo, from - 1));
        this.nodes.push(null);
      }
      if (this.pos > from) this.nodes.push(new HeightMapText(this.pos - from, -1, 0));
      this.writtenTo = this.pos;
    };
    _proto71.blankContent = function blankContent(from, to) {
      var gap = new HeightMapGap(to - from);
      if (this.oracle.doc.lineAt(from).to == to) gap.flags |= 4;
      return gap;
    };
    _proto71.ensureLine = function ensureLine() {
      this.enterLine();
      var last = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
      if (last instanceof HeightMapText) return last;
      var line = new HeightMapText(0, -1, 0);
      this.nodes.push(line);
      return line;
    };
    _proto71.addBlock = function addBlock(block) {
      this.enterLine();
      var deco = block.deco;
      if (deco && deco.startSide > 0 && !this.isCovered) this.ensureLine();
      this.nodes.push(block);
      this.writtenTo = this.pos = this.pos + block.length;
      if (deco && deco.endSide > 0) this.covering = block;
    };
    _proto71.addLineDeco = function addLineDeco(height, breaks, length) {
      var line = this.ensureLine();
      line.length += length;
      line.collapsed += length;
      line.widgetHeight = Math.max(line.widgetHeight, height);
      line.breaks += breaks;
      this.writtenTo = this.pos = this.pos + length;
    };
    _proto71.finish = function finish(from) {
      var last = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
      if (this.lineStart > -1 && !(last instanceof HeightMapText) && !this.isCovered) this.nodes.push(new HeightMapText(0, -1, 0));else if (this.writtenTo < this.pos || last == null) this.nodes.push(this.blankContent(this.writtenTo, this.pos));
      var pos = from;
      for (var _iterator62 = _createForOfIteratorHelperLoose(this.nodes), _step62; !(_step62 = _iterator62()).done;) {
        var node = _step62.value;
        if (node instanceof HeightMapText) node.updateHeight(this.oracle, pos);
        pos += node ? node.length : 1;
      }
      return this.nodes;
    };
    _NodeBuilder.build = function build(oracle, decorations2, from, to) {
      var builder = new _NodeBuilder(from, oracle);
      RangeSet.spans(decorations2, from, to, builder, 0);
      return builder.finish(from);
    };
    return _createClass(_NodeBuilder, [{
      key: "isCovered",
      get: function get() {
        return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
      }
    }]);
  }();
  function heightRelevantDecoChanges(a, b, diff) {
    var comp = new DecorationComparator2();
    RangeSet.compare(a, b, diff, comp, 0);
    return comp.changes;
  }
  var DecorationComparator2 = function () {
    function DecorationComparator2() {
      this.changes = [];
    }
    var _proto72 = DecorationComparator2.prototype;
    _proto72.compareRange = function compareRange() {};
    _proto72.comparePoint = function comparePoint(from, to, a, b) {
      if (from < to || a && a.heightRelevant || b && b.heightRelevant) addRange(from, to, this.changes, 5);
    };
    return DecorationComparator2;
  }();
  function visiblePixelRange(dom, paddingTop) {
    var rect = dom.getBoundingClientRect();
    var doc2 = dom.ownerDocument,
      win = doc2.defaultView || window;
    var left = Math.max(0, rect.left),
      right = Math.min(win.innerWidth, rect.right);
    var top2 = Math.max(0, rect.top),
      bottom = Math.min(win.innerHeight, rect.bottom);
    for (var parent = dom.parentNode; parent && parent != doc2.body;) {
      if (parent.nodeType == 1) {
        var elt = parent;
        var style = window.getComputedStyle(elt);
        if ((elt.scrollHeight > elt.clientHeight || elt.scrollWidth > elt.clientWidth) && style.overflow != "visible") {
          var parentRect = elt.getBoundingClientRect();
          left = Math.max(left, parentRect.left);
          right = Math.min(right, parentRect.right);
          top2 = Math.max(top2, parentRect.top);
          bottom = Math.min(parent == dom.parentNode ? win.innerHeight : bottom, parentRect.bottom);
        }
        parent = style.position == "absolute" || style.position == "fixed" ? elt.offsetParent : elt.parentNode;
      } else if (parent.nodeType == 11) {
        parent = parent.host;
      } else {
        break;
      }
    }
    return {
      left: left - rect.left,
      right: Math.max(left, right) - rect.left,
      top: top2 - (rect.top + paddingTop),
      bottom: Math.max(top2, bottom) - (rect.top + paddingTop)
    };
  }
  function inWindow(elt) {
    var rect = elt.getBoundingClientRect(),
      win = elt.ownerDocument.defaultView || window;
    return rect.left < win.innerWidth && rect.right > 0 && rect.top < win.innerHeight && rect.bottom > 0;
  }
  function fullPixelRange(dom, paddingTop) {
    var rect = dom.getBoundingClientRect();
    return {
      left: 0,
      right: rect.right - rect.left,
      top: paddingTop,
      bottom: rect.bottom - (rect.top + paddingTop)
    };
  }
  var LineGap = function () {
    function LineGap(from, to, size, displaySize) {
      this.from = from;
      this.to = to;
      this.size = size;
      this.displaySize = displaySize;
    }
    LineGap.same = function same(a, b) {
      if (a.length != b.length) return false;
      for (var _i28 = 0; _i28 < a.length; _i28++) {
        var gA = a[_i28],
          gB = b[_i28];
        if (gA.from != gB.from || gA.to != gB.to || gA.size != gB.size) return false;
      }
      return true;
    };
    var _proto73 = LineGap.prototype;
    _proto73.draw = function draw(viewState, wrapping) {
      return Decoration.replace({
        widget: new LineGapWidget(this.displaySize * (wrapping ? viewState.scaleY : viewState.scaleX), wrapping)
      }).range(this.from, this.to);
    };
    return LineGap;
  }();
  var LineGapWidget = function (_WidgetType4) {
    function LineGapWidget(size, vertical) {
      var _this37;
      _this37 = _WidgetType4.call(this) || this;
      _this37.size = size;
      _this37.vertical = vertical;
      return _this37;
    }
    _inheritsLoose(LineGapWidget, _WidgetType4);
    var _proto74 = LineGapWidget.prototype;
    _proto74.eq = function eq(other) {
      return other.size == this.size && other.vertical == this.vertical;
    };
    _proto74.toDOM = function toDOM() {
      var elt = document.createElement("div");
      if (this.vertical) {
        elt.style.height = this.size + "px";
      } else {
        elt.style.width = this.size + "px";
        elt.style.height = "2px";
        elt.style.display = "inline-block";
      }
      return elt;
    };
    return _createClass(LineGapWidget, [{
      key: "estimatedHeight",
      get: function get() {
        return this.vertical ? this.size : -1;
      }
    }]);
  }(WidgetType);
  var ViewState = function () {
    function ViewState(view, state) {
      var _this38 = this;
      this.view = view;
      this.state = state;
      this.pixelViewport = {
        left: 0,
        right: window.innerWidth,
        top: 0,
        bottom: 0
      };
      this.inView = true;
      this.paddingTop = 0;
      this.paddingBottom = 0;
      this.contentDOMWidth = 0;
      this.contentDOMHeight = 0;
      this.editorHeight = 0;
      this.editorWidth = 0;
      this.scaleX = 1;
      this.scaleY = 1;
      this.scrollOffset = 0;
      this.scrolledToBottom = false;
      this.scrollAnchorPos = 0;
      this.scrollAnchorHeight = -1;
      this.scaler = IdScaler;
      this.scrollTarget = null;
      this.printing = false;
      this.mustMeasureContent = true;
      this.defaultTextDirection = Direction.LTR;
      this.visibleRanges = [];
      this.mustEnforceCursorAssoc = false;
      var guessWrapping = state.facet(contentAttributes).some(function (v) {
        return typeof v != "function" && v.class == "cm-lineWrapping";
      });
      this.heightOracle = new HeightOracle(guessWrapping);
      this.stateDeco = staticDeco(state);
      this.heightMap = HeightMap.empty().applyChanges(this.stateDeco, Text.empty, this.heightOracle.setDoc(state.doc), [new ChangedRange(0, 0, 0, state.doc.length)]);
      for (var _i29 = 0; _i29 < 2; _i29++) {
        this.viewport = this.getViewport(0, null);
        if (!this.updateForViewport()) break;
      }
      this.updateViewportLines();
      this.lineGaps = this.ensureLineGaps([]);
      this.lineGapDeco = Decoration.set(this.lineGaps.map(function (gap) {
        return gap.draw(_this38, false);
      }));
      this.scrollParent = view.scrollDOM;
      this.computeVisibleRanges();
    }
    var _proto75 = ViewState.prototype;
    _proto75.updateForViewport = function updateForViewport() {
      var _this39 = this;
      var viewports = [this.viewport],
        main = this.state.selection.main;
      var _loop9 = function _loop9() {
        var pos = _i30 ? main.head : main.anchor;
        if (!viewports.some(function (_ref6) {
          var from = _ref6.from,
            to = _ref6.to;
          return pos >= from && pos <= to;
        })) {
          var _this39$lineBlockAt = _this39.lineBlockAt(pos),
            from = _this39$lineBlockAt.from,
            to = _this39$lineBlockAt.to;
          viewports.push(new Viewport(from, to));
        }
      };
      for (var _i30 = 0; _i30 <= 1; _i30++) {
        _loop9();
      }
      this.viewports = viewports.sort(function (a, b) {
        return a.from - b.from;
      });
      return this.updateScaler();
    };
    _proto75.updateScaler = function updateScaler() {
      var scaler = this.scaler;
      this.scaler = this.heightMap.height <= 7e6 ? IdScaler : new BigScaler(this.heightOracle, this.heightMap, this.viewports);
      return scaler.eq(this.scaler) ? 0 : 2;
    };
    _proto75.updateViewportLines = function updateViewportLines() {
      var _this40 = this;
      this.viewportLines = [];
      this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.heightOracle.setDoc(this.state.doc), 0, 0, function (block) {
        _this40.viewportLines.push(scaleBlock(block, _this40.scaler));
      });
    };
    _proto75.update = function update(_update6, scrollTarget) {
      if (scrollTarget === void 0) {
        scrollTarget = null;
      }
      this.state = _update6.state;
      var prevDeco = this.stateDeco;
      this.stateDeco = staticDeco(this.state);
      var contentChanges = _update6.changedRanges;
      var heightChanges = ChangedRange.extendWithRanges(contentChanges, heightRelevantDecoChanges(prevDeco, this.stateDeco, _update6 ? _update6.changes : ChangeSet.empty(this.state.doc.length)));
      var prevHeight = this.heightMap.height;
      var scrollAnchor = this.scrolledToBottom ? null : this.scrollAnchorAt(this.scrollOffset);
      clearHeightChangeFlag();
      this.heightMap = this.heightMap.applyChanges(this.stateDeco, _update6.startState.doc, this.heightOracle.setDoc(this.state.doc), heightChanges);
      if (this.heightMap.height != prevHeight || heightChangeFlag) _update6.flags |= 2;
      if (scrollAnchor) {
        this.scrollAnchorPos = _update6.changes.mapPos(scrollAnchor.from, -1);
        this.scrollAnchorHeight = scrollAnchor.top;
      } else {
        this.scrollAnchorPos = -1;
        this.scrollAnchorHeight = prevHeight;
      }
      var viewport = heightChanges.length ? this.mapViewport(this.viewport, _update6.changes) : this.viewport;
      if (scrollTarget && (scrollTarget.range.head < viewport.from || scrollTarget.range.head > viewport.to) || !this.viewportIsAppropriate(viewport)) viewport = this.getViewport(0, scrollTarget);
      var viewportChange = viewport.from != this.viewport.from || viewport.to != this.viewport.to;
      this.viewport = viewport;
      _update6.flags |= this.updateForViewport();
      if (viewportChange || !_update6.changes.empty || _update6.flags & 2) this.updateViewportLines();
      if (this.lineGaps.length || this.viewport.to - this.viewport.from > 2e3 << 1) this.updateLineGaps(this.ensureLineGaps(this.mapLineGaps(this.lineGaps, _update6.changes)));
      _update6.flags |= this.computeVisibleRanges(_update6.changes);
      if (scrollTarget) this.scrollTarget = scrollTarget;
      if (!this.mustEnforceCursorAssoc && (_update6.selectionSet || _update6.focusChanged) && _update6.view.lineWrapping && _update6.state.selection.main.empty && _update6.state.selection.main.assoc && !_update6.state.facet(nativeSelectionHidden)) this.mustEnforceCursorAssoc = true;
    };
    _proto75.measure = function measure() {
      var view = this.view,
        dom = view.contentDOM,
        style = window.getComputedStyle(dom);
      var oracle = this.heightOracle;
      var whiteSpace = style.whiteSpace;
      this.defaultTextDirection = style.direction == "rtl" ? Direction.RTL : Direction.LTR;
      var refresh = this.heightOracle.mustRefreshForWrapping(whiteSpace) || this.mustMeasureContent === "refresh";
      var domRect = dom.getBoundingClientRect();
      var measureContent = refresh || this.mustMeasureContent || this.contentDOMHeight != domRect.height;
      this.contentDOMHeight = domRect.height;
      this.mustMeasureContent = false;
      var result = 0,
        bias = 0;
      if (domRect.width && domRect.height) {
        var _getScale2 = getScale(dom, domRect),
          scaleX = _getScale2.scaleX,
          scaleY = _getScale2.scaleY;
        if (scaleX > 5e-3 && Math.abs(this.scaleX - scaleX) > 5e-3 || scaleY > 5e-3 && Math.abs(this.scaleY - scaleY) > 5e-3) {
          this.scaleX = scaleX;
          this.scaleY = scaleY;
          result |= 16;
          refresh = measureContent = true;
        }
      }
      var paddingTop = (parseInt(style.paddingTop) || 0) * this.scaleY;
      var paddingBottom = (parseInt(style.paddingBottom) || 0) * this.scaleY;
      if (this.paddingTop != paddingTop || this.paddingBottom != paddingBottom) {
        this.paddingTop = paddingTop;
        this.paddingBottom = paddingBottom;
        result |= 16 | 2;
      }
      if (this.editorWidth != view.scrollDOM.clientWidth) {
        if (oracle.lineWrapping) measureContent = true;
        this.editorWidth = view.scrollDOM.clientWidth;
        result |= 16;
      }
      var scrollParent = scrollableParents(this.view.contentDOM, false).y;
      if (scrollParent != this.scrollParent) {
        this.scrollParent = scrollParent;
        this.scrollAnchorHeight = -1;
        this.scrollOffset = 0;
      }
      var scrollOffset = this.getScrollOffset();
      if (this.scrollOffset != scrollOffset) {
        this.scrollAnchorHeight = -1;
        this.scrollOffset = scrollOffset;
      }
      this.scrolledToBottom = isScrolledToBottom(this.scrollParent || view.win);
      var pixelViewport = (this.printing ? fullPixelRange : visiblePixelRange)(dom, this.paddingTop);
      var dTop = pixelViewport.top - this.pixelViewport.top,
        dBottom = pixelViewport.bottom - this.pixelViewport.bottom;
      this.pixelViewport = pixelViewport;
      var inView = this.pixelViewport.bottom > this.pixelViewport.top && this.pixelViewport.right > this.pixelViewport.left;
      if (inView != this.inView) {
        this.inView = inView;
        if (inView) measureContent = true;
      }
      if (!this.inView && !this.scrollTarget && !inWindow(view.dom)) return 0;
      var contentWidth = domRect.width;
      if (this.contentDOMWidth != contentWidth || this.editorHeight != view.scrollDOM.clientHeight) {
        this.contentDOMWidth = domRect.width;
        this.editorHeight = view.scrollDOM.clientHeight;
        result |= 16;
      }
      if (measureContent) {
        var lineHeights = view.docView.measureVisibleLineHeights(this.viewport);
        if (oracle.mustRefreshForHeights(lineHeights)) refresh = true;
        if (refresh || oracle.lineWrapping && Math.abs(contentWidth - this.contentDOMWidth) > oracle.charWidth) {
          var _view$docView$measure = view.docView.measureTextSize(),
            lineHeight = _view$docView$measure.lineHeight,
            charWidth = _view$docView$measure.charWidth,
            textHeight = _view$docView$measure.textHeight;
          refresh = lineHeight > 0 && oracle.refresh(whiteSpace, lineHeight, charWidth, textHeight, Math.max(5, contentWidth / charWidth), lineHeights);
          if (refresh) {
            view.docView.minWidth = 0;
            result |= 16;
          }
        }
        if (dTop > 0 && dBottom > 0) bias = Math.max(dTop, dBottom);else if (dTop < 0 && dBottom < 0) bias = Math.min(dTop, dBottom);
        clearHeightChangeFlag();
        for (var _iterator63 = _createForOfIteratorHelperLoose(this.viewports), _step63; !(_step63 = _iterator63()).done;) {
          var vp = _step63.value;
          var heights = vp.from == this.viewport.from ? lineHeights : view.docView.measureVisibleLineHeights(vp);
          this.heightMap = (refresh ? HeightMap.empty().applyChanges(this.stateDeco, Text.empty, this.heightOracle, [new ChangedRange(0, 0, 0, view.state.doc.length)]) : this.heightMap).updateHeight(oracle, 0, refresh, new MeasuredHeights(vp.from, heights));
        }
        if (heightChangeFlag) result |= 2;
      }
      var viewportChange = !this.viewportIsAppropriate(this.viewport, bias) || this.scrollTarget && (this.scrollTarget.range.head < this.viewport.from || this.scrollTarget.range.head > this.viewport.to);
      if (viewportChange) {
        if (result & 2) result |= this.updateScaler();
        this.viewport = this.getViewport(bias, this.scrollTarget);
        result |= this.updateForViewport();
      }
      if (result & 2 || viewportChange) this.updateViewportLines();
      if (this.lineGaps.length || this.viewport.to - this.viewport.from > 2e3 << 1) this.updateLineGaps(this.ensureLineGaps(refresh ? [] : this.lineGaps, view));
      result |= this.computeVisibleRanges();
      if (this.mustEnforceCursorAssoc) {
        this.mustEnforceCursorAssoc = false;
        view.docView.enforceCursorAssoc();
      }
      return result;
    };
    _proto75.getViewport = function getViewport(bias, scrollTarget) {
      var marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / 1e3 / 2));
      var map = this.heightMap,
        oracle = this.heightOracle;
      var visibleTop = this.visibleTop,
        visibleBottom = this.visibleBottom;
      var viewport = new Viewport(map.lineAt(visibleTop - marginTop * 1e3, QueryType.ByHeight, oracle, 0, 0).from, map.lineAt(visibleBottom + (1 - marginTop) * 1e3, QueryType.ByHeight, oracle, 0, 0).to);
      if (scrollTarget) {
        var head = scrollTarget.range.head;
        if (head < viewport.from || head > viewport.to) {
          var viewHeight = Math.min(this.editorHeight, this.pixelViewport.bottom - this.pixelViewport.top);
          var block = map.lineAt(head, QueryType.ByPos, oracle, 0, 0),
            topPos;
          if (scrollTarget.y == "center") topPos = (block.top + block.bottom) / 2 - viewHeight / 2;else if (scrollTarget.y == "start" || scrollTarget.y == "nearest" && head < viewport.from) topPos = block.top;else topPos = block.bottom - viewHeight;
          viewport = new Viewport(map.lineAt(topPos - 1e3 / 2, QueryType.ByHeight, oracle, 0, 0).from, map.lineAt(topPos + viewHeight + 1e3 / 2, QueryType.ByHeight, oracle, 0, 0).to);
        }
      }
      return viewport;
    };
    _proto75.mapViewport = function mapViewport(viewport, changes) {
      var from = changes.mapPos(viewport.from, -1),
        to = changes.mapPos(viewport.to, 1);
      return new Viewport(this.heightMap.lineAt(from, QueryType.ByPos, this.heightOracle, 0, 0).from, this.heightMap.lineAt(to, QueryType.ByPos, this.heightOracle, 0, 0).to);
    };
    _proto75.viewportIsAppropriate = function viewportIsAppropriate(_ref7, bias) {
      var from = _ref7.from,
        to = _ref7.to;
      if (bias === void 0) {
        bias = 0;
      }
      if (!this.inView) return true;
      var _this$heightMap$lineA = this.heightMap.lineAt(from, QueryType.ByPos, this.heightOracle, 0, 0),
        top2 = _this$heightMap$lineA.top;
      var _this$heightMap$lineA2 = this.heightMap.lineAt(to, QueryType.ByPos, this.heightOracle, 0, 0),
        bottom = _this$heightMap$lineA2.bottom;
      var visibleTop = this.visibleTop,
        visibleBottom = this.visibleBottom;
      return (from == 0 || top2 <= visibleTop - Math.max(10, Math.min(-bias, 250))) && (to == this.state.doc.length || bottom >= visibleBottom + Math.max(10, Math.min(bias, 250))) && top2 > visibleTop - 2 * 1e3 && bottom < visibleBottom + 2 * 1e3;
    };
    _proto75.mapLineGaps = function mapLineGaps(gaps, changes) {
      if (!gaps.length || changes.empty) return gaps;
      var mapped = [];
      for (var _iterator64 = _createForOfIteratorHelperLoose(gaps), _step64; !(_step64 = _iterator64()).done;) {
        var gap = _step64.value;
        if (!changes.touchesRange(gap.from, gap.to)) mapped.push(new LineGap(changes.mapPos(gap.from), changes.mapPos(gap.to), gap.size, gap.displaySize));
      }
      return mapped;
    };
    _proto75.ensureLineGaps = function ensureLineGaps(current, mayMeasure) {
      var _this41 = this;
      var wrapping = this.heightOracle.lineWrapping;
      var margin = wrapping ? 1e4 : 2e3,
        halfMargin = margin >> 1,
        doubleMargin = margin << 1;
      if (this.defaultTextDirection != Direction.LTR && !wrapping) return [];
      var gaps = [];
      var _addGap = function addGap(from, to, line, structure) {
        if (to - from < halfMargin) return;
        var sel = _this41.state.selection.main,
          avoid = [sel.from];
        if (!sel.empty) avoid.push(sel.to);
        for (var _i31 = 0, _avoid = avoid; _i31 < _avoid.length; _i31++) {
          var pos = _avoid[_i31];
          if (pos > from && pos < to) {
            _addGap(from, pos - 10, line, structure);
            _addGap(pos + 10, to, line, structure);
            return;
          }
        }
        var gap = find(current, function (gap2) {
          return gap2.from >= line.from && gap2.to <= line.to && Math.abs(gap2.from - from) < halfMargin && Math.abs(gap2.to - to) < halfMargin && !avoid.some(function (pos) {
            return gap2.from < pos && gap2.to > pos;
          });
        });
        if (!gap) {
          if (to < line.to && mayMeasure && wrapping && mayMeasure.visibleRanges.some(function (r) {
            return r.from <= to && r.to >= to;
          })) {
            var lineStart = mayMeasure.moveToLineBoundary(EditorSelection.cursor(to), false, true).head;
            if (lineStart > from) to = lineStart;
          }
          var size = _this41.gapSize(line, from, to, structure);
          var displaySize = wrapping || size < 2e6 ? size : 2e6;
          gap = new LineGap(from, to, size, displaySize);
        }
        gaps.push(gap);
      };
      var checkLine = function checkLine(line) {
        if (line.length < doubleMargin || line.type != BlockType.Text) return;
        var structure = lineStructure(line.from, line.to, _this41.stateDeco);
        if (structure.total < doubleMargin) return;
        var target = _this41.scrollTarget ? _this41.scrollTarget.range.head : null;
        var viewFrom, viewTo;
        if (wrapping) {
          var marginHeight = margin / _this41.heightOracle.lineLength * _this41.heightOracle.lineHeight;
          var top2, bot;
          if (target != null) {
            var targetFrac = findFraction(structure, target);
            var spaceFrac = ((_this41.visibleBottom - _this41.visibleTop) / 2 + marginHeight) / line.height;
            top2 = targetFrac - spaceFrac;
            bot = targetFrac + spaceFrac;
          } else {
            top2 = (_this41.visibleTop - line.top - marginHeight) / line.height;
            bot = (_this41.visibleBottom - line.top + marginHeight) / line.height;
          }
          viewFrom = findPosition(structure, top2);
          viewTo = findPosition(structure, bot);
        } else {
          var totalWidth = structure.total * _this41.heightOracle.charWidth;
          var marginWidth = margin * _this41.heightOracle.charWidth;
          var horizOffset = 0;
          if (totalWidth > 2e6) {
            for (var _iterator65 = _createForOfIteratorHelperLoose(current), _step65; !(_step65 = _iterator65()).done;) {
              var old = _step65.value;
              if (old.from >= line.from && old.from < line.to && old.size != old.displaySize && old.from * _this41.heightOracle.charWidth + horizOffset < _this41.pixelViewport.left) horizOffset = old.size - old.displaySize;
            }
          }
          var pxLeft = _this41.pixelViewport.left + horizOffset,
            pxRight = _this41.pixelViewport.right + horizOffset;
          var left, right;
          if (target != null) {
            var _targetFrac = findFraction(structure, target);
            var _spaceFrac = ((pxRight - pxLeft) / 2 + marginWidth) / totalWidth;
            left = _targetFrac - _spaceFrac;
            right = _targetFrac + _spaceFrac;
          } else {
            left = (pxLeft - marginWidth) / totalWidth;
            right = (pxRight + marginWidth) / totalWidth;
          }
          viewFrom = findPosition(structure, left);
          viewTo = findPosition(structure, right);
        }
        if (viewFrom > line.from) _addGap(line.from, viewFrom, line, structure);
        if (viewTo < line.to) _addGap(viewTo, line.to, line, structure);
      };
      for (var _iterator66 = _createForOfIteratorHelperLoose(this.viewportLines), _step66; !(_step66 = _iterator66()).done;) {
        var line = _step66.value;
        if (Array.isArray(line.type)) line.type.forEach(checkLine);else checkLine(line);
      }
      return gaps;
    };
    _proto75.gapSize = function gapSize(line, from, to, structure) {
      var fraction = findFraction(structure, to) - findFraction(structure, from);
      if (this.heightOracle.lineWrapping) {
        return line.height * fraction;
      } else {
        return structure.total * this.heightOracle.charWidth * fraction;
      }
    };
    _proto75.updateLineGaps = function updateLineGaps(gaps) {
      var _this42 = this;
      if (!LineGap.same(gaps, this.lineGaps)) {
        this.lineGaps = gaps;
        this.lineGapDeco = Decoration.set(gaps.map(function (gap) {
          return gap.draw(_this42, _this42.heightOracle.lineWrapping);
        }));
      }
    };
    _proto75.computeVisibleRanges = function computeVisibleRanges(changes) {
      var deco = this.stateDeco;
      if (this.lineGaps.length) deco = deco.concat(this.lineGapDeco);
      var ranges = [];
      RangeSet.spans(deco, this.viewport.from, this.viewport.to, {
        span: function span(from, to) {
          ranges.push({
            from: from,
            to: to
          });
        },
        point: function point() {}
      }, 20);
      var changed = 0;
      if (ranges.length != this.visibleRanges.length) {
        changed = 8 | 4;
      } else {
        for (var _i32 = 0; _i32 < ranges.length && !(changed & 8); _i32++) {
          var old = this.visibleRanges[_i32],
            nw = ranges[_i32];
          if (old.from != nw.from || old.to != nw.to) {
            changed |= 4;
            if (!(changes && changes.mapPos(old.from, -1) == nw.from && changes.mapPos(old.to, 1) == nw.to)) changed |= 8;
          }
        }
      }
      this.visibleRanges = ranges;
      return changed;
    };
    _proto75.lineBlockAt = function lineBlockAt(pos) {
      return pos >= this.viewport.from && pos <= this.viewport.to && this.viewportLines.find(function (b) {
        return b.from <= pos && b.to >= pos;
      }) || scaleBlock(this.heightMap.lineAt(pos, QueryType.ByPos, this.heightOracle, 0, 0), this.scaler);
    };
    _proto75.lineBlockAtHeight = function lineBlockAtHeight(height) {
      return height >= this.viewportLines[0].top && height <= this.viewportLines[this.viewportLines.length - 1].bottom && this.viewportLines.find(function (l) {
        return l.top <= height && l.bottom >= height;
      }) || scaleBlock(this.heightMap.lineAt(this.scaler.fromDOM(height), QueryType.ByHeight, this.heightOracle, 0, 0), this.scaler);
    };
    _proto75.getScrollOffset = function getScrollOffset() {
      var base2 = this.scrollParent == this.view.scrollDOM ? this.scrollParent.scrollTop : (this.scrollParent ? this.scrollParent.getBoundingClientRect().top : 0) - this.view.contentDOM.getBoundingClientRect().top;
      return base2 * this.scaleY;
    };
    _proto75.scrollAnchorAt = function scrollAnchorAt(scrollOffset) {
      var block = this.lineBlockAtHeight(scrollOffset + 8);
      return block.from >= this.viewport.from || this.viewportLines[0].top - scrollOffset > 200 ? block : this.viewportLines[0];
    };
    _proto75.elementAtHeight = function elementAtHeight(height) {
      return scaleBlock(this.heightMap.blockAt(this.scaler.fromDOM(height), this.heightOracle, 0, 0), this.scaler);
    };
    return _createClass(ViewState, [{
      key: "visibleTop",
      get: function get() {
        return this.scaler.fromDOM(this.pixelViewport.top);
      }
    }, {
      key: "visibleBottom",
      get: function get() {
        return this.scaler.fromDOM(this.pixelViewport.bottom);
      }
    }, {
      key: "docHeight",
      get: function get() {
        return this.scaler.toDOM(this.heightMap.height);
      }
    }, {
      key: "contentHeight",
      get: function get() {
        return this.docHeight + this.paddingTop + this.paddingBottom;
      }
    }]);
  }();
  var Viewport = function Viewport(from, to) {
    this.from = from;
    this.to = to;
  };
  function lineStructure(from, to, stateDeco) {
    var ranges = [],
      pos = from,
      total = 0;
    RangeSet.spans(stateDeco, from, to, {
      span: function span() {},
      point: function point(from2, to2) {
        if (from2 > pos) {
          ranges.push({
            from: pos,
            to: from2
          });
          total += from2 - pos;
        }
        pos = to2;
      }
    }, 20);
    if (pos < to) {
      ranges.push({
        from: pos,
        to: to
      });
      total += to - pos;
    }
    return {
      total: total,
      ranges: ranges
    };
  }
  function findPosition(_ref8, ratio) {
    var total = _ref8.total,
      ranges = _ref8.ranges;
    if (ratio <= 0) return ranges[0].from;
    if (ratio >= 1) return ranges[ranges.length - 1].to;
    var dist2 = Math.floor(total * ratio);
    for (var _i33 = 0;; _i33++) {
      var _ranges$_i = ranges[_i33],
        from = _ranges$_i.from,
        to = _ranges$_i.to,
        size = to - from;
      if (dist2 <= size) return from + dist2;
      dist2 -= size;
    }
  }
  function findFraction(structure, pos) {
    var counted = 0;
    for (var _iterator67 = _createForOfIteratorHelperLoose(structure.ranges), _step67; !(_step67 = _iterator67()).done;) {
      var _step67$value = _step67.value,
        from = _step67$value.from,
        to = _step67$value.to;
      if (pos <= to) {
        counted += pos - from;
        break;
      }
      counted += to - from;
    }
    return counted / structure.total;
  }
  function find(array, f) {
    for (var _iterator68 = _createForOfIteratorHelperLoose(array), _step68; !(_step68 = _iterator68()).done;) {
      var val = _step68.value;
      if (f(val)) return val;
    }
    return void 0;
  }
  var IdScaler = {
    toDOM: function toDOM(n) {
      return n;
    },
    fromDOM: function fromDOM(n) {
      return n;
    },
    scale: 1,
    eq: function eq(other) {
      return other == this;
    }
  };
  function staticDeco(state) {
    var deco = state.facet(decorations).filter(function (d) {
      return typeof d != "function";
    });
    var outer = state.facet(outerDecorations).filter(function (d) {
      return typeof d != "function";
    });
    if (outer.length) deco.push(RangeSet.join(outer));
    return deco;
  }
  var BigScaler = function () {
    function _BigScaler(oracle, heightMap, viewports) {
      var vpHeight = 0,
        base2 = 0,
        domBase = 0;
      this.viewports = viewports.map(function (_ref9) {
        var from = _ref9.from,
          to = _ref9.to;
        var top2 = heightMap.lineAt(from, QueryType.ByPos, oracle, 0, 0).top;
        var bottom = heightMap.lineAt(to, QueryType.ByPos, oracle, 0, 0).bottom;
        vpHeight += bottom - top2;
        return {
          from: from,
          to: to,
          top: top2,
          bottom: bottom,
          domTop: 0,
          domBottom: 0
        };
      });
      this.scale = (7e6 - vpHeight) / (heightMap.height - vpHeight);
      for (var _iterator69 = _createForOfIteratorHelperLoose(this.viewports), _step69; !(_step69 = _iterator69()).done;) {
        var obj = _step69.value;
        obj.domTop = domBase + (obj.top - base2) * this.scale;
        domBase = obj.domBottom = obj.domTop + (obj.bottom - obj.top);
        base2 = obj.bottom;
      }
    }
    var _proto76 = _BigScaler.prototype;
    _proto76.toDOM = function toDOM(n) {
      for (var _i34 = 0, base2 = 0, domBase = 0;; _i34++) {
        var vp = _i34 < this.viewports.length ? this.viewports[_i34] : null;
        if (!vp || n < vp.top) return domBase + (n - base2) * this.scale;
        if (n <= vp.bottom) return vp.domTop + (n - vp.top);
        base2 = vp.bottom;
        domBase = vp.domBottom;
      }
    };
    _proto76.fromDOM = function fromDOM(n) {
      for (var _i35 = 0, base2 = 0, domBase = 0;; _i35++) {
        var vp = _i35 < this.viewports.length ? this.viewports[_i35] : null;
        if (!vp || n < vp.domTop) return base2 + (n - domBase) / this.scale;
        if (n <= vp.domBottom) return vp.top + (n - vp.domTop);
        base2 = vp.bottom;
        domBase = vp.domBottom;
      }
    };
    _proto76.eq = function eq(other) {
      if (!(other instanceof _BigScaler)) return false;
      return this.scale == other.scale && this.viewports.length == other.viewports.length && this.viewports.every(function (vp, i2) {
        return vp.from == other.viewports[i2].from && vp.to == other.viewports[i2].to;
      });
    };
    return _BigScaler;
  }();
  function scaleBlock(block, scaler) {
    if (scaler.scale == 1) return block;
    var bTop = scaler.toDOM(block.top),
      bBottom = scaler.toDOM(block.bottom);
    return new BlockInfo(block.from, block.length, bTop, bBottom - bTop, Array.isArray(block._content) ? block._content.map(function (b) {
      return scaleBlock(b, scaler);
    }) : block._content);
  }
  var _theme = Facet.define({
    combine: function combine(strs) {
      return strs.join(" ");
    }
  });
  var darkTheme = Facet.define({
    combine: function combine(values) {
      return values.indexOf(true) > -1;
    }
  });
  var baseThemeID = StyleModule.newName();
  var baseLightID = StyleModule.newName();
  var baseDarkID = StyleModule.newName();
  var lightDarkIDs = {
    "&light": "." + baseLightID,
    "&dark": "." + baseDarkID
  };
  function buildTheme(main, spec, scopes) {
    return new StyleModule(spec, {
      finish: function finish(sel) {
        return /&/.test(sel) ? sel.replace(/&\w*/, function (m) {
          if (m == "&") return main;
          if (!scopes || !scopes[m]) throw new RangeError("Unsupported selector: " + m);
          return scopes[m];
        }) : main + " " + sel;
      }
    });
  }
  var baseTheme$1 = buildTheme("." + baseThemeID, {
    "&": {
      position: "relative !important",
      boxSizing: "border-box",
      "&.cm-focused": {
        outline: "1px dotted #212121"
      },
      display: "flex !important",
      flexDirection: "column"
    },
    ".cm-scroller": {
      display: "flex !important",
      alignItems: "flex-start !important",
      fontFamily: "monospace",
      lineHeight: 1.4,
      height: "100%",
      overflowX: "auto",
      position: "relative",
      zIndex: 0,
      overflowAnchor: "none"
    },
    ".cm-content": {
      margin: 0,
      flexGrow: 2,
      flexShrink: 0,
      display: "block",
      whiteSpace: "pre",
      wordWrap: "normal",
      boxSizing: "border-box",
      minHeight: "100%",
      padding: "4px 0",
      outline: "none",
      "&[contenteditable=true]": {
        WebkitUserModify: "read-write-plaintext-only"
      }
    },
    ".cm-lineWrapping": {
      whiteSpace_fallback: "pre-wrap",
      whiteSpace: "break-spaces",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      flexShrink: 1
    },
    "&light .cm-content": {
      caretColor: "black"
    },
    "&dark .cm-content": {
      caretColor: "white"
    },
    ".cm-line": {
      display: "block",
      padding: "0 2px 0 6px"
    },
    ".cm-layer": {
      userSelect: "none",
      position: "absolute",
      left: 0,
      top: 0,
      contain: "size style",
      "& > *": {
        position: "absolute"
      }
    },
    "&light .cm-selectionBackground": {
      background: "#d9d9d9"
    },
    "&dark .cm-selectionBackground": {
      background: "#222"
    },
    "&light.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
      background: "#d7d4f0"
    },
    "&dark.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
      background: "#233"
    },
    ".cm-cursorLayer": {
      pointerEvents: "none"
    },
    "&.cm-focused > .cm-scroller > .cm-cursorLayer": {
      animation: "steps(1) cm-blink 1.2s infinite"
    },
    "@keyframes cm-blink": {
      "0%": {},
      "50%": {
        opacity: 0
      },
      "100%": {}
    },
    "@keyframes cm-blink2": {
      "0%": {},
      "50%": {
        opacity: 0
      },
      "100%": {}
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeft: "1.2px solid black",
      marginLeft: "-0.6px",
      pointerEvents: "none"
    },
    ".cm-cursor": {
      display: "none"
    },
    "&dark .cm-cursor": {
      borderLeftColor: "#ddd"
    },
    ".cm-selectionHandle": {
      backgroundColor: "currentColor",
      width: "1.5px"
    },
    ".cm-selectionHandle-start::before, .cm-selectionHandle-end::before": {
      content: '""',
      backgroundColor: "inherit",
      borderRadius: "50%",
      width: "8px",
      height: "8px",
      position: "absolute",
      left: "-3.25px"
    },
    ".cm-selectionHandle-start::before": {
      top: "-8px"
    },
    ".cm-selectionHandle-end::before": {
      bottom: "-8px"
    },
    ".cm-dropCursor": {
      position: "absolute"
    },
    "&.cm-focused > .cm-scroller > .cm-cursorLayer .cm-cursor": {
      display: "block"
    },
    ".cm-iso": {
      unicodeBidi: "isolate"
    },
    ".cm-announced": {
      position: "fixed",
      top: "-10000px"
    },
    "@media print": {
      ".cm-announced": {
        display: "none"
      }
    },
    "&light .cm-activeLine": {
      backgroundColor: "#cceeff44"
    },
    "&dark .cm-activeLine": {
      backgroundColor: "#99eeff33"
    },
    "&light .cm-specialChar": {
      color: "red"
    },
    "&dark .cm-specialChar": {
      color: "#f78"
    },
    ".cm-gutters": {
      flexShrink: 0,
      display: "flex",
      height: "100%",
      boxSizing: "border-box",
      zIndex: 200
    },
    ".cm-gutters-before": {
      insetInlineStart: 0
    },
    ".cm-gutters-after": {
      insetInlineEnd: 0
    },
    "&light .cm-gutters": {
      backgroundColor: "#f5f5f5",
      color: "#6c6c6c",
      border: "0px solid #ddd",
      "&.cm-gutters-before": {
        borderRightWidth: "1px"
      },
      "&.cm-gutters-after": {
        borderLeftWidth: "1px"
      }
    },
    "&dark .cm-gutters": {
      backgroundColor: "#333338",
      color: "#ccc"
    },
    ".cm-gutter": {
      display: "flex !important",
      flexDirection: "column",
      flexShrink: 0,
      boxSizing: "border-box",
      minHeight: "100%",
      overflow: "hidden"
    },
    ".cm-gutterElement": {
      boxSizing: "border-box"
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 3px 0 5px",
      minWidth: "20px",
      textAlign: "right",
      whiteSpace: "nowrap"
    },
    "&light .cm-activeLineGutter": {
      backgroundColor: "#e2f2ff"
    },
    "&dark .cm-activeLineGutter": {
      backgroundColor: "#222227"
    },
    ".cm-panels": {
      boxSizing: "border-box",
      position: "sticky",
      left: 0,
      right: 0,
      zIndex: 300
    },
    "&light .cm-panels": {
      backgroundColor: "#f5f5f5",
      color: "black"
    },
    ".cm-panels-top": {
      top: "0"
    },
    ".cm-panels-bottom": {
      bottom: "0"
    },
    "&light .cm-panels-top": {
      borderBottom: "1px solid #ddd"
    },
    "&light .cm-panels-bottom": {
      borderTop: "1px solid #ddd"
    },
    "&dark .cm-panels": {
      backgroundColor: "#333338",
      color: "white"
    },
    ".cm-dialog": {
      padding: "2px 19px 4px 6px",
      position: "relative",
      "& label": {
        fontSize: "80%"
      }
    },
    ".cm-dialog-close": {
      position: "absolute",
      top: "3px",
      right: "4px",
      backgroundColor: "inherit",
      border: "none",
      font: "inherit",
      fontSize: "14px",
      padding: "0"
    },
    ".cm-tab": {
      display: "inline-block",
      overflow: "hidden",
      verticalAlign: "bottom"
    },
    ".cm-widgetBuffer": {
      verticalAlign: "text-top",
      height: "1em",
      width: 0,
      display: "inline"
    },
    ".cm-placeholder": {
      color: "#888",
      display: "inline-block",
      verticalAlign: "top",
      userSelect: "none"
    },
    ".cm-highlightSpace": {
      backgroundImage: "radial-gradient(circle at 50% 55%, #aaa 20%, transparent 5%)",
      backgroundPosition: "center"
    },
    ".cm-highlightTab": {
      backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"20\"><path stroke=\"%23888\" stroke-width=\"1\" fill=\"none\" d=\"M1 10H196L190 5M190 15L196 10M197 4L197 16\"/></svg>')",
      backgroundSize: "auto 100%",
      backgroundPosition: "right 90%",
      backgroundRepeat: "no-repeat"
    },
    ".cm-trailingSpace": {
      backgroundColor: "#ff332255"
    },
    ".cm-button": {
      verticalAlign: "middle",
      color: "inherit",
      fontSize: "70%",
      padding: ".2em 1em",
      borderRadius: "1px"
    },
    "&light .cm-button": {
      backgroundImage: "linear-gradient(#eff1f5, #d9d9df)",
      border: "1px solid #888",
      "&:active": {
        backgroundImage: "linear-gradient(#b4b4b4, #d0d3d6)"
      }
    },
    "&dark .cm-button": {
      backgroundImage: "linear-gradient(#393939, #111)",
      border: "1px solid #888",
      "&:active": {
        backgroundImage: "linear-gradient(#111, #333)"
      }
    },
    ".cm-textfield": {
      verticalAlign: "middle",
      color: "inherit",
      fontSize: "70%",
      border: "1px solid silver",
      padding: ".2em .5em"
    },
    "&light .cm-textfield": {
      backgroundColor: "white"
    },
    "&dark .cm-textfield": {
      border: "1px solid #555",
      backgroundColor: "inherit"
    }
  }, lightDarkIDs);
  var observeOptions = {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    characterDataOldValue: true
  };
  var useCharData = browser.ie && browser.ie_version <= 11;
  var DOMObserver = function () {
    function DOMObserver(view) {
      var _this43 = this;
      this.view = view;
      this.active = false;
      this.editContext = null;
      this.selectionRange = new DOMSelectionState();
      this.selectionChanged = false;
      this.delayedFlush = -1;
      this.resizeTimeout = -1;
      this.queue = [];
      this.delayedAndroidKey = null;
      this.flushingAndroidKey = -1;
      this.lastChange = 0;
      this.scrollTargets = [];
      this.intersection = null;
      this.resizeScroll = null;
      this.intersecting = false;
      this.gapIntersection = null;
      this.gaps = [];
      this.printQuery = null;
      this.parentCheck = -1;
      this.dom = view.contentDOM;
      this.observer = new MutationObserver(function (mutations) {
        for (var _iterator70 = _createForOfIteratorHelperLoose(mutations), _step70; !(_step70 = _iterator70()).done;) {
          var mut = _step70.value;
          _this43.queue.push(mut);
        }
        if ((browser.ie && browser.ie_version <= 11 || browser.ios && view.composing) && mutations.some(function (m) {
          return m.type == "childList" && m.removedNodes.length || m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length;
        })) _this43.flushSoon();else _this43.flush();
      });
      if (window.EditContext && browser.android && view.constructor.EDIT_CONTEXT !== false && !(browser.chrome && browser.chrome_version < 126)) {
        this.editContext = new EditContextManager(view);
        if (view.state.facet(editable)) view.contentDOM.editContext = this.editContext.editContext;
      }
      if (useCharData) this.onCharData = function (event) {
        _this43.queue.push({
          target: event.target,
          type: "characterData",
          oldValue: event.prevValue
        });
        _this43.flushSoon();
      };
      this.onSelectionChange = this.onSelectionChange.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onPrint = this.onPrint.bind(this);
      this.onScroll = this.onScroll.bind(this);
      if (window.matchMedia) this.printQuery = window.matchMedia("print");
      if (typeof ResizeObserver == "function") {
        this.resizeScroll = new ResizeObserver(function () {
          var _a2;
          if (((_a2 = _this43.view.docView) === null || _a2 === void 0 ? void 0 : _a2.lastUpdate) < Date.now() - 75) _this43.onResize();
        });
        this.resizeScroll.observe(view.scrollDOM);
      }
      this.addWindowListeners(this.win = view.win);
      this.start();
      if (typeof IntersectionObserver == "function") {
        this.intersection = new IntersectionObserver(function (entries) {
          if (_this43.parentCheck < 0) _this43.parentCheck = setTimeout(_this43.listenForScroll.bind(_this43), 1e3);
          if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0 != _this43.intersecting) {
            _this43.intersecting = !_this43.intersecting;
            if (_this43.intersecting != _this43.view.inView) _this43.onScrollChanged(document.createEvent("Event"));
          }
        }, {
          threshold: [0, 1e-3]
        });
        this.intersection.observe(this.dom);
        this.gapIntersection = new IntersectionObserver(function (entries) {
          if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0) _this43.onScrollChanged(document.createEvent("Event"));
        }, {});
      }
      this.listenForScroll();
      this.readSelectionRange();
    }
    var _proto77 = DOMObserver.prototype;
    _proto77.onScrollChanged = function onScrollChanged(e) {
      this.view.inputState.runHandlers("scroll", e);
      if (this.intersecting) this.view.measure();
    };
    _proto77.onScroll = function onScroll(e) {
      if (this.intersecting) this.flush(false);
      if (this.editContext) this.view.requestMeasure(this.editContext.measureReq);
      this.onScrollChanged(e);
    };
    _proto77.onResize = function onResize() {
      var _this44 = this;
      if (this.resizeTimeout < 0) this.resizeTimeout = setTimeout(function () {
        _this44.resizeTimeout = -1;
        _this44.view.requestMeasure();
      }, 50);
    };
    _proto77.onPrint = function onPrint(event) {
      var _this45 = this;
      if ((event.type == "change" || !event.type) && !event.matches) return;
      this.view.viewState.printing = true;
      this.view.measure();
      setTimeout(function () {
        _this45.view.viewState.printing = false;
        _this45.view.requestMeasure();
      }, 500);
    };
    _proto77.updateGaps = function updateGaps(gaps) {
      if (this.gapIntersection && (gaps.length != this.gaps.length || this.gaps.some(function (g, i2) {
        return g != gaps[i2];
      }))) {
        this.gapIntersection.disconnect();
        for (var _iterator71 = _createForOfIteratorHelperLoose(gaps), _step71; !(_step71 = _iterator71()).done;) {
          var gap = _step71.value;
          this.gapIntersection.observe(gap);
        }
        this.gaps = gaps;
      }
    };
    _proto77.onSelectionChange = function onSelectionChange(event) {
      var wasChanged = this.selectionChanged;
      if (!this.readSelectionRange() || this.delayedAndroidKey) return;
      var view = this.view,
        sel = this.selectionRange;
      if (view.state.facet(editable) ? view.root.activeElement != this.dom : !hasSelection(this.dom, sel)) return;
      var context = sel.anchorNode && view.docView.tile.nearest(sel.anchorNode);
      if (context && context.isWidget() && context.widget.ignoreEvent(event)) {
        if (!wasChanged) this.selectionChanged = false;
        return;
      }
      if ((browser.ie && browser.ie_version <= 11 || browser.android && browser.chrome) && !view.state.selection.main.empty && sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset)) this.flushSoon();else this.flush(false);
    };
    _proto77.readSelectionRange = function readSelectionRange() {
      var view = this.view;
      var selection = getSelection(view.root);
      if (!selection) return false;
      var range = browser.safari && view.root.nodeType == 11 && view.root.activeElement == this.dom && safariSelectionRangeHack(this.view, selection) || selection;
      if (!range || this.selectionRange.eq(range)) return false;
      var local = hasSelection(this.dom, range);
      if (local && !this.selectionChanged && view.inputState.lastFocusTime > Date.now() - 200 && view.inputState.lastTouchTime < Date.now() - 300 && atElementStart(this.dom, range)) {
        this.view.inputState.lastFocusTime = 0;
        view.docView.updateSelection();
        return false;
      }
      this.selectionRange.setRange(range);
      if (local) this.selectionChanged = true;
      return true;
    };
    _proto77.setSelectionRange = function setSelectionRange(anchor, head) {
      this.selectionRange.set(anchor.node, anchor.offset, head.node, head.offset);
      this.selectionChanged = false;
    };
    _proto77.clearSelectionRange = function clearSelectionRange() {
      this.selectionRange.set(null, 0, null, 0);
    };
    _proto77.listenForScroll = function listenForScroll() {
      this.parentCheck = -1;
      var i2 = 0,
        changed = null;
      for (var dom = this.dom; dom;) {
        if (dom.nodeType == 1) {
          if (!changed && i2 < this.scrollTargets.length && this.scrollTargets[i2] == dom) i2++;else if (!changed) changed = this.scrollTargets.slice(0, i2);
          if (changed) changed.push(dom);
          dom = dom.assignedSlot || dom.parentNode;
        } else if (dom.nodeType == 11) {
          dom = dom.host;
        } else {
          break;
        }
      }
      if (i2 < this.scrollTargets.length && !changed) changed = this.scrollTargets.slice(0, i2);
      if (changed) {
        for (var _iterator72 = _createForOfIteratorHelperLoose(this.scrollTargets), _step72; !(_step72 = _iterator72()).done;) {
          var _dom = _step72.value;
          _dom.removeEventListener("scroll", this.onScroll);
        }
        for (var _iterator73 = _createForOfIteratorHelperLoose(this.scrollTargets = changed), _step73; !(_step73 = _iterator73()).done;) {
          var _dom2 = _step73.value;
          _dom2.addEventListener("scroll", this.onScroll);
        }
      }
    };
    _proto77.ignore = function ignore(f) {
      if (!this.active) return f();
      try {
        this.stop();
        return f();
      } finally {
        this.start();
        this.clear();
      }
    };
    _proto77.start = function start() {
      if (this.active) return;
      this.observer.observe(this.dom, observeOptions);
      if (useCharData) this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
      this.active = true;
    };
    _proto77.stop = function stop() {
      if (!this.active) return;
      this.active = false;
      this.observer.disconnect();
      if (useCharData) this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    };
    _proto77.clear = function clear() {
      this.processRecords();
      this.queue.length = 0;
      this.selectionChanged = false;
    };
    _proto77.delayAndroidKey = function delayAndroidKey(key, keyCode) {
      var _this46 = this;
      var _a2;
      if (!this.delayedAndroidKey) {
        var flush = function flush() {
          var key2 = _this46.delayedAndroidKey;
          if (key2) {
            _this46.clearDelayedAndroidKey();
            _this46.view.inputState.lastKeyCode = key2.keyCode;
            _this46.view.inputState.lastKeyTime = Date.now();
            var flushed = _this46.flush();
            if (!flushed && key2.force) dispatchKey(_this46.dom, key2.key, key2.keyCode);
          }
        };
        this.flushingAndroidKey = this.view.win.requestAnimationFrame(flush);
      }
      if (!this.delayedAndroidKey || key == "Enter") this.delayedAndroidKey = {
        key: key,
        keyCode: keyCode,
        force: this.lastChange < Date.now() - 50 || !!((_a2 = this.delayedAndroidKey) === null || _a2 === void 0 ? void 0 : _a2.force)
      };
    };
    _proto77.clearDelayedAndroidKey = function clearDelayedAndroidKey() {
      this.win.cancelAnimationFrame(this.flushingAndroidKey);
      this.delayedAndroidKey = null;
      this.flushingAndroidKey = -1;
    };
    _proto77.flushSoon = function flushSoon() {
      var _this47 = this;
      if (this.delayedFlush < 0) this.delayedFlush = this.view.win.requestAnimationFrame(function () {
        _this47.delayedFlush = -1;
        _this47.flush();
      });
    };
    _proto77.forceFlush = function forceFlush() {
      if (this.delayedFlush >= 0) {
        this.view.win.cancelAnimationFrame(this.delayedFlush);
        this.delayedFlush = -1;
      }
      this.flush();
    };
    _proto77.pendingRecords = function pendingRecords() {
      for (var _iterator74 = _createForOfIteratorHelperLoose(this.observer.takeRecords()), _step74; !(_step74 = _iterator74()).done;) {
        var mut = _step74.value;
        this.queue.push(mut);
      }
      return this.queue;
    };
    _proto77.processRecords = function processRecords() {
      var records2 = this.pendingRecords();
      if (records2.length) this.queue = [];
      var from = -1,
        to = -1,
        typeOver = false;
      for (var _iterator75 = _createForOfIteratorHelperLoose(records2), _step75; !(_step75 = _iterator75()).done;) {
        var record = _step75.value;
        var range = this.readMutation(record);
        if (!range) continue;
        if (range.typeOver) typeOver = true;
        if (from == -1) {
          from = range.from;
          to = range.to;
        } else {
          from = Math.min(range.from, from);
          to = Math.max(range.to, to);
        }
      }
      return {
        from: from,
        to: to,
        typeOver: typeOver
      };
    };
    _proto77.readChange = function readChange() {
      var _this$processRecords = this.processRecords(),
        from = _this$processRecords.from,
        to = _this$processRecords.to,
        typeOver = _this$processRecords.typeOver;
      var newSel = this.selectionChanged && hasSelection(this.dom, this.selectionRange);
      if (from < 0 && !newSel) return null;
      if (from > -1) this.lastChange = Date.now();
      this.view.inputState.lastFocusTime = 0;
      this.selectionChanged = false;
      var change = new DOMChange(this.view, from, to, typeOver);
      this.view.docView.domChanged = {
        newSel: change.newSel ? change.newSel.main : null
      };
      return change;
    };
    _proto77.flush = function flush(readSelection) {
      if (readSelection === void 0) {
        readSelection = true;
      }
      if (this.delayedFlush >= 0 || this.delayedAndroidKey) return false;
      if (readSelection) this.readSelectionRange();
      var domChange = this.readChange();
      if (!domChange) {
        this.view.requestMeasure();
        return false;
      }
      var startState = this.view.state;
      var handled = applyDOMChange(this.view, domChange);
      if (this.view.state == startState && (domChange.domChanged || domChange.newSel && !sameSelPos(this.view.state.selection, domChange.newSel.main))) this.view.update([]);
      return handled;
    };
    _proto77.readMutation = function readMutation(rec) {
      var tile = this.view.docView.tile.nearest(rec.target);
      if (!tile || tile.isWidget()) return null;
      tile.markDirty(rec.type == "attributes");
      if (rec.type == "childList") {
        var childBefore = findChild(tile, rec.previousSibling || rec.target.previousSibling, -1);
        var childAfter = findChild(tile, rec.nextSibling || rec.target.nextSibling, 1);
        return {
          from: childBefore ? tile.posAfter(childBefore) : tile.posAtStart,
          to: childAfter ? tile.posBefore(childAfter) : tile.posAtEnd,
          typeOver: false
        };
      } else if (rec.type == "characterData") {
        return {
          from: tile.posAtStart,
          to: tile.posAtEnd,
          typeOver: rec.target.nodeValue == rec.oldValue
        };
      } else {
        return null;
      }
    };
    _proto77.setWindow = function setWindow(win) {
      if (win != this.win) {
        this.removeWindowListeners(this.win);
        this.win = win;
        this.addWindowListeners(this.win);
      }
    };
    _proto77.addWindowListeners = function addWindowListeners(win) {
      win.addEventListener("resize", this.onResize);
      if (this.printQuery) {
        if (this.printQuery.addEventListener) this.printQuery.addEventListener("change", this.onPrint);else this.printQuery.addListener(this.onPrint);
      } else win.addEventListener("beforeprint", this.onPrint);
      win.addEventListener("scroll", this.onScroll);
      win.document.addEventListener("selectionchange", this.onSelectionChange);
    };
    _proto77.removeWindowListeners = function removeWindowListeners(win) {
      win.removeEventListener("scroll", this.onScroll);
      win.removeEventListener("resize", this.onResize);
      if (this.printQuery) {
        if (this.printQuery.removeEventListener) this.printQuery.removeEventListener("change", this.onPrint);else this.printQuery.removeListener(this.onPrint);
      } else win.removeEventListener("beforeprint", this.onPrint);
      win.document.removeEventListener("selectionchange", this.onSelectionChange);
    };
    _proto77.update = function update(_update7) {
      if (this.editContext) {
        this.editContext.update(_update7);
        if (_update7.startState.facet(editable) != _update7.state.facet(editable)) _update7.view.contentDOM.editContext = _update7.state.facet(editable) ? this.editContext.editContext : null;
      }
    };
    _proto77.destroy = function destroy() {
      var _a2, _b, _c;
      this.stop();
      (_a2 = this.intersection) === null || _a2 === void 0 ? void 0 : _a2.disconnect();
      (_b = this.gapIntersection) === null || _b === void 0 ? void 0 : _b.disconnect();
      (_c = this.resizeScroll) === null || _c === void 0 ? void 0 : _c.disconnect();
      for (var _iterator76 = _createForOfIteratorHelperLoose(this.scrollTargets), _step76; !(_step76 = _iterator76()).done;) {
        var dom = _step76.value;
        dom.removeEventListener("scroll", this.onScroll);
      }
      this.removeWindowListeners(this.win);
      clearTimeout(this.parentCheck);
      clearTimeout(this.resizeTimeout);
      this.win.cancelAnimationFrame(this.delayedFlush);
      this.win.cancelAnimationFrame(this.flushingAndroidKey);
      if (this.editContext) {
        this.view.contentDOM.editContext = null;
        this.editContext.destroy();
      }
    };
    return DOMObserver;
  }();
  function findChild(tile, dom, dir) {
    while (dom) {
      var curTile = Tile.get(dom);
      if (curTile && curTile.parent == tile) return curTile;
      var parent = dom.parentNode;
      dom = parent != tile.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
    }
    return null;
  }
  function buildSelectionRangeFromRange(view, range) {
    var anchorNode = range.startContainer,
      anchorOffset = range.startOffset;
    var focusNode = range.endContainer,
      focusOffset = range.endOffset;
    var curAnchor = view.docView.domAtPos(view.state.selection.main.anchor, 1);
    if (isEquivalentPosition(curAnchor.node, curAnchor.offset, focusNode, focusOffset)) {
      var _ref0 = [focusNode, focusOffset, anchorNode, anchorOffset];
      anchorNode = _ref0[0];
      anchorOffset = _ref0[1];
      focusNode = _ref0[2];
      focusOffset = _ref0[3];
    }
    return {
      anchorNode: anchorNode,
      anchorOffset: anchorOffset,
      focusNode: focusNode,
      focusOffset: focusOffset
    };
  }
  function safariSelectionRangeHack(view, selection) {
    if (selection.getComposedRanges) {
      var range = selection.getComposedRanges(view.root)[0];
      if (range) return buildSelectionRangeFromRange(view, range);
    }
    var found = null;
    function read(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      found = event.getTargetRanges()[0];
    }
    view.contentDOM.addEventListener("beforeinput", read, true);
    view.dom.ownerDocument.execCommand("indent");
    view.contentDOM.removeEventListener("beforeinput", read, true);
    return found ? buildSelectionRangeFromRange(view, found) : null;
  }
  var EditContextManager = function () {
    function EditContextManager(view) {
      var _this48 = this;
      this.from = 0;
      this.to = 0;
      this.pendingContextChange = null;
      this.handlers = Object.create(null);
      this.composing = null;
      this.resetRange(view.state);
      var context = this.editContext = new window.EditContext({
        text: view.state.doc.sliceString(this.from, this.to),
        selectionStart: this.toContextPos(Math.max(this.from, Math.min(this.to, view.state.selection.main.anchor))),
        selectionEnd: this.toContextPos(view.state.selection.main.head)
      });
      this.handlers.textupdate = function (e) {
        var main = view.state.selection.main,
          anchor = main.anchor,
          head = main.head;
        var from = _this48.toEditorPos(e.updateRangeStart),
          to = _this48.toEditorPos(e.updateRangeEnd);
        if (view.inputState.composing >= 0 && !_this48.composing) _this48.composing = {
          contextBase: e.updateRangeStart,
          editorBase: from,
          drifted: false
        };
        var deletes = to - from > e.text.length;
        if (from == _this48.from && anchor < _this48.from) from = anchor;else if (to == _this48.to && anchor > _this48.to) to = anchor;
        var diff = findDiff(view.state.sliceDoc(from, to), e.text, (deletes ? main.from : main.to) - from, deletes ? "end" : null);
        if (!diff) {
          var newSel = EditorSelection.single(_this48.toEditorPos(e.selectionStart), _this48.toEditorPos(e.selectionEnd));
          if (!sameSelPos(newSel, main)) view.dispatch({
            selection: newSel,
            userEvent: "select"
          });
          return;
        }
        var change = {
          from: diff.from + from,
          to: diff.toA + from,
          insert: Text.of(e.text.slice(diff.from, diff.toB).split("\n"))
        };
        if ((browser.mac || browser.android) && change.from == head - 1 && /^\. ?$/.test(e.text) && view.contentDOM.getAttribute("autocorrect") == "off") change = {
          from: from,
          to: to,
          insert: Text.of([e.text.replace(".", " ")])
        };
        _this48.pendingContextChange = change;
        if (!view.state.readOnly) {
          var newLen = _this48.to - _this48.from + (change.to - change.from + change.insert.length);
          applyDOMChangeInner(view, change, EditorSelection.single(_this48.toEditorPos(e.selectionStart, newLen), _this48.toEditorPos(e.selectionEnd, newLen)));
        }
        if (_this48.pendingContextChange) {
          _this48.revertPending(view.state);
          _this48.setSelection(view.state);
        }
        if (change.from < change.to && !change.insert.length && view.inputState.composing >= 0 && !/[\\p{Alphabetic}\\p{Number}_]/.test(context.text.slice(Math.max(0, e.updateRangeStart - 1), Math.min(context.text.length, e.updateRangeStart + 1)))) _this48.handlers.compositionend(e);
      };
      this.handlers.characterboundsupdate = function (e) {
        var rects = [],
          prev = null;
        for (var _i36 = _this48.toEditorPos(e.rangeStart), end = _this48.toEditorPos(e.rangeEnd); _i36 < end; _i36++) {
          var rect = view.coordsForChar(_i36);
          prev = rect && new DOMRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top) || prev || new DOMRect();
          rects.push(prev);
        }
        context.updateCharacterBounds(e.rangeStart, rects);
      };
      this.handlers.textformatupdate = function (e) {
        var deco = [];
        for (var _iterator77 = _createForOfIteratorHelperLoose(e.getTextFormats()), _step77; !(_step77 = _iterator77()).done;) {
          var format = _step77.value;
          var lineStyle = format.underlineStyle,
            thickness = format.underlineThickness;
          if (!new RegExp("none", "i").test(lineStyle) && !new RegExp("none", "i").test(thickness)) {
            var from = _this48.toEditorPos(format.rangeStart),
              to = _this48.toEditorPos(format.rangeEnd);
            if (from < to) {
              var style = "text-decoration: underline " + (/^[a-z]/.test(lineStyle) ? lineStyle + " " : lineStyle == "Dashed" ? "dashed " : lineStyle == "Squiggle" ? "wavy " : "") + (new RegExp("thin", "i").test(thickness) ? 1 : 2) + "px";
              deco.push(Decoration.mark({
                attributes: {
                  style: style
                }
              }).range(from, to));
            }
          }
        }
        view.dispatch({
          effects: setEditContextFormatting.of(Decoration.set(deco))
        });
      };
      this.handlers.compositionstart = function () {
        if (view.inputState.composing < 0) {
          view.inputState.composing = 0;
          view.inputState.compositionFirstChange = true;
        }
      };
      this.handlers.compositionend = function () {
        view.inputState.composing = -1;
        view.inputState.compositionFirstChange = null;
        if (_this48.composing) {
          var drifted = _this48.composing.drifted;
          _this48.composing = null;
          if (drifted) _this48.reset(view.state);
        }
      };
      for (var event in this.handlers) context.addEventListener(event, this.handlers[event]);
      this.measureReq = {
        read: function read(view2) {
          var sel = getSelection(view2.root);
          if (sel && sel.rangeCount) _this48.editContext.updateSelectionBounds(sel.getRangeAt(0).getBoundingClientRect());
        }
      };
    }
    var _proto78 = EditContextManager.prototype;
    _proto78.applyEdits = function applyEdits(update) {
      var _this49 = this;
      var off = 0,
        abort = false,
        pending = this.pendingContextChange;
      update.changes.iterChanges(function (fromA, toA, _fromB, _toB, insert2) {
        if (abort) return;
        var dLen = insert2.length - (toA - fromA);
        if (pending && toA >= pending.to) {
          if (pending.from == fromA && pending.to == toA && pending.insert.eq(insert2)) {
            pending = _this49.pendingContextChange = null;
            off += dLen;
            _this49.to += dLen;
            return;
          } else {
            pending = null;
            _this49.revertPending(update.state);
          }
        }
        fromA += off;
        toA += off;
        if (toA <= _this49.from) {
          _this49.from += dLen;
          _this49.to += dLen;
        } else if (fromA < _this49.to) {
          if (fromA < _this49.from || toA > _this49.to || _this49.to - _this49.from + insert2.length > 3e4) {
            abort = true;
            return;
          }
          _this49.editContext.updateText(_this49.toContextPos(fromA), _this49.toContextPos(toA), insert2.toString());
          _this49.to += dLen;
        }
        off += dLen;
      });
      if (pending && !abort) this.revertPending(update.state);
      return !abort;
    };
    _proto78.update = function update(_update8) {
      var _this50 = this;
      var reverted = this.pendingContextChange,
        startSel = _update8.startState.selection.main;
      if (this.composing && (this.composing.drifted || !_update8.changes.touchesRange(startSel.from, startSel.to) && _update8.transactions.some(function (tr) {
        return !tr.isUserEvent("input.type") && tr.changes.touchesRange(_this50.from, _this50.to);
      }))) {
        this.composing.drifted = true;
        this.composing.editorBase = _update8.changes.mapPos(this.composing.editorBase);
      } else if (!this.applyEdits(_update8) || !this.rangeIsValid(_update8.state)) {
        this.pendingContextChange = null;
        this.reset(_update8.state);
      } else if (_update8.docChanged || _update8.selectionSet || reverted) {
        this.setSelection(_update8.state);
      }
      if (_update8.geometryChanged || _update8.docChanged || _update8.selectionSet) _update8.view.requestMeasure(this.measureReq);
    };
    _proto78.resetRange = function resetRange(state) {
      var head = state.selection.main.head;
      this.from = Math.max(0, head - 1e4);
      this.to = Math.min(state.doc.length, head + 1e4);
    };
    _proto78.reset = function reset(state) {
      this.resetRange(state);
      this.editContext.updateText(0, this.editContext.text.length, state.doc.sliceString(this.from, this.to));
      this.setSelection(state);
    };
    _proto78.revertPending = function revertPending(state) {
      var pending = this.pendingContextChange;
      this.pendingContextChange = null;
      this.editContext.updateText(this.toContextPos(pending.from), this.toContextPos(pending.from + pending.insert.length), state.doc.sliceString(pending.from, pending.to));
    };
    _proto78.setSelection = function setSelection(state) {
      var main = state.selection.main;
      var start = this.toContextPos(Math.max(this.from, Math.min(this.to, main.anchor)));
      var end = this.toContextPos(main.head);
      if (this.editContext.selectionStart != start || this.editContext.selectionEnd != end) this.editContext.updateSelection(start, end);
    };
    _proto78.rangeIsValid = function rangeIsValid(state) {
      var head = state.selection.main.head;
      return !(this.from > 0 && head - this.from < 500 || this.to < state.doc.length && this.to - head < 500 || this.to - this.from > 1e4 * 3);
    };
    _proto78.toEditorPos = function toEditorPos(contextPos, clipLen) {
      if (clipLen === void 0) {
        clipLen = this.to - this.from;
      }
      contextPos = Math.min(contextPos, clipLen);
      var c = this.composing;
      return c && c.drifted ? c.editorBase + (contextPos - c.contextBase) : contextPos + this.from;
    };
    _proto78.toContextPos = function toContextPos(editorPos) {
      var c = this.composing;
      return c && c.drifted ? c.contextBase + (editorPos - c.editorBase) : editorPos - this.from;
    };
    _proto78.destroy = function destroy() {
      for (var event in this.handlers) this.editContext.removeEventListener(event, this.handlers[event]);
    };
    return EditContextManager;
  }();
  var EditorView = function () {
    function _EditorView(config) {
      var _this51 = this;
      if (config === void 0) {
        config = {};
      }
      var _a2;
      this.plugins = [];
      this.pluginMap = new Map();
      this.editorAttrs = {};
      this.contentAttrs = {};
      this.bidiCache = [];
      this.destroyed = false;
      this.updateState = 2;
      this.measureScheduled = -1;
      this.measureRequests = [];
      this.contentDOM = document.createElement("div");
      this.scrollDOM = document.createElement("div");
      this.scrollDOM.tabIndex = -1;
      this.scrollDOM.className = "cm-scroller";
      this.scrollDOM.appendChild(this.contentDOM);
      this.announceDOM = document.createElement("div");
      this.announceDOM.className = "cm-announced";
      this.announceDOM.setAttribute("aria-live", "polite");
      this.dom = document.createElement("div");
      this.dom.appendChild(this.announceDOM);
      this.dom.appendChild(this.scrollDOM);
      if (config.parent) config.parent.appendChild(this.dom);
      var _config = config,
        dispatch = _config.dispatch;
      this.dispatchTransactions = config.dispatchTransactions || dispatch && function (trs) {
        return trs.forEach(function (tr) {
          return dispatch(tr, _this51);
        });
      } || function (trs) {
        return _this51.update(trs);
      };
      this.dispatch = this.dispatch.bind(this);
      this._root = config.root || getRoot(config.parent) || document;
      this.viewState = new ViewState(this, config.state || EditorState.create(config));
      if (config.scrollTo && config.scrollTo.is(_scrollIntoView)) this.viewState.scrollTarget = config.scrollTo.value.clip(this.viewState.state);
      this.plugins = this.state.facet(viewPlugin).map(function (spec) {
        return new PluginInstance(spec);
      });
      for (var _iterator78 = _createForOfIteratorHelperLoose(this.plugins), _step78; !(_step78 = _iterator78()).done;) {
        var plugin = _step78.value;
        plugin.update(this);
      }
      this.observer = new DOMObserver(this);
      this.inputState = new InputState(this);
      this.inputState.ensureHandlers(this.plugins);
      this.docView = new DocView(this);
      this.mountStyles();
      this.updateAttrs();
      this.updateState = 0;
      this.requestMeasure();
      if ((_a2 = document.fonts) === null || _a2 === void 0 ? void 0 : _a2.ready) document.fonts.ready.then(function () {
        _this51.viewState.mustMeasureContent = "refresh";
        _this51.requestMeasure();
      });
    }
    var _proto79 = _EditorView.prototype;
    _proto79.dispatch = function dispatch() {
      var _this$state;
      for (var _len6 = arguments.length, input = new Array(_len6), _key4 = 0; _key4 < _len6; _key4++) {
        input[_key4] = arguments[_key4];
      }
      var trs = input.length == 1 && input[0] instanceof Transaction ? input : input.length == 1 && Array.isArray(input[0]) ? input[0] : [(_this$state = this.state).update.apply(_this$state, input)];
      this.dispatchTransactions(trs, this);
    };
    _proto79.update = function update(transactions) {
      var _this52 = this;
      if (this.updateState != 0) throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
      var redrawn = false,
        attrsChanged = false,
        update;
      var state = this.state;
      for (var _iterator79 = _createForOfIteratorHelperLoose(transactions), _step79; !(_step79 = _iterator79()).done;) {
        var _tr = _step79.value;
        if (_tr.startState != state) throw new RangeError("Trying to update state with a transaction that doesn't start from the previous state.");
        state = _tr.state;
      }
      if (this.destroyed) {
        this.viewState.state = state;
        return;
      }
      var focus = this.hasFocus,
        focusFlag = 0,
        dispatchFocus = null;
      if (transactions.some(function (tr) {
        return tr.annotation(isFocusChange);
      })) {
        this.inputState.notifiedFocused = focus;
        focusFlag = 1;
      } else if (focus != this.inputState.notifiedFocused) {
        this.inputState.notifiedFocused = focus;
        dispatchFocus = focusChangeTransaction(state, focus);
        if (!dispatchFocus) focusFlag = 1;
      }
      var pendingKey = this.observer.delayedAndroidKey,
        domChange = null;
      if (pendingKey) {
        this.observer.clearDelayedAndroidKey();
        domChange = this.observer.readChange();
        if (domChange && !this.state.doc.eq(state.doc) || !this.state.selection.eq(state.selection)) domChange = null;
      } else {
        this.observer.clear();
      }
      if (state.facet(EditorState.phrases) != this.state.facet(EditorState.phrases)) return this.setState(state);
      update = ViewUpdate.create(this, state, transactions);
      update.flags |= focusFlag;
      var scrollTarget = this.viewState.scrollTarget;
      try {
        this.updateState = 2;
        for (var _iterator80 = _createForOfIteratorHelperLoose(transactions), _step80; !(_step80 = _iterator80()).done;) {
          var tr = _step80.value;
          if (scrollTarget) scrollTarget = scrollTarget.map(tr.changes);
          if (tr.scrollIntoView) {
            var main = tr.state.selection.main;
            var _this$state$facet = this.state.facet(_EditorView.cursorScrollMargin),
              x = _this$state$facet.x,
              y = _this$state$facet.y;
            scrollTarget = new ScrollTarget(main.empty ? main : EditorSelection.cursor(main.head, main.head > main.anchor ? -1 : 1), "nearest", "nearest", y, x);
          }
          for (var _iterator81 = _createForOfIteratorHelperLoose(tr.effects), _step81; !(_step81 = _iterator81()).done;) {
            var e = _step81.value;
            if (e.is(_scrollIntoView)) scrollTarget = e.value.clip(this.state);
          }
        }
        this.viewState.update(update, scrollTarget);
        this.bidiCache = CachedOrder.update(this.bidiCache, update.changes);
        if (!update.empty) {
          this.updatePlugins(update);
          this.inputState.update(update);
        }
        redrawn = this.docView.update(update);
        if (this.state.facet(styleModule) != this.styleModules) this.mountStyles();
        attrsChanged = this.updateAttrs();
        this.showAnnouncements(transactions);
        this.docView.updateSelection(redrawn, transactions.some(function (tr) {
          return tr.isUserEvent("select.pointer");
        }));
      } finally {
        this.updateState = 0;
      }
      if (update.startState.facet(_theme) != update.state.facet(_theme)) this.viewState.mustMeasureContent = true;
      if (redrawn || attrsChanged || scrollTarget || this.viewState.mustEnforceCursorAssoc || this.viewState.mustMeasureContent) this.requestMeasure();
      if (redrawn) this.docViewUpdate();
      if (!update.empty) {
        for (var _iterator82 = _createForOfIteratorHelperLoose(this.state.facet(updateListener)), _step82; !(_step82 = _iterator82()).done;) {
          var listener = _step82.value;
          try {
            listener(update);
          } catch (_e7) {
            logException(this.state, _e7, "update listener");
          }
        }
      }
      if (dispatchFocus || domChange) Promise.resolve().then(function () {
        if (dispatchFocus && _this52.state == dispatchFocus.startState) _this52.dispatch(dispatchFocus);
        if (domChange) {
          if (!applyDOMChange(_this52, domChange) && pendingKey.force) dispatchKey(_this52.contentDOM, pendingKey.key, pendingKey.keyCode);
        }
      });
    };
    _proto79.setState = function setState(newState) {
      if (this.updateState != 0) throw new Error("Calls to EditorView.setState are not allowed while an update is in progress");
      if (this.destroyed) {
        this.viewState.state = newState;
        return;
      }
      this.updateState = 2;
      var hadFocus = this.hasFocus;
      try {
        for (var _iterator83 = _createForOfIteratorHelperLoose(this.plugins), _step83; !(_step83 = _iterator83()).done;) {
          var plugin = _step83.value;
          plugin.destroy(this);
        }
        this.viewState = new ViewState(this, newState);
        this.plugins = newState.facet(viewPlugin).map(function (spec) {
          return new PluginInstance(spec);
        });
        this.pluginMap.clear();
        for (var _iterator84 = _createForOfIteratorHelperLoose(this.plugins), _step84; !(_step84 = _iterator84()).done;) {
          var _plugin2 = _step84.value;
          _plugin2.update(this);
        }
        this.docView.destroy();
        this.docView = new DocView(this);
        this.inputState.ensureHandlers(this.plugins);
        this.mountStyles();
        this.updateAttrs();
        this.bidiCache = [];
      } finally {
        this.updateState = 0;
      }
      if (hadFocus) this.focus();
      this.requestMeasure();
    };
    _proto79.updatePlugins = function updatePlugins(update) {
      var prevSpecs = update.startState.facet(viewPlugin),
        specs = update.state.facet(viewPlugin);
      if (prevSpecs != specs) {
        var newPlugins = [];
        for (var _iterator85 = _createForOfIteratorHelperLoose(specs), _step85; !(_step85 = _iterator85()).done;) {
          var spec = _step85.value;
          var found = prevSpecs.indexOf(spec);
          if (found < 0) {
            newPlugins.push(new PluginInstance(spec));
          } else {
            var plugin = this.plugins[found];
            plugin.mustUpdate = update;
            newPlugins.push(plugin);
          }
        }
        for (var _iterator86 = _createForOfIteratorHelperLoose(this.plugins), _step86; !(_step86 = _iterator86()).done;) {
          var _plugin3 = _step86.value;
          if (_plugin3.mustUpdate != update) _plugin3.destroy(this);
        }
        this.plugins = newPlugins;
        this.pluginMap.clear();
      } else {
        for (var _iterator87 = _createForOfIteratorHelperLoose(this.plugins), _step87; !(_step87 = _iterator87()).done;) {
          var _p = _step87.value;
          _p.mustUpdate = update;
        }
      }
      for (var _i37 = 0; _i37 < this.plugins.length; _i37++) this.plugins[_i37].update(this);
      if (prevSpecs != specs) this.inputState.ensureHandlers(this.plugins);
    };
    _proto79.docViewUpdate = function docViewUpdate() {
      for (var _iterator88 = _createForOfIteratorHelperLoose(this.plugins), _step88; !(_step88 = _iterator88()).done;) {
        var plugin = _step88.value;
        var val = plugin.value;
        if (val && val.docViewUpdate) {
          try {
            val.docViewUpdate(this);
          } catch (_e8) {
            logException(this.state, _e8, "doc view update listener");
          }
        }
      }
    };
    _proto79.measure = function measure(flush) {
      var _this53 = this;
      if (flush === void 0) {
        flush = true;
      }
      if (this.destroyed) return;
      if (this.measureScheduled > -1) this.win.cancelAnimationFrame(this.measureScheduled);
      if (this.observer.delayedAndroidKey) {
        this.measureScheduled = -1;
        this.requestMeasure();
        return;
      }
      this.measureScheduled = 0;
      if (flush) this.observer.forceFlush();
      var updated = null;
      var scroll = this.viewState.scrollParent,
        scrollOffset = this.viewState.getScrollOffset();
      var _this$viewState = this.viewState,
        scrollAnchorPos = _this$viewState.scrollAnchorPos,
        scrollAnchorHeight = _this$viewState.scrollAnchorHeight;
      if (Math.abs(scrollOffset - this.viewState.scrollOffset) > 1) scrollAnchorHeight = -1;
      this.viewState.scrollAnchorHeight = -1;
      try {
        for (var _i38 = 0;; _i38++) {
          if (scrollAnchorHeight < 0) {
            if (isScrolledToBottom(scroll || this.win)) {
              scrollAnchorPos = -1;
              scrollAnchorHeight = this.viewState.heightMap.height;
            } else {
              var block = this.viewState.scrollAnchorAt(scrollOffset);
              scrollAnchorPos = block.from;
              scrollAnchorHeight = block.top;
            }
          }
          this.updateState = 1;
          var changed = this.viewState.measure();
          if (!changed && !this.measureRequests.length && this.viewState.scrollTarget == null) break;
          if (_i38 > 5) {
            console.warn(this.measureRequests.length ? "Measure loop restarted more than 5 times" : "Viewport failed to stabilize");
            break;
          }
          var measuring = [];
          if (!(changed & 4)) {
            var _ref1 = [measuring, this.measureRequests];
            this.measureRequests = _ref1[0];
            measuring = _ref1[1];
          }
          var measured = measuring.map(function (m) {
            try {
              return m.read(_this53);
            } catch (_e9) {
              logException(_this53.state, _e9);
              return BadMeasure;
            }
          });
          var update = ViewUpdate.create(this, this.state, []),
            redrawn = false;
          update.flags |= changed;
          if (!updated) updated = update;else updated.flags |= changed;
          this.updateState = 2;
          if (!update.empty) {
            this.updatePlugins(update);
            this.inputState.update(update);
            this.updateAttrs();
            redrawn = this.docView.update(update);
            if (redrawn) this.docViewUpdate();
          }
          for (var i3 = 0; i3 < measuring.length; i3++) if (measured[i3] != BadMeasure) {
            try {
              var m = measuring[i3];
              if (m.write) m.write(measured[i3], this);
            } catch (_e0) {
              logException(this.state, _e0);
            }
          }
          if (redrawn) this.docView.updateSelection(true);
          if (!update.viewportChanged && this.measureRequests.length == 0) {
            if (this.viewState.editorHeight) {
              if (this.viewState.scrollTarget) {
                this.docView.scrollIntoView(this.viewState.scrollTarget);
                this.viewState.scrollTarget = null;
                scrollAnchorHeight = -1;
                continue;
              } else {
                var newAnchorHeight = scrollAnchorPos < 0 ? this.viewState.heightMap.height : this.viewState.lineBlockAt(scrollAnchorPos).top;
                var diff = (newAnchorHeight - scrollAnchorHeight) / this.scaleY;
                if ((diff > 1 || diff < -1) && !(browser.ios && this.inputState.lastIOSMomentumScroll > Date.now() - 100) && (scroll == this.scrollDOM || this.hasFocus || Math.max(this.inputState.lastWheelEvent, this.inputState.lastTouchTime) > Date.now() - 100)) {
                  scrollOffset = scrollOffset + diff;
                  if (!scroll) this.win.scrollBy(0, diff);else if (scrollAnchorPos < 0) scroll.scrollTop = scroll.scrollHeight;else scroll.scrollTop += diff;
                  scrollAnchorHeight = -1;
                  continue;
                }
              }
            }
            break;
          }
        }
      } finally {
        this.updateState = 0;
        this.measureScheduled = -1;
      }
      if (updated && !updated.empty) {
        for (var _iterator89 = _createForOfIteratorHelperLoose(this.state.facet(updateListener)), _step89; !(_step89 = _iterator89()).done;) {
          var listener = _step89.value;
          listener(updated);
        }
      }
    };
    _proto79.updateAttrs = function updateAttrs() {
      var _this54 = this;
      var editorAttrs = attrsFromFacet(this, editorAttributes, {
        class: "cm-editor" + (this.hasFocus ? " cm-focused " : " ") + this.themeClasses
      });
      var contentAttrs = {
        spellcheck: "false",
        autocorrect: "off",
        autocapitalize: "off",
        writingsuggestions: "false",
        translate: "no",
        contenteditable: !this.state.facet(editable) ? "false" : "true",
        class: "cm-content",
        style: browser.tabSize + ": " + this.state.tabSize,
        role: "textbox",
        "aria-multiline": "true"
      };
      if (this.state.readOnly) contentAttrs["aria-readonly"] = "true";
      attrsFromFacet(this, contentAttributes, contentAttrs);
      var changed = this.observer.ignore(function () {
        var changedContent = _updateAttrs(_this54.contentDOM, _this54.contentAttrs, contentAttrs);
        var changedEditor = _updateAttrs(_this54.dom, _this54.editorAttrs, editorAttrs);
        return changedContent || changedEditor;
      });
      this.editorAttrs = editorAttrs;
      this.contentAttrs = contentAttrs;
      return changed;
    };
    _proto79.showAnnouncements = function showAnnouncements(trs) {
      var first = true;
      for (var _iterator90 = _createForOfIteratorHelperLoose(trs), _step90; !(_step90 = _iterator90()).done;) {
        var tr = _step90.value;
        for (var _iterator91 = _createForOfIteratorHelperLoose(tr.effects), _step91; !(_step91 = _iterator91()).done;) {
          var effect = _step91.value;
          if (effect.is(_EditorView.announce)) {
            if (first) this.announceDOM.textContent = "";
            first = false;
            var div = this.announceDOM.appendChild(document.createElement("div"));
            div.textContent = effect.value;
          }
        }
      }
    };
    _proto79.mountStyles = function mountStyles() {
      this.styleModules = this.state.facet(styleModule);
      var nonce = this.state.facet(_EditorView.cspNonce);
      StyleModule.mount(this.root, this.styleModules.concat(baseTheme$1).reverse(), nonce ? {
        nonce: nonce
      } : void 0);
    };
    _proto79.readMeasured = function readMeasured() {
      if (this.updateState == 2) throw new Error("Reading the editor layout isn't allowed during an update");
      if (this.updateState == 0 && this.measureScheduled > -1) this.measure(false);
    };
    _proto79.requestMeasure = function requestMeasure(request) {
      var _this55 = this;
      if (this.measureScheduled < 0) this.measureScheduled = this.win.requestAnimationFrame(function () {
        return _this55.measure();
      });
      if (request) {
        if (this.measureRequests.indexOf(request) > -1) return;
        if (request.key != null) for (var _i39 = 0; _i39 < this.measureRequests.length; _i39++) {
          if (this.measureRequests[_i39].key === request.key) {
            this.measureRequests[_i39] = request;
            return;
          }
        }
        this.measureRequests.push(request);
      }
    };
    _proto79.plugin = function plugin(_plugin) {
      var known = this.pluginMap.get(_plugin);
      if (known === void 0 || known && known.plugin != _plugin) this.pluginMap.set(_plugin, known = this.plugins.find(function (p) {
        return p.plugin == _plugin;
      }) || null);
      return known && known.update(this).value;
    };
    _proto79.elementAtHeight = function elementAtHeight(height) {
      this.readMeasured();
      return this.viewState.elementAtHeight(height);
    };
    _proto79.lineBlockAtHeight = function lineBlockAtHeight(height) {
      this.readMeasured();
      return this.viewState.lineBlockAtHeight(height);
    };
    _proto79.lineBlockAt = function lineBlockAt(pos) {
      return this.viewState.lineBlockAt(pos);
    };
    _proto79.moveByChar = function moveByChar(start, forward, by) {
      return skipAtoms(this, start, _moveByChar(this, start, forward, by));
    };
    _proto79.moveByGroup = function moveByGroup(start, forward) {
      var _this56 = this;
      return skipAtoms(this, start, _moveByChar(this, start, forward, function (initial) {
        return byGroup(_this56, start.head, initial);
      }));
    };
    _proto79.visualLineSide = function visualLineSide(line, end) {
      var order = this.bidiSpans(line),
        dir = this.textDirectionAt(line.from);
      var span = order[end ? order.length - 1 : 0];
      return EditorSelection.cursor(span.side(end, dir) + line.from, span.forward(!end, dir) ? 1 : -1);
    };
    _proto79.moveToLineBoundary = function moveToLineBoundary(start, forward, includeWrap) {
      if (includeWrap === void 0) {
        includeWrap = true;
      }
      return _moveToLineBoundary(this, start, forward, includeWrap);
    };
    _proto79.moveVertically = function moveVertically(start, forward, distance) {
      return skipAtoms(this, start, _moveVertically(this, start, forward, distance));
    };
    _proto79.domAtPos = function domAtPos(pos, side) {
      if (side === void 0) {
        side = 1;
      }
      return this.docView.domAtPos(pos, side);
    };
    _proto79.posAtDOM = function posAtDOM(node, offset) {
      if (offset === void 0) {
        offset = 0;
      }
      return this.docView.posFromDOM(node, offset);
    };
    _proto79.posAtCoords = function posAtCoords(coords, precise) {
      if (precise === void 0) {
        precise = true;
      }
      this.readMeasured();
      var found = _posAtCoords(this, coords, precise);
      return found && found.pos;
    };
    _proto79.posAndSideAtCoords = function posAndSideAtCoords(coords, precise) {
      if (precise === void 0) {
        precise = true;
      }
      this.readMeasured();
      return _posAtCoords(this, coords, precise);
    };
    _proto79.coordsAtPos = function coordsAtPos(pos, side) {
      if (side === void 0) {
        side = 1;
      }
      this.readMeasured();
      var line = this.state.doc.lineAt(pos),
        order = this.bidiSpans(line);
      var span = order[BidiSpan.find(order, pos - line.from, -1, side)];
      return this.docView.coordsAt(pos, side, span.dir == Direction.RTL);
    };
    _proto79.coordsForChar = function coordsForChar(pos) {
      this.readMeasured();
      return this.docView.coordsForChar(pos);
    };
    _proto79.textDirectionAt = function textDirectionAt(pos) {
      var perLine = this.state.facet(perLineTextDirection);
      if (!perLine || pos < this.viewport.from || pos > this.viewport.to) return this.textDirection;
      this.readMeasured();
      return this.docView.textDirectionAt(pos);
    };
    _proto79.bidiSpans = function bidiSpans(line) {
      if (line.length > MaxBidiLine) return trivialOrder(line.length);
      var dir = this.textDirectionAt(line.from),
        isolates;
      for (var _iterator92 = _createForOfIteratorHelperLoose(this.bidiCache), _step92; !(_step92 = _iterator92()).done;) {
        var entry = _step92.value;
        if (entry.from == line.from && entry.dir == dir && (entry.fresh || isolatesEq(entry.isolates, isolates = getIsolatedRanges(this, line)))) return entry.order;
      }
      if (!isolates) isolates = getIsolatedRanges(this, line);
      var order = computeOrder(line.text, dir, isolates);
      this.bidiCache.push(new CachedOrder(line.from, line.to, dir, isolates, true, order));
      return order;
    };
    _proto79.focus = function focus() {
      var _this57 = this;
      this.observer.ignore(function () {
        focusPreventScroll(_this57.contentDOM);
        _this57.docView.updateSelection();
      });
    };
    _proto79.setRoot = function setRoot(root) {
      if (this._root != root) {
        this._root = root;
        this.observer.setWindow((root.nodeType == 9 ? root : root.ownerDocument).defaultView || window);
        this.mountStyles();
      }
    };
    _proto79.destroy = function destroy() {
      if (this.root.activeElement == this.contentDOM) this.contentDOM.blur();
      for (var _iterator93 = _createForOfIteratorHelperLoose(this.plugins), _step93; !(_step93 = _iterator93()).done;) {
        var plugin = _step93.value;
        plugin.destroy(this);
      }
      this.plugins = [];
      this.inputState.destroy();
      this.docView.destroy();
      this.dom.remove();
      this.observer.destroy();
      if (this.measureScheduled > -1) this.win.cancelAnimationFrame(this.measureScheduled);
      this.destroyed = true;
    };
    _EditorView.scrollIntoView = function scrollIntoView(pos, options) {
      if (options === void 0) {
        options = {};
      }
      var _a2, _b, _c, _d;
      return _scrollIntoView.of(new ScrollTarget(typeof pos == "number" ? EditorSelection.cursor(pos) : pos, (_a2 = options.y) !== null && _a2 !== void 0 ? _a2 : "nearest", (_b = options.x) !== null && _b !== void 0 ? _b : "nearest", (_c = options.yMargin) !== null && _c !== void 0 ? _c : 5, (_d = options.xMargin) !== null && _d !== void 0 ? _d : 5));
    };
    _proto79.scrollSnapshot = function scrollSnapshot() {
      var _this$scrollDOM = this.scrollDOM,
        scrollTop = _this$scrollDOM.scrollTop,
        scrollLeft = _this$scrollDOM.scrollLeft;
      var ref = this.viewState.scrollAnchorAt(scrollTop);
      return _scrollIntoView.of(new ScrollTarget(EditorSelection.cursor(ref.from), "start", "start", ref.top - scrollTop, scrollLeft, true));
    };
    _proto79.setTabFocusMode = function setTabFocusMode(to) {
      if (to == null) this.inputState.tabFocusMode = this.inputState.tabFocusMode < 0 ? 0 : -1;else if (typeof to == "boolean") this.inputState.tabFocusMode = to ? 0 : -1;else if (this.inputState.tabFocusMode != 0) this.inputState.tabFocusMode = Date.now() + to;
    };
    _EditorView.domEventHandlers = function domEventHandlers(handlers2) {
      return ViewPlugin.define(function () {
        return {};
      }, {
        eventHandlers: handlers2
      });
    };
    _EditorView.domEventObservers = function domEventObservers(observers2) {
      return ViewPlugin.define(function () {
        return {};
      }, {
        eventObservers: observers2
      });
    };
    _EditorView.theme = function theme(spec, options) {
      var prefix = StyleModule.newName();
      var result = [_theme.of(prefix), styleModule.of(buildTheme("." + prefix, spec))];
      if (options && options.dark) result.push(darkTheme.of(true));
      return result;
    };
    _EditorView.baseTheme = function baseTheme(spec) {
      return Prec.lowest(styleModule.of(buildTheme("." + baseThemeID, spec, lightDarkIDs)));
    };
    _EditorView.findFromDOM = function findFromDOM(dom) {
      var _a2;
      var content2 = dom.querySelector(".cm-content");
      var tile = content2 && Tile.get(content2) || Tile.get(dom);
      return ((_a2 = tile === null || tile === void 0 ? void 0 : tile.root) === null || _a2 === void 0 ? void 0 : _a2.view) || null;
    };
    return _createClass(_EditorView, [{
      key: "state",
      get: function get() {
        return this.viewState.state;
      }
    }, {
      key: "viewport",
      get: function get() {
        return this.viewState.viewport;
      }
    }, {
      key: "visibleRanges",
      get: function get() {
        return this.viewState.visibleRanges;
      }
    }, {
      key: "inView",
      get: function get() {
        return this.viewState.inView;
      }
    }, {
      key: "composing",
      get: function get() {
        return !!this.inputState && this.inputState.composing > 0;
      }
    }, {
      key: "compositionStarted",
      get: function get() {
        return !!this.inputState && this.inputState.composing >= 0;
      }
    }, {
      key: "root",
      get: function get() {
        return this._root;
      }
    }, {
      key: "win",
      get: function get() {
        return this.dom.ownerDocument.defaultView || window;
      }
    }, {
      key: "themeClasses",
      get: function get() {
        return baseThemeID + " " + (this.state.facet(darkTheme) ? baseDarkID : baseLightID) + " " + this.state.facet(_theme);
      }
    }, {
      key: "documentTop",
      get: function get() {
        return this.contentDOM.getBoundingClientRect().top + this.viewState.paddingTop;
      }
    }, {
      key: "documentPadding",
      get: function get() {
        return {
          top: this.viewState.paddingTop,
          bottom: this.viewState.paddingBottom
        };
      }
    }, {
      key: "scaleX",
      get: function get() {
        return this.viewState.scaleX;
      }
    }, {
      key: "scaleY",
      get: function get() {
        return this.viewState.scaleY;
      }
    }, {
      key: "viewportLineBlocks",
      get: function get() {
        return this.viewState.viewportLines;
      }
    }, {
      key: "contentHeight",
      get: function get() {
        return this.viewState.contentHeight;
      }
    }, {
      key: "defaultCharacterWidth",
      get: function get() {
        return this.viewState.heightOracle.charWidth;
      }
    }, {
      key: "defaultLineHeight",
      get: function get() {
        return this.viewState.heightOracle.lineHeight;
      }
    }, {
      key: "textDirection",
      get: function get() {
        return this.viewState.defaultTextDirection;
      }
    }, {
      key: "lineWrapping",
      get: function get() {
        return this.viewState.heightOracle.lineWrapping;
      }
    }, {
      key: "hasFocus",
      get: function get() {
        var _a2;
        return (this.dom.ownerDocument.hasFocus() || browser.safari && ((_a2 = this.inputState) === null || _a2 === void 0 ? void 0 : _a2.lastContextMenu) > Date.now() - 3e4) && this.root.activeElement == this.contentDOM;
      }
    }]);
  }();
  EditorView.styleModule = styleModule;
  EditorView.inputHandler = inputHandler;
  EditorView.clipboardInputFilter = clipboardInputFilter;
  EditorView.clipboardOutputFilter = clipboardOutputFilter;
  EditorView.scrollHandler = scrollHandler;
  EditorView.focusChangeEffect = focusChangeEffect;
  EditorView.perLineTextDirection = perLineTextDirection;
  EditorView.exceptionSink = exceptionSink;
  EditorView.updateListener = updateListener;
  EditorView.editable = editable;
  EditorView.mouseSelectionStyle = mouseSelectionStyle;
  EditorView.dragMovesSelection = dragMovesSelection$1;
  EditorView.clickAddsSelectionRange = clickAddsSelectionRange;
  EditorView.decorations = decorations;
  EditorView.blockWrappers = blockWrappers;
  EditorView.outerDecorations = outerDecorations;
  EditorView.atomicRanges = atomicRanges;
  EditorView.bidiIsolatedRanges = bidiIsolatedRanges;
  EditorView.cursorScrollMargin = Facet.define({
    combine: function combine(inputs) {
      var x = 5,
        y = 5;
      for (var _iterator94 = _createForOfIteratorHelperLoose(inputs), _step94; !(_step94 = _iterator94()).done;) {
        var _i40 = _step94.value;
        if (typeof _i40 == "number") x = y = _i40;else {
          x = _i40.x;
          y = _i40.y;
        }
      }
      return {
        x: x,
        y: y
      };
    }
  });
  EditorView.scrollMargins = scrollMargins;
  EditorView.darkTheme = darkTheme;
  EditorView.cspNonce = Facet.define({
    combine: function combine(values) {
      return values.length ? values[0] : "";
    }
  });
  EditorView.contentAttributes = contentAttributes;
  EditorView.editorAttributes = editorAttributes;
  EditorView.lineWrapping = EditorView.contentAttributes.of({
    "class": "cm-lineWrapping"
  });
  EditorView.announce = StateEffect.define();
  var MaxBidiLine = 4096;
  var BadMeasure = {};
  var CachedOrder = function () {
    function _CachedOrder(from, to, dir, isolates, fresh, order) {
      this.from = from;
      this.to = to;
      this.dir = dir;
      this.isolates = isolates;
      this.fresh = fresh;
      this.order = order;
    }
    _CachedOrder.update = function update(cache, changes) {
      if (changes.empty && !cache.some(function (c) {
        return c.fresh;
      })) return cache;
      var result = [],
        lastDir = cache.length ? cache[cache.length - 1].dir : Direction.LTR;
      for (var _i41 = Math.max(0, cache.length - 10); _i41 < cache.length; _i41++) {
        var entry = cache[_i41];
        if (entry.dir == lastDir && !changes.touchesRange(entry.from, entry.to)) result.push(new _CachedOrder(changes.mapPos(entry.from, 1), changes.mapPos(entry.to, -1), entry.dir, entry.isolates, false, entry.order));
      }
      return result;
    };
    return _CachedOrder;
  }();
  function attrsFromFacet(view, facet, base2) {
    for (var sources = view.state.facet(facet), _i42 = sources.length - 1; _i42 >= 0; _i42--) {
      var source = sources[_i42],
        value = typeof source == "function" ? source(view) : source;
      if (value) combineAttrs(value, base2);
    }
    return base2;
  }
  var currentPlatform = browser.mac ? "mac" : browser.windows ? "win" : browser.linux ? "linux" : "key";
  function normalizeKeyName(name2, platform) {
    var parts = name2.split(/-(?!$)/);
    var result = parts[parts.length - 1];
    if (result == "Space") result = " ";
    var alt, ctrl, shift2, meta2;
    for (var _i43 = 0; _i43 < parts.length - 1; ++_i43) {
      var mod = parts[_i43];
      if (new RegExp("^(cmd|meta|m)$", "i").test(mod)) meta2 = true;else if (new RegExp("^a(lt)?$", "i").test(mod)) alt = true;else if (new RegExp("^(c|ctrl|control)$", "i").test(mod)) ctrl = true;else if (new RegExp("^s(hift)?$", "i").test(mod)) shift2 = true;else if (new RegExp("^mod$", "i").test(mod)) {
        if (platform == "mac") meta2 = true;else ctrl = true;
      } else throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt) result = "Alt-" + result;
    if (ctrl) result = "Ctrl-" + result;
    if (meta2) result = "Meta-" + result;
    if (shift2) result = "Shift-" + result;
    return result;
  }
  function modifiers(name2, event, shift2) {
    if (event.altKey) name2 = "Alt-" + name2;
    if (event.ctrlKey) name2 = "Ctrl-" + name2;
    if (event.metaKey) name2 = "Meta-" + name2;
    if (shift2 !== false && event.shiftKey) name2 = "Shift-" + name2;
    return name2;
  }
  var handleKeyEvents = Prec.default(EditorView.domEventHandlers({
    keydown: function keydown(event, view) {
      return runHandlers(getKeymap(view.state), event, view, "editor");
    }
  }));
  var keymap = Facet.define({
    enables: handleKeyEvents
  });
  var Keymaps = new WeakMap();
  function getKeymap(state) {
    var bindings = state.facet(keymap);
    var map = Keymaps.get(bindings);
    if (!map) Keymaps.set(bindings, map = buildKeymap(bindings.reduce(function (a, b) {
      return a.concat(b);
    }, [])));
    return map;
  }
  var storedPrefix = null;
  var PrefixTimeout = 4e3;
  function buildKeymap(bindings, platform) {
    if (platform === void 0) {
      platform = currentPlatform;
    }
    var bound = Object.create(null);
    var isPrefix = Object.create(null);
    var checkPrefix = function checkPrefix(name2, is) {
      var current = isPrefix[name2];
      if (current == null) isPrefix[name2] = is;else if (current != is) throw new Error("Key binding " + name2 + " is used both as a regular binding and as a multi-stroke prefix");
    };
    var add2 = function add2(scope, key, command2, preventDefault, stopPropagation) {
      var _a2, _b;
      var scopeObj = bound[scope] || (bound[scope] = Object.create(null));
      var parts = key.split(/ (?!$)/).map(function (k) {
        return normalizeKeyName(k, platform);
      });
      var _loop0 = function _loop0() {
        var prefix = parts.slice(0, _i44).join(" ");
        checkPrefix(prefix, true);
        if (!scopeObj[prefix]) scopeObj[prefix] = {
          preventDefault: true,
          stopPropagation: false,
          run: [function (view) {
            var ourObj = storedPrefix = {
              view: view,
              prefix: prefix,
              scope: scope
            };
            setTimeout(function () {
              if (storedPrefix == ourObj) storedPrefix = null;
            }, PrefixTimeout);
            return true;
          }]
        };
      };
      for (var _i44 = 1; _i44 < parts.length; _i44++) {
        _loop0();
      }
      var full = parts.join(" ");
      checkPrefix(full, false);
      var binding = scopeObj[full] || (scopeObj[full] = {
        preventDefault: false,
        stopPropagation: false,
        run: ((_b = (_a2 = scopeObj._any) === null || _a2 === void 0 ? void 0 : _a2.run) === null || _b === void 0 ? void 0 : _b.slice()) || []
      });
      if (command2) binding.run.push(command2);
      if (preventDefault) binding.preventDefault = true;
      if (stopPropagation) binding.stopPropagation = true;
    };
    for (var _iterator95 = _createForOfIteratorHelperLoose(bindings), _step95; !(_step95 = _iterator95()).done;) {
      var b = _step95.value;
      var scopes = b.scope ? b.scope.split(" ") : ["editor"];
      if (b.any) {
        var _loop1 = function _loop1() {
          var scope = _step96.value;
          var scopeObj = bound[scope] || (bound[scope] = Object.create(null));
          if (!scopeObj._any) scopeObj._any = {
            preventDefault: false,
            stopPropagation: false,
            run: []
          };
          var any = b.any;
          for (var key in scopeObj) scopeObj[key].run.push(function (view) {
            return any(view, currentKeyEvent);
          });
        };
        for (var _iterator96 = _createForOfIteratorHelperLoose(scopes), _step96; !(_step96 = _iterator96()).done;) {
          _loop1();
        }
      }
      var name2 = b[platform] || b.key;
      if (!name2) continue;
      for (var _iterator97 = _createForOfIteratorHelperLoose(scopes), _step97; !(_step97 = _iterator97()).done;) {
        var scope = _step97.value;
        add2(scope, name2, b.run, b.preventDefault, b.stopPropagation);
        if (b.shift) add2(scope, "Shift-" + name2, b.shift, b.preventDefault, b.stopPropagation);
      }
    }
    return bound;
  }
  var currentKeyEvent = null;
  function runHandlers(map, event, view, scope) {
    currentKeyEvent = event;
    var name2 = keyName(event);
    var charCode = codePointAt2(name2, 0),
      isChar = codePointSize2(charCode) == name2.length && name2 != " ";
    var prefix = "",
      handled = false,
      prevented = false,
      stopPropagation = false;
    if (storedPrefix && storedPrefix.view == view && storedPrefix.scope == scope) {
      prefix = storedPrefix.prefix + " ";
      if (modifierCodes.indexOf(event.keyCode) < 0) {
        prevented = true;
        storedPrefix = null;
      }
    }
    var ran = new Set();
    var runFor = function runFor(binding) {
      if (binding) {
        for (var _iterator98 = _createForOfIteratorHelperLoose(binding.run), _step98; !(_step98 = _iterator98()).done;) {
          var cmd2 = _step98.value;
          if (!ran.has(cmd2)) {
            ran.add(cmd2);
            if (cmd2(view)) {
              if (binding.stopPropagation) stopPropagation = true;
              return true;
            }
          }
        }
        if (binding.preventDefault) {
          if (binding.stopPropagation) stopPropagation = true;
          prevented = true;
        }
      }
      return false;
    };
    var scopeObj = map[scope],
      baseName,
      shiftName;
    if (scopeObj) {
      if (runFor(scopeObj[prefix + modifiers(name2, event, !isChar)])) {
        handled = true;
      } else if (isChar && (event.altKey || event.metaKey || event.ctrlKey) && !(browser.windows && event.ctrlKey && event.altKey) && !(browser.mac && event.altKey && !(event.ctrlKey || event.metaKey)) && (baseName = base[event.keyCode]) && baseName != name2) {
        if (runFor(scopeObj[prefix + modifiers(baseName, event, true)])) {
          handled = true;
        } else if (event.shiftKey && (shiftName = shift[event.keyCode]) != name2 && shiftName != baseName && runFor(scopeObj[prefix + modifiers(shiftName, event, false)])) {
          handled = true;
        }
      } else if (isChar && event.shiftKey && runFor(scopeObj[prefix + modifiers(name2, event, true)])) {
        handled = true;
      }
      if (!handled && runFor(scopeObj._any)) handled = true;
    }
    if (prevented) handled = true;
    if (handled && stopPropagation) event.stopPropagation();
    currentKeyEvent = null;
    return handled;
  }
  var selectionBg = browser.gecko && browser.gecko_version == 153 ? "#ffffff01" : "transparent";
  var hideNativeSelection = Prec.highest(EditorView.theme({
    ".cm-line": {
      "& ::selection, &::selection": {
        backgroundColor: selectionBg + " !important"
      },
      caretColor: "transparent !important"
    },
    ".cm-content": {
      caretColor: "transparent !important",
      "& :focus": {
        caretColor: "initial !important",
        "&::selection, & ::selection": {
          backgroundColor: "Highlight !important"
        }
      }
    }
  }));
  var UnicodeRegexpSupport = /x/.unicode != null ? "gu" : "g";
  var baseTheme = EditorView.baseTheme({
    ".cm-tooltip": {
      zIndex: 500,
      boxSizing: "border-box"
    },
    "&light .cm-tooltip": {
      border: "1px solid #bbb",
      backgroundColor: "#f5f5f5"
    },
    "&light .cm-tooltip-section:not(:first-child)": {
      borderTop: "1px solid #bbb"
    },
    "&dark .cm-tooltip": {
      backgroundColor: "#333338",
      color: "white"
    },
    ".cm-tooltip-arrow": {
      height: 7 + "px",
      width: 7 * 2 + "px",
      position: "absolute",
      zIndex: -1,
      overflow: "hidden",
      "&:before, &:after": {
        content: "''",
        position: "absolute",
        width: 0,
        height: 0,
        borderLeft: 7 + "px solid transparent",
        borderRight: 7 + "px solid transparent"
      },
      ".cm-tooltip-above &": {
        bottom: "-" + 7 + "px",
        "&:before": {
          borderTop: 7 + "px solid #bbb"
        },
        "&:after": {
          borderTop: 7 + "px solid #f5f5f5",
          bottom: "1px"
        }
      },
      ".cm-tooltip-below &": {
        top: "-" + 7 + "px",
        "&:before": {
          borderBottom: 7 + "px solid #bbb"
        },
        "&:after": {
          borderBottom: 7 + "px solid #f5f5f5",
          top: "1px"
        }
      }
    },
    "&dark .cm-tooltip .cm-tooltip-arrow": {
      "&:before": {
        borderTopColor: "#333338",
        borderBottomColor: "#333338"
      },
      "&:after": {
        borderTopColor: "transparent",
        borderBottomColor: "transparent"
      }
    }
  });
  var GutterMarker = function (_RangeValue3) {
    function GutterMarker() {
      return _RangeValue3.apply(this, arguments) || this;
    }
    _inheritsLoose(GutterMarker, _RangeValue3);
    var _proto80 = GutterMarker.prototype;
    _proto80.compare = function compare(other) {
      return this == other || this.constructor == other.constructor && this.eq(other);
    };
    _proto80.eq = function eq(other) {
      return false;
    };
    _proto80.destroy = function destroy(dom) {};
    return GutterMarker;
  }(RangeValue);
  GutterMarker.prototype.elementClass = "";
  GutterMarker.prototype.toDOM = void 0;
  GutterMarker.prototype.mapMode = MapMode.TrackBefore;
  GutterMarker.prototype.startSide = GutterMarker.prototype.endSide = -1;
  GutterMarker.prototype.point = true;
  var gutterLineClass = Facet.define();
  var gutterWidgetClass = Facet.define();
  var activeGutters = Facet.define();
  var unfixGutters = Facet.define({
    combine: function combine(values) {
      return values.some(function (x) {
        return x;
      });
    }
  });
  function gutters(config) {
    var result = [gutterView];
    if (config && config.fixed === false) result.push(unfixGutters.of(true));
    return result;
  }
  var gutterView = ViewPlugin.fromClass(function () {
    function _class2(view) {
      this.view = view;
      this.domAfter = null;
      this.prevViewport = view.viewport;
      this.dom = document.createElement("div");
      this.dom.className = "cm-gutters cm-gutters-before";
      this.dom.setAttribute("aria-hidden", "true");
      this.dom.style.minHeight = this.view.contentHeight / this.view.scaleY + "px";
      this.gutters = view.state.facet(activeGutters).map(function (conf) {
        return new SingleGutterView(view, conf);
      });
      this.fixed = !view.state.facet(unfixGutters);
      for (var _iterator99 = _createForOfIteratorHelperLoose(this.gutters), _step99; !(_step99 = _iterator99()).done;) {
        var gutter2 = _step99.value;
        if (gutter2.config.side == "after") this.getDOMAfter().appendChild(gutter2.dom);else this.dom.appendChild(gutter2.dom);
      }
      if (this.fixed) {
        this.dom.style.position = "sticky";
      }
      this.syncGutters(false);
      view.scrollDOM.insertBefore(this.dom, view.contentDOM);
    }
    var _proto81 = _class2.prototype;
    _proto81.getDOMAfter = function getDOMAfter() {
      if (!this.domAfter) {
        this.domAfter = document.createElement("div");
        this.domAfter.className = "cm-gutters cm-gutters-after";
        this.domAfter.setAttribute("aria-hidden", "true");
        this.domAfter.style.minHeight = this.view.contentHeight / this.view.scaleY + "px";
        this.domAfter.style.position = this.fixed ? "sticky" : "";
        this.view.scrollDOM.appendChild(this.domAfter);
      }
      return this.domAfter;
    };
    _proto81.update = function update(_update9) {
      if (this.updateGutters(_update9)) {
        var vpA = this.prevViewport,
          vpB = _update9.view.viewport;
        var vpOverlap = Math.min(vpA.to, vpB.to) - Math.max(vpA.from, vpB.from);
        this.syncGutters(vpOverlap < (vpB.to - vpB.from) * 0.8);
      }
      if (_update9.geometryChanged) {
        var min = this.view.contentHeight / this.view.scaleY + "px";
        this.dom.style.minHeight = min;
        if (this.domAfter) this.domAfter.style.minHeight = min;
      }
      if (this.view.state.facet(unfixGutters) != !this.fixed) {
        this.fixed = !this.fixed;
        this.dom.style.position = this.fixed ? "sticky" : "";
        if (this.domAfter) this.domAfter.style.position = this.fixed ? "sticky" : "";
      }
      this.prevViewport = _update9.view.viewport;
    };
    _proto81.syncGutters = function syncGutters(detach) {
      var _this58 = this;
      var after = this.dom.nextSibling;
      if (detach) {
        this.dom.remove();
        if (this.domAfter) this.domAfter.remove();
      }
      var lineClasses = RangeSet.iter(this.view.state.facet(gutterLineClass), this.view.viewport.from);
      var classSet = [];
      var contexts = this.gutters.map(function (gutter2) {
        return new UpdateContext(gutter2, _this58.view.viewport, -_this58.view.documentPadding.top);
      });
      for (var _iterator100 = _createForOfIteratorHelperLoose(this.view.viewportLineBlocks), _step100; !(_step100 = _iterator100()).done;) {
        var line = _step100.value;
        if (classSet.length) classSet = [];
        if (Array.isArray(line.type)) {
          var first = true;
          for (var _iterator102 = _createForOfIteratorHelperLoose(line.type), _step102; !(_step102 = _iterator102()).done;) {
            var b = _step102.value;
            if (b.type == BlockType.Text && first) {
              advanceCursor(lineClasses, classSet, b.from);
              for (var _iterator103 = _createForOfIteratorHelperLoose(contexts), _step103; !(_step103 = _iterator103()).done;) {
                var cx = _step103.value;
                cx.line(this.view, b, classSet);
              }
              first = false;
            } else if (b.widget) {
              for (var _iterator104 = _createForOfIteratorHelperLoose(contexts), _step104; !(_step104 = _iterator104()).done;) {
                var _cx = _step104.value;
                _cx.widget(this.view, b);
              }
            }
          }
        } else if (line.type == BlockType.Text) {
          advanceCursor(lineClasses, classSet, line.from);
          for (var _iterator105 = _createForOfIteratorHelperLoose(contexts), _step105; !(_step105 = _iterator105()).done;) {
            var _cx2 = _step105.value;
            _cx2.line(this.view, line, classSet);
          }
        } else if (line.widget) {
          for (var _iterator106 = _createForOfIteratorHelperLoose(contexts), _step106; !(_step106 = _iterator106()).done;) {
            var _cx3 = _step106.value;
            _cx3.widget(this.view, line);
          }
        }
      }
      for (var _iterator101 = _createForOfIteratorHelperLoose(contexts), _step101; !(_step101 = _iterator101()).done;) {
        var _cx4 = _step101.value;
        _cx4.finish();
      }
      if (detach) {
        this.view.scrollDOM.insertBefore(this.dom, after);
        if (this.domAfter) this.view.scrollDOM.appendChild(this.domAfter);
      }
    };
    _proto81.updateGutters = function updateGutters(update) {
      var prev = update.startState.facet(activeGutters),
        cur = update.state.facet(activeGutters);
      var change = update.docChanged || update.heightChanged || update.viewportChanged || !RangeSet.eq(update.startState.facet(gutterLineClass), update.state.facet(gutterLineClass), update.view.viewport.from, update.view.viewport.to);
      if (prev == cur) {
        for (var _iterator107 = _createForOfIteratorHelperLoose(this.gutters), _step107; !(_step107 = _iterator107()).done;) {
          var gutter2 = _step107.value;
          if (gutter2.update(update)) change = true;
        }
      } else {
        change = true;
        var gutters2 = [];
        for (var _iterator108 = _createForOfIteratorHelperLoose(cur), _step108; !(_step108 = _iterator108()).done;) {
          var conf = _step108.value;
          var known = prev.indexOf(conf);
          if (known < 0) {
            gutters2.push(new SingleGutterView(this.view, conf));
          } else {
            this.gutters[known].update(update);
            gutters2.push(this.gutters[known]);
          }
        }
        for (var _iterator109 = _createForOfIteratorHelperLoose(this.gutters), _step109; !(_step109 = _iterator109()).done;) {
          var _g = _step109.value;
          _g.dom.remove();
          if (gutters2.indexOf(_g) < 0) _g.destroy();
        }
        for (var _i45 = 0, _gutters = gutters2; _i45 < _gutters.length; _i45++) {
          var g = _gutters[_i45];
          if (g.config.side == "after") this.getDOMAfter().appendChild(g.dom);else this.dom.appendChild(g.dom);
        }
        this.gutters = gutters2;
      }
      return change;
    };
    _proto81.destroy = function destroy() {
      for (var _iterator110 = _createForOfIteratorHelperLoose(this.gutters), _step110; !(_step110 = _iterator110()).done;) {
        var view = _step110.value;
        view.destroy();
      }
      this.dom.remove();
      if (this.domAfter) this.domAfter.remove();
    };
    return _class2;
  }(), {
    provide: function provide(plugin) {
      return EditorView.scrollMargins.of(function (view) {
        var value = view.plugin(plugin);
        if (!value || value.gutters.length == 0 || !value.fixed) return null;
        var before = value.dom.offsetWidth * view.scaleX,
          after = value.domAfter ? value.domAfter.offsetWidth * view.scaleX : 0;
        return view.textDirection == Direction.LTR ? {
          left: before,
          right: after
        } : {
          right: before,
          left: after
        };
      });
    }
  });
  function asArray2(val) {
    return Array.isArray(val) ? val : [val];
  }
  function advanceCursor(cursor, collect, pos) {
    while (cursor.value && cursor.from <= pos) {
      if (cursor.from == pos) collect.push(cursor.value);
      cursor.next();
    }
  }
  var UpdateContext = function () {
    function UpdateContext(gutter2, viewport, height) {
      this.gutter = gutter2;
      this.height = height;
      this.i = 0;
      this.cursor = RangeSet.iter(gutter2.markers, viewport.from);
    }
    var _proto82 = UpdateContext.prototype;
    _proto82.addElement = function addElement(view, block, markers) {
      var gutter2 = this.gutter,
        above = (block.top - this.height) / view.scaleY,
        height = block.height / view.scaleY;
      if (this.i == gutter2.elements.length) {
        var newElt = new GutterElement(view, height, above, markers);
        gutter2.elements.push(newElt);
        gutter2.dom.appendChild(newElt.dom);
      } else {
        gutter2.elements[this.i].update(view, height, above, markers);
      }
      this.height = block.bottom;
      this.i++;
    };
    _proto82.line = function line(view, _line2, extraMarkers) {
      var localMarkers = [];
      advanceCursor(this.cursor, localMarkers, _line2.from);
      if (extraMarkers.length) localMarkers = localMarkers.concat(extraMarkers);
      var forLine = this.gutter.config.lineMarker(view, _line2, localMarkers);
      if (forLine) localMarkers.unshift(forLine);
      var gutter2 = this.gutter;
      if (localMarkers.length == 0 && !gutter2.config.renderEmptyElements) return;
      this.addElement(view, _line2, localMarkers);
    };
    _proto82.widget = function widget(view, block) {
      var marker = this.gutter.config.widgetMarker(view, block.widget, block),
        markers = marker ? [marker] : null;
      for (var _iterator111 = _createForOfIteratorHelperLoose(view.state.facet(gutterWidgetClass)), _step111; !(_step111 = _iterator111()).done;) {
        var cls = _step111.value;
        var marker2 = cls(view, block.widget, block);
        if (marker2) (markers || (markers = [])).push(marker2);
      }
      if (markers) this.addElement(view, block, markers);
    };
    _proto82.finish = function finish() {
      var gutter2 = this.gutter;
      while (gutter2.elements.length > this.i) {
        var last = gutter2.elements.pop();
        gutter2.dom.removeChild(last.dom);
        last.destroy();
      }
    };
    return UpdateContext;
  }();
  var SingleGutterView = function () {
    function SingleGutterView(view, config) {
      var _this59 = this;
      this.view = view;
      this.config = config;
      this.elements = [];
      this.spacer = null;
      this.dom = document.createElement("div");
      this.dom.className = "cm-gutter" + (this.config.class ? " " + this.config.class : "");
      var _loop10 = function _loop10(prop) {
        _this59.dom.addEventListener(prop, function (event) {
          var target = event.target,
            y;
          if (target != _this59.dom && _this59.dom.contains(target)) {
            while (target.parentNode != _this59.dom) target = target.parentNode;
            var rect = target.getBoundingClientRect();
            y = (rect.top + rect.bottom) / 2;
          } else {
            y = event.clientY;
          }
          var line = view.lineBlockAtHeight(y - view.documentTop);
          if (config.domEventHandlers[prop](view, line, event)) event.preventDefault();
        });
      };
      for (var prop in config.domEventHandlers) {
        _loop10(prop);
      }
      this.markers = asArray2(config.markers(view));
      if (config.initialSpacer) {
        this.spacer = new GutterElement(view, 0, 0, [config.initialSpacer(view)]);
        this.dom.appendChild(this.spacer.dom);
        this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
      }
    }
    var _proto83 = SingleGutterView.prototype;
    _proto83.update = function update(_update0) {
      var prevMarkers = this.markers;
      this.markers = asArray2(this.config.markers(_update0.view));
      if (this.spacer && this.config.updateSpacer) {
        var updated = this.config.updateSpacer(this.spacer.markers[0], _update0);
        if (updated != this.spacer.markers[0]) this.spacer.update(_update0.view, 0, 0, [updated]);
      }
      var vp = _update0.view.viewport;
      return !RangeSet.eq(this.markers, prevMarkers, vp.from, vp.to) || (this.config.lineMarkerChange ? this.config.lineMarkerChange(_update0) : false);
    };
    _proto83.destroy = function destroy() {
      for (var _iterator112 = _createForOfIteratorHelperLoose(this.elements), _step112; !(_step112 = _iterator112()).done;) {
        var elt = _step112.value;
        elt.destroy();
      }
    };
    return SingleGutterView;
  }();
  var GutterElement = function () {
    function GutterElement(view, height, above, markers) {
      this.height = -1;
      this.above = 0;
      this.markers = [];
      this.dom = document.createElement("div");
      this.dom.className = "cm-gutterElement";
      this.update(view, height, above, markers);
    }
    var _proto84 = GutterElement.prototype;
    _proto84.update = function update(view, height, above, markers) {
      if (this.height != height) {
        this.height = height;
        this.dom.style.height = height + "px";
      }
      if (this.above != above) this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
      if (!sameMarkers(this.markers, markers)) this.setMarkers(view, markers);
    };
    _proto84.setMarkers = function setMarkers(view, markers) {
      var cls = "cm-gutterElement",
        domPos = this.dom.firstChild;
      for (var iNew = 0, iOld = 0;;) {
        var skipTo = iOld,
          marker = iNew < markers.length ? markers[iNew++] : null,
          matched = false;
        if (marker) {
          var c = marker.elementClass;
          if (c) cls += " " + c;
          for (var _i46 = iOld; _i46 < this.markers.length; _i46++) if (this.markers[_i46].compare(marker)) {
            skipTo = _i46;
            matched = true;
            break;
          }
        } else {
          skipTo = this.markers.length;
        }
        while (iOld < skipTo) {
          var next = this.markers[iOld++];
          if (next.toDOM) {
            next.destroy(domPos);
            var after = domPos.nextSibling;
            domPos.remove();
            domPos = after;
          }
        }
        if (!marker) break;
        if (marker.toDOM) {
          if (matched) domPos = domPos.nextSibling;else this.dom.insertBefore(marker.toDOM(view), domPos);
        }
        if (matched) iOld++;
      }
      this.dom.className = cls;
      this.markers = markers;
    };
    _proto84.destroy = function destroy() {
      this.setMarkers(null, []);
    };
    return GutterElement;
  }();
  function sameMarkers(a, b) {
    if (a.length != b.length) return false;
    for (var _i47 = 0; _i47 < a.length; _i47++) if (!a[_i47].compare(b[_i47])) return false;
    return true;
  }
  var lineNumberMarkers = Facet.define();
  var lineNumberWidgetMarker = Facet.define();
  var lineNumberConfig = Facet.define({
    combine: function combine(values) {
      return combineConfig(values, {
        formatNumber: String,
        domEventHandlers: {}
      }, {
        domEventHandlers: function domEventHandlers(a, b) {
          var result = Object.assign({}, a);
          var _loop11 = function _loop11() {
            var exists = result[event],
              add2 = b[event];
            result[event] = exists ? function (view, line, event2) {
              return exists(view, line, event2) || add2(view, line, event2);
            } : add2;
          };
          for (var event in b) {
            _loop11();
          }
          return result;
        }
      });
    }
  });
  var NumberMarker = function (_GutterMarker) {
    function NumberMarker(number2) {
      var _this60;
      _this60 = _GutterMarker.call(this) || this;
      _this60.number = number2;
      return _this60;
    }
    _inheritsLoose(NumberMarker, _GutterMarker);
    var _proto85 = NumberMarker.prototype;
    _proto85.eq = function eq(other) {
      return this.number == other.number;
    };
    _proto85.toDOM = function toDOM() {
      return document.createTextNode(this.number);
    };
    return NumberMarker;
  }(GutterMarker);
  function formatNumber(view, number2) {
    return view.state.facet(lineNumberConfig).formatNumber(number2, view.state);
  }
  var lineNumberGutter = activeGutters.compute([lineNumberConfig], function (state) {
    return {
      class: "cm-lineNumbers",
      renderEmptyElements: false,
      markers: function markers(view) {
        return view.state.facet(lineNumberMarkers);
      },
      lineMarker: function lineMarker(view, line, others) {
        if (others.some(function (m) {
          return m.toDOM;
        })) return null;
        return new NumberMarker(formatNumber(view, view.state.doc.lineAt(line.from).number));
      },
      widgetMarker: function widgetMarker(view, widget, block) {
        for (var _iterator113 = _createForOfIteratorHelperLoose(view.state.facet(lineNumberWidgetMarker)), _step113; !(_step113 = _iterator113()).done;) {
          var m = _step113.value;
          var result = m(view, widget, block);
          if (result) return result;
        }
        return null;
      },
      lineMarkerChange: function lineMarkerChange(update) {
        return update.startState.facet(lineNumberConfig) != update.state.facet(lineNumberConfig);
      },
      initialSpacer: function initialSpacer(view) {
        return new NumberMarker(formatNumber(view, maxLineNumber(view.state.doc.lines)));
      },
      updateSpacer: function updateSpacer(spacer, update) {
        var max = formatNumber(update.view, maxLineNumber(update.view.state.doc.lines));
        return max == spacer.number ? spacer : new NumberMarker(max);
      },
      domEventHandlers: state.facet(lineNumberConfig).domEventHandlers,
      side: "before"
    };
  });
  function lineNumbers(config) {
    if (config === void 0) {
      config = {};
    }
    return [lineNumberConfig.of(config), gutters(), lineNumberGutter];
  }
  function maxLineNumber(lines) {
    var last = 9;
    while (last < lines) last = last * 10 + 9;
    return last;
  }
  var DefaultBufferLength = 1024;
  var nextPropID = 0;
  var Range2 = function Range2(from, to) {
    this.from = from;
    this.to = to;
  };
  var NodeProp = function () {
    function NodeProp(config) {
      if (config === void 0) {
        config = {};
      }
      this.id = nextPropID++;
      this.perNode = !!config.perNode;
      this.deserialize = config.deserialize || function () {
        throw new Error("This node type doesn't define a deserialize function");
      };
      this.combine = config.combine || null;
    }
    var _proto86 = NodeProp.prototype;
    _proto86.add = function add(match) {
      var _this61 = this;
      if (this.perNode) throw new RangeError("Can't add per-node props to node types");
      if (typeof match != "function") match = NodeType.match(match);
      return function (type) {
        var result = match(type);
        return result === void 0 ? null : [_this61, result];
      };
    };
    return NodeProp;
  }();
  NodeProp.closedBy = new NodeProp({
    deserialize: function deserialize(str) {
      return str.split(" ");
    }
  });
  NodeProp.openedBy = new NodeProp({
    deserialize: function deserialize(str) {
      return str.split(" ");
    }
  });
  NodeProp.group = new NodeProp({
    deserialize: function deserialize(str) {
      return str.split(" ");
    }
  });
  NodeProp.isolate = new NodeProp({
    deserialize: function deserialize(value) {
      if (value && value != "rtl" && value != "ltr" && value != "auto") throw new RangeError("Invalid value for isolate: " + value);
      return value || "auto";
    }
  });
  NodeProp.contextHash = new NodeProp({
    perNode: true
  });
  NodeProp.lookAhead = new NodeProp({
    perNode: true
  });
  NodeProp.mounted = new NodeProp({
    perNode: true
  });
  var MountedTree = function () {
    function MountedTree(tree, overlay, parser, bracketed) {
      if (bracketed === void 0) {
        bracketed = false;
      }
      this.tree = tree;
      this.overlay = overlay;
      this.parser = parser;
      this.bracketed = bracketed;
    }
    MountedTree.get = function get(tree) {
      return tree && tree.props && tree.props[NodeProp.mounted.id];
    };
    return MountedTree;
  }();
  var noProps = Object.create(null);
  var NodeType = function () {
    function _NodeType(name2, props, id, flags) {
      if (flags === void 0) {
        flags = 0;
      }
      this.name = name2;
      this.props = props;
      this.id = id;
      this.flags = flags;
    }
    _NodeType.define = function define(spec) {
      var props = spec.props && spec.props.length ? Object.create(null) : noProps;
      var flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
      var type = new _NodeType(spec.name || "", props, spec.id, flags);
      if (spec.props) {
        for (var _iterator114 = _createForOfIteratorHelperLoose(spec.props), _step114; !(_step114 = _iterator114()).done;) {
          var src = _step114.value;
          if (!Array.isArray(src)) src = src(type);
          if (src) {
            if (src[0].perNode) throw new RangeError("Can't store a per-node prop on a node type");
            props[src[0].id] = src[1];
          }
        }
      }
      return type;
    };
    var _proto87 = _NodeType.prototype;
    _proto87.prop = function prop(_prop) {
      return this.props[_prop.id];
    };
    _proto87.is = function is(name2) {
      if (typeof name2 == "string") {
        if (this.name == name2) return true;
        var group = this.prop(NodeProp.group);
        return group ? group.indexOf(name2) > -1 : false;
      }
      return this.id == name2;
    };
    _NodeType.match = function match(map) {
      var direct = Object.create(null);
      for (var prop in map) {
        for (var _iterator115 = _createForOfIteratorHelperLoose(prop.split(" ")), _step115; !(_step115 = _iterator115()).done;) {
          var name2 = _step115.value;
          direct[name2] = map[prop];
        }
      }
      return function (node) {
        for (var groups = node.prop(NodeProp.group), _i48 = -1; _i48 < (groups ? groups.length : 0); _i48++) {
          var found = direct[_i48 < 0 ? node.name : groups[_i48]];
          if (found) return found;
        }
      };
    };
    return _createClass(_NodeType, [{
      key: "isTop",
      get: function get() {
        return (this.flags & 1) > 0;
      }
    }, {
      key: "isSkipped",
      get: function get() {
        return (this.flags & 2) > 0;
      }
    }, {
      key: "isError",
      get: function get() {
        return (this.flags & 4) > 0;
      }
    }, {
      key: "isAnonymous",
      get: function get() {
        return (this.flags & 8) > 0;
      }
    }]);
  }();
  NodeType.none = new NodeType("", Object.create(null), 0, 8);
  var CachedNode = new WeakMap();
  var CachedInnerNode = new WeakMap();
  var IterMode;
  (function (IterMode2) {
    IterMode2[IterMode2["ExcludeBuffers"] = 1] = "ExcludeBuffers";
    IterMode2[IterMode2["IncludeAnonymous"] = 2] = "IncludeAnonymous";
    IterMode2[IterMode2["IgnoreMounts"] = 4] = "IgnoreMounts";
    IterMode2[IterMode2["IgnoreOverlays"] = 8] = "IgnoreOverlays";
    IterMode2[IterMode2["EnterBracketed"] = 16] = "EnterBracketed";
  })(IterMode || (IterMode = {}));
  var Tree = function () {
    function _Tree(type, children, positions, length, props) {
      this.type = type;
      this.children = children;
      this.positions = positions;
      this.length = length;
      this.props = null;
      if (props && props.length) {
        this.props = Object.create(null);
        for (var _iterator116 = _createForOfIteratorHelperLoose(props), _step116; !(_step116 = _iterator116()).done;) {
          var _step116$value = _step116.value,
            prop = _step116$value[0],
            value = _step116$value[1];
          this.props[typeof prop == "number" ? prop : prop.id] = value;
        }
      }
    }
    var _proto88 = _Tree.prototype;
    _proto88.toString = function toString() {
      var mounted = MountedTree.get(this);
      if (mounted && !mounted.overlay) return mounted.tree.toString();
      var children = "";
      for (var _iterator117 = _createForOfIteratorHelperLoose(this.children), _step117; !(_step117 = _iterator117()).done;) {
        var ch = _step117.value;
        var str = ch.toString();
        if (str) {
          if (children) children += ",";
          children += str;
        }
      }
      return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
    };
    _proto88.cursor = function cursor(mode) {
      if (mode === void 0) {
        mode = 0;
      }
      return new TreeCursor(this.topNode, mode);
    };
    _proto88.cursorAt = function cursorAt(pos, side, mode) {
      if (side === void 0) {
        side = 0;
      }
      if (mode === void 0) {
        mode = 0;
      }
      var scope = CachedNode.get(this) || this.topNode;
      var cursor = new TreeCursor(scope);
      cursor.moveTo(pos, side);
      CachedNode.set(this, cursor._tree);
      return cursor;
    };
    _proto88.resolve = function resolve(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      var node = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
      CachedNode.set(this, node);
      return node;
    };
    _proto88.resolveInner = function resolveInner(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      var node = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
      CachedInnerNode.set(this, node);
      return node;
    };
    _proto88.resolveStack = function resolveStack(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      return stackIterator(this, pos, side);
    };
    _proto88.iterate = function iterate(spec) {
      var enter = spec.enter,
        leave = spec.leave,
        _spec$from = spec.from,
        from = _spec$from === void 0 ? 0 : _spec$from,
        _spec$to2 = spec.to,
        to = _spec$to2 === void 0 ? this.length : _spec$to2;
      var mode = spec.mode || 0,
        anon = (mode & IterMode.IncludeAnonymous) > 0;
      for (var c = this.cursor(mode | IterMode.IncludeAnonymous);;) {
        var entered = false;
        if (c.from <= to && c.to >= from && (!anon && c.type.isAnonymous || enter(c) !== false)) {
          if (c.firstChild()) continue;
          entered = true;
        }
        for (;;) {
          if (entered && leave && (anon || !c.type.isAnonymous)) leave(c);
          if (c.nextSibling()) break;
          if (!c.parent()) return;
          entered = true;
        }
      }
    };
    _proto88.prop = function prop(_prop2) {
      return !_prop2.perNode ? this.type.prop(_prop2) : this.props ? this.props[_prop2.id] : void 0;
    };
    _proto88.balance = function balance(config) {
      var _this62 = this;
      if (config === void 0) {
        config = {};
      }
      return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, function (children, positions, length) {
        return new _Tree(_this62.type, children, positions, length, _this62.propValues);
      }, config.makeTree || function (children, positions, length) {
        return new _Tree(NodeType.none, children, positions, length);
      });
    };
    _Tree.build = function build(data) {
      return buildTree(data);
    };
    return _createClass(_Tree, [{
      key: "topNode",
      get: function get() {
        return new TreeNode(this, 0, 0, null);
      }
    }, {
      key: "propValues",
      get: function get() {
        var result = [];
        if (this.props) for (var id in this.props) result.push([+id, this.props[id]]);
        return result;
      }
    }]);
  }();
  Tree.empty = new Tree(NodeType.none, [], [], 0);
  var FlatBufferCursor = function () {
    function _FlatBufferCursor(buffer, index) {
      this.buffer = buffer;
      this.index = index;
    }
    var _proto89 = _FlatBufferCursor.prototype;
    _proto89.next = function next() {
      this.index -= 4;
    };
    _proto89.fork = function fork() {
      return new _FlatBufferCursor(this.buffer, this.index);
    };
    return _createClass(_FlatBufferCursor, [{
      key: "id",
      get: function get() {
        return this.buffer[this.index - 4];
      }
    }, {
      key: "start",
      get: function get() {
        return this.buffer[this.index - 3];
      }
    }, {
      key: "end",
      get: function get() {
        return this.buffer[this.index - 2];
      }
    }, {
      key: "size",
      get: function get() {
        return this.buffer[this.index - 1];
      }
    }, {
      key: "pos",
      get: function get() {
        return this.index;
      }
    }]);
  }();
  var TreeBuffer = function () {
    function _TreeBuffer(buffer, length, set) {
      this.buffer = buffer;
      this.length = length;
      this.set = set;
    }
    var _proto90 = _TreeBuffer.prototype;
    _proto90.toString = function toString() {
      var result = [];
      for (var index = 0; index < this.buffer.length;) {
        result.push(this.childString(index));
        index = this.buffer[index + 3];
      }
      return result.join(",");
    };
    _proto90.childString = function childString(index) {
      var id = this.buffer[index],
        endIndex = this.buffer[index + 3];
      var type = this.set.types[id],
        result = type.name;
      if (/\W/.test(result) && !type.isError) result = JSON.stringify(result);
      index += 4;
      if (endIndex == index) return result;
      var children = [];
      while (index < endIndex) {
        children.push(this.childString(index));
        index = this.buffer[index + 3];
      }
      return result + "(" + children.join(",") + ")";
    };
    _proto90.findChild = function findChild(startIndex, endIndex, dir, pos, side) {
      var buffer = this.buffer,
        pick = -1;
      for (var _i49 = startIndex; _i49 != endIndex; _i49 = buffer[_i49 + 3]) {
        if (checkSide(side, pos, buffer[_i49 + 1], buffer[_i49 + 2])) {
          pick = _i49;
          if (dir > 0) break;
        }
      }
      return pick;
    };
    _proto90.slice = function slice(startI, endI, from) {
      var b = this.buffer;
      var copy = new Uint16Array(endI - startI),
        len = 0;
      for (var _i50 = startI, j = 0; _i50 < endI;) {
        copy[j++] = b[_i50++];
        copy[j++] = b[_i50++] - from;
        var to = copy[j++] = b[_i50++] - from;
        copy[j++] = b[_i50++] - startI;
        len = Math.max(len, to);
      }
      return new _TreeBuffer(copy, len, this.set);
    };
    return _createClass(_TreeBuffer, [{
      key: "type",
      get: function get() {
        return NodeType.none;
      }
    }]);
  }();
  function checkSide(side, pos, from, to) {
    switch (side) {
      case -2:
        return from < pos;
      case -1:
        return to >= pos && from < pos;
      case 0:
        return from < pos && to > pos;
      case 1:
        return from <= pos && to > pos;
      case 2:
        return to > pos;
      case 4:
        return true;
    }
  }
  function resolveNode(node, pos, side, overlays) {
    var _a2;
    while (node.from == node.to || (side < 1 ? node.from >= pos : node.from > pos) || (side > -1 ? node.to <= pos : node.to < pos)) {
      var parent = !overlays && node instanceof TreeNode && node.index < 0 ? null : node.parent;
      if (!parent) return node;
      node = parent;
    }
    var mode = overlays ? 0 : IterMode.IgnoreOverlays;
    if (overlays) for (var scan = node, _parent2 = scan.parent; _parent2; scan = _parent2, _parent2 = scan.parent) {
      if (scan instanceof TreeNode && scan.index < 0 && ((_a2 = _parent2.enter(pos, side, mode)) === null || _a2 === void 0 ? void 0 : _a2.from) != scan.from) node = _parent2;
    }
    for (;;) {
      var inner = node.enter(pos, side, mode);
      if (!inner) return node;
      node = inner;
    }
  }
  var BaseNode = function () {
    function BaseNode() {}
    var _proto91 = BaseNode.prototype;
    _proto91.cursor = function cursor(mode) {
      if (mode === void 0) {
        mode = 0;
      }
      return new TreeCursor(this, mode);
    };
    _proto91.getChild = function getChild(type, before, after) {
      if (before === void 0) {
        before = null;
      }
      if (after === void 0) {
        after = null;
      }
      var r = _getChildren(this, type, before, after);
      return r.length ? r[0] : null;
    };
    _proto91.getChildren = function getChildren(type, before, after) {
      if (before === void 0) {
        before = null;
      }
      if (after === void 0) {
        after = null;
      }
      return _getChildren(this, type, before, after);
    };
    _proto91.resolve = function resolve(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      return resolveNode(this, pos, side, false);
    };
    _proto91.resolveInner = function resolveInner(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      return resolveNode(this, pos, side, true);
    };
    _proto91.matchContext = function matchContext(context) {
      return matchNodeContext(this.parent, context);
    };
    _proto91.enterUnfinishedNodesBefore = function enterUnfinishedNodesBefore(pos) {
      var scan = this.childBefore(pos),
        node = this;
      while (scan) {
        var last = scan.lastChild;
        if (!last || last.to != scan.to) break;
        if (last.type.isError && last.from == last.to) {
          node = scan;
          scan = last.prevSibling;
        } else {
          scan = last;
        }
      }
      return node;
    };
    return _createClass(BaseNode, [{
      key: "node",
      get: function get() {
        return this;
      }
    }, {
      key: "next",
      get: function get() {
        return this.parent;
      }
    }]);
  }();
  var TreeNode = function (_BaseNode) {
    function _TreeNode(_tree, from, index, _parent) {
      var _this63;
      _this63 = _BaseNode.call(this) || this;
      _this63._tree = _tree;
      _this63.from = from;
      _this63.index = index;
      _this63._parent = _parent;
      return _this63;
    }
    _inheritsLoose(_TreeNode, _BaseNode);
    var _proto92 = _TreeNode.prototype;
    _proto92.nextChild = function nextChild(i2, dir, pos, side, mode) {
      if (mode === void 0) {
        mode = 0;
      }
      for (var parent = this;;) {
        for (var _parent$_tree = parent._tree, children = _parent$_tree.children, positions = _parent$_tree.positions, e = dir > 0 ? children.length : -1; i2 != e; i2 += dir) {
          var next = children[i2],
            start = positions[i2] + parent.from,
            mounted = void 0;
          if (!(mode & IterMode.EnterBracketed && next instanceof Tree && (mounted = MountedTree.get(next)) && !mounted.overlay && mounted.bracketed && pos >= start && pos <= start + next.length) && !checkSide(side, pos, start, start + next.length)) continue;
          if (next instanceof TreeBuffer) {
            if (mode & IterMode.ExcludeBuffers) continue;
            var index = next.findChild(0, next.buffer.length, dir, pos - start, side);
            if (index > -1) return new BufferNode(new BufferContext(parent, next, i2, start), null, index);
          } else if (mode & IterMode.IncludeAnonymous || !next.type.isAnonymous || hasChild(next)) {
            var mounted2 = void 0;
            if (!(mode & IterMode.IgnoreMounts) && (mounted2 = MountedTree.get(next)) && !mounted2.overlay) return new _TreeNode(mounted2.tree, start, i2, parent);
            var inner = new _TreeNode(next, start, i2, parent);
            return mode & IterMode.IncludeAnonymous || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, pos, side, mode);
          }
        }
        if (mode & IterMode.IncludeAnonymous || !parent.type.isAnonymous) return null;
        if (parent.index >= 0) i2 = parent.index + dir;else i2 = dir < 0 ? -1 : parent._parent._tree.children.length;
        parent = parent._parent;
        if (!parent) return null;
      }
    };
    _proto92.childAfter = function childAfter(pos) {
      return this.nextChild(0, 1, pos, 2);
    };
    _proto92.childBefore = function childBefore(pos) {
      return this.nextChild(this._tree.children.length - 1, -1, pos, -2);
    };
    _proto92.prop = function prop(_prop3) {
      return this._tree.prop(_prop3);
    };
    _proto92.enter = function enter(pos, side, mode) {
      if (mode === void 0) {
        mode = 0;
      }
      var mounted;
      if (!(mode & IterMode.IgnoreOverlays) && (mounted = MountedTree.get(this._tree)) && mounted.overlay) {
        var rPos = pos - this.from,
          enterBracketed = mode & IterMode.EnterBracketed && mounted.bracketed;
        for (var _iterator118 = _createForOfIteratorHelperLoose(mounted.overlay), _step118; !(_step118 = _iterator118()).done;) {
          var _step118$value = _step118.value,
            from = _step118$value.from,
            to = _step118$value.to;
          if ((side > 0 || enterBracketed ? from <= rPos : from < rPos) && (side < 0 || enterBracketed ? to >= rPos : to > rPos)) return new _TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
        }
      }
      return this.nextChild(0, 1, pos, side, mode);
    };
    _proto92.nextSignificantParent = function nextSignificantParent() {
      var val = this;
      while (val.type.isAnonymous && val._parent) val = val._parent;
      return val;
    };
    _proto92.toTree = function toTree() {
      return this._tree;
    };
    _proto92.toString = function toString() {
      return this._tree.toString();
    };
    return _createClass(_TreeNode, [{
      key: "type",
      get: function get() {
        return this._tree.type;
      }
    }, {
      key: "name",
      get: function get() {
        return this._tree.type.name;
      }
    }, {
      key: "to",
      get: function get() {
        return this.from + this._tree.length;
      }
    }, {
      key: "firstChild",
      get: function get() {
        return this.nextChild(0, 1, 0, 4);
      }
    }, {
      key: "lastChild",
      get: function get() {
        return this.nextChild(this._tree.children.length - 1, -1, 0, 4);
      }
    }, {
      key: "parent",
      get: function get() {
        return this._parent ? this._parent.nextSignificantParent() : null;
      }
    }, {
      key: "nextSibling",
      get: function get() {
        return this._parent && this.index >= 0 ? this._parent.nextChild(this.index + 1, 1, 0, 4) : null;
      }
    }, {
      key: "prevSibling",
      get: function get() {
        return this._parent && this.index >= 0 ? this._parent.nextChild(this.index - 1, -1, 0, 4) : null;
      }
    }, {
      key: "tree",
      get: function get() {
        return this._tree;
      }
    }]);
  }(BaseNode);
  function _getChildren(node, type, before, after) {
    var cur = node.cursor(),
      result = [];
    if (!cur.firstChild()) return result;
    if (before != null) for (var found = false; !found;) {
      found = cur.type.is(before);
      if (!cur.nextSibling()) return result;
    }
    for (;;) {
      if (after != null && cur.type.is(after)) return result;
      if (cur.type.is(type)) result.push(cur.node);
      if (!cur.nextSibling()) return after == null ? result : [];
    }
  }
  function matchNodeContext(node, context, i2) {
    if (i2 === void 0) {
      i2 = context.length - 1;
    }
    for (var _p2 = node; i2 >= 0; _p2 = _p2.parent) {
      if (!_p2) return false;
      if (!_p2.type.isAnonymous) {
        if (context[i2] && context[i2] != _p2.name) return false;
        i2--;
      }
    }
    return true;
  }
  var BufferContext = function BufferContext(parent, buffer, index, start) {
    this.parent = parent;
    this.buffer = buffer;
    this.index = index;
    this.start = start;
  };
  var BufferNode = function (_BaseNode2) {
    function _BufferNode(context, _parent, index) {
      var _this64;
      _this64 = _BaseNode2.call(this) || this;
      _this64.context = context;
      _this64._parent = _parent;
      _this64.index = index;
      _this64.type = context.buffer.set.types[context.buffer.buffer[index]];
      return _this64;
    }
    _inheritsLoose(_BufferNode, _BaseNode2);
    var _proto93 = _BufferNode.prototype;
    _proto93.child = function child(dir, pos, side) {
      var buffer = this.context.buffer;
      var index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
      return index < 0 ? null : new _BufferNode(this.context, this, index);
    };
    _proto93.childAfter = function childAfter(pos) {
      return this.child(1, pos, 2);
    };
    _proto93.childBefore = function childBefore(pos) {
      return this.child(-1, pos, -2);
    };
    _proto93.prop = function prop(_prop4) {
      return this.type.prop(_prop4);
    };
    _proto93.enter = function enter(pos, side, mode) {
      if (mode === void 0) {
        mode = 0;
      }
      if (mode & IterMode.ExcludeBuffers) return null;
      var buffer = this.context.buffer;
      var index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
      return index < 0 ? null : new _BufferNode(this.context, this, index);
    };
    _proto93.externalSibling = function externalSibling(dir) {
      return this._parent ? null : this.context.parent.nextChild(this.context.index + dir, dir, 0, 4);
    };
    _proto93.toTree = function toTree() {
      var children = [],
        positions = [];
      var buffer = this.context.buffer;
      var startI = this.index + 4,
        endI = buffer.buffer[this.index + 3];
      if (endI > startI) {
        var from = buffer.buffer[this.index + 1];
        children.push(buffer.slice(startI, endI, from));
        positions.push(0);
      }
      return new Tree(this.type, children, positions, this.to - this.from);
    };
    _proto93.toString = function toString() {
      return this.context.buffer.childString(this.index);
    };
    return _createClass(_BufferNode, [{
      key: "name",
      get: function get() {
        return this.type.name;
      }
    }, {
      key: "from",
      get: function get() {
        return this.context.start + this.context.buffer.buffer[this.index + 1];
      }
    }, {
      key: "to",
      get: function get() {
        return this.context.start + this.context.buffer.buffer[this.index + 2];
      }
    }, {
      key: "firstChild",
      get: function get() {
        return this.child(1, 0, 4);
      }
    }, {
      key: "lastChild",
      get: function get() {
        return this.child(-1, 0, 4);
      }
    }, {
      key: "parent",
      get: function get() {
        return this._parent || this.context.parent.nextSignificantParent();
      }
    }, {
      key: "nextSibling",
      get: function get() {
        var buffer = this.context.buffer;
        var after = buffer.buffer[this.index + 3];
        if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length)) return new _BufferNode(this.context, this._parent, after);
        return this.externalSibling(1);
      }
    }, {
      key: "prevSibling",
      get: function get() {
        var buffer = this.context.buffer;
        var parentStart = this._parent ? this._parent.index + 4 : 0;
        if (this.index == parentStart) return this.externalSibling(-1);
        return new _BufferNode(this.context, this._parent, buffer.findChild(parentStart, this.index, -1, 0, 4));
      }
    }, {
      key: "tree",
      get: function get() {
        return null;
      }
    }]);
  }(BaseNode);
  function iterStack(heads) {
    if (!heads.length) return null;
    var pick = 0,
      picked = heads[0];
    for (var _i51 = 1; _i51 < heads.length; _i51++) {
      var node = heads[_i51];
      if (node.from > picked.from || node.to < picked.to) {
        picked = node;
        pick = _i51;
      }
    }
    var next = picked instanceof TreeNode && picked.index < 0 ? null : picked.parent;
    var newHeads = heads.slice();
    if (next) newHeads[pick] = next;else newHeads.splice(pick, 1);
    return new StackIterator(newHeads, picked);
  }
  var StackIterator = function () {
    function StackIterator(heads, node) {
      this.heads = heads;
      this.node = node;
    }
    return _createClass(StackIterator, [{
      key: "next",
      get: function get() {
        return iterStack(this.heads);
      }
    }]);
  }();
  function stackIterator(tree, pos, side) {
    var inner = tree.resolveInner(pos, side),
      layers = null;
    for (var scan = inner instanceof TreeNode ? inner : inner.context.parent; scan; scan = scan.parent) {
      if (scan.index < 0) {
        var parent = scan.parent;
        (layers || (layers = [inner])).push(parent.resolve(pos, side));
        scan = parent;
      } else {
        var mount = MountedTree.get(scan.tree);
        if (mount && mount.overlay && mount.overlay[0].from <= pos && mount.overlay[mount.overlay.length - 1].to >= pos) {
          var root = new TreeNode(mount.tree, mount.overlay[0].from + scan.from, -1, scan);
          (layers || (layers = [inner])).push(resolveNode(root, pos, side, false));
        }
      }
    }
    return layers ? iterStack(layers) : inner;
  }
  var TreeCursor = function () {
    function TreeCursor(node, mode) {
      if (mode === void 0) {
        mode = 0;
      }
      this.buffer = null;
      this.stack = [];
      this.index = 0;
      this.bufferNode = null;
      this.mode = mode & ~IterMode.EnterBracketed;
      if (node instanceof TreeNode) {
        this.yieldNode(node);
      } else {
        this._tree = node.context.parent;
        this.buffer = node.context;
        for (var n = node._parent; n; n = n._parent) this.stack.unshift(n.index);
        this.bufferNode = node;
        this.yieldBuf(node.index);
      }
    }
    var _proto94 = TreeCursor.prototype;
    _proto94.yieldNode = function yieldNode(node) {
      if (!node) return false;
      this._tree = node;
      this.type = node.type;
      this.from = node.from;
      this.to = node.to;
      return true;
    };
    _proto94.yieldBuf = function yieldBuf(index, type) {
      this.index = index;
      var _this$buffer = this.buffer,
        start = _this$buffer.start,
        buffer = _this$buffer.buffer;
      this.type = type || buffer.set.types[buffer.buffer[index]];
      this.from = start + buffer.buffer[index + 1];
      this.to = start + buffer.buffer[index + 2];
      return true;
    };
    _proto94.yield = function _yield(node) {
      if (!node) return false;
      if (node instanceof TreeNode) {
        this.buffer = null;
        return this.yieldNode(node);
      }
      this.buffer = node.context;
      return this.yieldBuf(node.index, node.type);
    };
    _proto94.toString = function toString() {
      return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
    };
    _proto94.enterChild = function enterChild(dir, pos, side) {
      if (!this.buffer) return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
      var buffer = this.buffer.buffer;
      var index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
      if (index < 0) return false;
      this.stack.push(this.index);
      return this.yieldBuf(index);
    };
    _proto94.firstChild = function firstChild() {
      return this.enterChild(1, 0, 4);
    };
    _proto94.lastChild = function lastChild() {
      return this.enterChild(-1, 0, 4);
    };
    _proto94.childAfter = function childAfter(pos) {
      return this.enterChild(1, pos, 2);
    };
    _proto94.childBefore = function childBefore(pos) {
      return this.enterChild(-1, pos, -2);
    };
    _proto94.enter = function enter(pos, side, mode) {
      if (mode === void 0) {
        mode = this.mode;
      }
      if (!this.buffer) return this.yield(this._tree.enter(pos, side, mode));
      return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
    };
    _proto94.parent = function parent() {
      if (!this.buffer) return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
      if (this.stack.length) return this.yieldBuf(this.stack.pop());
      var parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
      this.buffer = null;
      return this.yieldNode(parent);
    };
    _proto94.sibling = function sibling(dir) {
      if (!this.buffer) return !this._tree._parent ? false : this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + dir, dir, 0, 4, this.mode));
      var buffer = this.buffer.buffer,
        d = this.stack.length - 1;
      if (dir < 0) {
        var parentStart = d < 0 ? 0 : this.stack[d] + 4;
        if (this.index != parentStart) return this.yieldBuf(buffer.findChild(parentStart, this.index, -1, 0, 4));
      } else {
        var after = buffer.buffer[this.index + 3];
        if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3])) return this.yieldBuf(after);
      }
      return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, 0, 4, this.mode)) : false;
    };
    _proto94.nextSibling = function nextSibling() {
      return this.sibling(1);
    };
    _proto94.prevSibling = function prevSibling() {
      return this.sibling(-1);
    };
    _proto94.atLastNode = function atLastNode(dir) {
      var index,
        parent,
        buffer = this.buffer;
      if (buffer) {
        if (dir > 0) {
          if (this.index < buffer.buffer.buffer.length) return false;
        } else {
          for (var _i52 = 0; _i52 < this.index; _i52++) if (buffer.buffer.buffer[_i52 + 3] < this.index) return false;
        }
        index = buffer.index;
        parent = buffer.parent;
      } else {
        var _this$_tree = this._tree;
        index = _this$_tree.index;
        parent = _this$_tree._parent;
      }
      for (; parent; _parent3 = parent, index = _parent3.index, parent = _parent3._parent, _parent3) {
        var _parent3;
        if (index > -1) for (var _i53 = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; _i53 != e; _i53 += dir) {
          var child = parent._tree.children[_i53];
          if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child)) return false;
        }
      }
      return true;
    };
    _proto94.move = function move(dir, enter) {
      if (enter && this.enterChild(dir, 0, 4)) return true;
      for (;;) {
        if (this.sibling(dir)) return true;
        if (this.atLastNode(dir) || !this.parent()) return false;
      }
    };
    _proto94.next = function next(enter) {
      if (enter === void 0) {
        enter = true;
      }
      return this.move(1, enter);
    };
    _proto94.prev = function prev(enter) {
      if (enter === void 0) {
        enter = true;
      }
      return this.move(-1, enter);
    };
    _proto94.moveTo = function moveTo(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos)) if (!this.parent()) break;
      while (this.enterChild(1, pos, side)) {}
      return this;
    };
    _proto94.iterate = function iterate(enter, leave) {
      for (var depth = 0;;) {
        var mustLeave = false;
        if (this.type.isAnonymous || enter(this) !== false) {
          if (this.firstChild()) {
            depth++;
            continue;
          }
          if (!this.type.isAnonymous) mustLeave = true;
        }
        for (;;) {
          if (mustLeave && leave) leave(this);
          mustLeave = this.type.isAnonymous;
          if (!depth) return;
          if (this.nextSibling()) break;
          this.parent();
          depth--;
          mustLeave = true;
        }
      }
    };
    _proto94.matchContext = function matchContext(context) {
      if (!this.buffer) return matchNodeContext(this.node.parent, context);
      var buffer = this.buffer.buffer,
        types2 = buffer.set.types;
      for (var _i54 = context.length - 1, d = this.stack.length - 1; _i54 >= 0; d--) {
        if (d < 0) return matchNodeContext(this._tree, context, _i54);
        var type = types2[buffer.buffer[this.stack[d]]];
        if (!type.isAnonymous) {
          if (context[_i54] && context[_i54] != type.name) return false;
          _i54--;
        }
      }
      return true;
    };
    return _createClass(TreeCursor, [{
      key: "name",
      get: function get() {
        return this.type.name;
      }
    }, {
      key: "node",
      get: function get() {
        if (!this.buffer) return this._tree;
        var cache = this.bufferNode,
          result = null,
          depth = 0;
        if (cache && cache.context == this.buffer) {
          scan: for (var index = this.index, d = this.stack.length; d >= 0;) {
            for (var c = cache; c; c = c._parent) if (c.index == index) {
              if (index == this.index) return c;
              result = c;
              depth = d + 1;
              break scan;
            }
            index = this.stack[--d];
          }
        }
        for (var _i55 = depth; _i55 < this.stack.length; _i55++) result = new BufferNode(this.buffer, result, this.stack[_i55]);
        return this.bufferNode = new BufferNode(this.buffer, result, this.index);
      }
    }, {
      key: "tree",
      get: function get() {
        return this.buffer ? null : this._tree._tree;
      }
    }]);
  }();
  function hasChild(tree) {
    return tree.children.some(function (ch) {
      return ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch);
    });
  }
  function buildTree(data) {
    var _a2;
    var buffer = data.buffer,
      nodeSet = data.nodeSet,
      _data$maxBufferLength = data.maxBufferLength,
      maxBufferLength = _data$maxBufferLength === void 0 ? DefaultBufferLength : _data$maxBufferLength,
      _data$reused = data.reused,
      reused = _data$reused === void 0 ? [] : _data$reused,
      _data$minRepeatType = data.minRepeatType,
      minRepeatType = _data$minRepeatType === void 0 ? nodeSet.types.length : _data$minRepeatType;
    var cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
    var types2 = nodeSet.types;
    var contextHash = 0,
      lookAhead = 0;
    function takeNode(parentStart, minPos, children2, positions2, inRepeat, depth) {
      var id = cursor.id,
        start = cursor.start,
        end = cursor.end,
        size = cursor.size;
      var lookAheadAtStart = lookAhead,
        contextAtStart = contextHash;
      if (size < 0) {
        cursor.next();
        if (size == -1) {
          var node2 = reused[id];
          children2.push(node2);
          positions2.push(start - parentStart);
          return;
        } else if (size == -3) {
          contextHash = id;
          return;
        } else if (size == -4) {
          lookAhead = id;
          return;
        } else {
          throw new RangeError("Unrecognized record size: " + size);
        }
      }
      var type = types2[id],
        node,
        buffer2;
      var startPos = start - parentStart;
      if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor.pos - minPos, inRepeat))) {
        var data2 = new Uint16Array(buffer2.size - buffer2.skip);
        var endPos = cursor.pos - buffer2.size,
          index = data2.length;
        while (cursor.pos > endPos) index = copyToBuffer(buffer2.start, data2, index);
        node = new TreeBuffer(data2, end - buffer2.start, nodeSet);
        startPos = buffer2.start - parentStart;
      } else {
        var _endPos = cursor.pos - size;
        cursor.next();
        var localChildren = [],
          localPositions = [];
        var localInRepeat = id >= minRepeatType ? id : -1;
        var lastGroup = 0,
          lastEnd = end;
        while (cursor.pos > _endPos) {
          if (localInRepeat >= 0 && cursor.id == localInRepeat && cursor.size >= 0) {
            if (cursor.end <= lastEnd - maxBufferLength) {
              makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor.end, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
              lastGroup = localChildren.length;
              lastEnd = cursor.end;
            }
            cursor.next();
          } else if (depth > 2500) {
            takeFlatNode(start, _endPos, localChildren, localPositions);
          } else {
            takeNode(start, _endPos, localChildren, localPositions, localInRepeat, depth + 1);
          }
        }
        if (localInRepeat >= 0 && lastGroup > 0 && lastGroup < localChildren.length) makeRepeatLeaf(localChildren, localPositions, start, lastGroup, start, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
        localChildren.reverse();
        localPositions.reverse();
        if (localInRepeat > -1 && lastGroup > 0) {
          var make = makeBalanced(type, contextAtStart);
          node = balanceRange(type, localChildren, localPositions, 0, localChildren.length, 0, end - start, make, make);
        } else {
          node = makeTree(type, localChildren, localPositions, end - start, lookAheadAtStart - end, contextAtStart);
        }
      }
      children2.push(node);
      positions2.push(startPos);
    }
    function takeFlatNode(parentStart, minPos, children2, positions2) {
      var nodes = [];
      var nodeCount = 0,
        stopAt = -1;
      while (cursor.pos > minPos) {
        var id = cursor.id,
          start = cursor.start,
          end = cursor.end,
          size = cursor.size;
        if (size > 4) {
          cursor.next();
        } else if (stopAt > -1 && start < stopAt) {
          break;
        } else {
          if (stopAt < 0) stopAt = end - maxBufferLength;
          nodes.push(id, start, end);
          nodeCount++;
          cursor.next();
        }
      }
      if (nodeCount) {
        var buffer2 = new Uint16Array(nodeCount * 4);
        var _start2 = nodes[nodes.length - 2];
        for (var _i56 = nodes.length - 3, j = 0; _i56 >= 0; _i56 -= 3) {
          buffer2[j++] = nodes[_i56];
          buffer2[j++] = nodes[_i56 + 1] - _start2;
          buffer2[j++] = nodes[_i56 + 2] - _start2;
          buffer2[j++] = j;
        }
        children2.push(new TreeBuffer(buffer2, nodes[2] - _start2, nodeSet));
        positions2.push(_start2 - parentStart);
      }
    }
    function makeBalanced(type, contextHash2) {
      return function (children2, positions2, length2) {
        var lookAhead2 = 0,
          lastI = children2.length - 1,
          last,
          lookAheadProp;
        if (lastI >= 0 && (last = children2[lastI]) instanceof Tree) {
          if (!lastI && last.type == type && last.length == length2) return last;
          if (lookAheadProp = last.prop(NodeProp.lookAhead)) lookAhead2 = positions2[lastI] + last.length + lookAheadProp;
        }
        return makeTree(type, children2, positions2, length2, lookAhead2, contextHash2);
      };
    }
    function makeRepeatLeaf(children2, positions2, base2, i2, from, to, type, lookAhead2, contextHash2) {
      var localChildren = [],
        localPositions = [];
      while (children2.length > i2) {
        localChildren.push(children2.pop());
        localPositions.push(positions2.pop() + base2 - from);
      }
      children2.push(makeTree(nodeSet.types[type], localChildren, localPositions, to - from, lookAhead2 - to, contextHash2));
      positions2.push(from - base2);
    }
    function makeTree(type, children2, positions2, length2, lookAhead2, contextHash2, props) {
      if (contextHash2) {
        var pair = [NodeProp.contextHash, contextHash2];
        props = props ? [pair].concat(props) : [pair];
      }
      if (lookAhead2 > 25) {
        var _pair = [NodeProp.lookAhead, lookAhead2];
        props = props ? [_pair].concat(props) : [_pair];
      }
      return new Tree(type, children2, positions2, length2, props);
    }
    function findBufferSize(maxSize, inRepeat) {
      var fork = cursor.fork();
      var size = 0,
        start = 0,
        skip = 0,
        minStart = fork.end - maxBufferLength;
      var result = {
        size: 0,
        start: 0,
        skip: 0
      };
      scan: for (var minPos = fork.pos - maxSize; fork.pos > minPos;) {
        var nodeSize2 = fork.size;
        if (fork.id == inRepeat && nodeSize2 >= 0) {
          result.size = size;
          result.start = start;
          result.skip = skip;
          skip += 4;
          size += 4;
          fork.next();
          continue;
        }
        var startPos = fork.pos - nodeSize2;
        if (nodeSize2 < 0 || startPos < minPos || fork.start < minStart) break;
        var localSkipped = fork.id >= minRepeatType ? 4 : 0;
        var nodeStart = fork.start;
        fork.next();
        while (fork.pos > startPos) {
          if (fork.size < 0) {
            if (fork.size == -3 || fork.size == -4) localSkipped += 4;else break scan;
          } else if (fork.id >= minRepeatType) {
            localSkipped += 4;
          }
          fork.next();
        }
        start = nodeStart;
        size += nodeSize2;
        skip += localSkipped;
      }
      if (inRepeat < 0 || size == maxSize) {
        result.size = size;
        result.start = start;
        result.skip = skip;
      }
      return result.size > 4 ? result : void 0;
    }
    function copyToBuffer(bufferStart, buffer2, index) {
      var id = cursor.id,
        start = cursor.start,
        end = cursor.end,
        size = cursor.size;
      cursor.next();
      if (size >= 0 && id < minRepeatType) {
        var startIndex = index;
        if (size > 4) {
          var endPos = cursor.pos - (size - 4);
          while (cursor.pos > endPos) index = copyToBuffer(bufferStart, buffer2, index);
        }
        buffer2[--index] = startIndex;
        buffer2[--index] = end - bufferStart;
        buffer2[--index] = start - bufferStart;
        buffer2[--index] = id;
      } else if (size == -3) {
        contextHash = id;
      } else if (size == -4) {
        lookAhead = id;
      }
      return index;
    }
    var children = [],
      positions = [];
    while (cursor.pos > 0) takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1, 0);
    var length = (_a2 = data.length) !== null && _a2 !== void 0 ? _a2 : children.length ? positions[0] + children[0].length : 0;
    return new Tree(types2[data.topID], children.reverse(), positions.reverse(), length);
  }
  var nodeSizeCache = new WeakMap();
  function nodeSize(balanceType, node) {
    if (!balanceType.isAnonymous || node instanceof TreeBuffer || node.type != balanceType) return 1;
    var size = nodeSizeCache.get(node);
    if (size == null) {
      size = 1;
      for (var _iterator119 = _createForOfIteratorHelperLoose(node.children), _step119; !(_step119 = _iterator119()).done;) {
        var child = _step119.value;
        if (child.type != balanceType || !(child instanceof Tree)) {
          size = 1;
          break;
        }
        size += nodeSize(balanceType, child);
      }
      nodeSizeCache.set(node, size);
    }
    return size;
  }
  function balanceRange(balanceType, children, positions, from, to, start, length, mkTop, mkTree) {
    var total = 0;
    for (var _i57 = from; _i57 < to; _i57++) total += nodeSize(balanceType, children[_i57]);
    var maxChild = Math.ceil(total * 1.5 / 8);
    var localChildren = [],
      localPositions = [];
    function divide(children2, positions2, from2, to2, offset) {
      for (var _i58 = from2; _i58 < to2;) {
        var groupFrom = _i58,
          groupStart = positions2[_i58],
          groupSize = nodeSize(balanceType, children2[_i58]);
        _i58++;
        for (; _i58 < to2; _i58++) {
          var nextSize = nodeSize(balanceType, children2[_i58]);
          if (groupSize + nextSize >= maxChild) break;
          groupSize += nextSize;
        }
        if (_i58 == groupFrom + 1) {
          if (groupSize > maxChild) {
            var only = children2[groupFrom];
            divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
            continue;
          }
          localChildren.push(children2[groupFrom]);
        } else {
          var length2 = positions2[_i58 - 1] + children2[_i58 - 1].length - groupStart;
          localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, _i58, groupStart, length2, null, mkTree));
        }
        localPositions.push(groupStart + offset - start);
      }
    }
    divide(children, positions, from, to, 0);
    return (mkTop || mkTree)(localChildren, localPositions, length);
  }
  var TreeFragment = function () {
    function _TreeFragment(from, to, tree, offset, openStart, openEnd) {
      if (openStart === void 0) {
        openStart = false;
      }
      if (openEnd === void 0) {
        openEnd = false;
      }
      this.from = from;
      this.to = to;
      this.tree = tree;
      this.offset = offset;
      this.open = (openStart ? 1 : 0) | (openEnd ? 2 : 0);
    }
    _TreeFragment.addTree = function addTree(tree, fragments, partial) {
      if (fragments === void 0) {
        fragments = [];
      }
      if (partial === void 0) {
        partial = false;
      }
      var result = [new _TreeFragment(0, tree.length, tree, 0, false, partial)];
      for (var _iterator120 = _createForOfIteratorHelperLoose(fragments), _step120; !(_step120 = _iterator120()).done;) {
        var f = _step120.value;
        if (f.to > tree.length) result.push(f);
      }
      return result;
    };
    _TreeFragment.applyChanges = function applyChanges(fragments, changes, minGap) {
      if (minGap === void 0) {
        minGap = 128;
      }
      if (!changes.length) return fragments;
      var result = [];
      var fI = 1,
        nextF = fragments.length ? fragments[0] : null;
      for (var cI = 0, pos = 0, off = 0;; cI++) {
        var nextC = cI < changes.length ? changes[cI] : null;
        var nextPos = nextC ? nextC.fromA : 1e9;
        if (nextPos - pos >= minGap) while (nextF && nextF.from < nextPos) {
          var cut = nextF;
          if (pos >= cut.from || nextPos <= cut.to || off) {
            var fFrom = Math.max(cut.from, pos) - off,
              fTo = Math.min(cut.to, nextPos) - off;
            cut = fFrom >= fTo ? null : new _TreeFragment(fFrom, fTo, cut.tree, cut.offset + off, cI > 0, !!nextC);
          }
          if (cut) result.push(cut);
          if (nextF.to > nextPos) break;
          nextF = fI < fragments.length ? fragments[fI++] : null;
        }
        if (!nextC) break;
        pos = nextC.toA;
        off = nextC.toA - nextC.toB;
      }
      return result;
    };
    return _createClass(_TreeFragment, [{
      key: "openStart",
      get: function get() {
        return (this.open & 1) > 0;
      }
    }, {
      key: "openEnd",
      get: function get() {
        return (this.open & 2) > 0;
      }
    }]);
  }();
  var Parser = function () {
    function Parser() {}
    var _proto95 = Parser.prototype;
    _proto95.startParse = function startParse(input, fragments, ranges) {
      if (typeof input == "string") input = new StringInput(input);
      ranges = !ranges ? [new Range2(0, input.length)] : ranges.length ? ranges.map(function (r) {
        return new Range2(r.from, r.to);
      }) : [new Range2(0, 0)];
      return this.createParse(input, fragments || [], ranges);
    };
    _proto95.parse = function parse(input, fragments, ranges) {
      var parse = this.startParse(input, fragments, ranges);
      for (;;) {
        var done = parse.advance();
        if (done) return done;
      }
    };
    return Parser;
  }();
  var StringInput = function () {
    function StringInput(string2) {
      this.string = string2;
    }
    var _proto96 = StringInput.prototype;
    _proto96.chunk = function chunk(from) {
      return this.string.slice(from);
    };
    _proto96.read = function read(from, to) {
      return this.string.slice(from, to);
    };
    return _createClass(StringInput, [{
      key: "length",
      get: function get() {
        return this.string.length;
      }
    }, {
      key: "lineChunks",
      get: function get() {
        return false;
      }
    }]);
  }();
  var stoppedInner = new NodeProp({
    perNode: true
  });
  var nextTagID = 0;
  var Tag = function () {
    function _Tag(name2, set, base2, modified) {
      this.name = name2;
      this.set = set;
      this.base = base2;
      this.modified = modified;
      this.id = nextTagID++;
    }
    var _proto97 = _Tag.prototype;
    _proto97.toString = function toString() {
      var name2 = this.name;
      for (var _iterator121 = _createForOfIteratorHelperLoose(this.modified), _step121; !(_step121 = _iterator121()).done;) {
        var mod = _step121.value;
        if (mod.name) name2 = mod.name + "(" + name2 + ")";
      }
      return name2;
    };
    _Tag.define = function define(nameOrParent, parent) {
      var name2 = typeof nameOrParent == "string" ? nameOrParent : "?";
      if (nameOrParent instanceof _Tag) parent = nameOrParent;
      if (parent === null || parent === void 0 ? void 0 : parent.base) throw new Error("Can not derive from a modified tag");
      var tag = new _Tag(name2, [], null, []);
      tag.set.push(tag);
      if (parent) {
        for (var _iterator122 = _createForOfIteratorHelperLoose(parent.set), _step122; !(_step122 = _iterator122()).done;) {
          var t2 = _step122.value;
          tag.set.push(t2);
        }
      }
      return tag;
    };
    _Tag.defineModifier = function defineModifier(name2) {
      var mod = new Modifier(name2);
      return function (tag) {
        if (tag.modified.indexOf(mod) > -1) return tag;
        return Modifier.get(tag.base || tag, tag.modified.concat(mod).sort(function (a, b) {
          return a.id - b.id;
        }));
      };
    };
    return _Tag;
  }();
  var nextModifierID = 0;
  var Modifier = function () {
    function _Modifier(name2) {
      this.name = name2;
      this.instances = [];
      this.id = nextModifierID++;
    }
    _Modifier.get = function get(base2, mods) {
      if (!mods.length) return base2;
      var exists = mods[0].instances.find(function (t2) {
        return t2.base == base2 && sameArray2(mods, t2.modified);
      });
      if (exists) return exists;
      var set = [],
        tag = new Tag(base2.name, set, base2, mods);
      for (var _iterator123 = _createForOfIteratorHelperLoose(mods), _step123; !(_step123 = _iterator123()).done;) {
        var m = _step123.value;
        m.instances.push(tag);
      }
      var configs = powerSet(mods);
      for (var _iterator124 = _createForOfIteratorHelperLoose(base2.set), _step124; !(_step124 = _iterator124()).done;) {
        var parent = _step124.value;
        if (!parent.modified.length) {
          for (var _iterator125 = _createForOfIteratorHelperLoose(configs), _step125; !(_step125 = _iterator125()).done;) {
            var config = _step125.value;
            set.push(_Modifier.get(parent, config));
          }
        }
      }
      return tag;
    };
    return _Modifier;
  }();
  function sameArray2(a, b) {
    return a.length == b.length && a.every(function (x, i2) {
      return x == b[i2];
    });
  }
  function powerSet(array) {
    var sets = [[]];
    for (var _i59 = 0; _i59 < array.length; _i59++) {
      for (var j = 0, e = sets.length; j < e; j++) {
        sets.push(sets[j].concat(array[_i59]));
      }
    }
    return sets.sort(function (a, b) {
      return b.length - a.length;
    });
  }
  function styleTags(spec) {
    var byName = Object.create(null);
    for (var prop in spec) {
      var tags2 = spec[prop];
      if (!Array.isArray(tags2)) tags2 = [tags2];
      for (var _iterator126 = _createForOfIteratorHelperLoose(prop.split(" ")), _step126; !(_step126 = _iterator126()).done;) {
        var part = _step126.value;
        if (part) {
          var pieces = [],
            mode = 2,
            rest = part;
          for (var pos = 0;;) {
            if (rest == "..." && pos > 0 && pos + 3 == part.length) {
              mode = 1;
              break;
            }
            var m = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(rest);
            if (!m) throw new RangeError("Invalid path: " + part);
            pieces.push(m[0] == "*" ? "" : m[0][0] == '"' ? JSON.parse(m[0]) : m[0]);
            pos += m[0].length;
            if (pos == part.length) break;
            var next = part[pos++];
            if (pos == part.length && next == "!") {
              mode = 0;
              break;
            }
            if (next != "/") throw new RangeError("Invalid path: " + part);
            rest = part.slice(pos);
          }
          var last = pieces.length - 1,
            inner = pieces[last];
          if (!inner) throw new RangeError("Invalid path: " + part);
          var rule = new Rule(tags2, mode, last > 0 ? pieces.slice(0, last) : null);
          byName[inner] = rule.sort(byName[inner]);
        }
      }
    }
    return ruleNodeProp.add(byName);
  }
  var ruleNodeProp = new NodeProp({
    combine: function combine(a, b) {
      var cur, root, take;
      while (a || b) {
        if (!a || b && a.depth >= b.depth) {
          take = b;
          b = b.next;
        } else {
          take = a;
          a = a.next;
        }
        if (cur && cur.mode == take.mode && !take.context && !cur.context) continue;
        var copy = new Rule(take.tags, take.mode, take.context);
        if (cur) cur.next = copy;else root = copy;
        cur = copy;
      }
      return root;
    }
  });
  var Rule = function () {
    function Rule(tags2, mode, context, next) {
      this.tags = tags2;
      this.mode = mode;
      this.context = context;
      this.next = next;
    }
    var _proto98 = Rule.prototype;
    _proto98.sort = function sort(other) {
      if (!other || other.depth < this.depth) {
        this.next = other;
        return this;
      }
      other.next = this.sort(other.next);
      return other;
    };
    return _createClass(Rule, [{
      key: "opaque",
      get: function get() {
        return this.mode == 0;
      }
    }, {
      key: "inherit",
      get: function get() {
        return this.mode == 1;
      }
    }, {
      key: "depth",
      get: function get() {
        return this.context ? this.context.length : 0;
      }
    }]);
  }();
  Rule.empty = new Rule([], 2, null);
  function tagHighlighter(tags2, options) {
    var map = Object.create(null);
    for (var _iterator127 = _createForOfIteratorHelperLoose(tags2), _step127; !(_step127 = _iterator127()).done;) {
      var style = _step127.value;
      if (!Array.isArray(style.tag)) map[style.tag.id] = style.class;else {
        for (var _iterator130 = _createForOfIteratorHelperLoose(style.tag), _step130; !(_step130 = _iterator130()).done;) {
          var tag = _step130.value;
          map[tag.id] = style.class;
        }
      }
    }
    var _ref10 = options || {},
      scope = _ref10.scope,
      _ref10$all = _ref10.all,
      all = _ref10$all === void 0 ? null : _ref10$all;
    return {
      style: function style(tags3) {
        var cls = all;
        for (var _iterator128 = _createForOfIteratorHelperLoose(tags3), _step128; !(_step128 = _iterator128()).done;) {
          var tag = _step128.value;
          for (var _iterator129 = _createForOfIteratorHelperLoose(tag.set), _step129; !(_step129 = _iterator129()).done;) {
            var sub = _step129.value;
            var tagClass = map[sub.id];
            if (tagClass) {
              cls = cls ? cls + " " + tagClass : tagClass;
              break;
            }
          }
        }
        return cls;
      },
      scope: scope
    };
  }
  var t = Tag.define;
  var comment = t();
  var name = t();
  var typeName = t(name);
  var propertyName = t(name);
  var literal = t();
  var string = t(literal);
  var number = t(literal);
  var content = t();
  var heading = t(content);
  var keyword = t();
  var operator = t();
  var punctuation = t();
  var bracket = t(punctuation);
  var meta = t();
  var tags = {
    comment: comment,
    lineComment: t(comment),
    blockComment: t(comment),
    docComment: t(comment),
    name: name,
    variableName: t(name),
    typeName: typeName,
    tagName: t(typeName),
    propertyName: propertyName,
    attributeName: t(propertyName),
    className: t(name),
    labelName: t(name),
    namespace: t(name),
    macroName: t(name),
    literal: literal,
    string: string,
    docString: t(string),
    character: t(string),
    attributeValue: t(string),
    number: number,
    integer: t(number),
    float: t(number),
    bool: t(literal),
    regexp: t(literal),
    escape: t(literal),
    color: t(literal),
    url: t(literal),
    keyword: keyword,
    self: t(keyword),
    null: t(keyword),
    atom: t(keyword),
    unit: t(keyword),
    modifier: t(keyword),
    operatorKeyword: t(keyword),
    controlKeyword: t(keyword),
    definitionKeyword: t(keyword),
    moduleKeyword: t(keyword),
    operator: operator,
    derefOperator: t(operator),
    arithmeticOperator: t(operator),
    logicOperator: t(operator),
    bitwiseOperator: t(operator),
    compareOperator: t(operator),
    updateOperator: t(operator),
    definitionOperator: t(operator),
    typeOperator: t(operator),
    controlOperator: t(operator),
    punctuation: punctuation,
    separator: t(punctuation),
    bracket: bracket,
    angleBracket: t(bracket),
    squareBracket: t(bracket),
    paren: t(bracket),
    brace: t(bracket),
    content: content,
    heading: heading,
    heading1: t(heading),
    heading2: t(heading),
    heading3: t(heading),
    heading4: t(heading),
    heading5: t(heading),
    heading6: t(heading),
    contentSeparator: t(content),
    list: t(content),
    quote: t(content),
    emphasis: t(content),
    strong: t(content),
    link: t(content),
    monospace: t(content),
    strikethrough: t(content),
    inserted: t(),
    deleted: t(),
    changed: t(),
    invalid: t(),
    meta: meta,
    documentMeta: t(meta),
    annotation: t(meta),
    processingInstruction: t(meta),
    definition: Tag.defineModifier("definition"),
    constant: Tag.defineModifier("constant"),
    function: Tag.defineModifier("function"),
    standard: Tag.defineModifier("standard"),
    local: Tag.defineModifier("local"),
    special: Tag.defineModifier("special")
  };
  for (var name2 in tags) {
    var val = tags[name2];
    if (val instanceof Tag) val.name = name2;
  }
  var classHighlighter = tagHighlighter([{
    tag: tags.link,
    class: "tok-link"
  }, {
    tag: tags.heading,
    class: "tok-heading"
  }, {
    tag: tags.emphasis,
    class: "tok-emphasis"
  }, {
    tag: tags.strong,
    class: "tok-strong"
  }, {
    tag: tags.keyword,
    class: "tok-keyword"
  }, {
    tag: tags.atom,
    class: "tok-atom"
  }, {
    tag: tags.bool,
    class: "tok-bool"
  }, {
    tag: tags.url,
    class: "tok-url"
  }, {
    tag: tags.labelName,
    class: "tok-labelName"
  }, {
    tag: tags.inserted,
    class: "tok-inserted"
  }, {
    tag: tags.deleted,
    class: "tok-deleted"
  }, {
    tag: tags.literal,
    class: "tok-literal"
  }, {
    tag: tags.string,
    class: "tok-string"
  }, {
    tag: tags.number,
    class: "tok-number"
  }, {
    tag: [tags.regexp, tags.escape, tags.special(tags.string)],
    class: "tok-string2"
  }, {
    tag: tags.variableName,
    class: "tok-variableName"
  }, {
    tag: tags.local(tags.variableName),
    class: "tok-variableName tok-local"
  }, {
    tag: tags.definition(tags.variableName),
    class: "tok-variableName tok-definition"
  }, {
    tag: tags.special(tags.variableName),
    class: "tok-variableName2"
  }, {
    tag: tags.definition(tags.propertyName),
    class: "tok-propertyName tok-definition"
  }, {
    tag: tags.typeName,
    class: "tok-typeName"
  }, {
    tag: tags.namespace,
    class: "tok-namespace"
  }, {
    tag: tags.className,
    class: "tok-className"
  }, {
    tag: tags.macroName,
    class: "tok-macroName"
  }, {
    tag: tags.propertyName,
    class: "tok-propertyName"
  }, {
    tag: tags.operator,
    class: "tok-operator"
  }, {
    tag: tags.comment,
    class: "tok-comment"
  }, {
    tag: tags.meta,
    class: "tok-meta"
  }, {
    tag: tags.invalid,
    class: "tok-invalid"
  }, {
    tag: tags.punctuation,
    class: "tok-punctuation"
  }]);
  var _a;
  var languageDataProp = new NodeProp();
  var sublanguageProp = new NodeProp();
  var Language = function () {
    function Language(data, parser, extraExtensions, name2) {
      if (extraExtensions === void 0) {
        extraExtensions = [];
      }
      if (name2 === void 0) {
        name2 = "";
      }
      this.data = data;
      this.name = name2;
      if (!EditorState.prototype.hasOwnProperty("tree")) Object.defineProperty(EditorState.prototype, "tree", {
        get: function get() {
          return syntaxTree(this);
        }
      });
      this.parser = parser;
      this.extension = [language.of(this), EditorState.languageData.of(function (state, pos, side) {
        var top2 = topNodeAt(state, pos, side),
          data2 = top2.type.prop(languageDataProp);
        if (!data2) return [];
        var base2 = state.facet(data2),
          sub = top2.type.prop(sublanguageProp);
        if (sub) {
          var innerNode = top2.resolve(pos - top2.from, side);
          for (var _iterator131 = _createForOfIteratorHelperLoose(sub), _step131; !(_step131 = _iterator131()).done;) {
            var sublang = _step131.value;
            if (sublang.test(innerNode, state)) {
              var data3 = state.facet(sublang.facet);
              return sublang.type == "replace" ? data3 : data3.concat(base2);
            }
          }
        }
        return base2;
      })].concat(extraExtensions);
    }
    var _proto99 = Language.prototype;
    _proto99.isActiveAt = function isActiveAt(state, pos, side) {
      if (side === void 0) {
        side = -1;
      }
      return topNodeAt(state, pos, side).type.prop(languageDataProp) == this.data;
    };
    _proto99.findRegions = function findRegions(state) {
      var _this65 = this;
      var lang = state.facet(language);
      if ((lang === null || lang === void 0 ? void 0 : lang.data) == this.data) return [{
        from: 0,
        to: state.doc.length
      }];
      if (!lang || !lang.allowsNesting) return [];
      var result = [];
      var _explore = function explore(tree, from) {
        if (tree.prop(languageDataProp) == _this65.data) {
          result.push({
            from: from,
            to: from + tree.length
          });
          return;
        }
        var mount = tree.prop(NodeProp.mounted);
        if (mount) {
          if (mount.tree.prop(languageDataProp) == _this65.data) {
            if (mount.overlay) {
              for (var _iterator132 = _createForOfIteratorHelperLoose(mount.overlay), _step132; !(_step132 = _iterator132()).done;) {
                var _r2 = _step132.value;
                result.push({
                  from: _r2.from + from,
                  to: _r2.to + from
                });
              }
            } else result.push({
              from: from,
              to: from + tree.length
            });
            return;
          } else if (mount.overlay) {
            var size = result.length;
            _explore(mount.tree, mount.overlay[0].from + from);
            if (result.length > size) return;
          }
        }
        for (var _i60 = 0; _i60 < tree.children.length; _i60++) {
          var ch = tree.children[_i60];
          if (ch instanceof Tree) _explore(ch, tree.positions[_i60] + from);
        }
      };
      _explore(syntaxTree(state), 0);
      return result;
    };
    return _createClass(Language, [{
      key: "allowsNesting",
      get: function get() {
        return true;
      }
    }]);
  }();
  Language.setState = StateEffect.define();
  function topNodeAt(state, pos, side) {
    var topLang = state.facet(language),
      tree = syntaxTree(state).topNode;
    if (!topLang || topLang.allowsNesting) {
      for (var node = tree; node; node = node.enter(pos, side, IterMode.ExcludeBuffers | IterMode.EnterBracketed)) if (node.type.isTop) tree = node;
    }
    return tree;
  }
  function syntaxTree(state) {
    var field = state.field(Language.state, false);
    return field ? field.tree : Tree.empty;
  }
  var DocInput = function () {
    function DocInput(doc2) {
      this.doc = doc2;
      this.cursorPos = 0;
      this.string = "";
      this.cursor = doc2.iter();
    }
    var _proto100 = DocInput.prototype;
    _proto100.syncTo = function syncTo(pos) {
      this.string = this.cursor.next(pos - this.cursorPos).value;
      this.cursorPos = pos + this.string.length;
      return this.cursorPos - this.string.length;
    };
    _proto100.chunk = function chunk(pos) {
      this.syncTo(pos);
      return this.string;
    };
    _proto100.read = function read(from, to) {
      var stringStart = this.cursorPos - this.string.length;
      if (from < stringStart || to >= this.cursorPos) return this.doc.sliceString(from, to);else return this.string.slice(from - stringStart, to - stringStart);
    };
    return _createClass(DocInput, [{
      key: "length",
      get: function get() {
        return this.doc.length;
      }
    }, {
      key: "lineChunks",
      get: function get() {
        return true;
      }
    }]);
  }();
  var currentContext = null;
  var ParseContext = function () {
    function _ParseContext(parser, state, fragments, tree, treeLen, viewport, skipped, scheduleOn) {
      if (fragments === void 0) {
        fragments = [];
      }
      this.parser = parser;
      this.state = state;
      this.fragments = fragments;
      this.tree = tree;
      this.treeLen = treeLen;
      this.viewport = viewport;
      this.skipped = skipped;
      this.scheduleOn = scheduleOn;
      this.parse = null;
      this.tempSkipped = [];
    }
    _ParseContext.create = function create(parser, state, viewport) {
      return new _ParseContext(parser, state, [], Tree.empty, 0, viewport, [], null);
    };
    var _proto101 = _ParseContext.prototype;
    _proto101.startParse = function startParse() {
      return this.parser.startParse(new DocInput(this.state.doc), this.fragments);
    };
    _proto101.work = function work(until, upto) {
      var _this66 = this;
      if (upto != null && upto >= this.state.doc.length) upto = void 0;
      if (this.tree != Tree.empty && this.isDone(upto !== null && upto !== void 0 ? upto : this.state.doc.length)) {
        this.takeTree();
        return true;
      }
      return this.withContext(function () {
        var _a2;
        if (typeof until == "number") {
          var endTime = Date.now() + until;
          until = function until() {
            return Date.now() > endTime;
          };
        }
        if (!_this66.parse) _this66.parse = _this66.startParse();
        if (upto != null && (_this66.parse.stoppedAt == null || _this66.parse.stoppedAt > upto) && upto < _this66.state.doc.length) _this66.parse.stopAt(upto);
        for (;;) {
          var done = _this66.parse.advance();
          if (done) {
            _this66.fragments = _this66.withoutTempSkipped(TreeFragment.addTree(done, _this66.fragments, _this66.parse.stoppedAt != null));
            _this66.treeLen = (_a2 = _this66.parse.stoppedAt) !== null && _a2 !== void 0 ? _a2 : _this66.state.doc.length;
            _this66.tree = done;
            _this66.parse = null;
            if (_this66.treeLen < (upto !== null && upto !== void 0 ? upto : _this66.state.doc.length)) _this66.parse = _this66.startParse();else return true;
          }
          if (until()) return false;
        }
      });
    };
    _proto101.takeTree = function takeTree() {
      var _this67 = this;
      var pos, tree;
      if (this.parse && (pos = this.parse.parsedPos) >= this.treeLen) {
        if (this.parse.stoppedAt == null || this.parse.stoppedAt > pos) this.parse.stopAt(pos);
        this.withContext(function () {
          while (!(tree = _this67.parse.advance())) {}
        });
        this.treeLen = pos;
        this.tree = tree;
        this.fragments = this.withoutTempSkipped(TreeFragment.addTree(this.tree, this.fragments, true));
        this.parse = null;
      }
    };
    _proto101.withContext = function withContext(f) {
      var prev = currentContext;
      currentContext = this;
      try {
        return f();
      } finally {
        currentContext = prev;
      }
    };
    _proto101.withoutTempSkipped = function withoutTempSkipped(fragments) {
      for (var _r3; _r3 = this.tempSkipped.pop();) fragments = cutFragments(fragments, _r3.from, _r3.to);
      return fragments;
    };
    _proto101.changes = function changes(_changes, newState) {
      var fragments = this.fragments,
        tree = this.tree,
        treeLen = this.treeLen,
        viewport = this.viewport,
        skipped = this.skipped;
      this.takeTree();
      if (!_changes.empty) {
        var ranges = [];
        _changes.iterChangedRanges(function (fromA, toA, fromB, toB) {
          return ranges.push({
            fromA: fromA,
            toA: toA,
            fromB: fromB,
            toB: toB
          });
        });
        fragments = TreeFragment.applyChanges(fragments, ranges);
        tree = Tree.empty;
        treeLen = 0;
        viewport = {
          from: _changes.mapPos(viewport.from, -1),
          to: _changes.mapPos(viewport.to, 1)
        };
        if (this.skipped.length) {
          skipped = [];
          for (var _iterator133 = _createForOfIteratorHelperLoose(this.skipped), _step133; !(_step133 = _iterator133()).done;) {
            var _r4 = _step133.value;
            var from = _changes.mapPos(_r4.from, 1),
              to = _changes.mapPos(_r4.to, -1);
            if (from < to) skipped.push({
              from: from,
              to: to
            });
          }
        }
      }
      return new _ParseContext(this.parser, newState, fragments, tree, treeLen, viewport, skipped, this.scheduleOn);
    };
    _proto101.updateViewport = function updateViewport(viewport) {
      if (this.viewport.from == viewport.from && this.viewport.to == viewport.to) return false;
      this.viewport = viewport;
      var startLen = this.skipped.length;
      for (var _i61 = 0; _i61 < this.skipped.length; _i61++) {
        var _this$skipped$_i = this.skipped[_i61],
          from = _this$skipped$_i.from,
          to = _this$skipped$_i.to;
        if (from < viewport.to && to > viewport.from) {
          this.fragments = cutFragments(this.fragments, from, to);
          this.skipped.splice(_i61--, 1);
        }
      }
      if (this.skipped.length >= startLen) return false;
      this.reset();
      return true;
    };
    _proto101.reset = function reset() {
      if (this.parse) {
        this.takeTree();
        this.parse = null;
      }
    };
    _proto101.skipUntilInView = function skipUntilInView(from, to) {
      this.skipped.push({
        from: from,
        to: to
      });
    };
    _ParseContext.getSkippingParser = function getSkippingParser(until) {
      return new (function (_Parser) {
        function _class3() {
          return _Parser.apply(this, arguments) || this;
        }
        _inheritsLoose(_class3, _Parser);
        var _proto102 = _class3.prototype;
        _proto102.createParse = function createParse(input, fragments, ranges) {
          var from = ranges[0].from,
            to = ranges[ranges.length - 1].to;
          var parser = {
            parsedPos: from,
            advance: function advance() {
              var cx = currentContext;
              if (cx) {
                for (var _iterator134 = _createForOfIteratorHelperLoose(ranges), _step134; !(_step134 = _iterator134()).done;) {
                  var _r5 = _step134.value;
                  cx.tempSkipped.push(_r5);
                }
                if (until) cx.scheduleOn = cx.scheduleOn ? Promise.all([cx.scheduleOn, until]) : until;
              }
              this.parsedPos = to;
              return new Tree(NodeType.none, [], [], to - from);
            },
            stoppedAt: null,
            stopAt: function stopAt() {}
          };
          return parser;
        };
        return _class3;
      }(Parser))();
    };
    _proto101.isDone = function isDone(upto) {
      upto = Math.min(upto, this.state.doc.length);
      var frags = this.fragments;
      return this.treeLen >= upto && frags.length && frags[0].from == 0 && frags[0].to >= upto;
    };
    _ParseContext.get = function get() {
      return currentContext;
    };
    return _ParseContext;
  }();
  function cutFragments(fragments, from, to) {
    return TreeFragment.applyChanges(fragments, [{
      fromA: from,
      toA: to,
      fromB: from,
      toB: to
    }]);
  }
  var LanguageState = function () {
    function _LanguageState(context) {
      this.context = context;
      this.tree = context.tree;
    }
    var _proto103 = _LanguageState.prototype;
    _proto103.apply = function apply(tr) {
      if (!tr.docChanged && this.tree == this.context.tree) return this;
      var newCx = this.context.changes(tr.changes, tr.state);
      var upto = this.context.treeLen == tr.startState.doc.length ? void 0 : Math.max(tr.changes.mapPos(this.context.treeLen), newCx.viewport.to);
      if (!newCx.work(20, upto)) newCx.takeTree();
      return new _LanguageState(newCx);
    };
    _LanguageState.init = function init(state) {
      var vpTo = Math.min(3e3, state.doc.length);
      var parseState = ParseContext.create(state.facet(language).parser, state, {
        from: 0,
        to: vpTo
      });
      if (!parseState.work(20, vpTo)) parseState.takeTree();
      return new _LanguageState(parseState);
    };
    return _LanguageState;
  }();
  Language.state = StateField.define({
    create: LanguageState.init,
    update: function update(value, tr) {
      for (var _iterator135 = _createForOfIteratorHelperLoose(tr.effects), _step135; !(_step135 = _iterator135()).done;) {
        var e = _step135.value;
        if (e.is(Language.setState)) return e.value;
      }
      if (tr.startState.facet(language) != tr.state.facet(language)) return LanguageState.init(tr.state);
      return value.apply(tr);
    }
  });
  var requestIdle = function requestIdle(callback) {
    var timeout = setTimeout(function () {
      return callback();
    }, 500);
    return function () {
      return clearTimeout(timeout);
    };
  };
  if (typeof requestIdleCallback != "undefined") requestIdle = function requestIdle(callback) {
    var idle = -1,
      timeout = setTimeout(function () {
        idle = requestIdleCallback(callback, {
          timeout: 500 - 100
        });
      }, 100);
    return function () {
      return idle < 0 ? clearTimeout(timeout) : cancelIdleCallback(idle);
    };
  };
  var isInputPending = typeof navigator != "undefined" && ((_a = navigator.scheduling) === null || _a === void 0 ? void 0 : _a.isInputPending) ? function () {
    return navigator.scheduling.isInputPending();
  } : null;
  var parseWorker = ViewPlugin.fromClass(function () {
    function ParseWorker(view) {
      this.view = view;
      this.working = null;
      this.workScheduled = 0;
      this.chunkEnd = -1;
      this.chunkBudget = -1;
      this.work = this.work.bind(this);
      this.scheduleWork();
    }
    var _proto104 = ParseWorker.prototype;
    _proto104.update = function update(_update1) {
      var cx = this.view.state.field(Language.state).context;
      if (cx.updateViewport(_update1.view.viewport) || this.view.viewport.to > cx.treeLen) this.scheduleWork();
      if (_update1.docChanged || _update1.selectionSet) {
        if (this.view.hasFocus) this.chunkBudget += 50;
        this.scheduleWork();
      }
      this.checkAsyncSchedule(cx);
    };
    _proto104.scheduleWork = function scheduleWork() {
      if (this.working) return;
      var state = this.view.state,
        field = state.field(Language.state);
      if (field.tree != field.context.tree || !field.context.isDone(state.doc.length)) this.working = requestIdle(this.work);
    };
    _proto104.work = function work(deadline) {
      this.working = null;
      var now = Date.now();
      if (this.chunkEnd < now && (this.chunkEnd < 0 || this.view.hasFocus)) {
        this.chunkEnd = now + 3e4;
        this.chunkBudget = 3e3;
      }
      if (this.chunkBudget <= 0) return;
      var _this$view = this.view,
        state = _this$view.state,
        vpTo = _this$view.viewport.to,
        field = state.field(Language.state);
      if (field.tree == field.context.tree && field.context.isDone(vpTo + 1e5)) return;
      var endTime = Date.now() + Math.min(this.chunkBudget, 100, deadline && !isInputPending ? Math.max(25, deadline.timeRemaining() - 5) : 1e9);
      var viewportFirst = field.context.treeLen < vpTo && state.doc.length > vpTo + 1e3;
      var done = field.context.work(function () {
        return isInputPending && isInputPending() || Date.now() > endTime;
      }, vpTo + (viewportFirst ? 0 : 1e5));
      this.chunkBudget -= Date.now() - now;
      if (done || this.chunkBudget <= 0) {
        field.context.takeTree();
        this.view.dispatch({
          effects: Language.setState.of(new LanguageState(field.context))
        });
      }
      if (this.chunkBudget > 0 && !(done && !viewportFirst)) this.scheduleWork();
      this.checkAsyncSchedule(field.context);
    };
    _proto104.checkAsyncSchedule = function checkAsyncSchedule(cx) {
      var _this68 = this;
      if (cx.scheduleOn) {
        this.workScheduled++;
        cx.scheduleOn.then(function () {
          return _this68.scheduleWork();
        }).catch(function (err) {
          return logException(_this68.view.state, err);
        }).then(function () {
          return _this68.workScheduled--;
        });
        cx.scheduleOn = null;
      }
    };
    _proto104.destroy = function destroy() {
      if (this.working) this.working();
    };
    _proto104.isWorking = function isWorking() {
      return !!(this.working || this.workScheduled > 0);
    };
    return ParseWorker;
  }(), {
    eventHandlers: {
      focus: function focus() {
        this.scheduleWork();
      }
    }
  });
  var language = Facet.define({
    combine: function combine(languages) {
      return languages.length ? languages[0] : null;
    },
    enables: function enables(language2) {
      return [Language.state, parseWorker, EditorView.contentAttributes.compute([language2], function (state) {
        var lang = state.facet(language2);
        return lang && lang.name ? {
          "data-language": lang.name
        } : {};
      })];
    }
  });
  var indentService = Facet.define();
  var indentUnit = Facet.define({
    combine: function combine(values) {
      if (!values.length) return "  ";
      var unit = values[0];
      if (!unit || /\S/.test(unit) || Array.from(unit).some(function (e) {
        return e != unit[0];
      })) throw new Error("Invalid indent unit: " + JSON.stringify(values[0]));
      return unit;
    }
  });
  function getIndentUnit(state) {
    var unit = state.facet(indentUnit);
    return unit.charCodeAt(0) == 9 ? state.tabSize * unit.length : unit.length;
  }
  function indentString(state, cols) {
    var result = "",
      ts = state.tabSize,
      ch = state.facet(indentUnit)[0];
    if (ch == "	") {
      while (cols >= ts) {
        result += "	";
        cols -= ts;
      }
      ch = " ";
    }
    for (var _i62 = 0; _i62 < cols; _i62++) result += ch;
    return result;
  }
  function getIndentation(context, pos) {
    if (context instanceof EditorState) context = new IndentContext(context);
    for (var _iterator136 = _createForOfIteratorHelperLoose(context.state.facet(indentService)), _step136; !(_step136 = _iterator136()).done;) {
      var service = _step136.value;
      var result = service(context, pos);
      if (result !== void 0) return result;
    }
    var tree = syntaxTree(context.state);
    return tree.length >= pos ? syntaxIndentation(context, tree, pos) : null;
  }
  var IndentContext = function () {
    function IndentContext(state, options) {
      if (options === void 0) {
        options = {};
      }
      this.state = state;
      this.options = options;
      this.unit = getIndentUnit(state);
    }
    var _proto105 = IndentContext.prototype;
    _proto105.lineAt = function lineAt(pos, bias) {
      if (bias === void 0) {
        bias = 1;
      }
      var line = this.state.doc.lineAt(pos);
      var _this$options = this.options,
        simulateBreak = _this$options.simulateBreak,
        simulateDoubleBreak = _this$options.simulateDoubleBreak;
      if (simulateBreak != null && simulateBreak >= line.from && simulateBreak <= line.to) {
        if (simulateDoubleBreak && simulateBreak == pos) return {
          text: "",
          from: pos
        };else if (bias < 0 ? simulateBreak < pos : simulateBreak <= pos) return {
          text: line.text.slice(simulateBreak - line.from),
          from: simulateBreak
        };else return {
          text: line.text.slice(0, simulateBreak - line.from),
          from: line.from
        };
      }
      return line;
    };
    _proto105.textAfterPos = function textAfterPos(pos, bias) {
      if (bias === void 0) {
        bias = 1;
      }
      if (this.options.simulateDoubleBreak && pos == this.options.simulateBreak) return "";
      var _this$lineAt = this.lineAt(pos, bias),
        text = _this$lineAt.text,
        from = _this$lineAt.from;
      return text.slice(pos - from, Math.min(text.length, pos + 100 - from));
    };
    _proto105.column = function column(pos, bias) {
      if (bias === void 0) {
        bias = 1;
      }
      var _this$lineAt2 = this.lineAt(pos, bias),
        text = _this$lineAt2.text,
        from = _this$lineAt2.from;
      var result = this.countColumn(text, pos - from);
      var override = this.options.overrideIndentation ? this.options.overrideIndentation(from) : -1;
      if (override > -1) result += override - this.countColumn(text, text.search(/\S|$/));
      return result;
    };
    _proto105.countColumn = function countColumn(line, pos) {
      if (pos === void 0) {
        pos = line.length;
      }
      return _countColumn(line, this.state.tabSize, pos);
    };
    _proto105.lineIndent = function lineIndent(pos, bias) {
      if (bias === void 0) {
        bias = 1;
      }
      var _this$lineAt3 = this.lineAt(pos, bias),
        text = _this$lineAt3.text,
        from = _this$lineAt3.from;
      var override = this.options.overrideIndentation;
      if (override) {
        var overriden = override(from);
        if (overriden > -1) return overriden;
      }
      return this.countColumn(text, text.search(/\S|$/));
    };
    return _createClass(IndentContext, [{
      key: "simulatedBreak",
      get: function get() {
        return this.options.simulateBreak || null;
      }
    }]);
  }();
  var indentNodeProp = new NodeProp();
  function syntaxIndentation(cx, ast, pos) {
    var stack = ast.resolveStack(pos);
    var inner = ast.resolveInner(pos, -1).resolve(pos, 0).enterUnfinishedNodesBefore(pos);
    if (inner != stack.node) {
      var add2 = [];
      for (var cur = inner; cur && !(cur.from < stack.node.from || cur.to > stack.node.to || cur.from == stack.node.from && cur.type == stack.node.type); cur = cur.parent) add2.push(cur);
      for (var _i63 = add2.length - 1; _i63 >= 0; _i63--) stack = {
        node: add2[_i63],
        next: stack
      };
    }
    return indentFor(stack, cx, pos);
  }
  function indentFor(stack, cx, pos) {
    for (var cur = stack; cur; cur = cur.next) {
      var strategy = indentStrategy(cur.node);
      if (strategy) return strategy(TreeIndentContext.create(cx, pos, cur));
    }
    return 0;
  }
  function ignoreClosed(cx) {
    return cx.pos == cx.options.simulateBreak && cx.options.simulateDoubleBreak;
  }
  function indentStrategy(tree) {
    var strategy = tree.type.prop(indentNodeProp);
    if (strategy) return strategy;
    var first = tree.firstChild,
      close;
    if (first && (close = first.type.prop(NodeProp.closedBy))) {
      var last = tree.lastChild,
        closed = last && close.indexOf(last.name) > -1;
      return function (cx) {
        return delimitedStrategy(cx, true, 1, void 0, closed && !ignoreClosed(cx) ? last.from : void 0);
      };
    }
    return tree.parent == null ? topIndent : null;
  }
  function topIndent() {
    return 0;
  }
  var TreeIndentContext = function (_IndentContext) {
    function _TreeIndentContext(base2, pos, context) {
      var _this69;
      _this69 = _IndentContext.call(this, base2.state, base2.options) || this;
      _this69.base = base2;
      _this69.pos = pos;
      _this69.context = context;
      return _this69;
    }
    _inheritsLoose(_TreeIndentContext, _IndentContext);
    _TreeIndentContext.create = function create(base2, pos, context) {
      return new _TreeIndentContext(base2, pos, context);
    };
    var _proto106 = _TreeIndentContext.prototype;
    _proto106.baseIndentFor = function baseIndentFor(node) {
      var line = this.state.doc.lineAt(node.from);
      for (;;) {
        var atBreak = node.resolve(line.from);
        while (atBreak.parent && atBreak.parent.from == atBreak.from) atBreak = atBreak.parent;
        if (isParent(atBreak, node)) break;
        line = this.state.doc.lineAt(atBreak.from);
      }
      return this.lineIndent(line.from);
    };
    _proto106.continue = function _continue() {
      return indentFor(this.context.next, this.base, this.pos);
    };
    return _createClass(_TreeIndentContext, [{
      key: "node",
      get: function get() {
        return this.context.node;
      }
    }, {
      key: "textAfter",
      get: function get() {
        return this.textAfterPos(this.pos);
      }
    }, {
      key: "baseIndent",
      get: function get() {
        return this.baseIndentFor(this.node);
      }
    }]);
  }(IndentContext);
  function isParent(parent, of) {
    for (var cur = of; cur; cur = cur.parent) if (parent == cur) return true;
    return false;
  }
  function bracketedAligned(context) {
    var tree = context.node;
    var openToken = tree.childAfter(tree.from),
      last = tree.lastChild;
    if (!openToken) return null;
    var sim = context.options.simulateBreak;
    var openLine = context.state.doc.lineAt(openToken.from);
    var lineEnd2 = sim == null || sim <= openLine.from ? openLine.to : Math.min(openLine.to, sim);
    for (var pos = openToken.to;;) {
      var next = tree.childAfter(pos);
      if (!next || next == last) return null;
      if (!next.type.isSkipped) {
        if (next.from >= lineEnd2) return null;
        var space = /^ */.exec(openLine.text.slice(openToken.to - openLine.from))[0].length;
        return {
          from: openToken.from,
          to: openToken.to + space
        };
      }
      pos = next.to;
    }
  }
  function delimitedStrategy(context, align, units, closing, closedAt) {
    var after = context.textAfter,
      space = after.match(/^\s*/)[0].length;
    var closed = closing && after.slice(space, space + closing.length) == closing || closedAt == context.pos + space;
    var aligned = align ? bracketedAligned(context) : null;
    if (aligned) return closed ? context.column(aligned.from) : context.column(aligned.to);
    return context.baseIndent + (closed ? 0 : context.unit * units);
  }
  var HighlightStyle = function () {
    function _HighlightStyle(specs, options) {
      this.specs = specs;
      var modSpec;
      function def(spec) {
        var cls = StyleModule.newName();
        (modSpec || (modSpec = Object.create(null)))["." + cls] = spec;
        return cls;
      }
      var all = typeof options.all == "string" ? options.all : options.all ? def(options.all) : void 0;
      var scopeOpt = options.scope;
      this.scope = scopeOpt instanceof Language ? function (type) {
        return type.prop(languageDataProp) == scopeOpt.data;
      } : scopeOpt ? function (type) {
        return type == scopeOpt;
      } : void 0;
      this.style = tagHighlighter(specs.map(function (style) {
        return {
          tag: style.tag,
          class: style.class || def(Object.assign({}, style, {
            tag: null
          }))
        };
      }), {
        all: all
      }).style;
      this.module = modSpec ? new StyleModule(modSpec) : null;
      this.themeType = options.themeType;
    }
    _HighlightStyle.define = function define(specs, options) {
      return new _HighlightStyle(specs, options || {});
    };
    return _HighlightStyle;
  }();
  var defaultHighlightStyle = HighlightStyle.define([{
    tag: tags.meta,
    color: "#404740"
  }, {
    tag: tags.link,
    textDecoration: "underline"
  }, {
    tag: tags.heading,
    textDecoration: "underline",
    fontWeight: "bold"
  }, {
    tag: tags.emphasis,
    fontStyle: "italic"
  }, {
    tag: tags.strong,
    fontWeight: "bold"
  }, {
    tag: tags.strikethrough,
    textDecoration: "line-through"
  }, {
    tag: tags.keyword,
    color: "#708"
  }, {
    tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName],
    color: "#219"
  }, {
    tag: [tags.literal, tags.inserted],
    color: "#164"
  }, {
    tag: [tags.string, tags.deleted],
    color: "#a11"
  }, {
    tag: [tags.regexp, tags.escape, tags.special(tags.string)],
    color: "#e40"
  }, {
    tag: tags.definition(tags.variableName),
    color: "#00f"
  }, {
    tag: tags.local(tags.variableName),
    color: "#30a"
  }, {
    tag: [tags.typeName, tags.namespace],
    color: "#085"
  }, {
    tag: tags.className,
    color: "#167"
  }, {
    tag: [tags.special(tags.variableName), tags.macroName],
    color: "#256"
  }, {
    tag: tags.definition(tags.propertyName),
    color: "#00c"
  }, {
    tag: tags.comment,
    color: "#940"
  }, {
    tag: tags.invalid,
    color: "#f00"
  }]);
  var DefaultScanDist = 1e4;
  var DefaultBrackets = "()[]{}";
  var bracketMatchingHandle = new NodeProp();
  function matchingNodes(node, dir, brackets) {
    var byProp = node.prop(dir < 0 ? NodeProp.openedBy : NodeProp.closedBy);
    if (byProp) return byProp;
    if (node.name.length == 1) {
      var index = brackets.indexOf(node.name);
      if (index > -1 && index % 2 == (dir < 0 ? 1 : 0)) return [brackets[index + dir]];
    }
    return null;
  }
  function findHandle(node) {
    var hasHandle = node.type.prop(bracketMatchingHandle);
    return hasHandle ? hasHandle(node.node) : node;
  }
  function matchBrackets(state, pos, dir, config) {
    if (config === void 0) {
      config = {};
    }
    var maxScanDistance = config.maxScanDistance || DefaultScanDist,
      brackets = config.brackets || DefaultBrackets;
    var tree = syntaxTree(state),
      node = tree.resolveInner(pos, dir);
    for (var cur = node; cur; cur = cur.parent) {
      var matches = matchingNodes(cur.type, dir, brackets);
      if (matches && cur.from < cur.to) {
        var handle = findHandle(cur);
        if (handle && (dir > 0 ? pos >= handle.from && pos < handle.to : pos > handle.from && pos <= handle.to)) return matchMarkedBrackets(state, pos, dir, cur, handle, matches, brackets);
      }
    }
    return matchPlainBrackets(state, pos, dir, tree, node.type, maxScanDistance, brackets);
  }
  function matchMarkedBrackets(_state, _pos, dir, token, handle, matching, brackets) {
    var parent = token.parent,
      firstToken = {
        from: handle.from,
        to: handle.to
      };
    var depth = 0,
      cursor = parent === null || parent === void 0 ? void 0 : parent.cursor();
    if (cursor && (dir < 0 ? cursor.childBefore(token.from) : cursor.childAfter(token.to))) do {
      if (dir < 0 ? cursor.to <= token.from : cursor.from >= token.to) {
        if (depth == 0 && matching.indexOf(cursor.type.name) > -1 && cursor.from < cursor.to) {
          var endHandle = findHandle(cursor);
          return {
            start: firstToken,
            end: endHandle ? {
              from: endHandle.from,
              to: endHandle.to
            } : void 0,
            matched: true
          };
        } else if (matchingNodes(cursor.type, dir, brackets)) {
          depth++;
        } else if (matchingNodes(cursor.type, -dir, brackets)) {
          if (depth == 0) {
            var _endHandle = findHandle(cursor);
            return {
              start: firstToken,
              end: _endHandle && _endHandle.from < _endHandle.to ? {
                from: _endHandle.from,
                to: _endHandle.to
              } : void 0,
              matched: false
            };
          }
          depth--;
        }
      }
    } while (dir < 0 ? cursor.prevSibling() : cursor.nextSibling());
    return {
      start: firstToken,
      matched: false
    };
  }
  function matchPlainBrackets(state, pos, dir, tree, tokenType, maxScanDistance, brackets) {
    if (dir < 0 ? !pos : pos == state.doc.length) return null;
    var startCh = dir < 0 ? state.sliceDoc(pos - 1, pos) : state.sliceDoc(pos, pos + 1);
    var bracket2 = brackets.indexOf(startCh);
    if (bracket2 < 0 || bracket2 % 2 == 0 != dir > 0) return null;
    var startToken = {
      from: dir < 0 ? pos - 1 : pos,
      to: dir > 0 ? pos + 1 : pos
    };
    var iter = state.doc.iterRange(pos, dir > 0 ? state.doc.length : 0),
      depth = 0;
    for (var distance = 0; !iter.next().done && distance <= maxScanDistance;) {
      var text = iter.value;
      if (dir < 0) distance += text.length;
      var basePos = pos + distance * dir;
      for (var pos2 = dir > 0 ? 0 : text.length - 1, end = dir > 0 ? text.length : -1; pos2 != end; pos2 += dir) {
        var found = brackets.indexOf(text[pos2]);
        if (found < 0 || tree.resolveInner(basePos + pos2, 1).type != tokenType) continue;
        if (found % 2 == 0 == dir > 0) {
          depth++;
        } else if (depth == 1) {
          return {
            start: startToken,
            end: {
              from: basePos + pos2,
              to: basePos + pos2 + 1
            },
            matched: found >> 1 == bracket2 >> 1
          };
        } else {
          depth--;
        }
      }
      if (dir > 0) distance += text.length;
    }
    return iter.done ? {
      start: startToken,
      matched: false
    } : null;
  }
  var noTokens = Object.create(null);
  var typeArray = [NodeType.none];
  var warned = [];
  var byTag = Object.create(null);
  var defaultTable = Object.create(null);
  for (var _i64 = 0, _arr2 = [["variable", "variableName"], ["variable-2", "variableName.special"], ["string-2", "string.special"], ["def", "variableName.definition"], ["tag", "tagName"], ["attribute", "attributeName"], ["type", "typeName"], ["builtin", "variableName.standard"], ["qualifier", "modifier"], ["error", "invalid"], ["header", "heading"], ["property", "propertyName"]]; _i64 < _arr2.length; _i64++) {
    var _arr2$_i = _arr2[_i64],
      legacyName = _arr2$_i[0],
      _name3 = _arr2$_i[1];
    defaultTable[legacyName] = createTokenType(noTokens, _name3);
  }
  function warnForPart(part, msg) {
    if (warned.indexOf(part) > -1) return;
    warned.push(part);
    console.warn(msg);
  }
  function createTokenType(extra, tagStr) {
    var _styleTags;
    var tags$1 = [];
    for (var _iterator137 = _createForOfIteratorHelperLoose(tagStr.split(" ")), _step137; !(_step137 = _iterator137()).done;) {
      var name3 = _step137.value;
      var found = [];
      for (var _iterator138 = _createForOfIteratorHelperLoose(name3.split(".")), _step138; !(_step138 = _iterator138()).done;) {
        var part = _step138.value;
        var value = extra[part] || tags[part];
        if (!value) {
          warnForPart(part, "Unknown highlighting tag " + part);
        } else if (typeof value == "function") {
          if (!found.length) warnForPart(part, "Modifier " + part + " used at start of tag");else found = found.map(value);
        } else {
          if (found.length) warnForPart(part, "Tag " + part + " used as modifier");else found = Array.isArray(value) ? value : [value];
        }
      }
      for (var _iterator139 = _createForOfIteratorHelperLoose(found), _step139; !(_step139 = _iterator139()).done;) {
        var tag = _step139.value;
        tags$1.push(tag);
      }
    }
    if (!tags$1.length) return 0;
    var name2 = tagStr.replace(new RegExp(" ", "g"), "_"),
      key = name2 + " " + tags$1.map(function (t2) {
        return t2.id;
      });
    var known = byTag[key];
    if (known) return known.id;
    var type = byTag[key] = NodeType.define({
      id: typeArray.length,
      name: name2,
      props: [styleTags((_styleTags = {}, _styleTags[name2] = tags$1, _styleTags))]
    });
    typeArray.push(type);
    return type.id;
  }
  var marks = {
    rtl: Decoration.mark({
      class: "cm-iso",
      inclusive: true,
      attributes: {
        dir: "rtl"
      },
      bidiIsolate: Direction.RTL
    }),
    ltr: Decoration.mark({
      class: "cm-iso",
      inclusive: true,
      attributes: {
        dir: "ltr"
      },
      bidiIsolate: Direction.LTR
    }),
    auto: Decoration.mark({
      class: "cm-iso",
      inclusive: true,
      attributes: {
        dir: "auto"
      },
      bidiIsolate: null
    })
  };
  var toggleComment = function toggleComment(target) {
    var state = target.state,
      line = state.doc.lineAt(state.selection.main.from),
      config = getConfig(target.state, line.from);
    return config.line ? toggleLineComment(target) : config.block ? toggleBlockCommentByLine(target) : false;
  };
  function command(f, option) {
    return function (_ref11) {
      var state = _ref11.state,
        dispatch = _ref11.dispatch;
      if (state.readOnly) return false;
      var tr = f(option, state);
      if (!tr) return false;
      dispatch(state.update(tr));
      return true;
    };
  }
  var toggleLineComment = command(changeLineComment, 0);
  var toggleBlockComment = command(changeBlockComment, 0);
  var toggleBlockCommentByLine = command(function (o, s) {
    return changeBlockComment(o, s, selectedLineRanges(s));
  }, 0);
  function getConfig(state, pos) {
    var data = state.languageDataAt("commentTokens", pos, 1);
    return data.length ? data[0] : {};
  }
  var SearchMargin = 50;
  function findBlockComment(state, _ref12, from, to) {
    var open = _ref12.open,
      close = _ref12.close;
    var textBefore = state.sliceDoc(from - SearchMargin, from);
    var textAfter = state.sliceDoc(to, to + SearchMargin);
    var spaceBefore = /\s*$/.exec(textBefore)[0].length,
      spaceAfter = /^\s*/.exec(textAfter)[0].length;
    var beforeOff = textBefore.length - spaceBefore;
    if (textBefore.slice(beforeOff - open.length, beforeOff) == open && textAfter.slice(spaceAfter, spaceAfter + close.length) == close) {
      return {
        open: {
          pos: from - spaceBefore,
          margin: spaceBefore && 1
        },
        close: {
          pos: to + spaceAfter,
          margin: spaceAfter && 1
        }
      };
    }
    var startText, endText;
    if (to - from <= 2 * SearchMargin) {
      startText = endText = state.sliceDoc(from, to);
    } else {
      startText = state.sliceDoc(from, from + SearchMargin);
      endText = state.sliceDoc(to - SearchMargin, to);
    }
    var startSpace = /^\s*/.exec(startText)[0].length,
      endSpace = /\s*$/.exec(endText)[0].length;
    var endOff = endText.length - endSpace - close.length;
    if (startText.slice(startSpace, startSpace + open.length) == open && endText.slice(endOff, endOff + close.length) == close) {
      return {
        open: {
          pos: from + startSpace + open.length,
          margin: /\s/.test(startText.charAt(startSpace + open.length)) ? 1 : 0
        },
        close: {
          pos: to - endSpace - close.length,
          margin: /\s/.test(endText.charAt(endOff - 1)) ? 1 : 0
        }
      };
    }
    return null;
  }
  function selectedLineRanges(state) {
    var ranges = [];
    for (var _iterator140 = _createForOfIteratorHelperLoose(state.selection.ranges), _step140; !(_step140 = _iterator140()).done;) {
      var _r6 = _step140.value;
      var fromLine = state.doc.lineAt(_r6.from);
      var toLine = _r6.to <= fromLine.to ? fromLine : state.doc.lineAt(_r6.to);
      if (toLine.from > fromLine.from && toLine.from == _r6.to) toLine = _r6.to == fromLine.to + 1 ? fromLine : state.doc.lineAt(_r6.to - 1);
      var last = ranges.length - 1;
      if (last >= 0 && ranges[last].to > fromLine.from) ranges[last].to = toLine.to;else ranges.push({
        from: fromLine.from + /^\s*/.exec(fromLine.text)[0].length,
        to: toLine.to
      });
    }
    return ranges;
  }
  function changeBlockComment(option, state, ranges) {
    if (ranges === void 0) {
      ranges = state.selection.ranges;
    }
    var tokens = ranges.map(function (r) {
      return getConfig(state, r.from).block;
    });
    if (!tokens.every(function (c) {
      return c;
    })) return null;
    var comments = ranges.map(function (r, i2) {
      return findBlockComment(state, tokens[i2], r.from, r.to);
    });
    if (option != 2 && !comments.every(function (c) {
      return c;
    })) {
      return {
        changes: state.changes(ranges.map(function (range, i2) {
          if (comments[i2]) return [];
          return [{
            from: range.from,
            insert: tokens[i2].open + " "
          }, {
            from: range.to,
            insert: " " + tokens[i2].close
          }];
        }))
      };
    } else if (option != 1 && comments.some(function (c) {
      return c;
    })) {
      var changes = [];
      for (var _i65 = 0, comment2; _i65 < comments.length; _i65++) if (comment2 = comments[_i65]) {
        var token = tokens[_i65],
          _comment = comment2,
          open = _comment.open,
          close = _comment.close;
        changes.push({
          from: open.pos - token.open.length,
          to: open.pos + open.margin
        }, {
          from: close.pos - close.margin,
          to: close.pos + token.close.length
        });
      }
      return {
        changes: changes
      };
    }
    return null;
  }
  function changeLineComment(option, state, ranges) {
    if (ranges === void 0) {
      ranges = state.selection.ranges;
    }
    var lines = [];
    var prevLine = -1;
    ranges: for (var _iterator141 = _createForOfIteratorHelperLoose(ranges), _step141; !(_step141 = _iterator141()).done;) {
      var _step141$value = _step141.value,
        _from2 = _step141$value.from,
        _to2 = _step141$value.to;
      var startI = lines.length,
        minIndent = 1e9,
        _token2 = void 0;
      for (var pos = _from2; pos <= _to2;) {
        var _line4 = state.doc.lineAt(pos);
        if (_token2 == void 0) {
          _token2 = getConfig(state, _line4.from).line;
          if (!_token2) continue ranges;
        }
        if (_line4.from > prevLine && (_from2 == _to2 || _to2 > _line4.from)) {
          prevLine = _line4.from;
          var _indent = /^\s*/.exec(_line4.text)[0].length;
          var _empty = _indent == _line4.length;
          var _comment2 = _line4.text.slice(_indent, _indent + _token2.length) == _token2 ? _indent : -1;
          if (_indent < _line4.text.length && _indent < minIndent) minIndent = _indent;
          lines.push({
            line: _line4,
            comment: _comment2,
            token: _token2,
            indent: _indent,
            empty: _empty,
            single: false
          });
        }
        pos = _line4.to + 1;
      }
      if (minIndent < 1e9) {
        for (var _i66 = startI; _i66 < lines.length; _i66++) if (lines[_i66].indent < lines[_i66].line.text.length) lines[_i66].indent = minIndent;
      }
      if (lines.length == startI + 1) lines[startI].single = true;
    }
    if (option != 2 && lines.some(function (l) {
      return l.comment < 0 && (!l.empty || l.single);
    })) {
      var changes = [];
      for (var _iterator142 = _createForOfIteratorHelperLoose(lines), _step142; !(_step142 = _iterator142()).done;) {
        var _step142$value = _step142.value,
          line = _step142$value.line,
          token = _step142$value.token,
          indent = _step142$value.indent,
          empty = _step142$value.empty,
          single = _step142$value.single;
        if (single || !empty) changes.push({
          from: line.from + indent,
          insert: token + " "
        });
      }
      var changeSet = state.changes(changes);
      return {
        changes: changeSet,
        selection: state.selection.map(changeSet, 1)
      };
    } else if (option != 1 && lines.some(function (l) {
      return l.comment >= 0;
    })) {
      var _changes2 = [];
      for (var _iterator143 = _createForOfIteratorHelperLoose(lines), _step143; !(_step143 = _iterator143()).done;) {
        var _step143$value = _step143.value,
          _line3 = _step143$value.line,
          comment2 = _step143$value.comment,
          _token = _step143$value.token;
        if (comment2 >= 0) {
          var from = _line3.from + comment2,
            to = from + _token.length;
          if (_line3.text[to - _line3.from] == " ") to++;
          _changes2.push({
            from: from,
            to: to
          });
        }
      }
      return {
        changes: _changes2
      };
    }
    return null;
  }
  var fromHistory = Annotation.define();
  var isolateHistory = Annotation.define();
  var invertedEffects = Facet.define();
  var historyConfig = Facet.define({
    combine: function combine(configs) {
      return combineConfig(configs, {
        minDepth: 100,
        newGroupDelay: 500,
        joinToEvent: function joinToEvent(_t, isAdjacent2) {
          return isAdjacent2;
        }
      }, {
        minDepth: Math.max,
        newGroupDelay: Math.min,
        joinToEvent: function joinToEvent(a, b) {
          return function (tr, adj) {
            return a(tr, adj) || b(tr, adj);
          };
        }
      });
    }
  });
  var historyField_ = StateField.define({
    create: function create() {
      return HistoryState.empty;
    },
    update: function update(state, tr) {
      var config = tr.state.facet(historyConfig);
      var fromHist = tr.annotation(fromHistory);
      if (fromHist) {
        var item = HistEvent.fromTransaction(tr, fromHist.selection),
          from = fromHist.side;
        var other = from == 0 ? state.undone : state.done;
        if (item) other = updateBranch(other, other.length, config.minDepth, item);else other = _addSelection(other, tr.startState.selection);
        return new HistoryState(from == 0 ? fromHist.rest : other, from == 0 ? other : fromHist.rest);
      }
      var isolate = tr.annotation(isolateHistory);
      if (isolate == "full" || isolate == "before") state = state.isolate();
      if (tr.annotation(Transaction.addToHistory) === false) return !tr.changes.empty ? state.addMapping(tr.changes.desc) : state;
      var event = HistEvent.fromTransaction(tr);
      var time = tr.annotation(Transaction.time),
        userEvent = tr.annotation(Transaction.userEvent);
      if (event) state = state.addChanges(event, time, userEvent, config, tr);else if (tr.selection) state = state.addSelection(tr.startState.selection, time, userEvent, config.newGroupDelay);
      if (isolate == "full" || isolate == "after") state = state.isolate();
      return state;
    },
    toJSON: function toJSON(value) {
      return {
        done: value.done.map(function (e) {
          return e.toJSON();
        }),
        undone: value.undone.map(function (e) {
          return e.toJSON();
        })
      };
    },
    fromJSON: function fromJSON(json) {
      return new HistoryState(json.done.map(HistEvent.fromJSON), json.undone.map(HistEvent.fromJSON));
    }
  });
  function history(config) {
    if (config === void 0) {
      config = {};
    }
    return [historyField_, historyConfig.of(config), EditorView.domEventHandlers({
      beforeinput: function beforeinput(e, view) {
        var command2 = e.inputType == "historyUndo" ? undo : e.inputType == "historyRedo" ? redo : null;
        if (!command2) return false;
        e.preventDefault();
        return command2(view);
      }
    })];
  }
  function cmd(side, selection) {
    return function (_ref13) {
      var state = _ref13.state,
        dispatch = _ref13.dispatch;
      if (!selection && state.readOnly) return false;
      var historyState = state.field(historyField_, false);
      if (!historyState) return false;
      var tr = historyState.pop(side, state, selection);
      if (!tr) return false;
      dispatch(tr);
      return true;
    };
  }
  var undo = cmd(0, false);
  var redo = cmd(1, false);
  var undoSelection = cmd(0, true);
  var redoSelection = cmd(1, true);
  var HistEvent = function () {
    function _HistEvent(changes, effects, mapped, startSelection, selectionsAfter) {
      this.changes = changes;
      this.effects = effects;
      this.mapped = mapped;
      this.startSelection = startSelection;
      this.selectionsAfter = selectionsAfter;
    }
    var _proto107 = _HistEvent.prototype;
    _proto107.setSelAfter = function setSelAfter(after) {
      return new _HistEvent(this.changes, this.effects, this.mapped, this.startSelection, after);
    };
    _proto107.toJSON = function toJSON() {
      var _a2, _b, _c;
      return {
        changes: (_a2 = this.changes) === null || _a2 === void 0 ? void 0 : _a2.toJSON(),
        mapped: (_b = this.mapped) === null || _b === void 0 ? void 0 : _b.toJSON(),
        startSelection: (_c = this.startSelection) === null || _c === void 0 ? void 0 : _c.toJSON(),
        selectionsAfter: this.selectionsAfter.map(function (s) {
          return s.toJSON();
        })
      };
    };
    _HistEvent.fromJSON = function fromJSON(json) {
      return new _HistEvent(json.changes && ChangeSet.fromJSON(json.changes), [], json.mapped && ChangeDesc.fromJSON(json.mapped), json.startSelection && EditorSelection.fromJSON(json.startSelection), json.selectionsAfter.map(EditorSelection.fromJSON));
    };
    _HistEvent.fromTransaction = function fromTransaction(tr, selection) {
      var effects = none2;
      for (var _iterator144 = _createForOfIteratorHelperLoose(tr.startState.facet(invertedEffects)), _step144; !(_step144 = _iterator144()).done;) {
        var invert = _step144.value;
        var result = invert(tr);
        if (result.length) effects = effects.concat(result);
      }
      if (!effects.length && tr.changes.empty) return null;
      return new _HistEvent(tr.changes.invert(tr.startState.doc), effects, void 0, selection || tr.startState.selection, none2);
    };
    _HistEvent.selection = function selection(selections) {
      return new _HistEvent(void 0, none2, void 0, void 0, selections);
    };
    return _HistEvent;
  }();
  function updateBranch(branch, to, maxLen, newEvent) {
    var start = to + 1 > maxLen + 20 ? to - maxLen - 1 : 0;
    var newBranch = branch.slice(start, to);
    newBranch.push(newEvent);
    return newBranch;
  }
  function isAdjacent(a, b) {
    var ranges = [],
      isAdjacent2 = false;
    a.iterChangedRanges(function (f, t2) {
      return ranges.push(f, t2);
    });
    b.iterChangedRanges(function (_f, _t, f, t2) {
      for (var _i67 = 0; _i67 < ranges.length;) {
        var from = ranges[_i67++],
          to = ranges[_i67++];
        if (t2 >= from && f <= to) isAdjacent2 = true;
      }
    });
    return isAdjacent2;
  }
  function eqSelectionShape(a, b) {
    return a.ranges.length == b.ranges.length && a.ranges.filter(function (r, i2) {
      return r.empty != b.ranges[i2].empty;
    }).length === 0;
  }
  function conc(a, b) {
    return !a.length ? b : !b.length ? a : a.concat(b);
  }
  var none2 = [];
  var MaxSelectionsPerEvent = 200;
  function _addSelection(branch, selection) {
    if (!branch.length) {
      return [HistEvent.selection([selection])];
    } else {
      var lastEvent = branch[branch.length - 1];
      var sels = lastEvent.selectionsAfter.slice(Math.max(0, lastEvent.selectionsAfter.length - MaxSelectionsPerEvent));
      if (sels.length && sels[sels.length - 1].eq(selection)) return branch;
      sels.push(selection);
      return updateBranch(branch, branch.length - 1, 1e9, lastEvent.setSelAfter(sels));
    }
  }
  function popSelection(branch) {
    var last = branch[branch.length - 1];
    var newBranch = branch.slice();
    newBranch[branch.length - 1] = last.setSelAfter(last.selectionsAfter.slice(0, last.selectionsAfter.length - 1));
    return newBranch;
  }
  function addMappingToBranch(branch, mapping) {
    if (!branch.length) return branch;
    var length = branch.length,
      selections = none2;
    while (length) {
      var event = mapEvent(branch[length - 1], mapping, selections);
      if (event.changes && !event.changes.empty || event.effects.length) {
        var result = branch.slice(0, length);
        result[length - 1] = event;
        return result;
      } else {
        mapping = event.mapped;
        length--;
        selections = event.selectionsAfter;
      }
    }
    return selections.length ? [HistEvent.selection(selections)] : none2;
  }
  function mapEvent(event, mapping, extraSelections) {
    var selections = conc(event.selectionsAfter.length ? event.selectionsAfter.map(function (s) {
      return s.map(mapping);
    }) : none2, extraSelections);
    if (!event.changes) return HistEvent.selection(selections);
    var mappedChanges = event.changes.map(mapping),
      before = mapping.mapDesc(event.changes, true);
    var fullMapping = event.mapped ? event.mapped.composeDesc(before) : before;
    return new HistEvent(mappedChanges, StateEffect.mapEffects(event.effects, mapping), fullMapping, event.startSelection.map(before), selections);
  }
  var joinableUserEvent = /^(input\.type|delete)($|\.)/;
  var HistoryState = function () {
    function _HistoryState(done, undone, prevTime, prevUserEvent) {
      if (prevTime === void 0) {
        prevTime = 0;
      }
      if (prevUserEvent === void 0) {
        prevUserEvent = void 0;
      }
      this.done = done;
      this.undone = undone;
      this.prevTime = prevTime;
      this.prevUserEvent = prevUserEvent;
    }
    var _proto108 = _HistoryState.prototype;
    _proto108.isolate = function isolate() {
      return this.prevTime ? new _HistoryState(this.done, this.undone) : this;
    };
    _proto108.addChanges = function addChanges(event, time, userEvent, config, tr) {
      var done = this.done,
        lastEvent = done[done.length - 1];
      if (lastEvent && lastEvent.changes && !lastEvent.changes.empty && event.changes && (!userEvent || joinableUserEvent.test(userEvent)) && (!lastEvent.selectionsAfter.length && time - this.prevTime < config.newGroupDelay && config.joinToEvent(tr, isAdjacent(lastEvent.changes, event.changes)) || userEvent == "input.type.compose")) {
        done = updateBranch(done, done.length - 1, config.minDepth, new HistEvent(event.changes.compose(lastEvent.changes), conc(StateEffect.mapEffects(event.effects, lastEvent.changes), lastEvent.effects), lastEvent.mapped, lastEvent.startSelection, none2));
      } else {
        done = updateBranch(done, done.length, config.minDepth, event);
      }
      return new _HistoryState(done, none2, time, userEvent);
    };
    _proto108.addSelection = function addSelection(selection, time, userEvent, newGroupDelay) {
      var last = this.done.length ? this.done[this.done.length - 1].selectionsAfter : none2;
      if (last.length > 0 && time - this.prevTime < newGroupDelay && userEvent == this.prevUserEvent && userEvent && /^select($|\.)/.test(userEvent) && eqSelectionShape(last[last.length - 1], selection)) return this;
      return new _HistoryState(_addSelection(this.done, selection), this.undone, time, userEvent);
    };
    _proto108.addMapping = function addMapping(mapping) {
      return new _HistoryState(addMappingToBranch(this.done, mapping), addMappingToBranch(this.undone, mapping), this.prevTime, this.prevUserEvent);
    };
    _proto108.pop = function pop(side, state, onlySelection) {
      var branch = side == 0 ? this.done : this.undone;
      if (branch.length == 0) return null;
      var event = branch[branch.length - 1],
        selection = event.selectionsAfter[0] || (event.startSelection ? event.startSelection.map(event.changes.invertedDesc, 1) : state.selection);
      if (onlySelection && event.selectionsAfter.length) {
        return state.update({
          selection: event.selectionsAfter[event.selectionsAfter.length - 1],
          annotations: fromHistory.of({
            side: side,
            rest: popSelection(branch),
            selection: selection
          }),
          userEvent: side == 0 ? "select.undo" : "select.redo",
          scrollIntoView: true
        });
      } else if (!event.changes) {
        return null;
      } else {
        var rest = branch.length == 1 ? none2 : branch.slice(0, branch.length - 1);
        if (event.mapped) rest = addMappingToBranch(rest, event.mapped);
        return state.update({
          changes: event.changes,
          selection: event.startSelection,
          effects: event.effects,
          annotations: fromHistory.of({
            side: side,
            rest: rest,
            selection: selection
          }),
          filter: false,
          userEvent: side == 0 ? "undo" : "redo",
          scrollIntoView: true
        });
      }
    };
    return _HistoryState;
  }();
  HistoryState.empty = new HistoryState(none2, none2);
  var historyKeymap = [{
    key: "Mod-z",
    run: undo,
    preventDefault: true
  }, {
    key: "Mod-y",
    mac: "Mod-Shift-z",
    run: redo,
    preventDefault: true
  }, {
    linux: "Ctrl-Shift-z",
    run: redo,
    preventDefault: true
  }, {
    key: "Mod-u",
    run: undoSelection,
    preventDefault: true
  }, {
    key: "Alt-u",
    mac: "Mod-Shift-u",
    run: redoSelection,
    preventDefault: true
  }];
  function updateSel(sel, by) {
    return EditorSelection.create(sel.ranges.map(by), sel.mainIndex);
  }
  function setSel(state, selection) {
    return state.update({
      selection: selection,
      scrollIntoView: true,
      userEvent: "select"
    });
  }
  function moveSel(_ref14, how) {
    var state = _ref14.state,
      dispatch = _ref14.dispatch;
    var selection = updateSel(state.selection, how);
    if (selection.eq(state.selection, true)) return false;
    dispatch(setSel(state, selection));
    return true;
  }
  function rangeEnd(range, forward) {
    return EditorSelection.cursor(forward ? range.to : range.from);
  }
  function cursorByChar(view, forward) {
    return moveSel(view, function (range) {
      return range.empty ? view.moveByChar(range, forward) : rangeEnd(range, forward);
    });
  }
  function ltrAtCursor(view) {
    return view.textDirectionAt(view.state.selection.main.head) == Direction.LTR;
  }
  var cursorCharLeft = function cursorCharLeft(view) {
    return cursorByChar(view, !ltrAtCursor(view));
  };
  var cursorCharRight = function cursorCharRight(view) {
    return cursorByChar(view, ltrAtCursor(view));
  };
  function cursorByGroup(view, forward) {
    return moveSel(view, function (range) {
      return range.empty ? view.moveByGroup(range, forward) : rangeEnd(range, forward);
    });
  }
  var cursorGroupLeft = function cursorGroupLeft(view) {
    return cursorByGroup(view, !ltrAtCursor(view));
  };
  var cursorGroupRight = function cursorGroupRight(view) {
    return cursorByGroup(view, ltrAtCursor(view));
  };
  var segmenter = typeof Intl != "undefined" && Intl.Segmenter ? new Intl.Segmenter(void 0, {
    granularity: "word"
  }) : null;
  function interestingNode(state, node, bracketProp) {
    if (node.type.prop(bracketProp)) return true;
    var len = node.to - node.from;
    return len && (len > 2 || /[^\s,.;:]/.test(state.sliceDoc(node.from, node.to))) || node.firstChild;
  }
  function moveBySyntax(state, start, forward) {
    var pos = syntaxTree(state).resolveInner(start.head);
    var bracketProp = forward ? NodeProp.closedBy : NodeProp.openedBy;
    for (var at = start.head;;) {
      var next = forward ? pos.childAfter(at) : pos.childBefore(at);
      if (!next) break;
      if (interestingNode(state, next, bracketProp)) pos = next;else at = forward ? next.to : next.from;
    }
    var bracket2 = pos.type.prop(bracketProp),
      match,
      newPos;
    if (bracket2 && (match = forward ? matchBrackets(state, pos.from, 1) : matchBrackets(state, pos.to, -1)) && match.matched) newPos = forward ? match.end.to : match.end.from;else newPos = forward ? pos.to : pos.from;
    return EditorSelection.cursor(newPos, forward ? -1 : 1);
  }
  var cursorSyntaxLeft = function cursorSyntaxLeft(view) {
    return moveSel(view, function (range) {
      return moveBySyntax(view.state, range, !ltrAtCursor(view));
    });
  };
  var cursorSyntaxRight = function cursorSyntaxRight(view) {
    return moveSel(view, function (range) {
      return moveBySyntax(view.state, range, ltrAtCursor(view));
    });
  };
  function cursorByLine(view, forward) {
    return moveSel(view, function (range) {
      if (!range.empty) return rangeEnd(range, forward);
      var moved = view.moveVertically(range, forward);
      return moved.head != range.head ? moved : view.moveToLineBoundary(range, forward);
    });
  }
  var cursorLineUp = function cursorLineUp(view) {
    return cursorByLine(view, false);
  };
  var cursorLineDown = function cursorLineDown(view) {
    return cursorByLine(view, true);
  };
  function pageInfo(view) {
    var selfScroll = view.scrollDOM.clientHeight < view.scrollDOM.scrollHeight - 2;
    var marginTop = 0,
      marginBottom = 0,
      height;
    if (selfScroll) {
      for (var _iterator145 = _createForOfIteratorHelperLoose(view.state.facet(EditorView.scrollMargins)), _step145; !(_step145 = _iterator145()).done;) {
        var source = _step145.value;
        var margins = source(view);
        if (margins === null || margins === void 0 ? void 0 : margins.top) marginTop = Math.max(margins === null || margins === void 0 ? void 0 : margins.top, marginTop);
        if (margins === null || margins === void 0 ? void 0 : margins.bottom) marginBottom = Math.max(margins === null || margins === void 0 ? void 0 : margins.bottom, marginBottom);
      }
      height = view.scrollDOM.clientHeight - marginTop - marginBottom;
    } else {
      height = (view.dom.ownerDocument.defaultView || window).innerHeight;
    }
    return {
      marginTop: marginTop,
      marginBottom: marginBottom,
      selfScroll: selfScroll,
      height: Math.max(view.defaultLineHeight, height - 5)
    };
  }
  function cursorByPage(view, forward) {
    var page = pageInfo(view);
    var state = view.state,
      selection = updateSel(state.selection, function (range) {
        return range.empty ? view.moveVertically(range, forward, page.height) : rangeEnd(range, forward);
      });
    if (selection.eq(state.selection)) return false;
    var effect;
    if (page.selfScroll) {
      var startPos = view.coordsAtPos(state.selection.main.head);
      var scrollRect = view.scrollDOM.getBoundingClientRect();
      var scrollTop = scrollRect.top + page.marginTop,
        scrollBottom = scrollRect.bottom - page.marginBottom;
      if (startPos && startPos.top > scrollTop && startPos.bottom < scrollBottom) effect = EditorView.scrollIntoView(selection.main.head, {
        y: "start",
        yMargin: startPos.top - scrollTop
      });
    }
    view.dispatch(setSel(state, selection), {
      effects: effect
    });
    return true;
  }
  var cursorPageUp = function cursorPageUp(view) {
    return cursorByPage(view, false);
  };
  var cursorPageDown = function cursorPageDown(view) {
    return cursorByPage(view, true);
  };
  function moveByLineBoundary(view, start, forward) {
    var line = view.lineBlockAt(start.head),
      moved = view.moveToLineBoundary(start, forward);
    if (moved.head == start.head && moved.head != (forward ? line.to : line.from)) moved = view.moveToLineBoundary(start, forward, false);
    if (!forward && moved.head == line.from && line.length) {
      var space = /^\s*/.exec(view.state.sliceDoc(line.from, Math.min(line.from + 100, line.to)))[0].length;
      if (space && start.head != line.from + space) moved = EditorSelection.cursor(line.from + space);
    }
    return moved;
  }
  var cursorLineBoundaryForward = function cursorLineBoundaryForward(view) {
    return moveSel(view, function (range) {
      return moveByLineBoundary(view, range, true);
    });
  };
  var cursorLineBoundaryBackward = function cursorLineBoundaryBackward(view) {
    return moveSel(view, function (range) {
      return moveByLineBoundary(view, range, false);
    });
  };
  var cursorLineBoundaryLeft = function cursorLineBoundaryLeft(view) {
    return moveSel(view, function (range) {
      return moveByLineBoundary(view, range, !ltrAtCursor(view));
    });
  };
  var cursorLineBoundaryRight = function cursorLineBoundaryRight(view) {
    return moveSel(view, function (range) {
      return moveByLineBoundary(view, range, ltrAtCursor(view));
    });
  };
  var cursorLineStart = function cursorLineStart(view) {
    return moveSel(view, function (range) {
      return EditorSelection.cursor(view.lineBlockAt(range.head).from, 1);
    });
  };
  var cursorLineEnd = function cursorLineEnd(view) {
    return moveSel(view, function (range) {
      return EditorSelection.cursor(view.lineBlockAt(range.head).to, -1);
    });
  };
  function toMatchingBracket(state, dispatch, extend) {
    var found = false,
      selection = updateSel(state.selection, function (range) {
        var matching = matchBrackets(state, range.head, -1) || matchBrackets(state, range.head, 1) || range.head > 0 && matchBrackets(state, range.head - 1, 1) || range.head < state.doc.length && matchBrackets(state, range.head + 1, -1);
        if (!matching || !matching.end) return range;
        found = true;
        var head = matching.start.from == range.head ? matching.end.to : matching.end.from;
        return extend ? EditorSelection.range(range.anchor, head) : EditorSelection.cursor(head);
      });
    if (!found) return false;
    dispatch(setSel(state, selection));
    return true;
  }
  var cursorMatchingBracket = function cursorMatchingBracket(_ref15) {
    var state = _ref15.state,
      dispatch = _ref15.dispatch;
    return toMatchingBracket(state, dispatch, false);
  };
  function extendSel(target, forward, how) {
    var selection = updateSel(target.state.selection, function (range) {
      if (range.undirectional && range.head >= range.anchor != forward) range = EditorSelection.range(range.head, range.anchor);
      var head = how(range);
      return EditorSelection.range(range.anchor, head.head, head.goalColumn, head.bidiLevel || void 0, head.assoc);
    });
    if (selection.eq(target.state.selection)) return false;
    target.dispatch(setSel(target.state, selection));
    return true;
  }
  function selectByChar(view, forward) {
    return extendSel(view, forward, function (range) {
      return view.moveByChar(range, forward);
    });
  }
  var selectCharLeft = function selectCharLeft(view) {
    return selectByChar(view, !ltrAtCursor(view));
  };
  var selectCharRight = function selectCharRight(view) {
    return selectByChar(view, ltrAtCursor(view));
  };
  function selectByGroup(view, forward) {
    return extendSel(view, forward, function (range) {
      return view.moveByGroup(range, forward);
    });
  }
  var selectGroupLeft = function selectGroupLeft(view) {
    return selectByGroup(view, !ltrAtCursor(view));
  };
  var selectGroupRight = function selectGroupRight(view) {
    return selectByGroup(view, ltrAtCursor(view));
  };
  var selectSyntaxLeft = function selectSyntaxLeft(view) {
    var forward = !ltrAtCursor(view);
    return extendSel(view, forward, function (range) {
      return moveBySyntax(view.state, range, forward);
    });
  };
  var selectSyntaxRight = function selectSyntaxRight(view) {
    var forward = ltrAtCursor(view);
    return extendSel(view, forward, function (range) {
      return moveBySyntax(view.state, range, forward);
    });
  };
  function selectByLine(view, forward) {
    return extendSel(view, forward, function (range) {
      return view.moveVertically(range, forward);
    });
  }
  var selectLineUp = function selectLineUp(view) {
    return selectByLine(view, false);
  };
  var selectLineDown = function selectLineDown(view) {
    return selectByLine(view, true);
  };
  function selectByPage(view, forward) {
    return extendSel(view, forward, function (range) {
      return view.moveVertically(range, forward, pageInfo(view).height);
    });
  }
  var selectPageUp = function selectPageUp(view) {
    return selectByPage(view, false);
  };
  var selectPageDown = function selectPageDown(view) {
    return selectByPage(view, true);
  };
  var selectLineBoundaryForward = function selectLineBoundaryForward(view) {
    return extendSel(view, true, function (range) {
      return moveByLineBoundary(view, range, true);
    });
  };
  var selectLineBoundaryBackward = function selectLineBoundaryBackward(view) {
    return extendSel(view, false, function (range) {
      return moveByLineBoundary(view, range, false);
    });
  };
  var selectLineBoundaryLeft = function selectLineBoundaryLeft(view) {
    var forward = !ltrAtCursor(view);
    return extendSel(view, forward, function (range) {
      return moveByLineBoundary(view, range, forward);
    });
  };
  var selectLineBoundaryRight = function selectLineBoundaryRight(view) {
    var forward = ltrAtCursor(view);
    return extendSel(view, forward, function (range) {
      return moveByLineBoundary(view, range, forward);
    });
  };
  var selectLineStart = function selectLineStart(view) {
    return extendSel(view, false, function (range) {
      return EditorSelection.cursor(view.lineBlockAt(range.head).from);
    });
  };
  var selectLineEnd = function selectLineEnd(view) {
    return extendSel(view, true, function (range) {
      return EditorSelection.cursor(view.lineBlockAt(range.head).to);
    });
  };
  var cursorDocStart = function cursorDocStart(_ref16) {
    var state = _ref16.state,
      dispatch = _ref16.dispatch;
    dispatch(setSel(state, {
      anchor: 0
    }));
    return true;
  };
  var cursorDocEnd = function cursorDocEnd(_ref17) {
    var state = _ref17.state,
      dispatch = _ref17.dispatch;
    dispatch(setSel(state, {
      anchor: state.doc.length
    }));
    return true;
  };
  var selectDocStart = function selectDocStart(_ref18) {
    var state = _ref18.state,
      dispatch = _ref18.dispatch;
    dispatch(setSel(state, {
      anchor: state.selection.main.anchor,
      head: 0
    }));
    return true;
  };
  var selectDocEnd = function selectDocEnd(_ref19) {
    var state = _ref19.state,
      dispatch = _ref19.dispatch;
    dispatch(setSel(state, {
      anchor: state.selection.main.anchor,
      head: state.doc.length
    }));
    return true;
  };
  var selectAll = function selectAll(_ref20) {
    var state = _ref20.state,
      dispatch = _ref20.dispatch;
    dispatch(state.update({
      selection: {
        anchor: 0,
        head: state.doc.length
      },
      userEvent: "select"
    }));
    return true;
  };
  var selectLine = function selectLine(_ref21) {
    var state = _ref21.state,
      dispatch = _ref21.dispatch;
    var ranges = selectedLineBlocks(state).map(function (_ref22) {
      var from = _ref22.from,
        to = _ref22.to;
      return EditorSelection.undirectionalRange(from, Math.min(to + 1, state.doc.length));
    });
    dispatch(state.update({
      selection: EditorSelection.create(ranges),
      userEvent: "select"
    }));
    return true;
  };
  var selectParentSyntax = function selectParentSyntax(_ref23) {
    var state = _ref23.state,
      dispatch = _ref23.dispatch;
    var selection = updateSel(state.selection, function (range) {
      var tree = syntaxTree(state),
        stack = tree.resolveStack(range.from, 1);
      if (range.empty) {
        var stackBefore = tree.resolveStack(range.from, -1);
        if (stackBefore.node.from >= stack.node.from && stackBefore.node.to <= stack.node.to) stack = stackBefore;
      }
      for (var cur = stack; cur; cur = cur.next) {
        var _cur = cur,
          node = _cur.node;
        if ((node.from < range.from && node.to >= range.to || node.to > range.to && node.from <= range.from) && cur.next) return EditorSelection.undirectionalRange(node.from, node.to);
      }
      return range;
    });
    if (selection.eq(state.selection)) return false;
    dispatch(setSel(state, selection));
    return true;
  };
  function addCursorVertically(view, forward) {
    var state = view.state,
      sel = state.selection,
      ranges = state.selection.ranges.slice();
    for (var _iterator146 = _createForOfIteratorHelperLoose(state.selection.ranges), _step146; !(_step146 = _iterator146()).done;) {
      var range = _step146.value;
      var line = state.doc.lineAt(range.head);
      if (forward ? line.to < view.state.doc.length : line.from > 0) {
        var _loop12 = function _loop12(_cur2) {
            var next = view.moveVertically(_cur2, forward);
            if (next.head < line.from || next.head > line.to) {
              if (!ranges.some(function (r) {
                return r.head == next.head;
              })) ranges.push(next);
              cur = _cur2;
              return 0;
            } else if (next.head == _cur2.head) {
              cur = _cur2;
              return 0;
            } else {
              _cur2 = next;
            }
            cur = _cur2;
          },
          _ret2;
        for (var cur = range;;) {
          _ret2 = _loop12(cur);
          if (_ret2 === 0) break;
        }
      }
    }
    if (ranges.length == sel.ranges.length) return false;
    view.dispatch(setSel(state, EditorSelection.create(ranges, ranges.length - 1)));
    return true;
  }
  var addCursorAbove = function addCursorAbove(view) {
    return addCursorVertically(view, false);
  };
  var addCursorBelow = function addCursorBelow(view) {
    return addCursorVertically(view, true);
  };
  var simplifySelection = function simplifySelection(_ref24) {
    var state = _ref24.state,
      dispatch = _ref24.dispatch;
    var cur = state.selection,
      selection = null;
    if (cur.ranges.length > 1) selection = EditorSelection.create([cur.main]);else if (!cur.main.empty) selection = EditorSelection.create([EditorSelection.cursor(cur.main.head)]);
    if (!selection) return false;
    dispatch(setSel(state, selection));
    return true;
  };
  function deleteBy(target, by) {
    if (target.state.readOnly) return false;
    var event = "delete.selection",
      state = target.state;
    var changes = state.changeByRange(function (range) {
      var from = range.from,
        to = range.to;
      if (from == to) {
        var towards = by(range);
        if (towards < from) {
          event = "delete.backward";
          towards = skipAtomic(target, towards, false);
        } else if (towards > from) {
          event = "delete.forward";
          towards = skipAtomic(target, towards, true);
        }
        from = Math.min(from, towards);
        to = Math.max(to, towards);
      } else {
        from = skipAtomic(target, from, false);
        to = skipAtomic(target, to, true);
      }
      return from == to ? {
        range: range
      } : {
        changes: {
          from: from,
          to: to
        },
        range: EditorSelection.cursor(from, from < range.head ? -1 : 1)
      };
    });
    if (changes.changes.empty) return false;
    target.dispatch(state.update(changes, {
      scrollIntoView: true,
      userEvent: event,
      effects: event == "delete.selection" ? EditorView.announce.of(state.phrase("Selection deleted")) : void 0
    }));
    return true;
  }
  function skipAtomic(target, pos, forward) {
    if (target instanceof EditorView) {
      for (var _iterator147 = _createForOfIteratorHelperLoose(target.state.facet(EditorView.atomicRanges).map(function (f) {
          return f(target);
        })), _step147; !(_step147 = _iterator147()).done;) {
        var ranges = _step147.value;
        ranges.between(pos, pos, function (from, to) {
          if (from < pos && to > pos) pos = forward ? to : from;
        });
      }
    }
    return pos;
  }
  var deleteByChar = function deleteByChar(target, forward, byIndentUnit) {
    return deleteBy(target, function (range) {
      var pos = range.from,
        state = target.state,
        line = state.doc.lineAt(pos),
        before,
        targetPos;
      if (byIndentUnit && !forward && pos > line.from && pos < line.from + 200 && !/[^ \t]/.test(before = line.text.slice(0, pos - line.from))) {
        if (before[before.length - 1] == "	") return pos - 1;
        var col = _countColumn(before, state.tabSize),
          drop = col % getIndentUnit(state) || getIndentUnit(state);
        for (var _i68 = 0; _i68 < drop && before[before.length - 1 - _i68] == " "; _i68++) pos--;
        targetPos = pos;
      } else {
        targetPos = findClusterBreak2(line.text, pos - line.from, forward, forward) + line.from;
        if (targetPos == pos && line.number != (forward ? state.doc.lines : 1)) targetPos += forward ? 1 : -1;else if (!forward && /[\ufe00-\ufe0f]/.test(line.text.slice(targetPos - line.from, pos - line.from))) targetPos = findClusterBreak2(line.text, targetPos - line.from, false, false) + line.from;
      }
      return targetPos;
    });
  };
  var deleteCharBackward = function deleteCharBackward(view) {
    return deleteByChar(view, false, true);
  };
  var deleteCharForward = function deleteCharForward(view) {
    return deleteByChar(view, true, false);
  };
  var deleteByGroup = function deleteByGroup(target, forward) {
    return deleteBy(target, function (range) {
      var pos = range.head,
        state = target.state,
        line = state.doc.lineAt(pos);
      var categorize = state.charCategorizer(pos);
      for (var cat = null;;) {
        if (pos == (forward ? line.to : line.from)) {
          if (pos == range.head && line.number != (forward ? state.doc.lines : 1)) pos += forward ? 1 : -1;
          break;
        }
        var next = findClusterBreak2(line.text, pos - line.from, forward) + line.from;
        var nextChar = line.text.slice(Math.min(pos, next) - line.from, Math.max(pos, next) - line.from);
        var nextCat = categorize(nextChar);
        if (cat != null && nextCat != cat) break;
        if (nextChar != " " || pos != range.head) cat = nextCat;
        pos = next;
      }
      return pos;
    });
  };
  var deleteGroupBackward = function deleteGroupBackward(target) {
    return deleteByGroup(target, false);
  };
  var deleteGroupForward = function deleteGroupForward(target) {
    return deleteByGroup(target, true);
  };
  var deleteToLineEnd = function deleteToLineEnd(view) {
    return deleteBy(view, function (range) {
      var lineEnd2 = view.lineBlockAt(range.head).to;
      return range.head < lineEnd2 ? lineEnd2 : Math.min(view.state.doc.length, range.head + 1);
    });
  };
  var deleteLineBoundaryBackward = function deleteLineBoundaryBackward(view) {
    return deleteBy(view, function (range) {
      var lineStart = view.moveToLineBoundary(range, false).head;
      return range.head > lineStart ? lineStart : Math.max(0, range.head - 1);
    });
  };
  var deleteLineBoundaryForward = function deleteLineBoundaryForward(view) {
    return deleteBy(view, function (range) {
      var lineStart = view.moveToLineBoundary(range, true).head;
      return range.head < lineStart ? lineStart : Math.min(view.state.doc.length, range.head + 1);
    });
  };
  var splitLine = function splitLine(_ref25) {
    var state = _ref25.state,
      dispatch = _ref25.dispatch;
    if (state.readOnly) return false;
    var changes = state.changeByRange(function (range) {
      return {
        changes: {
          from: range.from,
          to: range.to,
          insert: Text.of(["", ""])
        },
        range: EditorSelection.cursor(range.from)
      };
    });
    dispatch(state.update(changes, {
      scrollIntoView: true,
      userEvent: "input"
    }));
    return true;
  };
  var transposeChars = function transposeChars(_ref26) {
    var state = _ref26.state,
      dispatch = _ref26.dispatch;
    if (state.readOnly) return false;
    var changes = state.changeByRange(function (range) {
      if (!range.empty || range.from == 0 || range.from == state.doc.length) return {
        range: range
      };
      var pos = range.from,
        line = state.doc.lineAt(pos);
      var from = pos == line.from ? pos - 1 : findClusterBreak2(line.text, pos - line.from, false) + line.from;
      var to = pos == line.to ? pos + 1 : findClusterBreak2(line.text, pos - line.from, true) + line.from;
      return {
        changes: {
          from: from,
          to: to,
          insert: state.doc.slice(pos, to).append(state.doc.slice(from, pos))
        },
        range: EditorSelection.cursor(to)
      };
    });
    if (changes.changes.empty) return false;
    dispatch(state.update(changes, {
      scrollIntoView: true,
      userEvent: "move.character"
    }));
    return true;
  };
  function selectedLineBlocks(state) {
    var blocks = [],
      upto = -1;
    for (var _iterator148 = _createForOfIteratorHelperLoose(state.selection.ranges), _step148; !(_step148 = _iterator148()).done;) {
      var range = _step148.value;
      var startLine = state.doc.lineAt(range.from),
        endLine = state.doc.lineAt(range.to);
      if (!range.empty && range.to == endLine.from) endLine = state.doc.lineAt(range.to - 1);
      if (upto >= startLine.number) {
        var prev = blocks[blocks.length - 1];
        prev.to = endLine.to;
        prev.ranges.push(range);
      } else {
        blocks.push({
          from: startLine.from,
          to: endLine.to,
          ranges: [range]
        });
      }
      upto = endLine.number + 1;
    }
    return blocks;
  }
  function moveLine(state, dispatch, forward) {
    if (state.readOnly) return false;
    var changes = [],
      ranges = [];
    for (var _iterator149 = _createForOfIteratorHelperLoose(selectedLineBlocks(state)), _step149; !(_step149 = _iterator149()).done;) {
      var block = _step149.value;
      if (forward ? block.to == state.doc.length : block.from == 0) continue;
      var nextLine = state.doc.lineAt(forward ? block.to + 1 : block.from - 1);
      var size = nextLine.length + 1;
      if (forward) {
        changes.push({
          from: block.to,
          to: nextLine.to
        }, {
          from: block.from,
          insert: nextLine.text + state.lineBreak
        });
        for (var _iterator150 = _createForOfIteratorHelperLoose(block.ranges), _step150; !(_step150 = _iterator150()).done;) {
          var _r7 = _step150.value;
          ranges.push(EditorSelection.range(Math.min(state.doc.length, _r7.anchor + size), Math.min(state.doc.length, _r7.head + size)));
        }
      } else {
        changes.push({
          from: nextLine.from,
          to: block.from
        }, {
          from: block.to,
          insert: state.lineBreak + nextLine.text
        });
        for (var _iterator151 = _createForOfIteratorHelperLoose(block.ranges), _step151; !(_step151 = _iterator151()).done;) {
          var _r8 = _step151.value;
          ranges.push(EditorSelection.range(_r8.anchor - size, _r8.head - size));
        }
      }
    }
    if (!changes.length) return false;
    dispatch(state.update({
      changes: changes,
      scrollIntoView: true,
      selection: EditorSelection.create(ranges, state.selection.mainIndex),
      userEvent: "move.line"
    }));
    return true;
  }
  var moveLineUp = function moveLineUp(_ref27) {
    var state = _ref27.state,
      dispatch = _ref27.dispatch;
    return moveLine(state, dispatch, false);
  };
  var moveLineDown = function moveLineDown(_ref28) {
    var state = _ref28.state,
      dispatch = _ref28.dispatch;
    return moveLine(state, dispatch, true);
  };
  function copyLine(state, dispatch, forward) {
    if (state.readOnly) return false;
    var changes = [];
    for (var _iterator152 = _createForOfIteratorHelperLoose(selectedLineBlocks(state)), _step152; !(_step152 = _iterator152()).done;) {
      var block = _step152.value;
      if (forward) changes.push({
        from: block.from,
        insert: state.doc.slice(block.from, block.to) + state.lineBreak
      });else changes.push({
        from: block.to,
        insert: state.lineBreak + state.doc.slice(block.from, block.to)
      });
    }
    var changeSet = state.changes(changes);
    dispatch(state.update({
      changes: changeSet,
      selection: state.selection.map(changeSet, forward ? 1 : -1),
      scrollIntoView: true,
      userEvent: "input.copyline"
    }));
    return true;
  }
  var copyLineUp = function copyLineUp(_ref29) {
    var state = _ref29.state,
      dispatch = _ref29.dispatch;
    return copyLine(state, dispatch, false);
  };
  var copyLineDown = function copyLineDown(_ref30) {
    var state = _ref30.state,
      dispatch = _ref30.dispatch;
    return copyLine(state, dispatch, true);
  };
  var deleteLine = function deleteLine(view) {
    if (view.state.readOnly) return false;
    var state = view.state,
      changes = state.changes(selectedLineBlocks(state).map(function (_ref31) {
        var from = _ref31.from,
          to = _ref31.to;
        if (from > 0) from--;else if (to < state.doc.length) to++;
        return {
          from: from,
          to: to
        };
      }));
    var selection = updateSel(state.selection, function (range) {
      var dist2 = void 0;
      if (view.lineWrapping) {
        var block = view.lineBlockAt(range.head),
          pos = view.coordsAtPos(range.head, range.assoc || 1);
        if (pos) dist2 = block.bottom + view.documentTop - pos.bottom + view.defaultLineHeight / 2;
      }
      return view.moveVertically(range, true, dist2);
    }).map(changes);
    view.dispatch({
      changes: changes,
      selection: selection,
      scrollIntoView: true,
      userEvent: "delete.line"
    });
    return true;
  };
  function isBetweenBrackets(state, pos) {
    if (/\(\)|\[\]|\{\}/.test(state.sliceDoc(pos - 1, pos + 1))) return {
      from: pos,
      to: pos
    };
    var context = syntaxTree(state).resolveInner(pos);
    var before = context.childBefore(pos),
      after = context.childAfter(pos),
      closedBy;
    if (before && after && before.to <= pos && after.from >= pos && (closedBy = before.type.prop(NodeProp.closedBy)) && closedBy.indexOf(after.name) > -1 && state.doc.lineAt(before.to).from == state.doc.lineAt(after.from).from && !/\S/.test(state.sliceDoc(before.to, after.from))) return {
      from: before.to,
      to: after.from
    };
    return null;
  }
  var insertNewlineAndIndent = newlineAndIndent(false);
  var insertBlankLine = newlineAndIndent(true);
  function newlineAndIndent(atEof) {
    return function (_ref32) {
      var state = _ref32.state,
        dispatch = _ref32.dispatch;
      if (state.readOnly) return false;
      var changes = state.changeByRange(function (range) {
        var from = range.from,
          to = range.to,
          line = state.doc.lineAt(from);
        var explode = !atEof && from == to && isBetweenBrackets(state, from);
        if (atEof) from = to = (to <= line.to ? line : state.doc.lineAt(to)).to;
        var cx = new IndentContext(state, {
          simulateBreak: from,
          simulateDoubleBreak: !!explode
        });
        var indent = getIndentation(cx, from);
        if (indent == null) indent = _countColumn(/^\s*/.exec(state.doc.lineAt(from).text)[0], state.tabSize);
        while (to < line.to && /\s/.test(line.text[to - line.from])) to++;
        if (explode) {
          from = explode.from;
          to = explode.to;
        } else if (from > line.from && from < line.from + 100 && !/\S/.test(line.text.slice(0, from))) from = line.from;
        var insert2 = ["", indentString(state, indent)];
        if (explode) insert2.push(indentString(state, cx.lineIndent(line.from, -1)));
        return {
          changes: {
            from: from,
            to: to,
            insert: Text.of(insert2)
          },
          range: EditorSelection.cursor(from + 1 + insert2[1].length)
        };
      });
      dispatch(state.update(changes, {
        scrollIntoView: true,
        userEvent: "input"
      }));
      return true;
    };
  }
  function changeBySelectedLine(state, f) {
    var atLine = -1;
    return state.changeByRange(function (range) {
      var changes = [];
      for (var pos = range.from; pos <= range.to;) {
        var line = state.doc.lineAt(pos);
        if (line.number > atLine && (range.empty || range.to > line.from)) {
          f(line, changes, range);
          atLine = line.number;
        }
        pos = line.to + 1;
      }
      var changeSet = state.changes(changes);
      return {
        changes: changes,
        range: EditorSelection.range(changeSet.mapPos(range.anchor, 1), changeSet.mapPos(range.head, 1))
      };
    });
  }
  var indentSelection = function indentSelection(_ref33) {
    var state = _ref33.state,
      dispatch = _ref33.dispatch;
    if (state.readOnly) return false;
    var updated = Object.create(null);
    var context = new IndentContext(state, {
      overrideIndentation: function overrideIndentation(start) {
        var found = updated[start];
        return found == null ? -1 : found;
      }
    });
    var changes = changeBySelectedLine(state, function (line, changes2, range) {
      var indent = getIndentation(context, line.from);
      if (indent == null) return;
      if (!/\S/.test(line.text)) indent = 0;
      var cur = /^\s*/.exec(line.text)[0];
      var norm = indentString(state, indent);
      if (cur != norm || range.from < line.from + cur.length) {
        updated[line.from] = indent;
        changes2.push({
          from: line.from,
          to: line.from + cur.length,
          insert: norm
        });
      }
    });
    if (!changes.changes.empty) dispatch(state.update(changes, {
      userEvent: "indent"
    }));
    return true;
  };
  var indentMore = function indentMore(_ref34) {
    var state = _ref34.state,
      dispatch = _ref34.dispatch;
    if (state.readOnly) return false;
    dispatch(state.update(changeBySelectedLine(state, function (line, changes) {
      changes.push({
        from: line.from,
        insert: state.facet(indentUnit)
      });
    }), {
      userEvent: "input.indent"
    }));
    return true;
  };
  var indentLess = function indentLess(_ref35) {
    var state = _ref35.state,
      dispatch = _ref35.dispatch;
    if (state.readOnly) return false;
    dispatch(state.update(changeBySelectedLine(state, function (line, changes) {
      var space = /^\s*/.exec(line.text)[0];
      if (!space) return;
      var col = _countColumn(space, state.tabSize),
        keep = 0;
      var insert2 = indentString(state, Math.max(0, col - getIndentUnit(state)));
      while (keep < space.length && keep < insert2.length && space.charCodeAt(keep) == insert2.charCodeAt(keep)) keep++;
      changes.push({
        from: line.from + keep,
        to: line.from + space.length,
        insert: insert2.slice(keep)
      });
    }), {
      userEvent: "delete.dedent"
    }));
    return true;
  };
  var toggleTabFocusMode = function toggleTabFocusMode(view) {
    view.setTabFocusMode();
    return true;
  };
  var emacsStyleKeymap = [{
    key: "Ctrl-b",
    run: cursorCharLeft,
    shift: selectCharLeft,
    preventDefault: true
  }, {
    key: "Ctrl-f",
    run: cursorCharRight,
    shift: selectCharRight
  }, {
    key: "Ctrl-p",
    run: cursorLineUp,
    shift: selectLineUp
  }, {
    key: "Ctrl-n",
    run: cursorLineDown,
    shift: selectLineDown
  }, {
    key: "Ctrl-a",
    run: cursorLineStart,
    shift: selectLineStart
  }, {
    key: "Ctrl-e",
    run: cursorLineEnd,
    shift: selectLineEnd
  }, {
    key: "Ctrl-d",
    run: deleteCharForward
  }, {
    key: "Ctrl-h",
    run: deleteCharBackward
  }, {
    key: "Ctrl-k",
    run: deleteToLineEnd
  }, {
    key: "Ctrl-Alt-h",
    run: deleteGroupBackward
  }, {
    key: "Ctrl-o",
    run: splitLine
  }, {
    key: "Ctrl-t",
    run: transposeChars
  }, {
    key: "Ctrl-v",
    run: cursorPageDown
  }];
  var standardKeymap = [{
    key: "ArrowLeft",
    run: cursorCharLeft,
    shift: selectCharLeft,
    preventDefault: true
  }, {
    key: "Mod-ArrowLeft",
    mac: "Alt-ArrowLeft",
    run: cursorGroupLeft,
    shift: selectGroupLeft,
    preventDefault: true
  }, {
    mac: "Cmd-ArrowLeft",
    run: cursorLineBoundaryLeft,
    shift: selectLineBoundaryLeft,
    preventDefault: true
  }, {
    key: "ArrowRight",
    run: cursorCharRight,
    shift: selectCharRight,
    preventDefault: true
  }, {
    key: "Mod-ArrowRight",
    mac: "Alt-ArrowRight",
    run: cursorGroupRight,
    shift: selectGroupRight,
    preventDefault: true
  }, {
    mac: "Cmd-ArrowRight",
    run: cursorLineBoundaryRight,
    shift: selectLineBoundaryRight,
    preventDefault: true
  }, {
    key: "ArrowUp",
    run: cursorLineUp,
    shift: selectLineUp,
    preventDefault: true
  }, {
    mac: "Cmd-ArrowUp",
    run: cursorDocStart,
    shift: selectDocStart
  }, {
    mac: "Ctrl-ArrowUp",
    run: cursorPageUp,
    shift: selectPageUp
  }, {
    key: "ArrowDown",
    run: cursorLineDown,
    shift: selectLineDown,
    preventDefault: true
  }, {
    mac: "Cmd-ArrowDown",
    run: cursorDocEnd,
    shift: selectDocEnd
  }, {
    mac: "Ctrl-ArrowDown",
    run: cursorPageDown,
    shift: selectPageDown
  }, {
    key: "PageUp",
    run: cursorPageUp,
    shift: selectPageUp
  }, {
    key: "PageDown",
    run: cursorPageDown,
    shift: selectPageDown
  }, {
    key: "Home",
    run: cursorLineBoundaryBackward,
    shift: selectLineBoundaryBackward,
    preventDefault: true
  }, {
    key: "Mod-Home",
    run: cursorDocStart,
    shift: selectDocStart
  }, {
    key: "End",
    run: cursorLineBoundaryForward,
    shift: selectLineBoundaryForward,
    preventDefault: true
  }, {
    key: "Mod-End",
    run: cursorDocEnd,
    shift: selectDocEnd
  }, {
    key: "Enter",
    run: insertNewlineAndIndent,
    shift: insertNewlineAndIndent
  }, {
    key: "Mod-a",
    run: selectAll
  }, {
    key: "Backspace",
    run: deleteCharBackward,
    shift: deleteCharBackward,
    preventDefault: true
  }, {
    key: "Delete",
    run: deleteCharForward,
    preventDefault: true
  }, {
    key: "Mod-Backspace",
    mac: "Alt-Backspace",
    run: deleteGroupBackward,
    preventDefault: true
  }, {
    key: "Mod-Delete",
    mac: "Alt-Delete",
    run: deleteGroupForward,
    preventDefault: true
  }, {
    mac: "Mod-Backspace",
    run: deleteLineBoundaryBackward,
    preventDefault: true
  }, {
    mac: "Mod-Delete",
    run: deleteLineBoundaryForward,
    preventDefault: true
  }].concat(emacsStyleKeymap.map(function (b) {
    return {
      mac: b.key,
      run: b.run,
      shift: b.shift
    };
  }));
  var defaultKeymap = [{
    key: "Alt-ArrowLeft",
    mac: "Ctrl-ArrowLeft",
    run: cursorSyntaxLeft,
    shift: selectSyntaxLeft
  }, {
    key: "Alt-ArrowRight",
    mac: "Ctrl-ArrowRight",
    run: cursorSyntaxRight,
    shift: selectSyntaxRight
  }, {
    key: "Alt-ArrowUp",
    run: moveLineUp
  }, {
    key: "Shift-Alt-ArrowUp",
    run: copyLineUp
  }, {
    key: "Alt-ArrowDown",
    run: moveLineDown
  }, {
    key: "Shift-Alt-ArrowDown",
    run: copyLineDown
  }, {
    key: "Mod-Alt-ArrowUp",
    run: addCursorAbove
  }, {
    key: "Mod-Alt-ArrowDown",
    run: addCursorBelow
  }, {
    key: "Escape",
    run: simplifySelection
  }, {
    key: "Mod-Enter",
    run: insertBlankLine
  }, {
    key: "Alt-l",
    mac: "Ctrl-l",
    run: selectLine
  }, {
    key: "Mod-i",
    run: selectParentSyntax,
    preventDefault: true
  }, {
    key: "Mod-[",
    run: indentLess
  }, {
    key: "Mod-]",
    run: indentMore
  }, {
    key: "Mod-Alt-\\",
    run: indentSelection
  }, {
    key: "Shift-Mod-k",
    run: deleteLine
  }, {
    key: "Shift-Mod-\\",
    run: cursorMatchingBracket
  }, {
    key: "Mod-/",
    run: toggleComment
  }, {
    key: "Alt-A",
    mac: "Ctrl-A",
    run: toggleBlockComment
  }, {
    key: "Ctrl-m",
    mac: "Shift-Alt-m",
    run: toggleTabFocusMode
  }].concat(standardKeymap);
  var HIGHLIGHT_LINE_LIMIT = 2048;
  var STATE_LINE_LIMIT = 4096;
  var REFRESH_DELAY = 180;
  var classes = {
    comment: "cm-mobile-comment",
    keyword: "cm-mobile-keyword",
    number: "cm-mobile-number",
    string: "cm-mobile-string",
    heading: "cm-mobile-heading",
    tag: "cm-mobile-tag",
    attribute: "cm-mobile-attribute",
    property: "cm-mobile-property",
    fence: "cm-mobile-fence",
    link: "cm-mobile-link"
  };
  function add(tokens, from, to, kind) {
    if (tokens && to > from) tokens.push({
      from: from,
      to: to,
      kind: kind
    });
  }
  function lineEnd(text, at) {
    var end = text.indexOf("\n", at);
    return end < 0 ? text.length : end;
  }
  function unescapedDelimiter(text, delimiter) {
    var at = text.indexOf(delimiter);
    while (at >= 0) {
      var escapes = 0;
      for (var before = at - 1; before >= 0 && text[before] === "\\"; before--) escapes++;
      if (escapes % 2 === 0) return true;
      at = text.indexOf(delimiter, at + 1);
    }
    return false;
  }
  function skipJavascriptTail(state, tail) {
    if (state === "comment" && tail.includes("*/")) return "normal";
    if (state === "template" && unescapedDelimiter(tail, "`")) return "normal";
    if (state === "single" && unescapedDelimiter(tail, "'")) return "normal";
    if (state === "double" && unescapedDelimiter(tail, '"')) return "normal";
    return state === "line-comment" ? "normal" : state;
  }
  function skipCssTail(state, tail) {
    if (state === "comment" && tail.includes("*/")) return "normal";
    if (state === "single" && unescapedDelimiter(tail, "'")) return "normal";
    if (state === "double" && unescapedDelimiter(tail, '"')) return "normal";
    return state;
  }
  function javascriptState(prefix) {
    var state = "normal";
    var blankLine = true;
    for (var at = 0; at < prefix.length;) {
      if (state === "normal") {
        var next = prefix.length;
        for (var _i69 = 0, _arr3 = ["/", "`", '"', "'"]; _i69 < _arr3.length; _i69++) {
          var marker = _arr3[_i69];
          var found = prefix.indexOf(marker, at);
          if (found >= 0 && found < next) next = found;
        }
        if (next > at) {
          at = next;
          continue;
        }
      }
      var end = lineEnd(prefix, at);
      if ((at === 0 || prefix[at - 1] === "\n") && end - at > STATE_LINE_LIMIT) {
        state = skipJavascriptTail(state, prefix.slice(at, end));
        at = end + (end < prefix.length ? 1 : 0);
        blankLine = false;
        continue;
      }
      if (state === "template" && blankLine && (at === 0 || prefix[at - 1] === "\n")) {
        var line = prefix.slice(at, prefix.indexOf("\n", at) < 0 ? prefix.length : prefix.indexOf("\n", at));
        if (/^\s*(?:export\s+|import\s+|(?:async\s+)?function\s+|class\s+|(?:const|let|var)\s+)/.test(line)) state = "normal";
      }
      if (state === "comment") {
        var end2 = prefix.indexOf("*/", at);
        if (end2 < 0) return state;
        state = "normal";
        at = end2 + 2;
      } else if (state === "line-comment") {
        var _end = prefix.indexOf("\n", at);
        if (_end < 0) return "normal";
        state = "normal";
        at = _end + 1;
      } else if (state === "template" || state === "single" || state === "double") {
        var quote = state === "template" ? "`" : state === "single" ? "'" : '"';
        if (prefix[at] === "\\") at += 2;else if (prefix[at++] === quote) state = "normal";else if (prefix[at - 1] === "\n") {
          blankLine = prefix.slice(Math.max(0, prefix.lastIndexOf("\n", at - 2) + 1), at - 1).trim().length === 0;
          if (quote !== "`") state = "normal";
        }
      } else if (prefix.startsWith("/*", at)) {
        state = "comment";
        at += 2;
      } else if (prefix.startsWith("//", at)) {
        state = "line-comment";
        at += 2;
      } else if (prefix[at] === "`") {
        state = "template";
        at++;
      } else if (prefix[at] === "'") {
        state = "single";
        at++;
      } else if (prefix[at] === '"') {
        state = "double";
        at++;
      } else {
        if (prefix[at] === "\n") {
          var start = prefix.lastIndexOf("\n", at - 1) + 1;
          blankLine = prefix.slice(start, at).trim().length === 0;
        }
        at++;
      }
    }
    return state === "comment" || state === "template" ? state : "normal";
  }
  function javascriptInitial(prefix, text) {
    var state = javascriptState(prefix);
    if (state !== "normal") return state;
    var commentClose = text.indexOf("*/");
    var commentOpen = text.indexOf("/*");
    if (commentClose >= 0 && (commentOpen < 0 || commentClose < commentOpen)) return "comment";
    var synchronization = /\n\s*\n\s*(?:export\s+|import\s+|(?:async\s+)?function\s+|class\s+|(?:const|let|var)\s+)/.exec(text);
    var sample = text.slice(0, synchronization ? synchronization.index : text.length);
    var delimiters = 0;
    for (var at = 0; at < sample.length; at++) {
      if (sample[at] === "\\") at++;else if (sample[at] === "`") delimiters++;
    }
    return delimiters % 2 ? "template" : "normal";
  }
  var jsKeywords = new Set("async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch throw try typeof var void while with yield".split(" "));
  function javascriptScan(text, offset, initial, emit) {
    if (initial === void 0) {
      initial = "normal";
    }
    if (emit === void 0) {
      emit = true;
    }
    var tokens = emit ? [] : null;
    var state = initial;
    var blankLine = true;
    var at = 0;
    while (at < text.length) {
      if (!emit && state === "normal") {
        var next = text.length;
        for (var _i70 = 0, _arr4 = ["/", "`", '"', "'"]; _i70 < _arr4.length; _i70++) {
          var marker = _arr4[_i70];
          var found = text.indexOf(marker, at);
          if (found >= 0 && found < next) next = found;
        }
        if (next > at) {
          at = next;
          continue;
        }
      }
      var start = at;
      if (state === "template" && blankLine && (at === 0 || text[at - 1] === "\n")) {
        var lineEnd2 = text.indexOf("\n", at);
        var line = text.slice(at, lineEnd2 < 0 ? text.length : lineEnd2);
        if (/^\s*(?:export\s+|import\s+|(?:async\s+)?function\s+|class\s+|(?:const|let|var)\s+)/.test(line)) state = "normal";
      }
      if (state === "comment") {
        var end = text.indexOf("*/", at);
        at = end < 0 ? text.length : end + 2;
        add(tokens, offset + start, offset + at, "comment");
        if (end >= 0) state = "normal";
      } else if (state === "template") {
        while (at < text.length) {
          if (text[at] === "\\") {
            at += 2;
            continue;
          }
          if (text[at] === "`") {
            at++;
            state = "normal";
            break;
          }
          if (text[at] === "\n") {
            var lineStart = text.lastIndexOf("\n", at - 1) + 1;
            blankLine = text.slice(lineStart, at).trim().length === 0;
          }
          at++;
          if (blankLine && at < text.length && (at === 0 || text[at - 1] === "\n")) break;
        }
        add(tokens, offset + start, offset + at, "string");
      } else if (text.startsWith("/*", at)) {
        state = "comment";
      } else if (text.startsWith("//", at)) {
        at = text.indexOf("\n", at);
        if (at < 0) at = text.length;
        add(tokens, offset + start, offset + at, "comment");
      } else if (text[at] === "`" || text[at] === '"' || text[at] === "'") {
        var quote = text[at++];
        while (at < text.length) {
          if (text[at] === "\\") at += 2;else if (text[at++] === quote) break;else if (quote !== "`" && text[at - 1] === "\n") break;
        }
        if (quote === "`" && text[at - 1] !== "`") state = "template";
        add(tokens, offset + start, offset + Math.min(at, text.length), "string");
      } else if (/[A-Za-z_$]/.test(text[at])) {
        while (at < text.length && /[\w$]/.test(text[at])) at++;
        if (jsKeywords.has(text.slice(start, at))) add(tokens, offset + start, offset + at, "keyword");
      } else if (/\d/.test(text[at])) {
        while (at < text.length && new RegExp("[\\w.xob_]", "i").test(text[at])) at++;
        add(tokens, offset + start, offset + at, "number");
      } else {
        if (text[at] === "\n") {
          var _lineStart = text.lastIndexOf("\n", at - 1) + 1;
          blankLine = text.slice(_lineStart, at).trim().length === 0;
        }
        at++;
      }
    }
    return {
      tokens: tokens || [],
      state: state
    };
  }
  function cssState(prefix) {
    var state = "normal";
    for (var at = 0; at < prefix.length;) {
      if (state === "normal") {
        var next = prefix.length;
        for (var _i71 = 0, _arr5 = ["/", '"', "'"]; _i71 < _arr5.length; _i71++) {
          var marker = _arr5[_i71];
          var found = prefix.indexOf(marker, at);
          if (found >= 0 && found < next) next = found;
        }
        if (next > at) {
          at = next;
          continue;
        }
      }
      var end = lineEnd(prefix, at);
      if ((at === 0 || prefix[at - 1] === "\n") && end - at > STATE_LINE_LIMIT) {
        state = skipCssTail(state, prefix.slice(at, end));
        at = end + (end < prefix.length ? 1 : 0);
        continue;
      }
      if (state === "comment") {
        var end2 = prefix.indexOf("*/", at);
        if (end2 < 0) return state;
        state = "normal";
        at = end2 + 2;
      } else if (state === "single" || state === "double") {
        var quote = state === "single" ? "'" : '"';
        if (prefix[at] === "\\") at += 2;else if (prefix[at++] === quote) state = "normal";
      } else if (prefix.startsWith("/*", at)) {
        state = "comment";
        at += 2;
      } else if (prefix[at] === "'") {
        state = "single";
        at++;
      } else if (prefix[at] === '"') {
        state = "double";
        at++;
      } else at++;
    }
    return state;
  }
  function cssInitial(prefix, text) {
    var state = cssState(prefix);
    if (state !== "normal") return state;
    var close = text.indexOf("*/");
    var open = text.indexOf("/*");
    return close >= 0 && (open < 0 || close < open) ? "comment" : "normal";
  }
  function cssScan(text, offset, initial, emit) {
    if (initial === void 0) {
      initial = "normal";
    }
    if (emit === void 0) {
      emit = true;
    }
    var tokens = emit ? [] : null;
    var state = initial;
    var at = 0;
    while (at < text.length) {
      if (!emit && state === "normal") {
        var next = text.length;
        for (var _i72 = 0, _arr6 = ["/", '"', "'"]; _i72 < _arr6.length; _i72++) {
          var marker = _arr6[_i72];
          var found = text.indexOf(marker, at);
          if (found >= 0 && found < next) next = found;
        }
        if (next > at) {
          at = next;
          continue;
        }
      }
      var start = at;
      if (state === "comment") {
        var end = text.indexOf("*/", at);
        at = end < 0 ? text.length : end + 2;
        add(tokens, offset + start, offset + at, "comment");
        if (end >= 0) state = "normal";
      } else if (state === "single" || state === "double") {
        var quote = state === "single" ? "'" : '"';
        while (at < text.length) {
          if (text[at] === "\\") at += 2;else if (text[at++] === quote) {
            state = "normal";
            break;
          }
        }
        add(tokens, offset + start, offset + Math.min(at, text.length), "string");
      } else if (text.startsWith("/*", at)) {
        state = "comment";
      } else if (text[at] === '"' || text[at] === "'") {
        var _quote = text[at++];
        state = _quote === "'" ? "single" : "double";
        while (at < text.length) {
          if (text[at] === "\\") at += 2;else if (text[at++] === _quote) {
            state = "normal";
            break;
          }
        }
        add(tokens, offset + start, offset + Math.min(at, text.length), "string");
      } else if (text[at] === "@") {
        while (++at < text.length && /[-\w]/.test(text[at])) {}
        add(tokens, offset + start, offset + at, "keyword");
      } else if (text[at] === "#" || /\d/.test(text[at])) {
        while (++at < text.length && /[-\w.%]/.test(text[at])) {}
        add(tokens, offset + start, offset + at, "number");
      } else if (/[A-Za-z_-]/.test(text[at])) {
        while (++at < text.length && /[-\w]/.test(text[at])) {}
        var _next4 = at;
        while (/\s/.test(text[_next4] || "")) _next4++;
        if (text[_next4] === ":") add(tokens, offset + start, offset + at, "property");
      } else at++;
    }
    return {
      tokens: tokens || [],
      state: state
    };
  }
  function markdownFence(prefix) {
    var fence = null;
    var at = 0;
    while (at <= prefix.length) {
      var end = lineEnd(prefix, at);
      var source = prefix.slice(at, end);
      var line = source.length > STATE_LINE_LIMIT ? source.slice(0, STATE_LINE_LIMIT) : source;
      var match = /^\s*(```+|~~~+)\s*([\w-]*)/.exec(line);
      if (match && (!fence || match[1][0] === fence.marker && match[1].length >= fence.length)) {
        fence = fence ? null : {
          marker: match[1][0],
          length: match[1].length,
          language: match[2].toLowerCase(),
          inner: "normal"
        };
      } else if (fence && /^(js|javascript|ts|typescript)$/.test(fence.language)) {
        fence.inner = javascriptScan(line, 0, fence.inner, false).state;
      } else if (fence && fence.language === "css") {
        fence.inner = cssScan(line, 0, fence.inner, false).state;
      }
      if (end === prefix.length) break;
      at = end + 1;
    }
    return fence;
  }
  function markdownScan(text, offset, initialFence, emit) {
    if (emit === void 0) {
      emit = true;
    }
    var tokens = emit ? [] : null;
    var fence = initialFence;
    var at = 0;
    for (var _iterator153 = _createForOfIteratorHelperLoose(text.split("\n")), _step153; !(_step153 = _iterator153()).done;) {
      var line = _step153.value;
      var end = at + line.length;
      var marker = /^\s*(```+|~~~+)\s*([\w-]*)/.exec(line);
      if (marker && (!fence || marker[1][0] === fence.marker && marker[1].length >= fence.length)) {
        add(tokens, offset + at, offset + end, "fence");
        fence = fence ? null : {
          marker: marker[1][0],
          length: marker[1].length,
          language: marker[2].toLowerCase(),
          inner: "normal"
        };
      } else if (fence) {
        if (/^(js|javascript|ts|typescript)$/.test(fence.language)) {
          var result = javascriptScan(line, offset + at, fence.inner, emit);
          if (tokens) tokens.push.apply(tokens, result.tokens);
          fence.inner = result.state;
        } else if (fence.language === "css") {
          var _result = cssScan(line, offset + at, fence.inner, emit);
          if (tokens) tokens.push.apply(tokens, _result.tokens);
          fence.inner = _result.state;
        } else if (/^(html|xml)$/.test(fence.language) && tokens) tokens.push.apply(tokens, htmlTokens(line, offset + at));else add(tokens, offset + at, offset + end, "string");
      } else {
        var heading2 = /^\s{0,3}#{1,6}\s/.exec(line);
        if (heading2) add(tokens, offset + at, offset + end, "heading");
        var inline = new RegExp("`[^`]+`|!?\\[[^\\]]+\\]\\([^\\s)]+\\)", "g");
        var match = void 0;
        while (match = inline.exec(line)) add(tokens, offset + at + match.index, offset + at + match.index + match[0].length, match[0][0] === "`" ? "string" : "link");
      }
      at = end + 1;
    }
    return {
      tokens: tokens || [],
      state: fence
    };
  }
  function htmlState(prefix) {
    var latest = function latest(value) {
      return Math.max(prefix.lastIndexOf(value), prefix.lastIndexOf(value.toUpperCase()));
    };
    var candidates = [{
      mode: "comment",
      open: prefix.lastIndexOf("<!--"),
      close: prefix.lastIndexOf("-->")
    }, {
      mode: "javascript",
      open: latest("<script"),
      close: latest("<\/script")
    }, {
      mode: "css",
      open: latest("<style"),
      close: latest("</style")
    }].filter(function (candidate) {
      return candidate.open > candidate.close;
    }).sort(function (left, right) {
      return right.open - left.open;
    });
    if (!candidates.length) return {
      mode: "normal",
      inner: "normal"
    };
    var current = candidates[0];
    if (current.mode === "comment") return {
      mode: "comment",
      inner: "normal"
    };
    var content2 = prefix.indexOf(">", current.open) + 1;
    var inner = (current.mode === "javascript" ? javascriptScan : cssScan)(prefix.slice(content2), 0, "normal", false).state;
    return {
      mode: current.mode,
      inner: inner
    };
  }
  function htmlInitial(prefix, text) {
    var state = htmlState(prefix);
    if (state.mode !== "normal") return state;
    var lower = text.toLowerCase();
    var candidates = [{
      close: "-->",
      open: "<!--",
      mode: "comment"
    }, {
      close: "<\/script",
      open: "<script",
      mode: "javascript"
    }, {
      close: "</style",
      open: "<style",
      mode: "css"
    }];
    for (var _i73 = 0, _candidates = candidates; _i73 < _candidates.length; _i73++) {
      var candidate = _candidates[_i73];
      var close = lower.indexOf(candidate.close);
      var open = lower.indexOf(candidate.open);
      if (close >= 0 && (open < 0 || close < open)) {
        return {
          mode: candidate.mode,
          inner: "normal"
        };
      }
    }
    return state;
  }
  function htmlScan(text, offset, initial, emit) {
    if (initial === void 0) {
      initial = {
        mode: "normal",
        inner: "normal"
      };
    }
    if (emit === void 0) {
      emit = true;
    }
    var tokens = emit ? [] : null;
    var state = typeof initial === "string" ? {
      mode: initial,
      inner: "normal"
    } : initial;
    var at = 0;
    var lower = text.toLowerCase();
    while (at < text.length) {
      if (state.mode === "comment") {
        var end = text.indexOf("-->", at);
        var to = end < 0 ? text.length : end + 3;
        add(tokens, offset + at, offset + to, "comment");
        at = to;
        if (end >= 0) state = {
          mode: "normal",
          inner: "normal"
        };
      } else if (state.mode === "javascript" || state.mode === "css") {
        var close = lower.indexOf(state.mode === "javascript" ? "<\/script" : "</style", at);
        var _to3 = close < 0 ? text.length : close;
        var result = (state.mode === "javascript" ? javascriptScan : cssScan)(text.slice(at, _to3), offset + at, state.inner, emit);
        if (tokens) tokens.push.apply(tokens, result.tokens);
        state.inner = result.state;
        at = _to3;
        if (close >= 0) state = {
          mode: "normal",
          inner: "normal"
        };
      } else if (text.startsWith("<!--", at)) {
        state = {
          mode: "comment",
          inner: "normal"
        };
      } else if (text[at] === "<") {
        var _end2 = text.indexOf(">", at + 1);
        var _to4 = _end2 < 0 ? text.length : _end2 + 1;
        var tag = /^<\/?\s*[-\w:]+/.exec(text.slice(at, _to4));
        if (tag) add(tokens, offset + at, offset + at + tag[0].length, "tag");
        var attributes = new RegExp("\\s([-:\\w]+)(?=\\s*=)", "g");
        var source = text.slice(at, _to4);
        var match = void 0;
        while (match = attributes.exec(source)) add(tokens, offset + at + match.index + 1, offset + at + match.index + 1 + match[1].length, "attribute");
        if (new RegExp("^<script\\b", "i").test(text.slice(at, _to4))) state = {
          mode: "javascript",
          inner: "normal"
        };
        if (new RegExp("^<style\\b", "i").test(text.slice(at, _to4))) state = {
          mode: "css",
          inner: "normal"
        };
        at = _to4;
      } else at++;
    }
    return {
      tokens: tokens || [],
      state: state
    };
  }
  function htmlTokens(text, offset, initial) {
    if (initial === void 0) {
      initial = {
        mode: "normal",
        inner: "normal"
      };
    }
    return htmlScan(text, offset, initial).tokens;
  }
  function initialState(mode, prefix, text) {
    if (mode === "javascript") return javascriptInitial(prefix, text);
    if (mode === "css") return cssInitial(prefix, text);
    if (mode === "markdown") return markdownFence(prefix);
    return htmlInitial(prefix, text);
  }
  function scanMode(mode, text, offset, state, emit) {
    if (emit === void 0) {
      emit = true;
    }
    if (mode === "javascript") return javascriptScan(text, offset, state, emit);
    if (mode === "css") return cssScan(text, offset, state, emit);
    if (mode === "markdown") return markdownScan(text, offset, state, emit);
    return htmlScan(text, offset, state, emit);
  }
  function skipLongTail(mode, state, tail) {
    if (mode === "javascript") return skipJavascriptTail(state, tail);
    if (mode === "css") return skipCssTail(state, tail);
    if (mode === "markdown") {
      if (!state) return state;
      if (/^(js|javascript|ts|typescript)$/.test(state.language)) state.inner = skipJavascriptTail(state.inner, tail);else if (state.language === "css") state.inner = skipCssTail(state.inner, tail);
      return state;
    }
    if (state.mode === "comment" && tail.includes("-->")) return {
      mode: "normal",
      inner: "normal"
    };
    if (state.mode === "javascript") {
      if (tail.toLowerCase().includes("<\/script")) return {
        mode: "normal",
        inner: "normal"
      };
      state.inner = skipJavascriptTail(state.inner, tail);
    } else if (state.mode === "css") {
      if (tail.toLowerCase().includes("</style")) return {
        mode: "normal",
        inner: "normal"
      };
      state.inner = skipCssTail(state.inner, tail);
    }
    return state;
  }
  function tokensFor(view, mode) {
    var doc2 = view.state.doc;
    var tokens = [];
    var parsedChars = 0;
    var stateChars = 0;
    var skippedHighlightChars = 0;
    for (var _iterator154 = _createForOfIteratorHelperLoose(view.visibleRanges), _step154; !(_step154 = _iterator154()).done;) {
      var visible = _step154.value;
      var firstLine = doc2.lineAt(visible.from);
      var lastLine = doc2.lineAt(visible.to);
      var prefix = doc2.sliceString(0, firstLine.from);
      var firstText = doc2.sliceString(firstLine.from, Math.min(firstLine.to, firstLine.from + HIGHLIGHT_LINE_LIMIT));
      var state = initialState(mode, prefix, firstText);
      stateChars += prefix.length;
      for (var number2 = firstLine.number; number2 <= lastLine.number; number2++) {
        var line = doc2.line(number2);
        var length = Math.min(line.length, HIGHLIGHT_LINE_LIMIT);
        var text = doc2.sliceString(line.from, line.from + length);
        var result = scanMode(mode, text, line.from, state);
        tokens.push.apply(tokens, result.tokens);
        state = result.state;
        parsedChars += text.length;
        if (line.length > length) {
          var tail = doc2.sliceString(line.from + length, line.to);
          state = skipLongTail(mode, state, tail);
          skippedHighlightChars += tail.length;
        }
      }
    }
    tokens.sort(function (left, right) {
      return left.from - right.from || left.to - right.to;
    });
    return {
      tokens: tokens,
      parsedChars: parsedChars,
      stateChars: stateChars,
      skippedHighlightChars: skippedHighlightChars
    };
  }
  function decorationsFor(tokens) {
    var builder = new RangeSetBuilder();
    var end = -1;
    for (var _iterator155 = _createForOfIteratorHelperLoose(tokens), _step155; !(_step155 = _iterator155()).done;) {
      var token = _step155.value;
      if (token.from < end) continue;
      builder.add(token.from, token.to, Decoration.mark({
        class: classes[token.kind]
      }));
      end = token.to;
    }
    return builder.finish();
  }
  function mobileSyntax(mode, report) {
    return ViewPlugin.fromClass(function () {
      function _class4(view) {
        var _this70 = this;
        this.view = view;
        this.decorations = Decoration.none;
        this.scrollPending = false;
        this.refreshPending = false;
        this.refreshTimer = 0;
        this.onScroll = function () {
          if (_this70.scrollPending) return;
          _this70.scrollPending = true;
          requestAnimationFrame(function () {
            _this70.scrollPending = false;
            _this70.clearAndSchedule();
          });
        };
        view.scrollDOM.addEventListener("scroll", this.onScroll);
        this.schedule();
      }
      var _proto109 = _class4.prototype;
      _proto109.update = function update(_update10) {
        if (this.refreshPending) {
          this.refreshPending = false;
          this.refresh(_update10.view);
        } else if (_update10.docChanged || _update10.viewportChanged) {
          if (_update10.docChanged) this.decorations = this.decorations.map(_update10.changes);
          this.schedule();
        }
      };
      _proto109.clearAndSchedule = function clearAndSchedule() {
        this.schedule();
      };
      _proto109.schedule = function schedule() {
        var _this71 = this;
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.refreshTimer = setTimeout(function () {
          _this71.refreshTimer = 0;
          _this71.refreshPending = true;
          _this71.view.dispatch({
            selection: {
              anchor: _this71.view.state.selection.main.head
            }
          });
        }, REFRESH_DELAY);
      };
      _proto109.destroy = function destroy() {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);
        this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
      };
      _proto109.refresh = function refresh(view) {
        var start = performance.now();
        var result = tokensFor(view, mode);
        this.decorations = decorationsFor(result.tokens);
        report({
          mode: mode,
          documentLines: view.state.doc.lines,
          visibleRanges: view.visibleRanges.length,
          retainedTokens: result.tokens.length,
          parsedChars: result.parsedChars,
          stateChars: result.stateChars,
          skippedHighlightChars: result.skippedHighlightChars,
          updateMilliseconds: performance.now() - start
        });
      };
      return _class4;
    }(), {
      decorations: function decorations(value) {
        return value.decorations;
      }
    });
  }
  var mobileSyntaxTheme = EditorView.baseTheme({
    ".cm-mobile-comment": {
      color: "#708090",
      fontStyle: "italic"
    },
    ".cm-mobile-keyword": {
      color: "#c678dd"
    },
    ".cm-mobile-number": {
      color: "#d19a66"
    },
    ".cm-mobile-string": {
      color: "#98c379"
    },
    ".cm-mobile-heading": {
      color: "#61afef",
      fontWeight: "700"
    },
    ".cm-mobile-tag": {
      color: "#e06c75"
    },
    ".cm-mobile-attribute": {
      color: "#d19a66"
    },
    ".cm-mobile-property": {
      color: "#56b6c2"
    },
    ".cm-mobile-fence": {
      color: "#abb2bf",
      backgroundColor: "#30343c"
    },
    ".cm-mobile-link": {
      color: "#61afef",
      textDecoration: "underline"
    }
  });
  var nativeCaret = EditorView.theme({
    "&.cm-focused .cm-content, &.cm-focused .cm-line": {
      caretColor: "#528bff !important"
    },
    ".cm-cursorLayer": {
      display: "none"
    }
  });
  var fixtureNames = {
    javascript: "JavaScript",
    css: "CSS",
    markdown: "Markdown",
    html: "HTML + CSS + JS"
  };
  var workspace = document.getElementById("workspace");
  var tabs = document.createElement("nav");
  var surface = document.createElement("div");
  var status = document.createElement("div");
  var records = [];
  var active = 0;
  tabs.className = "file-tabs";
  tabs.setAttribute("aria-label", "Large syntax fixtures");
  surface.className = "mobile-syntax-editor";
  status.className = "mobile-syntax-status";
  status.setAttribute("role", "status");
  workspace.append(tabs, surface, status);
  function showStats(record, stats) {
    record.stats = stats;
    status.textContent = record.name + ": " + stats.documentLines + " lines \xB7 " + stats.retainedTokens + " retained tokens \xB7 " + stats.parsedChars + " visible chars \xB7 " + stats.stateChars + " state chars \xB7 " + stats.skippedHighlightChars + " skipped chars \xB7 " + stats.updateMilliseconds.toFixed(1) + " ms";
    status.getBoundingClientRect();
  }
  function ensureView(index) {
    var record = records[index];
    if (record.view) return record.view;
    if (record.text === null) throw new Error(record.name + " fixture has not loaded");
    record.view = new EditorView({
      doc: record.text,
      extensions: [lineNumbers(), history(), keymap.of([].concat(defaultKeymap, historyKeymap)), mobileSyntax(record.mode, function (stats) {
        return showStats(record, stats);
      }), mobileSyntaxTheme, nativeCaret, EditorView.lineWrapping],
      parent: surface
    });
    record.view.dom.setAttribute("data-mode", record.mode);
    return record.view;
  }
  function activate(index) {
    var _records$active;
    if ((_records$active = records[active]) != null && _records$active.view) records[active].view.dom.setAttribute("hidden", "");
    active = index;
    records.forEach(function (record, position) {
      return record.button.setAttribute("aria-selected", String(position === index));
    });
    var view = ensureView(index);
    view.dom.removeAttribute("hidden");
    if (records[index].stats) showStats(records[index], records[index].stats);
  }
  Object.entries(fixtureNames).forEach(function (_ref36, index) {
    var mode = _ref36[0],
      name2 = _ref36[1];
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("data-index", String(index));
    button.textContent = name2;
    button.setAttribute("aria-selected", String(index === 0));
    tabs.appendChild(button);
    records.push({
      mode: mode,
      name: name2,
      text: null,
      button: button,
      view: null,
      stats: null
    });
  });
  tabs.addEventListener("click", function (event) {
    var target = event.target;
    var index = Number(target == null ? void 0 : target.getAttribute("data-index"));
    if (Number.isInteger(index) && records[index]) activate(index);
  });
  globalThis.loadMobileFixture = function loadMobileFixture(payload) {
    var modes = {
      j: "javascript",
      c: "css",
      m: "markdown",
      h: "html"
    };
    var mode = modes[payload.charAt(0)];
    var index = -1;
    for (var position = 0; position < records.length; position++) {
      if (records[position].mode === mode) {
        index = position;
        break;
      }
    }
    if (index < 0) throw new Error("Unknown mobile syntax fixture");
    records[index].text = payload.slice(1);
    if (index === active && !records[index].view) ensureView(index);
    return mode;
  };
  globalThis.mobileSyntaxExample = {
    activate: activate,
    names: records.map(function (record) {
      return record.name;
    }),
    stats: function stats(index) {
      if (index === void 0) {
        index = active;
      }
      return records[index].stats;
    },
    view: function view(index) {
      if (index === void 0) {
        index = active;
      }
      return ensureView(index);
    }
  };
  globalThis.__wwcResult = function () {
    return "CodeMirror:mobile-syntax:" + records.length;
  };
})();