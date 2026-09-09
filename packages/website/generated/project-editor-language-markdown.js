function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _inheritsLoose(t, o) { t.prototype = Object.create(o.prototype), t.prototype.constructor = t, _setPrototypeOf(t, o); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _createForOfIteratorHelperLoose(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (t) return (t = t.call(r)).next.bind(t); if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var o = 0; return function () { return o >= r.length ? { done: !0 } : { done: !1, value: r[o++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
(function (require, _Ze) {
  var T = require("@codemirror/state"),
    ZO = require("@codemirror/view"),
    Z = require("@codemirror/language"),
    ra = require("@codemirror/autocomplete");
  var X = require("@lezer/common"),
    g = require("@lezer/highlight"),
    cO = function () {
      function O(e, t, a, r, i, n, l) {
        this.type = e, this.value = t, this.from = a, this.hash = r, this.end = i, this.children = n, this.positions = l, this.hashProp = [[X.NodeProp.contextHash, r]];
      }
      O.create = function create(e, t, a, r, i) {
        var n = r + (r << 8) + e + (t << 4) | 0;
        return new O(e, t, a, n, i, [], []);
      };
      var _proto = O.prototype;
      _proto.addChild = function addChild(e, t) {
        e.prop(X.NodeProp.contextHash) != this.hash && (e = new X.Tree(e.type, e.children, e.positions, e.length, this.hashProp)), this.children.push(e), this.positions.push(t);
      };
      _proto.toTree = function toTree(e, t) {
        var _this = this;
        if (t === void 0) {
          t = this.end;
        }
        var a = this.children.length - 1;
        return a >= 0 && (t = Math.max(t, this.positions[a] + this.children[a].length + this.from)), new X.Tree(e.types[this.type], this.children, this.positions, t - this.from).balance({
          makeTree: function makeTree(r, i, n) {
            return new X.Tree(X.NodeType.none, r, i, n, _this.hashProp);
          }
        });
      };
      return O;
    }(),
    u;
  (function (O) {
    O[O.Document = 1] = "Document", O[O.CodeBlock = 2] = "CodeBlock", O[O.FencedCode = 3] = "FencedCode", O[O.Blockquote = 4] = "Blockquote", O[O.HorizontalRule = 5] = "HorizontalRule", O[O.BulletList = 6] = "BulletList", O[O.OrderedList = 7] = "OrderedList", O[O.ListItem = 8] = "ListItem", O[O.ATXHeading1 = 9] = "ATXHeading1", O[O.ATXHeading2 = 10] = "ATXHeading2", O[O.ATXHeading3 = 11] = "ATXHeading3", O[O.ATXHeading4 = 12] = "ATXHeading4", O[O.ATXHeading5 = 13] = "ATXHeading5", O[O.ATXHeading6 = 14] = "ATXHeading6", O[O.SetextHeading1 = 15] = "SetextHeading1", O[O.SetextHeading2 = 16] = "SetextHeading2", O[O.HTMLBlock = 17] = "HTMLBlock", O[O.LinkReference = 18] = "LinkReference", O[O.Paragraph = 19] = "Paragraph", O[O.CommentBlock = 20] = "CommentBlock", O[O.ProcessingInstructionBlock = 21] = "ProcessingInstructionBlock", O[O.Escape = 22] = "Escape", O[O.Entity = 23] = "Entity", O[O.HardBreak = 24] = "HardBreak", O[O.Emphasis = 25] = "Emphasis", O[O.StrongEmphasis = 26] = "StrongEmphasis", O[O.Link = 27] = "Link", O[O.Image = 28] = "Image", O[O.InlineCode = 29] = "InlineCode", O[O.HTMLTag = 30] = "HTMLTag", O[O.Comment = 31] = "Comment", O[O.ProcessingInstruction = 32] = "ProcessingInstruction", O[O.Autolink = 33] = "Autolink", O[O.HeaderMark = 34] = "HeaderMark", O[O.QuoteMark = 35] = "QuoteMark", O[O.ListMark = 36] = "ListMark", O[O.LinkMark = 37] = "LinkMark", O[O.EmphasisMark = 38] = "EmphasisMark", O[O.CodeMark = 39] = "CodeMark", O[O.CodeText = 40] = "CodeText", O[O.CodeInfo = 41] = "CodeInfo", O[O.LinkTitle = 42] = "LinkTitle", O[O.LinkLabel = 43] = "LinkLabel", O[O.URL = 44] = "URL";
  })(u || (u = {}));
  var bO = function bO(e, t) {
      this.start = e, this.content = t, this.marks = [], this.parsers = [];
    },
    xO = function () {
      function xO() {
        this.text = "", this.baseIndent = 0, this.basePos = 0, this.depth = 0, this.markers = [], this.pos = 0, this.indent = 0, this.next = -1;
      }
      var _proto2 = xO.prototype;
      _proto2.forward = function forward() {
        this.basePos > this.pos && this.forwardInner();
      };
      _proto2.forwardInner = function forwardInner() {
        var e = this.skipSpace(this.basePos);
        this.indent = this.countIndent(e, this.pos, this.indent), this.pos = e, this.next = e == this.text.length ? -1 : this.text.charCodeAt(e);
      };
      _proto2.skipSpace = function skipSpace(e) {
        return H(this.text, e);
      };
      _proto2.reset = function reset(e) {
        for (this.text = e, this.baseIndent = this.basePos = this.pos = this.indent = 0, this.forwardInner(), this.depth = 1; this.markers.length;) this.markers.pop();
      };
      _proto2.moveBase = function moveBase(e) {
        this.basePos = e, this.baseIndent = this.countIndent(e, this.pos, this.indent);
      };
      _proto2.moveBaseColumn = function moveBaseColumn(e) {
        this.baseIndent = e, this.basePos = this.findColumn(e);
      };
      _proto2.addMarker = function addMarker(e) {
        this.markers.push(e);
      };
      _proto2.countIndent = function countIndent(e, t, a) {
        if (t === void 0) {
          t = 0;
        }
        if (a === void 0) {
          a = 0;
        }
        for (var r = t; r < e; r++) a += this.text.charCodeAt(r) == 9 ? 4 - a % 4 : 1;
        return a;
      };
      _proto2.findColumn = function findColumn(e) {
        var t = 0;
        for (var a = 0; t < this.text.length && a < e; t++) a += this.text.charCodeAt(t) == 9 ? 4 - a % 4 : 1;
        return t;
      };
      _proto2.scrub = function scrub() {
        if (!this.baseIndent) return this.text;
        var e = "";
        for (var t = 0; t < this.basePos; t++) e += " ";
        return e + this.text.slice(this.basePos);
      };
      return xO;
    }();
  function ce(O, e, t) {
    if (t.pos == t.text.length || O != e.block && t.indent >= e.stack[t.depth + 1].value + t.baseIndent) return !0;
    if (t.indent >= t.baseIndent + 4) return !1;
    var a = (O.type == u.OrderedList ? WO : VO)(t, e, !1);
    return a > 0 && (O.type != u.BulletList || qO(t, e, !1) < 0) && t.text.charCodeAt(t.pos + a - 1) == O.value;
  }
  var Ze = (_Ze = {}, _Ze[u.Blockquote] = function (O, e, t) {
    return t.next != 62 ? !1 : (t.markers.push(P(u.QuoteMark, e.lineStart + t.pos, e.lineStart + t.pos + 1)), t.moveBase(t.pos + (V(t.text.charCodeAt(t.pos + 1)) ? 2 : 1)), O.end = e.lineStart + t.text.length, !0);
  }, _Ze[u.ListItem] = function (O, e, t) {
    return t.indent < t.baseIndent + O.value && t.next > -1 ? !1 : (t.moveBaseColumn(t.baseIndent + O.value), !0);
  }, _Ze[u.OrderedList] = ce, _Ze[u.BulletList] = ce, _Ze[u.Document] = function () {
    return !0;
  }, _Ze);
  function V(O) {
    return O == 32 || O == 9 || O == 10 || O == 13;
  }
  function H(O, e) {
    if (e === void 0) {
      e = 0;
    }
    for (; e < O.length && V(O.charCodeAt(e));) e++;
    return e;
  }
  function pe(O, e, t) {
    for (; e > t && V(O.charCodeAt(e - 1));) e--;
    return e;
  }
  function Xe(O) {
    if (O.next != 96 && O.next != 126) return -1;
    var e = O.pos + 1;
    for (; e < O.text.length && O.text.charCodeAt(e) == O.next;) e++;
    if (e < O.pos + 3) return -1;
    if (O.next == 96) {
      for (var t = e; t < O.text.length; t++) if (O.text.charCodeAt(t) == 96) return -1;
    }
    return e;
  }
  function ke(O) {
    return O.next != 62 ? -1 : O.text.charCodeAt(O.pos + 1) == 32 ? 2 : 1;
  }
  function qO(O, e, t) {
    if (O.next != 42 && O.next != 45 && O.next != 95) return -1;
    var a = 1;
    for (var r = O.pos + 1; r < O.text.length; r++) {
      var i = O.text.charCodeAt(r);
      if (i == O.next) a++;else if (!V(i)) return -1;
    }
    return t && O.next == 45 && ye(O) > -1 && O.depth == e.stack.length && e.parser.leafBlockParsers.indexOf(je.SetextHeading) > -1 || a < 3 ? -1 : 1;
  }
  function be(O, e) {
    for (var t = O.stack.length - 1; t >= 0; t--) if (O.stack[t].type == e) return !0;
    return !1;
  }
  function VO(O, e, t) {
    return (O.next == 45 || O.next == 43 || O.next == 42) && (O.pos == O.text.length - 1 || V(O.text.charCodeAt(O.pos + 1))) && (!t || be(e, u.BulletList) || O.skipSpace(O.pos + 2) < O.text.length) ? 1 : -1;
  }
  function WO(O, e, t) {
    var a = O.pos,
      r = O.next;
    for (; r >= 48 && r <= 57;) {
      a++;
      if (a == O.text.length) return -1;
      r = O.text.charCodeAt(a);
    }
    return a == O.pos || a > O.pos + 9 || r != 46 && r != 41 || a < O.text.length - 1 && !V(O.text.charCodeAt(a + 1)) || t && !be(e, u.OrderedList) && (O.skipSpace(a + 1) == O.text.length || a > O.pos + 1 || O.next != 49) ? -1 : a + 1 - O.pos;
  }
  function xe(O) {
    if (O.next != 35) return -1;
    var e = O.pos + 1;
    for (; e < O.text.length && O.text.charCodeAt(e) == 35;) e++;
    if (e < O.text.length && O.text.charCodeAt(e) != 32) return -1;
    var t = e - O.pos;
    return t > 6 ? -1 : t;
  }
  function ye(O) {
    if (O.next != 45 && O.next != 61 || O.indent >= O.baseIndent + 4) return -1;
    var e = O.pos + 1;
    for (; e < O.text.length && O.text.charCodeAt(e) == O.next;) e++;
    var t = e;
    for (; e < O.text.length && V(O.text.charCodeAt(e));) e++;
    return e == O.text.length ? t : -1;
  }
  var yO = /^[ \t]*$/,
    we = /-->/,
    Te = /\?>/,
    wO = [[new RegExp("^<(?:script|pre|style)(?:\\s|>|$)", "i"), new RegExp("<\\/(?:script|pre|style)>", "i")], [/^\s*<!--/, we], [/^\s*<\?/, Te], [/^\s*<![A-Z]/, />/], [/^\s*<!\[CDATA\[/, /\]\]>/], [new RegExp("^\\s*<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\\s|\\/?>|$)", "i"), yO], [new RegExp("^\\s*(?:<\\/[a-z][\\w-]*\\s*>|<[a-z][\\w-]*(\\s+[a-z:_][\\w.\\-]*(?:\\s*=\\s*(?:[^\\s\"'=<>`]+|'[^']*'|\"[^\"]*\"))?)*\\s*>)\\s*$", "i"), yO]];
  function Ye(O, e, t) {
    if (O.next != 60) return -1;
    var a = O.text.slice(O.pos);
    for (var r = 0, i = wO.length - (t ? 1 : 0); r < i; r++) if (wO[r][0].test(a)) return r;
    return -1;
  }
  function ue(O, e) {
    var t = O.countIndent(e, O.pos, O.indent),
      a = O.skipSpace(e),
      r = O.countIndent(a, e, t);
    return r >= t + 5 || a == O.text.length ? t + 1 : r;
  }
  function E(O, e, t) {
    var a = O.length - 1;
    a >= 0 && O[a].to == e && O[a].type == u.CodeText ? O[a].to = t : O.push(P(u.CodeText, e, t));
  }
  var oO = {
      LinkReference: void 0,
      IndentedCode: function IndentedCode(O, e) {
        var t = e.baseIndent + 4;
        if (e.indent < t) return !1;
        var a = e.findColumn(t),
          r = O.lineStart + a,
          i = O.lineStart + e.text.length,
          n = [],
          l = [];
        for (E(n, r, i); O.nextLine() && e.depth >= O.stack.length;) if (e.pos == e.text.length) {
          E(l, O.lineStart - 1, O.lineStart);
          for (var _iterator = _createForOfIteratorHelperLoose(e.markers), _step; !(_step = _iterator()).done;) {
            var s = _step.value;
            l.push(s);
          }
        } else {
          if (e.indent < t) break;
          {
            if (l.length) {
              for (var _iterator2 = _createForOfIteratorHelperLoose(l), _step2; !(_step2 = _iterator2()).done;) {
                var Q = _step2.value;
                Q.type == u.CodeText ? E(n, Q.from, Q.to) : n.push(Q);
              }
              l = [];
            }
            E(n, O.lineStart - 1, O.lineStart);
            for (var _iterator3 = _createForOfIteratorHelperLoose(e.markers), _step3; !(_step3 = _iterator3()).done;) {
              var _Q = _step3.value;
              n.push(_Q);
            }
            i = O.lineStart + e.text.length;
            var _s = O.lineStart + e.findColumn(e.baseIndent + 4);
            _s < i && E(n, _s, i);
          }
        }
        return l.length && (l = l.filter(function (s) {
          return s.type != u.CodeText;
        }), l.length && (e.markers = l.concat(e.markers))), O.addNode(O.buffer.writeElements(n, -r).finish(u.CodeBlock, i - r), r), !0;
      },
      FencedCode: function FencedCode(O, e) {
        var t = Xe(e);
        if (t < 0) return !1;
        var a = O.lineStart + e.pos,
          r = e.next,
          i = t - e.pos,
          n = e.skipSpace(t),
          l = pe(e.text, e.text.length, n),
          s = [P(u.CodeMark, a, a + i)];
        n < l && s.push(P(u.CodeInfo, O.lineStart + n, O.lineStart + l));
        for (var Q = !0, o = !0, c = !1; O.nextLine() && e.depth >= O.stack.length; Q = !1) {
          var p = e.pos;
          if (e.indent - e.baseIndent < 4) for (; p < e.text.length && e.text.charCodeAt(p) == r;) p++;
          if (p - e.pos >= i && e.skipSpace(p) == e.text.length) {
            for (var _iterator4 = _createForOfIteratorHelperLoose(e.markers), _step4; !(_step4 = _iterator4()).done;) {
              var $ = _step4.value;
              s.push($);
            }
            o && c && E(s, O.lineStart - 1, O.lineStart), s.push(P(u.CodeMark, O.lineStart + e.pos, O.lineStart + p)), O.nextLine();
            break;
          } else {
            c = !0, Q || (E(s, O.lineStart - 1, O.lineStart), o = !1);
            for (var _iterator5 = _createForOfIteratorHelperLoose(e.markers), _step5; !(_step5 = _iterator5()).done;) {
              var m = _step5.value;
              s.push(m);
            }
            var _$ = O.lineStart + e.basePos,
              h = O.lineStart + e.text.length;
            _$ < h && (E(s, _$, h), o = !1);
          }
        }
        return O.addNode(O.buffer.writeElements(s, -a).finish(u.FencedCode, O.prevLineEnd() - a), a), !0;
      },
      Blockquote: function Blockquote(O, e) {
        var t = ke(e);
        return t < 0 ? !1 : (O.startContext(u.Blockquote, e.pos), O.addNode(u.QuoteMark, O.lineStart + e.pos, O.lineStart + e.pos + 1), e.moveBase(e.pos + t), null);
      },
      HorizontalRule: function HorizontalRule(O, e) {
        if (qO(e, O, !1) < 0) return !1;
        var t = O.lineStart + e.pos;
        return O.nextLine(), O.addNode(u.HorizontalRule, t), !0;
      },
      BulletList: function BulletList(O, e) {
        var t = VO(e, O, !1);
        if (t < 0) return !1;
        O.block.type != u.BulletList && O.startContext(u.BulletList, e.basePos, e.next);
        var a = ue(e, e.pos + 1);
        return O.startContext(u.ListItem, e.basePos, a - e.baseIndent), O.addNode(u.ListMark, O.lineStart + e.pos, O.lineStart + e.pos + t), e.moveBaseColumn(a), null;
      },
      OrderedList: function OrderedList(O, e) {
        var t = WO(e, O, !1);
        if (t < 0) return !1;
        O.block.type != u.OrderedList && O.startContext(u.OrderedList, e.basePos, e.text.charCodeAt(e.pos + t - 1));
        var a = ue(e, e.pos + t);
        return O.startContext(u.ListItem, e.basePos, a - e.baseIndent), O.addNode(u.ListMark, O.lineStart + e.pos, O.lineStart + e.pos + t), e.moveBaseColumn(a), null;
      },
      ATXHeading: function ATXHeading(O, e) {
        var t = xe(e);
        if (t < 0) return !1;
        var a = e.pos,
          r = O.lineStart + a,
          i = pe(e.text, e.text.length, a),
          n = i;
        for (; n > a && e.text.charCodeAt(n - 1) == e.next;) n--;
        (n == i || n == a || !V(e.text.charCodeAt(n - 1))) && (n = e.text.length);
        var l = O.buffer.write(u.HeaderMark, 0, t).writeElements(O.parser.parseInline(e.text.slice(a + t + 1, n), r + t + 1), -r);
        n < e.text.length && l.write(u.HeaderMark, n - a, i - a);
        var s = l.finish(u.ATXHeading1 - 1 + t, e.text.length - a);
        return O.nextLine(), O.addNode(s, r), !0;
      },
      HTMLBlock: function HTMLBlock(O, e) {
        var t = Ye(e, O, !1);
        if (t < 0) return !1;
        var a = O.lineStart + e.pos,
          r = wO[t][1],
          i = [],
          n = r != yO;
        for (; !r.test(e.text) && O.nextLine();) {
          if (e.depth < O.stack.length) {
            n = !1;
            break;
          }
          for (var _iterator6 = _createForOfIteratorHelperLoose(e.markers), _step6; !(_step6 = _iterator6()).done;) {
            var Q = _step6.value;
            i.push(Q);
          }
        }
        n && O.nextLine();
        var l = r == we ? u.CommentBlock : r == Te ? u.ProcessingInstructionBlock : u.HTMLBlock,
          s = O.prevLineEnd();
        return O.addNode(O.buffer.writeElements(i, -a).finish(l, s - a), a), !0;
      },
      SetextHeading: void 0
    },
    TO = function () {
      function TO(e) {
        this.stage = 0, this.elts = [], this.pos = 0, this.start = e.start, this.advance(e.content);
      }
      var _proto3 = TO.prototype;
      _proto3.nextLine = function nextLine(e, t, a) {
        if (this.stage == -1) return !1;
        var r = a.content + "\n" + t.scrub(),
          i = this.advance(r);
        return i > -1 && i < r.length ? this.complete(e, a, i) : !1;
      };
      _proto3.finish = function finish(e, t) {
        return (this.stage == 2 || this.stage == 3) && H(t.content, this.pos) == t.content.length ? this.complete(e, t, t.content.length) : !1;
      };
      _proto3.complete = function complete(e, t, a) {
        return e.addLeafElement(t, P(u.LinkReference, this.start, this.start + a, this.elts)), !0;
      };
      _proto3.nextStage = function nextStage(e) {
        return e ? (this.pos = e.to - this.start, this.elts.push(e), this.stage++, !0) : (e === !1 && (this.stage = -1), !1);
      };
      _proto3.advance = function advance(e) {
        for (;;) {
          if (this.stage == -1) return -1;
          if (this.stage == 0) {
            if (!this.nextStage(We(e, this.pos, this.start, !0))) return -1;
            if (e.charCodeAt(this.pos) != 58) return this.stage = -1;
            this.elts.push(P(u.LinkMark, this.pos + this.start, this.pos + this.start + 1)), this.pos++;
          } else if (this.stage == 1) {
            if (!this.nextStage(qe(e, H(e, this.pos), this.start))) return -1;
          } else if (this.stage == 2) {
            var t = H(e, this.pos),
              a = 0;
            if (t > this.pos) {
              var r = Ve(e, t, this.start);
              if (r) {
                var i = XO(e, r.to - this.start);
                i > 0 && (this.nextStage(r), a = i);
              }
            }
            return a || (a = XO(e, this.pos)), a > 0 && a < e.length ? a : -1;
          } else return XO(e, this.pos);
        }
      };
      return TO;
    }();
  function XO(O, e) {
    for (; e < O.length; e++) {
      var t = O.charCodeAt(e);
      if (t == 10) break;
      if (!V(t)) return -1;
    }
    return e;
  }
  var YO = function () {
      function YO() {}
      var _proto4 = YO.prototype;
      _proto4.nextLine = function nextLine(e, t, a) {
        var r = t.depth < e.stack.length ? -1 : ye(t),
          i = t.next;
        if (r < 0) return !1;
        var n = P(u.HeaderMark, e.lineStart + t.pos, e.lineStart + r);
        return e.nextLine(), e.addLeafElement(a, P(i == 61 ? u.SetextHeading1 : u.SetextHeading2, a.start, e.prevLineEnd(), [].concat(e.parser.parseInline(a.content, a.start), [n]))), !0;
      };
      _proto4.finish = function finish() {
        return !1;
      };
      return YO;
    }(),
    je = {
      LinkReference: function LinkReference(O, e) {
        return e.content.charCodeAt(0) == 91 ? new TO(e) : null;
      },
      SetextHeading: function SetextHeading() {
        return new YO();
      }
    },
    $a = [function (O, e) {
      return xe(e) >= 0;
    }, function (O, e) {
      return Xe(e) >= 0;
    }, function (O, e) {
      return ke(e) >= 0;
    }, function (O, e) {
      return VO(e, O, !0) >= 0;
    }, function (O, e) {
      return WO(e, O, !0) >= 0;
    }, function (O, e) {
      return qO(e, O, !0) >= 0;
    }, function (O, e) {
      return Ye(e, O, !0) >= 0;
    }],
    fa = {
      text: "",
      end: 0
    },
    jO = function () {
      function jO(e, t, a, r) {
        this.parser = e, this.input = t, this.ranges = r, this.line = new xO(), this.atEnd = !1, this.reusePlaceholders = new Map(), this.stoppedAt = null, this.rangeI = 0, this.to = r[r.length - 1].to, this.lineStart = this.absoluteLineStart = this.absoluteLineEnd = r[0].from, this.block = cO.create(u.Document, 0, this.lineStart, 0, 0), this.stack = [this.block], this.fragments = a.length ? new RO(a, t) : null, this.readLine();
      }
      var _proto5 = jO.prototype;
      _proto5.advance = function advance() {
        if (this.stoppedAt != null && this.absoluteLineStart > this.stoppedAt) return this.finish();
        var e = this.line;
        for (;;) {
          for (var a = 0;;) {
            var r = e.depth < this.stack.length ? this.stack[this.stack.length - 1] : null;
            for (; a < e.markers.length && (!r || e.markers[a].from < r.end);) {
              var i = e.markers[a++];
              this.addNode(i.type, i.from, i.to);
            }
            if (!r) break;
            this.finishContext();
          }
          if (e.pos < e.text.length) break;
          if (!this.nextLine()) return this.finish();
        }
        if (this.fragments && this.reuseFragment(e.basePos)) return null;
        O: for (;;) {
          for (var _iterator7 = _createForOfIteratorHelperLoose(this.parser.blockParsers), _step7; !(_step7 = _iterator7()).done;) {
            var _a2 = _step7.value;
            if (_a2) {
              var _r2 = _a2(this, e);
              if (_r2 != !1) {
                if (_r2 == !0) return null;
                e.forward();
                continue O;
              }
            }
          }
          break;
        }
        if (e.pos == e.text.length) return this.nextLine() ? null : this.finish();
        var t = new bO(this.lineStart + e.pos, e.text.slice(e.pos));
        for (var _iterator8 = _createForOfIteratorHelperLoose(this.parser.leafBlockParsers), _step8; !(_step8 = _iterator8()).done;) {
          var _a6 = _step8.value;
          if (_a6) {
            var _r3 = _a6(this, t);
            _r3 && t.parsers.push(_r3);
          }
        }
        O: for (; this.nextLine() && e.pos != e.text.length;) {
          if (e.indent < e.baseIndent + 4) {
            for (var _iterator9 = _createForOfIteratorHelperLoose(this.parser.endLeafBlock), _step9; !(_step9 = _iterator9()).done;) {
              var _a3 = _step9.value;
              if (_a3(this, e, t)) break O;
            }
          }
          for (var _iterator0 = _createForOfIteratorHelperLoose(t.parsers), _step0; !(_step0 = _iterator0()).done;) {
            var _a4 = _step0.value;
            if (_a4.nextLine(this, e, t)) return null;
          }
          t.content += "\n" + e.scrub();
          for (var _iterator1 = _createForOfIteratorHelperLoose(e.markers), _step1; !(_step1 = _iterator1()).done;) {
            var _a5 = _step1.value;
            t.marks.push(_a5);
          }
        }
        return this.finishLeaf(t), null;
      };
      _proto5.stopAt = function stopAt(e) {
        if (this.stoppedAt != null && this.stoppedAt < e) throw new RangeError("Can't move stoppedAt forward");
        this.stoppedAt = e;
      };
      _proto5.reuseFragment = function reuseFragment(e) {
        if (!this.fragments.moveTo(this.absoluteLineStart + e, this.absoluteLineStart) || !this.fragments.matches(this.block.hash)) return !1;
        var t = this.fragments.takeNodes(this);
        return t ? (this.absoluteLineStart += t, this.lineStart = Ge(this.absoluteLineStart, this.ranges), this.moveRangeI(), this.absoluteLineStart < this.to ? (this.lineStart++, this.absoluteLineStart++, this.readLine()) : (this.atEnd = !0, this.readLine()), !0) : !1;
      };
      _proto5.parentType = function parentType(e) {
        if (e === void 0) {
          e = this.depth - 1;
        }
        return this.parser.nodeSet.types[this.stack[e].type];
      };
      _proto5.nextLine = function nextLine() {
        return this.lineStart += this.line.text.length, this.absoluteLineEnd >= this.to ? (this.absoluteLineStart = this.absoluteLineEnd, this.atEnd = !0, this.readLine(), !1) : (this.lineStart++, this.absoluteLineStart = this.absoluteLineEnd + 1, this.moveRangeI(), this.readLine(), !0);
      };
      _proto5.peekLine = function peekLine() {
        return this.scanLine(this.absoluteLineEnd + 1).text;
      };
      _proto5.moveRangeI = function moveRangeI() {
        for (; this.rangeI < this.ranges.length - 1 && this.absoluteLineStart >= this.ranges[this.rangeI].to;) this.rangeI++, this.absoluteLineStart = Math.max(this.absoluteLineStart, this.ranges[this.rangeI].from);
      };
      _proto5.scanLine = function scanLine(e) {
        var t = fa;
        if (t.end = e, e >= this.to) t.text = "";else if (t.text = this.lineChunkAt(e), t.end += t.text.length, this.ranges.length > 1) {
          var a = this.absoluteLineStart,
            r = this.rangeI;
          for (; this.ranges[r].to < t.end;) {
            r++;
            var i = this.ranges[r].from,
              n = this.lineChunkAt(i);
            t.end = i + n.length, t.text = t.text.slice(0, this.ranges[r - 1].to - a) + n, a = t.end - t.text.length;
          }
        }
        return t;
      };
      _proto5.readLine = function readLine() {
        var e = this.line,
          _this$scanLine = this.scanLine(this.absoluteLineStart),
          t = _this$scanLine.text,
          a = _this$scanLine.end;
        for (this.absoluteLineEnd = a, e.reset(t); e.depth < this.stack.length; e.depth++) {
          var r = this.stack[e.depth],
            i = this.parser.skipContextMarkup[r.type];
          if (!i) throw new Error("Unhandled block context " + u[r.type]);
          var n = this.line.markers.length;
          if (!i(r, this, e)) {
            this.line.markers.length > n && (r.end = this.line.markers[this.line.markers.length - 1].to), e.forward();
            break;
          }
          e.forward();
        }
      };
      _proto5.lineChunkAt = function lineChunkAt(e) {
        var t = this.input.chunk(e),
          a;
        if (this.input.lineChunks) a = t == "\n" ? "" : t;else {
          var r = t.indexOf("\n");
          a = r < 0 ? t : t.slice(0, r);
        }
        return e + a.length > this.to ? a.slice(0, this.to - e) : a;
      };
      _proto5.prevLineEnd = function prevLineEnd() {
        return this.atEnd ? this.lineStart : this.lineStart - 1;
      };
      _proto5.startContext = function startContext(e, t, a) {
        if (a === void 0) {
          a = 0;
        }
        this.block = cO.create(e, a, this.lineStart + t, this.block.hash, this.lineStart + this.line.text.length), this.stack.push(this.block);
      };
      _proto5.startComposite = function startComposite(e, t, a) {
        if (a === void 0) {
          a = 0;
        }
        this.startContext(this.parser.getNodeType(e), t, a);
      };
      _proto5.addNode = function addNode(e, t, a) {
        typeof e == "number" && (e = new X.Tree(this.parser.nodeSet.types[e], D, D, (a != null ? a : this.prevLineEnd()) - t)), this.block.addChild(e, t - this.block.from);
      };
      _proto5.addElement = function addElement(e) {
        this.block.addChild(e.toTree(this.parser.nodeSet), e.from - this.block.from);
      };
      _proto5.addLeafElement = function addLeafElement(e, t) {
        this.addNode(this.buffer.writeElements(_O(t.children, e.marks), -t.from).finish(t.type, t.to - t.from), t.from);
      };
      _proto5.finishContext = function finishContext() {
        var e = this.stack.pop(),
          t = this.stack[this.stack.length - 1];
        t.addChild(e.toTree(this.parser.nodeSet), e.from - t.from), this.block = t;
      };
      _proto5.finish = function finish() {
        for (; this.stack.length > 1;) this.finishContext();
        return this.addGaps(this.block.toTree(this.parser.nodeSet, this.lineStart));
      };
      _proto5.addGaps = function addGaps(e) {
        return this.ranges.length > 1 ? ve(this.ranges, 0, e.topNode, this.ranges[0].from, this.reusePlaceholders) : e;
      };
      _proto5.finishLeaf = function finishLeaf(e) {
        for (var _iterator10 = _createForOfIteratorHelperLoose(e.parsers), _step10; !(_step10 = _iterator10()).done;) {
          var a = _step10.value;
          if (a.finish(this, e)) return;
        }
        var t = _O(this.parser.parseInline(e.content, e.start), e.marks);
        this.addNode(this.buffer.writeElements(t, -e.start).finish(u.Paragraph, e.content.length), e.start);
      };
      _proto5.elt = function elt(e, t, a, r) {
        return typeof e == "string" ? P(this.parser.getNodeType(e), t, a, r) : new uO(e, t);
      };
      return _createClass(jO, [{
        key: "parsedPos",
        get: function get() {
          return this.absoluteLineStart;
        }
      }, {
        key: "depth",
        get: function get() {
          return this.stack.length;
        }
      }, {
        key: "buffer",
        get: function get() {
          return new pO(this.parser.nodeSet);
        }
      }]);
    }();
  function ve(O, e, t, a, r) {
    var i = O[e].to,
      n = [],
      l = [],
      s = t.from + a;
    function Q(o, c) {
      for (; c ? o >= i : o > i;) {
        var p = O[e + 1].from - i;
        a += p, o += p, e++, i = O[e].to;
      }
    }
    for (var o = t.firstChild; o; o = o.nextSibling) {
      Q(o.from + a, !0);
      var c = o.from + a,
        p = void 0,
        $ = r.get(o.tree);
      $ ? p = $ : o.to + a > i ? (p = ve(O, e, o, a, r), Q(o.to + a, !1)) : p = o.toTree(), n.push(p), l.push(c - s);
    }
    return Q(t.to + a, !1), new X.Tree(t.type, n, l, t.to + a - s, t.tree ? t.tree.propValues : void 0);
  }
  var eO = function (_X$Parser) {
    function O(e, t, a, r, i, n, l, s, Q) {
      var _this2;
      _this2 = _X$Parser.call(this) || this, _this2.nodeSet = e, _this2.blockParsers = t, _this2.leafBlockParsers = a, _this2.blockNames = r, _this2.endLeafBlock = i, _this2.skipContextMarkup = n, _this2.inlineParsers = l, _this2.inlineNames = s, _this2.wrappers = Q, _this2.nodeTypes = Object.create(null);
      for (var _iterator11 = _createForOfIteratorHelperLoose(e.types), _step11; !(_step11 = _iterator11()).done;) {
        var o = _step11.value;
        _this2.nodeTypes[o.name] = o.id;
      }
      return _this2;
    }
    _inheritsLoose(O, _X$Parser);
    var _proto6 = O.prototype;
    _proto6.createParse = function createParse(e, t, a) {
      var r = new jO(this, e, t, a);
      for (var _iterator12 = _createForOfIteratorHelperLoose(this.wrappers), _step12; !(_step12 = _iterator12()).done;) {
        var i = _step12.value;
        r = i(r, e, t, a);
      }
      return r;
    };
    _proto6.configure = function configure(e) {
      var _a7;
      var t = vO(e);
      if (!t) return this;
      var a = this.nodeSet,
        r = this.skipContextMarkup,
        i = this.blockParsers.slice(),
        n = this.leafBlockParsers.slice(),
        l = this.blockNames.slice(),
        s = this.inlineParsers.slice(),
        Q = this.inlineNames.slice(),
        o = this.endLeafBlock.slice(),
        c = this.wrappers;
      if (K(t.defineNodes)) {
        r = Object.assign({}, r);
        var p = a.types.slice(),
          $;
        var _loop = function _loop() {
          var h = _step13.value;
          var _ref = typeof h == "string" ? {
              name: h
            } : h,
            m = _ref.name,
            w = _ref.block,
            b = _ref.composite,
            Y = _ref.style;
          if (p.some(function (A) {
            return A.name == m;
          })) return 1;
          b && (r[p.length] = function (A, F, da) {
            return b(F, da, A.value);
          });
          var x = p.length,
            U = b ? ["Block", "BlockContext"] : w ? x >= u.ATXHeading1 && x <= u.SetextHeading2 ? ["Block", "LeafBlock", "Heading"] : ["Block", "LeafBlock"] : void 0;
          p.push(X.NodeType.define({
            id: x,
            name: m,
            props: U && [[X.NodeProp.group, U]]
          })), Y && ($ || ($ = {}), Array.isArray(Y) || Y instanceof g.Tag ? $[m] = Y : Object.assign($, Y));
        };
        for (var _iterator13 = _createForOfIteratorHelperLoose(t.defineNodes), _step13; !(_step13 = _iterator13()).done;) {
          if (_loop()) continue;
        }
        a = new X.NodeSet(p), $ && (a = a.extend((0, g.styleTags)($)));
      }
      if (K(t.props) && (a = (_a7 = a).extend.apply(_a7, t.props)), K(t.remove)) {
        for (var _iterator14 = _createForOfIteratorHelperLoose(t.remove), _step14; !(_step14 = _iterator14()).done;) {
          var _p = _step14.value;
          var _$2 = this.blockNames.indexOf(_p),
            h = this.inlineNames.indexOf(_p);
          _$2 > -1 && (i[_$2] = n[_$2] = void 0), h > -1 && (s[h] = void 0);
        }
      }
      if (K(t.parseBlock)) {
        for (var _iterator15 = _createForOfIteratorHelperLoose(t.parseBlock), _step15; !(_step15 = _iterator15()).done;) {
          var _p2 = _step15.value;
          var _$3 = l.indexOf(_p2.name);
          if (_$3 > -1) i[_$3] = _p2.parse, n[_$3] = _p2.leaf;else {
            var _h = _p2.before ? QO(l, _p2.before) : _p2.after ? QO(l, _p2.after) + 1 : l.length - 1;
            i.splice(_h, 0, _p2.parse), n.splice(_h, 0, _p2.leaf), l.splice(_h, 0, _p2.name);
          }
          _p2.endLeaf && o.push(_p2.endLeaf);
        }
      }
      if (K(t.parseInline)) {
        for (var _iterator16 = _createForOfIteratorHelperLoose(t.parseInline), _step16; !(_step16 = _iterator16()).done;) {
          var _p3 = _step16.value;
          var _$4 = Q.indexOf(_p3.name);
          if (_$4 > -1) s[_$4] = _p3.parse;else {
            var _h2 = _p3.before ? QO(Q, _p3.before) : _p3.after ? QO(Q, _p3.after) + 1 : Q.length - 1;
            s.splice(_h2, 0, _p3.parse), Q.splice(_h2, 0, _p3.name);
          }
        }
      }
      return t.wrap && (c = c.concat(t.wrap)), new O(a, i, n, l, o, r, s, Q, c);
    };
    _proto6.getNodeType = function getNodeType(e) {
      var t = this.nodeTypes[e];
      if (t == null) throw new RangeError("Unknown node type '" + e + "'");
      return t;
    };
    _proto6.parseInline = function parseInline(e, t) {
      var a = new aO(this, e, t);
      O: for (var r = t; r < a.end;) {
        var i = a.char(r);
        for (var _iterator17 = _createForOfIteratorHelperLoose(this.inlineParsers), _step17; !(_step17 = _iterator17()).done;) {
          var n = _step17.value;
          if (n) {
            var l = n(a, i, r);
            if (l >= 0) {
              r = l;
              continue O;
            }
          }
        }
        r++;
      }
      return a.resolveMarkers(0);
    };
    return O;
  }(X.Parser);
  function K(O) {
    return O != null && O.length > 0;
  }
  function vO(O) {
    if (!Array.isArray(O)) return O;
    if (O.length == 0) return null;
    var e = vO(O[0]);
    if (O.length == 1) return e;
    var t = vO(O.slice(1));
    if (!t || !e) return e || t;
    var a = function a(n, l) {
        return (n || D).concat(l || D);
      },
      r = e.wrap,
      i = t.wrap;
    return {
      props: a(e.props, t.props),
      defineNodes: a(e.defineNodes, t.defineNodes),
      parseBlock: a(e.parseBlock, t.parseBlock),
      parseInline: a(e.parseInline, t.parseInline),
      remove: a(e.remove, t.remove),
      wrap: r ? i ? function (n, l, s, Q) {
        return r(i(n, l, s, Q), l, s, Q);
      } : r : i
    };
  }
  function QO(O, e) {
    var t = O.indexOf(e);
    if (t < 0) throw new RangeError("Position specified relative to unknown parser " + e);
    return t;
  }
  var _e = [X.NodeType.none];
  for (var O = 1, e; e = u[O]; O++) _e[O] = X.NodeType.define({
    id: O,
    name: e,
    props: O >= u.Escape ? [] : [[X.NodeProp.group, O in Ze ? ["Block", "BlockContext"] : ["Block", "LeafBlock"]]],
    top: e == "Document"
  });
  var D = [],
    pO = function () {
      function pO(e) {
        this.nodeSet = e, this.content = [], this.nodes = [];
      }
      var _proto7 = pO.prototype;
      _proto7.write = function write(e, t, a, r) {
        if (r === void 0) {
          r = 0;
        }
        return this.content.push(e, t, a, 4 + r * 4), this;
      };
      _proto7.writeElements = function writeElements(e, t) {
        if (t === void 0) {
          t = 0;
        }
        for (var _iterator18 = _createForOfIteratorHelperLoose(e), _step18; !(_step18 = _iterator18()).done;) {
          var a = _step18.value;
          a.writeTo(this, t);
        }
        return this;
      };
      _proto7.finish = function finish(e, t) {
        return X.Tree.build({
          buffer: this.content,
          nodeSet: this.nodeSet,
          reused: this.nodes,
          topID: e,
          length: t
        });
      };
      return pO;
    }(),
    I = function () {
      function I(e, t, a, r) {
        if (r === void 0) {
          r = D;
        }
        this.type = e, this.from = t, this.to = a, this.children = r;
      }
      var _proto8 = I.prototype;
      _proto8.writeTo = function writeTo(e, t) {
        var a = e.content.length;
        e.writeElements(this.children, t), e.content.push(this.type, this.from + t, this.to + t, e.content.length + 4 - a);
      };
      _proto8.toTree = function toTree(e) {
        return new pO(e).writeElements(this.children, -this.from).finish(this.type, this.to - this.from);
      };
      return I;
    }(),
    uO = function () {
      function uO(e, t) {
        this.tree = e, this.from = t;
      }
      var _proto9 = uO.prototype;
      _proto9.writeTo = function writeTo(e, t) {
        e.nodes.push(this.tree), e.content.push(e.nodes.length - 1, this.from + t, this.to + t, -1);
      };
      _proto9.toTree = function toTree() {
        return this.tree;
      };
      return _createClass(uO, [{
        key: "to",
        get: function get() {
          return this.from + this.tree.length;
        }
      }, {
        key: "type",
        get: function get() {
          return this.tree.type.id;
        }
      }, {
        key: "children",
        get: function get() {
          return D;
        }
      }]);
    }();
  function P(O, e, t, a) {
    return new I(O, e, t, a);
  }
  var Re = {
      resolve: "Emphasis",
      mark: "EmphasisMark"
    },
    ze = {
      resolve: "Emphasis",
      mark: "EmphasisMark"
    },
    M = {},
    dO = {},
    j = function j(e, t, a, r) {
      this.type = e, this.from = t, this.to = a, this.side = r;
    },
    de = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
    tO = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~\xA1\u2010-\u2027]/;
  try {
    tO = new RegExp("[\\p{S}|\\p{P}]", "u");
  } catch (_unused) {}
  var kO = {
    Escape: function Escape(O, e, t) {
      if (e != 92 || t == O.end - 1) return -1;
      var a = O.char(t + 1);
      for (var r = 0; r < de.length; r++) if (de.charCodeAt(r) == a) return O.append(P(u.Escape, t, t + 2));
      return -1;
    },
    Entity: function Entity(O, e, t) {
      if (e != 38) return -1;
      var a = new RegExp("^(?:#\\d+|#x[a-f\\d]+|\\w+);", "i").exec(O.slice(t + 1, t + 31));
      return a ? O.append(P(u.Entity, t, t + 1 + a[0].length)) : -1;
    },
    InlineCode: function InlineCode(O, e, t) {
      if (e != 96 || t && O.char(t - 1) == 96) return -1;
      var a = t + 1;
      for (; a < O.end && O.char(a) == 96;) a++;
      var r = a - t,
        i = 0;
      for (; a < O.end; a++) if (O.char(a) == 96) {
        if (i++, i == r && O.char(a + 1) != 96) return O.append(P(u.InlineCode, t, a + 1, [P(u.CodeMark, t, t + r), P(u.CodeMark, a + 1 - r, a + 1)]));
      } else i = 0;
      return -1;
    },
    HTMLTag: function HTMLTag(O, e, t) {
      if (e != 60 || t == O.end - 1) return -1;
      var a = O.slice(t + 1, O.end),
        r = new RegExp("^(?:[a-z][-\\w+.]+:[^\\s>]+|[a-z\\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\\d](?:[a-z\\d-]{0,61}[a-z\\d])?(?:\\.[a-z\\d](?:[a-z\\d-]{0,61}[a-z\\d])?)*)>", "i").exec(a);
      if (r) return O.append(P(u.Autolink, t, t + 1 + r[0].length, [P(u.LinkMark, t, t + 1), P(u.URL, t + 1, t + r[0].length), P(u.LinkMark, t + r[0].length, t + 1 + r[0].length)]));
      var i = new RegExp("^!--[^>](?:-[^-]|[^-])*?-->", "i").exec(a);
      if (i) return O.append(P(u.Comment, t, t + 1 + i[0].length));
      var n = /^\?[^]*?\?>/.exec(a);
      if (n) return O.append(P(u.ProcessingInstruction, t, t + 1 + n[0].length));
      var l = /^(?:![A-Z][^]*?>|!\[CDATA\[[^]*?\]\]>|\/\s*[a-zA-Z][\w-]*\s*>|\s*[a-zA-Z][\w-]*(\s+[a-zA-Z:_][\w.:\-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*(\/\s*)?>)/.exec(a);
      return l ? O.append(P(u.HTMLTag, t, t + 1 + l[0].length)) : -1;
    },
    Emphasis: function Emphasis(O, e, t) {
      if (e != 95 && e != 42) return -1;
      var a = t + 1;
      for (; O.char(a) == e;) a++;
      var r = O.slice(t - 1, t),
        i = O.slice(a, a + 1),
        n = tO.test(r),
        l = tO.test(i),
        s = /\s|^$/.test(r),
        Q = /\s|^$/.test(i),
        o = !Q && (!l || s || n),
        c = !s && (!n || Q || l),
        p = o && (e == 42 || !c || n),
        $ = c && (e == 42 || !o || l);
      return O.append(new j(e == 95 ? Re : ze, t, a, (p ? 1 : 0) | ($ ? 2 : 0)));
    },
    HardBreak: function HardBreak(O, e, t) {
      if (e == 92 && O.char(t + 1) == 10) return O.append(P(u.HardBreak, t, t + 2));
      if (e == 32) {
        var a = t + 1;
        for (; O.char(a) == 32;) a++;
        if (O.char(a) == 10 && a >= t + 2) return O.append(P(u.HardBreak, t, a + 1));
      }
      return -1;
    },
    Link: function Link(O, e, t) {
      return e == 91 ? O.append(new j(M, t, t + 1, 1)) : -1;
    },
    Image: function Image(O, e, t) {
      return e == 33 && O.char(t + 1) == 91 ? O.append(new j(dO, t, t + 2, 1)) : -1;
    },
    LinkEnd: function LinkEnd(O, e, t) {
      if (e != 93) return -1;
      for (var a = O.parts.length - 1; a >= 0; a--) {
        var r = O.parts[a];
        if (r instanceof j && (r.type == M || r.type == dO)) {
          if (!r.side || O.skipSpace(r.to) == t && !/[(\[]/.test(O.slice(t + 1, t + 2))) return O.parts[a] = null, -1;
          var i = O.takeContent(a),
            n = O.parts[a] = ma(O, i, r.type == M ? u.Link : u.Image, r.from, t + 1);
          if (r.type == M) for (var l = 0; l < a; l++) {
            var s = O.parts[l];
            s instanceof j && s.type == M && (s.side = 0);
          }
          return n.to;
        }
      }
      return -1;
    }
  };
  function ma(O, e, t, a, r) {
    var i = O.text,
      n = O.char(r),
      l = r;
    if (e.unshift(P(u.LinkMark, a, a + (t == u.Image ? 2 : 1))), e.push(P(u.LinkMark, r - 1, r)), n == 40) {
      var s = O.skipSpace(r + 1),
        Q = qe(i, s - O.offset, O.offset),
        o;
      Q && (s = O.skipSpace(Q.to), s != Q.to && (o = Ve(i, s - O.offset, O.offset), o && (s = O.skipSpace(o.to)))), O.char(s) == 41 && (e.push(P(u.LinkMark, r, r + 1)), l = s + 1, Q && e.push(Q), o && e.push(o), e.push(P(u.LinkMark, s, l)));
    } else if (n == 91) {
      var _s2 = We(i, r - O.offset, O.offset, !1);
      _s2 && (e.push(_s2), l = _s2.to);
    }
    return P(t, a, l, e);
  }
  function qe(O, e, t) {
    if (O.charCodeAt(e) == 60) {
      for (var r = e + 1; r < O.length; r++) {
        var i = O.charCodeAt(r);
        if (i == 62) return P(u.URL, e + t, r + 1 + t);
        if (i == 60 || i == 10) return !1;
      }
      return null;
    } else {
      var _r4 = 0,
        _i2 = e;
      for (var n = !1; _i2 < O.length; _i2++) {
        var l = O.charCodeAt(_i2);
        if (V(l)) break;
        if (n) n = !1;else if (l == 40) _r4++;else if (l == 41) {
          if (!_r4) break;
          _r4--;
        } else l == 92 && (n = !0);
      }
      return _i2 > e ? P(u.URL, e + t, _i2 + t) : _i2 == O.length ? null : !1;
    }
  }
  function Ve(O, e, t) {
    var a = O.charCodeAt(e);
    if (a != 39 && a != 34 && a != 40) return !1;
    var r = a == 40 ? 41 : a;
    for (var i = e + 1, n = !1; i < O.length; i++) {
      var l = O.charCodeAt(i);
      if (n) n = !1;else {
        if (l == r) return P(u.LinkTitle, e + t, i + 1 + t);
        l == 92 && (n = !0);
      }
    }
    return null;
  }
  function We(O, e, t, a) {
    for (var r = !1, i = e + 1, n = Math.min(O.length, i + 999); i < n; i++) {
      var l = O.charCodeAt(i);
      if (r) r = !1;else {
        if (l == 93) return a ? !1 : P(u.LinkLabel, e + t, i + 1 + t);
        if (a && !V(l) && (a = !1), l == 91) return !1;
        l == 92 && (r = !0);
      }
    }
    return null;
  }
  var aO = function () {
    function aO(e, t, a) {
      this.parser = e, this.text = t, this.offset = a, this.parts = [];
    }
    var _proto0 = aO.prototype;
    _proto0.char = function char(e) {
      return e >= this.end ? -1 : this.text.charCodeAt(e - this.offset);
    };
    _proto0.slice = function slice(e, t) {
      return this.text.slice(e - this.offset, t - this.offset);
    };
    _proto0.append = function append(e) {
      return this.parts.push(e), e.to;
    };
    _proto0.addDelimiter = function addDelimiter(e, t, a, r, i) {
      return this.append(new j(e, t, a, (r ? 1 : 0) | (i ? 2 : 0)));
    };
    _proto0.addElement = function addElement(e) {
      return this.append(e);
    };
    _proto0.resolveMarkers = function resolveMarkers(e) {
      for (var a = e; a < this.parts.length; a++) {
        var r = this.parts[a];
        if (!(r instanceof j && r.type.resolve && r.side & 2)) continue;
        var i = r.type == Re || r.type == ze,
          n = r.to - r.from,
          l = void 0,
          s = a - 1;
        for (; s >= e; s--) {
          var m = this.parts[s];
          if (m instanceof j && m.side & 1 && m.type == r.type && !(i && (r.side & 1 || m.side & 2) && (m.to - m.from + n) % 3 == 0 && ((m.to - m.from) % 3 || n % 3))) {
            l = m;
            break;
          }
        }
        if (!l) continue;
        var Q = r.type.resolve,
          o = [],
          c = l.from,
          p = r.to;
        if (i) {
          var _m = Math.min(2, l.to - l.from, n);
          c = l.to - _m, p = r.from + _m, Q = _m == 1 ? "Emphasis" : "StrongEmphasis";
        }
        l.type.mark && o.push(this.elt(l.type.mark, c, l.to));
        for (var _m2 = s + 1; _m2 < a; _m2++) this.parts[_m2] instanceof I && o.push(this.parts[_m2]), this.parts[_m2] = null;
        r.type.mark && o.push(this.elt(r.type.mark, r.from, p));
        var $ = this.elt(Q, c, p, o);
        this.parts[s] = i && l.from != c ? new j(l.type, l.from, c, l.side) : null, (this.parts[a] = i && r.to != p ? new j(r.type, p, r.to, r.side) : null) ? this.parts.splice(a, 0, $) : this.parts[a] = $;
      }
      var t = [];
      for (var _a8 = e; _a8 < this.parts.length; _a8++) {
        var _r5 = this.parts[_a8];
        _r5 instanceof I && t.push(_r5);
      }
      return t;
    };
    _proto0.findOpeningDelimiter = function findOpeningDelimiter(e) {
      for (var t = this.parts.length - 1; t >= 0; t--) {
        var a = this.parts[t];
        if (a instanceof j && a.type == e && a.side & 1) return t;
      }
      return null;
    };
    _proto0.takeContent = function takeContent(e) {
      var t = this.resolveMarkers(e);
      return this.parts.length = e, t;
    };
    _proto0.getDelimiterAt = function getDelimiterAt(e) {
      var t = this.parts[e];
      return t instanceof j ? t : null;
    };
    _proto0.skipSpace = function skipSpace(e) {
      return H(this.text, e - this.offset) + this.offset;
    };
    _proto0.elt = function elt(e, t, a, r) {
      return typeof e == "string" ? P(this.parser.getNodeType(e), t, a, r) : new uO(e, t);
    };
    return _createClass(aO, [{
      key: "end",
      get: function get() {
        return this.offset + this.text.length;
      }
    }, {
      key: "hasOpenLink",
      get: function get() {
        for (var _e2 = this.parts.length - 1; _e2 >= 0; _e2--) {
          var t = this.parts[_e2];
          if (t instanceof j && (t.type == M || t.type == dO)) return !0;
        }
        return !1;
      }
    }]);
  }();
  aO.linkStart = M;
  aO.imageStart = dO;
  function _O(O, e) {
    if (!e.length) return O;
    if (!O.length) return e;
    var t = O.slice(),
      a = 0;
    for (var _iterator19 = _createForOfIteratorHelperLoose(e), _step19; !(_step19 = _iterator19()).done;) {
      var r = _step19.value;
      for (; a < t.length && t[a].to < r.to;) a++;
      if (a < t.length && t[a].from < r.from) {
        var i = t[a];
        i instanceof I && (t[a] = new I(i.type, i.from, i.to, _O(i.children, [r])));
      } else t.splice(a++, 0, r);
    }
    return t;
  }
  var ha = [u.CodeBlock, u.ListItem, u.OrderedList, u.BulletList],
    RO = function () {
      function RO(e, t) {
        this.fragments = e, this.input = t, this.i = 0, this.fragment = null, this.fragmentEnd = -1, this.cursor = null, e.length && (this.fragment = e[this.i++]);
      }
      var _proto1 = RO.prototype;
      _proto1.nextFragment = function nextFragment() {
        this.fragment = this.i < this.fragments.length ? this.fragments[this.i++] : null, this.cursor = null, this.fragmentEnd = -1;
      };
      _proto1.moveTo = function moveTo(e, t) {
        for (; this.fragment && this.fragment.to <= e;) this.nextFragment();
        if (!this.fragment || this.fragment.from > (e ? e - 1 : 0)) return !1;
        if (this.fragmentEnd < 0) {
          var i = this.fragment.to;
          for (; i > 0 && this.input.read(i - 1, i) != "\n";) i--;
          this.fragmentEnd = i ? i - 1 : 0;
        }
        var a = this.cursor;
        a || (a = this.cursor = this.fragment.tree.cursor(), a.firstChild());
        var r = e + this.fragment.offset;
        for (; a.to <= r;) if (!a.parent()) return !1;
        for (;;) {
          if (a.from >= r) return this.fragment.from <= t;
          if (!a.childAfter(r)) return !1;
        }
      };
      _proto1.matches = function matches(e) {
        var t = this.cursor.tree;
        return t && t.prop(X.NodeProp.contextHash) == e;
      };
      _proto1.takeNodes = function takeNodes(e) {
        var t = this.cursor,
          a = this.fragment.offset,
          r = this.fragmentEnd - (this.fragment.openEnd ? 1 : 0),
          i = e.absoluteLineStart,
          n = i,
          l = e.block.children.length,
          s = n,
          Q = l;
        for (;;) {
          if (t.to - a > r) {
            if (t.type.isAnonymous && t.firstChild()) continue;
            break;
          }
          var o = Ge(t.from - a, e.ranges);
          if (t.to - a <= e.ranges[e.rangeI].to) e.addNode(t.tree, o);else {
            var c = new X.Tree(e.parser.nodeSet.types[u.Paragraph], [], [], 0, e.block.hashProp);
            e.reusePlaceholders.set(c, t.tree), e.addNode(c, o);
          }
          if (t.type.is("Block") && (ha.indexOf(t.type.id) < 0 ? (n = t.to - a, l = e.block.children.length) : (n = s, l = Q), s = t.to - a, Q = e.block.children.length), !t.nextSibling()) break;
        }
        for (; e.block.children.length > l;) e.block.children.pop(), e.block.positions.pop();
        return n - i;
      };
      return RO;
    }();
  function Ge(O, e) {
    var t = O;
    for (var a = 1; a < e.length; a++) {
      var r = e[a - 1].to,
        i = e[a].from;
      r < O && (t -= i - r);
    }
    return t;
  }
  var ga = (0, g.styleTags)({
      "Blockquote/...": g.tags.quote,
      HorizontalRule: g.tags.contentSeparator,
      "ATXHeading1/... SetextHeading1/...": g.tags.heading1,
      "ATXHeading2/... SetextHeading2/...": g.tags.heading2,
      "ATXHeading3/...": g.tags.heading3,
      "ATXHeading4/...": g.tags.heading4,
      "ATXHeading5/...": g.tags.heading5,
      "ATXHeading6/...": g.tags.heading6,
      "Comment CommentBlock": g.tags.comment,
      Escape: g.tags.escape,
      Entity: g.tags.character,
      "Emphasis/...": g.tags.emphasis,
      "StrongEmphasis/...": g.tags.strong,
      "Link/... Image/...": g.tags.link,
      "OrderedList/... BulletList/...": g.tags.list,
      "BlockQuote/...": g.tags.quote,
      "InlineCode CodeText": g.tags.monospace,
      "URL Autolink": g.tags.url,
      "HeaderMark HardBreak QuoteMark ListMark LinkMark EmphasisMark CodeMark": g.tags.processingInstruction,
      "CodeInfo LinkLabel": g.tags.labelName,
      LinkTitle: g.tags.string,
      Paragraph: g.tags.content
    }),
    Le = new eO(new X.NodeSet(_e).extend(ga), Object.keys(oO).map(function (O) {
      return oO[O];
    }), Object.keys(oO).map(function (O) {
      return je[O];
    }), Object.keys(oO), $a, Ze, Object.keys(kO).map(function (O) {
      return kO[O];
    }), Object.keys(kO), []);
  function Sa(O, e, t) {
    var a = [];
    for (var r = O.firstChild, i = e;; r = r.nextSibling) {
      var n = r ? r.from : t;
      if (n > i && a.push({
        from: i,
        to: n
      }), !r) break;
      i = r.to;
    }
    return a;
  }
  function Ce(O) {
    var e = O.codeParser,
      t = O.htmlParser;
    return {
      wrap: (0, X.parseMixed)(function (r, i) {
        var n = r.type.id;
        if (e && (n == u.CodeBlock || n == u.FencedCode)) {
          var l = "";
          if (n == u.FencedCode) {
            var Q = r.node.getChild(u.CodeInfo);
            Q && (l = i.read(Q.from, Q.to));
          }
          var s = e(l);
          if (s) return {
            parser: s,
            overlay: function overlay(Q) {
              return Q.type.id == u.CodeText;
            },
            bracketed: n == u.FencedCode
          };
        } else if (t && (n == u.HTMLBlock || n == u.HTMLTag || n == u.CommentBlock)) return {
          parser: t,
          overlay: Sa(r.node, r.from, r.to)
        };
        return null;
      })
    };
  }
  var Pa = {
      resolve: "Strikethrough",
      mark: "StrikethroughMark"
    },
    Za = {
      defineNodes: [{
        name: "Strikethrough",
        style: {
          "Strikethrough/...": g.tags.strikethrough
        }
      }, {
        name: "StrikethroughMark",
        style: g.tags.processingInstruction
      }],
      parseInline: [{
        name: "Strikethrough",
        parse: function parse(O, e, t) {
          if (e != 126 || O.char(t + 1) != 126 || O.char(t + 2) == 126) return -1;
          var a = O.slice(t - 1, t),
            r = O.slice(t + 2, t + 3),
            i = /\s|^$/.test(a),
            n = /\s|^$/.test(r),
            l = tO.test(a),
            s = tO.test(r);
          return O.addDelimiter(Pa, t, t + 2, !n && (!s || i || l), !i && (!l || n || s));
        },
        after: "Emphasis"
      }]
    };
  function OO(O, e, t, a, r) {
    if (t === void 0) {
      t = 0;
    }
    if (r === void 0) {
      r = 0;
    }
    var i = 0,
      n = !0,
      l = -1,
      s = -1,
      Q = !1,
      o = function o() {
        a.push(O.elt("TableCell", r + l, r + s, O.parser.parseInline(e.slice(l, s), r + l)));
      };
    for (var c = t; c < e.length; c++) {
      var p = e.charCodeAt(c);
      p == 124 && !Q ? ((!n || l > -1) && i++, n = !1, a && (l > -1 && o(), a.push(O.elt("TableDelimiter", c + r, c + r + 1))), l = s = -1) : (Q || p != 32 && p != 9) && (l < 0 && (l = c), s = c + 1), Q = !Q && p == 92;
    }
    return l > -1 && (i++, a && o()), i;
  }
  function $e(O, e) {
    for (var t = e; t < O.length; t++) {
      var a = O.charCodeAt(t);
      if (a == 124) return !0;
      a == 92 && t++;
    }
    return !1;
  }
  var Ee = /^[>\s]*\|?(\s*:?-+:?\s*\|)+(\s*:?-+:?\s*)?$/,
    $O = function () {
      function $O() {
        this.rows = null;
      }
      var _proto10 = $O.prototype;
      _proto10.nextLine = function nextLine(e, t, a) {
        if (this.rows == null) {
          this.rows = !1;
          var r;
          if ((t.next == 45 || t.next == 58 || t.next == 124) && Ee.test(r = t.text.slice(t.pos))) {
            var i = [];
            OO(e, a.content, 0, i, a.start) == OO(e, r, 0) && (this.rows = [e.elt("TableHeader", a.start, a.start + a.content.length, i), e.elt("TableDelimiter", e.lineStart + t.pos, e.lineStart + t.text.length)]);
          }
        } else if (this.rows) {
          var _r6 = [];
          OO(e, t.text, t.pos, _r6, e.lineStart), this.rows.push(e.elt("TableRow", e.lineStart + t.pos, e.lineStart + t.text.length, _r6));
        }
        return !1;
      };
      _proto10.finish = function finish(e, t) {
        return this.rows ? (e.addLeafElement(t, e.elt("Table", t.start, t.start + t.content.length, this.rows)), !0) : !1;
      };
      return $O;
    }(),
    Xa = {
      defineNodes: [{
        name: "Table",
        block: !0
      }, {
        name: "TableHeader",
        style: {
          "TableHeader/...": g.tags.heading
        }
      }, "TableRow", {
        name: "TableCell",
        style: g.tags.content
      }, {
        name: "TableDelimiter",
        style: g.tags.processingInstruction
      }],
      parseBlock: [{
        name: "Table",
        leaf: function leaf(O, e) {
          return $e(e.content, 0) ? new $O() : null;
        },
        endLeaf: function endLeaf(O, e, t) {
          if (t.parsers.some(function (r) {
            return r instanceof $O;
          }) || !$e(e.text, e.basePos)) return !1;
          var a = O.peekLine();
          return Ee.test(a) && OO(O, e.text, e.basePos) == OO(O, a, e.basePos);
        },
        before: "SetextHeading"
      }]
    },
    zO = function () {
      function zO() {}
      var _proto11 = zO.prototype;
      _proto11.nextLine = function nextLine() {
        return !1;
      };
      _proto11.finish = function finish(e, t) {
        return e.addLeafElement(t, e.elt("Task", t.start, t.start + t.content.length, [e.elt("TaskMarker", t.start, t.start + 3)].concat(e.parser.parseInline(t.content.slice(3), t.start + 3)))), !0;
      };
      return zO;
    }(),
    ka = {
      defineNodes: [{
        name: "Task",
        block: !0,
        style: g.tags.list
      }, {
        name: "TaskMarker",
        style: g.tags.atom
      }],
      parseBlock: [{
        name: "TaskList",
        leaf: function leaf(O, e) {
          return /^\[[ xX]\][ \t]/.test(e.content) && O.parentType().name == "ListItem" ? new zO() : null;
        },
        after: "SetextHeading"
      }]
    },
    fe = new RegExp("(www\\.)|(https?:\\/\\/)|([\\w.+-]{1,100}@)|(mailto:|xmpp:)", "gy"),
    me = new RegExp("[\\w-]+(\\.[\\w-]+)+(:\\d+)?(\\/[^\\s<]*)?", "gy"),
    ba = /[\w-]+\.[\w-]+($|[/:])/,
    he = new RegExp("[\\w.+-]+@[\\w-]+(\\.[\\w.-]+)+", "gy"),
    ge = new RegExp("\\/[a-zA-Z\\d@.]+", "gy");
  function Se(O, e, t, a) {
    var r = 0;
    for (var i = e; i < t; i++) O[i] == a && r++;
    return r;
  }
  function xa(O, e) {
    me.lastIndex = e;
    var t = me.exec(O);
    if (!t || ba.exec(t[0])[0].indexOf("_") > -1) return -1;
    var a = e + t[0].length;
    for (;;) {
      var r = O[a - 1],
        i = void 0;
      if (/[?!.,:*_~]/.test(r) || r == ")" && Se(O, e, a, ")") > Se(O, e, a, "(")) a--;else if (r == ";" && (i = /&(?:#\d+|#x[a-f\d]+|\w+);$/.exec(O.slice(e, a)))) a = e + i.index;else break;
    }
    return a;
  }
  function Pe(O, e) {
    he.lastIndex = e;
    var t = he.exec(O);
    if (!t) return -1;
    var a = t[0][t[0].length - 1];
    return a == "_" || a == "-" ? -1 : e + t[0].length - (a == "." ? 1 : 0);
  }
  var ya = {
      parseInline: [{
        name: "Autolink",
        parse: function parse(O, e, t) {
          var a = t - O.offset;
          if (a && /\w/.test(O.text[a - 1])) return -1;
          fe.lastIndex = a;
          var r = fe.exec(O.text),
            i = -1;
          if (!r) return -1;
          if (r[1] || r[2]) {
            if (i = xa(O.text, a + r[0].length), i > -1 && O.hasOpenLink) {
              var n = /([^\[\]]|\[[^\]]*\])*/.exec(O.text.slice(a, i));
              i = a + n[0].length;
            }
          } else r[3] ? i = Pe(O.text, a) : (i = Pe(O.text, a + r[0].length), i > -1 && r[0] == "xmpp:" && (ge.lastIndex = i, r = ge.exec(O.text), r && (i = r.index + r[0].length)));
          return i < 0 ? -1 : (O.addElement(O.elt("URL", t, i + O.offset)), i + O.offset);
        }
      }]
    },
    Ue = [Xa, ka, Za, ya];
  function Ae(O, e, t) {
    return function (a, r, i) {
      if (r != O || a.char(i + 1) == O) return -1;
      var n = [a.elt(t, i, i + 1)];
      for (var l = i + 1; l < a.end; l++) {
        var s = a.char(l);
        if (s == O) return a.addElement(a.elt(e, i, l + 1, n.concat(a.elt(t, l, l + 1))));
        if (s == 92 && n.push(a.elt("Escape", l, l++ + 2)), V(s)) break;
      }
      return -1;
    };
  }
  var Me = {
      defineNodes: [{
        name: "Superscript",
        style: g.tags.special(g.tags.content)
      }, {
        name: "SuperscriptMark",
        style: g.tags.processingInstruction
      }],
      parseInline: [{
        name: "Superscript",
        parse: Ae(94, "Superscript", "SuperscriptMark")
      }]
    },
    Ie = {
      defineNodes: [{
        name: "Subscript",
        style: g.tags.special(g.tags.content)
      }, {
        name: "SubscriptMark",
        style: g.tags.processingInstruction
      }],
      parseInline: [{
        name: "Subscript",
        parse: Ae(126, "Subscript", "SubscriptMark")
      }]
    },
    Be = {
      defineNodes: [{
        name: "Emoji",
        style: g.tags.character
      }],
      parseInline: [{
        name: "Emoji",
        parse: function parse(O, e, t) {
          var a;
          return e != 58 || !(a = /^[a-zA-Z_0-9]+:/.exec(O.slice(t + 1, O.end))) ? -1 : O.addElement(O.elt("Emoji", t, t + 1 + a[0].length));
        }
      }]
    };
  var G = require("@lezer/lr"),
    v = require("@lezer/highlight"),
    tt = require("@lezer/common"),
    wa = 55,
    Ta = 1,
    Ya = 56,
    ja = 2,
    va = 57,
    _a = 3,
    Ne = 4,
    Ra = 5,
    UO = 6,
    at = 7,
    rt = 8,
    it = 9,
    nt = 10,
    za = 11,
    qa = 12,
    Va = 13,
    GO = 58,
    Wa = 14,
    Ga = 15,
    De = 59,
    lt = 21,
    La = 23,
    st = 24,
    Ca = 25,
    CO = 27,
    ot = 28,
    Ea = 29,
    Ua = 32,
    Aa = 35,
    Ma = 37,
    Ia = 38,
    Ba = 0,
    Na = 1,
    Da = {
      area: !0,
      base: !0,
      br: !0,
      col: !0,
      command: !0,
      embed: !0,
      frame: !0,
      hr: !0,
      img: !0,
      input: !0,
      keygen: !0,
      link: !0,
      meta: !0,
      param: !0,
      source: !0,
      track: !0,
      wbr: !0,
      menuitem: !0
    },
    Ja = {
      dd: !0,
      li: !0,
      optgroup: !0,
      option: !0,
      p: !0,
      rp: !0,
      rt: !0,
      tbody: !0,
      td: !0,
      tfoot: !0,
      th: !0,
      tr: !0
    },
    Je = {
      dd: {
        dd: !0,
        dt: !0
      },
      dt: {
        dd: !0,
        dt: !0
      },
      li: {
        li: !0
      },
      option: {
        option: !0,
        optgroup: !0
      },
      optgroup: {
        optgroup: !0
      },
      p: {
        address: !0,
        article: !0,
        aside: !0,
        blockquote: !0,
        dir: !0,
        div: !0,
        dl: !0,
        fieldset: !0,
        footer: !0,
        form: !0,
        h1: !0,
        h2: !0,
        h3: !0,
        h4: !0,
        h5: !0,
        h6: !0,
        header: !0,
        hgroup: !0,
        hr: !0,
        menu: !0,
        nav: !0,
        ol: !0,
        p: !0,
        pre: !0,
        section: !0,
        table: !0,
        ul: !0
      },
      rp: {
        rp: !0,
        rt: !0
      },
      rt: {
        rp: !0,
        rt: !0
      },
      tbody: {
        tbody: !0,
        tfoot: !0
      },
      td: {
        td: !0,
        th: !0
      },
      tfoot: {
        tbody: !0
      },
      th: {
        td: !0,
        th: !0
      },
      thead: {
        tbody: !0,
        tfoot: !0
      },
      tr: {
        tr: !0
      }
    };
  function Fa(O) {
    return O == 45 || O == 46 || O == 58 || O >= 65 && O <= 90 || O == 95 || O >= 97 && O <= 122 || O >= 161;
  }
  var Fe = null,
    Ke = null,
    He = 0;
  function EO(O, e) {
    var t = O.pos + e;
    if (He == t && Ke == O) return Fe;
    var a = O.peek(e),
      r = "";
    for (; Fa(a);) r += String.fromCharCode(a), a = O.peek(++e);
    return Ke = O, He = t, Fe = r ? r.toLowerCase() : a == Ka || a == Ha ? void 0 : null;
  }
  var Qt = 60,
    fO = 62,
    AO = 47,
    Ka = 63,
    Ha = 33,
    Or = 45;
  function Ot(O, e) {
    this.name = O, this.parent = e;
  }
  var er = [UO, nt, at, rt, it],
    tr = new G.ContextTracker({
      start: null,
      shift: function shift(O, e, t, a) {
        return er.indexOf(e) > -1 ? new Ot(EO(a, 1) || "", O) : O;
      },
      reduce: function reduce(O, e) {
        return e == lt && O ? O.parent : O;
      },
      reuse: function reuse(O, e, t, a) {
        var r = e.type.id;
        return r == UO || r == Ma ? new Ot(EO(a, 1) || "", O) : O;
      },
      strict: !1
    }),
    ar = new G.ExternalTokenizer(function (O, e) {
      if (O.next != Qt) {
        O.next < 0 && e.context && O.acceptToken(GO);
        return;
      }
      O.advance();
      var t = O.next == AO;
      t && O.advance();
      var a = EO(O, 0);
      if (a === void 0) return;
      if (!a) return O.acceptToken(t ? Ga : Wa);
      var r = e.context ? e.context.name : null;
      if (t) {
        if (a == r) return O.acceptToken(za);
        if (r && Ja[r]) return O.acceptToken(GO, -2);
        if (e.dialectEnabled(Ba)) return O.acceptToken(qa);
        for (var i = e.context; i; i = i.parent) if (i.name == a) return;
        O.acceptToken(Va);
      } else {
        if (a == "script") return O.acceptToken(at);
        if (a == "style") return O.acceptToken(rt);
        if (a == "textarea") return O.acceptToken(it);
        if (Da.hasOwnProperty(a)) return O.acceptToken(nt);
        r && Je[r] && Je[r][a] ? O.acceptToken(GO, -1) : O.acceptToken(UO);
      }
    }, {
      contextual: !0
    }),
    rr = new G.ExternalTokenizer(function (O) {
      for (var _e3 = 0, t = 0;; t++) {
        if (O.next < 0) {
          t && O.acceptToken(De);
          break;
        }
        if (O.next == Or) _e3++;else if (O.next == fO && _e3 >= 2) {
          t >= 3 && O.acceptToken(De, -2);
          break;
        } else _e3 = 0;
        O.advance();
      }
    });
  function ir(O) {
    for (; O; O = O.parent) if (O.name == "svg" || O.name == "math") return !0;
    return !1;
  }
  var nr = new G.ExternalTokenizer(function (O, e) {
    if (O.next == AO && O.peek(1) == fO) {
      var t = e.dialectEnabled(Na) || ir(e.context);
      O.acceptToken(t ? Ra : Ne, 2);
    } else O.next == fO && O.acceptToken(Ne, 1);
  });
  function MO(O, e, t) {
    var a = 2 + O.length;
    return new G.ExternalTokenizer(function (r) {
      for (var i = 0, n = 0, l = 0;; l++) {
        if (r.next < 0) {
          l && r.acceptToken(e);
          break;
        }
        if (i == 0 && r.next == Qt || i == 1 && r.next == AO || i >= 2 && i < a && r.next == O.charCodeAt(i - 2)) i++, n++;else if (i == a && r.next == fO) {
          l > n ? r.acceptToken(e, -n) : r.acceptToken(t, -(n - 2));
          break;
        } else if ((r.next == 10 || r.next == 13) && l) {
          r.acceptToken(e, 1);
          break;
        } else i = n = 0;
        r.advance();
      }
    });
  }
  var lr = MO("script", wa, Ta),
    sr = MO("style", Ya, ja),
    or = MO("textarea", va, _a),
    Qr = (0, v.styleTags)({
      "Text RawText IncompleteTag IncompleteCloseTag": v.tags.content,
      "StartTag StartCloseTag SelfClosingEndTag EndTag": v.tags.angleBracket,
      TagName: v.tags.tagName,
      "MismatchedCloseTag/TagName": [v.tags.tagName, v.tags.invalid],
      AttributeName: v.tags.attributeName,
      "AttributeValue UnquotedAttributeValue": v.tags.attributeValue,
      Is: v.tags.definitionOperator,
      "EntityReference CharacterReference": v.tags.character,
      Comment: v.tags.blockComment,
      ProcessingInst: v.tags.processingInstruction,
      DoctypeDecl: v.tags.documentMeta
    }),
    ct = G.LRParser.deserialize({
      version: 14,
      states: ",xOVO!rOOO!ZQ#tO'#CrO!`Q#tO'#C{O!eQ#tO'#DOO!jQ#tO'#DRO!oQ#tO'#DTO!tOaO'#CqO#PObO'#CqO#[OdO'#CqO$kO!rO'#CqOOO`'#Cq'#CqO$rO$fO'#DUO$zQ#tO'#DWO%PQ#tO'#DXOOO`'#Dl'#DlOOO`'#DZ'#DZQVO!rOOO%UQ&rO,59^O%aQ&rO,59gO%lQ&rO,59jO%wQ&rO,59mO&SQ&rO,59oOOOa'#D_'#D_O&_OaO'#CyO&jOaO,59]OOOb'#D`'#D`O&rObO'#C|O&}ObO,59]OOOd'#Da'#DaO'VOdO'#DPO'bOdO,59]OOO`'#Db'#DbO'jO!rO,59]O'qQ#tO'#DSOOO`,59],59]OOOp'#Dc'#DcO'vO$fO,59pOOO`,59p,59pO(OQ#|O,59rO(TQ#|O,59sOOO`-E7X-E7XO(YQ&rO'#CtOOQW'#D['#D[O(hQ&rO1G.xOOOa1G.x1G.xOOO`1G/Z1G/ZO(sQ&rO1G/ROOOb1G/R1G/RO)OQ&rO1G/UOOOd1G/U1G/UO)ZQ&rO1G/XOOO`1G/X1G/XO)fQ&rO1G/ZOOOa-E7]-E7]O)qQ#tO'#CzOOO`1G.w1G.wOOOb-E7^-E7^O)vQ#tO'#C}OOOd-E7_-E7_O){Q#tO'#DQOOO`-E7`-E7`O*QQ#|O,59nOOOp-E7a-E7aOOO`1G/[1G/[OOO`1G/^1G/^OOO`1G/_1G/_O*VQ,UO,59`OOQW-E7Y-E7YOOOa7+$d7+$dOOO`7+$u7+$uOOOb7+$m7+$mOOOd7+$p7+$pOOO`7+$s7+$sO*bQ#|O,59fO*gQ#|O,59iO*lQ#|O,59lOOO`1G/Y1G/YO*qO7[O'#CwO+SOMhO'#CwOOQW1G.z1G.zOOO`1G/Q1G/QOOO`1G/T1G/TOOO`1G/W1G/WOOOO'#D]'#D]O+eO7[O,59cOOQW,59c,59cOOOO'#D^'#D^O+vOMhO,59cOOOO-E7Z-E7ZOOQW1G.}1G.}OOOO-E7[-E7[",
      stateData: ",c~O!_OS~OUSOVPOWQOXROYTO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O|_O!eZO~OgaO~OgbO~OgcO~OgdO~OgeO~O!XfOPmP![mP~O!YiOQpP![pP~O!ZlORsP![sP~OUSOVPOWQOXROYTOZqO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O!eZO~O![rO~P#gO!]sO!fuO~OgvO~OgwO~OS|OT}OiyO~OS!POT}OiyO~OS!ROT}OiyO~OS!TOT}OiyO~OS}OT}OiyO~O!XfOPmX![mX~OP!WO![!XO~O!YiOQpX![pX~OQ!ZO![!XO~O!ZlORsX![sX~OR!]O![!XO~O![!XO~P#gOg!_O~O!]sO!f!aO~OS!bO~OS!cO~Oj!dOShXThXihX~OS!fOT!gOiyO~OS!hOT!gOiyO~OS!iOT!gOiyO~OS!jOT!gOiyO~OS!gOT!gOiyO~Og!kO~Og!lO~Og!mO~OS!nO~Ol!qO!a!oO!c!pO~OS!rO~OS!sO~OS!tO~Ob!uOc!uOd!uO!a!wO!b!uO~Ob!xOc!xOd!xO!c!wO!d!xO~Ob!uOc!uOd!uO!a!{O!b!uO~Ob!xOc!xOd!xO!c!{O!d!xO~OT~cbd!ey|!e~",
      goto: "%q!aPPPPPPPPPPPPPPPPPPPPP!b!hP!nPP!zP!}#Q#T#Z#^#a#g#j#m#s#y!bP!b!bP$P$V$m$s$y%P%V%]%cPPPPPPPP%iX^OX`pXUOX`pezabcde{!O!Q!S!UR!q!dRhUR!XhXVOX`pRkVR!XkXWOX`pRnWR!XnXXOX`pQrXR!XpXYOX`pQ`ORx`Q{aQ!ObQ!QcQ!SdQ!UeZ!e{!O!Q!S!UQ!v!oR!z!vQ!y!pR!|!yQgUR!VgQjVR!YjQmWR![mQpXR!^pQtZR!`tS_O`ToXp",
      nodeNames: "\u26A0 StartCloseTag StartCloseTag StartCloseTag EndTag SelfClosingEndTag StartTag StartTag StartTag StartTag StartTag StartCloseTag StartCloseTag StartCloseTag IncompleteTag IncompleteCloseTag Document Text EntityReference CharacterReference InvalidEntity Element OpenTag TagName Attribute AttributeName Is AttributeValue UnquotedAttributeValue ScriptText CloseTag OpenTag StyleText CloseTag OpenTag TextareaText CloseTag OpenTag CloseTag SelfClosingTag Comment ProcessingInst MismatchedCloseTag CloseTag DoctypeDecl",
      maxTerm: 68,
      context: tr,
      nodeProps: [["closedBy", -10, 1, 2, 3, 7, 8, 9, 10, 11, 12, 13, "EndTag", 6, "EndTag SelfClosingEndTag", -4, 22, 31, 34, 37, "CloseTag"], ["openedBy", 4, "StartTag StartCloseTag", 5, "StartTag", -4, 30, 33, 36, 38, "OpenTag"], ["group", -10, 14, 15, 18, 19, 20, 21, 40, 41, 42, 43, "Entity", 17, "Entity TextContent", -3, 29, 32, 35, "TextContent Entity"], ["isolate", -11, 22, 30, 31, 33, 34, 36, 37, 38, 39, 42, 43, "ltr", -3, 27, 28, 40, ""]],
      propSources: [Qr],
      skippedNodes: [0],
      repeatNodeCount: 9,
      tokenData: "!<p!aR!YOX$qXY,QYZ,QZ[$q[]&X]^,Q^p$qpq,Qqr-_rs3_sv-_vw3}wxHYx}-_}!OH{!O!P-_!P!Q$q!Q![-_![!]Mz!]!^-_!^!_!$S!_!`!;x!`!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4U-_4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!Z$|caPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr$qrs&}sv$qvw+Pwx(tx!^$q!^!_*V!_!a&X!a#S$q#S#T&X#T;'S$q;'S;=`+z<%lO$q!R&bXaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&Xq'UVaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}P'pTaPOv'kw!^'k!_;'S'k;'S;=`(P<%lO'kP(SP;=`<%l'kp([S!dpOv(Vx;'S(V;'S;=`(h<%lO(Vp(kP;=`<%l(Vq(qP;=`<%l&}a({WaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t`)jT!b`Or)esv)ew;'S)e;'S;=`)y<%lO)e`)|P;=`<%l)ea*SP;=`<%l(t!Q*^V!b`!dpOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!Q*vP;=`<%l*V!R*|P;=`<%l&XW+UYlWOX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+PW+wP;=`<%l+P!Z+}P;=`<%l$q!a,]`aP!b`!dp!_^OX&XXY,QYZ,QZ]&X]^,Q^p&Xpq,Qqr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!_-ljiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q[/ebiSlWOX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+PS0rXiSqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0mS1bP;=`<%l0m[1hP;=`<%l/^!V1vciSaP!b`!dpOq&Xqr1krs&}sv1kvw0mwx(tx!P1k!P!Q&X!Q!^1k!^!_*V!_!a&X!a#s1k#s$f&X$f;'S1k;'S;=`3R<%l?Ah1k?Ah?BY&X?BY?Mn1k?MnO&X!V3UP;=`<%l1k!_3[P;=`<%l-_!Z3hV!ahaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}!_4WiiSlWd!ROX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst>]tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^/^!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!Z5zblWOX5uXZ7SZ[5u[^7S^p5uqr5urs7Sst+Ptw5uwx7Sx!]5u!]!^7w!^!a7S!a#S5u#S#T7S#T;'S5u;'S;=`8n<%lO5u!R7VVOp7Sqs7St!]7S!]!^7l!^;'S7S;'S;=`7q<%lO7S!R7qOb!R!R7tP;=`<%l7S!Z8OYlWb!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!Z8qP;=`<%l5u!_8{iiSlWOX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst/^tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^:j!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!_:sbiSlWb!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!V<QciSOp7Sqr;{rs7Sst0mtw;{wx7Sx!P;{!P!Q7S!Q!];{!]!^=]!^!a7S!a#s;{#s$f7S$f;'S;{;'S;=`>P<%l?Ah;{?Ah?BY7S?BY?Mn;{?MnO7S!V=dXiSb!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!V>SP;=`<%l;{!_>YP;=`<%l8t!_>dhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^/^!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!Z@TalWOX@OXZAYZ[@O[^AY^p@Oqr@OrsAYsw@OwxAYx!]@O!]!^Az!^!aAY!a#S@O#S#TAY#T;'S@O;'S;=`Bq<%lO@O!RA]UOpAYq!]AY!]!^Ao!^;'SAY;'S;=`At<%lOAY!RAtOc!R!RAwP;=`<%lAY!ZBRYlWc!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!ZBtP;=`<%l@O!_COhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^Dj!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!_DsbiSlWc!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!VFQbiSOpAYqrE{rsAYswE{wxAYx!PE{!P!QAY!Q!]E{!]!^GY!^!aAY!a#sE{#s$fAY$f;'SE{;'S;=`G|<%l?AhE{?Ah?BYAY?BY?MnE{?MnOAY!VGaXiSc!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!VHPP;=`<%lE{!_HVP;=`<%lBw!ZHcW!cxaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t!aIYliSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OKQ!O!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!aK_kiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!`&X!`!aMS!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!TM_XaP!b`!dp!fQOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!aNZ!ZiSgQaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OMz!O!PMz!P!Q$q!Q![Mz![!]Mz!]!^-_!^!_*V!_!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f$}-_$}%OMz%O%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4UMz4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Je-_$Je$JgMz$Jg$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!a!$PP;=`<%lMz!R!$ZY!b`!dpOq*Vqr!$yrs(Vsv*Vwx)ex!a*V!a!b!4t!b;'S*V;'S;=`*s<%lO*V!R!%Q]!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!%y!O!f*V!f!g!']!g#W*V#W#X!0`#X;'S*V;'S;=`*s<%lO*V!R!&QX!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!&m!O;'S*V;'S;=`*s<%lO*V!R!&vV!b`!dp!ePOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!'dX!b`!dpOr*Vrs(Vsv*Vwx)ex!q*V!q!r!(P!r;'S*V;'S;=`*s<%lO*V!R!(WX!b`!dpOr*Vrs(Vsv*Vwx)ex!e*V!e!f!(s!f;'S*V;'S;=`*s<%lO*V!R!(zX!b`!dpOr*Vrs(Vsv*Vwx)ex!v*V!v!w!)g!w;'S*V;'S;=`*s<%lO*V!R!)nX!b`!dpOr*Vrs(Vsv*Vwx)ex!{*V!{!|!*Z!|;'S*V;'S;=`*s<%lO*V!R!*bX!b`!dpOr*Vrs(Vsv*Vwx)ex!r*V!r!s!*}!s;'S*V;'S;=`*s<%lO*V!R!+UX!b`!dpOr*Vrs(Vsv*Vwx)ex!g*V!g!h!+q!h;'S*V;'S;=`*s<%lO*V!R!+xY!b`!dpOr!+qrs!,hsv!+qvw!-Swx!.[x!`!+q!`!a!/j!a;'S!+q;'S;=`!0Y<%lO!+qq!,mV!dpOv!,hvx!-Sx!`!,h!`!a!-q!a;'S!,h;'S;=`!.U<%lO!,hP!-VTO!`!-S!`!a!-f!a;'S!-S;'S;=`!-k<%lO!-SP!-kO|PP!-nP;=`<%l!-Sq!-xS!dp|POv(Vx;'S(V;'S;=`(h<%lO(Vq!.XP;=`<%l!,ha!.aX!b`Or!.[rs!-Ssv!.[vw!-Sw!`!.[!`!a!.|!a;'S!.[;'S;=`!/d<%lO!.[a!/TT!b`|POr)esv)ew;'S)e;'S;=`)y<%lO)ea!/gP;=`<%l!.[!R!/sV!b`!dp|POr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!0]P;=`<%l!+q!R!0gX!b`!dpOr*Vrs(Vsv*Vwx)ex#c*V#c#d!1S#d;'S*V;'S;=`*s<%lO*V!R!1ZX!b`!dpOr*Vrs(Vsv*Vwx)ex#V*V#V#W!1v#W;'S*V;'S;=`*s<%lO*V!R!1}X!b`!dpOr*Vrs(Vsv*Vwx)ex#h*V#h#i!2j#i;'S*V;'S;=`*s<%lO*V!R!2qX!b`!dpOr*Vrs(Vsv*Vwx)ex#m*V#m#n!3^#n;'S*V;'S;=`*s<%lO*V!R!3eX!b`!dpOr*Vrs(Vsv*Vwx)ex#d*V#d#e!4Q#e;'S*V;'S;=`*s<%lO*V!R!4XX!b`!dpOr*Vrs(Vsv*Vwx)ex#X*V#X#Y!+q#Y;'S*V;'S;=`*s<%lO*V!R!4{Y!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!a!4t!a!b!:]!b;'S!4t;'S;=`!;r<%lO!4tq!5pV!dpOv!5kvx!6Vx!a!5k!a!b!7W!b;'S!5k;'S;=`!8V<%lO!5kP!6YTO!a!6V!a!b!6i!b;'S!6V;'S;=`!7Q<%lO!6VP!6lTO!`!6V!`!a!6{!a;'S!6V;'S;=`!7Q<%lO!6VP!7QOyPP!7TP;=`<%l!6Vq!7]V!dpOv!5kvx!6Vx!`!5k!`!a!7r!a;'S!5k;'S;=`!8V<%lO!5kq!7yS!dpyPOv(Vx;'S(V;'S;=`(h<%lO(Vq!8YP;=`<%l!5ka!8bX!b`Or!8]rs!6Vsv!8]vw!6Vw!a!8]!a!b!8}!b;'S!8];'S;=`!:V<%lO!8]a!9SX!b`Or!8]rs!6Vsv!8]vw!6Vw!`!8]!`!a!9o!a;'S!8];'S;=`!:V<%lO!8]a!9vT!b`yPOr)esv)ew;'S)e;'S;=`)y<%lO)ea!:YP;=`<%l!8]!R!:dY!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!`!4t!`!a!;S!a;'S!4t;'S;=`!;r<%lO!4t!R!;]V!b`!dpyPOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!;uP;=`<%l!4t!V!<TXjSaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X",
      tokenizers: [lr, sr, or, nr, ar, rr, 0, 1, 2, 3, 4, 5],
      topRules: {
        Document: [0, 16]
      },
      dialects: {
        noMatch: 0,
        selfClosing: 515
      },
      tokenPrec: 517
    });
  function pt(O, e) {
    var t = Object.create(null);
    for (var _iterator20 = _createForOfIteratorHelperLoose(O.getChildren(st)), _step20; !(_step20 = _iterator20()).done;) {
      var a = _step20.value;
      var r = a.getChild(Ca),
        i = a.getChild(CO) || a.getChild(ot);
      r && (t[e.read(r.from, r.to)] = i ? i.type.id == CO ? e.read(i.from + 1, i.to - 1) : e.read(i.from, i.to) : "");
    }
    return t;
  }
  function et(O, e) {
    var t = O.getChild(La);
    return t ? e.read(t.from, t.to) : " ";
  }
  function LO(O, e, t) {
    var a;
    for (var _iterator21 = _createForOfIteratorHelperLoose(t), _step21; !(_step21 = _iterator21()).done;) {
      var r = _step21.value;
      if (!r.attrs || r.attrs(a || (a = pt(O.node.parent.firstChild, e)))) return {
        parser: r.parser,
        bracketed: !0
      };
    }
    return null;
  }
  function IO(O, e) {
    if (O === void 0) {
      O = [];
    }
    if (e === void 0) {
      e = [];
    }
    var t = [],
      a = [],
      r = [],
      i = [];
    for (var _iterator22 = _createForOfIteratorHelperLoose(O), _step22; !(_step22 = _iterator22()).done;) {
      var l = _step22.value;
      (l.tag == "script" ? t : l.tag == "style" ? a : l.tag == "textarea" ? r : i).push(l);
    }
    var n = e.length ? Object.create(null) : null;
    for (var _iterator23 = _createForOfIteratorHelperLoose(e), _step23; !(_step23 = _iterator23()).done;) {
      var _l = _step23.value;
      (n[_l.name] || (n[_l.name] = [])).push(_l);
    }
    return (0, tt.parseMixed)(function (l, s) {
      var Q = l.type.id;
      if (Q == Ea) return LO(l, s, t);
      if (Q == Ua) return LO(l, s, a);
      if (Q == Aa) return LO(l, s, r);
      if (Q == lt && i.length) {
        var o = l.node,
          c = o.firstChild,
          p = c && et(c, s),
          $;
        if (p) {
          for (var _i4 = 0, _i3 = i; _i4 < _i3.length; _i4++) {
            var h = _i3[_i4];
            if (h.tag == p && (!h.attrs || h.attrs($ || ($ = pt(c, s))))) {
              var m = o.lastChild,
                w = m.type.id == Ia ? m.from : o.to;
              if (w > c.to) return {
                parser: h.parser,
                overlay: [{
                  from: c.to,
                  to: w
                }]
              };
            }
          }
        }
      }
      if (n && Q == st) {
        var _o = l.node,
          _c;
        if (_c = _o.firstChild) {
          var _p4 = n[s.read(_c.from, _c.to)];
          if (_p4) {
            for (var _iterator24 = _createForOfIteratorHelperLoose(_p4), _step24; !(_step24 = _iterator24()).done;) {
              var _$5 = _step24.value;
              if (_$5.tagName && _$5.tagName != et(_o.parent, s)) continue;
              var _h3 = _o.lastChild;
              if (_h3.type.id == CO) {
                var _m3 = _h3.from + 1,
                  _w = _h3.lastChild,
                  b = _h3.to - (_w && _w.isError ? 0 : 1);
                if (b > _m3) return {
                  parser: _$5.parser,
                  overlay: [{
                    from: _m3,
                    to: b
                  }],
                  bracketed: !0
                };
              } else if (_h3.type.id == ot) return {
                parser: _$5.parser,
                overlay: [{
                  from: _h3.from,
                  to: _h3.to
                }]
              };
            }
          }
        }
      }
      return null;
    });
  }
  var L = require("@lezer/lr"),
    S = require("@lezer/highlight"),
    cr = 148,
    ut = 1,
    pr = 149,
    ur = 150,
    $t = 2,
    dr = 151,
    $r = 3,
    fr = 4,
    ft = [9, 10, 11, 12, 13, 32, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288],
    mr = 58,
    hr = 40,
    mt = 95,
    gr = 91,
    mO = 45,
    Sr = 46,
    Pr = 35,
    Zr = 37,
    Xr = 38,
    kr = 92,
    br = 10,
    xr = 42;
  function rO(O) {
    return O >= 65 && O <= 90 || O >= 97 && O <= 122 || O >= 161;
  }
  function BO(O) {
    return O >= 48 && O <= 57;
  }
  function dt(O) {
    return BO(O) || O >= 97 && O <= 102 || O >= 65 && O <= 70;
  }
  var ht = function ht(O, e, t) {
      return function (a, r) {
        for (var i = !1, n = 0, l = 0;; l++) {
          var s = a.next;
          if (rO(s) || s == mO || s == mt || i && BO(s)) !i && (s != mO || l > 0) && (i = !0), n === l && s == mO && n++, a.advance();else if (s == kr && a.peek(1) != br) {
            if (a.advance(), dt(a.next)) {
              do a.advance(); while (dt(a.next));
              a.next == 32 && a.advance();
            } else a.next > -1 && a.advance();
            i = !0;
          } else {
            i && a.acceptToken(n == 2 && r.canShift($t) ? e : s == hr ? t : O);
            break;
          }
        }
      };
    },
    yr = new L.ExternalTokenizer(ht(pr, $t, ur), {
      contextual: !0
    }),
    wr = new L.ExternalTokenizer(ht(dr, $r, fr), {
      contextual: !0
    }),
    Tr = new L.ExternalTokenizer(function (O) {
      if (ft.includes(O.peek(-1))) {
        var _e4 = O.next;
        (rO(_e4) || _e4 == mt || _e4 == Pr || _e4 == Sr || _e4 == xr || _e4 == gr || _e4 == mr && rO(O.peek(1)) || _e4 == mO || _e4 == Xr) && O.acceptToken(cr);
      }
    }),
    Yr = new L.ExternalTokenizer(function (O) {
      if (!ft.includes(O.peek(-1))) {
        var _e5 = O.next;
        if (_e5 == Zr && (O.advance(), O.acceptToken(ut)), rO(_e5)) {
          do O.advance(); while (rO(O.next) || BO(O.next));
          O.acceptToken(ut);
        }
      }
    }),
    jr = (0, S.styleTags)({
      "AtKeyword import charset namespace keyframes media supports font-feature-values": S.tags.definitionKeyword,
      "from to selector scope MatchFlag": S.tags.keyword,
      NamespaceName: S.tags.namespace,
      KeyframeName: S.tags.labelName,
      KeyframeRangeName: S.tags.operatorKeyword,
      TagName: S.tags.tagName,
      ClassName: S.tags.className,
      PseudoClassName: S.tags.constant(S.tags.className),
      IdName: S.tags.labelName,
      "FeatureName PropertyName": S.tags.propertyName,
      AttributeName: S.tags.attributeName,
      NumberLiteral: S.tags.number,
      KeywordQuery: S.tags.keyword,
      UnaryQueryOp: S.tags.operatorKeyword,
      "CallTag ValueName FontName": S.tags.atom,
      VariableName: S.tags.variableName,
      Callee: S.tags.operatorKeyword,
      Unit: S.tags.unit,
      "UniversalSelector NestingSelector": S.tags.definitionOperator,
      "MatchOp CompareOp": S.tags.compareOperator,
      "ChildOp SiblingOp, LogicOp": S.tags.logicOperator,
      BinOp: S.tags.arithmeticOperator,
      Important: S.tags.modifier,
      Comment: S.tags.blockComment,
      ColorLiteral: S.tags.color,
      "ParenthesizedContent StringLiteral": S.tags.string,
      ":": S.tags.punctuation,
      "PseudoOp #": S.tags.derefOperator,
      "; , |": S.tags.separator,
      "( )": S.tags.paren,
      "[ ]": S.tags.squareBracket,
      "{ }": S.tags.brace
    }),
    vr = {
      __proto__: null,
      lang: 44,
      "nth-child": 44,
      "nth-last-child": 44,
      "nth-of-type": 44,
      "nth-last-of-type": 44,
      dir: 44,
      "host-context": 44,
      if: 90,
      url: 158,
      "url-prefix": 158,
      domain: 158,
      regexp: 158
    },
    _r = {
      __proto__: null,
      or: 104,
      and: 104,
      not: 112,
      only: 112,
      layer: 212
    },
    Rr = {
      __proto__: null,
      selector: 118,
      style: 124,
      layer: 208
    },
    zr = {
      __proto__: null,
      "@import": 204,
      "@media": 216,
      "@charset": 220,
      "@namespace": 224,
      "@keyframes": 230,
      "@supports": 242,
      "@scope": 246,
      "@font-feature-values": 252
    },
    qr = {
      __proto__: null,
      to: 249
    },
    gt = L.LRParser.deserialize({
      version: 14,
      states: "MrQYQdOOO#}QdOOP$UO`OOO%OQaO'#CfOOQP'#Ce'#CeO%VQdO'#CgO%[Q`O'#CgO%aQaO'#FqO&XQdO'#CkO&xQaO'#CcO'SQdO'#CnO'_QdO'#ERO'dQdO'#ETO'oQdO'#E[O'oQdO'#E_OOQP'#Fq'#FqO)RQhO'#FQOOQS'#Fp'#FpOOQS'#FT'#FTQYQdOOO)YQdO'#EeO*iQhO'#EkO)YQdO'#EmO*pQdO'#EoO*{QdO'#ErO)}QhO'#ExO+TQdO'#EzO+`QdO'#E}O+eQaO'#CfO+lQ`O'#EbO+qQ`O'#F}O+|QdO'#F}QOQ`OOP,WO&jO'#CaPOOO)CA`)CA`OOQP'#Ci'#CiOOQP,59R,59RO%VQdO,59ROOQP'#Cm'#CmOOQP,59V,59VO&XQdO,59VO,cQdO,59YO'_QdO,5:mO'dQdO,5:oO'oQdO,5:vO'oQdO,5:xO'oQdO,5:yO'oQdO'#F[O,nQ`O,58}O,vQdO'#EaOOQS,58},58}OOQP'#Cq'#CqOOQO'#EP'#EPOOQP,59Y,59YO,}Q`O,59YO-SQ`O,59YOOQP'#ES'#ESOOQP,5:m,5:mO-XQpO'#EUO-dQdO'#EVO-iQ`O'#EVO-nQpO,5:oO.XQaO,5:vO.oQaO,5:yOOQW'#D^'#D^O/nQhO'#DgO0RQhO,5;lO)}QhO'#DeO0`Q`O'#DnO0eQhO'#D{OOQW'#Fw'#FwOOQS,5;l,5;lO0jQ`O'#DhO0oQ`O'#DkOOQS-E9R-E9ROOQ['#Cv'#CvO0tQdO'#CwO1[QdO'#C}O1rQdO'#DQO2YQ!pO'#DSO4fQ!jO,5;POOQO'#DX'#DXO-SQ`O'#DWO4vQ!nO'#FtO6|Q`O'#DYO7RQ`O'#D|OOQ['#Ft'#FtO7WQhO'#GQO7fQ`O,5;VO7kQ!bO,5;XOOQS'#Eq'#EqO7sQ`O,5;ZO7xQdO,5;ZOOQO'#Et'#EtO8QQ`O,5;^O8VQhO,5;dO'oQdO'#DjOOQS,5;f,5;fO0jQ`O,5;fO8_QdO,5;fOOQS'#Fc'#FcO8gQdO'#FPO7fQ`O,5;iO8oQdO,5:|O9PQdO'#F^O9^Q`O,5<iO9^Q`O,5<iPOOO'#FS'#FSP9iO&jO,58{POOO,58{,58{OOQP1G.m1G.mOOQP1G.q1G.qOOQP1G.t1G.tO,}Q`O1G.tO-SQ`O1G.tOOQP1G0X1G0XO9tQpO1G0ZO9|QaO1G0bO:dQaO1G0dO:zQaO1G0eO;bQaO,5;vOOQO-E9Y-E9YOOQS1G.i1G.iO;lQ`O,5:{O;qQdO'#EQO;xQdO'#CuOOQO'#EX'#EXOOQO,5:q,5:qO-dQdO,5:qOOQP1G0Z1G0ZO)YQdO1G0ZO<PQ!jO'#D^O<_Q!bO,59yO<gQhO,5:ROOQO'#Fx'#FxO<bQ!bO,59}O<oQhO'#FdO)}QhO,59{O)}QhO'#FdO=gQhO1G1WOOQS1G1W1G1WO=qQhO,5:PO>lQhO'#DoOOQW,5:Y,5:YOOQW,5:g,5:gOOQW,5:S,5:SO>vQhO,5:VO?bQ!fO'#FuOOQS'#Fu'#FuOOQS'#FV'#FVO@rQdO,59cOOQ[,59c,59cOAYQdO,59iOOQ[,59i,59iOApQdO,59lOOQ[,59l,59lOOQ[,59n,59nO)YQdO,59pOBWQhO'#EgOOQW'#Eg'#EgOBuQ`O1G0kO4oQhO1G0kOOQ[,59r,59rO)}QhO'#D[OOQ[,59t,59tOBzQ#tO,5:hOCVQhO'#F`OCdQ`O,5<lOOQS1G0q1G0qOOQS1G0s1G0sOOQS1G0u1G0uOCoQ`O1G0uOCtQdO'#EuOOQS1G0x1G0xOOQS1G1O1G1OODPQaO,5:UO7fQ`O1G1QOOQS1G1Q1G1QO0jQ`O1G1QOOQS-E9a-E9aOOQS1G1T1G1TODWQ!fO1G0hODnQ`O'#EdOOQO1G0h1G0hOOQO,5;x,5;xODsQdO,5;xOOQO-E9[-E9[OEQQ`O1G2TPOOO-E9Q-E9QPOOO1G.g1G.gOOQP7+$`7+$`OOQP7+%u7+%uO)YQdO7+%uOOQS1G0g1G0gOE]QaO'#F|OEgQ`O,5:lOElQ!fO'#FUOFjQdO'#FsOFtQ`O,59aOOQO1G0]1G0]OFyQ!bO7+%uO)YQdO1G/eOGUQhO1G/iOOQW1G/m1G/mOOQW1G/g1G/gOGgQhO,5<OOOQW-E9b-E9bOOQS7+&r7+&rOH_QhO'#D^OHmQhO'#F{OHxQ`O'#F{OH}Q`O,5:ZOISQ!bO'#D`O>vQhO'#DmOI_QhO'#DsOIgQhO'#DuOIlQ!jO'#FzOOQO'#Fz'#FzOIwQ`O'#DxOJPQ!bO'#DzOOQO'#Fy'#FyOJUQ`O1G/qOOQS-E9T-E9TOOQ[1G.}1G.}OOQ[1G/T1G/TOOQ[1G/W1G/WOOQ[1G/[1G/[OJZQdO,5;ROOQS7+&V7+&VOJ`Q`O7+&VOJeQhO'#D]OJmQ`O,59vO)}QhO,59vOOQ[1G0S1G0SOJuQ`O1G0SOJzQhO,5;zOOQO-E9^-E9^OOQS7+&a7+&aOKYQbO'#DSOOQO'#Ew'#EwOKhQ`O'#EvOOQO'#Ev'#EvOKsQ`O'#FaOK{QdO,5;aOOQS,5;a,5;aOOQ[1G/p1G/pOOQS7+&l7+&lO7fQ`O7+&lOLWQ!fO'#F]O)YQdO'#F]OM_QdO7+&SOOQO7+&S7+&SOOQO,5;O,5;OOOQO1G1d1G1dOMrQ!bO<<IaOM}QdO'#FZONXQ`O,5<hOOQP1G0W1G0WOOQS-E9S-E9SONaQdO'#FYONkQ`O,5<_OOQ]1G.{1G.{OOQP<<Ia<<IaONsQ`O<<IaONxQdO7+%POOQO'#D`'#D`O! PQ!bO7+%TO! XQhO'#FXO! fQ`O,5<gO)YQdO,5<gOOQW1G/u1G/uO! nQ`O,5:XO>vQhO'#DtOOQO,5:_,5:_O! sQhO,5:aO! {QhO,5:fO)YQdO,5:dOOQW7+%]7+%]OOQO'#Ei'#EiO!!SQ`O1G0mOOQS<<Iq<<IqO)YQdO,59wO!!vQhO1G/bOOQ[1G/b1G/bO!!}Q`O1G/bOOQW-E9U-E9UOOQ[7+%n7+%nOOQO,5;b,5;bOCwQdO'#FbOKsQ`O,5;{OOQS,5;{,5;{OOQS-E9_-E9_OOQS1G0{1G0{OOQS<<JW<<JWO!#VQ!fO,5;wOOQS-E9Z-E9ZOOQO<<In<<InOOQPAN>{AN>{O!$^Q`OAN>{O!$cQaO,5;uOOQO-E9X-E9XO!$mQdO,5;tOOQO-E9W-E9WOOQW<<Hk<<HkOOQW<<Ho<<HoO!$wQhO<<HoO!%YQhO'#D^O!%hQhO,5;sO!%sQ`O,5;sOOQO-E9V-E9VO!%xQdO1G2RO!&SQhO1G/sO!&[Q`O,5:`O>vQhO'#DwOOQO1G/{1G/{O!&aQ!bO1G0QO!&iQdO1G0OOJZQdO'#F_O!&pQ`O7+&XOOQW7+&X7+&XO!&xQ!bO1G/cOOQ[7+$|7+$|O!'TQhO7+$|P!'[Q`O'#FWOOQO,5;|,5;|OOQO-E9`-E9`OOQS1G1g1G1gOOQPG24gG24gO!'aQ`OAN>ZO)YQdO1G1_O!'fQ`O7+'mOOQO1G/z1G/zO!'nQ`O,5:cO!'sQhO7+%lOOQO,5;y,5;yOOQO-E9]-E9]OOQW<<Is<<IsOOQ[<<Hh<<HhPOQW,5;r,5;rOOQWG23uG23uO!'zQdO7+&yOOQO1G/}1G/}OOQO<<IW<<IW",
      stateData: "!(_~O$_OS$`QQ~OWVO^_O`WOcYOdYOl`OmZOp[O#P]O#S^O#YdO#`eO#bfO#dgO#ghO#miO#ojO#rkO$ZRO$fTO~OQmOWVO^_O`WOcYOdYOl`OmZOp[O#P]O#S^O#YdO#`eO#bfO#dgO#ghO#miO#ojO#rkO$ZlO$fTO~O$X$qP~P!jO$`qO~O`YXcYXdYXmYXpYXsYX!eYX#PYX#SYX$YYX$f[X~OgYX~P$ZO$ZsO~O$fuO~O$fuO`$eXc$eXd$eXm$eXp$eXs$eX!e$eX#P$eX#S$eX$Y$eXg$eX~O$ZvO~O`xOcyOdyOmzOp{O#P|O#S!OO$Y}O~Os!RO!e!PO~P&^Of!XO$Z!TO$[!UO~O$Z!YO~OW!^O$Z![O$f!]O~OWVO^_O`WOcYOdYOmZOp[O#P]O#S^O$ZRO$fTO~OS!fOc!gOd!gOh!cOs!RO!Y!eO!]!jO!`!kO$]!bO~On!iO~P(dOQ!uOh!nOp!oOs!pOu!xOw!xO}!vO!q!wO$Z!mO$[!sO$j!qO~OS!fOc!gOd!gOh!cO!Y!eO!]!jO!`!kO$]!bO~Os$tP~P)}Ow!}O!q!wO$Z!|O~Ow#PO$Z#PO~Oh#SOs!RO#p#UO~O$Z#WO~Oc#VX~P$ZOc#ZO~On#[O$X$qXr$qX~O$X$qXr$qX~P!jO$a#_O$b#_O$c#aO~Of#fO$Z!TO$[!UO~Os!RO!e!PO~Or$qP~P!jOh#pO~Oh#qO~Oo!xX!|!xX$f!zX~O$Z#rO~O$f#tO~Oo#uO!|#vO~O`xOcyOdyOmzOp{O~Os#Oa!e#Oa#P#Oa#S#Oa$Y#Oag#Oa~P-vOs#Ra!e#Ra#P#Ra#S#Ra$Y#Rag#Ra~P-vOS!fOc!gOd!gOh!cO!Y!eO!]!jO!`!kO~OR#zOu#zOw#zO$]#wO$j!qO~P/VOn$QO!U#}O!e$OO~P(dOh$SO~O$]$UO~Oh#SO~Oh$WO~O`$YOc$YOg$]Ol$YOm$YOn$YO~P)YO`$YOc$YOl$YOm$YOn$YOo$_O~P)YO`$YOc$YOl$YOm$YOn$YOr$aO~P)YOP$bOSvXcvXdvXhvXnvXyvX!YvX!]vX!`vX#[vX#^vX$]vX!WvXQvX`vXgvXlvXmvXpvXsvXuvXwvX}vX!qvX$ZvX$[vX$jvXovXrvX!evX$XvX$svX!}vX~Oy$cO#[$dO#^$eOn$tP~P)}Oh#qOS$hXc$hXd$hXn$hXy$hX!Y$hX!]$hX!`$hX#[$hX#^$hX$]$hXQ$hX`$hXg$hXl$hXm$hXp$hXs$hXu$hXw$hX}$hX!q$hX$Z$hX$[$hX$j$hXo$hXr$hX!e$hX$X$hX$s$hX!}$hX~Oh$iO~Oh$kO~O!U#}O!e$lOs$tXn$tX~Os!RO~On$oOy$cO~On$pO~Ow$qO!q!wO~Os$rO~Os!RO!U#}O~Os!RO#p$xO~O$Z#WOs#sX~O$s$|On#Ua$X#Uar#Ua~P)YOn$QX$X$QXr$QX~P!jOn#[O$X$qar$qa~O$a#_O$b#_O$c%TO~Oo%VO!|%WO~Os#Oi!e#Oi#P#Oi#S#Oi$Y#Oig#Oi~P-vOs#Qi!e#Qi#P#Qi#S#Qi$Y#Qig#Qi~P-vOs#Ri!e#Ri#P#Ri#S#Ri$Y#Rig#Ri~P-vOs$Oa!e$Oa~P&^Or%XO~Og$pP~P'oOg$gP~P)YOc!SXg!QX!U!QX!W!SX~Oc%aO!W%bO~Og%cO!U#}O~O!U#}OS$WXc$WXd$WXh$WXn$WXs$WX!Y$WX!]$WX!`$WX!e$WX$]$WX~On%gO!e$OO~P(dO!U#}OS!Xac!Xad!Xah!Xan!Xas!Xa!Y!Xa!]!Xa!`!Xa!e!Xa$]!Xag!Xa~O$]%hOg$oP~P/VOR#zOS!fOh%mOu#zOw#zO!Y%nO$]%lO$j!qO~Oy$cOQ$iX`$iXc$iXg$iXh$iXl$iXm$iXn$iXp$iXs$iXu$iXw$iX}$iX!q$iX$Z$iX$[$iX$j$iXo$iXr$iX~O`$YOc$YOg%wOl$YOm$YOn$YO~P)YO`$YOc$YOl$YOm$YOn$YOo%xO~P)YO`$YOc$YOl$YOm$YOn$YOr%yO~P)YOh%{OS#ZXc#ZXd#ZXn#ZX!Y#ZX!]#ZX!`#ZX$]#ZX~On%|O~Og&ROw&SO!r&SO~Os$SX!e$SXn$SX~P)}O!e$lOs$tan$ta~On&VO~Or&^O$Z&XO$j&WO~Og&_O~P&^Oy$cO!e&cO$s$|On#Ui$X#Uir#Ui~P)YO$r&fO~On$Qa$X$Qar$Qa~P!jOn#[O$X$qir$qi~O!e&iOg$pX~P&^Og&kO~Oy$cOQ#xXg#xXh#xXp#xXs#xXu#xXw#xX}#xX!e#xX!q#xX$Z#xX$[#xX$j#xX~O!e&mOg$gX~P)YOg&oO~Oo&pOy$cO!}&qO~OR#zOu#zOw#zO$]&sO$j!qO~O!U#}OS$Wac$Wad$Wah$Wan$Was$Wa!Y$Wa!]$Wa!`$Wa!e$Wa$]$Wa~Oc!dXg!QX!U!QX!e!QX~O!U#}O!e&uOg$oX~Oc&wO~Og&xO~Oc!mXg!mX!W!SX~OS!fOh&zO~O!U&|O~O!U&|O!W&}Og$nX~Oc'OOg!lX~O!W&}O~Og'PO~O$Z'QO~On'SO~Oc'TO!U#}O~Og'VOn'UO~Og'YO~O!U#}Os$Sa!e$San$Sa~OP$bOsvX!evXgvX~O$j&WOs#jX!e#jX~Os!RO!e'[O~Or'`O$Z&XO$j&WO~Oy$cOQ$PXh$PXn$PXp$PXs$PXu$PXw$PX}$PX!e$PX!q$PX$X$PX$Z$PX$[$PX$j$PX$s$PXr$PX~O!e&cO$s$|On#Uq$X#Uqr#Uq~P)YOo'eOy$cO!}'fO~Og#}X!e#}X~P'oO!e&iOg$pa~Og#|X!e#|X~P)YO!e&mOg$ga~Oo'eO~Og'kO~P)YOg'lO!W'mO~O$]'nOg#{X!e#{X~P/VO!e&uOg$oa~Og'sO~OS!fOh'uO~OS!fO~PGUO`'yOg'{O~OS#zac#zad#zah#za!Y#za!]#za!`#za$]#za~Og'}O~P!![Og'}On(OO~Oy$cOQ$Pah$Pan$Pap$Pas$Pau$Paw$Pa}$Pa!e$Pa!q$Pa$X$Pa$Z$Pa$[$Pa$j$Pa$s$Par$Pa~Oo(TO~Og#}a!e#}a~P&^Og#|a!e#|a~P)YOR#zOu#zOw#zO$]&sO$j&WO~Oc!fXg!QX!U!QX!e!QX~O!U#}Og#{a!e#{a~Oc(VO~O!e&uOg$oi~P)YOg!ai!U!ji~Og(XO~O!W(ZOg!ni~Og!li~P)YO`'yOg(^O~Oy$cOg!Pin!Pi~Og(_O~P!![On(`O~Og(aO~O!e&uOg$oq~Og(cO~OS!fO~P!$wOg#{q!e#{q~P)YO$_!r$`$j`$jy#S~",
      goto: "7g$uPPPPP$vP$yP%S%f%S%x&[P%SP&b%SPP&hPPP&n&x&xPPPPP&xPP&xP'hP&xP&x(k&xP)Z)^)d)d)v)dP)dP)dP)d)dP*])dP*i*o+e+hP+k*i+n*i+q+w+z,Q+z)d,WPP,|-S%S-Y%S-`-`-f-jPP%SP%S%SP-p.l.y/Q$yP/ZP/^P$yP$yP$yP/d$yP/g/j/m/t$yP$yPP$yP/y$yP/|0S0c0}1]1c1m1s1y2P2V2a2g2m2s2y3PPPPPPPPPPPP3V3`P4U4X5]P5e6_6t+z7Q7T7WPP7^RrQ_aOPco!R#[%Pq_OP]^co|}!O!P!R#S#[#p%P&iqSOP]^co|}!O!P!R#S#[#p%P&iqUOP]^co|}!O!P!R#S#[#p%P&iQtTR#buQwWR#cxQ!VYR#dyQ#d!XS$h!t!uR%U#f!Z!xdf!n!o!p#Z#q#v$[$^$`$c${%W%]%a&c&d&m&r&w'O'T'i'r'x(V(b!Y!xdf!n!o!p#Z#q#v$[$^$`$c${%W%]%a&c&d&m&r&w'O'T'i'r'x(V(bb#z!c$W%b%m&z&}'m'u(ZU&Z$r&]'[R'Z&Y!Z!tdf!n!o!p#Z#q#v$[$^$`$c${%W%]%a&c&d&m&r&w'O'T'i'r'x(V(bR$j!vQ&P$iR'W&Qq!h`ei!c!d!e!r#}$O$P$S$g$i$l&Q&uQ#x!cW%s$W%m&z'uQ&t%bQ'w&}Q(U'mR(d(ZQ#VjQ$V!jQ$v#UR&a$xX%q$W%m&z'up!h`ei!c!d!e!r#}$O$P$S$g$i$l&Q&uW%p$W%m&z'uQ&{%nQ'v&|Q'w&}R(d(ZR$T!fR%j$SR'p&uR&{%nX%o$W%m&z'uR'v&|X%t$W%m&z'uX%r$W%m&z'u!Y!xdf!n!o!p#Z#q#v$[$^$`$c${%W%]%a&c&d&m&r&w'O'T'i'r'x(V(bQ!}gR$q#OQ!WYR#eyQ#d!WR%U#eQ!ZZR#gzQ!_[R#h{T!^[{Q#s!]R%_#tQ!SXQ!i`Q#TjQ#n!QQ$Q!dQ$n!zQ$t#RQ$w#VQ$z#YQ%g$PQ&`$vQ'^&[Q'a&aR(S']SnP!RQ#^oQ%O#[R&g%PZmPo!R#[%PQ$}#ZQ&e${R'd&dR$g!rQ'R%{R(['yR#OgR#QhR$s#QS&[$r&]R(Q'[V&Y$r&]'[R#YkQ#`qR%S#`QcOSoP!RU!lco%PR%P#[Q%]#q[&l%]&r'i'r'x(bQ&r%aQ'i&mQ'r&wQ'x'OR(b(VQ$[!nQ$^!oQ$`!pV%v$[$^$`Q&Q$iR'X&QQ&v%iS'q&v(WR(W'rQ&n%]R'j&nQ&j%YR'h&jQ!QXR#m!QQ&d${R'c&dQ#]nS%Q#]%RR%R#^Q'z'RR(]'zQ$m!yR&U$mQ&]$rR'_&]Q']&[R(R']Q#XkR$y#XQ$P!dR%f$P_bOPco!R#[%P^XOPco!R#[%PQ!`]Q!a^Q#i|Q#j}Q#k!OQ#l!PQ$u#SQ%Y#pR'g&iR%^#qQ!rdQ!{f[$X!n!o!p$[$^$`Q${#Zh%[#q%]%a&m&r&w'O'i'r'x(V(bQ%`#vQ%z$cS&b${&dQ&h%WQ'b&cR'|'T]$Z!n!o!p$[$^$`Q!d`U!ye!r$gQ#RiQ#y!cS#|!d$PQ$R!eQ%d#}Q%e$OQ%i$SS&O$i&QQ&T$lR'o&uQ#{!cW%s$W%m&z'uQ&t%bQ'w&}Q(U'mR(d(ZQ%u$WQ&y%mQ't&zR(Y'uR%k$SR%Z#pQpPR#o!RQ!zeQ$f!rR%}$g",
      nodeNames: "\u26A0 Unit VariableName VariableName QueryCallee Comment StyleSheet RuleSet UniversalSelector TagSelector TagName NamespacedTagSelector NamespaceName TagName NestingSelector ClassSelector . ClassName PseudoClassSelector : :: PseudoClassName PseudoClassName ) ( ArgList ValueName ParenthesizedValue AtKeyword # ; ] [ BracketedValue } { BracedValue ColorLiteral NumberLiteral StringLiteral BinaryExpression BinOp CallExpression Callee IfExpression if ArgList IfBranch KeywordQuery FeatureQuery FeatureName BinaryQuery LogicOp ComparisonQuery CompareOp UnaryQuery UnaryQueryOp ParenthesizedQuery SelectorQuery selector ParenthesizedSelector StyleQuery style ParenthesedQuery CallQuery ArgList PropertyName , PropertyName UnaryQuery ParenthesedQuery BinaryQuery ParenthesedQuery ParenthesedQuery StyleFeature PropertyName StyleRange PseudoQuery CallLiteral CallTag ParenthesizedContent PseudoClassName ArgList IdSelector IdName AttributeSelector AttributeName NamespacedAttribute NamespaceName AttributeName MatchOp MatchFlag ChildSelector ChildOp DescendantSelector SiblingSelector SiblingOp Block Declaration PropertyName Important ImportStatement import Layer layer LayerName layer MediaStatement media CharsetStatement charset NamespaceStatement namespace NamespaceName KeyframesStatement keyframes KeyframeName KeyframeList KeyframeSelector KeyframeRangeName SupportsStatement supports ScopeStatement scope to FontFeatureStatement font-feature-values FontName AtRule Styles",
      maxTerm: 174,
      nodeProps: [["isolate", -2, 5, 39, ""], ["openedBy", 23, "(", 31, "[", 34, "{"], ["closedBy", 24, ")", 32, "]", 35, "}"]],
      propSources: [jr],
      skippedNodes: [0, 5, 130],
      repeatNodeCount: 17,
      tokenData: "K`~R!bOX%ZX^&R^p%Zpq&Rqr)ers)vst+jtu2Xuv%Zvw3Rwx3dxy5Ryz5dz{5i{|6S|}:u}!O;W!O!P;u!P!Q<^!Q![=V![!]>Q!]!^>|!^!_?_!_!`@Z!`!a@n!a!b%Z!b!cAo!c!k%Z!k!lC|!l!u%Z!u!vC|!v!}%Z!}#OD_#O#P%Z#P#QDp#Q#R2X#R#]%Z#]#^ER#^#g%Z#g#hC|#h#o%Z#o#pIf#p#qIw#q#rJ`#r#sJq#s#y%Z#y#z&R#z$f%Z$f$g&R$g#BY%Z#BY#BZ&R#BZ$IS%Z$IS$I_&R$I_$I|%Z$I|$JO&R$JO$JT%Z$JT$JU&R$JU$KV%Z$KV$KW&R$KW&FU%Z&FU&FV&R&FV;'S%Z;'S;=`KY<%lO%Z`%^SOy%jz;'S%j;'S;=`%{<%lO%j`%oS!r`Oy%jz;'S%j;'S;=`%{<%lO%j`&OP;=`<%l%j~&Wh$_~OX%jX^'r^p%jpq'rqy%jz#y%j#y#z'r#z$f%j$f$g'r$g#BY%j#BY#BZ'r#BZ$IS%j$IS$I_'r$I_$I|%j$I|$JO'r$JO$JT%j$JT$JU'r$JU$KV%j$KV$KW'r$KW&FU%j&FU&FV'r&FV;'S%j;'S;=`%{<%lO%j~'yh$_~!r`OX%jX^'r^p%jpq'rqy%jz#y%j#y#z'r#z$f%j$f$g'r$g#BY%j#BY#BZ'r#BZ$IS%j$IS$I_'r$I_$I|%j$I|$JO'r$JO$JT%j$JT$JU'r$JU$KV%j$KV$KW'r$KW&FU%j&FU&FV'r&FV;'S%j;'S;=`%{<%lO%jj)jS$sYOy%jz;'S%j;'S;=`%{<%lO%j~)yWOY)vZr)vrs*cs#O)v#O#P*h#P;'S)v;'S;=`+d<%lO)v~*hOw~~*kRO;'S)v;'S;=`*t;=`O)v~*wXOY)vZr)vrs*cs#O)v#O#P*h#P;'S)v;'S;=`+d;=`<%l)v<%lO)v~+gP;=`<%l)vj+oYmYOy%jz!Q%j!Q![,_![!c%j!c!i,_!i#T%j#T#Z,_#Z;'S%j;'S;=`%{<%lO%jj,dY!r`Oy%jz!Q%j!Q![-S![!c%j!c!i-S!i#T%j#T#Z-S#Z;'S%j;'S;=`%{<%lO%jj-XY!r`Oy%jz!Q%j!Q![-w![!c%j!c!i-w!i#T%j#T#Z-w#Z;'S%j;'S;=`%{<%lO%jj.OYuY!r`Oy%jz!Q%j!Q![.n![!c%j!c!i.n!i#T%j#T#Z.n#Z;'S%j;'S;=`%{<%lO%jj.uYuY!r`Oy%jz!Q%j!Q![/e![!c%j!c!i/e!i#T%j#T#Z/e#Z;'S%j;'S;=`%{<%lO%jj/jY!r`Oy%jz!Q%j!Q![0Y![!c%j!c!i0Y!i#T%j#T#Z0Y#Z;'S%j;'S;=`%{<%lO%jj0aYuY!r`Oy%jz!Q%j!Q![1P![!c%j!c!i1P!i#T%j#T#Z1P#Z;'S%j;'S;=`%{<%lO%jj1UY!r`Oy%jz!Q%j!Q![1t![!c%j!c!i1t!i#T%j#T#Z1t#Z;'S%j;'S;=`%{<%lO%jj1{SuY!r`Oy%jz;'S%j;'S;=`%{<%lO%jd2[UOy%jz!_%j!_!`2n!`;'S%j;'S;=`%{<%lO%jd2uS!|S!r`Oy%jz;'S%j;'S;=`%{<%lO%jb3WS^QOy%jz;'S%j;'S;=`%{<%lO%j~3gWOY3dZw3dwx*cx#O3d#O#P4P#P;'S3d;'S;=`4{<%lO3d~4SRO;'S3d;'S;=`4];=`O3d~4`XOY3dZw3dwx*cx#O3d#O#P4P#P;'S3d;'S;=`4{;=`<%l3d<%lO3d~5OP;=`<%l3dj5WShYOy%jz;'S%j;'S;=`%{<%lO%j~5iOg~n5pUWQyWOy%jz!_%j!_!`2n!`;'S%j;'S;=`%{<%lO%jj6ZWyW#SQOy%jz!O%j!O!P6s!P!Q%j!Q![9x![;'S%j;'S;=`%{<%lO%jj6xU!r`Oy%jz!Q%j!Q![7[![;'S%j;'S;=`%{<%lO%jj7cY!r`$jYOy%jz!Q%j!Q![7[![!g%j!g!h8R!h#X%j#X#Y8R#Y;'S%j;'S;=`%{<%lO%jj8WY!r`Oy%jz{%j{|8v|}%j}!O8v!O!Q%j!Q![9_![;'S%j;'S;=`%{<%lO%jj8{U!r`Oy%jz!Q%j!Q![9_![;'S%j;'S;=`%{<%lO%jj9fU!r`$jYOy%jz!Q%j!Q![9_![;'S%j;'S;=`%{<%lO%jj:P[!r`$jYOy%jz!O%j!O!P7[!P!Q%j!Q![9x![!g%j!g!h8R!h#X%j#X#Y8R#Y;'S%j;'S;=`%{<%lO%jj:zS!eYOy%jz;'S%j;'S;=`%{<%lO%jj;]WyWOy%jz!O%j!O!P6s!P!Q%j!Q![9x![;'S%j;'S;=`%{<%lO%jj;zU`YOy%jz!Q%j!Q![7[![;'S%j;'S;=`%{<%lO%j~<cTyWOy%jz{<r{;'S%j;'S;=`%{<%lO%j~<yS!r`$`~Oy%jz;'S%j;'S;=`%{<%lO%jj=[[$jYOy%jz!O%j!O!P7[!P!Q%j!Q![9x![!g%j!g!h8R!h#X%j#X#Y8R#Y;'S%j;'S;=`%{<%lO%jj>VUcYOy%jz![%j![!]>i!];'S%j;'S;=`%{<%lO%jj>pSdY!r`Oy%jz;'S%j;'S;=`%{<%lO%jj?RSnYOy%jz;'S%j;'S;=`%{<%lO%jh?dU!WWOy%jz!_%j!_!`?v!`;'S%j;'S;=`%{<%lO%jh?}S!WW!r`Oy%jz;'S%j;'S;=`%{<%lO%jl@bS!WW!|SOy%jz;'S%j;'S;=`%{<%lO%jj@uV#PQ!WWOy%jz!_%j!_!`?v!`!aA[!a;'S%j;'S;=`%{<%lO%jbAcS#PQ!r`Oy%jz;'S%j;'S;=`%{<%lO%jjArYOy%jz}%j}!OBb!O!c%j!c!}CP!}#T%j#T#oCP#o;'S%j;'S;=`%{<%lO%jjBgW!r`Oy%jz!c%j!c!}CP!}#T%j#T#oCP#o;'S%j;'S;=`%{<%lO%jjCW[lY!r`Oy%jz}%j}!OCP!O!Q%j!Q![CP![!c%j!c!}CP!}#T%j#T#oCP#o;'S%j;'S;=`%{<%lO%jhDRS!}WOy%jz;'S%j;'S;=`%{<%lO%jjDdSpYOy%jz;'S%j;'S;=`%{<%lO%jnDuSo^Oy%jz;'S%j;'S;=`%{<%lO%jjEWU!}WOy%jz#a%j#a#bEj#b;'S%j;'S;=`%{<%lO%jbEoU!r`Oy%jz#d%j#d#eFR#e;'S%j;'S;=`%{<%lO%jbFWU!r`Oy%jz#c%j#c#dFj#d;'S%j;'S;=`%{<%lO%jbFoU!r`Oy%jz#f%j#f#gGR#g;'S%j;'S;=`%{<%lO%jbGWU!r`Oy%jz#h%j#h#iGj#i;'S%j;'S;=`%{<%lO%jbGoU!r`Oy%jz#T%j#T#UHR#U;'S%j;'S;=`%{<%lO%jbHWU!r`Oy%jz#b%j#b#cHj#c;'S%j;'S;=`%{<%lO%jbHoU!r`Oy%jz#h%j#h#iIR#i;'S%j;'S;=`%{<%lO%jbIYS$rQ!r`Oy%jz;'S%j;'S;=`%{<%lO%jjIkSsYOy%jz;'S%j;'S;=`%{<%lO%jfI|U$fUOy%jz!_%j!_!`2n!`;'S%j;'S;=`%{<%lO%jjJeSrYOy%jz;'S%j;'S;=`%{<%lO%jfJvU#SQOy%jz!_%j!_!`2n!`;'S%j;'S;=`%{<%lO%j`K]P;=`<%l%Z",
      tokenizers: [Tr, Yr, yr, wr, 1, 2, 3, 4, new L.LocalTokenGroup("m~RRYZ[z{a~~g~aO$b~~dP!P!Qg~lO$c~~", 28, 155)],
      topRules: {
        StyleSheet: [0, 6],
        Styles: [1, 129]
      },
      dynamicPrecedences: {
        97: 1
      },
      specialized: [{
        term: 150,
        get: function get(O) {
          return vr[O] || -1;
        }
      }, {
        term: 151,
        get: function get(O) {
          return _r[O] || -1;
        }
      }, {
        term: 4,
        get: function get(O) {
          return Rr[O] || -1;
        }
      }, {
        term: 28,
        get: function get(O) {
          return zr[O] || -1;
        }
      }, {
        term: 149,
        get: function get(O) {
          return qr[O] || -1;
        }
      }],
      tokenPrec: 2444
    });
  var _ = require("@codemirror/language"),
    hO = require("@lezer/common"),
    NO = null;
  function DO() {
    if (!NO && typeof document == "object" && document.body) {
      var _O2 = document.body.style,
        _e6 = [],
        t = new Set();
      for (var a in _O2) a != "cssText" && a != "cssFloat" && typeof _O2[a] == "string" && (/[A-Z]/.test(a) && (a = a.replace(new RegExp("[A-Z]", "g"), function (r) {
        return "-" + r.toLowerCase();
      })), t.has(a) || (_e6.push(a), t.add(a)));
      NO = _e6.sort().map(function (a) {
        return {
          type: "property",
          label: a,
          apply: a + ": "
        };
      });
    }
    return NO || [];
  }
  var St = ["active", "after", "any-link", "autofill", "backdrop", "before", "checked", "cue", "default", "defined", "disabled", "empty", "enabled", "file-selector-button", "first", "first-child", "first-letter", "first-line", "first-of-type", "focus", "focus-visible", "focus-within", "fullscreen", "has", "host", "host-context", "hover", "in-range", "indeterminate", "invalid", "is", "lang", "last-child", "last-of-type", "left", "link", "marker", "modal", "not", "nth-child", "nth-last-child", "nth-last-of-type", "nth-of-type", "only-child", "only-of-type", "optional", "out-of-range", "part", "placeholder", "placeholder-shown", "read-only", "read-write", "required", "right", "root", "scope", "selection", "slotted", "target", "target-text", "valid", "visited", "where"].map(function (O) {
      return {
        type: "class",
        label: O
      };
    }),
    Pt = ["above", "absolute", "activeborder", "additive", "activecaption", "after-white-space", "ahead", "alias", "all", "all-scroll", "alphabetic", "alternate", "always", "antialiased", "appworkspace", "asterisks", "attr", "auto", "auto-flow", "avoid", "avoid-column", "avoid-page", "avoid-region", "axis-pan", "background", "backwards", "baseline", "below", "bidi-override", "blink", "block", "block-axis", "bold", "bolder", "border", "border-box", "both", "bottom", "break", "break-all", "break-word", "bullets", "button", "button-bevel", "buttonface", "buttonhighlight", "buttonshadow", "buttontext", "calc", "capitalize", "caps-lock-indicator", "caption", "captiontext", "caret", "cell", "center", "checkbox", "circle", "cjk-decimal", "clear", "clip", "close-quote", "col-resize", "collapse", "color", "color-burn", "color-dodge", "column", "column-reverse", "compact", "condensed", "contain", "content", "contents", "content-box", "context-menu", "continuous", "copy", "counter", "counters", "cover", "crop", "cross", "crosshair", "currentcolor", "cursive", "cyclic", "darken", "dashed", "decimal", "decimal-leading-zero", "default", "default-button", "dense", "destination-atop", "destination-in", "destination-out", "destination-over", "difference", "disc", "discard", "disclosure-closed", "disclosure-open", "document", "dot-dash", "dot-dot-dash", "dotted", "double", "down", "e-resize", "ease", "ease-in", "ease-in-out", "ease-out", "element", "ellipse", "ellipsis", "embed", "end", "ethiopic-abegede-gez", "ethiopic-halehame-aa-er", "ethiopic-halehame-gez", "ew-resize", "exclusion", "expanded", "extends", "extra-condensed", "extra-expanded", "fantasy", "fast", "fill", "fill-box", "fixed", "flat", "flex", "flex-end", "flex-start", "footnotes", "forwards", "from", "geometricPrecision", "graytext", "grid", "groove", "hand", "hard-light", "help", "hidden", "hide", "higher", "highlight", "highlighttext", "horizontal", "hsl", "hsla", "hue", "icon", "ignore", "inactiveborder", "inactivecaption", "inactivecaptiontext", "infinite", "infobackground", "infotext", "inherit", "initial", "inline", "inline-axis", "inline-block", "inline-flex", "inline-grid", "inline-table", "inset", "inside", "intrinsic", "invert", "italic", "justify", "keep-all", "landscape", "large", "larger", "left", "level", "lighter", "lighten", "line-through", "linear", "linear-gradient", "lines", "list-item", "listbox", "listitem", "local", "logical", "loud", "lower", "lower-hexadecimal", "lower-latin", "lower-norwegian", "lowercase", "ltr", "luminosity", "manipulation", "match", "matrix", "matrix3d", "medium", "menu", "menutext", "message-box", "middle", "min-intrinsic", "mix", "monospace", "move", "multiple", "multiple_mask_images", "multiply", "n-resize", "narrower", "ne-resize", "nesw-resize", "no-close-quote", "no-drop", "no-open-quote", "no-repeat", "none", "normal", "not-allowed", "nowrap", "ns-resize", "numbers", "numeric", "nw-resize", "nwse-resize", "oblique", "opacity", "open-quote", "optimizeLegibility", "optimizeSpeed", "outset", "outside", "outside-shape", "overlay", "overline", "padding", "padding-box", "painted", "page", "paused", "perspective", "pinch-zoom", "plus-darker", "plus-lighter", "pointer", "polygon", "portrait", "pre", "pre-line", "pre-wrap", "preserve-3d", "progress", "push-button", "radial-gradient", "radio", "read-only", "read-write", "read-write-plaintext-only", "rectangle", "region", "relative", "repeat", "repeating-linear-gradient", "repeating-radial-gradient", "repeat-x", "repeat-y", "reset", "reverse", "rgb", "rgba", "ridge", "right", "rotate", "rotate3d", "rotateX", "rotateY", "rotateZ", "round", "row", "row-resize", "row-reverse", "rtl", "run-in", "running", "s-resize", "sans-serif", "saturation", "scale", "scale3d", "scaleX", "scaleY", "scaleZ", "screen", "scroll", "scrollbar", "scroll-position", "se-resize", "self-start", "self-end", "semi-condensed", "semi-expanded", "separate", "serif", "show", "single", "skew", "skewX", "skewY", "skip-white-space", "slide", "slider-horizontal", "slider-vertical", "sliderthumb-horizontal", "sliderthumb-vertical", "slow", "small", "small-caps", "small-caption", "smaller", "soft-light", "solid", "source-atop", "source-in", "source-out", "source-over", "space", "space-around", "space-between", "space-evenly", "spell-out", "square", "start", "static", "status-bar", "stretch", "stroke", "stroke-box", "sub", "subpixel-antialiased", "svg_masks", "super", "sw-resize", "symbolic", "symbols", "system-ui", "table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row", "table-row-group", "text", "text-bottom", "text-top", "textarea", "textfield", "thick", "thin", "threeddarkshadow", "threedface", "threedhighlight", "threedlightshadow", "threedshadow", "to", "top", "transform", "translate", "translate3d", "translateX", "translateY", "translateZ", "transparent", "ultra-condensed", "ultra-expanded", "underline", "unidirectional-pan", "unset", "up", "upper-latin", "uppercase", "url", "var", "vertical", "vertical-text", "view-box", "visible", "visibleFill", "visiblePainted", "visibleStroke", "visual", "w-resize", "wait", "wave", "wider", "window", "windowframe", "windowtext", "words", "wrap", "wrap-reverse", "x-large", "x-small", "xor", "xx-large", "xx-small"].map(function (O) {
      return {
        type: "keyword",
        label: O
      };
    }).concat(["aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "grey", "green", "greenyellow", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"].map(function (O) {
      return {
        type: "constant",
        label: O
      };
    })),
    Vr = ["a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "figcaption", "figure", "footer", "form", "header", "hgroup", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "meter", "nav", "ol", "output", "p", "pre", "ruby", "section", "select", "small", "source", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "tr", "u", "ul"].map(function (O) {
      return {
        type: "type",
        label: O
      };
    }),
    Wr = ["@charset", "@color-profile", "@container", "@counter-style", "@font-face", "@font-feature-values", "@font-palette-values", "@import", "@keyframes", "@layer", "@media", "@namespace", "@page", "@position-try", "@property", "@scope", "@starting-style", "@supports", "@view-transition"].map(function (O) {
      return {
        type: "keyword",
        label: O
      };
    }),
    C = /^(\w[\w-]*|-\w[\w-]*|)$/,
    Gr = /^-(-[\w-]*)?$/;
  function Lr(O, e) {
    var t;
    if ((O.name == "(" || O.type.isError) && (O = O.parent || O), O.name != "ArgList") return !1;
    var a = (t = O.parent) === null || t === void 0 ? void 0 : t.firstChild;
    return (a == null ? void 0 : a.name) != "Callee" ? !1 : e.sliceString(a.from, a.to) == "var";
  }
  var Zt = new hO.NodeWeakMap(),
    Cr = ["Declaration"];
  function Er(O) {
    for (var _e7 = O;;) {
      if (_e7.type.isTop) return _e7;
      if (!(_e7 = _e7.parent)) return O;
    }
  }
  function Xt(O, e, t) {
    if (e.to - e.from > 4096) {
      var a = Zt.get(e);
      if (a) return a;
      var r = [],
        i = new Set(),
        n = e.cursor(hO.IterMode.IncludeAnonymous);
      if (n.firstChild()) do {
        for (var _iterator25 = _createForOfIteratorHelperLoose(Xt(O, n.node, t)), _step25; !(_step25 = _iterator25()).done;) {
          var l = _step25.value;
          i.has(l.label) || (i.add(l.label), r.push(l));
        }
      } while (n.nextSibling());
      return Zt.set(e, r), r;
    } else {
      var _a9 = [],
        _r7 = new Set();
      return e.cursor().iterate(function (i) {
        var n;
        if (t(i) && i.matchContext(Cr) && ((n = i.node.nextSibling) === null || n === void 0 ? void 0 : n.name) == ":") {
          var _l2 = O.sliceString(i.from, i.to);
          _r7.has(_l2) || (_r7.add(_l2), _a9.push({
            label: _l2,
            type: "variable"
          }));
        }
      }), _a9;
    }
  }
  var Ur = function Ur(O) {
      return function (e) {
        var t = e.state,
          a = e.pos,
          r = (0, _.syntaxTree)(t).resolveInner(a, -1),
          i = r.type.isError && r.from == r.to - 1 && t.doc.sliceString(r.from, r.to) == "-";
        if (r.name == "PropertyName" || (i || r.name == "TagName") && /^(Block|Styles)$/.test(r.resolve(r.to).name)) return {
          from: r.from,
          options: DO(),
          validFor: C
        };
        if (r.name == "ValueName") return {
          from: r.from,
          options: Pt,
          validFor: C
        };
        if (r.name == "PseudoClassName") return {
          from: r.from,
          options: St,
          validFor: C
        };
        if (O(r) || (e.explicit || i) && Lr(r, t.doc)) return {
          from: O(r) || i ? r.from : a,
          options: Xt(t.doc, Er(r), O),
          validFor: Gr
        };
        if (r.name == "TagName") {
          for (var s = r.parent; s; s = s.parent) if (s.name == "Block") return {
            from: r.from,
            options: DO(),
            validFor: C
          };
          return {
            from: r.from,
            options: Vr,
            validFor: C
          };
        }
        if (r.name == "AtKeyword") return {
          from: r.from,
          options: Wr,
          validFor: C
        };
        if (!e.explicit) return null;
        var n = r.resolve(a),
          l = n.childBefore(a);
        return l && l.name == ":" && n.name == "PseudoClassSelector" ? {
          from: a,
          options: St,
          validFor: C
        } : l && l.name == ":" && n.name == "Declaration" || n.name == "ArgList" ? {
          from: a,
          options: Pt,
          validFor: C
        } : n.name == "Block" || n.name == "Styles" ? {
          from: a,
          options: DO(),
          validFor: C
        } : null;
      };
    },
    Ar = Ur(function (O) {
      return O.name == "VariableName";
    }),
    iO = _.LRLanguage.define({
      name: "css",
      parser: gt.configure({
        props: [_.indentNodeProp.add({
          Declaration: (0, _.continuedIndent)()
        }), _.foldNodeProp.add({
          "Block KeyframeList": _.foldInside
        })]
      }),
      languageData: {
        commentTokens: {
          block: {
            open: "/*",
            close: "*/"
          }
        },
        indentOnInput: /^\s*\}$/,
        wordChars: "-"
      }
    });
  function kt() {
    return new _.LanguageSupport(iO, iO.data.of({
      autocomplete: Ar
    }));
  }
  var R = require("@lezer/lr"),
    d = require("@lezer/highlight"),
    Mr = 316,
    Ir = 317,
    bt = 1,
    Br = 2,
    Nr = 3,
    Dr = 4,
    Jr = 318,
    Fr = 320,
    Kr = 321,
    Hr = 5,
    Oi = 6,
    ei = 0,
    FO = [9, 10, 11, 12, 13, 32, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288],
    xt = 125,
    ti = 59,
    KO = 47,
    ai = 42,
    ri = 43,
    ii = 45,
    ni = 60,
    li = 44,
    si = 63,
    oi = 46,
    Qi = 91,
    ci = new R.ContextTracker({
      start: !1,
      shift: function shift(O, e) {
        return e == Hr || e == Oi || e == Fr ? O : e == Kr;
      },
      strict: !1
    }),
    pi = new R.ExternalTokenizer(function (O, e) {
      var t = O.next;
      (t == xt || t == -1 || e.context) && O.acceptToken(Jr);
    }, {
      contextual: !0,
      fallback: !0
    }),
    ui = new R.ExternalTokenizer(function (O, e) {
      var t = O.next,
        a;
      FO.indexOf(t) > -1 || t == KO && ((a = O.peek(1)) == KO || a == ai) || t != xt && t != ti && t != -1 && !e.context && O.acceptToken(Mr);
    }, {
      contextual: !0
    }),
    di = new R.ExternalTokenizer(function (O, e) {
      O.next == Qi && !e.context && O.acceptToken(Ir);
    }, {
      contextual: !0
    }),
    $i = new R.ExternalTokenizer(function (O, e) {
      var t = O.next;
      if (t == ri || t == ii) {
        if (O.advance(), t == O.next) {
          O.advance();
          var a = !e.context && e.canShift(bt);
          O.acceptToken(a ? bt : Br);
        }
      } else t == si && O.peek(1) == oi && (O.advance(), O.advance(), (O.next < 48 || O.next > 57) && O.acceptToken(Nr));
    }, {
      contextual: !0
    });
  function JO(O, e) {
    return O >= 65 && O <= 90 || O >= 97 && O <= 122 || O == 95 || O >= 192 || !e && O >= 48 && O <= 57;
  }
  var fi = new R.ExternalTokenizer(function (O, e) {
      if (O.next != ni || !e.dialectEnabled(ei) || (O.advance(), O.next == KO)) return;
      var t = 0;
      for (; FO.indexOf(O.next) > -1;) O.advance(), t++;
      if (JO(O.next, !0)) {
        for (O.advance(), t++; JO(O.next, !1);) O.advance(), t++;
        for (; FO.indexOf(O.next) > -1;) O.advance(), t++;
        if (O.next == li) return;
        for (var a = 0;; a++) {
          if (a == 7) {
            if (!JO(O.next, !0)) return;
            break;
          }
          if (O.next != "extends".charCodeAt(a)) break;
          O.advance(), t++;
        }
      }
      O.acceptToken(Dr, -t);
    }),
    mi = (0, d.styleTags)({
      "get set async static": d.tags.modifier,
      "for while do if else switch try catch finally return throw break continue default case defer": d.tags.controlKeyword,
      "in of await yield void typeof delete instanceof as satisfies": d.tags.operatorKeyword,
      "let var const using function class extends": d.tags.definitionKeyword,
      "import export from": d.tags.moduleKeyword,
      "with debugger new": d.tags.keyword,
      TemplateString: d.tags.special(d.tags.string),
      super: d.tags.atom,
      BooleanLiteral: d.tags.bool,
      this: d.tags.self,
      null: d.tags.null,
      Star: d.tags.modifier,
      VariableName: d.tags.variableName,
      "CallExpression/VariableName TaggedTemplateExpression/VariableName": d.tags.function(d.tags.variableName),
      VariableDefinition: d.tags.definition(d.tags.variableName),
      Label: d.tags.labelName,
      PropertyName: d.tags.propertyName,
      PrivatePropertyName: d.tags.special(d.tags.propertyName),
      "CallExpression/MemberExpression/PropertyName": d.tags.function(d.tags.propertyName),
      "FunctionDeclaration/VariableDefinition": d.tags.function(d.tags.definition(d.tags.variableName)),
      "ClassDeclaration/VariableDefinition": d.tags.definition(d.tags.className),
      "NewExpression/VariableName": d.tags.className,
      PropertyDefinition: d.tags.definition(d.tags.propertyName),
      PrivatePropertyDefinition: d.tags.definition(d.tags.special(d.tags.propertyName)),
      UpdateOp: d.tags.updateOperator,
      "LineComment Hashbang": d.tags.lineComment,
      BlockComment: d.tags.blockComment,
      Number: d.tags.number,
      String: d.tags.string,
      Escape: d.tags.escape,
      ArithOp: d.tags.arithmeticOperator,
      LogicOp: d.tags.logicOperator,
      BitOp: d.tags.bitwiseOperator,
      CompareOp: d.tags.compareOperator,
      RegExp: d.tags.regexp,
      Equals: d.tags.definitionOperator,
      Arrow: d.tags.function(d.tags.punctuation),
      ": Spread": d.tags.punctuation,
      "( )": d.tags.paren,
      "[ ]": d.tags.squareBracket,
      "{ }": d.tags.brace,
      "InterpolationStart InterpolationEnd": d.tags.special(d.tags.brace),
      ".": d.tags.derefOperator,
      ", ;": d.tags.separator,
      "@": d.tags.meta,
      TypeName: d.tags.typeName,
      TypeDefinition: d.tags.definition(d.tags.typeName),
      "type enum interface implements namespace module declare": d.tags.definitionKeyword,
      "abstract global Privacy readonly override": d.tags.modifier,
      "is keyof unique infer asserts": d.tags.operatorKeyword,
      JSXAttributeValue: d.tags.attributeValue,
      JSXText: d.tags.content,
      "JSXStartTag JSXStartCloseTag JSXSelfCloseEndTag JSXEndTag": d.tags.angleBracket,
      "JSXIdentifier JSXNameSpacedName": d.tags.tagName,
      "JSXAttribute/JSXIdentifier JSXAttribute/JSXNameSpacedName": d.tags.attributeName,
      "JSXBuiltin/JSXIdentifier": d.tags.standard(d.tags.tagName)
    }),
    hi = {
      __proto__: null,
      export: 20,
      as: 25,
      from: 33,
      default: 36,
      async: 41,
      function: 42,
      in: 52,
      out: 55,
      const: 56,
      extends: 60,
      this: 64,
      true: 72,
      false: 72,
      null: 84,
      void: 88,
      typeof: 92,
      super: 108,
      new: 142,
      delete: 154,
      yield: 163,
      await: 167,
      class: 172,
      public: 235,
      private: 235,
      protected: 235,
      readonly: 237,
      instanceof: 256,
      satisfies: 259,
      import: 292,
      keyof: 349,
      unique: 353,
      infer: 359,
      asserts: 395,
      is: 397,
      abstract: 417,
      implements: 419,
      type: 421,
      let: 424,
      var: 426,
      using: 429,
      interface: 435,
      enum: 439,
      namespace: 445,
      module: 447,
      declare: 451,
      global: 455,
      defer: 471,
      for: 476,
      of: 485,
      while: 488,
      with: 492,
      do: 496,
      if: 500,
      else: 502,
      switch: 506,
      case: 512,
      try: 518,
      catch: 522,
      finally: 526,
      return: 530,
      throw: 534,
      break: 538,
      continue: 542,
      debugger: 546
    },
    gi = {
      __proto__: null,
      async: 129,
      get: 131,
      set: 133,
      declare: 195,
      public: 197,
      private: 197,
      protected: 197,
      static: 199,
      abstract: 201,
      override: 203,
      readonly: 209,
      accessor: 211,
      new: 401
    },
    Si = {
      __proto__: null,
      "<": 193
    },
    yt = R.LRParser.deserialize({
      version: 14,
      states: "$F|Q%TQlOOO%[QlOOO'_QpOOP(lO`OOO*zQ!0MxO'#CiO+RO#tO'#CjO+aO&jO'#CjO+oO#@ItO'#DaO.QQlO'#DgO.bQlO'#DrO%[QlO'#DzO0fQlO'#ESOOQ!0Lf'#E['#E[O1PQ`O'#EXOOQO'#Ep'#EpOOQO'#Il'#IlO1XQ`O'#GsO1dQ`O'#EoO1iQ`O'#EoO3hQ!0MxO'#JrO6[Q!0MxO'#JsO6uQ`O'#F]O6zQ,UO'#FtOOQ!0Lf'#Ff'#FfO7VO7dO'#FfO9XQMhO'#F|O9`Q`O'#F{OOQ!0Lf'#Js'#JsOOQ!0Lb'#Jr'#JrO9eQ`O'#GwOOQ['#K_'#K_O9pQ`O'#IYO9uQ!0LrO'#IZOOQ['#J`'#J`OOQ['#I_'#I_Q`QlOOQ`QlOOO9}Q!L^O'#DvO:UQlO'#EOO:]QlO'#EQO9kQ`O'#GsO:dQMhO'#CoO:rQ`O'#EnO:}Q`O'#EyO;hQMhO'#FeO;xQ`O'#GsOOQO'#K`'#K`O;}Q`O'#K`O<]Q`O'#G{O<]Q`O'#G|O<]Q`O'#HOO9kQ`O'#HRO=SQ`O'#HUO>kQ`O'#CeO>{Q`O'#HcO?TQ`O'#HiO?TQ`O'#HkO`QlO'#HmO?TQ`O'#HoO?TQ`O'#HrO?YQ`O'#HxO?_Q!0LsO'#IOO%[QlO'#IQO?jQ!0LsO'#ISO?uQ!0LsO'#IUO9uQ!0LrO'#IWO@QQ!0MxO'#CiOASQpO'#DlQOQ`OOO%[QlO'#EQOAjQ`O'#ETO:dQMhO'#EnOAuQ`O'#EnOBQQ!bO'#FeOOQ['#Cg'#CgOOQ!0Lb'#Dq'#DqOOQ!0Lb'#Jv'#JvO%[QlO'#JvOOQO'#Jy'#JyOOQO'#Ih'#IhOCQQpO'#EgOOQ!0Lb'#Ef'#EfOOQ!0Lb'#J}'#J}OC|Q!0MSO'#EgODWQpO'#EWOOQO'#Jx'#JxODlQpO'#JyOEyQpO'#EWODWQpO'#EgPFWO&2DjO'#CbPOOO)CD})CD}OOOO'#I`'#I`OFcO#tO,59UOOQ!0Lh,59U,59UOOOO'#Ia'#IaOFqO&jO,59UOGPQ!L^O'#DcOOOO'#Ic'#IcOGWO#@ItO,59{OOQ!0Lf,59{,59{OGfQlO'#IdOGyQ`O'#JtOIxQ!fO'#JtO+}QlO'#JtOJPQ`O,5:ROJgQ`O'#EpOJtQ`O'#KTOKPQ`O'#KSOKPQ`O'#KSOKXQ`O,5;^OK^Q`O'#KROOQ!0Ln,5:^,5:^OKeQlO,5:^OMcQ!0MxO,5:fONSQ`O,5:nONmQ!0LrO'#KQONtQ`O'#KPO9eQ`O'#KPO! YQ`O'#KPO! bQ`O,5;]O! gQ`O'#KPO!#lQ!fO'#JsOOQ!0Lh'#Ci'#CiO%[QlO'#ESO!$[Q!fO,5:sOOQS'#Jz'#JzOOQO-E<j-E<jO9kQ`O,5=_O!$rQ`O,5=_O!$wQlO,5;ZO!&zQMhO'#EkO!(eQ`O,5;ZO!(jQlO'#DyO!(tQpO,5;dO!(|QpO,5;dO%[QlO,5;dOOQ['#FT'#FTOOQ['#FV'#FVO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eOOQ['#FZ'#FZO!)[QlO,5;tOOQ!0Lf,5;y,5;yOOQ!0Lf,5;z,5;zOOQ!0Lf,5;|,5;|O%[QlO'#IpO!+_Q!0LrO,5<iO%[QlO,5;eO!&zQMhO,5;eO!+|QMhO,5;eO!-nQMhO'#E^O%[QlO,5;wOOQ!0Lf,5;{,5;{O!-uQ,UO'#FjO!.rQ,UO'#KXO!.^Q,UO'#KXO!.yQ,UO'#KXOOQO'#KX'#KXO!/_Q,UO,5<SOOOW,5<`,5<`O!/pQlO'#FvOOOW'#Io'#IoO7VO7dO,5<QO!/wQ,UO'#FxOOQ!0Lf,5<Q,5<QO!0hQ$IUO'#CyOOQ!0Lh'#C}'#C}O!0{O#@ItO'#DRO!1iQMjO,5<eO!1pQ`O,5<hO!3YQ(CWO'#GXO!3jQ`O'#GYO!3oQ`O'#GYO!5_Q(CWO'#G^O!6dQpO'#GbOOQO'#Gn'#GnO!,TQMhO'#GmOOQO'#Gp'#GpO!,TQMhO'#GoO!7VQ$IUO'#JlOOQ!0Lh'#Jl'#JlO!7aQ`O'#JkO!7oQ`O'#JjO!7wQ`O'#CuOOQ!0Lh'#C{'#C{O!8YQ`O'#C}OOQ!0Lh'#DV'#DVOOQ!0Lh'#DX'#DXO!8_Q`O,5<eO1SQ`O'#DZO!,TQMhO'#GPO!,TQMhO'#GRO!8gQ`O'#GTO!8lQ`O'#GUO!3oQ`O'#G[O!,TQMhO'#GaO<]Q`O'#JkO!8qQ`O'#EqO!9`Q`O,5<gOOQ!0Lb'#Cr'#CrO!9hQ`O'#ErO!:bQpO'#EsOOQ!0Lb'#KR'#KRO!:iQ!0LrO'#KaO9uQ!0LrO,5=cO`QlO,5>tOOQ['#Jh'#JhOOQ[,5>u,5>uOOQ[-E<]-E<]O!<hQ!0MxO,5:bO!:]QpO,5:`O!?RQ!0MxO,5:jO%[QlO,5:jO!AiQ!0MxO,5:lOOQO,5@z,5@zO!BYQMhO,5=_O!BhQ!0LrO'#JiO9`Q`O'#JiO!ByQ!0LrO,59ZO!CUQpO,59ZO!C^QMhO,59ZO:dQMhO,59ZO!CiQ`O,5;ZO!CqQ`O'#HbO!DVQ`O'#KdO%[QlO,5;}O!:]QpO,5<PO!D_Q`O,5=zO!DdQ`O,5=zO!DiQ`O,5=zO!DwQ`O,5=zO9uQ!0LrO,5=zO<]Q`O,5=jOOQO'#Cy'#CyO!EOQpO,5=gO!EWQMhO,5=hO!EcQ`O,5=jO!EhQ!bO,5=mO!EpQ`O'#K`O?YQ`O'#HWO9kQ`O'#HYO!EuQ`O'#HYO:dQMhO'#H[O!EzQ`O'#H[OOQ[,5=p,5=pO!FPQ`O'#H]O!FbQ`O'#CoO!FgQ`O,59PO!FqQ`O,59PO!HvQlO,59POOQ[,59P,59PO!IWQ!0LrO,59PO%[QlO,59PO!KcQlO'#HeOOQ['#Hf'#HfOOQ['#Hg'#HgO`QlO,5=}O!KyQ`O,5=}O`QlO,5>TO`QlO,5>VO!LOQ`O,5>XO`QlO,5>ZO!LTQ`O,5>^O!LYQlO,5>dOOQ[,5>j,5>jO%[QlO,5>jO9uQ!0LrO,5>lOOQ[,5>n,5>nO#!dQ`O,5>nOOQ[,5>p,5>pO#!dQ`O,5>pOOQ[,5>r,5>rO##QQpO'#D_O%[QlO'#JvO##sQpO'#JvO##}QpO'#DmO#$`QpO'#DmO#&qQlO'#DmO#&xQ`O'#JuO#'QQ`O,5:WO#'VQ`O'#EtO#'eQ`O'#KUO#'mQ`O,5;_O#'rQpO'#DmO#(PQpO'#EVOOQ!0Lf,5:o,5:oO%[QlO,5:oO#(WQ`O,5:oO?YQ`O,5;YO!CUQpO,5;YO!C^QMhO,5;YO:dQMhO,5;YO#(`Q`O,5@bO#(eQ07dO,5:sOOQO-E<f-E<fO#)kQ!0MSO,5;RODWQpO,5:rO#)uQpO,5:rODWQpO,5;RO!ByQ!0LrO,5:rOOQ!0Lb'#Ej'#EjOOQO,5;R,5;RO%[QlO,5;RO#*SQ!0LrO,5;RO#*_Q!0LrO,5;RO!CUQpO,5:rOOQO,5;X,5;XO#*mQ!0LrO,5;RPOOO'#I^'#I^P#+RO&2DjO,58|POOO,58|,58|OOOO-E<^-E<^OOQ!0Lh1G.p1G.pOOOO-E<_-E<_OOOO,59},59}O#+^Q!bO,59}OOOO-E<a-E<aOOQ!0Lf1G/g1G/gO#+cQ!fO,5?OO+}QlO,5?OOOQO,5?U,5?UO#+mQlO'#IdOOQO-E<b-E<bO#+zQ`O,5@`O#,SQ!fO,5@`O#,ZQ`O,5@nOOQ!0Lf1G/m1G/mO%[QlO,5@oO#,cQ`O'#IjOOQO-E<h-E<hO#,ZQ`O,5@nOOQ!0Lb1G0x1G0xOOQ!0Ln1G/x1G/xOOQ!0Ln1G0Y1G0YO%[QlO,5@lO#,wQ!0LrO,5@lO#-YQ!0LrO,5@lO#-aQ`O,5@kO9eQ`O,5@kO#-iQ`O,5@kO#-wQ`O'#ImO#-aQ`O,5@kOOQ!0Lb1G0w1G0wO!(tQpO,5:uO!)PQpO,5:uOOQS,5:w,5:wO#.iQdO,5:wO#.qQMhO1G2yO9kQ`O1G2yOOQ!0Lf1G0u1G0uO#/PQ!0MxO1G0uO#0UQ!0MvO,5;VOOQ!0Lh'#GW'#GWO#0rQ!0MzO'#JlO!$wQlO1G0uO#2}Q!fO'#JwO%[QlO'#JwO#3XQ`O,5:eOOQ!0Lh'#D_'#D_OOQ!0Lf1G1O1G1OO%[QlO1G1OOOQ!0Lf1G1f1G1fO#3^Q`O1G1OO#5rQ!0MxO1G1PO#5yQ!0MxO1G1PO#8aQ!0MxO1G1PO#8hQ!0MxO1G1PO#;OQ!0MxO1G1PO#=fQ!0MxO1G1PO#=mQ!0MxO1G1PO#=tQ!0MxO1G1PO#@[Q!0MxO1G1PO#@cQ!0MxO1G1PO#BpQ?MtO'#CiO#DkQ?MtO1G1`O#DrQ?MtO'#JsO#EVQ!0MxO,5?[OOQ!0Lb-E<n-E<nO#GdQ!0MxO1G1PO#HaQ!0MzO1G1POOQ!0Lf1G1P1G1PO#IdQMjO'#J|O#InQ`O,5:xO#IsQ!0MxO1G1cO#JgQ,UO,5<WO#JoQ,UO,5<XO#JwQ,UO'#FoO#K`Q`O'#FnOOQO'#KY'#KYOOQO'#In'#InO#KeQ,UO1G1nOOQ!0Lf1G1n1G1nOOOW1G1y1G1yO#KvQ?MtO'#JrO#LQQ`O,5<bO!)[QlO,5<bOOOW-E<m-E<mOOQ!0Lf1G1l1G1lO#LVQpO'#KXOOQ!0Lf,5<d,5<dO#L_QpO,5<dO#LdQMhO'#DTOOOO'#Ib'#IbO#LkO#@ItO,59mOOQ!0Lh,59m,59mO%[QlO1G2PO!8lQ`O'#IrO#LvQ`O,5<zOOQ!0Lh,5<w,5<wO!,TQMhO'#IuO#MdQMjO,5=XO!,TQMhO'#IwO#NVQMjO,5=ZO!&zQMhO,5=]OOQO1G2S1G2SO#NaQ!dO'#CrO#NtQ(CWO'#ErO$ |QpO'#GbO$!dQ!dO,5<sO$!kQ`O'#K[O9eQ`O'#K[O$!yQ`O,5<uO$#aQ!dO'#C{O!,TQMhO,5<tO$#kQ`O'#GZO$$PQ`O,5<tO$$UQ!dO'#GWO$$cQ!dO'#K]O$$mQ`O'#K]O!&zQMhO'#K]O$$rQ`O,5<xO$$wQlO'#JvO$%RQpO'#GcO#$`QpO'#GcO$%dQ`O'#GgO!3oQ`O'#GkO$%iQ!0LrO'#ItO$%tQpO,5<|OOQ!0Lp,5<|,5<|O$%{QpO'#GcO$&YQpO'#GdO$&kQpO'#GdO$&pQMjO,5=XO$'QQMjO,5=ZOOQ!0Lh,5=^,5=^O!,TQMhO,5@VO!,TQMhO,5@VO$'bQ`O'#IyO$'vQ`O,5@UO$(OQ`O,59aOOQ!0Lh,59i,59iO$(TQ`O,5@VO$)TQ$IYO,59uOOQ!0Lh'#Jp'#JpO$)vQMjO,5<kO$*iQMjO,5<mO@zQ`O,5<oOOQ!0Lh,5<p,5<pO$*sQ`O,5<vO$*xQMjO,5<{O$+YQ`O'#KPO!$wQlO1G2RO$+_Q`O1G2RO9eQ`O'#KSO9eQ`O'#EtO%[QlO'#EtO9eQ`O'#I{O$+dQ!0LrO,5@{OOQ[1G2}1G2}OOQ[1G4`1G4`OOQ!0Lf1G/|1G/|OOQ!0Lf1G/z1G/zO$-fQ!0MxO1G0UOOQ[1G2y1G2yO!&zQMhO1G2yO%[QlO1G2yO#.tQ`O1G2yO$/jQMhO'#EkOOQ!0Lb,5@T,5@TO$/wQ!0LrO,5@TOOQ[1G.u1G.uO!ByQ!0LrO1G.uO!CUQpO1G.uO!C^QMhO1G.uO$0YQ`O1G0uO$0_Q`O'#CiO$0jQ`O'#KeO$0rQ`O,5=|O$0wQ`O'#KeO$0|Q`O'#KeO$1[Q`O'#JRO$1jQ`O,5AOO$1rQ!fO1G1iOOQ!0Lf1G1k1G1kO9kQ`O1G3fO@zQ`O1G3fO$1yQ`O1G3fO$2OQ`O1G3fO!DiQ`O1G3fO9uQ!0LrO1G3fOOQ[1G3f1G3fO!EcQ`O1G3UO!&zQMhO1G3RO$2TQ`O1G3ROOQ[1G3S1G3SO!&zQMhO1G3SO$2YQ`O1G3SO$2bQpO'#HQOOQ[1G3U1G3UO!6_QpO'#I}O!EhQ!bO1G3XOOQ[1G3X1G3XOOQ[,5=r,5=rO$2jQMhO,5=tO9kQ`O,5=tO$%dQ`O,5=vO9`Q`O,5=vO!CUQpO,5=vO!C^QMhO,5=vO:dQMhO,5=vO$2xQ`O'#KcO$3TQ`O,5=wOOQ[1G.k1G.kO$3YQ!0LrO1G.kO@zQ`O1G.kO$3eQ`O1G.kO9uQ!0LrO1G.kO$5mQ!fO,5AQO$5zQ`O,5AQO9eQ`O,5AQO$6VQlO,5>PO$6^Q`O,5>POOQ[1G3i1G3iO`QlO1G3iOOQ[1G3o1G3oOOQ[1G3q1G3qO?TQ`O1G3sO$6cQlO1G3uO$:gQlO'#HtOOQ[1G3x1G3xO$:tQ`O'#HzO?YQ`O'#H|OOQ[1G4O1G4OO$:|QlO1G4OO9uQ!0LrO1G4UOOQ[1G4W1G4WOOQ!0Lb'#G_'#G_O9uQ!0LrO1G4YO9uQ!0LrO1G4[O$?TQ`O,5@bO!)[QlO,5;`O9eQ`O,5;`O?YQ`O,5:XO!)[QlO,5:XO!CUQpO,5:XO$?YQ?MtO,5:XOOQO,5;`,5;`O$?dQpO'#IeO$?zQ`O,5@aOOQ!0Lf1G/r1G/rO$@SQpO'#IkO$@^Q`O,5@pOOQ!0Lb1G0y1G0yO#$`QpO,5:XOOQO'#Ig'#IgO$@fQpO,5:qOOQ!0Ln,5:q,5:qO#(ZQ`O1G0ZOOQ!0Lf1G0Z1G0ZO%[QlO1G0ZOOQ!0Lf1G0t1G0tO?YQ`O1G0tO!CUQpO1G0tO!C^QMhO1G0tOOQ!0Lb1G5|1G5|O!ByQ!0LrO1G0^OOQO1G0m1G0mO%[QlO1G0mO$@mQ!0LrO1G0mO$@xQ!0LrO1G0mO!CUQpO1G0^ODWQpO1G0^O$AWQ!0LrO1G0mOOQO1G0^1G0^O$AlQ!0MxO1G0mPOOO-E<[-E<[POOO1G.h1G.hOOOO1G/i1G/iO$AvQ!bO,5<iO$BOQ!fO1G4jOOQO1G4p1G4pO%[QlO,5?OO$BYQ`O1G5zO$BbQ`O1G6YO$BjQ!fO1G6ZO9eQ`O,5?UO$BtQ!0MxO1G6WO%[QlO1G6WO$CUQ!0LrO1G6WO$CgQ`O1G6VO$CgQ`O1G6VO9eQ`O1G6VO$CoQ`O,5?XO9eQ`O,5?XOOQO,5?X,5?XO$DTQ`O,5?XO$+YQ`O,5?XOOQO-E<k-E<kOOQS1G0a1G0aOOQS1G0c1G0cO#.lQ`O1G0cOOQ[7+(e7+(eO!&zQMhO7+(eO%[QlO7+(eO$DcQ`O7+(eO$DnQMhO7+(eO$D|Q!0MzO,5=XO$GXQ!0MzO,5=ZO$IdQ!0MzO,5=XO$KuQ!0MzO,5=ZO$NWQ!0MzO,59uO%!]Q!0MzO,5<kO%$hQ!0MzO,5<mO%&sQ!0MzO,5<{OOQ!0Lf7+&a7+&aO%)UQ!0MxO7+&aO%)xQlO'#IfO%*VQ`O,5@cO%*_Q!fO,5@cOOQ!0Lf1G0P1G0PO%*iQ`O7+&jOOQ!0Lf7+&j7+&jO%*nQ?MtO,5:fO%[QlO7+&zO%*xQ?MtO,5:bO%+VQ?MtO,5:jO%+aQ?MtO,5:lO%+kQMhO'#IiO%+uQ`O,5@hOOQ!0Lh1G0d1G0dOOQO1G1r1G1rOOQO1G1s1G1sO%+}Q!jO,5<ZO!)[QlO,5<YOOQO-E<l-E<lOOQ!0Lf7+'Y7+'YOOOW7+'e7+'eOOOW1G1|1G1|O%,YQ`O1G1|OOQ!0Lf1G2O1G2OOOOO,59o,59oO%,_Q!dO,59oOOOO-E<`-E<`OOQ!0Lh1G/X1G/XO%,fQ!0MxO7+'kOOQ!0Lh,5?^,5?^O%-YQMhO1G2fP%-aQ`O'#IrPOQ!0Lh-E<p-E<pO%-}QMjO,5?aOOQ!0Lh-E<s-E<sO%.pQMjO,5?cOOQ!0Lh-E<u-E<uO%.zQ!dO1G2wO%/RQ!dO'#CrO%/iQMhO'#KSO$$wQlO'#JvOOQ!0Lh1G2_1G2_O%/sQ`O'#IqO%0[Q`O,5@vO%0[Q`O,5@vO%0dQ`O,5@vO%0oQ`O,5@vOOQO1G2a1G2aO%0}QMjO1G2`O$+YQ`O'#K[O!,TQMhO1G2`O%1_Q(CWO'#IsO%1lQ`O,5@wO!&zQMhO,5@wO%1tQ!dO,5@wOOQ!0Lh1G2d1G2dO%4UQ!fO'#CiO%4`Q`O,5=POOQ!0Lb,5<},5<}O%4hQpO,5<}OOQ!0Lb,5=O,5=OOCwQ`O,5<}O%4sQpO,5<}OOQ!0Lb,5=R,5=RO$+YQ`O,5=VOOQO,5?`,5?`OOQO-E<r-E<rOOQ!0Lp1G2h1G2hO#$`QpO,5<}O$$wQlO,5=PO%5RQ`O,5=OO%5^QpO,5=OO!,TQMhO'#IuO%6WQMjO1G2sO!,TQMhO'#IwO%6yQMjO1G2uO%7TQMjO1G5qO%7_QMjO1G5qOOQO,5?e,5?eOOQO-E<w-E<wOOQO1G.{1G.{O!,TQMhO1G5qO!,TQMhO1G5qO!:]QpO,59wO%[QlO,59wOOQ!0Lh,5<j,5<jO%7lQ`O1G2ZO!,TQMhO1G2bO%7qQ!0MxO7+'mOOQ!0Lf7+'m7+'mO!$wQlO7+'mO%8eQ`O,5;`OOQ!0Lb,5?g,5?gOOQ!0Lb-E<y-E<yO%8jQ!dO'#K^O#(ZQ`O7+(eO4UQ!fO7+(eO$DfQ`O7+(eO%8tQ!0MvO'#CiO%9XQ!0MvO,5=SO%9lQ`O,5=SO%9tQ`O,5=SOOQ!0Lb1G5o1G5oOOQ[7+$a7+$aO!ByQ!0LrO7+$aO!CUQpO7+$aO!$wQlO7+&aO%9yQ`O'#JQO%:bQ`O,5APOOQO1G3h1G3hO9kQ`O,5APO%:bQ`O,5APO%:jQ`O,5APOOQO,5?m,5?mOOQO-E=P-E=POOQ!0Lf7+'T7+'TO%:oQ`O7+)QO9uQ!0LrO7+)QO9kQ`O7+)QO@zQ`O7+)QO%:tQ`O7+)QOOQ[7+)Q7+)QOOQ[7+(p7+(pO%:yQ!0MvO7+(mO!&zQMhO7+(mO!E^Q`O7+(nOOQ[7+(n7+(nO!&zQMhO7+(nO%;TQ`O'#KbO%;`Q`O,5=lOOQO,5?i,5?iOOQO-E<{-E<{OOQ[7+(s7+(sO%<rQpO'#HZOOQ[1G3`1G3`O!&zQMhO1G3`O%[QlO1G3`O%<yQ`O1G3`O%=UQMhO1G3`O9uQ!0LrO1G3bO$%dQ`O1G3bO9`Q`O1G3bO!CUQpO1G3bO!C^QMhO1G3bO%=dQ`O'#JPO%=xQ`O,5@}O%>QQpO,5@}OOQ!0Lb1G3c1G3cOOQ[7+$V7+$VO@zQ`O7+$VO9uQ!0LrO7+$VO%>]Q`O7+$VO%[QlO1G6lO%[QlO1G6mO%>bQ!0LrO1G6lO%>lQlO1G3kO%>sQ`O1G3kO%>xQlO1G3kOOQ[7+)T7+)TO9uQ!0LrO7+)_O`QlO7+)aOOQ['#Kh'#KhOOQ['#JS'#JSO%?PQlO,5>`OOQ[,5>`,5>`O%[QlO'#HuO%?^Q`O'#HwOOQ[,5>f,5>fO9eQ`O,5>fOOQ[,5>h,5>hOOQ[7+)j7+)jOOQ[7+)p7+)pOOQ[7+)t7+)tOOQ[7+)v7+)vO%?cQpO1G5|O%?}Q?MtO1G0zO%@XQ`O1G0zOOQO1G/s1G/sO%@dQ?MtO1G/sO?YQ`O1G/sO!)[QlO'#DmOOQO,5?P,5?POOQO-E<c-E<cOOQO,5?V,5?VOOQO-E<i-E<iO!CUQpO1G/sOOQO-E<e-E<eOOQ!0Ln1G0]1G0]OOQ!0Lf7+%u7+%uO#(ZQ`O7+%uOOQ!0Lf7+&`7+&`O?YQ`O7+&`O!CUQpO7+&`OOQO7+%x7+%xO$AlQ!0MxO7+&XOOQO7+&X7+&XO%[QlO7+&XO%@nQ!0LrO7+&XO!ByQ!0LrO7+%xO!CUQpO7+%xO%@yQ!0LrO7+&XO%AXQ!0MxO7++rO%[QlO7++rO%AiQ`O7++qO%AiQ`O7++qOOQO1G4s1G4sO9eQ`O1G4sO%AqQ`O1G4sOOQS7+%}7+%}O#(ZQ`O<<LPO4UQ!fO<<LPO%BPQ`O<<LPOOQ[<<LP<<LPO!&zQMhO<<LPO%[QlO<<LPO%BXQ`O<<LPO%BdQ!0MzO,5?aO%DoQ!0MzO,5?cO%FzQ!0MzO1G2`O%I]Q!0MzO1G2sO%KhQ!0MzO1G2uO%MsQ!fO,5?QO%[QlO,5?QOOQO-E<d-E<dO%M}Q`O1G5}OOQ!0Lf<<JU<<JUO%NVQ?MtO1G0uO&!^Q?MtO1G1PO&!eQ?MtO1G1PO&$fQ?MtO1G1PO&$mQ?MtO1G1PO&&nQ?MtO1G1PO&(oQ?MtO1G1PO&(vQ?MtO1G1PO&(}Q?MtO1G1PO&+OQ?MtO1G1PO&+VQ?MtO1G1PO&+^Q!0MxO<<JfO&-UQ?MtO1G1PO&.RQ?MvO1G1PO&/UQ?MvO'#JlO&1[Q?MtO1G1cO&1iQ?MtO1G0UO&1sQMjO,5?TOOQO-E<g-E<gO!)[QlO'#FqOOQO'#KZ'#KZOOQO1G1u1G1uO&1}Q`O1G1tO&2SQ?MtO,5?[OOOW7+'h7+'hOOOO1G/Z1G/ZO&2^Q!dO1G4xOOQ!0Lh7+(Q7+(QP!&zQMhO,5?^O!,TQMhO7+(cO&2eQ`O,5?]O9eQ`O,5?]O$+YQ`O,5?]OOQO-E<o-E<oO&2sQ`O1G6bO&2sQ`O1G6bO&2{Q`O1G6bO&3WQMjO7+'zO&3hQ!dO,5?_O&3rQ`O,5?_O!&zQMhO,5?_OOQO-E<q-E<qO&3wQ!dO1G6cO&4RQ`O1G6cO&4ZQ`O1G2kO!&zQMhO1G2kOOQ!0Lb1G2i1G2iOOQ!0Lb1G2j1G2jO%4hQpO1G2iO!CUQpO1G2iOCwQ`O1G2iOOQ!0Lb1G2q1G2qO&4`QpO1G2iO&4nQ`O1G2kO$+YQ`O1G2jOCwQ`O1G2jO$$wQlO1G2kO&4vQ`O1G2jO&5jQMjO,5?aOOQ!0Lh-E<t-E<tO&6]QMjO,5?cOOQ!0Lh-E<v-E<vO!,TQMhO7++]O&6gQMjO7++]O&6qQMjO7++]OOQ!0Lh1G/c1G/cO&7OQ`O1G/cOOQ!0Lh7+'u7+'uO&7TQMjO7+'|O&7eQ!0MxO<<KXOOQ!0Lf<<KX<<KXO&8XQ`O1G0zO!&zQMhO'#IzO&8^Q`O,5@xO&:`Q!fO<<LPO!&zQMhO1G2nO&:gQ!0LrO1G2nOOQ[<<G{<<G{O!ByQ!0LrO<<G{O&:xQ!0MxO<<I{OOQ!0Lf<<I{<<I{OOQO,5?l,5?lO&;lQ`O,5?lO&;qQ`O,5?lOOQO-E=O-E=OO&<PQ`O1G6kO&<PQ`O1G6kO9kQ`O1G6kO@zQ`O<<LlOOQ[<<Ll<<LlO&<XQ`O<<LlO9uQ!0LrO<<LlO9kQ`O<<LlOOQ[<<LX<<LXO%:yQ!0MvO<<LXOOQ[<<LY<<LYO!E^Q`O<<LYO&<^QpO'#I|O&<iQ`O,5@|O!)[QlO,5@|OOQ[1G3W1G3WOOQO'#JO'#JOO9uQ!0LrO'#JOO&<qQpO,5=uOOQ[,5=u,5=uO&<xQpO'#EgO&=PQpO'#GeO&=UQ`O7+(zO&=ZQ`O7+(zOOQ[7+(z7+(zO!&zQMhO7+(zO%[QlO7+(zO&=cQ`O7+(zOOQ[7+(|7+(|O9uQ!0LrO7+(|O$%dQ`O7+(|O9`Q`O7+(|O!CUQpO7+(|O&=nQ`O,5?kOOQO-E<}-E<}OOQO'#H^'#H^O&=yQ`O1G6iO9uQ!0LrO<<GqOOQ[<<Gq<<GqO@zQ`O<<GqO&>RQ`O7+,WO&>WQ`O7+,XO%[QlO7+,WO%[QlO7+,XOOQ[7+)V7+)VO&>]Q`O7+)VO&>bQlO7+)VO&>iQ`O7+)VOOQ[<<Ly<<LyOOQ[<<L{<<L{OOQ[-E=Q-E=QOOQ[1G3z1G3zO&>nQ`O,5>aOOQ[,5>c,5>cO&>sQ`O1G4QO9eQ`O7+&fO!)[QlO7+&fOOQO7+%_7+%_O&>xQ?MtO1G6ZO?YQ`O7+%_OOQ!0Lf<<Ia<<IaOOQ!0Lf<<Iz<<IzO?YQ`O<<IzOOQO<<Is<<IsO$AlQ!0MxO<<IsO%[QlO<<IsOOQO<<Id<<IdO!ByQ!0LrO<<IdO&?SQ!0LrO<<IsO&?_Q!0MxO<= ^O&?oQ`O<= ]OOQO7+*_7+*_O9eQ`O7+*_OOQ[ANAkANAkO&?wQ!fOANAkO!&zQMhOANAkO#(ZQ`OANAkO4UQ!fOANAkO&@OQ`OANAkO%[QlOANAkO&@WQ!0MzO7+'zO&BiQ!0MzO,5?aO&DtQ!0MzO,5?cO&GPQ!0MzO7+'|O&IbQ!fO1G4lO&IlQ?MtO7+&aO&KpQ?MvO,5=XO&MwQ?MvO,5=ZO&NXQ?MvO,5=XO&NiQ?MvO,5=ZO&NyQ?MvO,59uO'#PQ?MvO,5<kO'%SQ?MvO,5<mO''hQ?MvO,5<{O')^Q?MtO7+'kO')kQ?MtO7+'mO')xQ`O,5<]OOQO7+'`7+'`OOQ!0Lh7+*d7+*dO')}QMjO<<K}OOQO1G4w1G4wO'*UQ`O1G4wO'*aQ`O1G4wO'*oQ`O7++|O'*oQ`O7++|O!&zQMhO1G4yO'*wQ!dO1G4yO'+RQ`O7++}O'+ZQ`O7+(VO'+fQ!dO7+(VOOQ!0Lb7+(T7+(TOOQ!0Lb7+(U7+(UO!CUQpO7+(TOCwQ`O7+(TO'+pQ`O7+(VO!&zQMhO7+(VO$+YQ`O7+(UO'+uQ`O7+(VOCwQ`O7+(UO'+}QMjO<<NwO!,TQMhO<<NwOOQ!0Lh7+$}7+$}O',XQ!dO,5?fOOQO-E<x-E<xO',cQ!0MvO7+(YO!&zQMhO7+(YOOQ[AN=gAN=gO9kQ`O1G5WOOQO1G5W1G5WO',sQ`O1G5WO',xQ`O7+,VO',xQ`O7+,VO9uQ!0LrOANBWO@zQ`OANBWOOQ[ANBWANBWO'-QQ`OANBWOOQ[ANAsANAsOOQ[ANAtANAtO'-VQ`O,5?hOOQO-E<z-E<zO'-bQ?MtO1G6hOOQO,5?j,5?jOOQO-E<|-E<|OOQ[1G3a1G3aO'-lQ`O,5=POOQ[<<Lf<<LfO!&zQMhO<<LfO&=UQ`O<<LfO'-qQ`O<<LfO%[QlO<<LfOOQ[<<Lh<<LhO9uQ!0LrO<<LhO$%dQ`O<<LhO9`Q`O<<LhO'-yQpO1G5VO'.UQ`O7+,TOOQ[AN=]AN=]O9uQ!0LrOAN=]OOQ[<= r<= rOOQ[<= s<= sO'.^Q`O<= rO'.cQ`O<= sOOQ[<<Lq<<LqO'.hQ`O<<LqO'.mQlO<<LqOOQ[1G3{1G3{O?YQ`O7+)lO'.tQ`O<<JQO'/PQ?MtO<<JQOOQO<<Hy<<HyOOQ!0LfAN?fAN?fOOQOAN?_AN?_O$AlQ!0MxOAN?_OOQOAN?OAN?OO%[QlOAN?_OOQO<<My<<MyOOQ[G27VG27VO!&zQMhOG27VO#(ZQ`OG27VO'/ZQ!fOG27VO4UQ!fOG27VO'/bQ`OG27VO'/jQ?MtO<<JfO'/wQ?MvO1G2`O'1mQ?MvO,5?aO'3pQ?MvO,5?cO'5sQ?MvO1G2sO'7vQ?MvO1G2uO'9yQ?MtO<<KXO':WQ?MtO<<I{OOQO1G1w1G1wO!,TQMhOANAiOOQO7+*c7+*cO':eQ`O7+*cO':pQ`O<= hO':xQ!dO7+*eOOQ!0Lb<<Kq<<KqO$+YQ`O<<KqOCwQ`O<<KqO';SQ`O<<KqO!&zQMhO<<KqOOQ!0Lb<<Ko<<KoO!CUQpO<<KoO';_Q!dO<<KqOOQ!0Lb<<Kp<<KpO';iQ`O<<KqO!&zQMhO<<KqO$+YQ`O<<KpO';nQMjOANDcO';xQ!0MvO<<KtOOQO7+*r7+*rO9kQ`O7+*rO'<YQ`O<= qOOQ[G27rG27rO9uQ!0LrOG27rO@zQ`OG27rO!)[QlO1G5SO'<bQ`O7+,SO'<jQ`O1G2kO&=UQ`OANBQOOQ[ANBQANBQO!&zQMhOANBQO'<oQ`OANBQOOQ[ANBSANBSO9uQ!0LrOANBSO$%dQ`OANBSOOQO'#H_'#H_OOQO7+*q7+*qOOQ[G22wG22wOOQ[ANE^ANE^OOQ[ANE_ANE_OOQ[ANB]ANB]O'<wQ`OANB]OOQ[<<MW<<MWO!)[QlOAN?lOOQOG24yG24yO$AlQ!0MxOG24yO#(ZQ`OLD,qOOQ[LD,qLD,qO!&zQMhOLD,qO'<|Q!fOLD,qO'=TQ?MvO7+'zO'>yQ?MvO,5?aO'@|Q?MvO,5?cO'CPQ?MvO7+'|O'DuQMjOG27TOOQO<<M}<<M}OOQ!0LbANA]ANA]O$+YQ`OANA]OCwQ`OANA]O'EVQ!dOANA]OOQ!0LbANAZANAZO'E^Q`OANA]O!&zQMhOANA]O'EiQ!dOANA]OOQ!0LbANA[ANA[OOQO<<N^<<N^OOQ[LD-^LD-^O9uQ!0LrOLD-^O'EsQ?MtO7+*nOOQO'#Gf'#GfOOQ[G27lG27lO&=UQ`OG27lO!&zQMhOG27lOOQ[G27nG27nO9uQ!0LrOG27nOOQ[G27wG27wO'E}Q?MtOG25WOOQOLD*eLD*eOOQ[!$(!]!$(!]O#(ZQ`O!$(!]O!&zQMhO!$(!]O'FXQ!0MzOG27TOOQ!0LbG26wG26wO$+YQ`OG26wO'HjQ`OG26wOCwQ`OG26wO'HuQ!dOG26wO!&zQMhOG26wOOQ[!$(!x!$(!xOOQ[LD-WLD-WO&=UQ`OLD-WOOQ[LD-YLD-YOOQ[!)9Ew!)9EwO#(ZQ`O!)9EwOOQ!0LbLD,cLD,cO$+YQ`OLD,cOCwQ`OLD,cO'H|Q`OLD,cO'IXQ!dOLD,cOOQ[!$(!r!$(!rOOQ[!.K;c!.K;cO'I`Q?MvOG27TOOQ!0Lb!$( }!$( }O$+YQ`O!$( }OCwQ`O!$( }O'KUQ`O!$( }OOQ!0Lb!)9Ei!)9EiO$+YQ`O!)9EiOCwQ`O!)9EiOOQ!0Lb!.K;T!.K;TO$+YQ`O!.K;TOOQ!0Lb!4/0o!4/0oO!)[QlO'#DzO1PQ`O'#EXO'KaQ!fO'#JrO'KhQ!L^O'#DvO'KoQlO'#EOO'KvQ!fO'#CiO'N^Q!fO'#CiO!)[QlO'#EQO'NnQlO,5;ZO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO'#IpO(!qQ`O,5<iO!)[QlO,5;eO(!yQMhO,5;eO($dQMhO,5;eO!)[QlO,5;wO!&zQMhO'#GmO(!yQMhO'#GmO!&zQMhO'#GoO(!yQMhO'#GoO1SQ`O'#DZO1SQ`O'#DZO!&zQMhO'#GPO(!yQMhO'#GPO!&zQMhO'#GRO(!yQMhO'#GRO!&zQMhO'#GaO(!yQMhO'#GaO!)[QlO,5:jO($kQpO'#D_O($uQpO'#JvO!)[QlO,5@oO'NnQlO1G0uO(%PQ?MtO'#CiO!)[QlO1G2PO!&zQMhO'#IuO(!yQMhO'#IuO!&zQMhO'#IwO(!yQMhO'#IwO(%ZQ!dO'#CrO!&zQMhO,5<tO(!yQMhO,5<tO'NnQlO1G2RO!)[QlO7+&zO!&zQMhO1G2`O(!yQMhO1G2`O!&zQMhO'#IuO(!yQMhO'#IuO!&zQMhO'#IwO(!yQMhO'#IwO!&zQMhO1G2bO(!yQMhO1G2bO'NnQlO7+'mO'NnQlO7+&aO!&zQMhOANAiO(!yQMhOANAiO(%nQ`O'#EoO(%sQ`O'#EoO(%{Q`O'#F]O(&QQ`O'#EyO(&VQ`O'#KTO(&bQ`O'#KRO(&mQ`O,5;ZO(&rQMjO,5<eO(&yQ`O'#GYO('OQ`O'#GYO('TQ`O,5<eO(']Q`O,5<gO('eQ`O,5;ZO('mQ?MtO1G1`O('tQ`O,5<tO('yQ`O,5<tO((OQ`O,5<vO((TQ`O,5<vO((YQ`O1G2RO((_Q`O1G0uO((dQMjO<<K}O((kQMjO<<K}O((rQMhO'#F|O9`Q`O'#F{OAuQ`O'#EnO!)[QlO,5;tO!3oQ`O'#GYO!3oQ`O'#GYO!3oQ`O'#G[O!3oQ`O'#G[O!,TQMhO7+(cO!,TQMhO7+(cO%.zQ!dO1G2wO%.zQ!dO1G2wO!&zQMhO,5=]O!&zQMhO,5=]",
      stateData: "()x~O'|OS'}OSTOS(ORQ~OPYOQYOSfOY!VOaqOdzOeyOl!POpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_XO!iuO!lZO!oYO!pYO!qYO!svO!uwO!xxO!|]O$W|O$niO%h}O%j!QO%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO%y!UO&W!WO&^!XO&`!YO&b!ZO&d![O&g!]O&m!^O&s!_O&u!`O&w!aO&y!bO&{!cO(TSO(VTO(YUO(aVO(o[O~OWtO~P`OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oa!wOs!nO!S!oO!b!yO!c!vO!d!vO!|<VO#T!pO#U!pO#V!xO#W!pO#X!pO#[!zO#]!zO(U!lO(VTO(YUO(e!mO(o!sO~O(O!{O~OP]XR]X[]Xa]Xj]Xr]X!Q]X!S]X!]]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X'z]X(a]X(r]X(y]X(z]X~O!g%RX~P(qO_!}O(V#PO(W!}O(X#PO~O_#QO(X#PO(Y#PO(Z#QO~Ox#SO!U#TO(b#TO(c#VO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T<ZO(VTO(YUO(aVO(o[O~O![#ZO!]#WO!Y(hP!Y(vP~P+}O!^#cO~P`OPYOQYOSfOd!jOe!iOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(VTO(YUO(aVO(o[O~Op#mO![#iO!|]O#i#lO#j#iO(T<[O!k(sP~P.iO!l#oO(T#nO~O!x#sO!|]O%h#tO~O#k#uO~O!g#vO#k#uO~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!]$_O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~Oa(fX'z(fX'w(fX!k(fX!Y(fX!_(fX%i(fX!g(fX~P1qO#S$dO#`$eO$Q$eOP(gXR(gX[(gXj(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX!_(gX%i(gX~Oa(gX'z(gX'w(gX!Y(gX!k(gXv(gX!g(gX~P4UO#`$eO~O$]$hO$_$gO$f$mO~OSfO!_$nO$i$oO$k$qO~Oh%VOj%dOk%dOp%WOr%XOs$tOt$tOz%YO|%ZO!O%]O!S${O!_$|O!i%bO!l$xO#j%cO$W%`O$t%^O$v%_O$y%aO(T$sO(VTO(YUO(a$uO(y$}O(z%POg(^P~Ol%[O~P7eO!l%eO~O!S%hO!_%iO(T%gO~O!g%mO~Oa%nO'z%nO~O!Q%rO~P%[O(U!lO~P%[O%n%vO~P%[Oh%VO!l%eO(T%gO(U!lO~Oe%}O!l%eO(T%gO~Oj$RO~O!_&PO(T%gO(U!lO(VTO(YUO`)WP~O!Q&SO!l&RO%j&VO&T&WO~P;SO!x#sO~O%s&YO!S)SX!_)SX(T)SX~O(T&ZO~Ol!PO!u&`O%j!QO%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO~Od&eOe&dO!x&bO%h&cO%{&aO~P<bOd&hOeyOl!PO!_&gO!u&`O!xxO!|]O%h}O%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO%y!UO~Ob&kO#`&nO%j&iO(U!lO~P=gO!l&oO!u&sO~O!l#oO~O!_XO~Oa%nO'x&{O'z%nO~Oa%nO'x'OO'z%nO~Oa%nO'x'QO'z%nO~O'w]X!Y]Xv]X!k]X&[]X!_]X%i]X!g]X~P(qO!b'_O!c'WO!d'WO(U!lO(VTO(YUO~Os'UO!S'TO!['XO(e'SO!^(iP!^(xP~P@nOn'bO!_'`O(T%gO~Oe'gO!l%eO(T%gO~O!Q&SO!l&RO~Os!nO!S!oO!|<VO#T!pO#U!pO#W!pO#X!pO(U!lO(VTO(YUO(e!mO(o!sO~O!b'mO!c'lO!d'lO#V!pO#['nO#]'nO~PBYOa%nOh%VO!g#vO!l%eO'z%nO(r'pO~O!p'tO#`'rO~PChOs!nO!S!oO(VTO(YUO(e!mO(o!sO~O!_XOs(mX!S(mX!b(mX!c(mX!d(mX!|(mX#T(mX#U(mX#V(mX#W(mX#X(mX#[(mX#](mX(U(mX(V(mX(Y(mX(e(mX(o(mX~O!c'lO!d'lO(U!lO~PDWO(P'xO(Q'xO(R'zO~O_!}O(V'|O(W!}O(X'|O~O_#QO(X'|O(Y'|O(Z#QO~Ov(OO~P%[Ox#SO!U#TO(b#TO(c(RO~O![(TO!Y'WX!Y'^X!]'WX!]'^X~P+}O!](VO!Y(hX~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!](VO!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~O!Y(hX~PHRO!Y([O~O!Y(uX!](uX!g(uX!k(uX(r(uX~O#`(uX#k#dX!^(uX~PJUO#`(]O!Y(wX!](wX~O!](^O!Y(vX~O!Y(aO~O#`$eO~PJUO!^(bO~P`OR#zO!Q#yO!S#{O!l#xO(aVOP!na[!naj!nar!na!]!na!p!na#R!na#n!na#o!na#p!na#q!na#r!na#s!na#t!na#u!na#v!na#x!na#z!na#{!na(r!na(y!na(z!na~Oa!na'z!na'w!na!Y!na!k!nav!na!_!na%i!na!g!na~PKlO!k(cO~O!g#vO#`(dO(r'pO!](tXa(tX'z(tX~O!k(tX~PNXO!S%hO!_%iO!|]O#i(iO#j(hO(T%gO~O!](jO!k(sX~O!k(lO~O!S%hO!_%iO#j(hO(T%gO~OP(gXR(gX[(gXj(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX~O!g#vO!k(gX~P! uOR(nO!Q(mO!l#xO#S$dO!|!{a!S!{a~O!x!{a%h!{a!_!{a#i!{a#j!{a(T!{a~P!#vO!x(rO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_XO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~O#k(xO~O![(zO!k(kP~P%[O(e(|O(o[O~O!S)OO!l#xO(e(|O(o[O~OP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_!eO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(T)]O(VTO(YUO(aVO(o[O~O!]$_Oa$qa'z$qa'w$qa!k$qa!Y$qa!_$qa%i$qa!g$qa~Ol)dO~P!&zOh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O%]O!S${O!_$|O!i%bO!l$xO#j%cO$W%`O$t%^O$v%_O$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~Og(pP~P!,TO!Q)iO!g)hO!_$^X$Z$^X$]$^X$_$^X$f$^X~O!g)hO!_({X$Z({X$]({X$_({X$f({X~O!Q)iO~P!.^O!Q)iO!_({X$Z({X$]({X$_({X$f({X~O!_)kO$Z)oO$])jO$_)jO$f)pO~O![)sO~P!)[O$]$hO$_$gO$f)wO~On$zX!Q$zX#S$zX'y$zX(y$zX(z$zX~OgmXg$zXnmX!]mX#`mX~P!0SOx)yO(b)zO(c)|O~On*VO!Q*OO'y*PO(y$}O(z%PO~Og)}O~P!1WOg*WO~Oh%VOr%XOs$tOt$tOz%YO|%ZO!O<sO!S*YO!_*ZO!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(VTO(YUO(a$uO(y$}O(z%PO~Op*`O![*^O(T*XO!k)OP~P!1uO#k*aO~O!l*bO~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(T*dO(VTO(YUO(a$uO(y$}O(z%PO~O![*gO!Y)PP~P!3tOr*sOs!nO!S*iO!b*qO!c*kO!d*kO!l*bO#[*rO%`*mO(U!lO(VTO(YUO(e!mO~O!^*pO~P!5iO#S$dOn(`X!Q(`X'y(`X(y(`X(z(`X!](`X#`(`X~Og(`X$O(`X~P!6kOn*xO#`*wOg(_X!](_X~O!]*yOg(^X~Oj%dOk%dOl%dO(T&ZOg(^P~Os*|O~Og)}O(T&ZO~O!l+SO~O(T(vO~Op+WO!S%hO![#iO!_%iO!|]O#i#lO#j#iO(T%gO!k(sP~O!g#vO#k+XO~O!S%hO![+ZO!](^O!_%iO(T%gO!Y(vP~Os'[O!S+]O![+[O(VTO(YUO(e(|O~O!^(xP~P!9|O!]+^Oa)TX'z)TX~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~Oa!ja!]!ja'z!ja'w!ja!Y!ja!k!jav!ja!_!ja%i!ja!g!ja~P!:tOR#zO!Q#yO!S#{O!l#xO(aVOP!ra[!raj!rar!ra!]!ra!p!ra#R!ra#n!ra#o!ra#p!ra#q!ra#r!ra#s!ra#t!ra#u!ra#v!ra#x!ra#z!ra#{!ra(r!ra(y!ra(z!ra~Oa!ra'z!ra'w!ra!Y!ra!k!rav!ra!_!ra%i!ra!g!ra~P!=[OR#zO!Q#yO!S#{O!l#xO(aVOP!ta[!taj!tar!ta!]!ta!p!ta#R!ta#n!ta#o!ta#p!ta#q!ta#r!ta#s!ta#t!ta#u!ta#v!ta#x!ta#z!ta#{!ta(r!ta(y!ta(z!ta~Oa!ta'z!ta'w!ta!Y!ta!k!tav!ta!_!ta%i!ta!g!ta~P!?rOh%VOn+gO!_'`O%i+fO~O!g+iOa(]X!_(]X'z(]X!](]X~Oa%nO!_XO'z%nO~Oh%VO!l%eO~Oh%VO!l%eO(T%gO~O!g#vO#k(xO~Ob+tO%j+uO(T+qO(VTO(YUO!^)XP~O!]+vO`)WX~O[+zO~O`+{O~O!_&PO(T%gO(U!lO`)WP~O%j,OO~P;SOh%VO#`,SO~Oh%VOn,VO!_$|O~O!_,XO~O!Q,ZO!_XO~O%n%vO~O!x,`O~Oe,eO~Ob,fO(T#nO(VTO(YUO!^)VP~Oe%}O~O%j!QO(T&ZO~P=gO[,kO`,jO~OPYOQYOSfOdzOeyOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!iuO!lZO!oYO!pYO!qYO!svO!xxO!|]O$niO%h}O(VTO(YUO(aVO(o[O~O!_!eO!u!gO$W!kO(T!dO~P!FyO`,jOa%nO'z%nO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oa,pOl!OO!uwO%l!OO%m!OO%n!OO~P!IcO!l&oO~O&^,vO~O!_,xO~O&o,zO&q,{OP&laQ&laS&laY&laa&lad&lae&lal&lap&lar&las&lat&laz&la|&la!O&la!S&la!W&la!X&la!_&la!i&la!l&la!o&la!p&la!q&la!s&la!u&la!x&la!|&la$W&la$n&la%h&la%j&la%l&la%m&la%n&la%q&la%s&la%v&la%w&la%y&la&W&la&^&la&`&la&b&la&d&la&g&la&m&la&s&la&u&la&w&la&y&la&{&la'w&la(T&la(V&la(Y&la(a&la(o&la!^&la&e&lab&la&j&la~O(T-QO~Oh!eX!]!RX!^!RX!g!RX!g!eX!l!eX#`!RX~O!]!eX!^!eX~P#!iO!g-VO#`-UOh(jX!]#hX!^#hX!g(jX!l(jX~O!](jX!^(jX~P##[Oh%VO!g-XO!l%eO!]!aX!^!aX~Os!nO!S!oO(VTO(YUO(e!mO~OP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_!eO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(VTO(YUO(aVO(o[O~O(T=QO~P#$qO!]-]O!^(iX~O!^-_O~O!g-VO#`-UO!]#hX!^#hX~O!]-`O!^(xX~O!^-bO~O!c-cO!d-cO(U!lO~P#$`O!^-fO~P'_On-iO!_'`O~O!Y-nO~Os!{a!b!{a!c!{a!d!{a#T!{a#U!{a#V!{a#W!{a#X!{a#[!{a#]!{a(U!{a(V!{a(Y!{a(e!{a(o!{a~P!#vO!p-sO#`-qO~PChO!c-uO!d-uO(U!lO~PDWOa%nO#`-qO'z%nO~Oa%nO!g#vO#`-qO'z%nO~Oa%nO!g#vO!p-sO#`-qO'z%nO(r'pO~O(P'xO(Q'xO(R-zO~Ov-{O~O!Y'Wa!]'Wa~P!:tO![.PO!Y'WX!]'WX~P%[O!](VO!Y(ha~O!Y(ha~PHRO!](^O!Y(va~O!S%hO![.TO!_%iO(T%gO!Y'^X!]'^X~O#`.VO!](ta!k(taa(ta'z(ta~O!g#vO~P#,wO!](jO!k(sa~O!S%hO!_%iO#j.ZO(T%gO~Op.`O!S%hO![.]O!_%iO!|]O#i._O#j.]O(T%gO!]'aX!k'aX~OR.dO!l#xO~Oh%VOn.gO!_'`O%i.fO~Oa#ci!]#ci'z#ci'w#ci!Y#ci!k#civ#ci!_#ci%i#ci!g#ci~P!:tOn>]O!Q*OO'y*PO(y$}O(z%PO~O#k#_aa#_a#`#_a'z#_a!]#_a!k#_a!_#_a!Y#_a~P#/sO#k(`XP(`XR(`X[(`Xa(`Xj(`Xr(`X!S(`X!l(`X!p(`X#R(`X#n(`X#o(`X#p(`X#q(`X#r(`X#s(`X#t(`X#u(`X#v(`X#x(`X#z(`X#{(`X'z(`X(a(`X(r(`X!k(`X!Y(`X'w(`Xv(`X!_(`X%i(`X!g(`X~P!6kO!].tO!k(kX~P!:tO!k.wO~O!Y.yO~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O(aVO[#mia#mij#mir#mi!]#mi#R#mi#o#mi#p#mi#q#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#n#mi~P#3cO#n$OO~P#3cOP$[OR#zOr$aO!Q#yO!S#{O!l#xO!p$[O#n$OO#o$PO#p$PO#q$PO(aVO[#mia#mij#mi!]#mi#R#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#r#mi~P#6QO#r$QO~P#6QOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO(aVOa#mi!]#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#v#mi~P#8oOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO(aVO(z#}Oa#mi!]#mi#z#mi#{#mi'z#mi(r#mi(y#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#x$UO~P#;VO#x#mi~P#;VO#v$SO~P#8oOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO(aVO(y#|O(z#}Oa#mi!]#mi#{#mi'z#mi(r#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#z#mi~P#={O#z$WO~P#={OP]XR]X[]Xj]Xr]X!Q]X!S]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X!]]X!^]X~O$O]X~P#@jOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO#x<eO#z<gO#{<hO(aVO(r$YO(y#|O(z#}O~O$O.{O~P#BwO#S$dO#`<nO$Q<nO$O(gX!^(gX~P! uOa'da!]'da'z'da'w'da!k'da!Y'dav'da!_'da%i'da!g'da~P!:tO[#mia#mij#mir#mi!]#mi#R#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O#n$OO#o$PO#p$PO#q$PO(aVO(y#mi(z#mi~P#EyOn>]O!Q*OO'y*PO(y$}O(z%POP#miR#mi!S#mi!l#mi!p#mi#n#mi#o#mi#p#mi#q#mi(a#mi~P#EyO!]/POg(pX~P!1WOg/RO~Oa$Pi!]$Pi'z$Pi'w$Pi!Y$Pi!k$Piv$Pi!_$Pi%i$Pi!g$Pi~P!:tO$]/SO$_/SO~O$]/TO$_/TO~O!g)hO#`/UO!_$cX$Z$cX$]$cX$_$cX$f$cX~O![/VO~O!_)kO$Z/XO$])jO$_)jO$f/YO~O!]<iO!^(fX~P#BwO!^/ZO~O!g)hO$f({X~O$f/]O~Ov/^O~P!&zOx)yO(b)zO(c/aO~O!S/dO~O(y$}On%aa!Q%aa'y%aa(z%aa!]%aa#`%aa~Og%aa$O%aa~P#L{O(z%POn%ca!Q%ca'y%ca(y%ca!]%ca#`%ca~Og%ca$O%ca~P#MnO!]fX!gfX!kfX!k$zX(rfX~P!0SOp%WO![/mO!](^O(T/lO!Y(vP!Y)PP~P!1uOr*sO!b*qO!c*kO!d*kO!l*bO#[*rO%`*mO(U!lO(VTO(YUO~Os<}O!S/nO![+[O!^*pO(e<|O!^(xP~P$ [O!k/oO~P#/sO!]/pO!g#vO(r'pO!k)OX~O!k/uO~OnoX!QoX'yoX(yoX(zoX~O!g#vO!koX~P$#OOp/wO!S%hO![*^O!_%iO(T%gO!k)OP~O#k/xO~O!Y$zX!]$zX!g%RX~P!0SO!]/yO!Y)PX~P#/sO!g/{O~O!Y/}O~OpkO(T0OO~P.iOh%VOr0TO!g#vO!l%eO(r'pO~O!g+iO~Oa%nO!]0XO'z%nO~O!^0ZO~P!5iO!c0[O!d0[O(U!lO~P#$`Os!nO!S0]O(VTO(YUO(e!mO~O#[0_O~Og%aa!]%aa#`%aa$O%aa~P!1WOg%ca!]%ca#`%ca$O%ca~P!1WOj%dOk%dOl%dO(T&ZOg'mX!]'mX~O!]*yOg(^a~Og0hO~On0jO#`0iOg(_a!](_a~OR0kO!Q0kO!S0lO#S$dOn}a'y}a(y}a(z}a!]}a#`}a~Og}a$O}a~P$(cO!Q*OO'y*POn$sa(y$sa(z$sa!]$sa#`$sa~Og$sa$O$sa~P$)_O!Q*OO'y*POn$ua(y$ua(z$ua!]$ua#`$ua~Og$ua$O$ua~P$*QO#k0oO~Og%Ta!]%Ta#`%Ta$O%Ta~P!1WO!g#vO~O#k0rO~O!]+^Oa)Ta'z)Ta~OR#zO!Q#yO!S#{O!l#xO(aVOP!ri[!rij!rir!ri!]!ri!p!ri#R!ri#n!ri#o!ri#p!ri#q!ri#r!ri#s!ri#t!ri#u!ri#v!ri#x!ri#z!ri#{!ri(r!ri(y!ri(z!ri~Oa!ri'z!ri'w!ri!Y!ri!k!riv!ri!_!ri%i!ri!g!ri~P$+oOh%VOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(VTO(YUO(a$uO(y$}O(z%PO~Op0{O%]0|O(T0zO~P$.VO!g+iOa(]a!_(]a'z(]a!](]a~O#k1SO~O[]X!]fX!^fX~O!]1TO!^)XX~O!^1VO~O[1WO~Ob1YO(T+qO(VTO(YUO~O!_&PO(T%gO`'uX!]'uX~O!]+vO`)Wa~O!k1]O~P!:tO[1`O~O`1aO~O#`1fO~On1iO!_$|O~O(e(|O!^)UP~Oh%VOn1rO!_1oO%i1qO~O[1|O!]1zO!^)VX~O!^1}O~O`2POa%nO'z%nO~O(T#nO(VTO(YUO~O#S$dO#`$eO$Q$eOP(gXR(gX[(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX~Oj2SO&[2TOa(gX~P$3pOj2SO#`$eO&[2TO~Oa2VO~P%[Oa2XO~O&e2[OP&ciQ&ciS&ciY&cia&cid&cie&cil&cip&cir&cis&cit&ciz&ci|&ci!O&ci!S&ci!W&ci!X&ci!_&ci!i&ci!l&ci!o&ci!p&ci!q&ci!s&ci!u&ci!x&ci!|&ci$W&ci$n&ci%h&ci%j&ci%l&ci%m&ci%n&ci%q&ci%s&ci%v&ci%w&ci%y&ci&W&ci&^&ci&`&ci&b&ci&d&ci&g&ci&m&ci&s&ci&u&ci&w&ci&y&ci&{&ci'w&ci(T&ci(V&ci(Y&ci(a&ci(o&ci!^&cib&ci&j&ci~Ob2bO!^2`O&j2aO~P`O!_XO!l2dO~O&q,{OP&liQ&liS&liY&lia&lid&lie&lil&lip&lir&lis&lit&liz&li|&li!O&li!S&li!W&li!X&li!_&li!i&li!l&li!o&li!p&li!q&li!s&li!u&li!x&li!|&li$W&li$n&li%h&li%j&li%l&li%m&li%n&li%q&li%s&li%v&li%w&li%y&li&W&li&^&li&`&li&b&li&d&li&g&li&m&li&s&li&u&li&w&li&y&li&{&li'w&li(T&li(V&li(Y&li(a&li(o&li!^&li&e&lib&li&j&li~O!Y2jO~O!]!aa!^!aa~P#BwOs!nO!S!oO![2pO(e!mO!]'XX!^'XX~P@nO!]-]O!^(ia~O!]'_X!^'_X~P!9|O!]-`O!^(xa~O!^2wO~P'_Oa%nO#`3QO'z%nO~Oa%nO!g#vO#`3QO'z%nO~Oa%nO!g#vO!p3UO#`3QO'z%nO(r'pO~Oa%nO'z%nO~P!:tO!]$_Ov$qa~O!Y'Wi!]'Wi~P!:tO!](VO!Y(hi~O!](^O!Y(vi~O!Y(wi!](wi~P!:tO!](ti!k(tia(ti'z(ti~P!:tO#`3WO!](ti!k(tia(ti'z(ti~O!](jO!k(si~O!S%hO!_%iO!|]O#i3]O#j3[O(T%gO~O!S%hO!_%iO#j3[O(T%gO~On3dO!_'`O%i3cO~Oh%VOn3dO!_'`O%i3cO~O#k%aaP%aaR%aa[%aaa%aaj%aar%aa!S%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa'z%aa(a%aa(r%aa!k%aa!Y%aa'w%aav%aa!_%aa%i%aa!g%aa~P#L{O#k%caP%caR%ca[%caa%caj%car%ca!S%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca'z%ca(a%ca(r%ca!k%ca!Y%ca'w%cav%ca!_%ca%i%ca!g%ca~P#MnO#k%aaP%aaR%aa[%aaa%aaj%aar%aa!S%aa!]%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa'z%aa(a%aa(r%aa!k%aa!Y%aa'w%aa#`%aav%aa!_%aa%i%aa!g%aa~P#/sO#k%caP%caR%ca[%caa%caj%car%ca!S%ca!]%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca'z%ca(a%ca(r%ca!k%ca!Y%ca'w%ca#`%cav%ca!_%ca%i%ca!g%ca~P#/sO#k}aP}a[}aa}aj}ar}a!l}a!p}a#R}a#n}a#o}a#p}a#q}a#r}a#s}a#t}a#u}a#v}a#x}a#z}a#{}a'z}a(a}a(r}a!k}a!Y}a'w}av}a!_}a%i}a!g}a~P$(cO#k$saP$saR$sa[$saa$saj$sar$sa!S$sa!l$sa!p$sa#R$sa#n$sa#o$sa#p$sa#q$sa#r$sa#s$sa#t$sa#u$sa#v$sa#x$sa#z$sa#{$sa'z$sa(a$sa(r$sa!k$sa!Y$sa'w$sav$sa!_$sa%i$sa!g$sa~P$)_O#k$uaP$uaR$ua[$uaa$uaj$uar$ua!S$ua!l$ua!p$ua#R$ua#n$ua#o$ua#p$ua#q$ua#r$ua#s$ua#t$ua#u$ua#v$ua#x$ua#z$ua#{$ua'z$ua(a$ua(r$ua!k$ua!Y$ua'w$uav$ua!_$ua%i$ua!g$ua~P$*QO#k%TaP%TaR%Ta[%Taa%Taj%Tar%Ta!S%Ta!]%Ta!l%Ta!p%Ta#R%Ta#n%Ta#o%Ta#p%Ta#q%Ta#r%Ta#s%Ta#t%Ta#u%Ta#v%Ta#x%Ta#z%Ta#{%Ta'z%Ta(a%Ta(r%Ta!k%Ta!Y%Ta'w%Ta#`%Tav%Ta!_%Ta%i%Ta!g%Ta~P#/sOa#cq!]#cq'z#cq'w#cq!Y#cq!k#cqv#cq!_#cq%i#cq!g#cq~P!:tO![3lO!]'YX!k'YX~P%[O!].tO!k(ka~O!].tO!k(ka~P!:tO!Y3oO~O$O!na!^!na~PKlO$O!ja!]!ja!^!ja~P#BwO$O!ra!^!ra~P!=[O$O!ta!^!ta~P!?rOg']X!]']X~P!,TO!]/POg(pa~OSfO!_4TO$d4UO~O!^4YO~Ov4ZO~P#/sOa$mq!]$mq'z$mq'w$mq!Y$mq!k$mqv$mq!_$mq%i$mq!g$mq~P!:tO!Y4]O~P!&zO!S4^O~O!Q*OO'y*PO(z%POn'ia(y'ia!]'ia#`'ia~Og'ia$O'ia~P%-fO!Q*OO'y*POn'ka(y'ka(z'ka!]'ka#`'ka~Og'ka$O'ka~P%.XO(r$YO~P#/sO!YfX!Y$zX!]fX!]$zX!g%RX#`fX~P!0SOp%WO(T=WO~P!1uOp4bO!S%hO![4aO!_%iO(T%gO!]'eX!k'eX~O!]/pO!k)Oa~O!]/pO!g#vO!k)Oa~O!]/pO!g#vO(r'pO!k)Oa~Og$|i!]$|i#`$|i$O$|i~P!1WO![4jO!Y'gX!]'gX~P!3tO!]/yO!Y)Pa~O!]/yO!Y)Pa~P#/sOP]XR]X[]Xj]Xr]X!Q]X!S]X!Y]X!]]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X~Oj%YX!g%YX~P%2OOj4oO!g#vO~Oh%VO!g#vO!l%eO~Oh%VOr4tO!l%eO(r'pO~Or4yO!g#vO(r'pO~Os!nO!S4zO(VTO(YUO(e!mO~O(y$}On%ai!Q%ai'y%ai(z%ai!]%ai#`%ai~Og%ai$O%ai~P%5oO(z%POn%ci!Q%ci'y%ci(y%ci!]%ci#`%ci~Og%ci$O%ci~P%6bOg(_i!](_i~P!1WO#`5QOg(_i!](_i~P!1WO!k5VO~Oa$oq!]$oq'z$oq'w$oq!Y$oq!k$oqv$oq!_$oq%i$oq!g$oq~P!:tO!Y5ZO~O!]5[O!_)QX~P#/sOa$zX!_$zX%^]X'z$zX!]$zX~P!0SO%^5_OaoX!_oX'zoX!]oX~P$#OOp5`O(T#nO~O%^5_O~Ob5fO%j5gO(T+qO(VTO(YUO!]'tX!^'tX~O!]1TO!^)Xa~O[5kO~O`5lO~O[5pO~Oa%nO'z%nO~P#/sO!]5uO#`5wO!^)UX~O!^5xO~Or6OOs!nO!S*iO!b!yO!c!vO!d!vO!|<VO#T!pO#U!pO#V!pO#W!pO#X!pO#[5}O#]!zO(U!lO(VTO(YUO(e!mO(o!sO~O!^5|O~P%;eOn6TO!_1oO%i6SO~Oh%VOn6TO!_1oO%i6SO~Ob6[O(T#nO(VTO(YUO!]'sX!^'sX~O!]1zO!^)Va~O(VTO(YUO(e6^O~O`6bO~Oj6eO&[6fO~PNXO!k6gO~P%[Oa6iO~Oa6iO~P%[Ob2bO!^6nO&j2aO~P`O!g6pO~O!g6rOh(ji!](ji!^(ji!g(ji!l(jir(ji(r(ji~O!]#hi!^#hi~P#BwO#`6sO!]#hi!^#hi~O!]!ai!^!ai~P#BwOa%nO#`6|O'z%nO~Oa%nO!g#vO#`6|O'z%nO~O!](tq!k(tqa(tq'z(tq~P!:tO!](jO!k(sq~O!S%hO!_%iO#j7TO(T%gO~O!_'`O%i7WO~On7[O!_'`O%i7WO~O#k'iaP'iaR'ia['iaa'iaj'iar'ia!S'ia!l'ia!p'ia#R'ia#n'ia#o'ia#p'ia#q'ia#r'ia#s'ia#t'ia#u'ia#v'ia#x'ia#z'ia#{'ia'z'ia(a'ia(r'ia!k'ia!Y'ia'w'iav'ia!_'ia%i'ia!g'ia~P%-fO#k'kaP'kaR'ka['kaa'kaj'kar'ka!S'ka!l'ka!p'ka#R'ka#n'ka#o'ka#p'ka#q'ka#r'ka#s'ka#t'ka#u'ka#v'ka#x'ka#z'ka#{'ka'z'ka(a'ka(r'ka!k'ka!Y'ka'w'kav'ka!_'ka%i'ka!g'ka~P%.XO#k$|iP$|iR$|i[$|ia$|ij$|ir$|i!S$|i!]$|i!l$|i!p$|i#R$|i#n$|i#o$|i#p$|i#q$|i#r$|i#s$|i#t$|i#u$|i#v$|i#x$|i#z$|i#{$|i'z$|i(a$|i(r$|i!k$|i!Y$|i'w$|i#`$|iv$|i!_$|i%i$|i!g$|i~P#/sO#k%aiP%aiR%ai[%aia%aij%air%ai!S%ai!l%ai!p%ai#R%ai#n%ai#o%ai#p%ai#q%ai#r%ai#s%ai#t%ai#u%ai#v%ai#x%ai#z%ai#{%ai'z%ai(a%ai(r%ai!k%ai!Y%ai'w%aiv%ai!_%ai%i%ai!g%ai~P%5oO#k%ciP%ciR%ci[%cia%cij%cir%ci!S%ci!l%ci!p%ci#R%ci#n%ci#o%ci#p%ci#q%ci#r%ci#s%ci#t%ci#u%ci#v%ci#x%ci#z%ci#{%ci'z%ci(a%ci(r%ci!k%ci!Y%ci'w%civ%ci!_%ci%i%ci!g%ci~P%6bO!]'Ya!k'Ya~P!:tO!].tO!k(ki~O$O#ci!]#ci!^#ci~P#BwOP$[OR#zO!Q#yO!S#{O!l#xO!p$[O(aVO[#mij#mir#mi#R#mi#o#mi#p#mi#q#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#n#mi~P%NdO#n<_O~P%NdOP$[OR#zOr<kO!Q#yO!S#{O!l#xO!p$[O#n<_O#o<`O#p<`O#q<`O(aVO[#mij#mi#R#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#r#mi~P&!lO#r<aO~P&!lOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO(aVO#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#v#mi~P&$tOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO(aVO(z#}O#z#mi#{#mi$O#mi(r#mi(y#mi!]#mi!^#mi~O#x<eO~P&&uO#x#mi~P&&uO#v<cO~P&$tOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO#x<eO(aVO(y#|O(z#}O#{#mi$O#mi(r#mi!]#mi!^#mi~O#z#mi~P&)UO#z<gO~P&)UOa#|y!]#|y'z#|y'w#|y!Y#|y!k#|yv#|y!_#|y%i#|y!g#|y~P!:tO[#mij#mir#mi#R#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi!]#mi!^#mi~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O#n<_O#o<`O#p<`O#q<`O(aVO(y#mi(z#mi~P&,QOn>^O!Q*OO'y*PO(y$}O(z%POP#miR#mi!S#mi!l#mi!p#mi#n#mi#o#mi#p#mi#q#mi(a#mi~P&,QO#S$dOP(`XR(`X[(`Xj(`Xn(`Xr(`X!Q(`X!S(`X!l(`X!p(`X#R(`X#n(`X#o(`X#p(`X#q(`X#r(`X#s(`X#t(`X#u(`X#v(`X#x(`X#z(`X#{(`X$O(`X'y(`X(a(`X(r(`X(y(`X(z(`X!](`X!^(`X~O$O$Pi!]$Pi!^$Pi~P#BwO$O!ri!^!ri~P$+oOg']a!]']a~P!1WO!^7nO~O!]'da!^'da~P#BwO!Y7oO~P#/sO!g#vO(r'pO!]'ea!k'ea~O!]/pO!k)Oi~O!]/pO!g#vO!k)Oi~Og$|q!]$|q#`$|q$O$|q~P!1WO!Y'ga!]'ga~P#/sO!g7vO~O!]/yO!Y)Pi~P#/sO!]/yO!Y)Pi~O!Y7yO~Oh%VOr8OO!l%eO(r'pO~Oj8QO!g#vO~Or8TO!g#vO(r'pO~O!Q*OO'y*PO(z%POn'ja(y'ja!]'ja#`'ja~Og'ja$O'ja~P&5RO!Q*OO'y*POn'la(y'la(z'la!]'la#`'la~Og'la$O'la~P&5tOg(_q!](_q~P!1WO#`8VOg(_q!](_q~P!1WO!Y8WO~Og%Oq!]%Oq#`%Oq$O%Oq~P!1WOa$oy!]$oy'z$oy'w$oy!Y$oy!k$oyv$oy!_$oy%i$oy!g$oy~P!:tO!g6rO~O!]5[O!_)Qa~O!_'`OP$TaR$Ta[$Taj$Tar$Ta!Q$Ta!S$Ta!]$Ta!l$Ta!p$Ta#R$Ta#n$Ta#o$Ta#p$Ta#q$Ta#r$Ta#s$Ta#t$Ta#u$Ta#v$Ta#x$Ta#z$Ta#{$Ta(a$Ta(r$Ta(y$Ta(z$Ta~O%i7WO~P&8fO%^8[Oa%[i!_%[i'z%[i!]%[i~Oa#cy!]#cy'z#cy'w#cy!Y#cy!k#cyv#cy!_#cy%i#cy!g#cy~P!:tO[8^O~Ob8`O(T+qO(VTO(YUO~O!]1TO!^)Xi~O`8dO~O(e(|O!]'pX!^'pX~O!]5uO!^)Ua~O!^8nO~P%;eO(o!sO~P$&YO#[8oO~O!_1oO~O!_1oO%i8qO~On8tO!_1oO%i8qO~O[8yO!]'sa!^'sa~O!]1zO!^)Vi~O!k8}O~O!k9OO~O!k9RO~O!k9RO~P%[Oa9TO~O!g9UO~O!k9VO~O!](wi!^(wi~P#BwOa%nO#`9_O'z%nO~O!](ty!k(tya(ty'z(ty~P!:tO!](jO!k(sy~O%i9bO~P&8fO!_'`O%i9bO~O#k$|qP$|qR$|q[$|qa$|qj$|qr$|q!S$|q!]$|q!l$|q!p$|q#R$|q#n$|q#o$|q#p$|q#q$|q#r$|q#s$|q#t$|q#u$|q#v$|q#x$|q#z$|q#{$|q'z$|q(a$|q(r$|q!k$|q!Y$|q'w$|q#`$|qv$|q!_$|q%i$|q!g$|q~P#/sO#k'jaP'jaR'ja['jaa'jaj'jar'ja!S'ja!l'ja!p'ja#R'ja#n'ja#o'ja#p'ja#q'ja#r'ja#s'ja#t'ja#u'ja#v'ja#x'ja#z'ja#{'ja'z'ja(a'ja(r'ja!k'ja!Y'ja'w'jav'ja!_'ja%i'ja!g'ja~P&5RO#k'laP'laR'la['laa'laj'lar'la!S'la!l'la!p'la#R'la#n'la#o'la#p'la#q'la#r'la#s'la#t'la#u'la#v'la#x'la#z'la#{'la'z'la(a'la(r'la!k'la!Y'la'w'lav'la!_'la%i'la!g'la~P&5tO#k%OqP%OqR%Oq[%Oqa%Oqj%Oqr%Oq!S%Oq!]%Oq!l%Oq!p%Oq#R%Oq#n%Oq#o%Oq#p%Oq#q%Oq#r%Oq#s%Oq#t%Oq#u%Oq#v%Oq#x%Oq#z%Oq#{%Oq'z%Oq(a%Oq(r%Oq!k%Oq!Y%Oq'w%Oq#`%Oqv%Oq!_%Oq%i%Oq!g%Oq~P#/sO!]'Yi!k'Yi~P!:tO$O#cq!]#cq!^#cq~P#BwO(y$}OP%aaR%aa[%aaj%aar%aa!S%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa$O%aa(a%aa(r%aa!]%aa!^%aa~On%aa!Q%aa'y%aa(z%aa~P&IyO(z%POP%caR%ca[%caj%car%ca!S%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca$O%ca(a%ca(r%ca!]%ca!^%ca~On%ca!Q%ca'y%ca(y%ca~P&LQOn>^O!Q*OO'y*PO(z%PO~P&IyOn>^O!Q*OO'y*PO(y$}O~P&LQOR0kO!Q0kO!S0lO#S$dOP}a[}aj}an}ar}a!l}a!p}a#R}a#n}a#o}a#p}a#q}a#r}a#s}a#t}a#u}a#v}a#x}a#z}a#{}a$O}a'y}a(a}a(r}a(y}a(z}a!]}a!^}a~O!Q*OO'y*POP$saR$sa[$saj$san$sar$sa!S$sa!l$sa!p$sa#R$sa#n$sa#o$sa#p$sa#q$sa#r$sa#s$sa#t$sa#u$sa#v$sa#x$sa#z$sa#{$sa$O$sa(a$sa(r$sa(y$sa(z$sa!]$sa!^$sa~O!Q*OO'y*POP$uaR$ua[$uaj$uan$uar$ua!S$ua!l$ua!p$ua#R$ua#n$ua#o$ua#p$ua#q$ua#r$ua#s$ua#t$ua#u$ua#v$ua#x$ua#z$ua#{$ua$O$ua(a$ua(r$ua(y$ua(z$ua!]$ua!^$ua~On>^O!Q*OO'y*PO(y$}O(z%PO~OP%TaR%Ta[%Taj%Tar%Ta!S%Ta!l%Ta!p%Ta#R%Ta#n%Ta#o%Ta#p%Ta#q%Ta#r%Ta#s%Ta#t%Ta#u%Ta#v%Ta#x%Ta#z%Ta#{%Ta$O%Ta(a%Ta(r%Ta!]%Ta!^%Ta~P''VO$O$mq!]$mq!^$mq~P#BwO$O$oq!]$oq!^$oq~P#BwO!^9oO~O$O9pO~P!1WO!g#vO!]'ei!k'ei~O!g#vO(r'pO!]'ei!k'ei~O!]/pO!k)Oq~O!Y'gi!]'gi~P#/sO!]/yO!Y)Pq~Or9wO!g#vO(r'pO~O[9yO!Y9xO~P#/sO!Y9xO~Oj:PO!g#vO~Og(_y!](_y~P!1WO!]'na!_'na~P#/sOa%[q!_%[q'z%[q!]%[q~P#/sO[:UO~O!]1TO!^)Xq~O`:YO~O#`:ZO!]'pa!^'pa~O!]5uO!^)Ui~P#BwO!S:]O~O!_1oO%i:`O~O(VTO(YUO(e:eO~O!]1zO!^)Vq~O!k:hO~O!k:iO~O!k:jO~O!k:jO~P%[O#`:mO!]#hy!^#hy~O!]#hy!^#hy~P#BwO%i:rO~P&8fO!_'`O%i:rO~O$O#|y!]#|y!^#|y~P#BwOP$|iR$|i[$|ij$|ir$|i!S$|i!l$|i!p$|i#R$|i#n$|i#o$|i#p$|i#q$|i#r$|i#s$|i#t$|i#u$|i#v$|i#x$|i#z$|i#{$|i$O$|i(a$|i(r$|i!]$|i!^$|i~P''VO!Q*OO'y*PO(z%POP'iaR'ia['iaj'ian'iar'ia!S'ia!l'ia!p'ia#R'ia#n'ia#o'ia#p'ia#q'ia#r'ia#s'ia#t'ia#u'ia#v'ia#x'ia#z'ia#{'ia$O'ia(a'ia(r'ia(y'ia!]'ia!^'ia~O!Q*OO'y*POP'kaR'ka['kaj'kan'kar'ka!S'ka!l'ka!p'ka#R'ka#n'ka#o'ka#p'ka#q'ka#r'ka#s'ka#t'ka#u'ka#v'ka#x'ka#z'ka#{'ka$O'ka(a'ka(r'ka(y'ka(z'ka!]'ka!^'ka~O(y$}OP%aiR%ai[%aij%ain%air%ai!Q%ai!S%ai!l%ai!p%ai#R%ai#n%ai#o%ai#p%ai#q%ai#r%ai#s%ai#t%ai#u%ai#v%ai#x%ai#z%ai#{%ai$O%ai'y%ai(a%ai(r%ai(z%ai!]%ai!^%ai~O(z%POP%ciR%ci[%cij%cin%cir%ci!Q%ci!S%ci!l%ci!p%ci#R%ci#n%ci#o%ci#p%ci#q%ci#r%ci#s%ci#t%ci#u%ci#v%ci#x%ci#z%ci#{%ci$O%ci'y%ci(a%ci(r%ci(y%ci!]%ci!^%ci~O$O$oy!]$oy!^$oy~P#BwO$O#cy!]#cy!^#cy~P#BwO!g#vO!]'eq!k'eq~O!]/pO!k)Oy~O!Y'gq!]'gq~P#/sOr:|O!g#vO(r'pO~O[;QO!Y;PO~P#/sO!Y;PO~Og(_!R!](_!R~P!1WOa%[y!_%[y'z%[y!]%[y~P#/sO!]1TO!^)Xy~O!]5uO!^)Uq~O(T;XO~O!_1oO%i;[O~O!k;_O~O%i;dO~P&8fOP$|qR$|q[$|qj$|qr$|q!S$|q!l$|q!p$|q#R$|q#n$|q#o$|q#p$|q#q$|q#r$|q#s$|q#t$|q#u$|q#v$|q#x$|q#z$|q#{$|q$O$|q(a$|q(r$|q!]$|q!^$|q~P''VO!Q*OO'y*PO(z%POP'jaR'ja['jaj'jan'jar'ja!S'ja!l'ja!p'ja#R'ja#n'ja#o'ja#p'ja#q'ja#r'ja#s'ja#t'ja#u'ja#v'ja#x'ja#z'ja#{'ja$O'ja(a'ja(r'ja(y'ja!]'ja!^'ja~O!Q*OO'y*POP'laR'la['laj'lan'lar'la!S'la!l'la!p'la#R'la#n'la#o'la#p'la#q'la#r'la#s'la#t'la#u'la#v'la#x'la#z'la#{'la$O'la(a'la(r'la(y'la(z'la!]'la!^'la~OP%OqR%Oq[%Oqj%Oqr%Oq!S%Oq!l%Oq!p%Oq#R%Oq#n%Oq#o%Oq#p%Oq#q%Oq#r%Oq#s%Oq#t%Oq#u%Oq#v%Oq#x%Oq#z%Oq#{%Oq$O%Oq(a%Oq(r%Oq!]%Oq!^%Oq~P''VOg%e!Z!]%e!Z#`%e!Z$O%e!Z~P!1WO!Y;hO~P#/sOr;iO!g#vO(r'pO~O[;kO!Y;hO~P#/sO!]'pq!^'pq~P#BwO!]#h!Z!^#h!Z~P#BwO#k%e!ZP%e!ZR%e!Z[%e!Za%e!Zj%e!Zr%e!Z!S%e!Z!]%e!Z!l%e!Z!p%e!Z#R%e!Z#n%e!Z#o%e!Z#p%e!Z#q%e!Z#r%e!Z#s%e!Z#t%e!Z#u%e!Z#v%e!Z#x%e!Z#z%e!Z#{%e!Z'z%e!Z(a%e!Z(r%e!Z!k%e!Z!Y%e!Z'w%e!Z#`%e!Zv%e!Z!_%e!Z%i%e!Z!g%e!Z~P#/sOr;tO!g#vO(r'pO~O!Y;uO~P#/sOr;|O!g#vO(r'pO~O!Y;}O~P#/sOP%e!ZR%e!Z[%e!Zj%e!Zr%e!Z!S%e!Z!l%e!Z!p%e!Z#R%e!Z#n%e!Z#o%e!Z#p%e!Z#q%e!Z#r%e!Z#s%e!Z#t%e!Z#u%e!Z#v%e!Z#x%e!Z#z%e!Z#{%e!Z$O%e!Z(a%e!Z(r%e!Z!]%e!Z!^%e!Z~P''VOr<QO!g#vO(r'pO~Ov(fX~P1qO!Q%rO~P!)[O(U!lO~P!)[O!YfX!]fX#`fX~P%2OOP]XR]X[]Xj]Xr]X!Q]X!S]X!]]X!]fX!l]X!p]X#R]X#S]X#`]X#`fX#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X~O!gfX!k]X!kfX(rfX~P'LTOP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_XO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(T)]O(VTO(YUO(aVO(o[O~O!]<iO!^$qa~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<tO!S${O!_$|O!i>WO!l$xO#j<zO$W%`O$t<vO$v<xO$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~Ol)dO~P(!yOr!eX(r!eX~P#!iOr(jX(r(jX~P##[O!^]X!^fX~P'LTO!YfX!Y$zX!]fX!]$zX#`fX~P!0SO#k<^O~O!g#vO#k<^O~O#`<nO~Oj<bO~O#`=OO!](wX!^(wX~O#`<nO!](uX!^(uX~O#k=PO~Og=RO~P!1WO#k=XO~O#k=YO~Og=RO(T&ZO~O!g#vO#k=ZO~O!g#vO#k=PO~O$O=[O~P#BwO#k=]O~O#k=^O~O#k=cO~O#k=dO~O#k=eO~O#k=fO~O$O=gO~P!1WO$O=hO~P!1WOl=sO~P7eOk#S#T#U#W#X#[#i#j#u$n$t$v$y%]%^%h%i%j%q%s%v%w%y%{~(OT#o!X'|(U#ps#n#qr!Q'}$]'}(T$_(e~",
      goto: "$9Y)]PPPPPP)^PP)aP)rP+W/]PPPP6mPP7TPP=QPPP@tPA^PA^PPPA^PCfPA^PA^PA^PCjPCoPD^PIWPPPI[PPPPI[L_PPPLeMVPI[PI[PP! eI[PPPI[PI[P!#lI[P!'S!(X!(bP!)U!)Y!)U!,gPPPPPPP!-W!(XPP!-h!/YP!2iI[I[!2n!5z!:h!:h!>gPPP!>oI[PPPPPPPPP!BOP!C]PPI[!DnPI[PI[I[I[I[I[PI[!FQP!I[P!LbP!Lf!Lp!Lt!LtP!IXP!Lx!LxP#!OP#!SI[PI[#!Y#%_CjA^PA^PA^A^P#&lA^A^#)OA^#+vA^#.SA^A^#.r#1W#1W#1]#1f#1W#1qPP#1WPA^#2ZA^#6YA^A^6mPPP#:_PPP#:x#:xP#:xP#;`#:xPP#;fP#;]P#;]#;y#;]#<e#<k#<n)aP#<q)aP#<z#<z#<zP)aP)aP)aP)aPP)aP#=Q#=TP#=T)aP#=XP#=[P)aP)aP)aP)aP)aP)a)aPP#=b#=h#=s#=y#>P#>V#>]#>k#>q#>{#?R#?]#?c#?s#?y#@k#@}#AT#AZ#Ai#BO#Cs#DR#DY#Et#FS#Gt#HS#HY#H`#Hf#Hp#Hv#H|#IW#Ij#IpPPPPPPPPPPP#IvPPPPPPP#Jk#Mx$ b$ i$ qPPP$']P$'f$*_$0x$0{$1O$1}$2Q$2X$2aP$2g$2jP$3W$3[$4S$5b$5g$5}PP$6S$6Y$6^$6a$6e$6i$7e$7|$8e$8i$8l$8o$8y$8|$9Q$9UR!|RoqOXst!Z#d%m&r&t&u&w,s,x2[2_Y!vQ'`-e1o5{Q%tvQ%|yQ&T|Q&j!VS'W!e-]Q'f!iS'l!r!yU*k$|*Z*oQ+o%}S+|&V&WQ,d&dQ-c'_Q-m'gQ-u'mQ0[*qQ1b,OQ1y,eR<{<Y%SdOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+],p,s,x-i-q.P.V.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3l4z6T6e6f6i6|8t9T9_S#q]<V!r)_$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SU+P%]<s<tQ+t&PQ,f&gQ,m&oQ0x+gQ0}+iQ1Y+uQ2R,kQ3`.gQ5`0|Q5f1TQ6[1zQ7Y3dQ8`5gR9e7['QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S!S!nQ!r!v!y!z$|'W'_'`'l'm'n*k*o*q*r-]-c-e-u0[0_1o5{5}%[$ti#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^Q&X|Q'U!eS'[%i-`Q+t&PQ,P&WQ,f&gQ0n+SQ1Y+uQ1_+{Q2Q,jQ2R,kQ5f1TQ5o1aQ6[1zQ6_1|Q6`2PQ8`5gQ8c5lQ8|6bQ:X8dQ:f8yQ;V:YR<}*ZrnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_R,h&k&z^OPXYstuvwz!Z!`!g!j!o#S#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'b'r(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>R>S[#]WZ#W#Z'X(T!b%jm#h#i#l$x%e%h(^(h(i(j*Y*^*b+Z+[+^,o-V.T.Z.[.]._/m/p2d3[3]4a6r7TQ%wxQ%{yW&Q|&V&W,OQ&_!TQ'c!hQ'e!iQ(q#sS+n%|%}Q+r&PQ,_&bQ,c&dS-l'f'gQ.i(rQ1R+oQ1X+uQ1Z+vQ1^+zQ1t,`S1x,d,eQ2|-mQ5e1TQ5i1WQ5n1`Q6Z1yQ8_5gQ8b5kQ8f5pQ:T8^R;T:U!U$zi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y!^%yy!i!u%{%|%}'V'e'f'g'k'u*j+n+o-Y-l-m-t0R0U1R2u2|3T4r4s4v7}9{Q+h%wQ,T&[Q,W&]Q,b&dQ.h(qQ1s,_U1w,c,d,eQ3e.iQ6U1tS6Y1x1yQ8x6Z#f>T#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^o>U<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hW%Ti%V*y>PS&[!Q&iQ&]!RQ&^!SU*}%[%d=sR,R&Y%]%Si#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^T)z$u){V+P%]<s<tW'[!e%i*Z-`S(}#y#zQ+c%rQ+y&SS.b(m(nQ1j,XQ5T0kR8i5u'QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S$i$^c#Y#e%q%s%u(S(Y(t(y)R)S)T)U)V)W)X)Y)Z)[)^)`)b)g)q+d+x-Z-x-}.S.U.s.v.z.|.}/O/b0p2k2n3O3V3k3p3q3r3s3t3u3v3w3x3y3z3{3|4P4Q4X5X5c6u6{7Q7a7b7k7l8k9X9]9g9m9n:o;W;`<W=vT#TV#U'RkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ'Y!eR2q-]!W!nQ!e!r!v!y!z$|'W'_'`'l'm'n*Z*k*o*q*r-]-c-e-u0[0_1o5{5}R1l,ZnqOXst!Z#d%m&r&t&u&w,s,x2[2_Q&y!^Q'v!xS(s#u<^Q+l%zQ,]&_Q,^&aQ-j'dQ-w'oS.r(x=PS0q+X=ZQ1P+mQ1n,[Q2c,zQ2e,{Q2m-WQ2z-kQ2}-oS5Y0r=eQ5a1QS5d1S=fQ6t2oQ6x2{Q6}3SQ8]5bQ9Y6vQ9Z6yQ9^7OR:l9V$d$]c#Y#e%s%u(S(Y(t(y)R)S)T)U)V)W)X)Y)Z)[)^)`)b)g)q+d+x-Z-x-}.S.U.s.v.z.}/O/b0p2k2n3O3V3k3p3q3r3s3t3u3v3w3x3y3z3{3|4P4Q4X5X5c6u6{7Q7a7b7k7l8k9X9]9g9m9n:o;W;`<W=vS(o#p'iQ)P#zS+b%q.|S.c(n(pR3^.d'QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SS#q]<VQ&t!XQ&u!YQ&w![Q&x!]R2Z,vQ'a!hQ+e%wQ-h'cS.e(q+hQ2x-gW3b.h.i0w0yQ6w2yW7U3_3a3e5^U9a7V7X7ZU:q9c9d9fS;b:p:sQ;p;cR;x;qU!wQ'`-eT5y1o5{!Q_OXZ`st!V!Z#d#h%e%m&i&k&r&t&u&w(j,s,x.[2[2_]!pQ!r'`-e1o5{T#q]<V%^{OPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_S(}#y#zS.b(m(n!s=l$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SU$fd)_,mS(p#p'iU*v%R(w4OU0m+O.n7gQ5^0xQ7V3`Q9d7YR:s9em!tQ!r!v!y!z'`'l'm'n-e-u1o5{5}Q't!uS(f#g2US-s'k'wQ/s*]Q0R*jQ3U-vQ4f/tQ4r0TQ4s0UQ4x0^Q7r4`S7}4t4vS8R4y4{Q9r7sQ9v7yQ9{8OQ:Q8TS:{9w9xS;g:|;PS;s;h;iS;{;t;uS<P;|;}R<S<QQ#wbQ's!uS(e#g2US(g#m+WQ+Y%fQ+j%xQ+p&OU-r'k't'wQ.W(fU/r*]*`/wQ0S*jQ0V*lQ1O+kQ1u,aS3R-s-vQ3Z.`S4e/s/tQ4n0PS4q0R0^Q4u0WQ6W1vQ7P3US7q4`4bQ7u4fU7|4r4x4{Q8P4wQ8v6XS9q7r7sQ9u7yQ9}8RQ:O8SQ:c8wQ:y9rS:z9v9xQ;S:QQ;^:dS;f:{;PS;r;g;hS;z;s;uS<O;{;}Q<R<PQ<T<SQ=o=jQ={=tR=|=uV!wQ'`-e%^aOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_S#wz!j!r=i$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SR=o>R%^bOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_Q%fj!^%xy!i!u%{%|%}'V'e'f'g'k'u*j+n+o-Y-l-m-t0R0U1R2u2|3T4r4s4v7}9{S&Oz!jQ+k%yQ,a&dW1v,b,c,d,eU6X1w1x1yS8w6Y6ZQ:d8x!r=j$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ=t>QR=u>R%QeOPXYstuvw!Z!`!g!o#S#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_Y#bWZ#W#Z(T!b%jm#h#i#l$x%e%h(^(h(i(j*Y*^*b+Z+[+^,o-V.T.Z.[.]._/m/p2d3[3]4a6r7TQ,n&o!p=k$Z$n)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SR=n'XU']!e%i*ZR2s-`%SdOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+],p,s,x-i-q.P.V.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3l4z6T6e6f6i6|8t9T9_!r)_$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ,m&oQ0x+gQ3`.gQ7Y3dR9e7[!b$Tc#Y%q(S(Y(t(y)Z)[)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<W!P<d)^)q-Z.|2k2n3p3y3z4P4X6u7b7k7l8k9X9g9m9n;W;`=v!f$Vc#Y%q(S(Y(t(y)W)X)Z)[)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<W!T<f)^)q-Z.|2k2n3p3v3w3y3z4P4X6u7b7k7l8k9X9g9m9n;W;`=v!^$Zc#Y%q(S(Y(t(y)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<WQ4_/kz>S)^)q-Z.|2k2n3p4P4X6u7b7k7l8k9X9g9m9n;W;`=vQ>X>ZR>Y>['QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SS$oh$pR4U/U'XgOPWXYZhstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n$p%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/U/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>ST$kf$qQ$ifS)j$l)nR)v$qT$jf$qT)l$l)n'XhOPWXYZhstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n$p%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/U/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>ST$oh$pQ$rhR)u$p%^jOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_!s>Q$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S#glOPXZst!Z!`!o#S#d#o#{$n%m&k&n&o&r&t&u&w&{'T'b)O)s*i+]+g,p,s,x-i.g/V/n0]0l1r2S2T2V2X2[2_2a3d4T4z6T6e6f6i7[8t9T!U%Ri$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y#f(w#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^Q+T%aQ/c*Oo4O<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!U$yi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>YQ*c$zU*l$|*Z*oQ+U%bQ0W*m#f=q#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n=r<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hQ=w>TQ=x>UQ=y>VR=z>W!U%Ri$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y#f(w#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^o4O<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hnoOXst!Z#d%m&r&t&u&w,s,x2[2_S*f${*YQ-R'OQ-S'QR4i/y%[%Si#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^Q,U&]Q1h,WQ5s1gR8h5tV*n$|*Z*oU*n$|*Z*oT5z1o5{S0P*i/nQ4w0]T8S4z:]Q+j%xQ0V*lQ1O+kQ1u,aQ6W1vQ8v6XQ:c8wR;^:d!U%Oi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Yx*R$v)e*S*u+V/v0d0e4R4g5R5S5W7p8U:R:x=p=}>OS0`*t0a#f<o#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n<p<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!d=S(u)c*[*e.j.m.q/_/k/|0v1e3h4[4h4l5r7]7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[`=T3}7c7f7j9h:t:w;yS=_.l3iT=`7e9k!U%Qi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y|*T$v)e*U*t+V/g/v0d0e4R4g4|5R5S5W7p8U:R:x=p=}>OS0b*u0c#f<q#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n<r<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!h=U(u)c*[*e.k.l.q/_/k/|0v1e3f3h4[4h4l5r7]7^7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[d=V3}7d7e7j9h9i:t:u:w;yS=a.m3jT=b7f9lrnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_Q&f!UR,p&ornOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_R&f!UQ,Y&^R1d,RsnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_Q1p,_S6R1s1tU8p6P6Q6US:_8r8sS;Y:^:aQ;m;ZR;w;nQ&m!VR,i&iR6_1|R:f8yW&Q|&V&W,OR1Z+vQ&r!WR,s&sR,y&xT2],x2_R,}&yQ,|&yR2f,}Q'y!{R-y'ySsOtQ#dXT%ps#dQ#OTR'{#OQ#RUR'}#RQ){$uR/`){Q#UVR(Q#UQ#XWU(W#X(X.QQ(X#YR.Q(YQ-^'YR2r-^Q.u(yS3m.u3nR3n.vQ-e'`R2v-eY!rQ'`-e1o5{R'j!rQ/Q)eR4S/QU#_W%h*YU(_#_(`.RQ(`#`R.R(ZQ-a']R2t-at`OXst!V!Z#d%m&i&k&r&t&u&w,s,x2[2_S#hZ%eU#r`#h.[R.[(jQ(k#jQ.X(gW.a(k.X3X7RQ3X.YR7R3YQ)n$lR/W)nQ$phR)t$pQ$`cU)a$`-|<jQ-|<WR<j)qQ/q*]W4c/q4d7t9sU4d/r/s/tS7t4e4fR9s7u$e*Q$v(u)c)e*[*e*t*u+Q+R+V.l.m.o.p.q/_/g/i/k/v/|0d0e0v1e3f3g3h3}4R4[4g4h4l4|5O5R5S5W5r7]7^7_7`7e7f7h7i7j7p7w7z8U8X8Z9h9i9j9t9|:R:S:t:u:v:w:x:};R;e;j;v;y=p=}>O>Z>[Q/z*eU4k/z4m7xQ4m/|R7x4lS*o$|*ZR0Y*ox*S$v)e*t*u+V/v0d0e4R4g5R5S5W7p8U:R:x=p=}>O!d.j(u)c*[*e.l.m.q/_/k/|0v1e3h4[4h4l5r7]7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[U/h*S.j7ca7c3}7e7f7j9h:t:w;yQ0a*tQ3i.lU4}0a3i9kR9k7e|*U$v)e*t*u+V/g/v0d0e4R4g4|5R5S5W7p8U:R:x=p=}>O!h.k(u)c*[*e.l.m.q/_/k/|0v1e3f3h4[4h4l5r7]7^7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[U/j*U.k7de7d3}7e7f7j9h9i:t:u:w;yQ0c*uQ3j.mU5P0c3j9lR9l7fQ*z%UR0g*zQ5]0vR8Y5]Q+_%kR0u+_Q5v1jS8j5v:[R:[8kQ,[&_R1m,[Q5{1oR8m5{Q1{,fS6]1{8zR8z6_Q1U+rW5h1U5j8a:VQ5j1XQ8a5iR:V8bQ+w&QR1[+wQ2_,xR6m2_YrOXst#dQ&v!ZQ+a%mQ,r&rQ,t&tQ,u&uQ,w&wQ2Y,sS2],x2_R6l2[Q%opQ&z!_Q&}!aQ'P!bQ'R!cQ'q!uQ+`%lQ+l%zQ,Q&XQ,h&mQ-P&|W-p'k's't'wQ-w'oQ0X*nQ1P+mQ1c,PS2O,i,lQ2g-OQ2h-RQ2i-SQ2}-oW3P-r-s-v-xQ5a1QQ5m1_Q5q1eQ6V1uQ6a2QQ6k2ZU6z3O3R3UQ6}3SQ8]5bQ8e5oQ8g5rQ8l5zQ8u6WQ8{6`S9[6{7PQ9^7OQ:W8cQ:b8vQ:g8|Q:n9]Q;U:XQ;]:cQ;a:oQ;l;VR;o;^Q%zyQ'd!iQ'o!uU+m%{%|%}Q-W'VU-k'e'f'gS-o'k'uQ0Q*jS1Q+n+oQ2o-YS2{-l-mQ3S-tS4p0R0UQ5b1RQ6v2uQ6y2|Q7O3TU7{4r4s4vQ9z7}R;O9{S$wi>PR*{%VU%Ui%V>PR0f*yQ$viS(u#v+iS)c$b$cQ)e$dQ*[$xS*e${*YQ*t%OQ*u%QQ+Q%^Q+R%_Q+V%cQ.l<oQ.m<qQ.o<uQ.p<wQ.q<yQ/_)yQ/g*RQ/i*TQ/k*VQ/v*aS/|*g/mQ0d*wQ0e*xl0v+f,V.f1i1q3c6S7W8q9b:`:r;[;dQ1e,SQ3f=SQ3g=UQ3h=XS3}<l<mQ4R/PS4[/d4^Q4g/xQ4h/yQ4l/{Q4|0`Q5O0bQ5R0iQ5S0jQ5W0oQ5r1fQ7]=]Q7^=_Q7_=aQ7`=cQ7e<pQ7f<rQ7h<vQ7i<xQ7j<zQ7p4_Q7w4jQ7z4oQ8U5QQ8X5[Q8Z5_Q9h=YQ9i=TQ9j=VQ9t7vQ9|8QQ:R8VQ:S8[Q:t=^Q:u=`Q:v=bQ:w=dQ:x9pQ:}9yQ;R:PQ;e=gQ;j;QQ;v;kQ;y=hQ=p>PQ=}>XQ>O>YQ>Z>]R>[>^Q+O%]Q.n<sR7g<tnpOXst!Z#d%m&r&t&u&w,s,x2[2_Q!fPS#fZ#oQ&|!`W'h!o*i0]4zQ(P#SQ)Q#{Q)r$nS,l&k&nQ,q&oQ-O&{S-T'T/nQ-g'bQ.x)OQ/[)sQ0s+]Q0y+gQ2W,pQ2y-iQ3a.gQ4W/VQ5U0lQ6Q1rQ6c2SQ6d2TQ6h2VQ6j2XQ6o2aQ7Z3dQ7m4TQ8s6TQ9P6eQ9Q6fQ9S6iQ9f7[Q:a8tR:k9T#[cOPXZst!Z!`!o#d#o#{%m&k&n&o&r&t&u&w&{'T'b)O*i+]+g,p,s,x-i.g/n0]0l1r2S2T2V2X2[2_2a3d4z6T6e6f6i7[8t9TQ#YWQ#eYQ%quQ%svS%uw!gS(S#W(VQ(Y#ZQ(t#uQ(y#xQ)R$OQ)S$PQ)T$QQ)U$RQ)V$SQ)W$TQ)X$UQ)Y$VQ)Z$WQ)[$XQ)^$ZQ)`$_Q)b$aQ)g$eW)q$n)s/V4TQ+d%tQ+x&RS-Z'X2pQ-x'rS-}(T.PQ.S(]Q.U(dQ.s(xQ.v(zQ.z<UQ.|<XQ.}<YQ/O<]Q/b)}Q0p+XQ2k-UQ2n-XQ3O-qQ3V.VQ3k.tQ3p<^Q3q<_Q3r<`Q3s<aQ3t<bQ3u<cQ3v<dQ3w<eQ3x<fQ3y<gQ3z<hQ3{.{Q3|<kQ4P<nQ4Q<{Q4X<iQ5X0rQ5c1SQ6u=OQ6{3QQ7Q3WQ7a3lQ7b=PQ7k=RQ7l=ZQ8k5wQ9X6sQ9]6|Q9g=[Q9m=eQ9n=fQ:o9_Q;W:ZQ;`:mQ<W#SR=v>SR#[WR'Z!el!tQ!r!v!y!z'`'l'm'n-e-u1o5{5}S'V!e-]U*j$|*Z*oS-Y'W'_S0U*k*qQ0^*rQ2u-cQ4v0[R4{0_R({#xQ!fQT-d'`-e]!qQ!r'`-e1o5{Q#p]R'i<VR)f$dY!uQ'`-e1o5{Q'k!rS'u!v!yS'w!z5}S-t'l'mQ-v'nR3T-uT#kZ%eS#jZ%eS%km,oU(g#h#i#lS.Y(h(iQ.^(jQ0t+^Q3Y.ZU3Z.[.]._S7S3[3]R9`7Td#^W#W#Z%h(T(^*Y+Z.T/mr#gZm#h#i#l%e(h(i(j+^.Z.[.]._3[3]7TS*]$x*bQ/t*^Q2U,oQ2l-VQ4`/pQ6q2dQ7s4aQ9W6rT=m'X+[V#aW%h*YU#`W%h*YS(U#W(^U(Z#Z+Z/mS-['X+[T.O(T.TV'^!e%i*ZQ$lfR)x$qT)m$l)nR4V/UT*_$x*bT*h${*YQ0w+fQ1g,VQ3_.fQ5t1iQ6P1qQ7X3cQ8r6SQ9c7WQ:^8qQ:p9bQ;Z:`Q;c:rQ;n;[R;q;dnqOXst!Z#d%m&r&t&u&w,s,x2[2_Q&l!VR,h&itmOXst!U!V!Z#d%m&i&r&t&u&w,s,x2[2_R,o&oT%lm,oR1k,XR,g&gQ&U|S+}&V&WR1^,OR+s&PT&p!W&sT&q!W&sT2^,x2_",
      nodeNames: "\u26A0 ArithOp ArithOp ?. JSXStartTag LineComment BlockComment Script Hashbang ExportDeclaration export Star as VariableName String Escape from ; default FunctionDeclaration async function VariableDefinition > < TypeParamList in out const TypeDefinition extends ThisType this LiteralType ArithOp Number BooleanLiteral TemplateType InterpolationEnd Interpolation InterpolationStart NullType null VoidType void TypeofType typeof MemberExpression . PropertyName [ TemplateString Escape Interpolation super RegExp ] ArrayExpression Spread , } { ObjectExpression Property async get set PropertyDefinition Block : NewTarget new NewExpression ) ( ArgList UnaryExpression delete LogicOp BitOp YieldExpression yield AwaitExpression await ParenthesizedExpression ClassExpression class ClassBody MethodDeclaration Decorator @ MemberExpression PrivatePropertyName CallExpression TypeArgList CompareOp < declare Privacy static abstract override PrivatePropertyDefinition PropertyDeclaration readonly accessor Optional TypeAnnotation Equals StaticBlock FunctionExpression ArrowFunction ParamList ParamList ArrayPattern ObjectPattern PatternProperty Privacy readonly Arrow MemberExpression BinaryExpression ArithOp ArithOp ArithOp ArithOp BitOp CompareOp instanceof satisfies CompareOp BitOp BitOp BitOp LogicOp LogicOp ConditionalExpression LogicOp LogicOp AssignmentExpression UpdateOp PostfixExpression CallExpression InstantiationExpression TaggedTemplateExpression DynamicImport import ImportMeta JSXElement JSXSelfCloseEndTag JSXSelfClosingTag JSXIdentifier JSXBuiltin JSXIdentifier JSXNamespacedName JSXMemberExpression JSXSpreadAttribute JSXAttribute JSXAttributeValue JSXEscape JSXEndTag JSXOpenTag JSXFragmentTag JSXText JSXEscape JSXStartCloseTag JSXCloseTag PrefixCast < ArrowFunction TypeParamList SequenceExpression InstantiationExpression KeyofType keyof UniqueType unique ImportType InferredType infer TypeName ParenthesizedType FunctionSignature ParamList NewSignature IndexedType TupleType Label ArrayType ReadonlyType ObjectType MethodType PropertyType IndexSignature PropertyDefinition CallSignature TypePredicate asserts is NewSignature new UnionType LogicOp IntersectionType LogicOp ConditionalType ParameterizedType ClassDeclaration abstract implements type VariableDeclaration let var using TypeAliasDeclaration InterfaceDeclaration interface EnumDeclaration enum EnumBody NamespaceDeclaration namespace module AmbientDeclaration declare GlobalDeclaration global ClassDeclaration ClassBody AmbientFunctionDeclaration ExportGroup VariableName VariableName ImportDeclaration defer ImportGroup ForStatement for ForSpec ForInSpec ForOfSpec of WhileStatement while WithStatement with DoStatement do IfStatement if else SwitchStatement switch SwitchBody CaseLabel case DefaultLabel TryStatement try CatchClause catch FinallyClause finally ReturnStatement return ThrowStatement throw BreakStatement break ContinueStatement continue DebuggerStatement debugger LabeledStatement ExpressionStatement SingleExpression SingleClassItem",
      maxTerm: 380,
      context: ci,
      nodeProps: [["isolate", -8, 5, 6, 14, 37, 39, 51, 53, 55, ""], ["group", -26, 9, 17, 19, 68, 207, 211, 215, 216, 218, 221, 224, 234, 237, 243, 245, 247, 249, 252, 258, 264, 266, 268, 270, 272, 274, 275, "Statement", -34, 13, 14, 32, 35, 36, 42, 51, 54, 55, 57, 62, 70, 72, 76, 80, 82, 84, 85, 110, 111, 120, 121, 136, 139, 141, 142, 143, 144, 145, 147, 148, 167, 169, 171, "Expression", -23, 31, 33, 37, 41, 43, 45, 173, 175, 177, 178, 180, 181, 182, 184, 185, 186, 188, 189, 190, 201, 203, 205, 206, "Type", -3, 88, 103, 109, "ClassItem"], ["openedBy", 23, "<", 38, "InterpolationStart", 56, "[", 60, "{", 73, "(", 160, "JSXStartCloseTag"], ["closedBy", -2, 24, 168, ">", 40, "InterpolationEnd", 50, "]", 61, "}", 74, ")", 165, "JSXEndTag"]],
      propSources: [mi],
      skippedNodes: [0, 5, 6, 278],
      repeatNodeCount: 37,
      tokenData: "$Fq07[R!bOX%ZXY+gYZ-yZ[+g[]%Z]^.c^p%Zpq+gqr/mrs3cst:_tuEruvJSvwLkwx! Yxy!'iyz!(sz{!)}{|!,q|}!.O}!O!,q!O!P!/Y!P!Q!9j!Q!R#:O!R![#<_![!]#I_!]!^#Jk!^!_#Ku!_!`$![!`!a$$v!a!b$*T!b!c$,r!c!}Er!}#O$-|#O#P$/W#P#Q$4o#Q#R$5y#R#SEr#S#T$7W#T#o$8b#o#p$<r#p#q$=h#q#r$>x#r#s$@U#s$f%Z$f$g+g$g#BYEr#BY#BZ$A`#BZ$ISEr$IS$I_$A`$I_$I|Er$I|$I}$Dk$I}$JO$Dk$JO$JTEr$JT$JU$A`$JU$KVEr$KV$KW$A`$KW&FUEr&FU&FV$A`&FV;'SEr;'S;=`I|<%l?HTEr?HT?HU$A`?HUOEr(n%d_$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&j&hT$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c&j&zP;=`<%l&c'|'U]$i&j(Z!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!b(SU(Z!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}!b(iP;=`<%l'}'|(oP;=`<%l&}'[(y]$i&j(WpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(rp)wU(WpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)rp*^P;=`<%l)r'[*dP;=`<%l(r#S*nX(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g#S+^P;=`<%l*g(n+dP;=`<%l%Z07[+rq$i&j(Wp(Z!b'|0/lOX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p$f%Z$f$g+g$g#BY%Z#BY#BZ+g#BZ$IS%Z$IS$I_+g$I_$JT%Z$JT$JU+g$JU$KV%Z$KV$KW+g$KW&FU%Z&FU&FV+g&FV;'S%Z;'S;=`+a<%l?HT%Z?HT?HU+g?HUO%Z07[.ST(X#S$i&j'}0/lO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c07[.n_$i&j(Wp(Z!b'}0/lOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z)3p/x`$i&j!p),Q(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW1V`#v(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`2X!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW2d_#v(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'At3l_(V':f$i&j(Z!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k(^4r_$i&j(Z!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k&z5vX$i&jOr5qrs6cs!^5q!^!_6y!_#o5q#o#p6y#p;'S5q;'S;=`7h<%lO5q&z6jT$d`$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c`6|TOr6yrs7]s;'S6y;'S;=`7b<%lO6y`7bO$d``7eP;=`<%l6y&z7kP;=`<%l5q(^7w]$d`$i&j(Z!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!r8uZ(Z!bOY8pYZ6yZr8prs9hsw8pwx6yx#O8p#O#P6y#P;'S8p;'S;=`:R<%lO8p!r9oU$d`(Z!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}!r:UP;=`<%l8p(^:[P;=`<%l4k%9[:hh$i&j(Wp(Z!bOY%ZYZ&cZq%Zqr<Srs&}st%ZtuCruw%Zwx(rx!^%Z!^!_*g!_!c%Z!c!}Cr!}#O%Z#O#P&c#P#R%Z#R#SCr#S#T%Z#T#oCr#o#p*g#p$g%Z$g;'SCr;'S;=`El<%lOCr(r<__WS$i&j(Wp(Z!bOY<SYZ&cZr<Srs=^sw<Swx@nx!^<S!^!_Bm!_#O<S#O#P>`#P#o<S#o#pBm#p;'S<S;'S;=`Cl<%lO<S(Q=g]WS$i&j(Z!bOY=^YZ&cZw=^wx>`x!^=^!^!_?q!_#O=^#O#P>`#P#o=^#o#p?q#p;'S=^;'S;=`@h<%lO=^&n>gXWS$i&jOY>`YZ&cZ!^>`!^!_?S!_#o>`#o#p?S#p;'S>`;'S;=`?k<%lO>`S?XSWSOY?SZ;'S?S;'S;=`?e<%lO?SS?hP;=`<%l?S&n?nP;=`<%l>`!f?xWWS(Z!bOY?qZw?qwx?Sx#O?q#O#P?S#P;'S?q;'S;=`@b<%lO?q!f@eP;=`<%l?q(Q@kP;=`<%l=^'`@w]WS$i&j(WpOY@nYZ&cZr@nrs>`s!^@n!^!_Ap!_#O@n#O#P>`#P#o@n#o#pAp#p;'S@n;'S;=`Bg<%lO@ntAwWWS(WpOYApZrAprs?Ss#OAp#O#P?S#P;'SAp;'S;=`Ba<%lOAptBdP;=`<%lAp'`BjP;=`<%l@n#WBvYWS(Wp(Z!bOYBmZrBmrs?qswBmwxApx#OBm#O#P?S#P;'SBm;'S;=`Cf<%lOBm#WCiP;=`<%lBm(rCoP;=`<%l<S%9[C}i$i&j(o%1l(Wp(Z!bOY%ZYZ&cZr%Zrs&}st%ZtuCruw%Zwx(rx!Q%Z!Q![Cr![!^%Z!^!_*g!_!c%Z!c!}Cr!}#O%Z#O#P&c#P#R%Z#R#SCr#S#T%Z#T#oCr#o#p*g#p$g%Z$g;'SCr;'S;=`El<%lOCr%9[EoP;=`<%lCr07[FRk$i&j(Wp(Z!b$]#t(T,2j(e$I[OY%ZYZ&cZr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$g%Z$g;'SEr;'S;=`I|<%lOEr+dHRk$i&j(Wp(Z!b$]#tOY%ZYZ&cZr%Zrs&}st%ZtuGvuw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Gv![!^%Z!^!_*g!_!c%Z!c!}Gv!}#O%Z#O#P&c#P#R%Z#R#SGv#S#T%Z#T#oGv#o#p*g#p$g%Z$g;'SGv;'S;=`Iv<%lOGv+dIyP;=`<%lGv07[JPP;=`<%lEr(KWJ_`$i&j(Wp(Z!b#p(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KWKl_$i&j$Q(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z,#xLva(z+JY$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sv%ZvwM{wx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KWNW`$i&j#z(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'At! c_(Y';W$i&j(WpOY!!bYZ!#hZr!!brs!#hsw!!bwx!$xx!^!!b!^!_!%z!_#O!!b#O#P!#h#P#o!!b#o#p!%z#p;'S!!b;'S;=`!'c<%lO!!b'l!!i_$i&j(WpOY!!bYZ!#hZr!!brs!#hsw!!bwx!$xx!^!!b!^!_!%z!_#O!!b#O#P!#h#P#o!!b#o#p!%z#p;'S!!b;'S;=`!'c<%lO!!b&z!#mX$i&jOw!#hwx6cx!^!#h!^!_!$Y!_#o!#h#o#p!$Y#p;'S!#h;'S;=`!$r<%lO!#h`!$]TOw!$Ywx7]x;'S!$Y;'S;=`!$l<%lO!$Y`!$oP;=`<%l!$Y&z!$uP;=`<%l!#h'l!%R]$d`$i&j(WpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(r!Q!&PZ(WpOY!%zYZ!$YZr!%zrs!$Ysw!%zwx!&rx#O!%z#O#P!$Y#P;'S!%z;'S;=`!']<%lO!%z!Q!&yU$d`(WpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)r!Q!'`P;=`<%l!%z'l!'fP;=`<%l!!b/5|!'t_!l/.^$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#&U!)O_!k!Lf$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z-!n!*[b$i&j(Wp(Z!b(U%&f#q(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rxz%Zz{!+d{!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW!+o`$i&j(Wp(Z!b#n(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z+;x!,|`$i&j(Wp(Z!br+4YOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z,$U!.Z_!]+Jf$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[!/ec$i&j(Wp(Z!b!Q.2^OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!0p!P!Q%Z!Q![!3Y![!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#%|!0ya$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!2O!P!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#%|!2Z_![!L^$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!3eg$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!3Y![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S!3Y#S#X%Z#X#Y!4|#Y#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!5Vg$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx{%Z{|!6n|}%Z}!O!6n!O!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!6wc$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!8_c$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[!9uf$i&j(Wp(Z!b#o(ChOY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcxz!;Zz{#-}{!P!;Z!P!Q#/d!Q!^!;Z!^!_#(i!_!`#7S!`!a#8i!a!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z?O!;fb$i&j(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z>^!<w`$i&j(Z!b!X7`OY!<nYZ&cZw!<nwx!=yx!P!<n!P!Q!Eq!Q!^!<n!^!_!Gr!_!}!<n!}#O!KS#O#P!Dy#P#o!<n#o#p!Gr#p;'S!<n;'S;=`!L]<%lO!<n<z!>Q^$i&j!X7`OY!=yYZ&cZ!P!=y!P!Q!>|!Q!^!=y!^!_!@c!_!}!=y!}#O!CW#O#P!Dy#P#o!=y#o#p!@c#p;'S!=y;'S;=`!Ek<%lO!=y<z!?Td$i&j!X7`O!^&c!_#W&c#W#X!>|#X#Z&c#Z#[!>|#[#]&c#]#^!>|#^#a&c#a#b!>|#b#g&c#g#h!>|#h#i&c#i#j!>|#j#k!>|#k#m&c#m#n!>|#n#o&c#p;'S&c;'S;=`&w<%lO&c7`!@hX!X7`OY!@cZ!P!@c!P!Q!AT!Q!}!@c!}#O!Ar#O#P!Bq#P;'S!@c;'S;=`!CQ<%lO!@c7`!AYW!X7`#W#X!AT#Z#[!AT#]#^!AT#a#b!AT#g#h!AT#i#j!AT#j#k!AT#m#n!AT7`!AuVOY!ArZ#O!Ar#O#P!B[#P#Q!@c#Q;'S!Ar;'S;=`!Bk<%lO!Ar7`!B_SOY!ArZ;'S!Ar;'S;=`!Bk<%lO!Ar7`!BnP;=`<%l!Ar7`!BtSOY!@cZ;'S!@c;'S;=`!CQ<%lO!@c7`!CTP;=`<%l!@c<z!C][$i&jOY!CWYZ&cZ!^!CW!^!_!Ar!_#O!CW#O#P!DR#P#Q!=y#Q#o!CW#o#p!Ar#p;'S!CW;'S;=`!Ds<%lO!CW<z!DWX$i&jOY!CWYZ&cZ!^!CW!^!_!Ar!_#o!CW#o#p!Ar#p;'S!CW;'S;=`!Ds<%lO!CW<z!DvP;=`<%l!CW<z!EOX$i&jOY!=yYZ&cZ!^!=y!^!_!@c!_#o!=y#o#p!@c#p;'S!=y;'S;=`!Ek<%lO!=y<z!EnP;=`<%l!=y>^!Ezl$i&j(Z!b!X7`OY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#W&}#W#X!Eq#X#Z&}#Z#[!Eq#[#]&}#]#^!Eq#^#a&}#a#b!Eq#b#g&}#g#h!Eq#h#i&}#i#j!Eq#j#k!Eq#k#m&}#m#n!Eq#n#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}8r!GyZ(Z!b!X7`OY!GrZw!Grwx!@cx!P!Gr!P!Q!Hl!Q!}!Gr!}#O!JU#O#P!Bq#P;'S!Gr;'S;=`!J|<%lO!Gr8r!Hse(Z!b!X7`OY'}Zw'}x#O'}#P#W'}#W#X!Hl#X#Z'}#Z#[!Hl#[#]'}#]#^!Hl#^#a'}#a#b!Hl#b#g'}#g#h!Hl#h#i'}#i#j!Hl#j#k!Hl#k#m'}#m#n!Hl#n;'S'};'S;=`(f<%lO'}8r!JZX(Z!bOY!JUZw!JUwx!Arx#O!JU#O#P!B[#P#Q!Gr#Q;'S!JU;'S;=`!Jv<%lO!JU8r!JyP;=`<%l!JU8r!KPP;=`<%l!Gr>^!KZ^$i&j(Z!bOY!KSYZ&cZw!KSwx!CWx!^!KS!^!_!JU!_#O!KS#O#P!DR#P#Q!<n#Q#o!KS#o#p!JU#p;'S!KS;'S;=`!LV<%lO!KS>^!LYP;=`<%l!KS>^!L`P;=`<%l!<n=l!Ll`$i&j(Wp!X7`OY!LcYZ&cZr!Lcrs!=ys!P!Lc!P!Q!Mn!Q!^!Lc!^!_# o!_!}!Lc!}#O#%P#O#P!Dy#P#o!Lc#o#p# o#p;'S!Lc;'S;=`#&Y<%lO!Lc=l!Mwl$i&j(Wp!X7`OY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#W(r#W#X!Mn#X#Z(r#Z#[!Mn#[#](r#]#^!Mn#^#a(r#a#b!Mn#b#g(r#g#h!Mn#h#i(r#i#j!Mn#j#k!Mn#k#m(r#m#n!Mn#n#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(r8Q# vZ(Wp!X7`OY# oZr# ors!@cs!P# o!P!Q#!i!Q!}# o!}#O#$R#O#P!Bq#P;'S# o;'S;=`#$y<%lO# o8Q#!pe(Wp!X7`OY)rZr)rs#O)r#P#W)r#W#X#!i#X#Z)r#Z#[#!i#[#])r#]#^#!i#^#a)r#a#b#!i#b#g)r#g#h#!i#h#i)r#i#j#!i#j#k#!i#k#m)r#m#n#!i#n;'S)r;'S;=`*Z<%lO)r8Q#$WX(WpOY#$RZr#$Rrs!Ars#O#$R#O#P!B[#P#Q# o#Q;'S#$R;'S;=`#$s<%lO#$R8Q#$vP;=`<%l#$R8Q#$|P;=`<%l# o=l#%W^$i&j(WpOY#%PYZ&cZr#%Prs!CWs!^#%P!^!_#$R!_#O#%P#O#P!DR#P#Q!Lc#Q#o#%P#o#p#$R#p;'S#%P;'S;=`#&S<%lO#%P=l#&VP;=`<%l#%P=l#&]P;=`<%l!Lc?O#&kn$i&j(Wp(Z!b!X7`OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#W%Z#W#X#&`#X#Z%Z#Z#[#&`#[#]%Z#]#^#&`#^#a%Z#a#b#&`#b#g%Z#g#h#&`#h#i%Z#i#j#&`#j#k#&`#k#m%Z#m#n#&`#n#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z9d#(r](Wp(Z!b!X7`OY#(iZr#(irs!Grsw#(iwx# ox!P#(i!P!Q#)k!Q!}#(i!}#O#+`#O#P!Bq#P;'S#(i;'S;=`#,`<%lO#(i9d#)th(Wp(Z!b!X7`OY*gZr*grs'}sw*gwx)rx#O*g#P#W*g#W#X#)k#X#Z*g#Z#[#)k#[#]*g#]#^#)k#^#a*g#a#b#)k#b#g*g#g#h#)k#h#i*g#i#j#)k#j#k#)k#k#m*g#m#n#)k#n;'S*g;'S;=`+Z<%lO*g9d#+gZ(Wp(Z!bOY#+`Zr#+`rs!JUsw#+`wx#$Rx#O#+`#O#P!B[#P#Q#(i#Q;'S#+`;'S;=`#,Y<%lO#+`9d#,]P;=`<%l#+`9d#,cP;=`<%l#(i?O#,o`$i&j(Wp(Z!bOY#,fYZ&cZr#,frs!KSsw#,fwx#%Px!^#,f!^!_#+`!_#O#,f#O#P!DR#P#Q!;Z#Q#o#,f#o#p#+`#p;'S#,f;'S;=`#-q<%lO#,f?O#-tP;=`<%l#,f?O#-zP;=`<%l!;Z07[#.[b$i&j(Wp(Z!b(O0/l!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z07[#/o_$i&j(Wp(Z!bT0/lOY#/dYZ&cZr#/drs#0nsw#/dwx#4Ox!^#/d!^!_#5}!_#O#/d#O#P#1p#P#o#/d#o#p#5}#p;'S#/d;'S;=`#6|<%lO#/d06j#0w]$i&j(Z!bT0/lOY#0nYZ&cZw#0nwx#1px!^#0n!^!_#3R!_#O#0n#O#P#1p#P#o#0n#o#p#3R#p;'S#0n;'S;=`#3x<%lO#0n05W#1wX$i&jT0/lOY#1pYZ&cZ!^#1p!^!_#2d!_#o#1p#o#p#2d#p;'S#1p;'S;=`#2{<%lO#1p0/l#2iST0/lOY#2dZ;'S#2d;'S;=`#2u<%lO#2d0/l#2xP;=`<%l#2d05W#3OP;=`<%l#1p01O#3YW(Z!bT0/lOY#3RZw#3Rwx#2dx#O#3R#O#P#2d#P;'S#3R;'S;=`#3r<%lO#3R01O#3uP;=`<%l#3R06j#3{P;=`<%l#0n05x#4X]$i&j(WpT0/lOY#4OYZ&cZr#4Ors#1ps!^#4O!^!_#5Q!_#O#4O#O#P#1p#P#o#4O#o#p#5Q#p;'S#4O;'S;=`#5w<%lO#4O00^#5XW(WpT0/lOY#5QZr#5Qrs#2ds#O#5Q#O#P#2d#P;'S#5Q;'S;=`#5q<%lO#5Q00^#5tP;=`<%l#5Q05x#5zP;=`<%l#4O01p#6WY(Wp(Z!bT0/lOY#5}Zr#5}rs#3Rsw#5}wx#5Qx#O#5}#O#P#2d#P;'S#5};'S;=`#6v<%lO#5}01p#6yP;=`<%l#5}07[#7PP;=`<%l#/d)3h#7ab$i&j$Q(Ch(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;ZAt#8vb$Z#t$i&j(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z'Ad#:Zp$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!3Y!P!Q%Z!Q![#<_![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S#<_#S#U%Z#U#V#?i#V#X%Z#X#Y!4|#Y#b%Z#b#c#>_#c#d#Bq#d#l%Z#l#m#Es#m#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#<jk$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!3Y!P!Q%Z!Q![#<_![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S#<_#S#X%Z#X#Y!4|#Y#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#>j_$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#?rd$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#AQ!R!S#AQ!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#AQ#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#A]f$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#AQ!R!S#AQ!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#AQ#S#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Bzc$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#DV!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#DV#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Dbe$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#DV!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#DV#S#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#E|g$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#Ge![!^%Z!^!_*g!_!c%Z!c!i#Ge!i#O%Z#O#P&c#P#R%Z#R#S#Ge#S#T%Z#T#Z#Ge#Z#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Gpi$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#Ge![!^%Z!^!_*g!_!c%Z!c!i#Ge!i#O%Z#O#P&c#P#R%Z#R#S#Ge#S#T%Z#T#Z#Ge#Z#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z*)x#Il_!g$b$i&j$O)Lv(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z)[#Jv_al$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z04f#LS^h#)`#R-<U(Wp(Z!b$n7`OY*gZr*grs'}sw*gwx)rx!P*g!P!Q#MO!Q!^*g!^!_#Mt!_!`$ f!`#O*g#P;'S*g;'S;=`+Z<%lO*g(n#MXX$k&j(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g(El#M}Z#r(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx!_*g!_!`#Np!`#O*g#P;'S*g;'S;=`+Z<%lO*g(El#NyX$Q(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g(El$ oX#s(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g*)x$!ga#`*!Y$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`!a$#l!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(K[$#w_#k(Cl$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z*)x$%Vag!*r#s(Ch$f#|$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`$&[!`!a$'f!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$&g_#s(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$'qa#r(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`!a$(v!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$)R`#r(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(Kd$*`a(r(Ct$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!a%Z!a!b$+e!b#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$+p`$i&j#{(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#`$,}_!|$Ip$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z04f$.X_!S0,v$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(n$/]Z$i&jO!^$0O!^!_$0f!_#i$0O#i#j$0k#j#l$0O#l#m$2^#m#o$0O#o#p$0f#p;'S$0O;'S;=`$4i<%lO$0O(n$0VT_#S$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c#S$0kO_#S(n$0p[$i&jO!Q&c!Q![$1f![!^&c!_!c&c!c!i$1f!i#T&c#T#Z$1f#Z#o&c#o#p$3|#p;'S&c;'S;=`&w<%lO&c(n$1kZ$i&jO!Q&c!Q![$2^![!^&c!_!c&c!c!i$2^!i#T&c#T#Z$2^#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$2cZ$i&jO!Q&c!Q![$3U![!^&c!_!c&c!c!i$3U!i#T&c#T#Z$3U#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$3ZZ$i&jO!Q&c!Q![$0O![!^&c!_!c&c!c!i$0O!i#T&c#T#Z$0O#Z#o&c#p;'S&c;'S;=`&w<%lO&c#S$4PR!Q![$4Y!c!i$4Y#T#Z$4Y#S$4]S!Q![$4Y!c!i$4Y#T#Z$4Y#q#r$0f(n$4lP;=`<%l$0O#1[$4z_!Y#)l$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$6U`#x(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z+;p$7c_$i&j(Wp(Z!b(a+4QOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[$8qk$i&j(Wp(Z!b(T,2j$_#t(e$I[OY%ZYZ&cZr%Zrs&}st%Ztu$8buw%Zwx(rx}%Z}!O$:f!O!Q%Z!Q![$8b![!^%Z!^!_*g!_!c%Z!c!}$8b!}#O%Z#O#P&c#P#R%Z#R#S$8b#S#T%Z#T#o$8b#o#p*g#p$g%Z$g;'S$8b;'S;=`$<l<%lO$8b+d$:qk$i&j(Wp(Z!b$_#tOY%ZYZ&cZr%Zrs&}st%Ztu$:fuw%Zwx(rx}%Z}!O$:f!O!Q%Z!Q![$:f![!^%Z!^!_*g!_!c%Z!c!}$:f!}#O%Z#O#P&c#P#R%Z#R#S$:f#S#T%Z#T#o$:f#o#p*g#p$g%Z$g;'S$:f;'S;=`$<f<%lO$:f+d$<iP;=`<%l$:f07[$<oP;=`<%l$8b#Jf$<{X!_#Hb(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g,#x$=sa(y+JY$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p#q$+e#q;'S%Z;'S;=`+a<%lO%Z)>v$?V_!^(CdvBr$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z?O$@a_!q7`$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[$Aq|$i&j(Wp(Z!b'|0/l$]#t(T,2j(e$I[OX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$f%Z$f$g+g$g#BYEr#BY#BZ$A`#BZ$ISEr$IS$I_$A`$I_$JTEr$JT$JU$A`$JU$KVEr$KV$KW$A`$KW&FUEr&FU&FV$A`&FV;'SEr;'S;=`I|<%l?HTEr?HT?HU$A`?HUOEr07[$D|k$i&j(Wp(Z!b'}0/l$]#t(T,2j(e$I[OY%ZYZ&cZr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$g%Z$g;'SEr;'S;=`I|<%lOEr",
      tokenizers: [ui, di, $i, fi, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, pi, new R.LocalTokenGroup("$S~RRtu[#O#Pg#S#T#|~_P#o#pb~gOx~~jVO#i!P#i#j!U#j#l!P#l#m!q#m;'S!P;'S;=`#v<%lO!P~!UO!U~~!XS!Q![!e!c!i!e#T#Z!e#o#p#Z~!hR!Q![!q!c!i!q#T#Z!q~!tR!Q![!}!c!i!}#T#Z!}~#QR!Q![!P!c!i!P#T#Z!P~#^R!Q![#g!c!i#g#T#Z#g~#jS!Q![#g!c!i#g#T#Z#g#q#r!P~#yP;=`<%l!P~$RO(c~~", 141, 340), new R.LocalTokenGroup("j~RQYZXz{^~^O(Q~~aP!P!Qd~iO(R~~", 25, 323)],
      topRules: {
        Script: [0, 7],
        SingleExpression: [1, 276],
        SingleClassItem: [2, 277]
      },
      dialects: {
        jsx: 0,
        ts: 15175
      },
      dynamicPrecedences: {
        80: 1,
        82: 1,
        94: 1,
        169: 1,
        199: 1
      },
      specialized: [{
        term: 327,
        get: function get(O) {
          return hi[O] || -1;
        }
      }, {
        term: 343,
        get: function get(O) {
          return gi[O] || -1;
        }
      }, {
        term: 95,
        get: function get(O) {
          return Si[O] || -1;
        }
      }],
      tokenPrec: 15201
    });
  var k = require("@codemirror/language"),
    jt = require("@codemirror/state"),
    vt = require("@codemirror/view"),
    y = require("@codemirror/autocomplete"),
    gO = require("@lezer/common"),
    _t = [(0, y.snippetCompletion)("function ${name}(${params}) {\n	${}\n}", {
      label: "function",
      detail: "definition",
      type: "keyword"
    }), (0, y.snippetCompletion)("for (let ${index} = 0; ${index} < ${bound}; ${index}++) {\n	${}\n}", {
      label: "for",
      detail: "loop",
      type: "keyword"
    }), (0, y.snippetCompletion)("for (let ${name} of ${collection}) {\n	${}\n}", {
      label: "for",
      detail: "of loop",
      type: "keyword"
    }), (0, y.snippetCompletion)("do {\n	${}\n} while (${})", {
      label: "do",
      detail: "loop",
      type: "keyword"
    }), (0, y.snippetCompletion)("while (${}) {\n	${}\n}", {
      label: "while",
      detail: "loop",
      type: "keyword"
    }), (0, y.snippetCompletion)("try {\n\t${}\n} catch (${error}) {\n\t${}\n}", {
      label: "try",
      detail: "/ catch block",
      type: "keyword"
    }), (0, y.snippetCompletion)("if (${}) {\n	${}\n}", {
      label: "if",
      detail: "block",
      type: "keyword"
    }), (0, y.snippetCompletion)("if (${}) {\n\t${}\n} else {\n\t${}\n}", {
      label: "if",
      detail: "/ else block",
      type: "keyword"
    }), (0, y.snippetCompletion)("class ${name} {\n\tconstructor(${params}) {\n\t\t${}\n\t}\n}", {
      label: "class",
      detail: "definition",
      type: "keyword"
    }), (0, y.snippetCompletion)('import {${names}} from "${module}"\n${}', {
      label: "import",
      detail: "named",
      type: "keyword"
    }), (0, y.snippetCompletion)('import ${name} from "${module}"\n${}', {
      label: "import",
      detail: "default",
      type: "keyword"
    })],
    Pi = _t.concat([(0, y.snippetCompletion)("interface ${name} {\n	${}\n}", {
      label: "interface",
      detail: "definition",
      type: "keyword"
    }), (0, y.snippetCompletion)("type ${name} = ${type}", {
      label: "type",
      detail: "definition",
      type: "keyword"
    }), (0, y.snippetCompletion)("enum ${name} {\n	${}\n}", {
      label: "enum",
      detail: "definition",
      type: "keyword"
    })]),
    wt = new gO.NodeWeakMap(),
    Rt = new Set(["Script", "Block", "FunctionExpression", "FunctionDeclaration", "ArrowFunction", "MethodDeclaration", "ForStatement"]);
  function nO(O) {
    return function (e, t) {
      var a = e.node.getChild("VariableDefinition");
      return a && t(a, O), !0;
    };
  }
  var Zi = ["FunctionDeclaration"],
    Xi = {
      FunctionDeclaration: nO("function"),
      ClassDeclaration: nO("class"),
      ClassExpression: function ClassExpression() {
        return !0;
      },
      EnumDeclaration: nO("constant"),
      TypeAliasDeclaration: nO("type"),
      NamespaceDeclaration: nO("namespace"),
      VariableDefinition: function VariableDefinition(O, e) {
        O.matchContext(Zi) || e(O, "variable");
      },
      TypeDefinition: function TypeDefinition(O, e) {
        e(O, "type");
      },
      __proto__: null
    };
  function zt(O, e) {
    var t = wt.get(e);
    if (t) return t;
    var a = [],
      r = !0;
    function i(n, l) {
      var s = O.sliceString(n.from, n.to);
      a.push({
        label: s,
        type: l
      });
    }
    return e.cursor(gO.IterMode.IncludeAnonymous).iterate(function (n) {
      if (r) r = !1;else if (n.name) {
        var l = Xi[n.name];
        if (l && l(n, i) || Rt.has(n.name)) return !1;
      } else if (n.to - n.from > 8192) {
        for (var _iterator26 = _createForOfIteratorHelperLoose(zt(O, n.node)), _step26; !(_step26 = _iterator26()).done;) {
          var _l3 = _step26.value;
          a.push(_l3);
        }
        return !1;
      }
    }), wt.set(e, a), a;
  }
  var Tt = /^[\w$\xa1-\uffff][\w$\d\xa1-\uffff]*$/,
    qt = ["TemplateString", "String", "RegExp", "LineComment", "BlockComment", "VariableDefinition", "TypeDefinition", "Label", "PropertyDefinition", "PropertyName", "PrivatePropertyDefinition", "PrivatePropertyName", "JSXText", "JSXAttributeValue", "JSXOpenTag", "JSXCloseTag", "JSXSelfClosingTag", ".", "?."];
  function ki(O) {
    var e = (0, k.syntaxTree)(O.state).resolveInner(O.pos, -1);
    if (qt.indexOf(e.name) > -1) return null;
    var t = e.name == "VariableName" || e.to - e.from < 20 && Tt.test(O.state.sliceDoc(e.from, e.to));
    if (!t && !O.explicit) return null;
    var a = [];
    for (var r = e; r; r = r.parent) Rt.has(r.name) && (a = a.concat(zt(O.state.doc, r)));
    return {
      options: a,
      from: t ? e.from : O.pos,
      validFor: Tt
    };
  }
  var W = k.LRLanguage.define({
      name: "javascript",
      parser: yt.configure({
        props: [k.indentNodeProp.add({
          IfStatement: (0, k.continuedIndent)({
            except: /^\s*({|else\b)/
          }),
          TryStatement: (0, k.continuedIndent)({
            except: /^\s*({|catch\b|finally\b)/
          }),
          LabeledStatement: k.flatIndent,
          SwitchBody: function SwitchBody(O) {
            var e = O.textAfter,
              t = /^\s*\}/.test(e),
              a = /^\s*(case|default)\b/.test(e);
            return O.baseIndent + (t ? 0 : a ? 1 : 2) * O.unit;
          },
          Block: (0, k.delimitedIndent)({
            closing: "}"
          }),
          ArrowFunction: function ArrowFunction(O) {
            return O.baseIndent + O.unit;
          },
          "TemplateString BlockComment": function TemplateString_BlockComment() {
            return null;
          },
          "Statement Property": (0, k.continuedIndent)({
            except: /^\s*{/
          }),
          JSXElement: function JSXElement(O) {
            var e = /^\s*<\//.test(O.textAfter);
            return O.lineIndent(O.node.from) + (e ? 0 : O.unit);
          },
          JSXEscape: function JSXEscape(O) {
            var e = /\s*\}/.test(O.textAfter);
            return O.lineIndent(O.node.from) + (e ? 0 : O.unit);
          },
          "JSXOpenTag JSXSelfClosingTag": function JSXOpenTag_JSXSelfClosingTag(O) {
            return O.column(O.node.from) + O.unit;
          }
        }), k.foldNodeProp.add({
          "Block ClassBody SwitchBody EnumBody ObjectExpression ArrayExpression ObjectType": k.foldInside,
          BlockComment: function BlockComment(O) {
            return {
              from: O.from + 2,
              to: O.to - 2
            };
          },
          JSXElement: function JSXElement(O) {
            var e = O.firstChild;
            if (!e || e.name == "JSXSelfClosingTag") return null;
            var t = O.lastChild;
            return {
              from: e.to,
              to: t.type.isError ? O.to : t.from
            };
          },
          "JSXSelfClosingTag JSXOpenTag": function JSXSelfClosingTag_JSXOpenTag(O) {
            var e;
            var t = (e = O.firstChild) === null || e === void 0 ? void 0 : e.nextSibling,
              a = O.lastChild;
            return !t || t.type.isError ? null : {
              from: t.to,
              to: a.type.isError ? O.to : a.from
            };
          }
        })]
      }),
      languageData: {
        closeBrackets: {
          brackets: ["(", "[", "{", "'", '"', "`"]
        },
        commentTokens: {
          line: "//",
          block: {
            open: "/*",
            close: "*/"
          }
        },
        indentOnInput: /^\s*(?:case |default:|\{|\}|<\/)$/,
        wordChars: "$"
      }
    }),
    Vt = {
      test: function test(O) {
        return /^JSX/.test(O.name);
      },
      facet: (0, k.defineLanguageFacet)({
        commentTokens: {
          block: {
            open: "{/*",
            close: "*/}"
          }
        }
      })
    },
    HO = W.configure({
      dialect: "ts"
    }, "typescript"),
    Oe = W.configure({
      dialect: "jsx",
      props: [k.sublanguageProp.add(function (O) {
        return O.isTop ? [Vt] : void 0;
      })]
    }),
    ee = W.configure({
      dialect: "jsx ts",
      props: [k.sublanguageProp.add(function (O) {
        return O.isTop ? [Vt] : void 0;
      })]
    }, "typescript"),
    Wt = function Wt(O) {
      return {
        label: O,
        type: "keyword"
      };
    },
    Gt = "break case const continue default delete export extends false finally in instanceof let new return static super switch this throw true typeof var yield".split(" ").map(Wt),
    bi = Gt.concat(["declare", "implements", "private", "protected", "public"].map(Wt));
  function Lt(O) {
    if (O === void 0) {
      O = {};
    }
    var e = O.jsx ? O.typescript ? ee : Oe : O.typescript ? HO : W,
      t = O.typescript ? Pi.concat(bi) : _t.concat(Gt);
    return new k.LanguageSupport(e, [W.data.of({
      autocomplete: (0, y.ifNotIn)(qt, (0, y.completeFromList)(t))
    }), W.data.of({
      autocomplete: ki
    }), O.jsx ? wi : []]);
  }
  function xi(O) {
    for (;;) {
      if (O.name == "JSXOpenTag" || O.name == "JSXSelfClosingTag" || O.name == "JSXFragmentTag") return O;
      if (O.name == "JSXEscape" || !O.parent) return null;
      O = O.parent;
    }
  }
  function Yt(O, e, t) {
    if (t === void 0) {
      t = O.length;
    }
    for (var a = e == null ? void 0 : e.firstChild; a; a = a.nextSibling) if (a.name == "JSXIdentifier" || a.name == "JSXBuiltin" || a.name == "JSXNamespacedName" || a.name == "JSXMemberExpression") return O.sliceString(a.from, Math.min(a.to, t));
    return "";
  }
  var yi = typeof navigator == "object" && /Android\b/.test(navigator.userAgent),
    wi = vt.EditorView.inputHandler.of(function (O, e, t, a, r) {
      if ((yi ? O.composing : O.compositionStarted) || O.state.readOnly || e != t || a != ">" && a != "/" || !W.isActiveAt(O.state, e, -1)) return !1;
      var i = r(),
        n = i.state,
        l = n.changeByRange(function (s) {
          var Q;
          var o = s.head,
            c = (0, k.syntaxTree)(n).resolveInner(o - 1, -1),
            p;
          if (c.name == "JSXStartTag" && (c = c.parent), !(n.doc.sliceString(o - 1, o) != a || c.name == "JSXAttributeValue" && c.to > o)) {
            if (a == ">" && c.name == "JSXFragmentTag") return {
              range: s,
              changes: {
                from: o,
                insert: "</>"
              }
            };
            if (a == "/" && c.name == "JSXStartCloseTag") {
              var $ = c.parent,
                h = $.parent;
              if (h && $.from == o - 2 && ((p = Yt(n.doc, h.firstChild, o)) || ((Q = h.firstChild) === null || Q === void 0 ? void 0 : Q.name) == "JSXFragmentTag")) {
                var m = p + ">";
                return {
                  range: jt.EditorSelection.cursor(o + m.length, -1),
                  changes: {
                    from: o,
                    insert: m
                  }
                };
              }
            } else if (a == ">") {
              var _$6 = xi(c);
              if (_$6 && _$6.name == "JSXOpenTag" && !/^\/?>|^<\//.test(n.doc.sliceString(o, o + 2)) && (p = Yt(n.doc, _$6, o))) return {
                range: s,
                changes: {
                  from: o,
                  insert: "</" + p + ">"
                }
              };
            }
          }
          return {
            range: s
          };
        });
      return l.changes.empty ? !1 : (O.dispatch([i, n.update(l, {
        userEvent: "input.complete",
        scrollIntoView: !0
      })]), !0);
    });
  var At = require("@codemirror/view"),
    Mt = require("@codemirror/state"),
    q = require("@codemirror/language"),
    lO = ["_blank", "_self", "_top", "_parent"],
    te = ["ascii", "utf-8", "utf-16", "latin1", "latin1"],
    ae = ["get", "post", "put", "delete"],
    re = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
    z = ["true", "false"],
    f = {},
    Ti = {
      a: {
        attrs: {
          href: null,
          ping: null,
          type: null,
          media: null,
          target: lO,
          hreflang: null
        }
      },
      abbr: f,
      address: f,
      area: {
        attrs: {
          alt: null,
          coords: null,
          href: null,
          target: null,
          ping: null,
          media: null,
          hreflang: null,
          type: null,
          shape: ["default", "rect", "circle", "poly"]
        }
      },
      article: f,
      aside: f,
      audio: {
        attrs: {
          src: null,
          mediagroup: null,
          crossorigin: ["anonymous", "use-credentials"],
          preload: ["none", "metadata", "auto"],
          autoplay: ["autoplay"],
          loop: ["loop"],
          controls: ["controls"]
        }
      },
      b: f,
      base: {
        attrs: {
          href: null,
          target: lO
        }
      },
      bdi: f,
      bdo: f,
      blockquote: {
        attrs: {
          cite: null
        }
      },
      body: f,
      br: f,
      button: {
        attrs: {
          form: null,
          formaction: null,
          name: null,
          value: null,
          autofocus: ["autofocus"],
          disabled: ["autofocus"],
          formenctype: re,
          formmethod: ae,
          formnovalidate: ["novalidate"],
          formtarget: lO,
          type: ["submit", "reset", "button"]
        }
      },
      canvas: {
        attrs: {
          width: null,
          height: null
        }
      },
      caption: f,
      center: f,
      cite: f,
      code: f,
      col: {
        attrs: {
          span: null
        }
      },
      colgroup: {
        attrs: {
          span: null
        }
      },
      command: {
        attrs: {
          type: ["command", "checkbox", "radio"],
          label: null,
          icon: null,
          radiogroup: null,
          command: null,
          title: null,
          disabled: ["disabled"],
          checked: ["checked"]
        }
      },
      data: {
        attrs: {
          value: null
        }
      },
      datagrid: {
        attrs: {
          disabled: ["disabled"],
          multiple: ["multiple"]
        }
      },
      datalist: {
        attrs: {
          data: null
        }
      },
      dd: f,
      del: {
        attrs: {
          cite: null,
          datetime: null
        }
      },
      details: {
        attrs: {
          open: ["open"]
        }
      },
      dfn: f,
      div: f,
      dl: f,
      dt: f,
      em: f,
      embed: {
        attrs: {
          src: null,
          type: null,
          width: null,
          height: null
        }
      },
      eventsource: {
        attrs: {
          src: null
        }
      },
      fieldset: {
        attrs: {
          disabled: ["disabled"],
          form: null,
          name: null
        }
      },
      figcaption: f,
      figure: f,
      footer: f,
      form: {
        attrs: {
          action: null,
          name: null,
          "accept-charset": te,
          autocomplete: ["on", "off"],
          enctype: re,
          method: ae,
          novalidate: ["novalidate"],
          target: lO
        }
      },
      h1: f,
      h2: f,
      h3: f,
      h4: f,
      h5: f,
      h6: f,
      head: {
        children: ["title", "base", "link", "style", "meta", "script", "noscript", "command"]
      },
      header: f,
      hgroup: f,
      hr: f,
      html: {
        attrs: {
          manifest: null
        }
      },
      i: f,
      iframe: {
        attrs: {
          src: null,
          srcdoc: null,
          name: null,
          width: null,
          height: null,
          sandbox: ["allow-top-navigation", "allow-same-origin", "allow-forms", "allow-scripts"],
          seamless: ["seamless"]
        }
      },
      img: {
        attrs: {
          alt: null,
          src: null,
          ismap: null,
          usemap: null,
          width: null,
          height: null,
          crossorigin: ["anonymous", "use-credentials"]
        }
      },
      input: {
        attrs: {
          alt: null,
          dirname: null,
          form: null,
          formaction: null,
          height: null,
          list: null,
          max: null,
          maxlength: null,
          min: null,
          name: null,
          pattern: null,
          placeholder: null,
          size: null,
          src: null,
          step: null,
          value: null,
          width: null,
          accept: ["audio/*", "video/*", "image/*"],
          autocomplete: ["on", "off"],
          autofocus: ["autofocus"],
          checked: ["checked"],
          disabled: ["disabled"],
          formenctype: re,
          formmethod: ae,
          formnovalidate: ["novalidate"],
          formtarget: lO,
          multiple: ["multiple"],
          readonly: ["readonly"],
          required: ["required"],
          type: ["hidden", "text", "search", "tel", "url", "email", "password", "datetime", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"]
        }
      },
      ins: {
        attrs: {
          cite: null,
          datetime: null
        }
      },
      kbd: f,
      keygen: {
        attrs: {
          challenge: null,
          form: null,
          name: null,
          autofocus: ["autofocus"],
          disabled: ["disabled"],
          keytype: ["RSA"]
        }
      },
      label: {
        attrs: {
          for: null,
          form: null
        }
      },
      legend: f,
      li: {
        attrs: {
          value: null
        }
      },
      link: {
        attrs: {
          href: null,
          type: null,
          hreflang: null,
          media: null,
          sizes: ["all", "16x16", "16x16 32x32", "16x16 32x32 64x64"]
        }
      },
      map: {
        attrs: {
          name: null
        }
      },
      mark: f,
      menu: {
        attrs: {
          label: null,
          type: ["list", "context", "toolbar"]
        }
      },
      meta: {
        attrs: {
          content: null,
          charset: te,
          name: ["viewport", "application-name", "author", "description", "generator", "keywords"],
          "http-equiv": ["content-language", "content-type", "default-style", "refresh"]
        }
      },
      meter: {
        attrs: {
          value: null,
          min: null,
          low: null,
          high: null,
          max: null,
          optimum: null
        }
      },
      nav: f,
      noscript: f,
      object: {
        attrs: {
          data: null,
          type: null,
          name: null,
          usemap: null,
          form: null,
          width: null,
          height: null,
          typemustmatch: ["typemustmatch"]
        }
      },
      ol: {
        attrs: {
          reversed: ["reversed"],
          start: null,
          type: ["1", "a", "A", "i", "I"]
        },
        children: ["li", "script", "template", "ul", "ol"]
      },
      optgroup: {
        attrs: {
          disabled: ["disabled"],
          label: null
        }
      },
      option: {
        attrs: {
          disabled: ["disabled"],
          label: null,
          selected: ["selected"],
          value: null
        }
      },
      output: {
        attrs: {
          for: null,
          form: null,
          name: null
        }
      },
      p: f,
      param: {
        attrs: {
          name: null,
          value: null
        }
      },
      pre: f,
      progress: {
        attrs: {
          value: null,
          max: null
        }
      },
      q: {
        attrs: {
          cite: null
        }
      },
      rp: f,
      rt: f,
      ruby: f,
      samp: f,
      script: {
        attrs: {
          type: ["text/javascript"],
          src: null,
          async: ["async"],
          defer: ["defer"],
          charset: te
        }
      },
      section: f,
      select: {
        attrs: {
          form: null,
          name: null,
          size: null,
          autofocus: ["autofocus"],
          disabled: ["disabled"],
          multiple: ["multiple"]
        }
      },
      slot: {
        attrs: {
          name: null
        }
      },
      small: f,
      source: {
        attrs: {
          src: null,
          type: null,
          media: null
        }
      },
      span: f,
      strong: f,
      style: {
        attrs: {
          type: ["text/css"],
          media: null,
          scoped: null
        }
      },
      sub: f,
      summary: f,
      sup: f,
      table: f,
      tbody: f,
      td: {
        attrs: {
          colspan: null,
          rowspan: null,
          headers: null
        }
      },
      template: f,
      textarea: {
        attrs: {
          dirname: null,
          form: null,
          maxlength: null,
          name: null,
          placeholder: null,
          rows: null,
          cols: null,
          autofocus: ["autofocus"],
          disabled: ["disabled"],
          readonly: ["readonly"],
          required: ["required"],
          wrap: ["soft", "hard"]
        }
      },
      tfoot: f,
      th: {
        attrs: {
          colspan: null,
          rowspan: null,
          headers: null,
          scope: ["row", "col", "rowgroup", "colgroup"]
        }
      },
      thead: f,
      time: {
        attrs: {
          datetime: null
        }
      },
      title: f,
      tr: f,
      track: {
        attrs: {
          src: null,
          label: null,
          default: null,
          kind: ["subtitles", "captions", "descriptions", "chapters", "metadata"],
          srclang: null
        }
      },
      ul: {
        children: ["li", "script", "template", "ul", "ol"]
      },
      var: f,
      video: {
        attrs: {
          src: null,
          poster: null,
          width: null,
          height: null,
          crossorigin: ["anonymous", "use-credentials"],
          preload: ["auto", "metadata", "none"],
          autoplay: ["autoplay"],
          mediagroup: ["movie"],
          muted: ["muted"],
          controls: ["controls"]
        }
      },
      wbr: f
    },
    It = {
      accesskey: null,
      class: null,
      contenteditable: z,
      contextmenu: null,
      dir: ["ltr", "rtl", "auto"],
      draggable: ["true", "false", "auto"],
      dropzone: ["copy", "move", "link", "string:", "file:"],
      hidden: ["hidden"],
      id: null,
      inert: ["inert"],
      itemid: null,
      itemprop: null,
      itemref: null,
      itemscope: ["itemscope"],
      itemtype: null,
      lang: ["ar", "bn", "de", "en-GB", "en-US", "es", "fr", "hi", "id", "ja", "pa", "pt", "ru", "tr", "zh"],
      spellcheck: z,
      autocorrect: z,
      autocapitalize: z,
      style: null,
      tabindex: null,
      title: null,
      translate: ["yes", "no"],
      rel: ["stylesheet", "alternate", "author", "bookmark", "help", "license", "next", "nofollow", "noreferrer", "prefetch", "prev", "search", "tag"],
      role: "alert application article banner button cell checkbox complementary contentinfo dialog document feed figure form grid gridcell heading img list listbox listitem main navigation region row rowgroup search switch tab table tabpanel textbox timer".split(" "),
      "aria-activedescendant": null,
      "aria-atomic": z,
      "aria-autocomplete": ["inline", "list", "both", "none"],
      "aria-busy": z,
      "aria-checked": ["true", "false", "mixed", "undefined"],
      "aria-controls": null,
      "aria-describedby": null,
      "aria-disabled": z,
      "aria-dropeffect": null,
      "aria-expanded": ["true", "false", "undefined"],
      "aria-flowto": null,
      "aria-grabbed": ["true", "false", "undefined"],
      "aria-haspopup": z,
      "aria-hidden": z,
      "aria-invalid": ["true", "false", "grammar", "spelling"],
      "aria-label": null,
      "aria-labelledby": null,
      "aria-level": null,
      "aria-live": ["off", "polite", "assertive"],
      "aria-multiline": z,
      "aria-multiselectable": z,
      "aria-owns": null,
      "aria-posinset": null,
      "aria-pressed": ["true", "false", "mixed", "undefined"],
      "aria-readonly": z,
      "aria-relevant": null,
      "aria-required": z,
      "aria-selected": ["true", "false", "undefined"],
      "aria-setsize": null,
      "aria-sort": ["ascending", "descending", "none", "other"],
      "aria-valuemax": null,
      "aria-valuemin": null,
      "aria-valuenow": null,
      "aria-valuetext": null
    },
    Bt = "beforeunload copy cut dragstart dragover dragleave dragenter dragend drag paste focus blur change click load mousedown mouseenter mouseleave mouseup keydown keyup resize scroll unload".split(" ").map(function (O) {
      return "on" + O;
    });
  for (var _iterator27 = _createForOfIteratorHelperLoose(Bt), _step27; !(_step27 = _iterator27()).done;) {
    var _O4 = _step27.value;
    It[_O4] = null;
  }
  var B = function B(e, t) {
    this.tags = _extends({}, Ti, e), this.globalAttrs = _extends({}, It, t), this.allTags = Object.keys(this.tags), this.globalAttrNames = Object.keys(this.globalAttrs);
  };
  B.default = new B();
  function N(O, e, t) {
    if (t === void 0) {
      t = O.length;
    }
    if (!e) return "";
    var a = e.firstChild,
      r = a && a.getChild("TagName");
    return r ? O.sliceString(r.from, Math.min(r.to, t)) : "";
  }
  function J(O, e) {
    if (e === void 0) {
      e = !1;
    }
    for (; O; O = O.parent) if (O.name == "Element") if (e) e = !1;else return O;
    return null;
  }
  function Nt(O, e, t) {
    var a = t.tags[N(O, J(e))];
    return (a == null ? void 0 : a.children) || t.allTags;
  }
  function ie(O, e) {
    var t = [];
    for (var a = J(e); a && !a.type.isTop; a = J(a.parent)) {
      var r = N(O, a);
      if (r && a.lastChild.name == "CloseTag") break;
      r && t.indexOf(r) < 0 && (e.name == "EndTag" || e.from >= a.firstChild.to) && t.push(r);
    }
    return t;
  }
  var Dt = /^[:\-\.\w\u00b7-\uffff]*$/;
  function Ct(O, e, t, a, r) {
    var i = /\s*>/.test(O.sliceDoc(r, r + 5)) ? "" : ">",
      n = J(t, t.name == "StartTag" || t.name == "TagName");
    return {
      from: a,
      to: r,
      options: Nt(O.doc, n, e).map(function (l) {
        return {
          label: l,
          type: "type"
        };
      }).concat(ie(O.doc, t).map(function (l, s) {
        return {
          label: "/" + l,
          apply: "/" + l + i,
          type: "type",
          boost: 99 - s
        };
      })),
      validFor: /^\/?[:\-\.\w\u00b7-\uffff]*$/
    };
  }
  function Et(O, e, t, a) {
    var r = /\s*>/.test(O.sliceDoc(a, a + 5)) ? "" : ">";
    return {
      from: t,
      to: a,
      options: ie(O.doc, e).map(function (i, n) {
        return {
          label: i,
          apply: i + r,
          type: "type",
          boost: 99 - n
        };
      }),
      validFor: Dt
    };
  }
  function Yi(O, e, t, a) {
    var r = [],
      i = 0;
    for (var _iterator28 = _createForOfIteratorHelperLoose(Nt(O.doc, t, e)), _step28; !(_step28 = _iterator28()).done;) {
      var n = _step28.value;
      r.push({
        label: "<" + n,
        type: "type"
      });
    }
    for (var _iterator29 = _createForOfIteratorHelperLoose(ie(O.doc, t)), _step29; !(_step29 = _iterator29()).done;) {
      var _n = _step29.value;
      r.push({
        label: "</" + _n + ">",
        type: "type",
        boost: 99 - i++
      });
    }
    return {
      from: a,
      to: a,
      options: r,
      validFor: /^<\/?[:\-\.\w\u00b7-\uffff]*$/
    };
  }
  function ji(O, e, t, a, r) {
    var i = J(t),
      n = i ? e.tags[N(O.doc, i)] : null,
      l = n && n.attrs ? Object.keys(n.attrs) : [],
      s = n && n.globalAttrs === !1 ? l : l.length ? l.concat(e.globalAttrNames) : e.globalAttrNames;
    return {
      from: a,
      to: r,
      options: s.map(function (Q) {
        return {
          label: Q,
          type: "property"
        };
      }),
      validFor: Dt
    };
  }
  function vi(O, e, t, a, r) {
    var i;
    var n = (i = t.parent) === null || i === void 0 ? void 0 : i.getChild("AttributeName"),
      l = [],
      s;
    if (n) {
      var Q = O.sliceDoc(n.from, n.to),
        o = e.globalAttrs[Q];
      if (!o) {
        var c = J(t),
          p = c ? e.tags[N(O.doc, c)] : null;
        o = (p == null ? void 0 : p.attrs) && p.attrs[Q];
      }
      if (o) {
        var _c2 = O.sliceDoc(a, r).toLowerCase(),
          _p5 = '"',
          $ = '"';
        /^['"]/.test(_c2) ? (s = _c2[0] == '"' ? /^[^"]*$/ : /^[^']*$/, _p5 = "", $ = O.sliceDoc(r, r + 1) == _c2[0] ? "" : _c2[0], _c2 = _c2.slice(1), a++) : s = /^[^\s<>='"]*$/;
        for (var _iterator30 = _createForOfIteratorHelperLoose(o), _step30; !(_step30 = _iterator30()).done;) {
          var h = _step30.value;
          l.push({
            label: h,
            apply: _p5 + h + $,
            type: "constant"
          });
        }
      }
    }
    return {
      from: a,
      to: r,
      options: l,
      validFor: s
    };
  }
  function Jt(O, e) {
    var t = e.state,
      a = e.pos,
      r = (0, q.syntaxTree)(t).resolveInner(a, -1),
      i = r.resolve(a);
    for (var n = a, l; i == r && (l = r.childBefore(n));) {
      var s = l.lastChild;
      if (!s || !s.type.isError || s.from < s.to) break;
      i = r = l, n = s.from;
    }
    return r.name == "TagName" ? r.parent && /CloseTag$/.test(r.parent.name) ? Et(t, r, r.from, a) : Ct(t, O, r, r.from, a) : r.name == "StartTag" || r.name == "IncompleteTag" ? Ct(t, O, r, a, a) : r.name == "StartCloseTag" || r.name == "IncompleteCloseTag" ? Et(t, r, a, a) : r.name == "OpenTag" || r.name == "SelfClosingTag" || r.name == "AttributeName" ? ji(t, O, r, r.name == "AttributeName" ? r.from : a, a) : r.name == "Is" || r.name == "AttributeValue" || r.name == "UnquotedAttributeValue" ? vi(t, O, r, r.name == "Is" ? a : r.from, a) : e.explicit && (i.name == "Element" || i.name == "Text" || i.name == "Document") ? Yi(t, O, r, a) : null;
  }
  function Ft(O) {
    return Jt(B.default, O);
  }
  function _i(O) {
    var e = O.extraTags,
      t = O.extraGlobalAttributes,
      a = t || e ? new B(e, t) : B.default;
    return function (r) {
      return Jt(a, r);
    };
  }
  var Ri = W.parser.configure({
      top: "SingleExpression"
    }),
    Kt = [{
      tag: "script",
      attrs: function attrs(O) {
        return O.type == "text/typescript" || O.lang == "ts";
      },
      parser: HO.parser
    }, {
      tag: "script",
      attrs: function attrs(O) {
        return O.type == "text/babel" || O.type == "text/jsx";
      },
      parser: Oe.parser
    }, {
      tag: "script",
      attrs: function attrs(O) {
        return O.type == "text/typescript-jsx";
      },
      parser: ee.parser
    }, {
      tag: "script",
      attrs: function attrs(O) {
        return new RegExp("^(importmap|speculationrules|application\\/(.+\\+)?json)$", "i").test(O.type);
      },
      parser: Ri
    }, {
      tag: "script",
      attrs: function attrs(O) {
        return !O.type || new RegExp("^(?:text|application)\\/(?:x-)?(?:java|ecma)script$|^module$|^$", "i").test(O.type);
      },
      parser: W.parser
    }, {
      tag: "style",
      attrs: function attrs(O) {
        return (!O.lang || O.lang == "css") && (!O.type || new RegExp("^(text\\/)?(x-)?(stylesheet|css)$", "i").test(O.type));
      },
      parser: iO.parser
    }],
    Ht = [{
      name: "style",
      parser: iO.parser.configure({
        top: "Styles"
      })
    }].concat(Bt.map(function (O) {
      return {
        name: O,
        parser: W.parser
      };
    })),
    Oa = q.LRLanguage.define({
      name: "html",
      parser: ct.configure({
        props: [q.indentNodeProp.add({
          Element: function Element(O) {
            var e = /^(\s*)(<\/)?/.exec(O.textAfter);
            return O.node.to <= O.pos + e[0].length ? O.continue() : O.lineIndent(O.node.from) + (e[2] ? 0 : O.unit);
          },
          "OpenTag CloseTag SelfClosingTag": function OpenTag_CloseTag_SelfClosingTag(O) {
            return O.column(O.node.from) + O.unit;
          },
          Document: function Document(O) {
            if (O.pos + /\s*/.exec(O.textAfter)[0].length < O.node.to) return O.continue();
            var e = null,
              t;
            for (var a = O.node;;) {
              var r = a.lastChild;
              if (!r || r.name != "Element" || r.to != a.to) break;
              e = a = r;
            }
            return e && !((t = e.lastChild) && (t.name == "CloseTag" || t.name == "SelfClosingTag")) ? O.lineIndent(e.from) + O.unit : null;
          }
        }), q.foldNodeProp.add({
          Element: function Element(O) {
            var e = O.firstChild,
              t = O.lastChild;
            return !e || e.name != "OpenTag" ? null : {
              from: e.to,
              to: t.name == "CloseTag" ? t.from : O.to
            };
          }
        }), q.bracketMatchingHandle.add({
          "OpenTag CloseTag": function OpenTag_CloseTag(O) {
            return O.getChild("TagName");
          }
        })]
      }),
      languageData: {
        commentTokens: {
          block: {
            open: "<!--",
            close: "-->"
          }
        },
        indentOnInput: /^\s*<\/\w+\W$/,
        wordChars: "-_"
      }
    }),
    SO = Oa.configure({
      wrap: IO(Kt, Ht)
    });
  function ea(O) {
    if (O === void 0) {
      O = {};
    }
    var e = "",
      t;
    O.matchClosingTags === !1 && (e = "noMatch"), O.selfClosingTags === !0 && (e = (e ? e + " " : "") + "selfClosing"), (O.nestedLanguages && O.nestedLanguages.length || O.nestedAttributes && O.nestedAttributes.length) && (t = IO((O.nestedLanguages || []).concat(Kt), (O.nestedAttributes || []).concat(Ht)));
    var a = t ? Oa.configure({
      wrap: t,
      dialect: e
    }) : e ? SO.configure({
      dialect: e
    }) : SO;
    return new q.LanguageSupport(a, [SO.data.of({
      autocomplete: _i(O)
    }), O.autoCloseTags !== !1 ? qi : [], Lt().support, kt().support]);
  }
  var Ut = new Set("area base br col command embed frame hr img input keygen link meta param source track wbr menuitem".split(" "));
  function zi(O, e, t) {
    for (var a;;) {
      if (((a = e.lastChild) === null || a === void 0 ? void 0 : a.name) != "CloseTag") return !1;
      var r = e.parent;
      if (!r || N(O, r) != t) return !0;
      e = r;
    }
  }
  var qi = At.EditorView.inputHandler.of(function (O, e, t, a, r) {
    if (O.composing || O.state.readOnly || e != t || a != ">" && a != "/" || !SO.isActiveAt(O.state, e, -1)) return !1;
    var i = r(),
      n = i.state,
      l = n.changeByRange(function (s) {
        var Q;
        var o = n.doc.sliceString(s.from - 1, s.to) == a,
          c = s.head,
          p = (0, q.syntaxTree)(n).resolveInner(c, -1),
          $;
        if (o && a == ">" && p.name == "EndTag") {
          var h = p.parent;
          if (($ = N(n.doc, h.parent, c)) && !Ut.has($) && !zi(n.doc, h.parent, $)) {
            var m = c + (n.doc.sliceString(c, c + 1) === ">" ? 1 : 0),
              w = "</" + $ + ">";
            return {
              range: s,
              changes: {
                from: c,
                to: m,
                insert: w
              }
            };
          }
        } else if (o && a == "/" && p.name == "IncompleteCloseTag") {
          var _h4 = p.parent;
          if (p.from == c - 2 && ((Q = _h4.lastChild) === null || Q === void 0 ? void 0 : Q.name) != "CloseTag" && ($ = N(n.doc, _h4, c)) && !Ut.has($)) {
            var _m4 = c + (n.doc.sliceString(c, c + 1) === ">" ? 1 : 0),
              _w2 = $ + ">";
            return {
              range: Mt.EditorSelection.cursor(c + _w2.length, -1),
              changes: {
                from: c,
                to: _m4,
                insert: _w2
              }
            };
          }
        }
        return {
          range: s
        };
      });
    return l.changes.empty ? !1 : (O.dispatch([i, n.update(l, {
      userEvent: "input.complete",
      scrollIntoView: !0
    })]), !0);
  });
  var ia = require("@lezer/common"),
    na = (0, Z.defineLanguageFacet)({
      commentTokens: {
        block: {
          open: "<!--",
          close: "-->"
        }
      }
    }),
    la = new ia.NodeProp(),
    sa = Le.configure({
      props: [Z.foldNodeProp.add(function (O) {
        return !O.is("Block") || O.is("Document") || se(O) != null || Vi(O) ? void 0 : function (e, t) {
          return {
            from: t.doc.lineAt(e.from).to,
            to: e.to
          };
        };
      }), la.add(se), Z.indentNodeProp.add({
        Document: function Document() {
          return null;
        }
      }), Z.languageDataProp.add({
        Document: na
      })]
    });
  function se(O) {
    var e = /^(?:ATX|Setext)Heading(\d)$/.exec(O.name);
    return e ? +e[1] : void 0;
  }
  function Vi(O) {
    return O.name == "OrderedList" || O.name == "BulletList";
  }
  function Wi(O, e) {
    var t = O;
    for (;;) {
      var a = t.nextSibling,
        r = void 0;
      if (!a || (r = se(a.type)) != null && r <= e) break;
      t = a;
    }
    return t.to;
  }
  var Gi = Z.foldService.of(function (O, e, t) {
    for (var a = (0, Z.syntaxTree)(O).resolveInner(t, -1); a && !(a.from < e); a = a.parent) {
      var r = a.type.prop(la);
      if (r == null) continue;
      var i = Wi(a, r);
      if (i > t) return {
        from: t,
        to: i
      };
    }
    return null;
  });
  function oe(O) {
    return new Z.Language(na, O, [], "markdown");
  }
  var Li = oe(sa),
    Ci = sa.configure([Ue, Ie, Me, Be, {
      props: [Z.foldNodeProp.add({
        Table: function Table(O, e) {
          return {
            from: e.doc.lineAt(O.from).to,
            to: O.to
          };
        }
      })]
    }]),
    PO = oe(Ci);
  function Ei(O, e) {
    return function (t) {
      if (t && O) {
        var a = null;
        if (t = /\S*/.exec(t)[0], typeof O == "function" ? a = O(t) : a = Z.LanguageDescription.matchLanguageName(O, t, !0), a instanceof Z.LanguageDescription) return a.support ? a.support.language.parser : Z.ParseContext.getSkippingParser(a.load());
        if (a) return a.parser;
      }
      return e ? e.parser : null;
    };
  }
  var sO = function () {
    function sO(e, t, a, r, i, n, l) {
      this.node = e, this.from = t, this.to = a, this.spaceBefore = r, this.spaceAfter = i, this.type = n, this.item = l;
    }
    var _proto12 = sO.prototype;
    _proto12.blank = function blank(e, t) {
      if (t === void 0) {
        t = !0;
      }
      var a = this.spaceBefore + (this.node.name == "Blockquote" ? ">" : "");
      if (e != null) {
        for (; a.length < e;) a += " ";
        return a;
      } else {
        for (var r = this.to - this.from - a.length - this.spaceAfter.length; r > 0; r--) a += " ";
        return a + (t ? this.spaceAfter : "");
      }
    };
    _proto12.marker = function marker(e, t) {
      var a = this.node.name == "OrderedList" ? String(+Qa(this.item, e)[2] + t) : "";
      return this.spaceBefore + a + this.type + this.spaceAfter;
    };
    return sO;
  }();
  function oa(O, e) {
    var t = [],
      a = [];
    for (var r = O; r; r = r.parent) {
      if (r.name == "FencedCode") return a;
      (r.name == "ListItem" || r.name == "Blockquote") && t.push(r);
    }
    for (var _r8 = t.length - 1; _r8 >= 0; _r8--) {
      var i = t[_r8],
        n = void 0,
        l = e.lineAt(i.from),
        s = i.from - l.from;
      if (i.name == "Blockquote" && (n = /^ *>( ?)/.exec(l.text.slice(s)))) a.push(new sO(i, s, s + n[0].length, "", n[1], ">", null));else if (i.name == "ListItem" && i.parent.name == "OrderedList" && (n = /^( *)\d+([.)])( *)/.exec(l.text.slice(s)))) {
        var Q = n[3],
          o = n[0].length;
        Q.length >= 4 && (Q = Q.slice(0, Q.length - 4), o -= 4), a.push(new sO(i.parent, s, s + o, n[1], Q, n[2], i));
      } else if (i.name == "ListItem" && i.parent.name == "BulletList" && (n = /^( *)([-+*])( {1,4}\[[ xX]\])?( +)/.exec(l.text.slice(s)))) {
        var _Q2 = n[4],
          _o2 = n[0].length;
        _Q2.length > 4 && (_Q2 = _Q2.slice(0, _Q2.length - 4), _o2 -= 4);
        var c = n[2];
        n[3] && (c += n[3].replace(/[xX]/, " ")), a.push(new sO(i.parent, s, s + _o2, n[1], _Q2, c, i));
      }
    }
    return a;
  }
  function Qa(O, e) {
    return /^(\s*)(\d+)(?=[.)])/.exec(e.sliceString(O.from, O.from + 10));
  }
  function ne(O, e, t, a) {
    if (a === void 0) {
      a = 0;
    }
    for (var r = -1, i = O;;) {
      if (i.name == "ListItem") {
        var l = Qa(i, e),
          s = +l[2];
        if (r >= 0) {
          if (s != r + 1) return;
          t.push({
            from: i.from + l[1].length,
            to: i.from + l[0].length,
            insert: String(r + 2 + a)
          });
        }
        r = s;
      }
      var n = i.nextSibling;
      if (!n) break;
      i = n;
    }
  }
  function Qe(O, e) {
    var t = /^[ \t]*/.exec(O)[0].length;
    if (!t || e.facet(Z.indentUnit) != "	") return O;
    var a = (0, T.countColumn)(O, 4, t),
      r = "";
    for (var i = a; i > 0;) i >= 4 ? (r += "	", i -= 4) : (r += " ", i--);
    return r + O.slice(t);
  }
  var Ui = function Ui(O) {
      if (O === void 0) {
        O = {};
      }
      return function (_ref2) {
        var e = _ref2.state,
          t = _ref2.dispatch;
        var a = (0, Z.syntaxTree)(e),
          r = e.doc,
          i = null,
          n = e.changeByRange(function (l) {
            if (!l.empty || !PO.isActiveAt(e, l.from, -1) && !PO.isActiveAt(e, l.from, 1)) return i = {
              range: l
            };
            var s = l.from,
              Q = r.lineAt(s),
              o = oa(a.resolveInner(s, -1), r);
            for (; o.length && o[o.length - 1].from > s - Q.from;) o.pop();
            if (!o.length) return i = {
              range: l
            };
            var c = o[o.length - 1];
            if (c.to - c.spaceAfter.length > s - Q.from) return i = {
              range: l
            };
            var p = s >= c.to - c.spaceAfter.length && !/\S/.test(Q.text.slice(c.to));
            if (c.item && p) {
              if (c.item.from < Q.from && !/^[\s>]*$/.test(Q.text.slice(0, c.to))) return i = {
                range: l
              };
              var b = c.node.firstChild,
                Y = c.node.getChild("ListItem", "ListItem");
              if (b.to >= s || Y && Y.to < s || Q.from > 0 && !/[^\s>]/.test(r.lineAt(Q.from - 1).text) || O.nonTightLists === !1) {
                var x = o.length > 1 ? o[o.length - 2] : null,
                  U,
                  A = "";
                x && x.item ? (U = Q.from + x.from, A = x.marker(r, 1)) : U = Q.from + (x ? x.to : 0);
                var F = [{
                  from: U,
                  to: s,
                  insert: A
                }];
                return c.node.name == "OrderedList" && ne(c.item, r, F, -2), x && x.node.name == "OrderedList" && ne(x.item, r, F), {
                  range: T.EditorSelection.cursor(U + A.length),
                  changes: F
                };
              } else {
                var _x = aa(o, e, Q);
                return {
                  range: T.EditorSelection.cursor(s + _x.length + 1),
                  changes: {
                    from: Q.from,
                    insert: _x + e.lineBreak
                  }
                };
              }
            }
            if (c.node.name == "Blockquote" && p && Q.from) {
              var _b = r.lineAt(Q.from - 1),
                _Y = />\s*$/.exec(_b.text);
              if (_Y && _Y.index == c.from) {
                var _x2 = e.changes([{
                  from: _b.from + _Y.index,
                  to: _b.to
                }, {
                  from: Q.from + c.from,
                  to: Q.to
                }]);
                return {
                  range: l.map(_x2),
                  changes: _x2
                };
              }
            }
            var $ = [];
            c.node.name == "OrderedList" && ne(c.item, r, $);
            var h = c.item && c.item.from < Q.from,
              m = "";
            if (!h || /^[\s\d.)\-+*>]*/.exec(Q.text)[0].length >= c.to) for (var _b2 = 0, _Y2 = o.length - 1; _b2 <= _Y2; _b2++) m += _b2 == _Y2 && !h ? o[_b2].marker(r, 1) : o[_b2].blank(_b2 < _Y2 ? (0, T.countColumn)(Q.text, 4, o[_b2 + 1].from) - m.length : null);
            var w = s;
            for (; w > Q.from && /\s/.test(Q.text.charAt(w - Q.from - 1));) w--;
            return m = Qe(m, e), Mi(c.node, e.doc) && (m = aa(o, e, Q) + e.lineBreak + m), $.push({
              from: w,
              to: s,
              insert: e.lineBreak + m
            }), {
              range: T.EditorSelection.cursor(w + m.length + 1),
              changes: $
            };
          });
        return i ? !1 : (t(e.update(n, {
          scrollIntoView: !0,
          userEvent: "input"
        })), !0);
      };
    },
    Ai = Ui();
  function ta(O) {
    return O.name == "QuoteMark" || O.name == "ListMark";
  }
  function Mi(O, e) {
    if (O.name != "OrderedList" && O.name != "BulletList") return !1;
    var t = O.firstChild,
      a = O.getChild("ListItem", "ListItem");
    if (!a) return !1;
    var r = e.lineAt(t.to),
      i = e.lineAt(a.from),
      n = /^[\s>]*$/.test(r.text);
    return r.number + (n ? 0 : 1) < i.number;
  }
  function aa(O, e, t) {
    var a = "";
    for (var r = 0, i = O.length - 2; r <= i; r++) a += O[r].blank(r < i ? (0, T.countColumn)(t.text, 4, O[r + 1].from) - a.length : null, r < i);
    return Qe(a, e);
  }
  function Ii(O, e) {
    var t = O.resolveInner(e, -1),
      a = e;
    ta(t) && (a = t.from, t = t.parent);
    for (var r; r = t.childBefore(a);) if (ta(r)) a = r.from;else if (r.name == "OrderedList" || r.name == "BulletList") t = r.lastChild, a = t.to;else break;
    return t;
  }
  var Bi = function Bi(_ref3) {
      var O = _ref3.state,
        e = _ref3.dispatch;
      var t = (0, Z.syntaxTree)(O),
        a = null,
        r = O.changeByRange(function (i) {
          var n = i.from,
            l = O.doc;
          if (i.empty && PO.isActiveAt(O, i.from)) {
            var s = l.lineAt(n),
              Q = oa(Ii(t, n), l);
            if (Q.length) {
              var o = Q[Q.length - 1],
                c = o.to - o.spaceAfter.length + (o.spaceAfter ? 1 : 0);
              if (n - s.from > c && !/\S/.test(s.text.slice(c, n - s.from))) return {
                range: T.EditorSelection.cursor(s.from + c),
                changes: {
                  from: s.from + c,
                  to: n
                }
              };
              if (n - s.from == c && (o.item && s.from <= o.item.from || /^[\s>]*$/.test(s.text.slice(0, o.to)))) {
                var p = s.from + o.from;
                if (o.item && o.node.from < o.item.from && /\S/.test(s.text.slice(o.from, o.to))) {
                  var $ = o.blank((0, T.countColumn)(s.text, 4, o.to) - (0, T.countColumn)(s.text, 4, o.from));
                  return p == s.from && ($ = Qe($, O)), {
                    range: T.EditorSelection.cursor(p + $.length),
                    changes: {
                      from: p,
                      to: s.from + o.to,
                      insert: $
                    }
                  };
                }
                if (p < n) return {
                  range: T.EditorSelection.cursor(p),
                  changes: {
                    from: p,
                    to: n
                  }
                };
              }
            }
          }
          return a = {
            range: i
          };
        });
      return a ? !1 : (e(O.update(r, {
        scrollIntoView: !0,
        userEvent: "delete"
      })), !0);
    },
    Ni = [{
      key: "Enter",
      run: Ai
    }, {
      key: "Backspace",
      run: Bi
    }],
    ca = ea({
      matchClosingTags: !1
    });
  function pa(O) {
    if (O === void 0) {
      O = {};
    }
    var _O3 = O,
      e = _O3.codeLanguages,
      t = _O3.defaultCodeLanguage,
      _O3$addKeymap = _O3.addKeymap,
      a = _O3$addKeymap === void 0 ? !0 : _O3$addKeymap,
      _O3$base = _O3.base,
      _O3$base2 = _O3$base === void 0 ? Li : _O3$base,
      r = _O3$base2.parser,
      _O3$completeHTMLTags = _O3.completeHTMLTags,
      i = _O3$completeHTMLTags === void 0 ? !0 : _O3$completeHTMLTags,
      _O3$pasteURLAsLink = _O3.pasteURLAsLink,
      n = _O3$pasteURLAsLink === void 0 ? !0 : _O3$pasteURLAsLink,
      _O3$htmlTagLanguage = _O3.htmlTagLanguage,
      l = _O3$htmlTagLanguage === void 0 ? ca : _O3$htmlTagLanguage;
    if (!(r instanceof eO)) throw new RangeError("Base parser provided to `markdown` should be a Markdown parser");
    var s = O.extensions ? [O.extensions] : [],
      Q = [l.support, Gi],
      o;
    n && Q.push(Ki), t instanceof Z.LanguageSupport ? (Q.push(t.support), o = t.language) : t && (o = t);
    var c = e || o ? Ei(e, o) : void 0;
    s.push(Ce({
      codeParser: c,
      htmlParser: l.language.parser
    })), a && Q.push(T.Prec.high(ZO.keymap.of(Ni)));
    var p = oe(r.configure(s));
    return i && Q.push(p.data.of({
      autocomplete: Di
    })), new Z.LanguageSupport(p, Q);
  }
  function Di(O) {
    var e = O.state,
      t = O.pos,
      a = /<[:\-\.\w\u00b7-\uffff]*$/.exec(e.sliceDoc(t - 25, t));
    if (!a) return null;
    var r = (0, Z.syntaxTree)(e).resolveInner(t, -1);
    for (; r && !r.type.isTop;) {
      if (r.name == "CodeBlock" || r.name == "FencedCode" || r.name == "ProcessingInstructionBlock" || r.name == "CommentBlock" || r.name == "Link" || r.name == "Image") return null;
      r = r.parent;
    }
    return {
      from: t - a[0].length,
      to: t,
      options: Ji(),
      validFor: /^<[:\-\.\w\u00b7-\uffff]*$/
    };
  }
  var le = null;
  function Ji() {
    if (le) return le;
    var O = Ft(new ra.CompletionContext(T.EditorState.create({
      extensions: ca
    }), 0, !0));
    return le = O ? O.options : [];
  }
  var Fi = new RegExp("code|horizontalrule|html|link|comment|processing|escape|entity|image|mark|url", "i"),
    Ki = ZO.EditorView.domEventHandlers({
      paste: function paste(O, e) {
        var t;
        var a = e.state.selection.main;
        if (a.empty) return !1;
        var r = (t = O.clipboardData) === null || t === void 0 ? void 0 : t.getData("text/plain");
        if (!r || !/^(https?:\/\/|mailto:|xmpp:|www\.)/.test(r) || (/^www\./.test(r) && (r = "https://" + r), !PO.isActiveAt(e.state, a.from, 1))) return !1;
        var i = (0, Z.syntaxTree)(e.state),
          n = !1;
        return i.iterate({
          from: a.from,
          to: a.to,
          enter: function enter(l) {
            (l.from > a.from || Fi.test(l.name)) && (n = !0);
          },
          leave: function leave(l) {
            l.to < a.to && (n = !0);
          }
        }), n ? !1 : (e.dispatch({
          changes: [{
            from: a.from,
            insert: "["
          }, {
            from: a.to,
            insert: "](" + r + ")"
          }],
          userEvent: "input.paste",
          scrollIntoView: !0
        }), !0);
      }
    });
  var ua = require("@codemirror/language"),
    Hi = [{
      name: "javascript",
      title: "JavaScript",
      extensions: ["js", "mjs", "cjs"],
      aliases: ["js"],
      package: "javascript"
    }, {
      name: "jsx",
      title: "JSX",
      extensions: ["jsx"],
      aliases: [],
      package: "javascript"
    }, {
      name: "typescript",
      title: "TypeScript",
      extensions: ["ts", "mts", "cts"],
      aliases: ["ts"],
      package: "javascript"
    }, {
      name: "tsx",
      title: "TSX",
      extensions: ["tsx"],
      aliases: [],
      package: "javascript"
    }, {
      name: "html",
      title: "HTML",
      extensions: ["html", "htm", "svg"],
      aliases: [],
      package: "html"
    }, {
      name: "css",
      title: "CSS",
      extensions: ["css"],
      aliases: [],
      package: "css"
    }, {
      name: "json",
      title: "JSON",
      extensions: ["json"],
      aliases: [],
      package: "json"
    }, {
      name: "vue",
      title: "Vue",
      extensions: ["vue"],
      aliases: [],
      package: "vue"
    }, {
      name: "svelte",
      title: "Svelte",
      extensions: ["svelte"],
      aliases: [],
      package: "svelte"
    }, {
      name: "python",
      title: "Python",
      extensions: ["py", "pyw", "pyi"],
      aliases: ["py"],
      package: "python"
    }, {
      name: "rust",
      title: "Rust",
      extensions: ["rs"],
      aliases: ["rs"],
      package: "rust"
    }, {
      name: "sql",
      title: "SQL",
      extensions: ["sql"],
      aliases: [],
      package: "sql"
    }, {
      name: "yaml",
      title: "YAML",
      extensions: ["yaml", "yml"],
      aliases: ["yml"],
      package: "yaml"
    }, {
      name: "cpp",
      title: "C/C++",
      extensions: ["c", "h", "cc", "cpp", "cxx", "hpp", "hxx"],
      aliases: ["c", "c++"],
      package: "cpp"
    }].map(function (O) {
      return ua.LanguageDescription.of({
        name: O.title,
        alias: [O.name].concat(O.aliases),
        extensions: O.extensions,
        load: function load() {
          return Promise.resolve(globalThis.__codeEditorLoadedLanguage(O.name));
        }
      });
    });
  globalThis.__codeEditorRegisterLanguage("markdown", function () {
    return pa({
      codeLanguages: Hi
    });
  });
})(globalThis.__codeMirrorRequire);