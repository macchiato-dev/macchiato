function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _inheritsLoose(t, o) { t.prototype = Object.create(o.prototype), t.prototype.constructor = t, _setPrototypeOf(t, o); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (_r0) { o = !0, n = _r0; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _createForOfIteratorHelperLoose(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (t) return (t = t.call(r)).next.bind(t); if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var o = 0; return function () { return o >= r.length ? { done: !0 } : { done: !1, value: r[o++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
(function () {
  var DefaultBufferLength = 1024;
  var nextPropID = 0;
  var Range = function Range(from, to) {
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
    var _proto = NodeProp.prototype;
    _proto.add = function add(match) {
      var _this = this;
      if (this.perNode) throw new RangeError("Can't add per-node props to node types");
      if (typeof match != "function") match = NodeType.match(match);
      return function (type) {
        var result = match(type);
        return result === void 0 ? null : [_this, result];
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
    function MountedTree(tree, overlay, parser4, bracketed) {
      if (bracketed === void 0) {
        bracketed = false;
      }
      this.tree = tree;
      this.overlay = overlay;
      this.parser = parser4;
      this.bracketed = bracketed;
    }
    MountedTree.get = function get(tree) {
      return tree && tree.props && tree.props[NodeProp.mounted.id];
    };
    return MountedTree;
  }();
  var noProps = Object.create(null);
  var NodeType = function () {
    function _NodeType(name2, props, id2, flags) {
      if (flags === void 0) {
        flags = 0;
      }
      this.name = name2;
      this.props = props;
      this.id = id2;
      this.flags = flags;
    }
    _NodeType.define = function define(spec) {
      var props = spec.props && spec.props.length ? Object.create(null) : noProps;
      var flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
      var type = new _NodeType(spec.name || "", props, spec.id, flags);
      if (spec.props) {
        for (var _iterator = _createForOfIteratorHelperLoose(spec.props), _step; !(_step = _iterator()).done;) {
          var src = _step.value;
          if (!Array.isArray(src)) src = src(type);
          if (src) {
            if (src[0].perNode) throw new RangeError("Can't store a per-node prop on a node type");
            props[src[0].id] = src[1];
          }
        }
      }
      return type;
    };
    var _proto2 = _NodeType.prototype;
    _proto2.prop = function prop(_prop) {
      return this.props[_prop.id];
    };
    _proto2.is = function is(name2) {
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
        for (var _iterator2 = _createForOfIteratorHelperLoose(prop.split(" ")), _step2; !(_step2 = _iterator2()).done;) {
          var name2 = _step2.value;
          direct[name2] = map[prop];
        }
      }
      return function (node) {
        for (var groups = node.prop(NodeProp.group), i2 = -1; i2 < (groups ? groups.length : 0); i2++) {
          var found = direct[i2 < 0 ? node.name : groups[i2]];
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
  var NodeSet = function () {
    function _NodeSet(types2) {
      this.types = types2;
      for (var i2 = 0; i2 < types2.length; i2++) if (types2[i2].id != i2) throw new RangeError("Node type ids should correspond to array positions when creating a node set");
    }
    var _proto3 = _NodeSet.prototype;
    _proto3.extend = function extend() {
      var newTypes = [];
      for (var _len = arguments.length, props = new Array(_len), _key = 0; _key < _len; _key++) {
        props[_key] = arguments[_key];
      }
      for (var _iterator3 = _createForOfIteratorHelperLoose(this.types), _step3; !(_step3 = _iterator3()).done;) {
        var type = _step3.value;
        var newProps = null;
        for (var _iterator4 = _createForOfIteratorHelperLoose(props), _step4; !(_step4 = _iterator4()).done;) {
          var source = _step4.value;
          var add = source(type);
          if (add) {
            if (!newProps) newProps = Object.assign({}, type.props);
            var value = add[1],
              prop = add[0];
            if (prop.combine && prop.id in newProps) value = prop.combine(newProps[prop.id], value);
            newProps[prop.id] = value;
          }
        }
        newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
      }
      return new _NodeSet(newTypes);
    };
    return _NodeSet;
  }();
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
        for (var _iterator5 = _createForOfIteratorHelperLoose(props), _step5; !(_step5 = _iterator5()).done;) {
          var _step5$value = _slicedToArray(_step5.value, 2),
            prop = _step5$value[0],
            value = _step5$value[1];
          this.props[typeof prop == "number" ? prop : prop.id] = value;
        }
      }
    }
    var _proto4 = _Tree.prototype;
    _proto4.toString = function toString() {
      var mounted = MountedTree.get(this);
      if (mounted && !mounted.overlay) return mounted.tree.toString();
      var children = "";
      for (var _iterator6 = _createForOfIteratorHelperLoose(this.children), _step6; !(_step6 = _iterator6()).done;) {
        var ch = _step6.value;
        var str = ch.toString();
        if (str) {
          if (children) children += ",";
          children += str;
        }
      }
      return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
    };
    _proto4.cursor = function cursor(mode) {
      if (mode === void 0) {
        mode = 0;
      }
      return new TreeCursor(this.topNode, mode);
    };
    _proto4.cursorAt = function cursorAt(pos, side, mode) {
      if (side === void 0) {
        side = 0;
      }
      if (mode === void 0) {
        mode = 0;
      }
      var scope = CachedNode.get(this) || this.topNode;
      var cursor2 = new TreeCursor(scope);
      cursor2.moveTo(pos, side);
      CachedNode.set(this, cursor2._tree);
      return cursor2;
    };
    _proto4.resolve = function resolve(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      var node = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
      CachedNode.set(this, node);
      return node;
    };
    _proto4.resolveInner = function resolveInner(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      var node = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
      CachedInnerNode.set(this, node);
      return node;
    };
    _proto4.resolveStack = function resolveStack(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      return stackIterator(this, pos, side);
    };
    _proto4.iterate = function iterate(spec) {
      var enter = spec.enter,
        leave = spec.leave,
        _spec$from = spec.from,
        from = _spec$from === void 0 ? 0 : _spec$from,
        _spec$to = spec.to,
        to = _spec$to === void 0 ? this.length : _spec$to;
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
    _proto4.prop = function prop(_prop2) {
      return !_prop2.perNode ? this.type.prop(_prop2) : this.props ? this.props[_prop2.id] : void 0;
    };
    _proto4.balance = function balance(config) {
      var _this2 = this;
      if (config === void 0) {
        config = {};
      }
      return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, function (children, positions, length) {
        return new _Tree(_this2.type, children, positions, length, _this2.propValues);
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
        if (this.props) for (var id2 in this.props) result.push([+id2, this.props[id2]]);
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
    var _proto5 = _FlatBufferCursor.prototype;
    _proto5.next = function next() {
      this.index -= 4;
    };
    _proto5.fork = function fork() {
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
    var _proto6 = _TreeBuffer.prototype;
    _proto6.toString = function toString() {
      var result = [];
      for (var index = 0; index < this.buffer.length;) {
        result.push(this.childString(index));
        index = this.buffer[index + 3];
      }
      return result.join(",");
    };
    _proto6.childString = function childString(index) {
      var id2 = this.buffer[index],
        endIndex = this.buffer[index + 3];
      var type = this.set.types[id2],
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
    _proto6.findChild = function findChild(startIndex, endIndex, dir, pos, side) {
      var buffer = this.buffer,
        pick = -1;
      for (var i2 = startIndex; i2 != endIndex; i2 = buffer[i2 + 3]) {
        if (checkSide(side, pos, buffer[i2 + 1], buffer[i2 + 2])) {
          pick = i2;
          if (dir > 0) break;
        }
      }
      return pick;
    };
    _proto6.slice = function slice(startI, endI, from) {
      var b = this.buffer;
      var copy = new Uint16Array(endI - startI),
        len = 0;
      for (var i2 = startI, j = 0; i2 < endI;) {
        copy[j++] = b[i2++];
        copy[j++] = b[i2++] - from;
        var to = copy[j++] = b[i2++] - from;
        copy[j++] = b[i2++] - startI;
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
    var _proto7 = BaseNode.prototype;
    _proto7.cursor = function cursor(mode) {
      if (mode === void 0) {
        mode = 0;
      }
      return new TreeCursor(this, mode);
    };
    _proto7.getChild = function getChild(type, before, after) {
      if (before === void 0) {
        before = null;
      }
      if (after === void 0) {
        after = null;
      }
      var r = _getChildren(this, type, before, after);
      return r.length ? r[0] : null;
    };
    _proto7.getChildren = function getChildren(type, before, after) {
      if (before === void 0) {
        before = null;
      }
      if (after === void 0) {
        after = null;
      }
      return _getChildren(this, type, before, after);
    };
    _proto7.resolve = function resolve(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      return resolveNode(this, pos, side, false);
    };
    _proto7.resolveInner = function resolveInner(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      return resolveNode(this, pos, side, true);
    };
    _proto7.matchContext = function matchContext(context) {
      return matchNodeContext(this.parent, context);
    };
    _proto7.enterUnfinishedNodesBefore = function enterUnfinishedNodesBefore(pos) {
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
      var _this3;
      _this3 = _BaseNode.call(this) || this;
      _this3._tree = _tree;
      _this3.from = from;
      _this3.index = index;
      _this3._parent = _parent;
      return _this3;
    }
    _inheritsLoose(_TreeNode, _BaseNode);
    var _proto8 = _TreeNode.prototype;
    _proto8.nextChild = function nextChild(i2, dir, pos, side, mode) {
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
    _proto8.childAfter = function childAfter(pos) {
      return this.nextChild(0, 1, pos, 2);
    };
    _proto8.childBefore = function childBefore(pos) {
      return this.nextChild(this._tree.children.length - 1, -1, pos, -2);
    };
    _proto8.prop = function prop(_prop3) {
      return this._tree.prop(_prop3);
    };
    _proto8.enter = function enter(pos, side, mode) {
      if (mode === void 0) {
        mode = 0;
      }
      var mounted;
      if (!(mode & IterMode.IgnoreOverlays) && (mounted = MountedTree.get(this._tree)) && mounted.overlay) {
        var rPos = pos - this.from,
          enterBracketed = mode & IterMode.EnterBracketed && mounted.bracketed;
        for (var _iterator7 = _createForOfIteratorHelperLoose(mounted.overlay), _step7; !(_step7 = _iterator7()).done;) {
          var _step7$value = _step7.value,
            from = _step7$value.from,
            to = _step7$value.to;
          if ((side > 0 || enterBracketed ? from <= rPos : from < rPos) && (side < 0 || enterBracketed ? to >= rPos : to > rPos)) return new _TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
        }
      }
      return this.nextChild(0, 1, pos, side, mode);
    };
    _proto8.nextSignificantParent = function nextSignificantParent() {
      var val = this;
      while (val.type.isAnonymous && val._parent) val = val._parent;
      return val;
    };
    _proto8.toTree = function toTree() {
      return this._tree;
    };
    _proto8.toString = function toString() {
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
    for (var p = node; i2 >= 0; p = p.parent) {
      if (!p) return false;
      if (!p.type.isAnonymous) {
        if (context[i2] && context[i2] != p.name) return false;
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
      var _this4;
      _this4 = _BaseNode2.call(this) || this;
      _this4.context = context;
      _this4._parent = _parent;
      _this4.index = index;
      _this4.type = context.buffer.set.types[context.buffer.buffer[index]];
      return _this4;
    }
    _inheritsLoose(_BufferNode, _BaseNode2);
    var _proto9 = _BufferNode.prototype;
    _proto9.child = function child(dir, pos, side) {
      var buffer = this.context.buffer;
      var index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
      return index < 0 ? null : new _BufferNode(this.context, this, index);
    };
    _proto9.childAfter = function childAfter(pos) {
      return this.child(1, pos, 2);
    };
    _proto9.childBefore = function childBefore(pos) {
      return this.child(-1, pos, -2);
    };
    _proto9.prop = function prop(_prop4) {
      return this.type.prop(_prop4);
    };
    _proto9.enter = function enter(pos, side, mode) {
      if (mode === void 0) {
        mode = 0;
      }
      if (mode & IterMode.ExcludeBuffers) return null;
      var buffer = this.context.buffer;
      var index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
      return index < 0 ? null : new _BufferNode(this.context, this, index);
    };
    _proto9.externalSibling = function externalSibling(dir) {
      return this._parent ? null : this.context.parent.nextChild(this.context.index + dir, dir, 0, 4);
    };
    _proto9.toTree = function toTree() {
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
    _proto9.toString = function toString() {
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
    for (var i2 = 1; i2 < heads.length; i2++) {
      var node = heads[i2];
      if (node.from > picked.from || node.to < picked.to) {
        picked = node;
        pick = i2;
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
    var _proto0 = TreeCursor.prototype;
    _proto0.yieldNode = function yieldNode(node) {
      if (!node) return false;
      this._tree = node;
      this.type = node.type;
      this.from = node.from;
      this.to = node.to;
      return true;
    };
    _proto0.yieldBuf = function yieldBuf(index, type) {
      this.index = index;
      var _this$buffer = this.buffer,
        start = _this$buffer.start,
        buffer = _this$buffer.buffer;
      this.type = type || buffer.set.types[buffer.buffer[index]];
      this.from = start + buffer.buffer[index + 1];
      this.to = start + buffer.buffer[index + 2];
      return true;
    };
    _proto0.yield = function _yield(node) {
      if (!node) return false;
      if (node instanceof TreeNode) {
        this.buffer = null;
        return this.yieldNode(node);
      }
      this.buffer = node.context;
      return this.yieldBuf(node.index, node.type);
    };
    _proto0.toString = function toString() {
      return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
    };
    _proto0.enterChild = function enterChild(dir, pos, side) {
      if (!this.buffer) return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
      var buffer = this.buffer.buffer;
      var index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
      if (index < 0) return false;
      this.stack.push(this.index);
      return this.yieldBuf(index);
    };
    _proto0.firstChild = function firstChild() {
      return this.enterChild(1, 0, 4);
    };
    _proto0.lastChild = function lastChild() {
      return this.enterChild(-1, 0, 4);
    };
    _proto0.childAfter = function childAfter(pos) {
      return this.enterChild(1, pos, 2);
    };
    _proto0.childBefore = function childBefore(pos) {
      return this.enterChild(-1, pos, -2);
    };
    _proto0.enter = function enter(pos, side, mode) {
      if (mode === void 0) {
        mode = this.mode;
      }
      if (!this.buffer) return this.yield(this._tree.enter(pos, side, mode));
      return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
    };
    _proto0.parent = function parent() {
      if (!this.buffer) return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
      if (this.stack.length) return this.yieldBuf(this.stack.pop());
      var parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
      this.buffer = null;
      return this.yieldNode(parent);
    };
    _proto0.sibling = function sibling(dir) {
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
    _proto0.nextSibling = function nextSibling() {
      return this.sibling(1);
    };
    _proto0.prevSibling = function prevSibling() {
      return this.sibling(-1);
    };
    _proto0.atLastNode = function atLastNode(dir) {
      var index,
        parent,
        buffer = this.buffer;
      if (buffer) {
        if (dir > 0) {
          if (this.index < buffer.buffer.buffer.length) return false;
        } else {
          for (var i2 = 0; i2 < this.index; i2++) if (buffer.buffer.buffer[i2 + 3] < this.index) return false;
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
        if (index > -1) for (var _i = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; _i != e; _i += dir) {
          var child = parent._tree.children[_i];
          if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child)) return false;
        }
      }
      return true;
    };
    _proto0.move = function move(dir, enter) {
      if (enter && this.enterChild(dir, 0, 4)) return true;
      for (;;) {
        if (this.sibling(dir)) return true;
        if (this.atLastNode(dir) || !this.parent()) return false;
      }
    };
    _proto0.next = function next(enter) {
      if (enter === void 0) {
        enter = true;
      }
      return this.move(1, enter);
    };
    _proto0.prev = function prev(enter) {
      if (enter === void 0) {
        enter = true;
      }
      return this.move(-1, enter);
    };
    _proto0.moveTo = function moveTo(pos, side) {
      if (side === void 0) {
        side = 0;
      }
      while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos)) if (!this.parent()) break;
      while (this.enterChild(1, pos, side)) {}
      return this;
    };
    _proto0.iterate = function iterate(enter, leave) {
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
    _proto0.matchContext = function matchContext(context) {
      if (!this.buffer) return matchNodeContext(this.node.parent, context);
      var buffer = this.buffer.buffer,
        types2 = buffer.set.types;
      for (var i2 = context.length - 1, d = this.stack.length - 1; i2 >= 0; d--) {
        if (d < 0) return matchNodeContext(this._tree, context, i2);
        var type = types2[buffer.buffer[this.stack[d]]];
        if (!type.isAnonymous) {
          if (context[i2] && context[i2] != type.name) return false;
          i2--;
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
        var cache2 = this.bufferNode,
          result = null,
          depth = 0;
        if (cache2 && cache2.context == this.buffer) {
          scan: for (var index = this.index, d = this.stack.length; d >= 0;) {
            for (var c = cache2; c; c = c._parent) if (c.index == index) {
              if (index == this.index) return c;
              result = c;
              depth = d + 1;
              break scan;
            }
            index = this.stack[--d];
          }
        }
        for (var i2 = depth; i2 < this.stack.length; i2++) result = new BufferNode(this.buffer, result, this.stack[i2]);
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
    var cursor2 = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
    var types2 = nodeSet.types;
    var contextHash = 0,
      lookAhead = 0;
    function takeNode(parentStart, minPos, children2, positions2, inRepeat, depth) {
      var id2 = cursor2.id,
        start = cursor2.start,
        end = cursor2.end,
        size = cursor2.size;
      var lookAheadAtStart = lookAhead,
        contextAtStart = contextHash;
      if (size < 0) {
        cursor2.next();
        if (size == -1) {
          var node2 = reused[id2];
          children2.push(node2);
          positions2.push(start - parentStart);
          return;
        } else if (size == -3) {
          contextHash = id2;
          return;
        } else if (size == -4) {
          lookAhead = id2;
          return;
        } else {
          throw new RangeError("Unrecognized record size: " + size);
        }
      }
      var type = types2[id2],
        node,
        buffer2;
      var startPos = start - parentStart;
      if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor2.pos - minPos, inRepeat))) {
        var data2 = new Uint16Array(buffer2.size - buffer2.skip);
        var endPos = cursor2.pos - buffer2.size,
          index = data2.length;
        while (cursor2.pos > endPos) index = copyToBuffer(buffer2.start, data2, index);
        node = new TreeBuffer(data2, end - buffer2.start, nodeSet);
        startPos = buffer2.start - parentStart;
      } else {
        var _endPos = cursor2.pos - size;
        cursor2.next();
        var localChildren = [],
          localPositions = [];
        var localInRepeat = id2 >= minRepeatType ? id2 : -1;
        var lastGroup = 0,
          lastEnd = end;
        while (cursor2.pos > _endPos) {
          if (localInRepeat >= 0 && cursor2.id == localInRepeat && cursor2.size >= 0) {
            if (cursor2.end <= lastEnd - maxBufferLength) {
              makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor2.end, lastEnd, localInRepeat, lookAheadAtStart, contextAtStart);
              lastGroup = localChildren.length;
              lastEnd = cursor2.end;
            }
            cursor2.next();
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
      while (cursor2.pos > minPos) {
        var id2 = cursor2.id,
          start = cursor2.start,
          end = cursor2.end,
          size = cursor2.size;
        if (size > 4) {
          cursor2.next();
        } else if (stopAt > -1 && start < stopAt) {
          break;
        } else {
          if (stopAt < 0) stopAt = end - maxBufferLength;
          nodes.push(id2, start, end);
          nodeCount++;
          cursor2.next();
        }
      }
      if (nodeCount) {
        var buffer2 = new Uint16Array(nodeCount * 4);
        var _start = nodes[nodes.length - 2];
        for (var i2 = nodes.length - 3, j = 0; i2 >= 0; i2 -= 3) {
          buffer2[j++] = nodes[i2];
          buffer2[j++] = nodes[i2 + 1] - _start;
          buffer2[j++] = nodes[i2 + 2] - _start;
          buffer2[j++] = j;
        }
        children2.push(new TreeBuffer(buffer2, nodes[2] - _start, nodeSet));
        positions2.push(_start - parentStart);
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
        var pair2 = [NodeProp.contextHash, contextHash2];
        props = props ? [pair2].concat(props) : [pair2];
      }
      if (lookAhead2 > 25) {
        var _pair = [NodeProp.lookAhead, lookAhead2];
        props = props ? [_pair].concat(props) : [_pair];
      }
      return new Tree(type, children2, positions2, length2, props);
    }
    function findBufferSize(maxSize, inRepeat) {
      var fork = cursor2.fork();
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
      var id2 = cursor2.id,
        start = cursor2.start,
        end = cursor2.end,
        size = cursor2.size;
      cursor2.next();
      if (size >= 0 && id2 < minRepeatType) {
        var startIndex = index;
        if (size > 4) {
          var endPos = cursor2.pos - (size - 4);
          while (cursor2.pos > endPos) index = copyToBuffer(bufferStart, buffer2, index);
        }
        buffer2[--index] = startIndex;
        buffer2[--index] = end - bufferStart;
        buffer2[--index] = start - bufferStart;
        buffer2[--index] = id2;
      } else if (size == -3) {
        contextHash = id2;
      } else if (size == -4) {
        lookAhead = id2;
      }
      return index;
    }
    var children = [],
      positions = [];
    while (cursor2.pos > 0) takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1, 0);
    var length = (_a2 = data.length) !== null && _a2 !== void 0 ? _a2 : children.length ? positions[0] + children[0].length : 0;
    return new Tree(types2[data.topID], children.reverse(), positions.reverse(), length);
  }
  var nodeSizeCache = new WeakMap();
  function nodeSize(balanceType, node) {
    if (!balanceType.isAnonymous || node instanceof TreeBuffer || node.type != balanceType) return 1;
    var size = nodeSizeCache.get(node);
    if (size == null) {
      size = 1;
      for (var _iterator8 = _createForOfIteratorHelperLoose(node.children), _step8; !(_step8 = _iterator8()).done;) {
        var child = _step8.value;
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
    for (var i2 = from; i2 < to; i2++) total += nodeSize(balanceType, children[i2]);
    var maxChild = Math.ceil(total * 1.5 / 8);
    var localChildren = [],
      localPositions = [];
    function divide(children2, positions2, from2, to2, offset) {
      for (var _i2 = from2; _i2 < to2;) {
        var groupFrom = _i2,
          groupStart = positions2[_i2],
          groupSize = nodeSize(balanceType, children2[_i2]);
        _i2++;
        for (; _i2 < to2; _i2++) {
          var nextSize = nodeSize(balanceType, children2[_i2]);
          if (groupSize + nextSize >= maxChild) break;
          groupSize += nextSize;
        }
        if (_i2 == groupFrom + 1) {
          if (groupSize > maxChild) {
            var only = children2[groupFrom];
            divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
            continue;
          }
          localChildren.push(children2[groupFrom]);
        } else {
          var length2 = positions2[_i2 - 1] + children2[_i2 - 1].length - groupStart;
          localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, _i2, groupStart, length2, null, mkTree));
        }
        localPositions.push(groupStart + offset - start);
      }
    }
    divide(children, positions, from, to, 0);
    return (mkTop || mkTree)(localChildren, localPositions, length);
  }
  var NodeWeakMap = function () {
    function NodeWeakMap() {
      this.map = new WeakMap();
    }
    var _proto1 = NodeWeakMap.prototype;
    _proto1.setBuffer = function setBuffer(buffer, index, value) {
      var inner = this.map.get(buffer);
      if (!inner) this.map.set(buffer, inner = new Map());
      inner.set(index, value);
    };
    _proto1.getBuffer = function getBuffer(buffer, index) {
      var inner = this.map.get(buffer);
      return inner && inner.get(index);
    };
    _proto1.set = function set(node, value) {
      if (node instanceof BufferNode) this.setBuffer(node.context.buffer, node.index, value);else if (node instanceof TreeNode) this.map.set(node.tree, value);
    };
    _proto1.get = function get(node) {
      return node instanceof BufferNode ? this.getBuffer(node.context.buffer, node.index) : node instanceof TreeNode ? this.map.get(node.tree) : void 0;
    };
    _proto1.cursorSet = function cursorSet(cursor2, value) {
      if (cursor2.buffer) this.setBuffer(cursor2.buffer.buffer, cursor2.index, value);else this.map.set(cursor2.tree, value);
    };
    _proto1.cursorGet = function cursorGet(cursor2) {
      return cursor2.buffer ? this.getBuffer(cursor2.buffer.buffer, cursor2.index) : this.map.get(cursor2.tree);
    };
    return NodeWeakMap;
  }();
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
      for (var _iterator9 = _createForOfIteratorHelperLoose(fragments), _step9; !(_step9 = _iterator9()).done;) {
        var f = _step9.value;
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
    var _proto10 = Parser.prototype;
    _proto10.startParse = function startParse(input, fragments, ranges) {
      if (typeof input == "string") input = new StringInput(input);
      ranges = !ranges ? [new Range(0, input.length)] : ranges.length ? ranges.map(function (r) {
        return new Range(r.from, r.to);
      }) : [new Range(0, 0)];
      return this.createParse(input, fragments || [], ranges);
    };
    _proto10.parse = function parse(input, fragments, ranges) {
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
    var _proto11 = StringInput.prototype;
    _proto11.chunk = function chunk(from) {
      return this.string.slice(from);
    };
    _proto11.read = function read(from, to) {
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
  function parseMixed(nest) {
    return function (parse, input, fragments, ranges) {
      return new MixedParse(parse, nest, input, fragments, ranges);
    };
  }
  var InnerParse = function InnerParse(parser4, parse, overlay, bracketed, target, from) {
    this.parser = parser4;
    this.parse = parse;
    this.overlay = overlay;
    this.bracketed = bracketed;
    this.target = target;
    this.from = from;
  };
  function checkRanges(ranges) {
    if (!ranges.length || ranges.some(function (r) {
      return r.from >= r.to;
    })) throw new RangeError("Invalid inner parse ranges given: " + JSON.stringify(ranges));
  }
  var ActiveOverlay = function ActiveOverlay(parser4, predicate, mounts, index, start, bracketed, target, prev) {
    this.parser = parser4;
    this.predicate = predicate;
    this.mounts = mounts;
    this.index = index;
    this.start = start;
    this.bracketed = bracketed;
    this.target = target;
    this.prev = prev;
    this.depth = 0;
    this.ranges = [];
  };
  var stoppedInner = new NodeProp({
    perNode: true
  });
  var MixedParse = function () {
    function MixedParse(base2, nest, input, fragments, ranges) {
      this.nest = nest;
      this.input = input;
      this.fragments = fragments;
      this.ranges = ranges;
      this.inner = [];
      this.innerDone = 0;
      this.baseTree = null;
      this.stoppedAt = null;
      this.baseParse = base2;
    }
    var _proto12 = MixedParse.prototype;
    _proto12.advance = function advance() {
      if (this.baseParse) {
        var done2 = this.baseParse.advance();
        if (!done2) return null;
        this.baseParse = null;
        this.baseTree = done2;
        this.startInner();
        if (this.stoppedAt != null) {
          for (var _iterator0 = _createForOfIteratorHelperLoose(this.inner), _step0; !(_step0 = _iterator0()).done;) {
            var inner2 = _step0.value;
            inner2.parse.stopAt(this.stoppedAt);
          }
        }
      }
      if (this.innerDone == this.inner.length) {
        var result = this.baseTree;
        if (this.stoppedAt != null) result = new Tree(result.type, result.children, result.positions, result.length, result.propValues.concat([[stoppedInner, this.stoppedAt]]));
        return result;
      }
      var inner = this.inner[this.innerDone],
        done = inner.parse.advance();
      if (done) {
        this.innerDone++;
        var props = Object.assign(Object.create(null), inner.target.props);
        props[NodeProp.mounted.id] = new MountedTree(done, inner.overlay, inner.parser, inner.bracketed);
        inner.target.props = props;
      }
      return null;
    };
    _proto12.stopAt = function stopAt(pos) {
      this.stoppedAt = pos;
      if (this.baseParse) this.baseParse.stopAt(pos);else for (var i2 = this.innerDone; i2 < this.inner.length; i2++) this.inner[i2].parse.stopAt(pos);
    };
    _proto12.startInner = function startInner() {
      var fragmentCursor = new FragmentCursor(this.fragments);
      var overlay = null;
      var covered = null;
      var cursor2 = new TreeCursor(new TreeNode(this.baseTree, this.ranges[0].from, 0, null), IterMode.IncludeAnonymous | IterMode.IgnoreMounts);
      scan: for (var nest, isCovered;;) {
        var enter = true,
          range = void 0;
        if (this.stoppedAt != null && cursor2.from >= this.stoppedAt) {
          enter = false;
        } else if (fragmentCursor.hasNode(cursor2)) {
          if (overlay) {
            var match = overlay.mounts.find(function (m) {
              return m.frag.from <= cursor2.from && m.frag.to >= cursor2.to && m.mount.overlay;
            });
            if (match) {
              var _loop = function _loop() {
                var r = _step1.value;
                var from = r.from + match.pos,
                  to = r.to + match.pos;
                if (from >= cursor2.from && to <= cursor2.to && !overlay.ranges.some(function (r2) {
                  return r2.from < to && r2.to > from;
                })) overlay.ranges.push({
                  from: from,
                  to: to
                });
              };
              for (var _iterator1 = _createForOfIteratorHelperLoose(match.mount.overlay), _step1; !(_step1 = _iterator1()).done;) {
                _loop();
              }
            }
          }
          enter = false;
        } else if (covered && (isCovered = checkCover(covered.ranges, cursor2.from, cursor2.to))) {
          enter = isCovered != 2;
        } else if (!cursor2.type.isAnonymous && (nest = this.nest(cursor2, this.input)) && (cursor2.from < cursor2.to || !nest.overlay)) {
          if (!cursor2.tree) {
            materialize(cursor2);
            if (overlay) overlay.depth++;
            if (covered) covered.depth++;
          }
          var oldMounts = fragmentCursor.findMounts(cursor2.from, nest.parser);
          if (typeof nest.overlay == "function") {
            overlay = new ActiveOverlay(nest.parser, nest.overlay, oldMounts, this.inner.length, cursor2.from, !!nest.bracketed, cursor2.tree, overlay);
          } else {
            var ranges = punchRanges(this.ranges, nest.overlay || (cursor2.from < cursor2.to ? [new Range(cursor2.from, cursor2.to)] : []));
            if (ranges.length) checkRanges(ranges);
            if (ranges.length || !nest.overlay) this.inner.push(new InnerParse(nest.parser, ranges.length ? nest.parser.startParse(this.input, enterFragments(oldMounts, ranges), ranges) : nest.parser.startParse(""), nest.overlay ? nest.overlay.map(function (r) {
              return new Range(r.from - cursor2.from, r.to - cursor2.from);
            }) : null, !!nest.bracketed, cursor2.tree, ranges.length ? ranges[0].from : cursor2.from));
            if (!nest.overlay) enter = false;else if (ranges.length) covered = {
              ranges: ranges,
              depth: 0,
              prev: covered
            };
          }
        } else if (overlay && (range = overlay.predicate(cursor2))) {
          if (range === true) range = new Range(cursor2.from, cursor2.to);
          if (range.from < range.to) {
            var last = overlay.ranges.length - 1;
            if (last >= 0 && overlay.ranges[last].to == range.from) overlay.ranges[last] = {
              from: overlay.ranges[last].from,
              to: range.to
            };else overlay.ranges.push(range);
          }
        }
        if (enter && cursor2.firstChild()) {
          if (overlay) overlay.depth++;
          if (covered) covered.depth++;
        } else {
          for (;;) {
            if (cursor2.nextSibling()) break;
            if (!cursor2.parent()) break scan;
            if (overlay && ! --overlay.depth) {
              var _ranges = punchRanges(this.ranges, overlay.ranges);
              if (_ranges.length) {
                checkRanges(_ranges);
                this.inner.splice(overlay.index, 0, new InnerParse(overlay.parser, overlay.parser.startParse(this.input, enterFragments(overlay.mounts, _ranges), _ranges), overlay.ranges.map(function (r) {
                  return new Range(r.from - overlay.start, r.to - overlay.start);
                }), overlay.bracketed, overlay.target, _ranges[0].from));
              }
              overlay = overlay.prev;
            }
            if (covered && ! --covered.depth) covered = covered.prev;
          }
        }
      }
    };
    return _createClass(MixedParse, [{
      key: "parsedPos",
      get: function get() {
        if (this.baseParse) return 0;
        var pos = this.input.length;
        for (var i2 = this.innerDone; i2 < this.inner.length; i2++) {
          if (this.inner[i2].from < pos) pos = Math.min(pos, this.inner[i2].parse.parsedPos);
        }
        return pos;
      }
    }]);
  }();
  function checkCover(covered, from, to) {
    for (var _iterator10 = _createForOfIteratorHelperLoose(covered), _step10; !(_step10 = _iterator10()).done;) {
      var range = _step10.value;
      if (range.from >= to) break;
      if (range.to > from) return range.from <= from && range.to >= to ? 2 : 1;
    }
    return 0;
  }
  function sliceBuf(buf, startI, endI, nodes, positions, off) {
    if (startI < endI) {
      var from = buf.buffer[startI + 1];
      nodes.push(buf.slice(startI, endI, from));
      positions.push(from - off);
    }
  }
  function materialize(cursor2) {
    var node = cursor2.node,
      stack = [];
    var buffer = node.context.buffer;
    do {
      stack.push(cursor2.index);
      cursor2.parent();
    } while (!cursor2.tree);
    var base2 = cursor2.tree,
      i2 = base2.children.indexOf(buffer);
    var buf = base2.children[i2],
      b = buf.buffer,
      newStack = [i2];
    function split(startI, endI, type, innerOffset, length, stackPos) {
      var targetI = stack[stackPos];
      var children = [],
        positions = [];
      sliceBuf(buf, startI, targetI, children, positions, innerOffset);
      var from = b[targetI + 1],
        to = b[targetI + 2];
      newStack.push(children.length);
      var child = stackPos ? split(targetI + 4, b[targetI + 3], buf.set.types[b[targetI]], from, to - from, stackPos - 1) : node.toTree();
      children.push(child);
      positions.push(from - innerOffset);
      sliceBuf(buf, b[targetI + 3], endI, children, positions, innerOffset);
      return new Tree(type, children, positions, length);
    }
    base2.children[i2] = split(0, b.length, NodeType.none, 0, buf.length, stack.length - 1);
    for (var _i3 = 0, _newStack = newStack; _i3 < _newStack.length; _i3++) {
      var index = _newStack[_i3];
      var tree = cursor2.tree.children[index],
        pos = cursor2.tree.positions[index];
      cursor2.yield(new TreeNode(tree, pos + cursor2.from, index, cursor2._tree));
    }
  }
  var StructureCursor = function () {
    function StructureCursor(root, offset) {
      this.offset = offset;
      this.done = false;
      this.cursor = root.cursor(IterMode.IncludeAnonymous | IterMode.IgnoreMounts);
    }
    var _proto13 = StructureCursor.prototype;
    _proto13.moveTo = function moveTo(pos) {
      var cursor2 = this.cursor,
        p = pos - this.offset;
      while (!this.done && cursor2.from < p) {
        if (cursor2.to >= pos && cursor2.enter(p, 1, IterMode.IgnoreOverlays | IterMode.ExcludeBuffers)) ;else if (cursor2.to <= pos) {
          if (!cursor2.next(false)) this.done = true;
        } else {
          break;
        }
      }
    };
    _proto13.hasNode = function hasNode(cursor2) {
      this.moveTo(cursor2.from);
      if (!this.done && this.cursor.from + this.offset == cursor2.from && this.cursor.tree) {
        for (var tree = this.cursor.tree;;) {
          if (tree == cursor2.tree) return true;
          if (tree.children.length && tree.positions[0] == 0 && tree.children[0] instanceof Tree) tree = tree.children[0];else break;
        }
      }
      return false;
    };
    return StructureCursor;
  }();
  var FragmentCursor = function () {
    function FragmentCursor(fragments) {
      var _a2;
      this.fragments = fragments;
      this.curTo = 0;
      this.fragI = 0;
      if (fragments.length) {
        var first = this.curFrag = fragments[0];
        this.curTo = (_a2 = first.tree.prop(stoppedInner)) !== null && _a2 !== void 0 ? _a2 : first.to;
        this.inner = new StructureCursor(first.tree, -first.offset);
      } else {
        this.curFrag = this.inner = null;
      }
    }
    var _proto14 = FragmentCursor.prototype;
    _proto14.hasNode = function hasNode(node) {
      while (this.curFrag && node.from >= this.curTo) this.nextFrag();
      return this.curFrag && this.curFrag.from <= node.from && this.curTo >= node.to && this.inner.hasNode(node);
    };
    _proto14.nextFrag = function nextFrag() {
      var _a2;
      this.fragI++;
      if (this.fragI == this.fragments.length) {
        this.curFrag = this.inner = null;
      } else {
        var frag = this.curFrag = this.fragments[this.fragI];
        this.curTo = (_a2 = frag.tree.prop(stoppedInner)) !== null && _a2 !== void 0 ? _a2 : frag.to;
        this.inner = new StructureCursor(frag.tree, -frag.offset);
      }
    };
    _proto14.findMounts = function findMounts(pos, parser4) {
      var _a2;
      var result = [];
      if (this.inner) {
        this.inner.cursor.moveTo(pos, 1);
        for (var pos2 = this.inner.cursor.node; pos2; pos2 = pos2.parent) {
          var mount = (_a2 = pos2.tree) === null || _a2 === void 0 ? void 0 : _a2.prop(NodeProp.mounted);
          if (mount && mount.parser == parser4) {
            for (var i2 = this.fragI; i2 < this.fragments.length; i2++) {
              var frag = this.fragments[i2];
              if (frag.from >= pos2.to) break;
              if (frag.tree == this.curFrag.tree) result.push({
                frag: frag,
                pos: pos2.from - frag.offset,
                mount: mount
              });
            }
          }
        }
      }
      return result;
    };
    return FragmentCursor;
  }();
  function punchRanges(outer, ranges) {
    var copy = null,
      current = ranges;
    for (var i2 = 1, j = 0; i2 < outer.length; i2++) {
      var gapFrom = outer[i2 - 1].to,
        gapTo = outer[i2].from;
      for (; j < current.length; j++) {
        var r = current[j];
        if (r.from >= gapTo) break;
        if (r.to <= gapFrom) continue;
        if (!copy) current = copy = ranges.slice();
        if (r.from < gapFrom) {
          copy[j] = new Range(r.from, gapFrom);
          if (r.to > gapTo) copy.splice(j + 1, 0, new Range(gapTo, r.to));
        } else if (r.to > gapTo) {
          copy[j--] = new Range(gapTo, r.to);
        } else {
          copy.splice(j--, 1);
        }
      }
    }
    return current;
  }
  function findCoverChanges(a, b, from, to) {
    var iA = 0,
      iB = 0,
      inA = false,
      inB = false,
      pos = -1e9;
    var result = [];
    for (;;) {
      var nextA = iA == a.length ? 1e9 : inA ? a[iA].to : a[iA].from;
      var nextB = iB == b.length ? 1e9 : inB ? b[iB].to : b[iB].from;
      if (inA != inB) {
        var start = Math.max(pos, from),
          end = Math.min(nextA, nextB, to);
        if (start < end) result.push(new Range(start, end));
      }
      pos = Math.min(nextA, nextB);
      if (pos == 1e9) break;
      if (nextA == pos) {
        if (!inA) inA = true;else {
          inA = false;
          iA++;
        }
      }
      if (nextB == pos) {
        if (!inB) inB = true;else {
          inB = false;
          iB++;
        }
      }
    }
    return result;
  }
  function enterFragments(mounts, ranges) {
    var result = [];
    var _loop2 = function _loop2() {
      var _step11$value = _step11.value,
        pos = _step11$value.pos,
        mount = _step11$value.mount,
        frag = _step11$value.frag;
      var startPos = pos + (mount.overlay ? mount.overlay[0].from : 0),
        endPos = startPos + mount.tree.length;
      var from = Math.max(frag.from, startPos),
        to = Math.min(frag.to, endPos);
      if (mount.overlay) {
        var overlay = mount.overlay.map(function (r) {
          return new Range(r.from + pos, r.to + pos);
        });
        var changes = findCoverChanges(ranges, overlay, from, to);
        for (var i2 = 0, pos2 = from;; i2++) {
          var last = i2 == changes.length,
            end = last ? to : changes[i2].from;
          if (end > pos2) result.push(new TreeFragment(pos2, end, mount.tree, -startPos, frag.from >= pos2 || frag.openStart, frag.to <= end || frag.openEnd));
          if (last) break;
          pos2 = changes[i2].to;
        }
      } else {
        result.push(new TreeFragment(from, to, mount.tree, -startPos, frag.from >= startPos || frag.openStart, frag.to <= endPos || frag.openEnd));
      }
    };
    for (var _iterator11 = _createForOfIteratorHelperLoose(mounts), _step11; !(_step11 = _iterator11()).done;) {
      _loop2();
    }
    return result;
  }
  var Stack = function () {
    function _Stack(p, stack, state, reducePos, pos, score, buffer, bufferBase, curContext, lookAhead, parent) {
      if (lookAhead === void 0) {
        lookAhead = 0;
      }
      this.p = p;
      this.stack = stack;
      this.state = state;
      this.reducePos = reducePos;
      this.pos = pos;
      this.score = score;
      this.buffer = buffer;
      this.bufferBase = bufferBase;
      this.curContext = curContext;
      this.lookAhead = lookAhead;
      this.parent = parent;
    }
    var _proto15 = _Stack.prototype;
    _proto15.toString = function toString() {
      return "[" + this.stack.filter(function (_, i2) {
        return i2 % 3 == 0;
      }).concat(this.state) + "]@" + this.pos + (this.score ? "!" + this.score : "");
    };
    _Stack.start = function start(p, state, pos) {
      if (pos === void 0) {
        pos = 0;
      }
      var cx = p.parser.context;
      return new _Stack(p, [], state, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, 0, null);
    };
    _proto15.pushState = function pushState(state, start) {
      this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
      this.state = state;
    };
    _proto15.reduce = function reduce(action) {
      var _a2;
      var depth = action >> 19,
        type = action & 65535;
      var parser4 = this.p.parser;
      var lookaheadRecord = this.reducePos < this.pos - 25 && this.setLookAhead(this.pos);
      var dPrec = parser4.dynamicPrecedence(type);
      if (dPrec) this.score += dPrec;
      if (depth == 0) {
        if (type < parser4.minRepeatTerm && this.reducePos < this.pos) this.reducePos = this.pos;
        this.pushState(parser4.getGoto(this.state, type, true), this.reducePos);
        if (type < parser4.minRepeatTerm) this.storeNode(type, this.reducePos, this.reducePos, lookaheadRecord ? 8 : 4, true);
        this.reduceContext(type, this.reducePos);
        return;
      }
      var base2 = this.stack.length - (depth - 1) * 3 - (action & 262144 ? 6 : 0);
      var start = base2 ? this.stack[base2 - 2] : this.p.ranges[0].from;
      if (type < parser4.minRepeatTerm && start == this.reducePos && this.reducePos < this.pos) this.reducePos = this.pos;
      var size = this.reducePos - start;
      if (size >= 2e3 && !((_a2 = this.p.parser.nodeSet.types[type]) === null || _a2 === void 0 ? void 0 : _a2.isAnonymous)) {
        if (start == this.p.lastBigReductionStart) {
          this.p.bigReductionCount++;
          this.p.lastBigReductionSize = size;
        } else if (this.p.lastBigReductionSize < size) {
          this.p.bigReductionCount = 1;
          this.p.lastBigReductionStart = start;
          this.p.lastBigReductionSize = size;
        }
      }
      var bufferBase = base2 ? this.stack[base2 - 1] : 0,
        count = this.bufferBase + this.buffer.length - bufferBase;
      if (type < parser4.minRepeatTerm || action & 131072) {
        var pos = parser4.stateFlag(this.state, 1) ? this.pos : this.reducePos;
        this.storeNode(type, start, pos, count + 4, true);
      }
      if (action & 262144) {
        this.state = this.stack[base2];
      } else {
        var baseStateID = this.stack[base2 - 3];
        this.state = parser4.getGoto(baseStateID, type, true);
      }
      while (this.stack.length > base2) this.stack.pop();
      this.reduceContext(type, start);
    };
    _proto15.storeNode = function storeNode(term, start, end, size, mustSink) {
      if (size === void 0) {
        size = 4;
      }
      if (mustSink === void 0) {
        mustSink = false;
      }
      if (term == 0 && (!this.stack.length || this.stack[this.stack.length - 1] < this.buffer.length + this.bufferBase)) {
        var top2 = this.buffer.length;
        if (top2 > 0 && this.buffer[top2 - 4] == 0 && this.buffer[top2 - 1] > -1) {
          if (start == end) return;
          if (this.buffer[top2 - 2] >= start) {
            this.buffer[top2 - 2] = end;
            return;
          }
        }
      }
      if (!mustSink || this.pos == end) {
        this.buffer.push(term, start, end, size);
      } else {
        var index = this.buffer.length;
        if (index > 0 && (this.buffer[index - 4] != 0 || this.buffer[index - 1] < 0)) {
          var mustMove = false;
          for (var scan = index; scan > 0 && this.buffer[scan - 2] > end; scan -= 4) {
            if (this.buffer[scan - 1] >= 0) {
              mustMove = true;
              break;
            }
          }
          if (mustMove) while (index > 0 && this.buffer[index - 2] > end) {
            this.buffer[index] = this.buffer[index - 4];
            this.buffer[index + 1] = this.buffer[index - 3];
            this.buffer[index + 2] = this.buffer[index - 2];
            this.buffer[index + 3] = this.buffer[index - 1];
            index -= 4;
            if (size > 4) size -= 4;
          }
        }
        this.buffer[index] = term;
        this.buffer[index + 1] = start;
        this.buffer[index + 2] = end;
        this.buffer[index + 3] = size;
      }
    };
    _proto15.shift = function shift(action, type, start, end) {
      if (action & 131072) {
        this.pushState(action & 65535, this.pos);
      } else if ((action & 262144) == 0) {
        var nextState = action,
          parser4 = this.p.parser;
        this.pos = end;
        var skipped = parser4.stateFlag(nextState, 1);
        if (!skipped && (end > start || type <= parser4.maxNode)) this.reducePos = end;
        this.pushState(nextState, skipped ? start : Math.min(start, this.reducePos));
        this.shiftContext(type, start);
        if (type <= parser4.maxNode) this.buffer.push(type, start, end, 4);
      } else {
        this.pos = end;
        this.shiftContext(type, start);
        if (type <= this.p.parser.maxNode) this.buffer.push(type, start, end, 4);
      }
    };
    _proto15.apply = function apply(action, next, nextStart, nextEnd) {
      if (action & 65536) this.reduce(action);else this.shift(action, next, nextStart, nextEnd);
    };
    _proto15.useNode = function useNode(value, next) {
      var index = this.p.reused.length - 1;
      if (index < 0 || this.p.reused[index] != value) {
        this.p.reused.push(value);
        index++;
      }
      var start = this.pos;
      this.reducePos = this.pos = start + value.length;
      this.pushState(next, start);
      this.buffer.push(index, start, this.reducePos, -1);
      if (this.curContext) this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this, this.p.stream.reset(this.pos - value.length)));
    };
    _proto15.split = function split() {
      var parent = this;
      var off = parent.buffer.length;
      if (off && parent.buffer[off - 4] == 0) off -= 4;
      while (off > 0 && parent.buffer[off - 2] > parent.reducePos) off -= 4;
      var buffer = parent.buffer.slice(off),
        base2 = parent.bufferBase + off;
      while (parent && base2 == parent.bufferBase) parent = parent.parent;
      return new _Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base2, this.curContext, this.lookAhead, parent);
    };
    _proto15.recoverByDelete = function recoverByDelete(next, nextEnd) {
      var isNode = next <= this.p.parser.maxNode;
      if (isNode) this.storeNode(next, this.pos, nextEnd, 4);
      this.storeNode(0, this.pos, nextEnd, isNode ? 8 : 4);
      this.pos = this.reducePos = nextEnd;
      this.score -= 190;
    };
    _proto15.canShift = function canShift(term) {
      for (var sim = new SimulatedStack(this);;) {
        var action = this.p.parser.stateSlot(sim.state, 4) || this.p.parser.hasAction(sim.state, term);
        if (action == 0) return false;
        if ((action & 65536) == 0) return true;
        sim.reduce(action);
      }
    };
    _proto15.recoverByInsert = function recoverByInsert(next) {
      if (this.stack.length >= 300) return [];
      var nextStates = this.p.parser.nextStates(this.state);
      if (nextStates.length > 4 << 1 || this.stack.length >= 120) {
        var best = [];
        for (var i2 = 0, s; i2 < nextStates.length; i2 += 2) {
          if ((s = nextStates[i2 + 1]) != this.state && this.p.parser.hasAction(s, next)) best.push(nextStates[i2], s);
        }
        if (this.stack.length < 120) {
          var _loop3 = function _loop3() {
            var s = nextStates[_i4 + 1];
            if (!best.some(function (v, i3) {
              return i3 & 1 && v == s;
            })) best.push(nextStates[_i4], s);
          };
          for (var _i4 = 0; best.length < 4 << 1 && _i4 < nextStates.length; _i4 += 2) {
            _loop3();
          }
        }
        nextStates = best;
      }
      var result = [];
      for (var _i5 = 0; _i5 < nextStates.length && result.length < 4; _i5 += 2) {
        var _s = nextStates[_i5 + 1];
        if (_s == this.state) continue;
        var stack = this.split();
        stack.pushState(_s, this.pos);
        stack.storeNode(0, stack.pos, stack.pos, 4, true);
        stack.shiftContext(nextStates[_i5], this.pos);
        stack.reducePos = this.pos;
        stack.score -= 200;
        result.push(stack);
      }
      return result;
    };
    _proto15.forceReduce = function forceReduce() {
      var parser4 = this.p.parser;
      var reduce = parser4.stateSlot(this.state, 5);
      if ((reduce & 65536) == 0) return false;
      if (!parser4.validAction(this.state, reduce)) {
        var depth = reduce >> 19,
          term = reduce & 65535;
        var target = this.stack.length - depth * 3;
        if (target < 0 || parser4.getGoto(this.stack[target], term, false) < 0) {
          var backup = this.findForcedReduction();
          if (backup == null) return false;
          reduce = backup;
        }
        this.storeNode(0, this.pos, this.pos, 4, true);
        this.score -= 100;
      }
      this.reducePos = this.pos;
      this.reduce(reduce);
      return true;
    };
    _proto15.findForcedReduction = function findForcedReduction() {
      var _this5 = this;
      var parser4 = this.p.parser,
        seen = [];
      var _explore = function explore(state, depth) {
        if (seen.includes(state)) return;
        seen.push(state);
        return parser4.allActions(state, function (action) {
          if (action & (262144 | 131072)) ;else if (action & 65536) {
            var rDepth = (action >> 19) - depth;
            if (rDepth > 1) {
              var term = action & 65535,
                target = _this5.stack.length - rDepth * 3;
              if (target >= 0 && parser4.getGoto(_this5.stack[target], term, false) >= 0) return rDepth << 19 | 65536 | term;
            }
          } else {
            var found = _explore(action, depth + 1);
            if (found != null) return found;
          }
        });
      };
      return _explore(this.state, 0);
    };
    _proto15.forceAll = function forceAll() {
      while (!this.p.parser.stateFlag(this.state, 2)) {
        if (!this.forceReduce()) {
          this.storeNode(0, this.pos, this.pos, 4, true);
          break;
        }
      }
      return this;
    };
    _proto15.restart = function restart() {
      this.storeNode(0, this.pos, this.pos, 4, true);
      this.state = this.stack[0];
      this.stack.length = 0;
    };
    _proto15.sameState = function sameState(other) {
      if (this.state != other.state || this.stack.length != other.stack.length) return false;
      for (var i2 = 0; i2 < this.stack.length; i2 += 3) if (this.stack[i2] != other.stack[i2]) return false;
      return true;
    };
    _proto15.dialectEnabled = function dialectEnabled(dialectID) {
      return this.p.parser.dialect.flags[dialectID];
    };
    _proto15.shiftContext = function shiftContext(term, start) {
      if (this.curContext) this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this, this.p.stream.reset(start)));
    };
    _proto15.reduceContext = function reduceContext(term, start) {
      if (this.curContext) this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this, this.p.stream.reset(start)));
    };
    _proto15.emitContext = function emitContext() {
      var last = this.buffer.length - 1;
      if (last < 0 || this.buffer[last] != -3) this.buffer.push(this.curContext.hash, this.pos, this.pos, -3);
    };
    _proto15.emitLookAhead = function emitLookAhead() {
      var last = this.buffer.length - 1;
      if (last < 0 || this.buffer[last] != -4) this.buffer.push(this.lookAhead, this.pos, this.pos, -4);
    };
    _proto15.updateContext = function updateContext(context) {
      if (context != this.curContext.context) {
        var newCx = new StackContext(this.curContext.tracker, context);
        if (newCx.hash != this.curContext.hash) this.emitContext();
        this.curContext = newCx;
      }
    };
    _proto15.setLookAhead = function setLookAhead(lookAhead) {
      if (lookAhead <= this.lookAhead) return false;
      this.emitLookAhead();
      this.lookAhead = lookAhead;
      return true;
    };
    _proto15.close = function close() {
      if (this.curContext && this.curContext.tracker.strict) this.emitContext();
      if (this.lookAhead > 0) this.emitLookAhead();
    };
    return _createClass(_Stack, [{
      key: "context",
      get: function get() {
        return this.curContext ? this.curContext.context : null;
      }
    }, {
      key: "deadEnd",
      get: function get() {
        if (this.stack.length != 3) return false;
        var parser4 = this.p.parser;
        return parser4.data[parser4.stateSlot(this.state, 1)] == 65535 && !parser4.stateSlot(this.state, 4);
      }
    }, {
      key: "parser",
      get: function get() {
        return this.p.parser;
      }
    }]);
  }();
  var StackContext = function StackContext(tracker, context) {
    this.tracker = tracker;
    this.context = context;
    this.hash = tracker.strict ? tracker.hash(context) : 0;
  };
  var SimulatedStack = function () {
    function SimulatedStack(start) {
      this.start = start;
      this.state = start.state;
      this.stack = start.stack;
      this.base = this.stack.length;
    }
    var _proto16 = SimulatedStack.prototype;
    _proto16.reduce = function reduce(action) {
      var term = action & 65535,
        depth = action >> 19;
      if (depth == 0) {
        if (this.stack == this.start.stack) this.stack = this.stack.slice();
        this.stack.push(this.state, 0, 0);
        this.base += 3;
      } else {
        this.base -= (depth - 1) * 3;
      }
      var goto = this.start.p.parser.getGoto(this.stack[this.base - 3], term, true);
      this.state = goto;
    };
    return SimulatedStack;
  }();
  var StackBufferCursor = function () {
    function _StackBufferCursor(stack, pos, index) {
      this.stack = stack;
      this.pos = pos;
      this.index = index;
      this.buffer = stack.buffer;
      if (this.index == 0) this.maybeNext();
    }
    _StackBufferCursor.create = function create(stack, pos) {
      if (pos === void 0) {
        pos = stack.bufferBase + stack.buffer.length;
      }
      return new _StackBufferCursor(stack, pos, pos - stack.bufferBase);
    };
    var _proto17 = _StackBufferCursor.prototype;
    _proto17.maybeNext = function maybeNext() {
      var next = this.stack.parent;
      if (next != null) {
        this.index = this.stack.bufferBase - next.bufferBase;
        this.stack = next;
        this.buffer = next.buffer;
      }
    };
    _proto17.next = function next() {
      this.index -= 4;
      this.pos -= 4;
      if (this.index == 0) this.maybeNext();
    };
    _proto17.fork = function fork() {
      return new _StackBufferCursor(this.stack, this.pos, this.index);
    };
    return _createClass(_StackBufferCursor, [{
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
    }]);
  }();
  function decodeArray(input, Type) {
    if (Type === void 0) {
      Type = Uint16Array;
    }
    if (typeof input != "string") return input;
    var array = null;
    for (var pos = 0, out = 0; pos < input.length;) {
      var value = 0;
      for (;;) {
        var next = input.charCodeAt(pos++),
          stop = false;
        if (next == 126) {
          value = 65535;
          break;
        }
        if (next >= 92) next--;
        if (next >= 34) next--;
        var digit = next - 32;
        if (digit >= 46) {
          digit -= 46;
          stop = true;
        }
        value += digit;
        if (stop) break;
        value *= 46;
      }
      if (array) array[out++] = value;else array = new Type(value);
    }
    return array;
  }
  var CachedToken = function CachedToken() {
    this.start = -1;
    this.value = -1;
    this.end = -1;
    this.extended = -1;
    this.lookAhead = 0;
    this.mask = 0;
    this.context = 0;
  };
  var nullToken = new CachedToken();
  var InputStream = function () {
    function InputStream(input, ranges) {
      this.input = input;
      this.ranges = ranges;
      this.chunk = "";
      this.chunkOff = 0;
      this.chunk2 = "";
      this.chunk2Pos = 0;
      this.next = -1;
      this.token = nullToken;
      this.rangeIndex = 0;
      this.pos = this.chunkPos = ranges[0].from;
      this.range = ranges[0];
      this.end = ranges[ranges.length - 1].to;
      this.readNext();
    }
    var _proto18 = InputStream.prototype;
    _proto18.resolveOffset = function resolveOffset(offset, assoc) {
      var range = this.range,
        index = this.rangeIndex;
      var pos = this.pos + offset;
      while (pos < range.from) {
        if (!index) return null;
        var next = this.ranges[--index];
        pos -= range.from - next.to;
        range = next;
      }
      while (assoc < 0 ? pos > range.to : pos >= range.to) {
        if (index == this.ranges.length - 1) return null;
        var _next = this.ranges[++index];
        pos += _next.from - range.to;
        range = _next;
      }
      return pos;
    };
    _proto18.clipPos = function clipPos(pos) {
      if (pos >= this.range.from && pos < this.range.to) return pos;
      for (var _iterator12 = _createForOfIteratorHelperLoose(this.ranges), _step12; !(_step12 = _iterator12()).done;) {
        var range = _step12.value;
        if (range.to > pos) return Math.max(pos, range.from);
      }
      return this.end;
    };
    _proto18.peek = function peek(offset) {
      var idx = this.chunkOff + offset,
        pos,
        result;
      if (idx >= 0 && idx < this.chunk.length) {
        pos = this.pos + offset;
        result = this.chunk.charCodeAt(idx);
      } else {
        var resolved = this.resolveOffset(offset, 1);
        if (resolved == null) return -1;
        pos = resolved;
        if (pos >= this.chunk2Pos && pos < this.chunk2Pos + this.chunk2.length) {
          result = this.chunk2.charCodeAt(pos - this.chunk2Pos);
        } else {
          var i2 = this.rangeIndex,
            range = this.range;
          while (range.to <= pos) range = this.ranges[++i2];
          this.chunk2 = this.input.chunk(this.chunk2Pos = pos);
          if (pos + this.chunk2.length > range.to) this.chunk2 = this.chunk2.slice(0, range.to - pos);
          result = this.chunk2.charCodeAt(0);
        }
      }
      if (pos >= this.token.lookAhead) this.token.lookAhead = pos + 1;
      return result;
    };
    _proto18.acceptToken = function acceptToken(token, endOffset) {
      if (endOffset === void 0) {
        endOffset = 0;
      }
      var end = endOffset ? this.resolveOffset(endOffset, -1) : this.pos;
      if (end == null || end < this.token.start) throw new RangeError("Token end out of bounds");
      this.token.value = token;
      this.token.end = end;
    };
    _proto18.acceptTokenTo = function acceptTokenTo(token, endPos) {
      this.token.value = token;
      this.token.end = endPos;
    };
    _proto18.getChunk = function getChunk() {
      if (this.pos >= this.chunk2Pos && this.pos < this.chunk2Pos + this.chunk2.length) {
        var chunk = this.chunk,
          chunkPos = this.chunkPos;
        this.chunk = this.chunk2;
        this.chunkPos = this.chunk2Pos;
        this.chunk2 = chunk;
        this.chunk2Pos = chunkPos;
        this.chunkOff = this.pos - this.chunkPos;
      } else {
        this.chunk2 = this.chunk;
        this.chunk2Pos = this.chunkPos;
        var nextChunk = this.input.chunk(this.pos);
        var end = this.pos + nextChunk.length;
        this.chunk = end > this.range.to ? nextChunk.slice(0, this.range.to - this.pos) : nextChunk;
        this.chunkPos = this.pos;
        this.chunkOff = 0;
      }
    };
    _proto18.readNext = function readNext() {
      if (this.chunkOff >= this.chunk.length) {
        this.getChunk();
        if (this.chunkOff == this.chunk.length) return this.next = -1;
      }
      return this.next = this.chunk.charCodeAt(this.chunkOff);
    };
    _proto18.advance = function advance(n) {
      if (n === void 0) {
        n = 1;
      }
      this.chunkOff += n;
      while (this.pos + n >= this.range.to) {
        if (this.rangeIndex == this.ranges.length - 1) return this.setDone();
        n -= this.range.to - this.pos;
        this.range = this.ranges[++this.rangeIndex];
        this.pos = this.range.from;
      }
      this.pos += n;
      if (this.pos >= this.token.lookAhead) this.token.lookAhead = this.pos + 1;
      return this.readNext();
    };
    _proto18.setDone = function setDone() {
      this.pos = this.chunkPos = this.end;
      this.range = this.ranges[this.rangeIndex = this.ranges.length - 1];
      this.chunk = "";
      return this.next = -1;
    };
    _proto18.reset = function reset(pos, token) {
      if (token) {
        this.token = token;
        token.start = pos;
        token.lookAhead = pos + 1;
        token.value = token.extended = -1;
      } else {
        this.token = nullToken;
      }
      if (this.pos != pos) {
        this.pos = pos;
        if (pos == this.end) {
          this.setDone();
          return this;
        }
        while (pos < this.range.from) this.range = this.ranges[--this.rangeIndex];
        while (pos >= this.range.to) this.range = this.ranges[++this.rangeIndex];
        if (pos >= this.chunkPos && pos < this.chunkPos + this.chunk.length) {
          this.chunkOff = pos - this.chunkPos;
        } else {
          this.chunk = "";
          this.chunkOff = 0;
        }
        this.readNext();
      }
      return this;
    };
    _proto18.read = function read(from, to) {
      if (from >= this.chunkPos && to <= this.chunkPos + this.chunk.length) return this.chunk.slice(from - this.chunkPos, to - this.chunkPos);
      if (from >= this.chunk2Pos && to <= this.chunk2Pos + this.chunk2.length) return this.chunk2.slice(from - this.chunk2Pos, to - this.chunk2Pos);
      if (from >= this.range.from && to <= this.range.to) return this.input.read(from, to);
      var result = "";
      for (var _iterator13 = _createForOfIteratorHelperLoose(this.ranges), _step13; !(_step13 = _iterator13()).done;) {
        var r = _step13.value;
        if (r.from >= to) break;
        if (r.to > from) result += this.input.read(Math.max(r.from, from), Math.min(r.to, to));
      }
      return result;
    };
    return InputStream;
  }();
  var TokenGroup = function () {
    function TokenGroup(data, id2) {
      this.data = data;
      this.id = id2;
    }
    var _proto19 = TokenGroup.prototype;
    _proto19.token = function token(input, stack) {
      var parser4 = stack.p.parser;
      readToken(this.data, input, stack, this.id, parser4.data, parser4.tokenPrecTable);
    };
    return TokenGroup;
  }();
  TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
  var LocalTokenGroup = function () {
    function LocalTokenGroup(data, precTable, elseToken) {
      this.precTable = precTable;
      this.elseToken = elseToken;
      this.data = typeof data == "string" ? decodeArray(data) : data;
    }
    var _proto20 = LocalTokenGroup.prototype;
    _proto20.token = function token(input, stack) {
      var start = input.pos,
        skipped = 0;
      for (;;) {
        var atEof = input.next < 0,
          nextPos = input.resolveOffset(1, 1);
        readToken(this.data, input, stack, 0, this.data, this.precTable);
        if (input.token.value > -1) break;
        if (this.elseToken == null) return;
        if (!atEof) skipped++;
        if (nextPos == null) break;
        input.reset(nextPos, input.token);
      }
      if (skipped) {
        input.reset(start, input.token);
        input.acceptToken(this.elseToken, skipped);
      }
    };
    return LocalTokenGroup;
  }();
  LocalTokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
  var ExternalTokenizer = function ExternalTokenizer(token, options) {
    if (options === void 0) {
      options = {};
    }
    this.token = token;
    this.contextual = !!options.contextual;
    this.fallback = !!options.fallback;
    this.extend = !!options.extend;
  };
  function readToken(data, input, stack, group, precTable, precOffset) {
    var state = 0,
      groupMask = 1 << group,
      dialect = stack.p.parser.dialect;
    scan: for (;;) {
      if ((groupMask & data[state]) == 0) break;
      var accEnd = data[state + 1];
      for (var i2 = state + 3; i2 < accEnd; i2 += 2) if ((data[i2 + 1] & groupMask) > 0) {
        var term = data[i2];
        if (dialect.allows(term) && (input.token.value == -1 || input.token.value == term || overrides(term, input.token.value, precTable, precOffset))) {
          input.acceptToken(term);
          break;
        }
      }
      var next = input.next,
        low = 0,
        high = data[state + 2];
      if (input.next < 0 && high > low && data[accEnd + high * 3 - 3] == 65535) {
        state = data[accEnd + high * 3 - 1];
        continue scan;
      }
      for (; low < high;) {
        var mid = low + high >> 1;
        var index = accEnd + mid + (mid << 1);
        var from = data[index],
          to = data[index + 1] || 65536;
        if (next < from) high = mid;else if (next >= to) low = mid + 1;else {
          state = data[index + 2];
          input.advance();
          continue scan;
        }
      }
      break;
    }
  }
  function findOffset(data, start, term) {
    for (var i2 = start, next; (next = data[i2]) != 65535; i2++) if (next == term) return i2 - start;
    return -1;
  }
  function overrides(token, prev, tableData, tableOffset) {
    var iPrev = findOffset(tableData, tableOffset, prev);
    return iPrev < 0 || findOffset(tableData, tableOffset, token) < iPrev;
  }
  var verbose = typeof process != "undefined" && process.env && /\bparse\b/.test(process.env.LOG);
  var stackIDs = null;
  function cutAt(tree, pos, side) {
    var cursor2 = tree.cursor(IterMode.IncludeAnonymous);
    cursor2.moveTo(pos);
    for (;;) {
      if (!(side < 0 ? cursor2.childBefore(pos) : cursor2.childAfter(pos))) for (;;) {
        if ((side < 0 ? cursor2.to < pos : cursor2.from > pos) && !cursor2.type.isError) return side < 0 ? Math.max(0, Math.min(cursor2.to - 1, pos - 25)) : Math.min(tree.length, Math.max(cursor2.from + 1, pos + 25));
        if (side < 0 ? cursor2.prevSibling() : cursor2.nextSibling()) break;
        if (!cursor2.parent()) return side < 0 ? 0 : tree.length;
      }
    }
  }
  var FragmentCursor2 = function () {
    function FragmentCursor2(fragments, nodeSet) {
      this.fragments = fragments;
      this.nodeSet = nodeSet;
      this.i = 0;
      this.fragment = null;
      this.safeFrom = -1;
      this.safeTo = -1;
      this.trees = [];
      this.start = [];
      this.index = [];
      this.nextFragment();
    }
    var _proto21 = FragmentCursor2.prototype;
    _proto21.nextFragment = function nextFragment() {
      var fr = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
      if (fr) {
        this.safeFrom = fr.openStart ? cutAt(fr.tree, fr.from + fr.offset, 1) - fr.offset : fr.from;
        this.safeTo = fr.openEnd ? cutAt(fr.tree, fr.to + fr.offset, -1) - fr.offset : fr.to;
        while (this.trees.length) {
          this.trees.pop();
          this.start.pop();
          this.index.pop();
        }
        this.trees.push(fr.tree);
        this.start.push(-fr.offset);
        this.index.push(0);
        this.nextStart = this.safeFrom;
      } else {
        this.nextStart = 1e9;
      }
    };
    _proto21.nodeAt = function nodeAt(pos) {
      if (pos < this.nextStart) return null;
      while (this.fragment && this.safeTo <= pos) this.nextFragment();
      if (!this.fragment) return null;
      for (;;) {
        var last = this.trees.length - 1;
        if (last < 0) {
          this.nextFragment();
          return null;
        }
        var top2 = this.trees[last],
          index = this.index[last];
        if (index == top2.children.length) {
          this.trees.pop();
          this.start.pop();
          this.index.pop();
          continue;
        }
        var next = top2.children[index];
        var start = this.start[last] + top2.positions[index];
        if (start > pos) {
          this.nextStart = start;
          return null;
        }
        if (next instanceof Tree) {
          if (start == pos) {
            if (start < this.safeFrom) return null;
            var end = start + next.length;
            if (end <= this.safeTo) {
              var lookAhead = next.prop(NodeProp.lookAhead);
              if (!lookAhead || end + lookAhead < this.fragment.to) return next;
            }
          }
          this.index[last]++;
          if (start + next.length >= Math.max(this.safeFrom, pos)) {
            this.trees.push(next);
            this.start.push(start);
            this.index.push(0);
          }
        } else {
          this.index[last]++;
          this.nextStart = start + next.length;
        }
      }
    };
    return FragmentCursor2;
  }();
  var TokenCache = function () {
    function TokenCache(parser4, stream) {
      this.stream = stream;
      this.tokens = [];
      this.mainToken = null;
      this.actions = [];
      this.tokens = parser4.tokenizers.map(function (_) {
        return new CachedToken();
      });
    }
    var _proto22 = TokenCache.prototype;
    _proto22.getActions = function getActions(stack) {
      var actionIndex = 0;
      var main = null;
      var parser4 = stack.p.parser,
        tokenizers = parser4.tokenizers;
      var mask = parser4.stateSlot(stack.state, 3);
      var context = stack.curContext ? stack.curContext.hash : 0;
      var lookAhead = 0;
      for (var i2 = 0; i2 < tokenizers.length; i2++) {
        if ((1 << i2 & mask) == 0) continue;
        var tokenizer = tokenizers[i2],
          token = this.tokens[i2];
        if (main && !tokenizer.fallback) continue;
        if (tokenizer.contextual || token.start != stack.pos || token.mask != mask || token.context != context) {
          this.updateCachedToken(token, tokenizer, stack);
          token.mask = mask;
          token.context = context;
        }
        if (token.lookAhead > token.end + 25) lookAhead = Math.max(token.lookAhead, lookAhead);
        if (token.value != 0) {
          var startIndex = actionIndex;
          if (token.extended > -1) actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
          actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
          if (!tokenizer.extend) {
            main = token;
            if (actionIndex > startIndex) break;
          }
        }
      }
      while (this.actions.length > actionIndex) this.actions.pop();
      if (lookAhead) stack.setLookAhead(lookAhead);
      if (!main && stack.pos == this.stream.end) {
        main = new CachedToken();
        main.value = stack.p.parser.eofTerm;
        main.start = main.end = stack.pos;
        actionIndex = this.addActions(stack, main.value, main.end, actionIndex);
      }
      this.mainToken = main;
      return this.actions;
    };
    _proto22.getMainToken = function getMainToken(stack) {
      if (this.mainToken) return this.mainToken;
      var main = new CachedToken(),
        pos = stack.pos,
        p = stack.p;
      main.start = pos;
      main.end = Math.min(pos + 1, p.stream.end);
      main.value = pos == p.stream.end ? p.parser.eofTerm : 0;
      return main;
    };
    _proto22.updateCachedToken = function updateCachedToken(token, tokenizer, stack) {
      var start = this.stream.clipPos(stack.pos);
      tokenizer.token(this.stream.reset(start, token), stack);
      if (token.value > -1) {
        var parser4 = stack.p.parser;
        for (var i2 = 0; i2 < parser4.specialized.length; i2++) if (parser4.specialized[i2] == token.value) {
          var result = parser4.specializers[i2](this.stream.read(token.start, token.end), stack);
          if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
            if ((result & 1) == 0) token.value = result >> 1;else token.extended = result >> 1;
            break;
          }
        }
      } else {
        token.value = 0;
        token.end = this.stream.clipPos(start + 1);
      }
    };
    _proto22.putAction = function putAction(action, token, end, index) {
      for (var i2 = 0; i2 < index; i2 += 3) if (this.actions[i2] == action) return index;
      this.actions[index++] = action;
      this.actions[index++] = token;
      this.actions[index++] = end;
      return index;
    };
    _proto22.addActions = function addActions(stack, token, end, index) {
      var state = stack.state,
        parser4 = stack.p.parser,
        data = parser4.data;
      for (var set = 0; set < 2; set++) {
        for (var i2 = parser4.stateSlot(state, set ? 2 : 1);; i2 += 3) {
          if (data[i2] == 65535) {
            if (data[i2 + 1] == 1) {
              i2 = pair(data, i2 + 2);
            } else {
              if (index == 0 && data[i2 + 1] == 2) index = this.putAction(pair(data, i2 + 2), token, end, index);
              break;
            }
          }
          if (data[i2] == token) index = this.putAction(pair(data, i2 + 1), token, end, index);
        }
      }
      return index;
    };
    return TokenCache;
  }();
  var Parse = function () {
    function Parse(parser4, input, fragments, ranges) {
      this.parser = parser4;
      this.input = input;
      this.ranges = ranges;
      this.recovering = 0;
      this.nextStackID = 9812;
      this.minStackPos = 0;
      this.reused = [];
      this.stoppedAt = null;
      this.lastBigReductionStart = -1;
      this.lastBigReductionSize = 0;
      this.bigReductionCount = 0;
      this.stream = new InputStream(input, ranges);
      this.tokens = new TokenCache(parser4, this.stream);
      this.topTerm = parser4.top[1];
      var from = ranges[0].from;
      this.stacks = [Stack.start(this, parser4.top[0], from)];
      this.fragments = fragments.length && this.stream.end - from > parser4.bufferLength * 4 ? new FragmentCursor2(fragments, parser4.nodeSet) : null;
    }
    var _proto23 = Parse.prototype;
    _proto23.advance = function advance() {
      var stacks = this.stacks,
        pos = this.minStackPos;
      var newStacks = this.stacks = [];
      var stopped, stoppedTokens;
      if (this.bigReductionCount > 300 && stacks.length == 1) {
        var _stacks = _slicedToArray(stacks, 1),
          s = _stacks[0];
        while (s.forceReduce() && s.stack.length && s.stack[s.stack.length - 2] >= this.lastBigReductionStart) {}
        this.bigReductionCount = this.lastBigReductionSize = 0;
      }
      for (var i2 = 0; i2 < stacks.length; i2++) {
        var stack = stacks[i2];
        for (;;) {
          this.tokens.mainToken = null;
          if (stack.pos > pos) {
            newStacks.push(stack);
          } else if (this.advanceStack(stack, newStacks, stacks)) {
            continue;
          } else {
            if (!stopped) {
              stopped = [];
              stoppedTokens = [];
            }
            stopped.push(stack);
            var tok = this.tokens.getMainToken(stack);
            stoppedTokens.push(tok.value, tok.end);
          }
          break;
        }
      }
      if (!newStacks.length) {
        var finished = stopped && findFinished(stopped);
        if (finished) {
          if (verbose) console.log("Finish with " + this.stackID(finished));
          return this.stackToTree(finished);
        }
        if (this.parser.strict) {
          if (verbose && stopped) console.log("Stuck with token " + (this.tokens.mainToken ? this.parser.getName(this.tokens.mainToken.value) : "none"));
          throw new SyntaxError("No parse at " + pos);
        }
        if (!this.recovering) this.recovering = 5;
      }
      if (this.recovering && stopped) {
        var _finished = this.stoppedAt != null && stopped[0].pos > this.stoppedAt ? stopped[0] : this.runRecovery(stopped, stoppedTokens, newStacks);
        if (_finished) {
          if (verbose) console.log("Force-finish " + this.stackID(_finished));
          return this.stackToTree(_finished.forceAll());
        }
      }
      if (this.recovering) {
        var maxRemaining = this.recovering == 1 ? 1 : this.recovering * 3;
        if (newStacks.length > maxRemaining) {
          newStacks.sort(function (a, b) {
            return b.score - a.score;
          });
          while (newStacks.length > maxRemaining) newStacks.pop();
        }
        if (newStacks.some(function (s) {
          return s.reducePos > pos;
        })) this.recovering--;
      } else if (newStacks.length > 1) {
        outer: for (var _i6 = 0; _i6 < newStacks.length - 1; _i6++) {
          var _stack = newStacks[_i6];
          for (var j = _i6 + 1; j < newStacks.length; j++) {
            var other = newStacks[j];
            if (_stack.sameState(other) || _stack.buffer.length > 500 && other.buffer.length > 500) {
              if ((_stack.score - other.score || _stack.buffer.length - other.buffer.length) > 0) {
                newStacks.splice(j--, 1);
              } else {
                newStacks.splice(_i6--, 1);
                continue outer;
              }
            }
          }
        }
        if (newStacks.length > 12) {
          newStacks.sort(function (a, b) {
            return b.score - a.score;
          });
          newStacks.splice(12, newStacks.length - 12);
        }
      }
      this.minStackPos = newStacks[0].pos;
      for (var _i7 = 1; _i7 < newStacks.length; _i7++) if (newStacks[_i7].pos < this.minStackPos) this.minStackPos = newStacks[_i7].pos;
      return null;
    };
    _proto23.stopAt = function stopAt(pos) {
      if (this.stoppedAt != null && this.stoppedAt < pos) throw new RangeError("Can't move stoppedAt forward");
      this.stoppedAt = pos;
    };
    _proto23.advanceStack = function advanceStack(stack, stacks, split) {
      var start = stack.pos,
        parser4 = this.parser;
      var base2 = verbose ? this.stackID(stack) + " -> " : "";
      if (this.stoppedAt != null && start > this.stoppedAt) return stack.forceReduce() ? stack : null;
      if (this.fragments) {
        var strictCx = stack.curContext && stack.curContext.tracker.strict,
          cxHash = strictCx ? stack.curContext.hash : 0;
        for (var cached = this.fragments.nodeAt(start); cached;) {
          var match = this.parser.nodeSet.types[cached.type.id] == cached.type ? parser4.getGoto(stack.state, cached.type.id) : -1;
          if (match > -1 && cached.length && (!strictCx || (cached.prop(NodeProp.contextHash) || 0) == cxHash)) {
            stack.useNode(cached, match);
            if (verbose) console.log(base2 + this.stackID(stack) + (" (via reuse of " + parser4.getName(cached.type.id) + ")"));
            return true;
          }
          if (!(cached instanceof Tree) || cached.children.length == 0 || cached.positions[0] > 0) break;
          var inner = cached.children[0];
          if (inner instanceof Tree && cached.positions[0] == 0) cached = inner;else break;
        }
      }
      var defaultReduce = parser4.stateSlot(stack.state, 4);
      if (defaultReduce > 0) {
        stack.reduce(defaultReduce);
        if (verbose) console.log(base2 + this.stackID(stack) + (" (via always-reduce " + parser4.getName(defaultReduce & 65535) + ")"));
        return true;
      }
      if (stack.stack.length >= 8400) {
        while (stack.stack.length > 6e3 && stack.forceReduce()) {}
      }
      var actions = this.tokens.getActions(stack);
      for (var i2 = 0; i2 < actions.length;) {
        var action = actions[i2++],
          term = actions[i2++],
          end = actions[i2++];
        var last = i2 == actions.length || !split;
        var localStack = last ? stack : stack.split();
        var main = this.tokens.mainToken;
        localStack.apply(action, term, main ? main.start : localStack.pos, end);
        if (verbose) console.log(base2 + this.stackID(localStack) + (" (via " + ((action & 65536) == 0 ? "shift" : "reduce of " + parser4.getName(action & 65535)) + " for " + parser4.getName(term) + " @ " + start + (localStack == stack ? "" : ", split") + ")"));
        if (last) return true;else if (localStack.pos > start) stacks.push(localStack);else split.push(localStack);
      }
      return false;
    };
    _proto23.advanceFully = function advanceFully(stack, newStacks) {
      var pos = stack.pos;
      for (;;) {
        if (!this.advanceStack(stack, null, null)) return false;
        if (stack.pos > pos) {
          pushStackDedup(stack, newStacks);
          return true;
        }
      }
    };
    _proto23.runRecovery = function runRecovery(stacks, tokens, newStacks) {
      var finished = null,
        restarted = false;
      for (var i2 = 0; i2 < stacks.length; i2++) {
        var stack = stacks[i2],
          token = tokens[i2 << 1],
          tokenEnd = tokens[(i2 << 1) + 1];
        var base2 = verbose ? this.stackID(stack) + " -> " : "";
        if (stack.deadEnd) {
          if (restarted) continue;
          restarted = true;
          stack.restart();
          if (verbose) console.log(base2 + this.stackID(stack) + " (restarted)");
          var done = this.advanceFully(stack, newStacks);
          if (done) continue;
        }
        var force = stack.split(),
          forceBase = base2;
        for (var j = 0; j < 10 && force.forceReduce(); j++) {
          if (verbose) console.log(forceBase + this.stackID(force) + " (via force-reduce)");
          var _done = this.advanceFully(force, newStacks);
          if (_done) break;
          if (verbose) forceBase = this.stackID(force) + " -> ";
        }
        for (var _iterator14 = _createForOfIteratorHelperLoose(stack.recoverByInsert(token)), _step14; !(_step14 = _iterator14()).done;) {
          var insert2 = _step14.value;
          if (verbose) console.log(base2 + this.stackID(insert2) + " (via recover-insert)");
          this.advanceFully(insert2, newStacks);
        }
        if (this.stream.end > stack.pos) {
          if (tokenEnd == stack.pos) {
            tokenEnd++;
            token = 0;
          }
          stack.recoverByDelete(token, tokenEnd);
          if (verbose) console.log(base2 + this.stackID(stack) + (" (via recover-delete " + this.parser.getName(token) + ")"));
          pushStackDedup(stack, newStacks);
        } else if (!finished || finished.score < force.score) {
          finished = force;
        }
      }
      return finished;
    };
    _proto23.stackToTree = function stackToTree(stack) {
      stack.close();
      return Tree.build({
        buffer: StackBufferCursor.create(stack),
        nodeSet: this.parser.nodeSet,
        topID: this.topTerm,
        maxBufferLength: this.parser.bufferLength,
        reused: this.reused,
        start: this.ranges[0].from,
        length: stack.pos - this.ranges[0].from,
        minRepeatType: this.parser.minRepeatTerm
      });
    };
    _proto23.stackID = function stackID(stack) {
      var id2 = (stackIDs || (stackIDs = new WeakMap())).get(stack);
      if (!id2) stackIDs.set(stack, id2 = String.fromCodePoint(this.nextStackID++));
      return id2 + stack;
    };
    return _createClass(Parse, [{
      key: "parsedPos",
      get: function get() {
        return this.minStackPos;
      }
    }]);
  }();
  function pushStackDedup(stack, newStacks) {
    for (var i2 = 0; i2 < newStacks.length; i2++) {
      var other = newStacks[i2];
      if (other.pos == stack.pos && other.sameState(stack)) {
        if (newStacks[i2].score < stack.score) newStacks[i2] = stack;
        return;
      }
    }
    newStacks.push(stack);
  }
  var Dialect = function () {
    function Dialect(source, flags, disabled) {
      this.source = source;
      this.flags = flags;
      this.disabled = disabled;
    }
    var _proto24 = Dialect.prototype;
    _proto24.allows = function allows(term) {
      return !this.disabled || this.disabled[term] == 0;
    };
    return Dialect;
  }();
  var id = function id(x) {
    return x;
  };
  var ContextTracker = function ContextTracker(spec) {
    this.start = spec.start;
    this.shift = spec.shift || id;
    this.reduce = spec.reduce || id;
    this.reuse = spec.reuse || id;
    this.hash = spec.hash || function () {
      return 0;
    };
    this.strict = spec.strict !== false;
  };
  var LRParser = function (_Parser) {
    function _LRParser(spec) {
      var _this6$nodeSet;
      var _this6;
      _this6 = _Parser.call(this) || this;
      _this6.wrappers = [];
      if (spec.version != 14) throw new RangeError("Parser version (" + spec.version + ") doesn't match runtime version (" + 14 + ")");
      var nodeNames = spec.nodeNames.split(" ");
      _this6.minRepeatTerm = nodeNames.length;
      for (var i2 = 0; i2 < spec.repeatNodeCount; i2++) nodeNames.push("");
      var topTerms = Object.keys(spec.topRules).map(function (r) {
        return spec.topRules[r][1];
      });
      var nodeProps = [];
      for (var _i8 = 0; _i8 < nodeNames.length; _i8++) nodeProps.push([]);
      function setProp(nodeID, prop, value) {
        nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
      }
      if (spec.nodeProps) {
        for (var _iterator15 = _createForOfIteratorHelperLoose(spec.nodeProps), _step15; !(_step15 = _iterator15()).done;) {
          var propSpec = _step15.value;
          var prop = propSpec[0];
          if (typeof prop == "string") prop = NodeProp[prop];
          for (var _i9 = 1; _i9 < propSpec.length;) {
            var next = propSpec[_i9++];
            if (next >= 0) {
              setProp(next, prop, propSpec[_i9++]);
            } else {
              var value = propSpec[_i9 + -next];
              for (var j = -next; j > 0; j--) setProp(propSpec[_i9++], prop, value);
              _i9++;
            }
          }
        }
      }
      _this6.nodeSet = new NodeSet(nodeNames.map(function (name2, i2) {
        return NodeType.define({
          name: i2 >= _this6.minRepeatTerm ? void 0 : name2,
          id: i2,
          props: nodeProps[i2],
          top: topTerms.indexOf(i2) > -1,
          error: i2 == 0,
          skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i2) > -1
        });
      }));
      if (spec.propSources) _this6.nodeSet = (_this6$nodeSet = _this6.nodeSet).extend.apply(_this6$nodeSet, _toConsumableArray(spec.propSources));
      _this6.strict = false;
      _this6.bufferLength = DefaultBufferLength;
      var tokenArray = decodeArray(spec.tokenData);
      _this6.context = spec.context;
      _this6.specializerSpecs = spec.specialized || [];
      _this6.specialized = new Uint16Array(_this6.specializerSpecs.length);
      for (var _i0 = 0; _i0 < _this6.specializerSpecs.length; _i0++) _this6.specialized[_i0] = _this6.specializerSpecs[_i0].term;
      _this6.specializers = _this6.specializerSpecs.map(getSpecializer);
      _this6.states = decodeArray(spec.states, Uint32Array);
      _this6.data = decodeArray(spec.stateData);
      _this6.goto = decodeArray(spec.goto);
      _this6.maxTerm = spec.maxTerm;
      _this6.tokenizers = spec.tokenizers.map(function (value) {
        return typeof value == "number" ? new TokenGroup(tokenArray, value) : value;
      });
      _this6.topRules = spec.topRules;
      _this6.dialects = spec.dialects || {};
      _this6.dynamicPrecedences = spec.dynamicPrecedences || null;
      _this6.tokenPrecTable = spec.tokenPrec;
      _this6.termNames = spec.termNames || null;
      _this6.maxNode = _this6.nodeSet.types.length - 1;
      _this6.dialect = _this6.parseDialect();
      _this6.top = _this6.topRules[Object.keys(_this6.topRules)[0]];
      return _this6;
    }
    _inheritsLoose(_LRParser, _Parser);
    var _proto25 = _LRParser.prototype;
    _proto25.createParse = function createParse(input, fragments, ranges) {
      var parse = new Parse(this, input, fragments, ranges);
      for (var _iterator16 = _createForOfIteratorHelperLoose(this.wrappers), _step16; !(_step16 = _iterator16()).done;) {
        var w = _step16.value;
        parse = w(parse, input, fragments, ranges);
      }
      return parse;
    };
    _proto25.getGoto = function getGoto(state, term, loose) {
      if (loose === void 0) {
        loose = false;
      }
      var table = this.goto;
      if (term >= table[0]) return -1;
      for (var pos = table[term + 1];;) {
        var groupTag = table[pos++],
          last = groupTag & 1;
        var target = table[pos++];
        if (last && loose) return target;
        for (var end = pos + (groupTag >> 1); pos < end; pos++) if (table[pos] == state) return target;
        if (last) return -1;
      }
    };
    _proto25.hasAction = function hasAction(state, terminal) {
      var data = this.data;
      for (var set = 0; set < 2; set++) {
        for (var i2 = this.stateSlot(state, set ? 2 : 1), next;; i2 += 3) {
          if ((next = data[i2]) == 65535) {
            if (data[i2 + 1] == 1) next = data[i2 = pair(data, i2 + 2)];else if (data[i2 + 1] == 2) return pair(data, i2 + 2);else break;
          }
          if (next == terminal || next == 0) return pair(data, i2 + 1);
        }
      }
      return 0;
    };
    _proto25.stateSlot = function stateSlot(state, slot) {
      return this.states[state * 6 + slot];
    };
    _proto25.stateFlag = function stateFlag(state, flag) {
      return (this.stateSlot(state, 0) & flag) > 0;
    };
    _proto25.validAction = function validAction(state, action) {
      return !!this.allActions(state, function (a) {
        return a == action ? true : null;
      });
    };
    _proto25.allActions = function allActions(state, action) {
      var deflt = this.stateSlot(state, 4);
      var result = deflt ? action(deflt) : void 0;
      for (var i2 = this.stateSlot(state, 1); result == null; i2 += 3) {
        if (this.data[i2] == 65535) {
          if (this.data[i2 + 1] == 1) i2 = pair(this.data, i2 + 2);else break;
        }
        result = action(pair(this.data, i2 + 1));
      }
      return result;
    };
    _proto25.nextStates = function nextStates(state) {
      var _this7 = this;
      var result = [];
      var _loop4 = function _loop4(_i1) {
        if (_this7.data[_i1] == 65535) {
          if (_this7.data[_i1 + 1] == 1) _i1 = pair(_this7.data, _i1 + 2);else {
            i2 = _i1;
            return 1;
          }
        }
        if ((_this7.data[_i1 + 2] & 65536 >> 16) == 0) {
          var value = _this7.data[_i1 + 1];
          if (!result.some(function (v, i3) {
            return i3 & 1 && v == value;
          })) result.push(_this7.data[_i1], value);
        }
        i2 = _i1;
      };
      for (var i2 = this.stateSlot(state, 1);; i2 += 3) {
        if (_loop4(i2)) break;
      }
      return result;
    };
    _proto25.configure = function configure(config) {
      var _this$nodeSet;
      var copy = Object.assign(Object.create(_LRParser.prototype), this);
      if (config.props) copy.nodeSet = (_this$nodeSet = this.nodeSet).extend.apply(_this$nodeSet, _toConsumableArray(config.props));
      if (config.top) {
        var info = this.topRules[config.top];
        if (!info) throw new RangeError("Invalid top rule name " + config.top);
        copy.top = info;
      }
      if (config.tokenizers) copy.tokenizers = this.tokenizers.map(function (t2) {
        var found = config.tokenizers.find(function (r) {
          return r.from == t2;
        });
        return found ? found.to : t2;
      });
      if (config.specializers) {
        copy.specializers = this.specializers.slice();
        copy.specializerSpecs = this.specializerSpecs.map(function (s, i2) {
          var found = config.specializers.find(function (r) {
            return r.from == s.external;
          });
          if (!found) return s;
          var spec = Object.assign(Object.assign({}, s), {
            external: found.to
          });
          copy.specializers[i2] = getSpecializer(spec);
          return spec;
        });
      }
      if (config.contextTracker) copy.context = config.contextTracker;
      if (config.dialect) copy.dialect = this.parseDialect(config.dialect);
      if (config.strict != null) copy.strict = config.strict;
      if (config.wrap) copy.wrappers = copy.wrappers.concat(config.wrap);
      if (config.bufferLength != null) copy.bufferLength = config.bufferLength;
      return copy;
    };
    _proto25.hasWrappers = function hasWrappers() {
      return this.wrappers.length > 0;
    };
    _proto25.getName = function getName(term) {
      return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
    };
    _proto25.dynamicPrecedence = function dynamicPrecedence(term) {
      var prec2 = this.dynamicPrecedences;
      return prec2 == null ? 0 : prec2[term] || 0;
    };
    _proto25.parseDialect = function parseDialect(dialect) {
      var values2 = Object.keys(this.dialects),
        flags = values2.map(function () {
          return false;
        });
      if (dialect) {
        for (var _iterator17 = _createForOfIteratorHelperLoose(dialect.split(" ")), _step17; !(_step17 = _iterator17()).done;) {
          var part = _step17.value;
          var id2 = values2.indexOf(part);
          if (id2 >= 0) flags[id2] = true;
        }
      }
      var disabled = null;
      for (var i2 = 0; i2 < values2.length; i2++) if (!flags[i2]) {
        for (var j = this.dialects[values2[i2]], _id; (_id = this.data[j++]) != 65535;) (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[_id] = 1;
      }
      return new Dialect(dialect, flags, disabled);
    };
    _LRParser.deserialize = function deserialize(spec) {
      return new _LRParser(spec);
    };
    return _createClass(_LRParser, [{
      key: "eofTerm",
      get: function get() {
        return this.maxNode + 1;
      }
    }, {
      key: "topNode",
      get: function get() {
        return this.nodeSet.types[this.top[1]];
      }
    }]);
  }(Parser);
  function pair(data, off) {
    return data[off] | data[off + 1] << 16;
  }
  function findFinished(stacks) {
    var best = null;
    for (var _iterator18 = _createForOfIteratorHelperLoose(stacks), _step18; !(_step18 = _iterator18()).done;) {
      var stack = _step18.value;
      var stopped = stack.p.stoppedAt;
      if ((stack.pos == stack.p.stream.end || stopped != null && stack.pos > stopped) && stack.p.parser.stateFlag(stack.state, 2) && (!best || best.score < stack.score)) best = stack;
    }
    return best;
  }
  function getSpecializer(spec) {
    if (spec.external) {
      var mask = spec.extend ? 1 : 0;
      return function (value, stack) {
        return spec.external(value, stack) << 1 | mask;
      };
    }
    return spec.get;
  }
  var nextTagID = 0;
  var Tag = function () {
    function _Tag(name2, set, base2, modified) {
      this.name = name2;
      this.set = set;
      this.base = base2;
      this.modified = modified;
      this.id = nextTagID++;
    }
    var _proto26 = _Tag.prototype;
    _proto26.toString = function toString() {
      var name2 = this.name;
      for (var _iterator19 = _createForOfIteratorHelperLoose(this.modified), _step19; !(_step19 = _iterator19()).done;) {
        var mod = _step19.value;
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
        for (var _iterator20 = _createForOfIteratorHelperLoose(parent.set), _step20; !(_step20 = _iterator20()).done;) {
          var t2 = _step20.value;
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
        return t2.base == base2 && sameArray(mods, t2.modified);
      });
      if (exists) return exists;
      var set = [],
        tag = new Tag(base2.name, set, base2, mods);
      for (var _iterator21 = _createForOfIteratorHelperLoose(mods), _step21; !(_step21 = _iterator21()).done;) {
        var m = _step21.value;
        m.instances.push(tag);
      }
      var configs = powerSet(mods);
      for (var _iterator22 = _createForOfIteratorHelperLoose(base2.set), _step22; !(_step22 = _iterator22()).done;) {
        var parent = _step22.value;
        if (!parent.modified.length) {
          for (var _iterator23 = _createForOfIteratorHelperLoose(configs), _step23; !(_step23 = _iterator23()).done;) {
            var config = _step23.value;
            set.push(_Modifier.get(parent, config));
          }
        }
      }
      return tag;
    };
    return _Modifier;
  }();
  function sameArray(a, b) {
    return a.length == b.length && a.every(function (x, i2) {
      return x == b[i2];
    });
  }
  function powerSet(array) {
    var sets = [[]];
    for (var i2 = 0; i2 < array.length; i2++) {
      for (var j = 0, e = sets.length; j < e; j++) {
        sets.push(sets[j].concat(array[i2]));
      }
    }
    return sets.sort(function (a, b) {
      return b.length - a.length;
    });
  }
  function styleTags(spec) {
    var byName = Object.create(null);
    for (var prop in spec) {
      var tags3 = spec[prop];
      if (!Array.isArray(tags3)) tags3 = [tags3];
      for (var _iterator24 = _createForOfIteratorHelperLoose(prop.split(" ")), _step24; !(_step24 = _iterator24()).done;) {
        var part = _step24.value;
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
          var rule = new Rule(tags3, mode, last > 0 ? pieces.slice(0, last) : null);
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
    function Rule(tags3, mode, context, next) {
      this.tags = tags3;
      this.mode = mode;
      this.context = context;
      this.next = next;
    }
    var _proto27 = Rule.prototype;
    _proto27.sort = function sort(other) {
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
  function tagHighlighter(tags3, options) {
    var map = Object.create(null);
    for (var _iterator25 = _createForOfIteratorHelperLoose(tags3), _step25; !(_step25 = _iterator25()).done;) {
      var style = _step25.value;
      if (!Array.isArray(style.tag)) map[style.tag.id] = style.class;else {
        for (var _iterator28 = _createForOfIteratorHelperLoose(style.tag), _step28; !(_step28 = _iterator28()).done;) {
          var tag = _step28.value;
          map[tag.id] = style.class;
        }
      }
    }
    var _ref = options || {},
      scope = _ref.scope,
      _ref$all = _ref.all,
      all = _ref$all === void 0 ? null : _ref$all;
    return {
      style: function style(tags4) {
        var cls = all;
        for (var _iterator26 = _createForOfIteratorHelperLoose(tags4), _step26; !(_step26 = _iterator26()).done;) {
          var tag = _step26.value;
          for (var _iterator27 = _createForOfIteratorHelperLoose(tag.set), _step27; !(_step27 = _iterator27()).done;) {
            var sub = _step27.value;
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
  function highlightTags(highlighters, tags3) {
    var result = null;
    for (var _iterator29 = _createForOfIteratorHelperLoose(highlighters), _step29; !(_step29 = _iterator29()).done;) {
      var highlighter = _step29.value;
      var value = highlighter.style(tags3);
      if (value) result = result ? result + " " + value : value;
    }
    return result;
  }
  function highlightTree(tree, highlighter, putStyle, from, to) {
    if (from === void 0) {
      from = 0;
    }
    if (to === void 0) {
      to = tree.length;
    }
    var builder = new HighlightBuilder(from, Array.isArray(highlighter) ? highlighter : [highlighter], putStyle);
    builder.highlightRange(tree.cursor(), from, to, "", builder.highlighters);
    builder.flush(to);
  }
  var HighlightBuilder = function () {
    function HighlightBuilder(at, highlighters, span) {
      this.at = at;
      this.highlighters = highlighters;
      this.span = span;
      this.class = "";
    }
    var _proto28 = HighlightBuilder.prototype;
    _proto28.startSpan = function startSpan(at, cls) {
      if (cls != this.class) {
        this.flush(at);
        if (at > this.at) this.at = at;
        this.class = cls;
      }
    };
    _proto28.flush = function flush(to) {
      if (to > this.at && this.class) this.span(this.at, to, this.class);
    };
    _proto28.highlightRange = function highlightRange(cursor2, from, to, inheritedClass, highlighters) {
      var type = cursor2.type,
        start = cursor2.from,
        end = cursor2.to;
      if (start >= to || end <= from) return;
      if (type.isTop) highlighters = this.highlighters.filter(function (h) {
        return !h.scope || h.scope(type);
      });
      var cls = inheritedClass;
      var rule = getStyleTags(cursor2) || Rule.empty;
      var tagCls = highlightTags(highlighters, rule.tags);
      if (tagCls) {
        if (cls) cls += " ";
        cls += tagCls;
        if (rule.mode == 1) inheritedClass += (inheritedClass ? " " : "") + tagCls;
      }
      this.startSpan(Math.max(from, start), cls);
      if (rule.opaque) return;
      var mounted = cursor2.tree && cursor2.tree.prop(NodeProp.mounted);
      if (mounted && mounted.overlay) {
        var inner = cursor2.node.enter(mounted.overlay[0].from + start, 1);
        var innerHighlighters = this.highlighters.filter(function (h) {
          return !h.scope || h.scope(mounted.tree.type);
        });
        var hasChild2 = cursor2.firstChild();
        for (var i2 = 0, pos = start;; i2++) {
          var next = i2 < mounted.overlay.length ? mounted.overlay[i2] : null;
          var nextPos = next ? next.from + start : end;
          var rangeFrom2 = Math.max(from, pos),
            rangeTo2 = Math.min(to, nextPos);
          if (rangeFrom2 < rangeTo2 && hasChild2) {
            while (cursor2.from < rangeTo2) {
              this.highlightRange(cursor2, rangeFrom2, rangeTo2, inheritedClass, highlighters);
              this.startSpan(Math.min(rangeTo2, cursor2.to), cls);
              if (cursor2.to >= nextPos || !cursor2.nextSibling()) break;
            }
          }
          if (!next || nextPos > to) break;
          pos = next.to + start;
          if (pos > from) {
            this.highlightRange(inner.cursor(), Math.max(from, next.from + start), Math.min(to, pos), "", innerHighlighters);
            this.startSpan(Math.min(to, pos), cls);
          }
        }
        if (hasChild2) cursor2.parent();
      } else if (cursor2.firstChild()) {
        if (mounted) inheritedClass = "";
        do {
          if (cursor2.to <= from) continue;
          if (cursor2.from >= to) break;
          this.highlightRange(cursor2, from, to, inheritedClass, highlighters);
          this.startSpan(Math.min(to, cursor2.to), cls);
        } while (cursor2.nextSibling());
        cursor2.parent();
      }
    };
    return HighlightBuilder;
  }();
  function getStyleTags(node) {
    var rule = node.type.prop(ruleNodeProp);
    while (rule && rule.context && !node.matchContext(rule.context)) rule = rule.next;
    return rule || null;
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
  var descendantOp = 148;
  var Unit = 1;
  var identifier = 149;
  var callee = 150;
  var VariableName = 2;
  var queryIdentifier = 151;
  var queryVariableName = 3;
  var QueryCallee = 4;
  var space = [9, 10, 11, 12, 13, 32, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288];
  var colon = 58;
  var parenL = 40;
  var underscore = 95;
  var bracketL = 91;
  var dash = 45;
  var period = 46;
  var hash = 35;
  var percent = 37;
  var ampersand = 38;
  var backslash = 92;
  var newline = 10;
  var asterisk = 42;
  function isAlpha(ch) {
    return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch >= 161;
  }
  function isDigit(ch) {
    return ch >= 48 && ch <= 57;
  }
  function isHex(ch) {
    return isDigit(ch) || ch >= 97 && ch <= 102 || ch >= 65 && ch <= 70;
  }
  var identifierTokens = function identifierTokens(id2, varName, callee2) {
    return function (input, stack) {
      for (var inside = false, dashes = 0, i2 = 0;; i2++) {
        var next = input.next;
        if (isAlpha(next) || next == dash || next == underscore || inside && isDigit(next)) {
          if (!inside && (next != dash || i2 > 0)) inside = true;
          if (dashes === i2 && next == dash) dashes++;
          input.advance();
        } else if (next == backslash && input.peek(1) != newline) {
          input.advance();
          if (isHex(input.next)) {
            do {
              input.advance();
            } while (isHex(input.next));
            if (input.next == 32) input.advance();
          } else if (input.next > -1) {
            input.advance();
          }
          inside = true;
        } else {
          if (inside) input.acceptToken(dashes == 2 && stack.canShift(VariableName) ? varName : next == parenL ? callee2 : id2);
          break;
        }
      }
    };
  };
  var identifiers = new ExternalTokenizer(identifierTokens(identifier, VariableName, callee), {
    contextual: true
  });
  var queryIdentifiers = new ExternalTokenizer(identifierTokens(queryIdentifier, queryVariableName, QueryCallee), {
    contextual: true
  });
  var descendant = new ExternalTokenizer(function (input) {
    if (space.includes(input.peek(-1))) {
      var next = input.next;
      if (isAlpha(next) || next == underscore || next == hash || next == period || next == asterisk || next == bracketL || next == colon && isAlpha(input.peek(1)) || next == dash || next == ampersand) input.acceptToken(descendantOp);
    }
  });
  var unitToken = new ExternalTokenizer(function (input) {
    if (!space.includes(input.peek(-1))) {
      var next = input.next;
      if (next == percent) {
        input.advance();
        input.acceptToken(Unit);
      }
      if (isAlpha(next)) {
        do {
          input.advance();
        } while (isAlpha(input.next) || isDigit(input.next));
        input.acceptToken(Unit);
      }
    }
  });
  var cssHighlighting = styleTags({
    "AtKeyword import charset namespace keyframes media supports font-feature-values": tags.definitionKeyword,
    "from to selector scope MatchFlag": tags.keyword,
    NamespaceName: tags.namespace,
    KeyframeName: tags.labelName,
    KeyframeRangeName: tags.operatorKeyword,
    TagName: tags.tagName,
    ClassName: tags.className,
    PseudoClassName: tags.constant(tags.className),
    IdName: tags.labelName,
    "FeatureName PropertyName": tags.propertyName,
    AttributeName: tags.attributeName,
    NumberLiteral: tags.number,
    KeywordQuery: tags.keyword,
    UnaryQueryOp: tags.operatorKeyword,
    "CallTag ValueName FontName": tags.atom,
    VariableName: tags.variableName,
    Callee: tags.operatorKeyword,
    Unit: tags.unit,
    "UniversalSelector NestingSelector": tags.definitionOperator,
    "MatchOp CompareOp": tags.compareOperator,
    "ChildOp SiblingOp, LogicOp": tags.logicOperator,
    BinOp: tags.arithmeticOperator,
    Important: tags.modifier,
    Comment: tags.blockComment,
    ColorLiteral: tags.color,
    "ParenthesizedContent StringLiteral": tags.string,
    ":": tags.punctuation,
    "PseudoOp #": tags.derefOperator,
    "; , |": tags.separator,
    "( )": tags.paren,
    "[ ]": tags.squareBracket,
    "{ }": tags.brace
  });
  var spec_callee = {
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
  };
  var spec_queryIdentifier = {
    __proto__: null,
    or: 104,
    and: 104,
    not: 112,
    only: 112,
    layer: 212
  };
  var spec_QueryCallee = {
    __proto__: null,
    selector: 118,
    style: 124,
    layer: 208
  };
  var spec_AtKeyword = {
    __proto__: null,
    "@import": 204,
    "@media": 216,
    "@charset": 220,
    "@namespace": 224,
    "@keyframes": 230,
    "@supports": 242,
    "@scope": 246,
    "@font-feature-values": 252
  };
  var spec_identifier = {
    __proto__: null,
    to: 249
  };
  var parser = LRParser.deserialize({
    version: 14,
    states: "MrQYQdOOO#}QdOOP$UO`OOO%OQaO'#CfOOQP'#Ce'#CeO%VQdO'#CgO%[Q`O'#CgO%aQaO'#FqO&XQdO'#CkO&xQaO'#CcO'SQdO'#CnO'_QdO'#ERO'dQdO'#ETO'oQdO'#E[O'oQdO'#E_OOQP'#Fq'#FqO)RQhO'#FQOOQS'#Fp'#FpOOQS'#FT'#FTQYQdOOO)YQdO'#EeO*iQhO'#EkO)YQdO'#EmO*pQdO'#EoO*{QdO'#ErO)}QhO'#ExO+TQdO'#EzO+`QdO'#E}O+eQaO'#CfO+lQ`O'#EbO+qQ`O'#F}O+|QdO'#F}QOQ`OOP,WO&jO'#CaPOOO)CA`)CA`OOQP'#Ci'#CiOOQP,59R,59RO%VQdO,59ROOQP'#Cm'#CmOOQP,59V,59VO&XQdO,59VO,cQdO,59YO'_QdO,5:mO'dQdO,5:oO'oQdO,5:vO'oQdO,5:xO'oQdO,5:yO'oQdO'#F[O,nQ`O,58}O,vQdO'#EaOOQS,58},58}OOQP'#Cq'#CqOOQO'#EP'#EPOOQP,59Y,59YO,}Q`O,59YO-SQ`O,59YOOQP'#ES'#ESOOQP,5:m,5:mO-XQpO'#EUO-dQdO'#EVO-iQ`O'#EVO-nQpO,5:oO.XQaO,5:vO.oQaO,5:yOOQW'#D^'#D^O/nQhO'#DgO0RQhO,5;lO)}QhO'#DeO0`Q`O'#DnO0eQhO'#D{OOQW'#Fw'#FwOOQS,5;l,5;lO0jQ`O'#DhO0oQ`O'#DkOOQS-E9R-E9ROOQ['#Cv'#CvO0tQdO'#CwO1[QdO'#C}O1rQdO'#DQO2YQ!pO'#DSO4fQ!jO,5;POOQO'#DX'#DXO-SQ`O'#DWO4vQ!nO'#FtO6|Q`O'#DYO7RQ`O'#D|OOQ['#Ft'#FtO7WQhO'#GQO7fQ`O,5;VO7kQ!bO,5;XOOQS'#Eq'#EqO7sQ`O,5;ZO7xQdO,5;ZOOQO'#Et'#EtO8QQ`O,5;^O8VQhO,5;dO'oQdO'#DjOOQS,5;f,5;fO0jQ`O,5;fO8_QdO,5;fOOQS'#Fc'#FcO8gQdO'#FPO7fQ`O,5;iO8oQdO,5:|O9PQdO'#F^O9^Q`O,5<iO9^Q`O,5<iPOOO'#FS'#FSP9iO&jO,58{POOO,58{,58{OOQP1G.m1G.mOOQP1G.q1G.qOOQP1G.t1G.tO,}Q`O1G.tO-SQ`O1G.tOOQP1G0X1G0XO9tQpO1G0ZO9|QaO1G0bO:dQaO1G0dO:zQaO1G0eO;bQaO,5;vOOQO-E9Y-E9YOOQS1G.i1G.iO;lQ`O,5:{O;qQdO'#EQO;xQdO'#CuOOQO'#EX'#EXOOQO,5:q,5:qO-dQdO,5:qOOQP1G0Z1G0ZO)YQdO1G0ZO<PQ!jO'#D^O<_Q!bO,59yO<gQhO,5:ROOQO'#Fx'#FxO<bQ!bO,59}O<oQhO'#FdO)}QhO,59{O)}QhO'#FdO=gQhO1G1WOOQS1G1W1G1WO=qQhO,5:PO>lQhO'#DoOOQW,5:Y,5:YOOQW,5:g,5:gOOQW,5:S,5:SO>vQhO,5:VO?bQ!fO'#FuOOQS'#Fu'#FuOOQS'#FV'#FVO@rQdO,59cOOQ[,59c,59cOAYQdO,59iOOQ[,59i,59iOApQdO,59lOOQ[,59l,59lOOQ[,59n,59nO)YQdO,59pOBWQhO'#EgOOQW'#Eg'#EgOBuQ`O1G0kO4oQhO1G0kOOQ[,59r,59rO)}QhO'#D[OOQ[,59t,59tOBzQ#tO,5:hOCVQhO'#F`OCdQ`O,5<lOOQS1G0q1G0qOOQS1G0s1G0sOOQS1G0u1G0uOCoQ`O1G0uOCtQdO'#EuOOQS1G0x1G0xOOQS1G1O1G1OODPQaO,5:UO7fQ`O1G1QOOQS1G1Q1G1QO0jQ`O1G1QOOQS-E9a-E9aOOQS1G1T1G1TODWQ!fO1G0hODnQ`O'#EdOOQO1G0h1G0hOOQO,5;x,5;xODsQdO,5;xOOQO-E9[-E9[OEQQ`O1G2TPOOO-E9Q-E9QPOOO1G.g1G.gOOQP7+$`7+$`OOQP7+%u7+%uO)YQdO7+%uOOQS1G0g1G0gOE]QaO'#F|OEgQ`O,5:lOElQ!fO'#FUOFjQdO'#FsOFtQ`O,59aOOQO1G0]1G0]OFyQ!bO7+%uO)YQdO1G/eOGUQhO1G/iOOQW1G/m1G/mOOQW1G/g1G/gOGgQhO,5<OOOQW-E9b-E9bOOQS7+&r7+&rOH_QhO'#D^OHmQhO'#F{OHxQ`O'#F{OH}Q`O,5:ZOISQ!bO'#D`O>vQhO'#DmOI_QhO'#DsOIgQhO'#DuOIlQ!jO'#FzOOQO'#Fz'#FzOIwQ`O'#DxOJPQ!bO'#DzOOQO'#Fy'#FyOJUQ`O1G/qOOQS-E9T-E9TOOQ[1G.}1G.}OOQ[1G/T1G/TOOQ[1G/W1G/WOOQ[1G/[1G/[OJZQdO,5;ROOQS7+&V7+&VOJ`Q`O7+&VOJeQhO'#D]OJmQ`O,59vO)}QhO,59vOOQ[1G0S1G0SOJuQ`O1G0SOJzQhO,5;zOOQO-E9^-E9^OOQS7+&a7+&aOKYQbO'#DSOOQO'#Ew'#EwOKhQ`O'#EvOOQO'#Ev'#EvOKsQ`O'#FaOK{QdO,5;aOOQS,5;a,5;aOOQ[1G/p1G/pOOQS7+&l7+&lO7fQ`O7+&lOLWQ!fO'#F]O)YQdO'#F]OM_QdO7+&SOOQO7+&S7+&SOOQO,5;O,5;OOOQO1G1d1G1dOMrQ!bO<<IaOM}QdO'#FZONXQ`O,5<hOOQP1G0W1G0WOOQS-E9S-E9SONaQdO'#FYONkQ`O,5<_OOQ]1G.{1G.{OOQP<<Ia<<IaONsQ`O<<IaONxQdO7+%POOQO'#D`'#D`O! PQ!bO7+%TO! XQhO'#FXO! fQ`O,5<gO)YQdO,5<gOOQW1G/u1G/uO! nQ`O,5:XO>vQhO'#DtOOQO,5:_,5:_O! sQhO,5:aO! {QhO,5:fO)YQdO,5:dOOQW7+%]7+%]OOQO'#Ei'#EiO!!SQ`O1G0mOOQS<<Iq<<IqO)YQdO,59wO!!vQhO1G/bOOQ[1G/b1G/bO!!}Q`O1G/bOOQW-E9U-E9UOOQ[7+%n7+%nOOQO,5;b,5;bOCwQdO'#FbOKsQ`O,5;{OOQS,5;{,5;{OOQS-E9_-E9_OOQS1G0{1G0{OOQS<<JW<<JWO!#VQ!fO,5;wOOQS-E9Z-E9ZOOQO<<In<<InOOQPAN>{AN>{O!$^Q`OAN>{O!$cQaO,5;uOOQO-E9X-E9XO!$mQdO,5;tOOQO-E9W-E9WOOQW<<Hk<<HkOOQW<<Ho<<HoO!$wQhO<<HoO!%YQhO'#D^O!%hQhO,5;sO!%sQ`O,5;sOOQO-E9V-E9VO!%xQdO1G2RO!&SQhO1G/sO!&[Q`O,5:`O>vQhO'#DwOOQO1G/{1G/{O!&aQ!bO1G0QO!&iQdO1G0OOJZQdO'#F_O!&pQ`O7+&XOOQW7+&X7+&XO!&xQ!bO1G/cOOQ[7+$|7+$|O!'TQhO7+$|P!'[Q`O'#FWOOQO,5;|,5;|OOQO-E9`-E9`OOQS1G1g1G1gOOQPG24gG24gO!'aQ`OAN>ZO)YQdO1G1_O!'fQ`O7+'mOOQO1G/z1G/zO!'nQ`O,5:cO!'sQhO7+%lOOQO,5;y,5;yOOQO-E9]-E9]OOQW<<Is<<IsOOQ[<<Hh<<HhPOQW,5;r,5;rOOQWG23uG23uO!'zQdO7+&yOOQO1G/}1G/}OOQO<<IW<<IW",
    stateData: "!(_~O$_OS$`QQ~OWVO^_O`WOcYOdYOl`OmZOp[O#P]O#S^O#YdO#`eO#bfO#dgO#ghO#miO#ojO#rkO$ZRO$fTO~OQmOWVO^_O`WOcYOdYOl`OmZOp[O#P]O#S^O#YdO#`eO#bfO#dgO#ghO#miO#ojO#rkO$ZlO$fTO~O$X$qP~P!jO$`qO~O`YXcYXdYXmYXpYXsYX!eYX#PYX#SYX$YYX$f[X~OgYX~P$ZO$ZsO~O$fuO~O$fuO`$eXc$eXd$eXm$eXp$eXs$eX!e$eX#P$eX#S$eX$Y$eXg$eX~O$ZvO~O`xOcyOdyOmzOp{O#P|O#S!OO$Y}O~Os!RO!e!PO~P&^Of!XO$Z!TO$[!UO~O$Z!YO~OW!^O$Z![O$f!]O~OWVO^_O`WOcYOdYOmZOp[O#P]O#S^O$ZRO$fTO~OS!fOc!gOd!gOh!cOs!RO!Y!eO!]!jO!`!kO$]!bO~On!iO~P(dOQ!uOh!nOp!oOs!pOu!xOw!xO}!vO!q!wO$Z!mO$[!sO$j!qO~OS!fOc!gOd!gOh!cO!Y!eO!]!jO!`!kO$]!bO~Os$tP~P)}Ow!}O!q!wO$Z!|O~Ow#PO$Z#PO~Oh#SOs!RO#p#UO~O$Z#WO~Oc#VX~P$ZOc#ZO~On#[O$X$qXr$qX~O$X$qXr$qX~P!jO$a#_O$b#_O$c#aO~Of#fO$Z!TO$[!UO~Os!RO!e!PO~Or$qP~P!jOh#pO~Oh#qO~Oo!xX!|!xX$f!zX~O$Z#rO~O$f#tO~Oo#uO!|#vO~O`xOcyOdyOmzOp{O~Os#Oa!e#Oa#P#Oa#S#Oa$Y#Oag#Oa~P-vOs#Ra!e#Ra#P#Ra#S#Ra$Y#Rag#Ra~P-vOS!fOc!gOd!gOh!cO!Y!eO!]!jO!`!kO~OR#zOu#zOw#zO$]#wO$j!qO~P/VOn$QO!U#}O!e$OO~P(dOh$SO~O$]$UO~Oh#SO~Oh$WO~O`$YOc$YOg$]Ol$YOm$YOn$YO~P)YO`$YOc$YOl$YOm$YOn$YOo$_O~P)YO`$YOc$YOl$YOm$YOn$YOr$aO~P)YOP$bOSvXcvXdvXhvXnvXyvX!YvX!]vX!`vX#[vX#^vX$]vX!WvXQvX`vXgvXlvXmvXpvXsvXuvXwvX}vX!qvX$ZvX$[vX$jvXovXrvX!evX$XvX$svX!}vX~Oy$cO#[$dO#^$eOn$tP~P)}Oh#qOS$hXc$hXd$hXn$hXy$hX!Y$hX!]$hX!`$hX#[$hX#^$hX$]$hXQ$hX`$hXg$hXl$hXm$hXp$hXs$hXu$hXw$hX}$hX!q$hX$Z$hX$[$hX$j$hXo$hXr$hX!e$hX$X$hX$s$hX!}$hX~Oh$iO~Oh$kO~O!U#}O!e$lOs$tXn$tX~Os!RO~On$oOy$cO~On$pO~Ow$qO!q!wO~Os$rO~Os!RO!U#}O~Os!RO#p$xO~O$Z#WOs#sX~O$s$|On#Ua$X#Uar#Ua~P)YOn$QX$X$QXr$QX~P!jOn#[O$X$qar$qa~O$a#_O$b#_O$c%TO~Oo%VO!|%WO~Os#Oi!e#Oi#P#Oi#S#Oi$Y#Oig#Oi~P-vOs#Qi!e#Qi#P#Qi#S#Qi$Y#Qig#Qi~P-vOs#Ri!e#Ri#P#Ri#S#Ri$Y#Rig#Ri~P-vOs$Oa!e$Oa~P&^Or%XO~Og$pP~P'oOg$gP~P)YOc!SXg!QX!U!QX!W!SX~Oc%aO!W%bO~Og%cO!U#}O~O!U#}OS$WXc$WXd$WXh$WXn$WXs$WX!Y$WX!]$WX!`$WX!e$WX$]$WX~On%gO!e$OO~P(dO!U#}OS!Xac!Xad!Xah!Xan!Xas!Xa!Y!Xa!]!Xa!`!Xa!e!Xa$]!Xag!Xa~O$]%hOg$oP~P/VOR#zOS!fOh%mOu#zOw#zO!Y%nO$]%lO$j!qO~Oy$cOQ$iX`$iXc$iXg$iXh$iXl$iXm$iXn$iXp$iXs$iXu$iXw$iX}$iX!q$iX$Z$iX$[$iX$j$iXo$iXr$iX~O`$YOc$YOg%wOl$YOm$YOn$YO~P)YO`$YOc$YOl$YOm$YOn$YOo%xO~P)YO`$YOc$YOl$YOm$YOn$YOr%yO~P)YOh%{OS#ZXc#ZXd#ZXn#ZX!Y#ZX!]#ZX!`#ZX$]#ZX~On%|O~Og&ROw&SO!r&SO~Os$SX!e$SXn$SX~P)}O!e$lOs$tan$ta~On&VO~Or&^O$Z&XO$j&WO~Og&_O~P&^Oy$cO!e&cO$s$|On#Ui$X#Uir#Ui~P)YO$r&fO~On$Qa$X$Qar$Qa~P!jOn#[O$X$qir$qi~O!e&iOg$pX~P&^Og&kO~Oy$cOQ#xXg#xXh#xXp#xXs#xXu#xXw#xX}#xX!e#xX!q#xX$Z#xX$[#xX$j#xX~O!e&mOg$gX~P)YOg&oO~Oo&pOy$cO!}&qO~OR#zOu#zOw#zO$]&sO$j!qO~O!U#}OS$Wac$Wad$Wah$Wan$Was$Wa!Y$Wa!]$Wa!`$Wa!e$Wa$]$Wa~Oc!dXg!QX!U!QX!e!QX~O!U#}O!e&uOg$oX~Oc&wO~Og&xO~Oc!mXg!mX!W!SX~OS!fOh&zO~O!U&|O~O!U&|O!W&}Og$nX~Oc'OOg!lX~O!W&}O~Og'PO~O$Z'QO~On'SO~Oc'TO!U#}O~Og'VOn'UO~Og'YO~O!U#}Os$Sa!e$San$Sa~OP$bOsvX!evXgvX~O$j&WOs#jX!e#jX~Os!RO!e'[O~Or'`O$Z&XO$j&WO~Oy$cOQ$PXh$PXn$PXp$PXs$PXu$PXw$PX}$PX!e$PX!q$PX$X$PX$Z$PX$[$PX$j$PX$s$PXr$PX~O!e&cO$s$|On#Uq$X#Uqr#Uq~P)YOo'eOy$cO!}'fO~Og#}X!e#}X~P'oO!e&iOg$pa~Og#|X!e#|X~P)YO!e&mOg$ga~Oo'eO~Og'kO~P)YOg'lO!W'mO~O$]'nOg#{X!e#{X~P/VO!e&uOg$oa~Og'sO~OS!fOh'uO~OS!fO~PGUO`'yOg'{O~OS#zac#zad#zah#za!Y#za!]#za!`#za$]#za~Og'}O~P!![Og'}On(OO~Oy$cOQ$Pah$Pan$Pap$Pas$Pau$Paw$Pa}$Pa!e$Pa!q$Pa$X$Pa$Z$Pa$[$Pa$j$Pa$s$Par$Pa~Oo(TO~Og#}a!e#}a~P&^Og#|a!e#|a~P)YOR#zOu#zOw#zO$]&sO$j&WO~Oc!fXg!QX!U!QX!e!QX~O!U#}Og#{a!e#{a~Oc(VO~O!e&uOg$oi~P)YOg!ai!U!ji~Og(XO~O!W(ZOg!ni~Og!li~P)YO`'yOg(^O~Oy$cOg!Pin!Pi~Og(_O~P!![On(`O~Og(aO~O!e&uOg$oq~Og(cO~OS!fO~P!$wOg#{q!e#{q~P)YO$_!r$`$j`$jy#S~",
    goto: "7g$uPPPPP$vP$yP%S%f%S%x&[P%SP&b%SPP&hPPP&n&x&xPPPPP&xPP&xP'hP&xP&x(k&xP)Z)^)d)d)v)dP)dP)dP)d)dP*])dP*i*o+e+hP+k*i+n*i+q+w+z,Q+z)d,WPP,|-S%S-Y%S-`-`-f-jPP%SP%S%SP-p.l.y/Q$yP/ZP/^P$yP$yP$yP/d$yP/g/j/m/t$yP$yPP$yP/y$yP/|0S0c0}1]1c1m1s1y2P2V2a2g2m2s2y3PPPPPPPPPPPP3V3`P4U4X5]P5e6_6t+z7Q7T7WPP7^RrQ_aOPco!R#[%Pq_OP]^co|}!O!P!R#S#[#p%P&iqSOP]^co|}!O!P!R#S#[#p%P&iqUOP]^co|}!O!P!R#S#[#p%P&iQtTR#buQwWR#cxQ!VYR#dyQ#d!XS$h!t!uR%U#f!Z!xdf!n!o!p#Z#q#v$[$^$`$c${%W%]%a&c&d&m&r&w'O'T'i'r'x(V(b!Y!xdf!n!o!p#Z#q#v$[$^$`$c${%W%]%a&c&d&m&r&w'O'T'i'r'x(V(bb#z!c$W%b%m&z&}'m'u(ZU&Z$r&]'[R'Z&Y!Z!tdf!n!o!p#Z#q#v$[$^$`$c${%W%]%a&c&d&m&r&w'O'T'i'r'x(V(bR$j!vQ&P$iR'W&Qq!h`ei!c!d!e!r#}$O$P$S$g$i$l&Q&uQ#x!cW%s$W%m&z'uQ&t%bQ'w&}Q(U'mR(d(ZQ#VjQ$V!jQ$v#UR&a$xX%q$W%m&z'up!h`ei!c!d!e!r#}$O$P$S$g$i$l&Q&uW%p$W%m&z'uQ&{%nQ'v&|Q'w&}R(d(ZR$T!fR%j$SR'p&uR&{%nX%o$W%m&z'uR'v&|X%t$W%m&z'uX%r$W%m&z'u!Y!xdf!n!o!p#Z#q#v$[$^$`$c${%W%]%a&c&d&m&r&w'O'T'i'r'x(V(bQ!}gR$q#OQ!WYR#eyQ#d!WR%U#eQ!ZZR#gzQ!_[R#h{T!^[{Q#s!]R%_#tQ!SXQ!i`Q#TjQ#n!QQ$Q!dQ$n!zQ$t#RQ$w#VQ$z#YQ%g$PQ&`$vQ'^&[Q'a&aR(S']SnP!RQ#^oQ%O#[R&g%PZmPo!R#[%PQ$}#ZQ&e${R'd&dR$g!rQ'R%{R(['yR#OgR#QhR$s#QS&[$r&]R(Q'[V&Y$r&]'[R#YkQ#`qR%S#`QcOSoP!RU!lco%PR%P#[Q%]#q[&l%]&r'i'r'x(bQ&r%aQ'i&mQ'r&wQ'x'OR(b(VQ$[!nQ$^!oQ$`!pV%v$[$^$`Q&Q$iR'X&QQ&v%iS'q&v(WR(W'rQ&n%]R'j&nQ&j%YR'h&jQ!QXR#m!QQ&d${R'c&dQ#]nS%Q#]%RR%R#^Q'z'RR(]'zQ$m!yR&U$mQ&]$rR'_&]Q']&[R(R']Q#XkR$y#XQ$P!dR%f$P_bOPco!R#[%P^XOPco!R#[%PQ!`]Q!a^Q#i|Q#j}Q#k!OQ#l!PQ$u#SQ%Y#pR'g&iR%^#qQ!rdQ!{f[$X!n!o!p$[$^$`Q${#Zh%[#q%]%a&m&r&w'O'i'r'x(V(bQ%`#vQ%z$cS&b${&dQ&h%WQ'b&cR'|'T]$Z!n!o!p$[$^$`Q!d`U!ye!r$gQ#RiQ#y!cS#|!d$PQ$R!eQ%d#}Q%e$OQ%i$SS&O$i&QQ&T$lR'o&uQ#{!cW%s$W%m&z'uQ&t%bQ'w&}Q(U'mR(d(ZQ%u$WQ&y%mQ't&zR(Y'uR%k$SR%Z#pQpPR#o!RQ!zeQ$f!rR%}$g",
    nodeNames: "\u26A0 Unit VariableName VariableName QueryCallee Comment StyleSheet RuleSet UniversalSelector TagSelector TagName NamespacedTagSelector NamespaceName TagName NestingSelector ClassSelector . ClassName PseudoClassSelector : :: PseudoClassName PseudoClassName ) ( ArgList ValueName ParenthesizedValue AtKeyword # ; ] [ BracketedValue } { BracedValue ColorLiteral NumberLiteral StringLiteral BinaryExpression BinOp CallExpression Callee IfExpression if ArgList IfBranch KeywordQuery FeatureQuery FeatureName BinaryQuery LogicOp ComparisonQuery CompareOp UnaryQuery UnaryQueryOp ParenthesizedQuery SelectorQuery selector ParenthesizedSelector StyleQuery style ParenthesedQuery CallQuery ArgList PropertyName , PropertyName UnaryQuery ParenthesedQuery BinaryQuery ParenthesedQuery ParenthesedQuery StyleFeature PropertyName StyleRange PseudoQuery CallLiteral CallTag ParenthesizedContent PseudoClassName ArgList IdSelector IdName AttributeSelector AttributeName NamespacedAttribute NamespaceName AttributeName MatchOp MatchFlag ChildSelector ChildOp DescendantSelector SiblingSelector SiblingOp Block Declaration PropertyName Important ImportStatement import Layer layer LayerName layer MediaStatement media CharsetStatement charset NamespaceStatement namespace NamespaceName KeyframesStatement keyframes KeyframeName KeyframeList KeyframeSelector KeyframeRangeName SupportsStatement supports ScopeStatement scope to FontFeatureStatement font-feature-values FontName AtRule Styles",
    maxTerm: 174,
    nodeProps: [["isolate", -2, 5, 39, ""], ["openedBy", 23, "(", 31, "[", 34, "{"], ["closedBy", 24, ")", 32, "]", 35, "}"]],
    propSources: [cssHighlighting],
    skippedNodes: [0, 5, 130],
    repeatNodeCount: 17,
    tokenData: "K`~R!bOX%ZX^&R^p%Zpq&Rqr)ers)vst+jtu2Xuv%Zvw3Rwx3dxy5Ryz5dz{5i{|6S|}:u}!O;W!O!P;u!P!Q<^!Q![=V![!]>Q!]!^>|!^!_?_!_!`@Z!`!a@n!a!b%Z!b!cAo!c!k%Z!k!lC|!l!u%Z!u!vC|!v!}%Z!}#OD_#O#P%Z#P#QDp#Q#R2X#R#]%Z#]#^ER#^#g%Z#g#hC|#h#o%Z#o#pIf#p#qIw#q#rJ`#r#sJq#s#y%Z#y#z&R#z$f%Z$f$g&R$g#BY%Z#BY#BZ&R#BZ$IS%Z$IS$I_&R$I_$I|%Z$I|$JO&R$JO$JT%Z$JT$JU&R$JU$KV%Z$KV$KW&R$KW&FU%Z&FU&FV&R&FV;'S%Z;'S;=`KY<%lO%Z`%^SOy%jz;'S%j;'S;=`%{<%lO%j`%oS!r`Oy%jz;'S%j;'S;=`%{<%lO%j`&OP;=`<%l%j~&Wh$_~OX%jX^'r^p%jpq'rqy%jz#y%j#y#z'r#z$f%j$f$g'r$g#BY%j#BY#BZ'r#BZ$IS%j$IS$I_'r$I_$I|%j$I|$JO'r$JO$JT%j$JT$JU'r$JU$KV%j$KV$KW'r$KW&FU%j&FU&FV'r&FV;'S%j;'S;=`%{<%lO%j~'yh$_~!r`OX%jX^'r^p%jpq'rqy%jz#y%j#y#z'r#z$f%j$f$g'r$g#BY%j#BY#BZ'r#BZ$IS%j$IS$I_'r$I_$I|%j$I|$JO'r$JO$JT%j$JT$JU'r$JU$KV%j$KV$KW'r$KW&FU%j&FU&FV'r&FV;'S%j;'S;=`%{<%lO%jj)jS$sYOy%jz;'S%j;'S;=`%{<%lO%j~)yWOY)vZr)vrs*cs#O)v#O#P*h#P;'S)v;'S;=`+d<%lO)v~*hOw~~*kRO;'S)v;'S;=`*t;=`O)v~*wXOY)vZr)vrs*cs#O)v#O#P*h#P;'S)v;'S;=`+d;=`<%l)v<%lO)v~+gP;=`<%l)vj+oYmYOy%jz!Q%j!Q![,_![!c%j!c!i,_!i#T%j#T#Z,_#Z;'S%j;'S;=`%{<%lO%jj,dY!r`Oy%jz!Q%j!Q![-S![!c%j!c!i-S!i#T%j#T#Z-S#Z;'S%j;'S;=`%{<%lO%jj-XY!r`Oy%jz!Q%j!Q![-w![!c%j!c!i-w!i#T%j#T#Z-w#Z;'S%j;'S;=`%{<%lO%jj.OYuY!r`Oy%jz!Q%j!Q![.n![!c%j!c!i.n!i#T%j#T#Z.n#Z;'S%j;'S;=`%{<%lO%jj.uYuY!r`Oy%jz!Q%j!Q![/e![!c%j!c!i/e!i#T%j#T#Z/e#Z;'S%j;'S;=`%{<%lO%jj/jY!r`Oy%jz!Q%j!Q![0Y![!c%j!c!i0Y!i#T%j#T#Z0Y#Z;'S%j;'S;=`%{<%lO%jj0aYuY!r`Oy%jz!Q%j!Q![1P![!c%j!c!i1P!i#T%j#T#Z1P#Z;'S%j;'S;=`%{<%lO%jj1UY!r`Oy%jz!Q%j!Q![1t![!c%j!c!i1t!i#T%j#T#Z1t#Z;'S%j;'S;=`%{<%lO%jj1{SuY!r`Oy%jz;'S%j;'S;=`%{<%lO%jd2[UOy%jz!_%j!_!`2n!`;'S%j;'S;=`%{<%lO%jd2uS!|S!r`Oy%jz;'S%j;'S;=`%{<%lO%jb3WS^QOy%jz;'S%j;'S;=`%{<%lO%j~3gWOY3dZw3dwx*cx#O3d#O#P4P#P;'S3d;'S;=`4{<%lO3d~4SRO;'S3d;'S;=`4];=`O3d~4`XOY3dZw3dwx*cx#O3d#O#P4P#P;'S3d;'S;=`4{;=`<%l3d<%lO3d~5OP;=`<%l3dj5WShYOy%jz;'S%j;'S;=`%{<%lO%j~5iOg~n5pUWQyWOy%jz!_%j!_!`2n!`;'S%j;'S;=`%{<%lO%jj6ZWyW#SQOy%jz!O%j!O!P6s!P!Q%j!Q![9x![;'S%j;'S;=`%{<%lO%jj6xU!r`Oy%jz!Q%j!Q![7[![;'S%j;'S;=`%{<%lO%jj7cY!r`$jYOy%jz!Q%j!Q![7[![!g%j!g!h8R!h#X%j#X#Y8R#Y;'S%j;'S;=`%{<%lO%jj8WY!r`Oy%jz{%j{|8v|}%j}!O8v!O!Q%j!Q![9_![;'S%j;'S;=`%{<%lO%jj8{U!r`Oy%jz!Q%j!Q![9_![;'S%j;'S;=`%{<%lO%jj9fU!r`$jYOy%jz!Q%j!Q![9_![;'S%j;'S;=`%{<%lO%jj:P[!r`$jYOy%jz!O%j!O!P7[!P!Q%j!Q![9x![!g%j!g!h8R!h#X%j#X#Y8R#Y;'S%j;'S;=`%{<%lO%jj:zS!eYOy%jz;'S%j;'S;=`%{<%lO%jj;]WyWOy%jz!O%j!O!P6s!P!Q%j!Q![9x![;'S%j;'S;=`%{<%lO%jj;zU`YOy%jz!Q%j!Q![7[![;'S%j;'S;=`%{<%lO%j~<cTyWOy%jz{<r{;'S%j;'S;=`%{<%lO%j~<yS!r`$`~Oy%jz;'S%j;'S;=`%{<%lO%jj=[[$jYOy%jz!O%j!O!P7[!P!Q%j!Q![9x![!g%j!g!h8R!h#X%j#X#Y8R#Y;'S%j;'S;=`%{<%lO%jj>VUcYOy%jz![%j![!]>i!];'S%j;'S;=`%{<%lO%jj>pSdY!r`Oy%jz;'S%j;'S;=`%{<%lO%jj?RSnYOy%jz;'S%j;'S;=`%{<%lO%jh?dU!WWOy%jz!_%j!_!`?v!`;'S%j;'S;=`%{<%lO%jh?}S!WW!r`Oy%jz;'S%j;'S;=`%{<%lO%jl@bS!WW!|SOy%jz;'S%j;'S;=`%{<%lO%jj@uV#PQ!WWOy%jz!_%j!_!`?v!`!aA[!a;'S%j;'S;=`%{<%lO%jbAcS#PQ!r`Oy%jz;'S%j;'S;=`%{<%lO%jjArYOy%jz}%j}!OBb!O!c%j!c!}CP!}#T%j#T#oCP#o;'S%j;'S;=`%{<%lO%jjBgW!r`Oy%jz!c%j!c!}CP!}#T%j#T#oCP#o;'S%j;'S;=`%{<%lO%jjCW[lY!r`Oy%jz}%j}!OCP!O!Q%j!Q![CP![!c%j!c!}CP!}#T%j#T#oCP#o;'S%j;'S;=`%{<%lO%jhDRS!}WOy%jz;'S%j;'S;=`%{<%lO%jjDdSpYOy%jz;'S%j;'S;=`%{<%lO%jnDuSo^Oy%jz;'S%j;'S;=`%{<%lO%jjEWU!}WOy%jz#a%j#a#bEj#b;'S%j;'S;=`%{<%lO%jbEoU!r`Oy%jz#d%j#d#eFR#e;'S%j;'S;=`%{<%lO%jbFWU!r`Oy%jz#c%j#c#dFj#d;'S%j;'S;=`%{<%lO%jbFoU!r`Oy%jz#f%j#f#gGR#g;'S%j;'S;=`%{<%lO%jbGWU!r`Oy%jz#h%j#h#iGj#i;'S%j;'S;=`%{<%lO%jbGoU!r`Oy%jz#T%j#T#UHR#U;'S%j;'S;=`%{<%lO%jbHWU!r`Oy%jz#b%j#b#cHj#c;'S%j;'S;=`%{<%lO%jbHoU!r`Oy%jz#h%j#h#iIR#i;'S%j;'S;=`%{<%lO%jbIYS$rQ!r`Oy%jz;'S%j;'S;=`%{<%lO%jjIkSsYOy%jz;'S%j;'S;=`%{<%lO%jfI|U$fUOy%jz!_%j!_!`2n!`;'S%j;'S;=`%{<%lO%jjJeSrYOy%jz;'S%j;'S;=`%{<%lO%jfJvU#SQOy%jz!_%j!_!`2n!`;'S%j;'S;=`%{<%lO%j`K]P;=`<%l%Z",
    tokenizers: [descendant, unitToken, identifiers, queryIdentifiers, 1, 2, 3, 4, new LocalTokenGroup("m~RRYZ[z{a~~g~aO$b~~dP!P!Qg~lO$c~~", 28, 155)],
    topRules: {
      "StyleSheet": [0, 6],
      "Styles": [1, 129]
    },
    dynamicPrecedences: {
      "97": 1
    },
    specialized: [{
      term: 150,
      get: function get(value) {
        return spec_callee[value] || -1;
      }
    }, {
      term: 151,
      get: function get(value) {
        return spec_queryIdentifier[value] || -1;
      }
    }, {
      term: 4,
      get: function get(value) {
        return spec_QueryCallee[value] || -1;
      }
    }, {
      term: 28,
      get: function get(value) {
        return spec_AtKeyword[value] || -1;
      }
    }, {
      term: 149,
      get: function get(value) {
        return spec_identifier[value] || -1;
      }
    }],
    tokenPrec: 2444
  });
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
    var _proto29 = _Text.prototype;
    _proto29.lineAt = function lineAt(pos) {
      if (pos < 0 || pos > this.length) throw new RangeError("Invalid position " + pos + " in document of length " + this.length);
      return this.lineInner(pos, false, 1, 0);
    };
    _proto29.line = function line(n) {
      if (n < 1 || n > this.lines) throw new RangeError("Invalid line number " + n + " in " + this.lines + "-line document");
      return this.lineInner(n, true, 1, 0);
    };
    _proto29.replace = function replace(from, to, text) {
      var _clip = clip(this, from, to);
      var _clip2 = _slicedToArray(_clip, 2);
      from = _clip2[0];
      to = _clip2[1];
      var parts = [];
      this.decompose(0, from, parts, 2);
      if (text.length) text.decompose(0, text.length, parts, 1 | 2);
      this.decompose(to, this.length, parts, 1);
      return TextNode.from(parts, this.length - (to - from) + text.length);
    };
    _proto29.append = function append(other) {
      return this.replace(this.length, this.length, other);
    };
    _proto29.slice = function slice(from, to) {
      if (to === void 0) {
        to = this.length;
      }
      var _clip3 = clip(this, from, to);
      var _clip4 = _slicedToArray(_clip3, 2);
      from = _clip4[0];
      to = _clip4[1];
      var parts = [];
      this.decompose(from, to, parts, 0);
      return TextNode.from(parts, to - from);
    };
    _proto29.eq = function eq(other) {
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
    _proto29.iter = function iter(dir) {
      if (dir === void 0) {
        dir = 1;
      }
      return new RawTextCursor(this, dir);
    };
    _proto29.iterRange = function iterRange(from, to) {
      if (to === void 0) {
        to = this.length;
      }
      return new PartialTextCursor(this, from, to);
    };
    _proto29.iterLines = function iterLines(from, to) {
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
    _proto29.toString = function toString() {
      return this.sliceString(0);
    };
    _proto29.toJSON = function toJSON() {
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
      var _this8;
      if (length === void 0) {
        length = textLength(text);
      }
      _this8 = _Text2.call(this) || this;
      _this8.text = text;
      _this8.length = length;
      return _this8;
    }
    _inheritsLoose(_TextLeaf, _Text2);
    var _proto30 = _TextLeaf.prototype;
    _proto30.lineInner = function lineInner(target, isLine, line, offset) {
      for (var i2 = 0;; i2++) {
        var string2 = this.text[i2],
          end = offset + string2.length;
        if ((isLine ? line : end) >= target) return new Line(offset, end, line, string2);
        offset = end + 1;
        line++;
      }
    };
    _proto30.decompose = function decompose(from, to, target, open) {
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
    _proto30.replace = function replace(from, to, text) {
      if (!(text instanceof _TextLeaf)) return _Text2.prototype.replace.call(this, from, to, text);
      var _clip5 = clip(this, from, to);
      var _clip6 = _slicedToArray(_clip5, 2);
      from = _clip6[0];
      to = _clip6[1];
      var lines = appendText(this.text, appendText(text.text, sliceText(this.text, 0, from)), to);
      var newLen = this.length + text.length - (to - from);
      if (lines.length <= 32) return new _TextLeaf(lines, newLen);
      return TextNode.from(_TextLeaf.split(lines, []), newLen);
    };
    _proto30.sliceString = function sliceString(from, to, lineSep) {
      if (to === void 0) {
        to = this.length;
      }
      if (lineSep === void 0) {
        lineSep = "\n";
      }
      var _clip7 = clip(this, from, to);
      var _clip8 = _slicedToArray(_clip7, 2);
      from = _clip8[0];
      to = _clip8[1];
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
    _proto30.flatten = function flatten(target) {
      for (var _iterator30 = _createForOfIteratorHelperLoose(this.text), _step30; !(_step30 = _iterator30()).done;) {
        var line = _step30.value;
        target.push(line);
      }
    };
    _proto30.scanIdentical = function scanIdentical() {
      return 0;
    };
    _TextLeaf.split = function split(text, target) {
      var part = [],
        len = -1;
      for (var _iterator31 = _createForOfIteratorHelperLoose(text), _step31; !(_step31 = _iterator31()).done;) {
        var line = _step31.value;
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
      var _this9;
      _this9 = _Text3.call(this) || this;
      _this9.children = children;
      _this9.length = length;
      _this9.lines = 0;
      for (var _iterator32 = _createForOfIteratorHelperLoose(children), _step32; !(_step32 = _iterator32()).done;) {
        var child = _step32.value;
        _this9.lines += child.lines;
      }
      return _this9;
    }
    _inheritsLoose(_TextNode, _Text3);
    var _proto31 = _TextNode.prototype;
    _proto31.lineInner = function lineInner(target, isLine, line, offset) {
      for (var i2 = 0;; i2++) {
        var child = this.children[i2],
          end = offset + child.length,
          endLine = line + child.lines - 1;
        if ((isLine ? endLine : end) >= target) return child.lineInner(target, isLine, line, offset);
        offset = end + 1;
        line = endLine + 1;
      }
    };
    _proto31.decompose = function decompose(from, to, target, open) {
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
    _proto31.replace = function replace(from, to, text) {
      var _clip9 = clip(this, from, to);
      var _clip0 = _slicedToArray(_clip9, 2);
      from = _clip0[0];
      to = _clip0[1];
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
    _proto31.sliceString = function sliceString(from, to, lineSep) {
      if (to === void 0) {
        to = this.length;
      }
      if (lineSep === void 0) {
        lineSep = "\n";
      }
      var _clip1 = clip(this, from, to);
      var _clip10 = _slicedToArray(_clip1, 2);
      from = _clip10[0];
      to = _clip10[1];
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
    _proto31.flatten = function flatten(target) {
      for (var _iterator33 = _createForOfIteratorHelperLoose(this.children), _step33; !(_step33 = _iterator33()).done;) {
        var child = _step33.value;
        child.flatten(target);
      }
    };
    _proto31.scanIdentical = function scanIdentical(other, dir) {
      if (!(other instanceof _TextNode)) return 0;
      var length = 0;
      var _ref2 = dir > 0 ? [0, 0, this.children.length, other.children.length] : [this.children.length - 1, other.children.length - 1, -1, -1],
        _ref3 = _slicedToArray(_ref2, 4),
        iA = _ref3[0],
        iB = _ref3[1],
        eA = _ref3[2],
        eB = _ref3[3];
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
      for (var _iterator34 = _createForOfIteratorHelperLoose(children), _step34; !(_step34 = _iterator34()).done;) {
        var _ch = _step34.value;
        lines += _ch.lines;
      }
      if (lines < 32) {
        var flat = [];
        for (var _iterator35 = _createForOfIteratorHelperLoose(children), _step35; !(_step35 = _iterator35()).done;) {
          var ch = _step35.value;
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
      function add(child) {
        var last;
        if (child.lines > maxChunk && child instanceof _TextNode) {
          for (var _iterator36 = _createForOfIteratorHelperLoose(child.children), _step36; !(_step36 = _iterator36()).done;) {
            var node = _step36.value;
            add(node);
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
      for (var _iterator37 = _createForOfIteratorHelperLoose(children), _step37; !(_step37 = _iterator37()).done;) {
        var child = _step37.value;
        add(child);
      }
      flush();
      return chunked.length == 1 ? chunked[0] : new _TextNode(chunked, length);
    };
    return _TextNode;
  }(Text);
  Text.empty = new TextLeaf([""], 0);
  function textLength(text) {
    var length = -1;
    for (var _iterator38 = _createForOfIteratorHelperLoose(text), _step38; !(_step38 = _iterator38()).done;) {
      var line = _step38.value;
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
    var _proto32 = RawTextCursor.prototype;
    _proto32.nextInner = function nextInner(skip, dir) {
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
          var _next2 = top2.children[offset + (dir < 0 ? -1 : 0)];
          if (skip > _next2.length) {
            skip -= _next2.length;
            this.offsets[last] += dir;
          } else {
            if (dir < 0) this.offsets[last]--;
            this.nodes.push(_next2);
            this.offsets.push(dir > 0 ? 1 : (_next2 instanceof TextLeaf ? _next2.text.length : _next2.children.length) << 1);
          }
        }
      }
    };
    _proto32.next = function next(skip) {
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
    var _proto33 = PartialTextCursor.prototype;
    _proto33.nextInner = function nextInner(skip, dir) {
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
    _proto33.next = function next(skip) {
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
    var _proto34 = LineCursor.prototype;
    _proto34.next = function next(skip) {
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
    var _proto35 = _ChangeDesc.prototype;
    _proto35.iterGaps = function iterGaps(f) {
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
    _proto35.iterChangedRanges = function iterChangedRanges(f, individual) {
      if (individual === void 0) {
        individual = false;
      }
      _iterChanges(this, f, individual);
    };
    _proto35.composeDesc = function composeDesc(other) {
      return this.empty ? other : other.empty ? this : composeSets(this, other);
    };
    _proto35.mapDesc = function mapDesc(other, before) {
      if (before === void 0) {
        before = false;
      }
      return other.empty ? this : mapSet(this, other, before);
    };
    _proto35.mapPos = function mapPos(pos, assoc, mode) {
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
    _proto35.touchesRange = function touchesRange(from, to) {
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
    _proto35.toString = function toString() {
      var result = "";
      for (var i2 = 0; i2 < this.sections.length;) {
        var len = this.sections[i2++],
          ins = this.sections[i2++];
        result += (result ? " " : "") + len + (ins >= 0 ? ":" + ins : "");
      }
      return result;
    };
    _proto35.toJSON = function toJSON() {
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
      var _this0;
      _this0 = _ChangeDesc2.call(this, sections) || this;
      _this0.inserted = inserted;
      return _this0;
    }
    _inheritsLoose(_ChangeSet, _ChangeDesc2);
    var _proto36 = _ChangeSet.prototype;
    _proto36.apply = function apply(doc2) {
      if (this.length != doc2.length) throw new RangeError("Applying change set to a document with the wrong length");
      _iterChanges(this, function (fromA, toA, fromB, _toB, text) {
        return doc2 = doc2.replace(fromB, fromB + (toA - fromA), text);
      }, false);
      return doc2;
    };
    _proto36.mapDesc = function mapDesc(other, before) {
      if (before === void 0) {
        before = false;
      }
      return mapSet(this, other, before, true);
    };
    _proto36.invert = function invert(doc2) {
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
    _proto36.compose = function compose(other) {
      return this.empty ? other : other.empty ? this : composeSets(this, other, true);
    };
    _proto36.map = function map(other, before) {
      if (before === void 0) {
        before = false;
      }
      return other.empty ? this : mapSet(this, other, before, true);
    };
    _proto36.iterChanges = function iterChanges(f, individual) {
      if (individual === void 0) {
        individual = false;
      }
      _iterChanges(this, f, individual);
    };
    _proto36.filter = function filter(ranges) {
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
          var _len2 = Math.min(iter.len, end - pos);
          addSection(resultSections, _len2, -1);
          addSection(filteredSections, _len2, iter.ins == -1 ? -1 : iter.off == 0 ? iter.ins : 0);
          iter.forward(_len2);
          pos += _len2;
        }
      }
      return {
        changes: new _ChangeSet(resultSections, resultInserted),
        filtered: ChangeDesc.create(filteredSections)
      };
    };
    _proto36.toJSON = function toJSON() {
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
      function process2(spec) {
        if (Array.isArray(spec)) {
          for (var _iterator39 = _createForOfIteratorHelperLoose(spec), _step39; !(_step39 = _iterator39()).done;) {
            var sub = _step39.value;
            process2(sub);
          }
        } else if (spec instanceof _ChangeSet) {
          if (spec.length != length) throw new RangeError("Mismatched change set length (got " + spec.length + ", expected " + length + ")");
          flush();
          total = total ? total.compose(spec.map(total)) : spec;
        } else {
          var from = spec.from,
            _spec$to2 = spec.to,
            to = _spec$to2 === void 0 ? from : _spec$to2,
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
      process2(changes);
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
  function addInsert(values2, sections, value) {
    if (value.length == 0) return;
    var index = sections.length - 2 >> 1;
    if (index < values2.length) {
      values2[values2.length - 1] = values2[values2.length - 1].append(value);
    } else {
      while (values2.length < index) values2.push(Text.empty);
      values2.push(value);
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
        var _len3 = b.len;
        addSection(sections, b.ins, -1);
        while (_len3) {
          var piece = Math.min(a.len, _len3);
          if (a.ins >= 0 && inserted < a.i && a.len <= piece) {
            addSection(sections, 0, a.ins);
            if (insert2) addInsert(insert2, sections, a.text);
            inserted = a.i;
          }
          a.forward(piece);
          _len3 -= piece;
        }
        b.next();
      } else if (a.ins >= 0) {
        var _len4 = 0,
          left = a.len;
        while (left) {
          if (b.ins == -1) {
            var _piece = Math.min(left, b.len);
            _len4 += _piece;
            left -= _piece;
            b.forward(_piece);
          } else if (b.ins == 0 && b.len < left) {
            left -= b.len;
            b.next();
          } else {
            break;
          }
        }
        addSection(sections, _len4, inserted < a.i ? a.ins : 0);
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
    var _proto37 = SectionIter.prototype;
    _proto37.next = function next() {
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
    _proto37.textBit = function textBit(len) {
      var inserted = this.set.inserted,
        index = this.i - 2 >> 1;
      return index >= inserted.length && !len ? Text.empty : inserted[index].slice(this.off, len == null ? void 0 : this.off + len);
    };
    _proto37.forward = function forward(len) {
      if (len == this.len) this.next();else {
        this.len -= len;
        this.off += len;
      }
    };
    _proto37.forward2 = function forward2(len) {
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
    var _proto38 = _SelectionRange.prototype;
    _proto38.map = function map(change, assoc) {
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
    _proto38.extend = function extend(from, to, assoc) {
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
    _proto38.eq = function eq(other, includeAssoc) {
      if (includeAssoc === void 0) {
        includeAssoc = false;
      }
      return this.anchor == other.anchor && this.head == other.head && this.goalColumn == other.goalColumn && (!includeAssoc || !this.empty || this.assoc == other.assoc);
    };
    _proto38.toJSON = function toJSON() {
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
    var _proto39 = _EditorSelection.prototype;
    _proto39.map = function map(change, assoc) {
      if (assoc === void 0) {
        assoc = -1;
      }
      if (change.empty) return this;
      return _EditorSelection.create(this.ranges.map(function (r) {
        return r.map(change, assoc);
      }), this.mainIndex);
    };
    _proto39.eq = function eq(other, includeAssoc) {
      if (includeAssoc === void 0) {
        includeAssoc = false;
      }
      if (this.ranges.length != other.ranges.length || this.mainIndex != other.mainIndex) return false;
      for (var i2 = 0; i2 < this.ranges.length; i2++) if (!this.ranges[i2].eq(other.ranges[i2], includeAssoc)) return false;
      return true;
    };
    _proto39.asSingle = function asSingle() {
      return this.ranges.length == 1 ? this : new _EditorSelection([this.main], 0);
    };
    _proto39.addRange = function addRange(range, main) {
      if (main === void 0) {
        main = true;
      }
      return _EditorSelection.create([range].concat(this.ranges), main ? 0 : this.mainIndex + 1);
    };
    _proto39.replaceRange = function replaceRange(range, which) {
      if (which === void 0) {
        which = this.mainIndex;
      }
      var ranges = this.ranges.slice();
      ranges[which] = range;
      return _EditorSelection.create(ranges, this.mainIndex);
    };
    _proto39.toJSON = function toJSON() {
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
  function checkSelection(selection2, docLength) {
    for (var _iterator40 = _createForOfIteratorHelperLoose(selection2.ranges), _step40; !(_step40 = _iterator40()).done;) {
      var range = _step40.value;
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
      }, config.compare || (!config.combine ? sameArray2 : function (a, b) {
        return a === b;
      }), !!config.static, config.enables);
    };
    var _proto40 = _Facet.prototype;
    _proto40.of = function of(value) {
      return new FacetProvider([], this, 0, value);
    };
    _proto40.compute = function compute(deps, get) {
      if (this.isStatic) throw new Error("Can't compute a static facet");
      return new FacetProvider(deps, this, 1, get);
    };
    _proto40.computeN = function computeN(deps, get) {
      if (this.isStatic) throw new Error("Can't compute a static facet");
      return new FacetProvider(deps, this, 2, get);
    };
    _proto40.from = function from(field, get) {
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
  function sameArray2(a, b) {
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
    var _proto41 = FacetProvider.prototype;
    _proto41.dynamicSlot = function dynamicSlot(addresses) {
      var _this1 = this;
      var _a2;
      var getter = this.value;
      var compare2 = this.facet.compareInput;
      var id2 = this.id,
        idx = addresses[id2] >> 1,
        multi = this.type == 2;
      var depDoc = false,
        depSel = false,
        depAddrs = [];
      for (var _iterator41 = _createForOfIteratorHelperLoose(this.dependencies), _step41; !(_step41 = _iterator41()).done;) {
        var dep = _step41.value;
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
            oldAddr = oldState.config.address[id2];
          if (oldAddr != null) {
            var oldVal = getAddr(oldState, oldAddr);
            if (_this1.dependencies.every(function (dep) {
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
    for (var _iterator42 = _createForOfIteratorHelperLoose(addrs), _step42; !(_step42 = _iterator42()).done;) {
      var addr = _step42.value;
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
      var values2 = [];
      for (var i2 = 0; i2 < providerAddrs.length; i2++) {
        var value = getAddr(state, providerAddrs[i2]);
        if (providerTypes[i2] == 2) {
          for (var _iterator43 = _createForOfIteratorHelperLoose(value), _step43; !(_step43 = _iterator43()).done;) {
            var _val = _step43.value;
            values2.push(_val);
          }
        } else values2.push(value);
      }
      return facet.combine(values2);
    }
    return {
      create: function create(state) {
        for (var _iterator44 = _createForOfIteratorHelperLoose(providerAddrs), _step44; !(_step44 = _iterator44()).done;) {
          var addr = _step44.value;
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
        if (oldProviders && !depChanged && sameArray2(providers, oldProviders)) {
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
    function _StateField(id2, createF, updateF, compareF, spec) {
      this.id = id2;
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
    var _proto42 = _StateField.prototype;
    _proto42.create = function create(state) {
      var _this10 = this;
      var init = state.facet(initField).find(function (i2) {
        return i2.field == _this10;
      });
      return ((init === null || init === void 0 ? void 0 : init.create) || this.createF)(state);
    };
    _proto42.slot = function slot(addresses) {
      var _this11 = this;
      var idx = addresses[this.id] >> 1;
      return {
        create: function create(state) {
          state.values[idx] = _this11.create(state);
          return 1;
        },
        update: function update(state, tr) {
          var oldVal = state.values[idx];
          var value = _this11.updateF(oldVal, tr);
          if (_this11.compareF(oldVal, value)) return 0;
          state.values[idx] = value;
          return 1;
        },
        reconfigure: function reconfigure(state, oldState) {
          var init = state.facet(initField),
            oldInit = oldState.facet(initField),
            reInit;
          if ((reInit = init.find(function (i2) {
            return i2.field == _this11;
          })) && reInit != oldInit.find(function (i2) {
            return i2.field == _this11;
          })) {
            state.values[idx] = reInit.create(state);
            return 1;
          }
          if (oldState.config.address[_this11.id] != null) {
            state.values[idx] = oldState.field(_this11);
            return 0;
          }
          state.values[idx] = _this11.create(state);
          return 1;
        }
      };
    };
    _proto42.init = function init(create) {
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
    var _proto43 = _Compartment.prototype;
    _proto43.of = function of(ext) {
      return new CompartmentInstance(this, ext);
    };
    _proto43.reconfigure = function reconfigure(content2) {
      return _Compartment.reconfigure.of({
        compartment: this,
        extension: content2
      });
    };
    _proto43.get = function get(state) {
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
    var _proto44 = _Configuration.prototype;
    _proto44.staticFacet = function staticFacet(facet) {
      var addr = this.address[facet.id];
      return addr == null ? facet.default : this.staticValues[addr >> 1];
    };
    _Configuration.resolve = function resolve(base2, compartments, oldState) {
      var fields = [];
      var facets = Object.create(null);
      var newCompartments = new Map();
      for (var _iterator45 = _createForOfIteratorHelperLoose(flatten(base2, compartments, newCompartments)), _step45; !(_step45 = _iterator45()).done;) {
        var ext = _step45.value;
        if (ext instanceof StateField) fields.push(ext);else (facets[ext.facet.id] || (facets[ext.facet.id] = [])).push(ext);
      }
      var address = Object.create(null);
      var staticValues = [];
      var dynamicSlots = [];
      var _loop5 = function _loop5() {
        var field = _fields[_i10];
        address[field.id] = dynamicSlots.length << 1;
        dynamicSlots.push(function (a) {
          return field.slot(a);
        });
      };
      for (var _i10 = 0, _fields = fields; _i10 < _fields.length; _i10++) {
        _loop5();
      }
      var oldFacets = oldState === null || oldState === void 0 ? void 0 : oldState.config.facets;
      var _loop6 = function _loop6() {
        var providers = facets[id2],
          facet = providers[0].facet;
        var oldProviders = oldFacets && oldFacets[id2] || [];
        if (providers.every(function (p) {
          return p.type == 0;
        })) {
          address[facet.id] = staticValues.length << 1 | 1;
          if (sameArray2(oldProviders, providers)) {
            staticValues.push(oldState.facet(facet));
          } else {
            var value = facet.combine(providers.map(function (p) {
              return p.value;
            }));
            staticValues.push(oldState && facet.compare(value, oldState.facet(facet)) ? oldState.facet(facet) : value);
          }
        } else {
          var _loop7 = function _loop7() {
            var p = _step46.value;
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
          for (var _iterator46 = _createForOfIteratorHelperLoose(providers), _step46; !(_step46 = _iterator46()).done;) {
            _loop7();
          }
          address[facet.id] = dynamicSlots.length << 1;
          dynamicSlots.push(function (a) {
            return dynamicFacetSlot(a, facet, providers);
          });
        }
      };
      for (var id2 in facets) {
        _loop6();
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
        for (var _iterator47 = _createForOfIteratorHelperLoose(ext), _step47; !(_step47 = _iterator47()).done;) {
          var e = _step47.value;
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
    var status = state.status[idx];
    if (status == 4) throw new Error("Cyclic dependency between fields and/or facets");
    if (status & 2) return status;
    state.status[idx] = 4;
    var changed = state.computeSlot(state, state.config.dynamicSlots[idx]);
    return state.status[idx] = 2 | changed;
  }
  function getAddr(state, addr) {
    return addr & 1 ? state.config.staticValues[addr >> 1] : state.values[addr >> 1];
  }
  var languageData = Facet.define();
  var allowMultipleSelections = Facet.define({
    combine: function combine(values2) {
      return values2.some(function (v) {
        return v;
      });
    },
    static: true
  });
  var lineSeparator = Facet.define({
    combine: function combine(values2) {
      return values2.length ? values2[0] : void 0;
    },
    static: true
  });
  var changeFilter = Facet.define();
  var transactionFilter = Facet.define();
  var transactionExtender = Facet.define();
  var readOnly = Facet.define({
    combine: function combine(values2) {
      return values2.length ? values2[0] : false;
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
    var _proto45 = AnnotationType.prototype;
    _proto45.of = function of(value) {
      return new Annotation(this, value);
    };
    return AnnotationType;
  }();
  var StateEffectType = function () {
    function StateEffectType(map) {
      this.map = map;
    }
    var _proto46 = StateEffectType.prototype;
    _proto46.of = function of(value) {
      return new StateEffect(this, value);
    };
    return StateEffectType;
  }();
  var StateEffect = function () {
    function _StateEffect(type, value) {
      this.type = type;
      this.value = value;
    }
    var _proto47 = _StateEffect.prototype;
    _proto47.map = function map(mapping) {
      var mapped = this.type.map(this.value, mapping);
      return mapped === void 0 ? void 0 : mapped == this.value ? this : new _StateEffect(this.type, mapped);
    };
    _proto47.is = function is(type) {
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
      for (var _iterator48 = _createForOfIteratorHelperLoose(effects), _step48; !(_step48 = _iterator48()).done;) {
        var effect = _step48.value;
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
    function _Transaction(startState, changes, selection2, effects, annotations, scrollIntoView2) {
      this.startState = startState;
      this.changes = changes;
      this.selection = selection2;
      this.effects = effects;
      this.annotations = annotations;
      this.scrollIntoView = scrollIntoView2;
      this._doc = null;
      this._state = null;
      if (selection2) checkSelection(selection2, changes.newLength);
      if (!annotations.some(function (a) {
        return a.type == _Transaction.time;
      })) this.annotations = annotations.concat(_Transaction.time.of(Date.now()));
    }
    _Transaction.create = function create(startState, changes, selection2, effects, annotations, scrollIntoView2) {
      return new _Transaction(startState, changes, selection2, effects, annotations, scrollIntoView2);
    };
    var _proto48 = _Transaction.prototype;
    _proto48.annotation = function annotation(type) {
      for (var _iterator49 = _createForOfIteratorHelperLoose(this.annotations), _step49; !(_step49 = _iterator49()).done;) {
        var ann = _step49.value;
        if (ann.type == type) return ann.value;
      }
      return void 0;
    };
    _proto48.isUserEvent = function isUserEvent(event) {
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
    for (var _iterator50 = _createForOfIteratorHelperLoose(state.facet(changeFilter)), _step50; !(_step50 = _iterator50()).done;) {
      var filter = _step50.value;
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
    function _EditorState(config, doc2, selection2, values2, computeSlot, tr) {
      this.config = config;
      this.doc = doc2;
      this.selection = selection2;
      this.values = values2;
      this.status = config.statusTemplate.slice();
      this.computeSlot = computeSlot;
      if (tr) tr._state = this;
      for (var i2 = 0; i2 < this.config.dynamicSlots.length; i2++) ensureAddr(this, i2 << 1);
      this.computeSlot = null;
    }
    var _proto49 = _EditorState.prototype;
    _proto49.field = function field(_field, require2) {
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
    _proto49.update = function update() {
      for (var _len5 = arguments.length, specs = new Array(_len5), _key2 = 0; _key2 < _len5; _key2++) {
        specs[_key2] = arguments[_key2];
      }
      return resolveTransaction(this, specs, true);
    };
    _proto49.applyTransaction = function applyTransaction(tr) {
      var _this12 = this;
      var conf = this.config,
        _conf = conf,
        base2 = _conf.base,
        compartments = _conf.compartments;
      for (var _iterator51 = _createForOfIteratorHelperLoose(tr.effects), _step51; !(_step51 = _iterator51()).done;) {
        var effect = _step51.value;
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
          return slot.reconfigure(state, _this12);
        }, null);
        startValues = intermediateState.values;
      } else {
        startValues = tr.startState.values.slice();
      }
      var selection2 = tr.startState.facet(allowMultipleSelections) ? tr.newSelection : tr.newSelection.asSingle();
      new _EditorState(conf, tr.newDoc, selection2, startValues, function (state, slot) {
        return slot.update(state, tr);
      }, tr);
    };
    _proto49.replaceSelection = function replaceSelection(text) {
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
    _proto49.changeByRange = function changeByRange(f) {
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
    _proto49.changes = function changes(spec) {
      if (spec === void 0) {
        spec = [];
      }
      if (spec instanceof ChangeSet) return spec;
      return ChangeSet.of(spec, this.doc.length, this.facet(_EditorState.lineSeparator));
    };
    _proto49.toText = function toText(string2) {
      return Text.of(string2.split(this.facet(_EditorState.lineSeparator) || DefaultSplit));
    };
    _proto49.sliceDoc = function sliceDoc(from, to) {
      if (from === void 0) {
        from = 0;
      }
      if (to === void 0) {
        to = this.doc.length;
      }
      return this.doc.sliceString(from, to, this.lineBreak);
    };
    _proto49.facet = function facet(_facet) {
      var addr = this.config.address[_facet.id];
      if (addr == null) return _facet.default;
      ensureAddr(this, addr);
      return getAddr(this, addr);
    };
    _proto49.toJSON = function toJSON(fields) {
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
        var _loop8 = function _loop8() {
          if (Object.prototype.hasOwnProperty.call(json, prop)) {
            var field = fields[prop],
              value = json[prop];
            fieldInit.push(field.init(function (state) {
              return field.spec.fromJSON(value, state);
            }));
          }
        };
        for (var prop in fields) {
          _loop8();
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
      var selection2 = !config.selection ? EditorSelection.single(0) : config.selection instanceof EditorSelection ? config.selection : EditorSelection.single(config.selection.anchor, config.selection.head);
      checkSelection(selection2, doc2.length);
      if (!configuration.staticFacet(allowMultipleSelections)) selection2 = selection2.asSingle();
      return new _EditorState(configuration, doc2, selection2, configuration.dynamicSlots.map(function () {
        return null;
      }), function (state, slot) {
        return slot.create(state);
      }, null);
    };
    _proto49.phrase = function phrase(_phrase) {
      for (var _len6 = arguments.length, insert2 = new Array(_len6 > 1 ? _len6 - 1 : 0), _key3 = 1; _key3 < _len6; _key3++) {
        insert2[_key3 - 1] = arguments[_key3];
      }
      for (var _iterator52 = _createForOfIteratorHelperLoose(this.facet(_EditorState.phrases)), _step52; !(_step52 = _iterator52()).done;) {
        var map = _step52.value;
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
    _proto49.languageDataAt = function languageDataAt(name2, pos, side) {
      if (side === void 0) {
        side = -1;
      }
      var values2 = [];
      for (var _iterator53 = _createForOfIteratorHelperLoose(this.facet(languageData)), _step53; !(_step53 = _iterator53()).done;) {
        var provider = _step53.value;
        for (var _iterator54 = _createForOfIteratorHelperLoose(provider(this, pos, side)), _step54; !(_step54 = _iterator54()).done;) {
          var result = _step54.value;
          if (Object.prototype.hasOwnProperty.call(result, name2)) values2.push(result[name2]);
        }
      }
      return values2;
    };
    _proto49.charCategorizer = function charCategorizer(at) {
      var chars = this.languageDataAt("wordChars", at);
      return makeCategorizer(chars.length ? chars[0] : "");
    };
    _proto49.wordAt = function wordAt(pos) {
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
    combine: function combine(values2) {
      return values2.length ? values2[0] : 4;
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
    for (var _iterator55 = _createForOfIteratorHelperLoose(configs), _step55; !(_step55 = _iterator55()).done;) {
      var config = _step55.value;
      for (var _i11 = 0, _Object$keys = Object.keys(config); _i11 < _Object$keys.length; _i11++) {
        var _key4 = _Object$keys[_i11];
        var value = config[_key4],
          current = result[_key4];
        if (current === void 0) result[_key4] = value;else if (current === value || value === void 0) ;else if (Object.hasOwnProperty.call(combine, _key4)) result[_key4] = combine[_key4](current, value);else throw new Error("Config merge conflict for field " + _key4);
      }
    }
    for (var key in defaults) if (result[key] === void 0) result[key] = defaults[key];
    return result;
  }
  var RangeValue = function () {
    function RangeValue() {}
    var _proto50 = RangeValue.prototype;
    _proto50.eq = function eq(other) {
      return this == other;
    };
    _proto50.range = function range(from, to) {
      if (to === void 0) {
        to = from;
      }
      return Range2.create(from, to, this);
    };
    return RangeValue;
  }();
  RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
  RangeValue.prototype.point = false;
  RangeValue.prototype.mapMode = MapMode.TrackDel;
  function cmpVal(a, b) {
    return a == b || a.constructor == b.constructor && a.eq(b);
  }
  var Range2 = function () {
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
    var _proto51 = _Chunk.prototype;
    _proto51.findIndex = function findIndex(pos, side, end, startAt) {
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
    _proto51.between = function between(offset, from, to, f) {
      for (var i2 = this.findIndex(from, -1e9, true), e = this.findIndex(to, 1e9, false, i2); i2 < e; i2++) if (f(this.from[i2] + offset, this.to[i2] + offset, this.value[i2]) === false) return false;
    };
    _proto51.map = function map(offset, changes) {
      var value = [],
        from = [],
        to = [],
        newPos = -1,
        maxPoint = -1;
      for (var i2 = 0; i2 < this.value.length; i2++) {
        var _val2 = this.value[i2],
          curFrom = this.from[i2] + offset,
          curTo = this.to[i2] + offset,
          newFrom = void 0,
          newTo = void 0;
        if (curFrom == curTo) {
          var mapped = changes.mapPos(curFrom, _val2.startSide, _val2.mapMode);
          if (mapped == null) continue;
          newFrom = newTo = mapped;
          if (_val2.startSide != _val2.endSide) {
            newTo = changes.mapPos(curFrom, _val2.endSide);
            if (newTo < newFrom) continue;
          }
        } else {
          newFrom = changes.mapPos(curFrom, _val2.startSide);
          newTo = changes.mapPos(curTo, _val2.endSide);
          if (newFrom > newTo || newFrom == newTo && _val2.startSide > 0 && _val2.endSide <= 0) continue;
        }
        if ((newTo - newFrom || _val2.endSide - _val2.startSide) < 0) continue;
        if (newPos < 0) newPos = newFrom;
        if (_val2.point) maxPoint = Math.max(maxPoint, newTo - newFrom);
        value.push(_val2);
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
    var _proto52 = _RangeSet.prototype;
    _proto52.chunkEnd = function chunkEnd(index) {
      return this.chunkPos[index] + this.chunk[index].length;
    };
    _proto52.update = function update(updateSpec) {
      var _updateSpec$add = updateSpec.add,
        add = _updateSpec$add === void 0 ? [] : _updateSpec$add,
        _updateSpec$sort = updateSpec.sort,
        sort = _updateSpec$sort === void 0 ? false : _updateSpec$sort,
        _updateSpec$filterFro = updateSpec.filterFrom,
        filterFrom = _updateSpec$filterFro === void 0 ? 0 : _updateSpec$filterFro,
        _updateSpec$filterTo = updateSpec.filterTo,
        filterTo = _updateSpec$filterTo === void 0 ? this.length : _updateSpec$filterTo;
      var filter = updateSpec.filter;
      if (add.length == 0 && !filter) return this;
      if (sort) add = add.slice().sort(cmpRange);
      if (this.isEmpty) return add.length ? _RangeSet.of(add) : this;
      var cur = new LayerCursor(this, null, -1).goto(0),
        i2 = 0,
        spill = [];
      var builder = new RangeSetBuilder();
      while (cur.value || i2 < add.length) {
        if (i2 < add.length && (cur.from - add[i2].from || cur.startSide - add[i2].value.startSide) >= 0) {
          var range = add[i2++];
          if (!builder.addInner(range.from, range.to, range.value)) spill.push(range);
        } else if (cur.rangeIndex == 1 && cur.chunkIndex < this.chunk.length && (i2 == add.length || this.chunkEnd(cur.chunkIndex) < add[i2].from) && (!filter || filterFrom > this.chunkEnd(cur.chunkIndex) || filterTo < this.chunkPos[cur.chunkIndex]) && builder.addChunk(this.chunkPos[cur.chunkIndex], this.chunk[cur.chunkIndex])) {
          cur.nextChunk();
        } else {
          if (!filter || filterFrom > cur.to || filterTo < cur.from || filter(cur.from, cur.to, cur.value)) {
            if (!builder.addInner(cur.from, cur.to, cur.value)) spill.push(Range2.create(cur.from, cur.to, cur.value));
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
    _proto52.map = function map(changes) {
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
    _proto52.between = function between(from, to, f) {
      if (this.isEmpty) return;
      for (var i2 = 0; i2 < this.chunk.length; i2++) {
        var start = this.chunkPos[i2],
          chunk = this.chunk[i2];
        if (to >= start && from <= start + chunk.length && chunk.between(start, from - start, to - start, f) === false) return;
      }
      this.nextLayer.between(from, to, f);
    };
    _proto52.iter = function iter(from) {
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
      var cursor2 = new SpanCursor(sets, null, minPointSize).goto(from),
        pos = from;
      var openRanges = cursor2.openStart;
      for (;;) {
        var curTo = Math.min(cursor2.to, to);
        if (cursor2.point) {
          var active = cursor2.activeForPoint(cursor2.to);
          var openCount = cursor2.pointFrom < from ? active.length + 1 : cursor2.point.startSide < 0 ? active.length : Math.min(active.length, openRanges);
          iterator.point(pos, curTo, cursor2.point, active, openCount, cursor2.pointRank);
          openRanges = Math.min(cursor2.openEnd(curTo), active.length);
        } else if (curTo > pos) {
          iterator.span(pos, curTo, cursor2.active, openRanges);
          openRanges = cursor2.openEnd(curTo);
        }
        if (cursor2.to > to) return openRanges + (cursor2.point && cursor2.to > to ? 1 : 0);
        pos = cursor2.to;
        cursor2.next();
      }
    };
    _RangeSet.of = function of(ranges, sort) {
      if (sort === void 0) {
        sort = false;
      }
      var build = new RangeSetBuilder();
      for (var _iterator56 = _createForOfIteratorHelperLoose(ranges instanceof Range2 ? [ranges] : sort ? lazySort(ranges) : ranges), _step56; !(_step56 = _iterator56()).done;) {
        var range = _step56.value;
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
        for (var _iterator57 = _createForOfIteratorHelperLoose(this.chunk), _step57; !(_step57 = _iterator57()).done;) {
          var chunk = _step57.value;
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
    var _proto53 = _RangeSetBuilder.prototype;
    _proto53.finishChunk = function finishChunk(newArrays) {
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
    _proto53.add = function add(from, to, value) {
      if (!this.addInner(from, to, value)) (this.nextLayer || (this.nextLayer = new _RangeSetBuilder())).add(from, to, value);
    };
    _proto53.addInner = function addInner(from, to, value) {
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
    _proto53.addChunk = function addChunk(from, chunk) {
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
    _proto53.finish = function finish() {
      return this.finishInner(RangeSet.empty);
    };
    _proto53.finishInner = function finishInner(next) {
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
    for (var _iterator58 = _createForOfIteratorHelperLoose(a), _step58; !(_step58 = _iterator58()).done;) {
      var set = _step58.value;
      for (var i2 = 0; i2 < set.chunk.length; i2++) if (set.chunk[i2].maxPoint <= 0) inA.set(set.chunk[i2], set.chunkPos[i2]);
    }
    var shared = new Set();
    for (var _iterator59 = _createForOfIteratorHelperLoose(b), _step59; !(_step59 = _iterator59()).done;) {
      var _set = _step59.value;
      for (var _i12 = 0; _i12 < _set.chunk.length; _i12++) {
        var known = inA.get(_set.chunk[_i12]);
        if (known != null && (textDiff ? textDiff.mapPos(known) : known) == _set.chunkPos[_i12] && !(textDiff === null || textDiff === void 0 ? void 0 : textDiff.touchesRange(known, known + _set.chunk[_i12].length))) shared.add(_set.chunk[_i12]);
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
    var _proto54 = LayerCursor.prototype;
    _proto54.goto = function goto(pos, side) {
      if (side === void 0) {
        side = -1e9;
      }
      this.chunkIndex = this.rangeIndex = 0;
      this.gotoInner(pos, side, false);
      return this;
    };
    _proto54.gotoInner = function gotoInner(pos, side, forward) {
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
    _proto54.forward = function forward(pos, side) {
      if ((this.to - pos || this.endSide - side) < 0) this.gotoInner(pos, side, true);
    };
    _proto54.next = function next() {
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
    _proto54.setRangeIndex = function setRangeIndex(index) {
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
    _proto54.nextChunk = function nextChunk() {
      this.chunkIndex++;
      this.rangeIndex = 0;
      this.next();
    };
    _proto54.compare = function compare(other) {
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
    var _proto55 = _HeapCursor.prototype;
    _proto55.goto = function goto(pos, side) {
      if (side === void 0) {
        side = -1e9;
      }
      for (var _iterator60 = _createForOfIteratorHelperLoose(this.heap), _step60; !(_step60 = _iterator60()).done;) {
        var cur = _step60.value;
        cur.goto(pos, side);
      }
      for (var i2 = this.heap.length >> 1; i2 >= 0; i2--) heapBubble(this.heap, i2);
      this.next();
      return this;
    };
    _proto55.forward = function forward(pos, side) {
      for (var _iterator61 = _createForOfIteratorHelperLoose(this.heap), _step61; !(_step61 = _iterator61()).done;) {
        var cur = _step61.value;
        cur.forward(pos, side);
      }
      for (var i2 = this.heap.length >> 1; i2 >= 0; i2--) heapBubble(this.heap, i2);
      if ((this.to - pos || this.value.endSide - side) < 0) this.next();
    };
    _proto55.next = function next() {
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
    var _proto56 = SpanCursor.prototype;
    _proto56.goto = function goto(pos, side) {
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
    _proto56.forward = function forward(pos, side) {
      while (this.minActive > -1 && (this.activeTo[this.minActive] - pos || this.active[this.minActive].endSide - side) < 0) this.removeActive(this.minActive);
      this.cursor.forward(pos, side);
    };
    _proto56.removeActive = function removeActive(index) {
      remove(this.active, index);
      remove(this.activeTo, index);
      remove(this.activeRank, index);
      this.minActive = findMinIndex(this.active, this.activeTo);
    };
    _proto56.addActive = function addActive(trackOpen) {
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
    _proto56.next = function next() {
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
    _proto56.activeForPoint = function activeForPoint(to) {
      if (!this.active.length) return this.active;
      var active = [];
      for (var i2 = this.active.length - 1; i2 >= 0; i2--) {
        if (this.activeRank[i2] < this.pointRank) break;
        if (this.activeTo[i2] > to || this.activeTo[i2] == to && this.active[i2].endSide >= this.point.endSide) active.push(this.active[i2]);
      }
      return active.reverse();
    };
    _proto56.openEnd = function openEnd(to) {
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
      var _ref4 = options || {},
        finish = _ref4.finish;
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
    var _proto57 = StyleModule.prototype;
    _proto57.getRules = function getRules() {
      return this.rules.join("\n");
    };
    StyleModule.newName = function newName() {
      var id2 = top[COUNT] || 1;
      top[COUNT] = id2 + 1;
      return C + id2.toString(36);
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
    var _proto58 = StyleSet.prototype;
    _proto58.mount = function mount(modules, root) {
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
        if (root.adoptedStyleSheets.indexOf(this.sheet) < 0) root.adoptedStyleSheets = [this.sheet].concat(_toConsumableArray(root.adoptedStyleSheets));
      } else {
        var text = "";
        for (var _i13 = 0; _i13 < this.modules.length; _i13++) text += this.modules[_i13].getRules() + "\n";
        this.styleTag.textContent = text;
        var target = root.head || root;
        if (this.styleTag.parentNode != target) target.insertBefore(this.styleTag, target.firstChild);
      }
    };
    _proto58.setNonce = function setNonce(nonce) {
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
    for (var _name in source) {
      if (_name == "class" && target.class) target.class += " " + source.class;else if (_name == "style" && target.style) target.style += ";" + source.style;else target[_name] = source[_name];
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
    for (var _i14 = 0, _keysA = keysA; _i14 < _keysA.length; _i14++) {
      var key = _keysA[_i14];
      if (key != ignore && (keysB.indexOf(key) == -1 || a[key] !== b[key])) return false;
    }
    return true;
  }
  function setAttrs(dom, attrs) {
    for (var i2 = dom.attributes.length - 1; i2 >= 0; i2--) {
      var _name2 = dom.attributes[i2].name;
      if (attrs[_name2] == null) dom.removeAttribute(_name2);
    }
    for (var _name3 in attrs) {
      var value = attrs[_name3];
      if (_name3 == "style") dom.style.cssText = value;else if (dom.getAttribute(_name3) != value) dom.setAttribute(_name3, value);
    }
  }
  function _updateAttrs(dom, prev, attrs) {
    var changed = false;
    if (prev) {
      for (var _name4 in prev) if (!(attrs && _name4 in attrs)) {
        changed = true;
        if (_name4 == "style") dom.style.cssText = "";else dom.removeAttribute(_name4);
      }
    }
    if (attrs) {
      for (var _name5 in attrs) if (!(prev && prev[_name5] == attrs[_name5])) {
        changed = true;
        if (_name5 == "style") dom.style.cssText = attrs[_name5];else dom.setAttribute(_name5, attrs[_name5]);
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
    var _proto59 = WidgetType.prototype;
    _proto59.eq = function eq(widget) {
      return false;
    };
    _proto59.updateDOM = function updateDOM(dom, view, from) {
      return false;
    };
    _proto59.compare = function compare(other) {
      return this == other || this.constructor == other.constructor && this.eq(other);
    };
    _proto59.ignoreEvent = function ignoreEvent(event) {
      return true;
    };
    _proto59.coordsAt = function coordsAt(dom, pos, side) {
      return null;
    };
    _proto59.destroy = function destroy(dom) {};
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
      var _this13;
      _this13 = _RangeValue.call(this) || this;
      _this13.startSide = startSide;
      _this13.endSide = endSide;
      _this13.widget = widget;
      _this13.spec = spec;
      return _this13;
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
    var _proto60 = Decoration.prototype;
    _proto60.hasHeight = function hasHeight() {
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
      var _this14;
      var _getInclusive2 = getInclusive(spec),
        start = _getInclusive2.start,
        end = _getInclusive2.end;
      _this14 = _Decoration.call(this, start ? -1 : 5e8, end ? 1 : -6e8, null, spec) || this;
      _this14.tagName = spec.tagName || "span";
      _this14.attrs = spec.class && spec.attributes ? combineAttrs(spec.attributes, {
        class: spec.class
      }) : spec.class ? {
        class: spec.class
      } : spec.attributes || noAttrs;
      return _this14;
    }
    _inheritsLoose(_MarkDecoration, _Decoration);
    var _proto61 = _MarkDecoration.prototype;
    _proto61.eq = function eq(other) {
      return this == other || other instanceof _MarkDecoration && this.tagName == other.tagName && attrsEq(this.attrs, other.attrs);
    };
    _proto61.range = function range(from, to) {
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
    var _proto62 = _LineDecoration.prototype;
    _proto62.eq = function eq(other) {
      return other instanceof _LineDecoration && this.spec.class == other.spec.class && attrsEq(this.spec.attributes, other.spec.attributes);
    };
    _proto62.range = function range(from, to) {
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
      var _this15;
      _this15 = _Decoration3.call(this, startSide, endSide, widget, spec) || this;
      _this15.block = block;
      _this15.isReplace = isReplace;
      _this15.mapMode = !block ? MapMode.TrackDel : startSide <= 0 ? MapMode.TrackBefore : MapMode.TrackAfter;
      return _this15;
    }
    _inheritsLoose(_PointDecoration, _Decoration3);
    var _proto63 = _PointDecoration.prototype;
    _proto63.eq = function eq(other) {
      return other instanceof _PointDecoration && widgetsEq(this.widget, other.widget) && this.block == other.block && this.startSide == other.startSide && this.endSide == other.endSide;
    };
    _proto63.range = function range(from, to) {
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
      var _this16;
      _this16 = _RangeValue2.call(this) || this;
      _this16.tagName = tagName;
      _this16.attributes = attributes;
      _this16.rank = rank;
      return _this16;
    }
    _inheritsLoose(_BlockWrapper, _RangeValue2);
    var _proto64 = _BlockWrapper.prototype;
    _proto64.eq = function eq(other) {
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
  function hasSelection(dom, selection2) {
    if (!selection2.anchorNode) return false;
    try {
      return contains(dom, selection2.anchorNode);
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
              var _start2 = cur.scrollLeft;
              cur.scrollLeft += moveX / scaleX;
              movedX = (cur.scrollLeft - _start2) * scaleX;
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
    var _proto65 = DOMSelectionState.prototype;
    _proto65.eq = function eq(domSel) {
      return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset && this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
    };
    _proto65.setRange = function setRange(range) {
      var anchorNode = range.anchorNode,
        focusNode = range.focusNode;
      this.set(anchorNode, Math.min(range.anchorOffset, anchorNode ? maxOffset(anchorNode) : 0), focusNode, Math.min(range.focusOffset, focusNode ? maxOffset(focusNode) : 0));
    };
    _proto65.set = function set(anchorNode, anchorOffset, focusNode, focusOffset) {
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
    for (var _iterator62 = _createForOfIteratorHelperLoose(stack), _step62; !(_step62 = _iterator62()).done;) {
      var _step62$value = _step62.value,
        node = _step62$value.node,
        left = _step62$value.left,
        top2 = _step62$value.top;
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
  function atElementStart(doc2, selection2) {
    var node = selection2.focusNode,
      offset = selection2.focusOffset;
    if (!node || selection2.anchorNode != node || selection2.anchorOffset != offset) return false;
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
  for (var _i15 = 0, _arr = ["()", "[]", "{}"]; _i15 < _arr.length; _i15++) {
    var p = _arr[_i15];
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
    var _proto66 = BidiSpan.prototype;
    _proto66.side = function side(end, dir) {
      return this.dir == dir == end ? this.to : this.from;
    };
    _proto66.forward = function forward(_forward, dir) {
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
      for (var _i16 = from, _prev = prevType, _prevStrong = prevType; _i16 < to; _i16++) {
        var _type2 = types[_i16];
        if (_type2 == 128) {
          if (_i16 < to - 1 && _prev == types[_i16 + 1] && _prev & 24) _type2 = types[_i16] = _prev;else types[_i16] = 256;
        } else if (_type2 == 64) {
          var end = _i16 + 1;
          while (end < to && types[end] == 64) end++;
          var replace2 = _i16 && _prev == 8 || end < rTo && types[end] == 8 ? _prevStrong == 1 ? 1 : 8 : 256;
          for (var j = _i16; j < end; j++) types[j] = replace2;
          _i16 = end - 1;
        } else if (_type2 == 8 && _prevStrong == 1) {
          types[_i16] = 1;
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
          var _next3 = types[_iCh - 1];
          if (_next3 != ourType) {
            _sameDir = false;
            _isNum = _next3 == 16;
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
    combine: function combine(values2) {
      return values2.some(function (x) {
        return x;
      });
    }
  });
  var nativeSelectionHidden = Facet.define({
    combine: function combine(values2) {
      return values2.some(function (x) {
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
    var _proto67 = _ScrollTarget.prototype;
    _proto67.map = function map(changes) {
      return changes.empty ? this : new _ScrollTarget(this.range.map(changes), this.y, this.x, this.yMargin, this.xMargin, this.isSnapshot);
    };
    _proto67.clip = function clip(state) {
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
    combine: function combine(values2) {
      return values2.length ? values2[0] : true;
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
    function _ViewPlugin(id2, create, domEventHandlers, domEventObservers, buildExtensions) {
      this.id = id2;
      this.create = create;
      this.domEventHandlers = domEventHandlers;
      this.domEventObservers = domEventObservers;
      this.baseExtensions = buildExtensions(this);
      this.extension = this.baseExtensions.concat(viewPlugin.of({
        plugin: this,
        arg: void 0
      }));
    }
    var _proto68 = _ViewPlugin.prototype;
    _proto68.of = function of(arg) {
      return this.baseExtensions.concat(viewPlugin.of({
        plugin: this,
        arg: arg
      }));
    };
    _ViewPlugin.define = function define(create, spec) {
      var _ref5 = spec || {},
        eventHandlers = _ref5.eventHandlers,
        eventObservers = _ref5.eventObservers,
        provide = _ref5.provide,
        deco = _ref5.decorations;
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
    var _proto69 = PluginInstance.prototype;
    _proto69.update = function update(view) {
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
    _proto69.destroy = function destroy(view) {
      var _a2;
      if ((_a2 = this.value) === null || _a2 === void 0 ? void 0 : _a2.destroy) {
        try {
          this.value.destroy();
        } catch (_e3) {
          logException(view.state, _e3, "CodeMirror plugin crashed");
        }
      }
    };
    _proto69.deactivate = function deactivate() {
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
      span: function span(fromDoc, toDoc, active, open) {
        var from = fromDoc - line.from,
          to = toDoc - line.from;
        var level = result;
        for (var i2 = active.length - 1; i2 >= 0; i2--, open--) {
          var direction = active[i2].spec.bidiIsolate,
            update = void 0;
          if (direction == null) direction = autoDirection(line.text, from, to);
          if (open > 0 && level.length && (update = level[level.length - 1]).to == from && update.direction == direction) {
            update.to = to;
            level = update.inner;
          } else {
            var add = {
              from: from,
              to: to,
              direction: direction,
              inner: []
            };
            level.push(add);
            level = add.inner;
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
    for (var _iterator63 = _createForOfIteratorHelperLoose(view.state.facet(scrollMargins)), _step63; !(_step63 = _iterator63()).done;) {
      var source = _step63.value;
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
    var _proto70 = _ChangedRange.prototype;
    _proto70.join = function join(other) {
      return new _ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
    };
    _proto70.addToSet = function addToSet(set) {
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
      for (var _iterator64 = _createForOfIteratorHelperLoose(transactions), _step64; !(_step64 = _iterator64()).done;) {
        var tr = _step64.value;
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
    var _proto71 = Tile.prototype;
    _proto71.isWidget = function isWidget() {
      return false;
    };
    _proto71.isComposite = function isComposite() {
      return false;
    };
    _proto71.isLine = function isLine() {
      return false;
    };
    _proto71.isText = function isText() {
      return false;
    };
    _proto71.isBlock = function isBlock() {
      return false;
    };
    _proto71.sync = function sync(track) {
      this.flags |= 2;
      if (this.flags & 4) {
        this.flags &= ~4;
        var attrs = this.domAttrs;
        if (attrs) setAttrs(this.dom, attrs);
      }
    };
    _proto71.toString = function toString() {
      return this.constructor.name + (this.children.length ? "(" + this.children + ")" : "") + (this.breakAfter ? "#" : "");
    };
    _proto71.destroy = function destroy() {
      this.parent = null;
    };
    _proto71.setDOM = function setDOM(dom) {
      this.dom = dom;
      dom.cmTile = this;
    };
    _proto71.posBefore = function posBefore(tile, start) {
      if (start === void 0) {
        start = this.posAtStart;
      }
      var pos = start;
      for (var _iterator65 = _createForOfIteratorHelperLoose(this.children), _step65; !(_step65 = _iterator65()).done;) {
        var child = _step65.value;
        if (child == tile) return pos;
        pos += child.length + child.breakAfter;
      }
      throw new RangeError("Invalid child in posBefore");
    };
    _proto71.posAfter = function posAfter(tile) {
      return this.posBefore(tile) + tile.length;
    };
    _proto71.covers = function covers(side) {
      return true;
    };
    _proto71.coordsIn = function coordsIn(pos, side, rtl) {
      return null;
    };
    _proto71.domPosFor = function domPosFor(off, side) {
      var index = domIndex(this.dom);
      var after = this.length ? off > 0 : side > 0;
      return new DOMPos(this.parent.dom, index + (after ? 1 : 0), off == 0 || off == this.length);
    };
    _proto71.markDirty = function markDirty(attrs) {
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
      var _this17;
      _this17 = _Tile.call(this, dom, 0) || this;
      _this17._children = [];
      return _this17;
    }
    _inheritsLoose(CompositeTile, _Tile);
    var _proto72 = CompositeTile.prototype;
    _proto72.isComposite = function isComposite() {
      return true;
    };
    _proto72.append = function append(child) {
      this.children.push(child);
      child.parent = this;
    };
    _proto72.sync = function sync(track) {
      if (this.flags & 2) return;
      _Tile.prototype.sync.call(this, track);
      var parent = this.dom,
        prev = null,
        next;
      var tracking = (track === null || track === void 0 ? void 0 : track.node) == parent ? track : null;
      var length = 0;
      for (var _iterator66 = _createForOfIteratorHelperLoose(this.children), _step66; !(_step66 = _iterator66()).done;) {
        var child = _step66.value;
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
      var _this18;
      _this18 = _CompositeTile.call(this, dom) || this;
      _this18.view = view;
      return _this18;
    }
    _inheritsLoose(DocTile, _CompositeTile);
    var _proto73 = DocTile.prototype;
    _proto73.owns = function owns(tile) {
      for (; tile; tile = tile.parent) if (tile == this) return true;
      return false;
    };
    _proto73.isBlock = function isBlock() {
      return true;
    };
    _proto73.nearest = function nearest(dom) {
      for (;;) {
        if (!dom) return null;
        var tile = Tile.get(dom);
        if (tile && this.owns(tile)) return tile;
        dom = dom.parentNode;
      }
    };
    _proto73.blockTiles = function blockTiles(f) {
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
    _proto73.resolveBlock = function resolveBlock(pos, side) {
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
      var _this19;
      _this19 = _CompositeTile2.call(this, dom) || this;
      _this19.wrapper = wrapper;
      return _this19;
    }
    _inheritsLoose(_BlockWrapperTile, _CompositeTile2);
    var _proto74 = _BlockWrapperTile.prototype;
    _proto74.isBlock = function isBlock() {
      return true;
    };
    _proto74.covers = function covers(side) {
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
      var _this20;
      _this20 = _CompositeTile3.call(this, dom) || this;
      _this20.attrs = attrs;
      return _this20;
    }
    _inheritsLoose(_LineTile, _CompositeTile3);
    var _proto75 = _LineTile.prototype;
    _proto75.isLine = function isLine() {
      return true;
    };
    _LineTile.start = function start(attrs, dom, keepAttrs) {
      var line = new _LineTile(dom || document.createElement("div"), attrs);
      if (!dom || !keepAttrs) line.flags |= 4;
      return line;
    };
    _proto75.resolveInline = function resolveInline(pos, side, forCoords) {
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
    _proto75.coordsIn = function coordsIn(pos, side, rtl) {
      var found = this.resolveInline(pos, side, true);
      if (!found) return fallbackRect(this);
      return found.tile.coordsIn(Math.max(0, found.offset), side, rtl);
    };
    _proto75.domIn = function domIn(pos, side) {
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
        for (var _iterator67 = _createForOfIteratorHelperLoose(parent.children), _step67; !(_step67 = _iterator67()).done;) {
          var ch = _step67.value;
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
      var _this21;
      _this21 = _CompositeTile4.call(this, dom) || this;
      _this21.mark = mark;
      return _this21;
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
      var _this22;
      _this22 = _Tile2.call(this, dom, text.length) || this;
      _this22.text = text;
      return _this22;
    }
    _inheritsLoose(_TextTile, _Tile2);
    var _proto76 = _TextTile.prototype;
    _proto76.sync = function sync(track) {
      if (this.flags & 2) return;
      _Tile2.prototype.sync.call(this, track);
      if (this.dom.nodeValue != this.text) {
        if (track && track.node == this.dom) track.written = true;
        this.dom.nodeValue = this.text;
      }
    };
    _proto76.isText = function isText() {
      return true;
    };
    _proto76.toString = function toString() {
      return JSON.stringify(this.text);
    };
    _proto76.coordsIn = function coordsIn(pos, side, rtl) {
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
      var _this23;
      _this23 = _Tile3.call(this, dom, length, flags) || this;
      _this23.widget = widget;
      return _this23;
    }
    _inheritsLoose(_WidgetTile, _Tile3);
    var _proto77 = _WidgetTile.prototype;
    _proto77.isWidget = function isWidget() {
      return true;
    };
    _proto77.covers = function covers(side) {
      if (this.flags & 48) return false;
      return (this.flags & (side < 0 ? 64 : 128)) > 0;
    };
    _proto77.coordsIn = function coordsIn(pos, side) {
      return this.coordsInWidget(pos, side, false);
    };
    _proto77.coordsInWidget = function coordsInWidget(pos, side, block) {
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
    _proto77.destroy = function destroy() {
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
    var _proto78 = WidgetBufferTile.prototype;
    _proto78.coordsIn = function coordsIn(pos, side, rtl) {
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
    var _proto79 = TilePointer.prototype;
    _proto79.advance = function advance(dist2, side, walker) {
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
    function TileBuilder(cache2, root, blockWrappers2) {
      this.cache = cache2;
      this.root = root;
      this.blockWrappers = blockWrappers2;
      this.curLine = null;
      this.lastBlock = null;
      this.afterWidget = null;
      this.pos = 0;
      this.wrappers = [];
      this.wrapperPos = 0;
    }
    var _proto80 = TileBuilder.prototype;
    _proto80.addText = function addText(text, marks2, openStart, tile) {
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
    _proto80.addComposition = function addComposition(composition, context) {
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
    _proto80.addInlineWidget = function addInlineWidget(widget, marks2, openStart) {
      var noSpace = this.afterWidget && widget.flags & 48 && (this.afterWidget.flags & 48) == (widget.flags & 48);
      if (!noSpace) this.flushBuffer();
      var parent = this.ensureMarks(marks2, openStart);
      if (!noSpace && !(widget.flags & 16)) parent.append(this.getBuffer(1));
      parent.append(widget);
      this.pos += widget.length;
      this.afterWidget = widget;
    };
    _proto80.addMark = function addMark(tile, marks2, openStart) {
      this.flushBuffer();
      var parent = this.ensureMarks(marks2, openStart);
      parent.append(tile);
      this.pos += tile.length;
      this.afterWidget = null;
    };
    _proto80.addBlockWidget = function addBlockWidget(widget) {
      this.getBlockPos().append(widget);
      this.pos += widget.length;
      this.lastBlock = widget;
      this.endLine();
    };
    _proto80.continueWidget = function continueWidget(length) {
      var widget = this.afterWidget || this.lastBlock;
      widget.length += length;
      this.pos += length;
    };
    _proto80.addLineStart = function addLineStart(attrs, dom) {
      var _a2;
      if (!attrs) attrs = lineBaseAttrs;
      var tile = LineTile.start(attrs, dom || ((_a2 = this.cache.find(LineTile)) === null || _a2 === void 0 ? void 0 : _a2.dom), !!dom);
      this.getBlockPos().append(this.lastBlock = this.curLine = tile);
    };
    _proto80.addLine = function addLine(tile) {
      this.getBlockPos().append(tile);
      this.pos += tile.length;
      this.lastBlock = tile;
      this.endLine();
    };
    _proto80.addBreak = function addBreak() {
      this.lastBlock.flags |= 1;
      this.endLine();
      this.pos++;
    };
    _proto80.addLineStartIfNotCovered = function addLineStartIfNotCovered(attrs) {
      if (!this.blockPosCovered()) this.addLineStart(attrs);
    };
    _proto80.ensureLine = function ensureLine(attrs) {
      if (!this.curLine) this.addLineStart(attrs);
    };
    _proto80.ensureMarks = function ensureMarks(marks2, openStart) {
      var _this24 = this;
      var _a2;
      var parent = this.curLine;
      var _loop9 = function _loop9() {
        var mark = marks2[i2],
          last;
        if (openStart > 0 && (last = parent.lastChild) && last instanceof MarkTile && last.mark.eq(mark)) {
          parent = last;
          openStart--;
        } else {
          var tile = MarkTile.of(mark, (_a2 = _this24.cache.find(MarkTile, function (m) {
            return m.mark.eq(mark);
          })) === null || _a2 === void 0 ? void 0 : _a2.dom);
          parent.append(tile);
          parent = tile;
          openStart = 0;
        }
      };
      for (var i2 = marks2.length - 1; i2 >= 0; i2--) {
        _loop9();
      }
      return parent;
    };
    _proto80.endLine = function endLine() {
      if (this.curLine) {
        this.flushBuffer();
        var last = this.curLine.lastChild;
        if (!last || !hasContent(this.curLine, false) || last.dom.nodeName != "BR" && last.isWidget() && !(browser.ios && hasContent(this.curLine, true))) this.curLine.append(this.cache.findWidget(BreakWidget, 0, 32) || new WidgetTile(BreakWidget.toDOM(), 0, BreakWidget, 32));
        this.curLine = this.afterWidget = null;
      }
    };
    _proto80.updateBlockWrappers = function updateBlockWrappers() {
      if (this.wrapperPos > this.pos + 1e4) {
        this.blockWrappers.goto(this.pos);
        this.wrappers.length = 0;
      }
      for (var i2 = this.wrappers.length - 1; i2 >= 0; i2--) if (this.wrappers[i2].to < this.pos) this.wrappers.splice(i2, 1);
      for (var cur = this.blockWrappers; cur.value && cur.from <= this.pos; cur.next()) if (cur.to >= this.pos) {
        var rank = cur.rank * 102 + cur.value.rank;
        var wrap = new OpenWrapper(cur.from, cur.to, cur.value, rank),
          _i17 = this.wrappers.length;
        while (_i17 > 0 && (this.wrappers[_i17 - 1].rank - wrap.rank || this.wrappers[_i17 - 1].to - wrap.to) < 0) _i17--;
        this.wrappers.splice(_i17, 0, wrap);
      }
      this.wrapperPos = this.pos;
    };
    _proto80.getBlockPos = function getBlockPos() {
      var _this25 = this;
      var _a2;
      this.updateBlockWrappers();
      var parent = this.root;
      var _loop0 = function _loop0() {
        var wrap = _step68.value;
        var last = parent.lastChild;
        if (wrap.from < _this25.pos && last instanceof BlockWrapperTile && last.wrapper.eq(wrap.wrapper)) {
          parent = last;
        } else {
          var tile = BlockWrapperTile.of(wrap.wrapper, (_a2 = _this25.cache.find(BlockWrapperTile, function (t2) {
            return t2.wrapper.eq(wrap.wrapper);
          })) === null || _a2 === void 0 ? void 0 : _a2.dom);
          parent.append(tile);
          parent = tile;
        }
      };
      for (var _iterator68 = _createForOfIteratorHelperLoose(this.wrappers), _step68; !(_step68 = _iterator68()).done;) {
        _loop0();
      }
      return parent;
    };
    _proto80.blockPosCovered = function blockPosCovered() {
      var last = this.lastBlock;
      return last != null && !last.breakAfter && (!last.isWidget() || (last.flags & (32 | 128)) > 0);
    };
    _proto80.getBuffer = function getBuffer(side) {
      var flags = 2 | (side < 0 ? 16 : 32);
      var found = this.cache.find(WidgetBufferTile, void 0, 1);
      if (found) found.flags = flags;
      return found || new WidgetBufferTile(flags);
    };
    _proto80.flushBuffer = function flushBuffer() {
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
    var _proto81 = TextStream.prototype;
    _proto81.skip = function skip(len) {
      if (this.textOff + len <= this.text.length) {
        this.textOff += len;
      } else {
        this.skipCount += len - (this.text.length - this.textOff);
        this.text = "";
        this.textOff = 0;
      }
    };
    _proto81.next = function next(maxLen) {
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
    var _proto82 = TileCache.prototype;
    _proto82.add = function add(tile) {
      var i2 = tile.constructor.bucket,
        bucket = this.buckets[i2];
      if (bucket.length < 6) bucket.push(tile);else bucket[this.index[i2] = (this.index[i2] + 1) % 6] = tile;
    };
    _proto82.find = function find(cls, test, type) {
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
    _proto82.findWidget = function findWidget(widget, length, flags) {
      var widgets = this.buckets[0];
      if (widgets.length) for (var _i18 = 0, pass = 0;; _i18++) {
        if (_i18 == widgets.length) {
          if (pass) return null;
          pass = 1;
          _i18 = 0;
        }
        var tile = widgets[_i18];
        if (!this.reused.has(tile) && (pass == 0 ? tile.widget.compare(widget) : tile.widget.constructor == widget.constructor && widget.updateDOM(tile.dom, this.view, tile.widget))) {
          widgets.splice(_i18, 1);
          if (_i18 < this.index[0]) this.index[0]--;
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
    _proto82.reuse = function reuse(tile) {
      this.reused.set(tile, 1);
      return tile;
    };
    _proto82.maybeReuse = function maybeReuse(tile, type) {
      if (type === void 0) {
        type = 2;
      }
      if (this.reused.has(tile)) return void 0;
      this.reused.set(tile, type);
      return tile.dom;
    };
    _proto82.clear = function clear() {
      for (var _i19 = 0; _i19 < this.buckets.length; _i19++) this.buckets[_i19].length = this.index[_i19] = 0;
    };
    return TileCache;
  }();
  var TileUpdate = function () {
    function TileUpdate(view, old, blockWrappers2, decorations2, disallowBlockEffectsFor) {
      var _this26 = this;
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
          _this26.cache.add(tile);
          if (tile.isComposite()) return false;
        },
        enter: function enter(tile) {
          return _this26.cache.add(tile);
        },
        leave: function leave() {},
        break: function _break() {}
      };
    }
    var _proto83 = TileUpdate.prototype;
    _proto83.run = function run(changes, composition) {
      var compositionContext = composition && this.getCompositionContext(composition.text);
      for (var posA = 0, posB = 0, _i20 = 0;;) {
        var next = _i20 < changes.length ? changes[_i20++] : null;
        var skipA = next ? next.fromA : this.old.root.length;
        if (skipA > posA) {
          var len = skipA - posA;
          this.preserve(len, !_i20, !next);
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
    _proto83.preserve = function preserve(length, incStart, incEnd) {
      var _this27 = this;
      var activeMarks = getMarks(this.old),
        openMarks = this.openMarks;
      this.old.advance(length, incEnd ? 1 : -1, {
        skip: function skip(tile, from, to) {
          if (tile.isWidget()) {
            if (_this27.openWidget) {
              _this27.builder.continueWidget(to - from);
            } else {
              var widget = to > 0 || from < tile.length ? WidgetTile.of(tile.widget, _this27.view, to - from, tile.flags & 496, _this27.cache.maybeReuse(tile)) : _this27.cache.reuse(tile);
              if (widget.flags & 256) {
                widget.flags &= ~1;
                _this27.builder.addBlockWidget(widget);
              } else {
                _this27.builder.ensureLine(null);
                _this27.builder.addInlineWidget(widget, activeMarks, openMarks);
                openMarks = activeMarks.length;
              }
            }
          } else if (tile.isText()) {
            _this27.builder.ensureLine(null);
            if (!from && to == tile.length && !_this27.cache.reused.has(tile)) {
              _this27.builder.addText(tile.text, activeMarks, openMarks, _this27.cache.reuse(tile));
            } else {
              _this27.cache.add(tile);
              _this27.builder.addText(tile.text.slice(from, to), activeMarks, openMarks);
            }
            openMarks = activeMarks.length;
          } else if (tile.isLine()) {
            tile.flags &= ~1;
            _this27.cache.reused.set(tile, 1);
            _this27.builder.addLine(tile);
          } else if (tile instanceof WidgetBufferTile) {
            _this27.cache.add(tile);
          } else if (tile instanceof MarkTile) {
            _this27.builder.ensureLine(null);
            _this27.builder.addMark(tile, activeMarks, openMarks);
            _this27.cache.reused.set(tile, 1);
            openMarks = activeMarks.length;
          } else {
            return false;
          }
          _this27.openWidget = false;
        },
        enter: function enter(tile) {
          if (tile.isLine()) {
            _this27.builder.addLineStart(tile.attrs, _this27.cache.maybeReuse(tile));
          } else {
            _this27.cache.add(tile);
            if (tile instanceof MarkTile) activeMarks.unshift(tile.mark);
          }
          _this27.openWidget = false;
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
          _this27.builder.addBreak();
          _this27.openWidget = false;
        }
      });
      this.text.skip(length);
    };
    _proto83.emit = function emit(from, to) {
      var _this28 = this;
      var pendingLineAttrs = null;
      var b = this.builder,
        markCount = -1;
      var openEnd = RangeSet.spans(this.decorations, from, to, {
        point: function point(from2, to2, deco, active, openStart, index) {
          if (deco instanceof PointDecoration) {
            if (_this28.disallowBlockEffectsFor[index]) {
              if (deco.block) throw new RangeError("Block decorations may not be specified via plugins");
              if (to2 > _this28.view.state.doc.lineAt(from2).to) throw new RangeError("Decorations that replace line breaks may not be specified via plugins");
            }
            markCount = active.length;
            if (openStart > active.length) {
              b.continueWidget(to2 - from2);
            } else {
              var widget = deco.widget || (deco.block ? NullWidget.block : NullWidget.inline);
              var flags = widgetFlags(deco);
              var tile = _this28.cache.findWidget(widget, to2 - from2, flags) || WidgetTile.of(widget, _this28.view, to2 - from2, flags);
              if (deco.block) {
                if (deco.startSide > 0) b.addLineStartIfNotCovered(pendingLineAttrs);
                b.addBlockWidget(tile);
              } else {
                b.ensureLine(pendingLineAttrs);
                b.addInlineWidget(tile, active, openStart);
              }
            }
            pendingLineAttrs = null;
          } else {
            pendingLineAttrs = addLineDeco(pendingLineAttrs, deco);
          }
          if (to2 > from2) _this28.text.skip(to2 - from2);
        },
        span: function span(from2, to2, active, openStart) {
          for (var pos = from2; pos < to2;) {
            var chars = _this28.text.next(Math.min(512, to2 - pos));
            if (chars == null) {
              b.addLineStartIfNotCovered(pendingLineAttrs);
              b.addBreak();
              pos++;
            } else {
              b.ensureLine(pendingLineAttrs);
              b.addText(chars, active, pos == from2 ? openStart : active.length);
              pos += chars.length;
            }
            pendingLineAttrs = null;
          }
          markCount = active.length;
        }
      });
      if (markCount > -1) this.openWidget = openEnd > markCount;
      if (!this.openWidget) b.addLineStartIfNotCovered(pendingLineAttrs);
      this.openMarks = openEnd;
    };
    _proto83.forward = function forward(from, to, side) {
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
    _proto83.getCompositionContext = function getCompositionContext(text) {
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
      for (var _iterator69 = _createForOfIteratorHelperLoose(tile2.children), _step69; !(_step69 = _iterator69()).done;) {
        var ch = _step69.value;
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
    for (var _i21 = ptr.parents.length; _i21 > 1; _i21--) {
      var tile = _i21 == ptr.parents.length ? ptr.tile : ptr.parents[_i21].tile;
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
      var _this29;
      _this29 = _WidgetType.call(this) || this;
      _this29.tag = tag;
      return _this29;
    }
    _inheritsLoose(NullWidget, _WidgetType);
    var _proto84 = NullWidget.prototype;
    _proto84.eq = function eq(other) {
      return other.tag == this.tag;
    };
    _proto84.toDOM = function toDOM() {
      return document.createElement(this.tag);
    };
    _proto84.updateDOM = function updateDOM(elt) {
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
    var _proto85 = _class.prototype;
    _proto85.toDOM = function toDOM() {
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
    var _proto86 = DocView.prototype;
    _proto86.update = function update(_update2) {
      var _this30 = this;
      var _a2;
      var changedRanges = _update2.changedRanges;
      if (this.minWidth > 0 && changedRanges.length) {
        if (!changedRanges.every(function (_ref6) {
          var fromA = _ref6.fromA,
            toA = _ref6.toA;
          return toA < _this30.minWidthFrom || fromA > _this30.minWidthTo;
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
    _proto86.updateInner = function updateInner(changes, composition) {
      var _this31 = this;
      this.view.viewState.mustMeasureContent = true;
      var observer = this.view.observer;
      observer.ignore(function () {
        if (composition || changes.length) {
          var oldTile = _this31.tile;
          var builder = new TileUpdate(_this31.view, oldTile, _this31.blockWrappers, _this31.decorations, _this31.dynamicDecorationMap);
          if (composition && Tile.get(composition.text)) builder.cache.reused.set(Tile.get(composition.text), 2);
          _this31.tile = builder.run(changes, composition);
          destroyDropped(oldTile, builder.cache.reused);
        }
        _this31.tile.dom.style.height = _this31.view.viewState.contentHeight / _this31.view.scaleY + "px";
        _this31.tile.dom.style.flexBasis = _this31.minWidth ? _this31.minWidth + "px" : "";
        var track = browser.chrome || browser.ios ? {
          node: observer.selectionRange.focusNode,
          written: false
        } : void 0;
        _this31.tile.sync(track);
        if (track && (track.written || observer.selectionRange.focusNode != track.node || !_this31.tile.dom.contains(track.node))) _this31.forceSelection = true;
        _this31.tile.dom.style.height = "";
      });
      var gaps = [];
      if (this.view.viewport.from || this.view.viewport.to < this.view.state.doc.length) {
        for (var _iterator70 = _createForOfIteratorHelperLoose(this.tile.children), _step70; !(_step70 = _iterator70()).done;) {
          var child = _step70.value;
          if (child.isWidget() && child.widget instanceof BlockGapWidget) gaps.push(child.dom);
        }
      }
      observer.updateGaps(gaps);
    };
    _proto86.updateEditContextFormatting = function updateEditContextFormatting(update) {
      this.editContextFormatting = this.editContextFormatting.map(update.changes);
      for (var _iterator71 = _createForOfIteratorHelperLoose(update.transactions), _step71; !(_step71 = _iterator71()).done;) {
        var tr = _step71.value;
        for (var _iterator72 = _createForOfIteratorHelperLoose(tr.effects), _step72; !(_step72 = _iterator72()).done;) {
          var effect = _step72.value;
          if (effect.is(setEditContextFormatting)) {
            this.editContextFormatting = effect.value;
          }
        }
      }
    };
    _proto86.updateSelection = function updateSelection(mustRead, fromPointer) {
      var _this32 = this;
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
          var rawSel = getSelection(_this32.view.root);
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
              var _ref7 = [head, anchor];
              anchor = _ref7[0];
              head = _ref7[1];
            }
            range.setEnd(head.node, head.offset);
            range.setStart(anchor.node, anchor.offset);
            rawSel.removeAllRanges();
            rawSel.addRange(range);
          }
          if (selectionNotFocus && _this32.view.root.activeElement == dom) {
            dom.blur();
            if (activeElt) activeElt.focus();
          }
        });
        this.view.observer.setSelectionRange(anchor, head);
      }
      this.impreciseAnchor = anchor.precise ? null : new DOMPos(domSel.anchorNode, domSel.anchorOffset);
      this.impreciseHead = head.precise ? null : new DOMPos(domSel.focusNode, domSel.focusOffset);
    };
    _proto86.suppressWidgetCursorChange = function suppressWidgetCursorChange(sel, cursor2) {
      return this.hasComposition && cursor2.empty && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset) && this.posFromDOM(sel.focusNode, sel.focusOffset) == cursor2.head;
    };
    _proto86.enforceCursorAssoc = function enforceCursorAssoc() {
      if (this.hasComposition) return;
      var view = this.view,
        cursor2 = view.state.selection.main;
      var sel = getSelection(view.root);
      var _view$observer$select = view.observer.selectionRange,
        anchorNode = _view$observer$select.anchorNode,
        anchorOffset = _view$observer$select.anchorOffset;
      if (!sel || !cursor2.empty || !cursor2.assoc || !sel.modify) return;
      var line = this.lineAt(cursor2.head, cursor2.assoc);
      if (!line) return;
      var lineStart = line.posAtStart;
      if (cursor2.head == lineStart || cursor2.head == lineStart + line.length) return;
      var before = this.coordsAt(cursor2.head, -1),
        after = this.coordsAt(cursor2.head, 1);
      if (!before || !after || before.bottom > after.top) return;
      var dom = this.domAtPos(cursor2.head + cursor2.assoc, cursor2.assoc);
      sel.collapse(dom.node, dom.offset);
      sel.modify("move", cursor2.assoc < 0 ? "forward" : "backward", "lineboundary");
      view.observer.readSelectionRange();
      var newRange = view.observer.selectionRange;
      if (view.docView.posFromDOM(newRange.anchorNode, newRange.anchorOffset) != cursor2.from) sel.collapse(anchorNode, anchorOffset);
    };
    _proto86.posFromDOM = function posFromDOM(node, offset) {
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
        for (var _i22 = 0, pos = start;; _i22++) {
          var child = tile.children[_i22];
          if (child.dom == after) return pos;
          pos += child.length + child.breakAfter;
        }
      } else if (tile.isText()) {
        return node == tile.dom ? start + offset : start + (offset ? tile.length : 0);
      } else {
        return start;
      }
    };
    _proto86.domAtPos = function domAtPos(pos, side) {
      var _this$tile$resolveBlo = this.tile.resolveBlock(pos, side),
        tile = _this$tile$resolveBlo.tile,
        offset = _this$tile$resolveBlo.offset;
      if (tile.isWidget()) return tile.domPosFor(offset, side);
      return tile.domIn(offset, side);
    };
    _proto86.inlineDOMNearPos = function inlineDOMNearPos(pos, side) {
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
    _proto86.coordsAt = function coordsAt(pos, side, rtl) {
      var _this$tile$resolveBlo2 = this.tile.resolveBlock(pos, side),
        tile = _this$tile$resolveBlo2.tile,
        offset = _this$tile$resolveBlo2.offset;
      if (tile.isWidget()) {
        if (tile.widget instanceof BlockGapWidget) return null;
        return tile.coordsInWidget(offset, side, true);
      }
      return tile.coordsIn(offset, side, rtl);
    };
    _proto86.lineAt = function lineAt(pos, side) {
      var _this$tile$resolveBlo3 = this.tile.resolveBlock(pos, side),
        tile = _this$tile$resolveBlo3.tile;
      return tile.isLine() ? tile : null;
    };
    _proto86.coordsForChar = function coordsForChar(pos) {
      var _this$tile$resolveBlo4 = this.tile.resolveBlock(pos, 1),
        tile = _this$tile$resolveBlo4.tile,
        offset = _this$tile$resolveBlo4.offset;
      if (!tile.isLine()) return null;
      function scan(tile2, offset2) {
        if (tile2.isComposite()) {
          for (var _iterator73 = _createForOfIteratorHelperLoose(tile2.children), _step73; !(_step73 = _iterator73()).done;) {
            var ch = _step73.value;
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
          for (var _i23 = 0; _i23 < rects.length; _i23++) {
            var rect = rects[_i23];
            if (_i23 == rects.length - 1 || rect.top < rect.bottom && rect.left < rect.right) return rect;
          }
        }
        return null;
      }
      return scan(tile, offset);
    };
    _proto86.measureVisibleLineHeights = function measureVisibleLineHeights(viewport) {
      var _this33 = this;
      var result = [],
        from = viewport.from,
        to = viewport.to;
      var contentWidth = this.view.contentDOM.clientWidth;
      var isWider = contentWidth > Math.max(this.view.scrollDOM.clientWidth, this.minWidth) + 1;
      var widest = -1,
        ltr = this.view.textDirection == Direction.LTR;
      var spaceAbove = 0;
      var _scan2 = function scan(tile, pos, measureBounds) {
        for (var _i24 = 0; _i24 < tile.children.length; _i24++) {
          if (pos > to) break;
          var child = tile.children[_i24],
            end = pos + child.length;
          var childRect = child.dom.getBoundingClientRect(),
            height = childRect.height;
          if (measureBounds && !_i24) spaceAbove += childRect.top - measureBounds.top;
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
                  _this33.minWidth = contentWidth;
                  _this33.minWidthFrom = pos;
                  _this33.minWidthTo = end;
                }
              }
            }
          }
          if (measureBounds && _i24 == tile.children.length - 1) spaceAbove += measureBounds.bottom - childRect.bottom;
          pos = end + child.breakAfter;
        }
      };
      _scan2(this.tile, 0, null);
      return result;
    };
    _proto86.textDirectionAt = function textDirectionAt(pos) {
      var _this$tile$resolveBlo5 = this.tile.resolveBlock(pos, 1),
        tile = _this$tile$resolveBlo5.tile;
      return getComputedStyle(tile.dom).direction == "rtl" ? Direction.RTL : Direction.LTR;
    };
    _proto86.measureTextSize = function measureTextSize() {
      var _this34 = this;
      var lineMeasure = this.tile.blockTiles(function (tile) {
        if (tile.isLine() && tile.children.length && tile.length <= 20) {
          var totalWidth = 0,
            textHeight2;
          for (var _iterator74 = _createForOfIteratorHelperLoose(tile.children), _step74; !(_step74 = _iterator74()).done;) {
            var child = _step74.value;
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
        _this34.tile.dom.appendChild(dummy);
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
    _proto86.computeBlockGapDeco = function computeBlockGapDeco() {
      var deco = [],
        vs = this.view.viewState;
      for (var pos = 0, _i25 = 0;; _i25++) {
        var next = _i25 == vs.viewports.length ? null : vs.viewports[_i25];
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
    _proto86.updateDeco = function updateDeco() {
      var _this35 = this;
      var i2 = 1;
      var allDeco = this.view.state.facet(decorations).map(function (d) {
        var dynamic = _this35.dynamicDecorationMap[i2++] = typeof d == "function";
        return dynamic ? d(_this35.view) : d;
      });
      var dynamicOuter = false,
        outerDeco = this.view.state.facet(outerDecorations).map(function (d, i3) {
          var dynamic = typeof d == "function";
          if (dynamic) dynamicOuter = true;
          return dynamic ? d(_this35.view) : d;
        });
      if (outerDeco.length) {
        this.dynamicDecorationMap[i2++] = dynamicOuter;
        allDeco.push(RangeSet.join(outerDeco));
      }
      this.decorations = [this.editContextFormatting].concat(_toConsumableArray(allDeco), [this.computeBlockGapDeco(), this.view.viewState.lineGapDeco]);
      while (i2 < this.decorations.length) this.dynamicDecorationMap[i2++] = false;
      this.blockWrappers = this.view.state.facet(blockWrappers).map(function (v) {
        return typeof v == "function" ? v(_this35.view) : v;
      });
    };
    _proto86.scrollIntoView = function scrollIntoView(target) {
      if (target.isSnapshot) {
        var ref = this.view.viewState.lineBlockAt(target.range.head);
        this.view.scrollDOM.scrollTop = ref.top - target.yMargin;
        this.view.scrollDOM.scrollLeft = target.xMargin;
        return;
      }
      for (var _iterator75 = _createForOfIteratorHelperLoose(this.view.state.facet(scrollHandler)), _step75; !(_step75 = _iterator75()).done;) {
        var handler = _step75.value;
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
    _proto86.lineHasWidget = function lineHasWidget(pos) {
      var _scan3 = function scan(child) {
        return child.isWidget() || child.children.some(_scan3);
      };
      return _scan3(this.tile.resolveBlock(pos, 1).tile);
    };
    _proto86.destroy = function destroy() {
      destroyDropped(this.tile);
    };
    return DocView;
  }();
  function destroyDropped(tile, reused) {
    var r = reused === null || reused === void 0 ? void 0 : reused.get(tile);
    if (r != 1) {
      if (r == null) tile.destroy();
      for (var _iterator76 = _createForOfIteratorHelperLoose(tile.children), _step76; !(_step76 = _iterator76()).done;) {
        var ch = _step76.value;
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
    var _proto87 = DecorationComparator.prototype;
    _proto87.compareRange = function compareRange(from, to) {
      addRange(from, to, this.changes);
    };
    _proto87.comparePoint = function comparePoint(from, to) {
      addRange(from, to, this.changes);
    };
    _proto87.boundChange = function boundChange(pos) {
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
    var _proto88 = WrapperComparator.prototype;
    _proto88.compareRange = function compareRange(from, to) {
      addRange(from, to, this.changes);
    };
    _proto88.comparePoint = function comparePoint() {};
    _proto88.boundChange = function boundChange(pos) {
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
      var _this36;
      _this36 = _WidgetType3.call(this) || this;
      _this36.height = height;
      return _this36;
    }
    _inheritsLoose(BlockGapWidget, _WidgetType3);
    var _proto89 = BlockGapWidget.prototype;
    _proto89.toDOM = function toDOM() {
      var elt = document.createElement("div");
      elt.className = "cm-gap";
      this.updateDOM(elt);
      return elt;
    };
    _proto89.eq = function eq(other) {
      return other.height == this.height;
    };
    _proto89.updateDOM = function updateDOM(elt) {
      elt.style.height = this.height + "px";
      return true;
    };
    _proto89.ignoreEvent = function ignoreEvent() {
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
      for (var _iterator77 = _createForOfIteratorHelperLoose(line.type), _step77; !(_step77 = _iterator77()).done;) {
        var _l = _step77.value;
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
    var _loop1 = function _loop1() {
        var moved = 0;
        for (var _iterator78 = _createForOfIteratorHelperLoose(atoms), _step78; !(_step78 = _iterator78()).done;) {
          var set = _step78.value;
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
      _ret = _loop1();
      if (_ret) return _ret.v;
    }
  }
  function skipAtomsForSelection(atoms, sel) {
    var ranges = null;
    for (var _i26 = 0; _i26 < sel.ranges.length; _i26++) {
      var range = sel.ranges[_i26],
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
        ranges[_i26] = updated;
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
    var _proto90 = InlineCoordsScan.prototype;
    _proto90.bidiSpansAt = function bidiSpansAt(pos) {
      if (!this.line || this.line.from > pos || this.line.to < pos) {
        this.line = this.view.state.doc.lineAt(pos);
        this.spans = this.view.bidiSpans(this.line);
      }
      return this;
    };
    _proto90.baseDirAt = function baseDirAt(pos, side) {
      var _this$bidiSpansAt = this.bidiSpansAt(pos),
        line = _this$bidiSpansAt.line,
        spans = _this$bidiSpansAt.spans;
      var level = spans[BidiSpan.find(spans, pos - line.from, -1, side)].level;
      return level == this.baseDir;
    };
    _proto90.dirAt = function dirAt(pos, side) {
      var _this$bidiSpansAt2 = this.bidiSpansAt(pos),
        line = _this$bidiSpansAt2.line,
        spans = _this$bidiSpansAt2.spans;
      return spans[BidiSpan.find(spans, pos - line.from, -1, side)].dir;
    };
    _proto90.bidiIn = function bidiIn(from, to) {
      var _this$bidiSpansAt3 = this.bidiSpansAt(from),
        spans = _this$bidiSpansAt3.spans,
        line = _this$bidiSpansAt3.line;
      return spans.length > 1 || spans.length && (spans[0].level != this.baseDir || spans[0].to + line.from < to);
    };
    _proto90.scan = function scan(positions, getRects, recursed) {
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
          for (var _i27 = 1; _i27 < dist2; _i27++) {
            var _scan4 = mid + _i27;
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
        if (rects) for (var _i28 = 0; _i28 < rects.length; _i28++) {
          var rect = rects[_i28];
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
    _proto90.scanText = function scanText(tile, offset) {
      var positions = [];
      for (var _i29 = 0; _i29 < tile.length; _i29 = findClusterBreak2(tile.text, _i29)) positions.push(offset + _i29);
      positions.push(offset + tile.length);
      var scan = this.scan(positions, function (i2) {
        var off = positions[i2] - offset,
          end = positions[i2 + 1] - offset;
        return textRange(tile.dom, off, end).getClientRects();
      });
      return scan.after ? new PosAssoc(positions[scan.i + 1], -1) : new PosAssoc(positions[scan.i], 1);
    };
    _proto90.scanTile = function scanTile(tile, offset) {
      if (!tile.length) return new PosAssoc(offset, 1);
      if (tile.children.length == 1) {
        var child2 = tile.children[0];
        if (child2.isText()) return this.scanText(child2, offset);else if (child2.isComposite()) return this.scanTile(child2, offset);
      }
      var positions = [offset];
      for (var _i30 = 0, pos2 = offset; _i30 < tile.children.length; _i30++) positions.push(pos2 += tile.children[_i30].length);
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
    var _proto91 = DOMReader.prototype;
    _proto91.append = function append(text) {
      this.text += text;
    };
    _proto91.lineBreak = function lineBreak() {
      this.text += LineBreakPlaceholder;
    };
    _proto91.readRange = function readRange(start, end) {
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
    _proto91.readTextNode = function readTextNode(node) {
      var text = node.nodeValue;
      for (var _iterator79 = _createForOfIteratorHelperLoose(this.points), _step79; !(_step79 = _iterator79()).done;) {
        var _point = _step79.value;
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
          for (var _iterator80 = _createForOfIteratorHelperLoose(this.points), _step80; !(_step80 = _iterator80()).done;) {
            var point = _step80.value;
            if (point.node == node && point.pos > this.text.length) point.pos -= breakSize - 1;
          }
        }
        off = nextBreak + breakSize;
      }
    };
    _proto91.readNode = function readNode(node) {
      var tile = Tile.get(node);
      var fromView = tile && tile.overrideDOMText;
      if (fromView != null) {
        this.findPointInside(node, fromView.length);
        for (var _i31 = fromView.iter(); !_i31.next().done;) {
          if (_i31.lineBreak) this.lineBreak();else this.append(_i31.value);
        }
      } else if (node.nodeType == 3) {
        this.readTextNode(node);
      } else if (node.nodeName == "BR") {
        if (node.nextSibling) this.lineBreak();
      } else if (node.nodeType == 1) {
        this.readRange(node.firstChild, null);
      }
    };
    _proto91.findPointBefore = function findPointBefore(node, next) {
      for (var _iterator81 = _createForOfIteratorHelperLoose(this.points), _step81; !(_step81 = _iterator81()).done;) {
        var point = _step81.value;
        if (point.node == node && node.childNodes[point.offset] == next) point.pos = this.text.length;
      }
    };
    _proto91.findPointInside = function findPointInside(node, length) {
      for (var _iterator82 = _createForOfIteratorHelperLoose(this.points), _step82; !(_step82 = _iterator82()).done;) {
        var point = _step82.value;
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
      for (var _iterator83 = _createForOfIteratorHelperLoose(widgets), _step83; !(_step83 = _iterator83()).done;) {
        var w = _step83.value;
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
      for (var _i32 = 0, pos = offset, prevEnd = offset; _i32 < tile.children.length; _i32++) {
        var child = tile.children[_i32],
          end = pos + child.length;
        if (pos < from && end > to) return domBoundsAround(child, from, to, pos);
        if (end >= from && fromI == -1) {
          fromI = _i32;
          fromStart = pos;
        }
        if (pos > to && child.dom.parentNode == tile.dom) {
          toI = _i32;
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
  function sameSelPos(selection2, range) {
    return range.head == selection2.main.head && range.anchor == selection2.main.anchor;
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
    var _proto92 = InputState.prototype;
    _proto92.setSelectionOrigin = function setSelectionOrigin(origin) {
      this.lastSelectionOrigin = origin;
      this.lastSelectionTime = Date.now();
    };
    _proto92.handleEvent = function handleEvent(event) {
      var _this37 = this;
      if (!eventBelongsToEditor(this.view, event) || this.ignoreDuringComposition(event)) return;
      if (event.type == "keydown" && this.keydown(event)) return;
      if (this.view.updateState != 0) Promise.resolve().then(function () {
        return _this37.runHandlers(event.type, event);
      });else this.runHandlers(event.type, event);
    };
    _proto92.runHandlers = function runHandlers(type, event) {
      var handlers2 = this.handlers[type];
      if (handlers2) {
        for (var _iterator84 = _createForOfIteratorHelperLoose(handlers2.observers), _step84; !(_step84 = _iterator84()).done;) {
          var observer = _step84.value;
          observer(this.view, event);
        }
        for (var _iterator85 = _createForOfIteratorHelperLoose(handlers2.handlers), _step85; !(_step85 = _iterator85()).done;) {
          var handler = _step85.value;
          if (event.defaultPrevented) break;
          if (handler(this.view, event)) {
            event.preventDefault();
            break;
          }
        }
      }
    };
    _proto92.ensureHandlers = function ensureHandlers(plugins) {
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
    _proto92.keydown = function keydown(event) {
      var _this38 = this;
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
          return _this38.flushIOSKey();
        }, 250);
        return true;
      }
      if (event.keyCode != 229) this.view.observer.forceFlush();
      return false;
    };
    _proto92.flushIOSKey = function flushIOSKey(change) {
      var key = this.pendingIOSKey;
      if (!key) return false;
      if (key.key == "Enter" && change && change.from < change.to && /^\S+$/.test(change.insert.toString())) return false;
      this.pendingIOSKey = void 0;
      return dispatchKey(this.view.contentDOM, key.key, key.keyCode, key.mods);
    };
    _proto92.ignoreDuringComposition = function ignoreDuringComposition(event) {
      if (!/^key/.test(event.type) || event.synthetic) return false;
      if (this.composing > 0) return true;
      if (browser.safari && !browser.ios && this.compositionPendingKey && Date.now() - this.compositionEndedAt < 100) {
        this.compositionPendingKey = false;
        return true;
      }
      return false;
    };
    _proto92.startMouseSelection = function startMouseSelection(mouseSelection) {
      if (this.mouseSelection) this.mouseSelection.destroy();
      this.mouseSelection = mouseSelection;
    };
    _proto92.update = function update(_update3) {
      this.view.observer.update(_update3);
      if (this.mouseSelection) this.mouseSelection.update(_update3);
      if (this.draggedContent && _update3.docChanged) this.draggedContent = this.draggedContent.map(_update3.changes);
      if (_update3.transactions.length) this.lastKeyCode = this.lastSelectionTime = 0;
    };
    _proto92.destroy = function destroy() {
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
    for (var _iterator86 = _createForOfIteratorHelperLoose(plugins), _step86; !(_step86 = _iterator86()).done;) {
      var plugin = _step86.value;
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
    var _proto93 = MouseSelection.prototype;
    _proto93.start = function start(event) {
      if (this.dragging === false) this.select(event);
    };
    _proto93.move = function move(event) {
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
    _proto93.up = function up(event) {
      if (this.dragging == null) this.select(this.lastEvent);
      if (!this.dragging) event.preventDefault();
      this.destroy();
    };
    _proto93.destroy = function destroy() {
      this.setScrollSpeed(0, 0);
      var doc2 = this.view.contentDOM.ownerDocument;
      doc2.removeEventListener("mousemove", this.move);
      doc2.removeEventListener("mouseup", this.up);
      this.view.inputState.mouseSelection = this.view.inputState.draggedContent = null;
    };
    _proto93.setScrollSpeed = function setScrollSpeed(sx, sy) {
      var _this39 = this;
      this.scrollSpeed = {
        x: sx,
        y: sy
      };
      if (sx || sy) {
        if (this.scrolling < 0) this.scrolling = setInterval(function () {
          return _this39.scroll();
        }, 50);
      } else if (this.scrolling > -1) {
        clearInterval(this.scrolling);
        this.scrolling = -1;
      }
    };
    _proto93.scroll = function scroll() {
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
    _proto93.select = function select(event) {
      var view = this.view,
        selection2 = skipAtomsForSelection(this.atoms, this.style.get(event, this.extend, this.multiple));
      if (this.mustSelect || !selection2.eq(view.state.selection, this.dragging === false)) this.view.dispatch({
        selection: selection2,
        userEvent: "select.pointer"
      });
      this.mustSelect = false;
    };
    _proto93.update = function update(_update4) {
      var _this40 = this;
      if (_update4.transactions.some(function (tr) {
        return tr.isUserEvent("input.type");
      })) this.destroy();else if (this.style.update(_update4)) setTimeout(function () {
        return _this40.select(_this40.lastEvent);
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
    for (var _i33 = 0; _i33 < rects.length; _i33++) {
      var rect = rects[_i33];
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
    for (var _iterator87 = _createForOfIteratorHelperLoose(state.facet(facet)), _step87; !(_step87 = _iterator87()).done;) {
      var filter = _step87.value;
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
    for (var _iterator88 = _createForOfIteratorHelperLoose(view.state.facet(mouseSelectionStyle)), _step88; !(_step88 = _iterator88()).done;) {
      var makeStyle = _step88.value;
      style = makeStyle(view, event);
      if (style) break;
    }
    if (!style && event.button == 0) style = basicMouseSelection(view, event);
    if (style) {
      var mustFocus = !view.hasFocus;
      view.inputState.startMouseSelection(new MouseSelection(view, event, style, mustFocus));
      if (mustFocus) view.observer.ignore(function () {
        focusPreventScroll(view.contentDOM);
        var active = view.root.activeElement;
        if (active && !active.contains(view.contentDOM)) active.blur();
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
    for (var _i34 = 0; _i34 < sel.ranges.length; _i34++) {
      var _sel$ranges$_i = sel.ranges[_i34],
        from = _sel$ranges$_i.from,
        to = _sel$ranges$_i.to;
      if (from <= pos && to >= pos) return EditorSelection.create(sel.ranges.slice(0, _i34).concat(sel.ranges.slice(_i34 + 1)), sel.mainIndex == _i34 ? 0 : sel.mainIndex - (sel.mainIndex > _i34 ? 1 : 0));
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
      var _loop10 = function _loop10(_i35) {
        var reader = new FileReader();
        reader.onerror = finishFile;
        reader.onload = function () {
          if (!/[\x00-\x08\x0e-\x1f]{2}/.test(reader.result)) text[_i35] = reader.result;
          finishFile();
        };
        reader.readAsText(files[_i35]);
      };
      for (var _i35 = 0; _i35 < files.length; _i35++) {
        _loop10(_i35);
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
    for (var _iterator89 = _createForOfIteratorHelperLoose(state.selection.ranges), _step89; !(_step89 = _iterator89()).done;) {
      var range = _step89.value;
      if (!range.empty) {
        content2.push(state.sliceDoc(range.from, range.to));
        ranges.push(range);
      }
    }
    if (!content2.length) {
      var upto = -1;
      for (var _iterator90 = _createForOfIteratorHelperLoose(state.selection.ranges), _step90; !(_step90 = _iterator90()).done;) {
        var from = _step90.value.from;
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
    for (var _iterator91 = _createForOfIteratorHelperLoose(state.facet(focusChangeEffect)), _step91; !(_step91 = _iterator91()).done;) {
      var getEffect = _step91.value;
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
    var _proto94 = HeightOracle.prototype;
    _proto94.heightForGap = function heightForGap(from, to) {
      var lines = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
      if (this.lineWrapping) lines += Math.max(0, Math.ceil((to - from - lines * this.lineLength * 0.5) / this.lineLength));
      return this.lineHeight * lines;
    };
    _proto94.heightForLine = function heightForLine(length) {
      if (!this.lineWrapping) return this.lineHeight;
      var lines = 1 + Math.max(0, Math.ceil((length - this.lineLength) / Math.max(1, this.lineLength - 5)));
      return lines * this.lineHeight;
    };
    _proto94.setDoc = function setDoc(doc2) {
      this.doc = doc2;
      return this;
    };
    _proto94.mustRefreshForWrapping = function mustRefreshForWrapping(whiteSpace) {
      return wrappingWhiteSpace.indexOf(whiteSpace) > -1 != this.lineWrapping;
    };
    _proto94.mustRefreshForHeights = function mustRefreshForHeights(lineHeights) {
      var newHeight = false;
      for (var _i36 = 0; _i36 < lineHeights.length; _i36++) {
        var h = lineHeights[_i36];
        if (h < 0) {
          _i36++;
        } else if (!this.heightSamples[Math.floor(h * 10)]) {
          newHeight = true;
          this.heightSamples[Math.floor(h * 10)] = true;
        }
      }
      return newHeight;
    };
    _proto94.refresh = function refresh(whiteSpace, lineHeight, charWidth, textHeight, lineLength, knownHeights) {
      var lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
      var changed = Math.abs(lineHeight - this.lineHeight) > 0.3 || this.lineWrapping != lineWrapping;
      this.lineWrapping = lineWrapping;
      this.lineHeight = lineHeight;
      this.charWidth = charWidth;
      this.textHeight = textHeight;
      this.lineLength = lineLength;
      if (changed) {
        this.heightSamples = {};
        for (var _i37 = 0; _i37 < knownHeights.length; _i37++) {
          var h = knownHeights[_i37];
          if (h < 0) _i37++;else this.heightSamples[Math.floor(h * 10)] = true;
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
    var _proto95 = _BlockInfo.prototype;
    _proto95.join = function join(other) {
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
    var _proto96 = _HeightMap.prototype;
    _proto96.setHeight = function setHeight(height) {
      if (this.height != height) {
        if (Math.abs(this.height - height) > Epsilon) heightChangeFlag = true;
        this.height = height;
      }
    };
    _proto96.replace = function replace(_from, _to, nodes) {
      return _HeightMap.of(nodes);
    };
    _proto96.decomposeLeft = function decomposeLeft(_to, result) {
      result.push(this);
    };
    _proto96.decomposeRight = function decomposeRight(_from, result) {
      result.push(this);
    };
    _proto96.applyChanges = function applyChanges(decorations2, oldDoc, oracle, changes) {
      var me = this,
        doc2 = oracle.doc;
      for (var _i38 = changes.length - 1; _i38 >= 0; _i38--) {
        var _changes$_i = changes[_i38],
          fromA = _changes$_i.fromA,
          toA = _changes$_i.toA,
          fromB = _changes$_i.fromB,
          toB = _changes$_i.toB;
        var start = me.lineAt(fromA, QueryType.ByPosNoHeight, oracle.setDoc(oldDoc), 0, 0);
        var end = start.to >= toA ? start : me.lineAt(toA, QueryType.ByPosNoHeight, oracle, 0, 0);
        toB += end.to - toA;
        toA = end.to;
        while (_i38 > 0 && start.from <= changes[_i38 - 1].toA) {
          fromA = changes[_i38 - 1].fromA;
          fromB = changes[_i38 - 1].fromB;
          _i38--;
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
          var _next4 = nodes[--j];
          if (_next4) after += _next4.size;
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
      var _this41;
      _this41 = _HeightMap2.call(this, length, height) || this;
      _this41.deco = deco;
      _this41.spaceAbove = 0;
      return _this41;
    }
    _inheritsLoose(HeightMapBlock, _HeightMap2);
    var _proto97 = HeightMapBlock.prototype;
    _proto97.mainBlock = function mainBlock(top2, offset) {
      return new BlockInfo(offset, this.length, top2 + this.spaceAbove, this.height - this.spaceAbove, this.deco || 0);
    };
    _proto97.blockAt = function blockAt(height, _oracle, top2, offset) {
      return this.spaceAbove && height < top2 + this.spaceAbove ? new BlockInfo(offset, 0, top2, this.spaceAbove, SpaceDeco) : this.mainBlock(top2, offset);
    };
    _proto97.lineAt = function lineAt(_value, _type, oracle, top2, offset) {
      var main = this.mainBlock(top2, offset);
      return this.spaceAbove ? this.blockAt(0, oracle, top2, offset).join(main) : main;
    };
    _proto97.forEachLine = function forEachLine(from, to, oracle, top2, offset, f) {
      if (from <= offset + this.length && to >= offset) f(this.lineAt(0, QueryType.ByPos, oracle, top2, offset));
    };
    _proto97.setMeasuredHeight = function setMeasuredHeight(measured) {
      var next = measured.heights[measured.index++];
      if (next < 0) {
        this.spaceAbove = -next;
        next = measured.heights[measured.index++];
      } else {
        this.spaceAbove = 0;
      }
      this.setHeight(next);
    };
    _proto97.updateHeight = function updateHeight(oracle, offset, _force, measured) {
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
    _proto97.toString = function toString() {
      return "block(" + this.length + ")";
    };
    return HeightMapBlock;
  }(HeightMap);
  var HeightMapText = function (_HeightMapBlock) {
    function _HeightMapText(length, height, above) {
      var _this42;
      _this42 = _HeightMapBlock.call(this, length, height, null) || this;
      _this42.collapsed = 0;
      _this42.widgetHeight = 0;
      _this42.breaks = 0;
      _this42.spaceAbove = above;
      return _this42;
    }
    _inheritsLoose(_HeightMapText, _HeightMapBlock);
    var _proto98 = _HeightMapText.prototype;
    _proto98.mainBlock = function mainBlock(top2, offset) {
      return new BlockInfo(offset, this.length, top2 + this.spaceAbove, this.height - this.spaceAbove, this.breaks);
    };
    _proto98.replace = function replace(_from, _to, nodes) {
      var node = nodes[0];
      if (nodes.length == 1 && (node instanceof _HeightMapText || node instanceof HeightMapGap && node.flags & 4) && Math.abs(this.length - node.length) < 10) {
        if (node instanceof HeightMapGap) node = new _HeightMapText(node.length, this.height, this.spaceAbove);else node.height = this.height;
        if (!this.outdated) node.outdated = false;
        return node;
      } else {
        return HeightMap.of(nodes);
      }
    };
    _proto98.updateHeight = function updateHeight(oracle, offset, force, measured) {
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
    _proto98.toString = function toString() {
      return "line(" + this.length + (this.collapsed ? -this.collapsed : "") + (this.widgetHeight ? ":" + this.widgetHeight : "") + ")";
    };
    return _HeightMapText;
  }(HeightMapBlock);
  var HeightMapGap = function (_HeightMap3) {
    function _HeightMapGap(length) {
      return _HeightMap3.call(this, length, 0) || this;
    }
    _inheritsLoose(_HeightMapGap, _HeightMap3);
    var _proto99 = _HeightMapGap.prototype;
    _proto99.heightMetrics = function heightMetrics(oracle, offset) {
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
    _proto99.blockAt = function blockAt(height, oracle, top2, offset) {
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
    _proto99.lineAt = function lineAt(value, type, oracle, top2, offset) {
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
    _proto99.forEachLine = function forEachLine(from, to, oracle, top2, offset, f) {
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
    _proto99.replace = function replace(from, to, nodes) {
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
    _proto99.decomposeLeft = function decomposeLeft(to, result) {
      result.push(new _HeightMapGap(to - 1), null);
    };
    _proto99.decomposeRight = function decomposeRight(from, result) {
      result.push(null, new _HeightMapGap(this.length - from - 1));
    };
    _proto99.updateHeight = function updateHeight(oracle, offset, force, measured) {
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
    _proto99.toString = function toString() {
      return "gap(" + this.length + ")";
    };
    return _HeightMapGap;
  }(HeightMap);
  var HeightMapBranch = function (_HeightMap4) {
    function HeightMapBranch(left, brk, right) {
      var _this43;
      _this43 = _HeightMap4.call(this, left.length + brk + right.length, left.height + right.height, brk | (left.outdated || right.outdated ? 2 : 0)) || this;
      _this43.left = left;
      _this43.right = right;
      _this43.size = left.size + right.size;
      return _this43;
    }
    _inheritsLoose(HeightMapBranch, _HeightMap4);
    var _proto100 = HeightMapBranch.prototype;
    _proto100.blockAt = function blockAt(height, oracle, top2, offset) {
      var mid = top2 + this.left.height;
      return height < mid ? this.left.blockAt(height, oracle, top2, offset) : this.right.blockAt(height, oracle, mid, offset + this.left.length + this.break);
    };
    _proto100.lineAt = function lineAt(value, type, oracle, top2, offset) {
      var rightTop = top2 + this.left.height,
        rightOffset = offset + this.left.length + this.break;
      var left = type == QueryType.ByHeight ? value < rightTop : value < rightOffset;
      var base2 = left ? this.left.lineAt(value, type, oracle, top2, offset) : this.right.lineAt(value, type, oracle, rightTop, rightOffset);
      if (this.break || (left ? base2.to < rightOffset : base2.from > rightOffset)) return base2;
      var subQuery = type == QueryType.ByPosNoHeight ? QueryType.ByPosNoHeight : QueryType.ByPos;
      if (left) return base2.join(this.right.lineAt(rightOffset, subQuery, oracle, rightTop, rightOffset));else return this.left.lineAt(rightOffset, subQuery, oracle, top2, offset).join(base2);
    };
    _proto100.forEachLine = function forEachLine(from, to, oracle, top2, offset, f) {
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
    _proto100.replace = function replace(from, to, nodes) {
      var rightStart = this.left.length + this.break;
      if (to < rightStart) return this.balanced(this.left.replace(from, to, nodes), this.right);
      if (from > this.left.length) return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
      var result = [];
      if (from > 0) this.decomposeLeft(from, result);
      var left = result.length;
      for (var _iterator92 = _createForOfIteratorHelperLoose(nodes), _step92; !(_step92 = _iterator92()).done;) {
        var node = _step92.value;
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
    _proto100.decomposeLeft = function decomposeLeft(to, result) {
      var left = this.left.length;
      if (to <= left) return this.left.decomposeLeft(to, result);
      result.push(this.left);
      if (this.break) {
        left++;
        if (to >= left) result.push(null);
      }
      if (to > left) this.right.decomposeLeft(to - left, result);
    };
    _proto100.decomposeRight = function decomposeRight(from, result) {
      var left = this.left.length,
        right = left + this.break;
      if (from >= right) return this.right.decomposeRight(from - right, result);
      if (from < left) this.left.decomposeRight(from, result);
      if (this.break && from < right) result.push(null);
      result.push(this.right);
    };
    _proto100.balanced = function balanced(left, right) {
      if (left.size > 2 * right.size || right.size > 2 * left.size) return HeightMap.of(this.break ? [left, null, right] : [left, right]);
      this.left = replace(this.left, left);
      this.right = replace(this.right, right);
      this.setHeight(left.height + right.height);
      this.outdated = left.outdated || right.outdated;
      this.size = left.size + right.size;
      this.length = left.length + this.break + right.length;
      return this;
    };
    _proto100.updateHeight = function updateHeight(oracle, offset, force, measured) {
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
    _proto100.toString = function toString() {
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
    var _proto101 = _NodeBuilder.prototype;
    _proto101.span = function span(_from, to) {
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
    _proto101.point = function point(from, to, deco) {
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
    _proto101.enterLine = function enterLine() {
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
    _proto101.blankContent = function blankContent(from, to) {
      var gap = new HeightMapGap(to - from);
      if (this.oracle.doc.lineAt(from).to == to) gap.flags |= 4;
      return gap;
    };
    _proto101.ensureLine = function ensureLine() {
      this.enterLine();
      var last = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
      if (last instanceof HeightMapText) return last;
      var line = new HeightMapText(0, -1, 0);
      this.nodes.push(line);
      return line;
    };
    _proto101.addBlock = function addBlock(block) {
      this.enterLine();
      var deco = block.deco;
      if (deco && deco.startSide > 0 && !this.isCovered) this.ensureLine();
      this.nodes.push(block);
      this.writtenTo = this.pos = this.pos + block.length;
      if (deco && deco.endSide > 0) this.covering = block;
    };
    _proto101.addLineDeco = function addLineDeco(height, breaks, length) {
      var line = this.ensureLine();
      line.length += length;
      line.collapsed += length;
      line.widgetHeight = Math.max(line.widgetHeight, height);
      line.breaks += breaks;
      this.writtenTo = this.pos = this.pos + length;
    };
    _proto101.finish = function finish(from) {
      var last = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
      if (this.lineStart > -1 && !(last instanceof HeightMapText) && !this.isCovered) this.nodes.push(new HeightMapText(0, -1, 0));else if (this.writtenTo < this.pos || last == null) this.nodes.push(this.blankContent(this.writtenTo, this.pos));
      var pos = from;
      for (var _iterator93 = _createForOfIteratorHelperLoose(this.nodes), _step93; !(_step93 = _iterator93()).done;) {
        var node = _step93.value;
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
    var _proto102 = DecorationComparator2.prototype;
    _proto102.compareRange = function compareRange() {};
    _proto102.comparePoint = function comparePoint(from, to, a, b) {
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
      for (var _i39 = 0; _i39 < a.length; _i39++) {
        var gA = a[_i39],
          gB = b[_i39];
        if (gA.from != gB.from || gA.to != gB.to || gA.size != gB.size) return false;
      }
      return true;
    };
    var _proto103 = LineGap.prototype;
    _proto103.draw = function draw(viewState, wrapping) {
      return Decoration.replace({
        widget: new LineGapWidget(this.displaySize * (wrapping ? viewState.scaleY : viewState.scaleX), wrapping)
      }).range(this.from, this.to);
    };
    return LineGap;
  }();
  var LineGapWidget = function (_WidgetType4) {
    function LineGapWidget(size, vertical) {
      var _this44;
      _this44 = _WidgetType4.call(this) || this;
      _this44.size = size;
      _this44.vertical = vertical;
      return _this44;
    }
    _inheritsLoose(LineGapWidget, _WidgetType4);
    var _proto104 = LineGapWidget.prototype;
    _proto104.eq = function eq(other) {
      return other.size == this.size && other.vertical == this.vertical;
    };
    _proto104.toDOM = function toDOM() {
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
      var _this45 = this;
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
      for (var _i40 = 0; _i40 < 2; _i40++) {
        this.viewport = this.getViewport(0, null);
        if (!this.updateForViewport()) break;
      }
      this.updateViewportLines();
      this.lineGaps = this.ensureLineGaps([]);
      this.lineGapDeco = Decoration.set(this.lineGaps.map(function (gap) {
        return gap.draw(_this45, false);
      }));
      this.scrollParent = view.scrollDOM;
      this.computeVisibleRanges();
    }
    var _proto105 = ViewState.prototype;
    _proto105.updateForViewport = function updateForViewport() {
      var _this46 = this;
      var viewports = [this.viewport],
        main = this.state.selection.main;
      var _loop11 = function _loop11() {
        var pos = _i41 ? main.head : main.anchor;
        if (!viewports.some(function (_ref8) {
          var from = _ref8.from,
            to = _ref8.to;
          return pos >= from && pos <= to;
        })) {
          var _this46$lineBlockAt = _this46.lineBlockAt(pos),
            from = _this46$lineBlockAt.from,
            to = _this46$lineBlockAt.to;
          viewports.push(new Viewport(from, to));
        }
      };
      for (var _i41 = 0; _i41 <= 1; _i41++) {
        _loop11();
      }
      this.viewports = viewports.sort(function (a, b) {
        return a.from - b.from;
      });
      return this.updateScaler();
    };
    _proto105.updateScaler = function updateScaler() {
      var scaler = this.scaler;
      this.scaler = this.heightMap.height <= 7e6 ? IdScaler : new BigScaler(this.heightOracle, this.heightMap, this.viewports);
      return scaler.eq(this.scaler) ? 0 : 2;
    };
    _proto105.updateViewportLines = function updateViewportLines() {
      var _this47 = this;
      this.viewportLines = [];
      this.heightMap.forEachLine(this.viewport.from, this.viewport.to, this.heightOracle.setDoc(this.state.doc), 0, 0, function (block) {
        _this47.viewportLines.push(scaleBlock(block, _this47.scaler));
      });
    };
    _proto105.update = function update(_update6, scrollTarget) {
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
    _proto105.measure = function measure() {
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
        for (var _iterator94 = _createForOfIteratorHelperLoose(this.viewports), _step94; !(_step94 = _iterator94()).done;) {
          var vp = _step94.value;
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
    _proto105.getViewport = function getViewport(bias, scrollTarget) {
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
    _proto105.mapViewport = function mapViewport(viewport, changes) {
      var from = changes.mapPos(viewport.from, -1),
        to = changes.mapPos(viewport.to, 1);
      return new Viewport(this.heightMap.lineAt(from, QueryType.ByPos, this.heightOracle, 0, 0).from, this.heightMap.lineAt(to, QueryType.ByPos, this.heightOracle, 0, 0).to);
    };
    _proto105.viewportIsAppropriate = function viewportIsAppropriate(_ref9, bias) {
      var from = _ref9.from,
        to = _ref9.to;
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
    _proto105.mapLineGaps = function mapLineGaps(gaps, changes) {
      if (!gaps.length || changes.empty) return gaps;
      var mapped = [];
      for (var _iterator95 = _createForOfIteratorHelperLoose(gaps), _step95; !(_step95 = _iterator95()).done;) {
        var gap = _step95.value;
        if (!changes.touchesRange(gap.from, gap.to)) mapped.push(new LineGap(changes.mapPos(gap.from), changes.mapPos(gap.to), gap.size, gap.displaySize));
      }
      return mapped;
    };
    _proto105.ensureLineGaps = function ensureLineGaps(current, mayMeasure) {
      var _this48 = this;
      var wrapping = this.heightOracle.lineWrapping;
      var margin = wrapping ? 1e4 : 2e3,
        halfMargin = margin >> 1,
        doubleMargin = margin << 1;
      if (this.defaultTextDirection != Direction.LTR && !wrapping) return [];
      var gaps = [];
      var _addGap = function addGap(from, to, line, structure) {
        if (to - from < halfMargin) return;
        var sel = _this48.state.selection.main,
          avoid = [sel.from];
        if (!sel.empty) avoid.push(sel.to);
        for (var _i42 = 0, _avoid = avoid; _i42 < _avoid.length; _i42++) {
          var pos = _avoid[_i42];
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
          var size = _this48.gapSize(line, from, to, structure);
          var displaySize = wrapping || size < 2e6 ? size : 2e6;
          gap = new LineGap(from, to, size, displaySize);
        }
        gaps.push(gap);
      };
      var checkLine = function checkLine(line) {
        if (line.length < doubleMargin || line.type != BlockType.Text) return;
        var structure = lineStructure(line.from, line.to, _this48.stateDeco);
        if (structure.total < doubleMargin) return;
        var target = _this48.scrollTarget ? _this48.scrollTarget.range.head : null;
        var viewFrom, viewTo;
        if (wrapping) {
          var marginHeight = margin / _this48.heightOracle.lineLength * _this48.heightOracle.lineHeight;
          var top2, bot;
          if (target != null) {
            var targetFrac = findFraction(structure, target);
            var spaceFrac = ((_this48.visibleBottom - _this48.visibleTop) / 2 + marginHeight) / line.height;
            top2 = targetFrac - spaceFrac;
            bot = targetFrac + spaceFrac;
          } else {
            top2 = (_this48.visibleTop - line.top - marginHeight) / line.height;
            bot = (_this48.visibleBottom - line.top + marginHeight) / line.height;
          }
          viewFrom = findPosition(structure, top2);
          viewTo = findPosition(structure, bot);
        } else {
          var totalWidth = structure.total * _this48.heightOracle.charWidth;
          var marginWidth = margin * _this48.heightOracle.charWidth;
          var horizOffset = 0;
          if (totalWidth > 2e6) {
            for (var _iterator96 = _createForOfIteratorHelperLoose(current), _step96; !(_step96 = _iterator96()).done;) {
              var old = _step96.value;
              if (old.from >= line.from && old.from < line.to && old.size != old.displaySize && old.from * _this48.heightOracle.charWidth + horizOffset < _this48.pixelViewport.left) horizOffset = old.size - old.displaySize;
            }
          }
          var pxLeft = _this48.pixelViewport.left + horizOffset,
            pxRight = _this48.pixelViewport.right + horizOffset;
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
      for (var _iterator97 = _createForOfIteratorHelperLoose(this.viewportLines), _step97; !(_step97 = _iterator97()).done;) {
        var line = _step97.value;
        if (Array.isArray(line.type)) line.type.forEach(checkLine);else checkLine(line);
      }
      return gaps;
    };
    _proto105.gapSize = function gapSize(line, from, to, structure) {
      var fraction = findFraction(structure, to) - findFraction(structure, from);
      if (this.heightOracle.lineWrapping) {
        return line.height * fraction;
      } else {
        return structure.total * this.heightOracle.charWidth * fraction;
      }
    };
    _proto105.updateLineGaps = function updateLineGaps(gaps) {
      var _this49 = this;
      if (!LineGap.same(gaps, this.lineGaps)) {
        this.lineGaps = gaps;
        this.lineGapDeco = Decoration.set(gaps.map(function (gap) {
          return gap.draw(_this49, _this49.heightOracle.lineWrapping);
        }));
      }
    };
    _proto105.computeVisibleRanges = function computeVisibleRanges(changes) {
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
        for (var _i43 = 0; _i43 < ranges.length && !(changed & 8); _i43++) {
          var old = this.visibleRanges[_i43],
            nw = ranges[_i43];
          if (old.from != nw.from || old.to != nw.to) {
            changed |= 4;
            if (!(changes && changes.mapPos(old.from, -1) == nw.from && changes.mapPos(old.to, 1) == nw.to)) changed |= 8;
          }
        }
      }
      this.visibleRanges = ranges;
      return changed;
    };
    _proto105.lineBlockAt = function lineBlockAt(pos) {
      return pos >= this.viewport.from && pos <= this.viewport.to && this.viewportLines.find(function (b) {
        return b.from <= pos && b.to >= pos;
      }) || scaleBlock(this.heightMap.lineAt(pos, QueryType.ByPos, this.heightOracle, 0, 0), this.scaler);
    };
    _proto105.lineBlockAtHeight = function lineBlockAtHeight(height) {
      return height >= this.viewportLines[0].top && height <= this.viewportLines[this.viewportLines.length - 1].bottom && this.viewportLines.find(function (l) {
        return l.top <= height && l.bottom >= height;
      }) || scaleBlock(this.heightMap.lineAt(this.scaler.fromDOM(height), QueryType.ByHeight, this.heightOracle, 0, 0), this.scaler);
    };
    _proto105.getScrollOffset = function getScrollOffset() {
      var base2 = this.scrollParent == this.view.scrollDOM ? this.scrollParent.scrollTop : (this.scrollParent ? this.scrollParent.getBoundingClientRect().top : 0) - this.view.contentDOM.getBoundingClientRect().top;
      return base2 * this.scaleY;
    };
    _proto105.scrollAnchorAt = function scrollAnchorAt(scrollOffset) {
      var block = this.lineBlockAtHeight(scrollOffset + 8);
      return block.from >= this.viewport.from || this.viewportLines[0].top - scrollOffset > 200 ? block : this.viewportLines[0];
    };
    _proto105.elementAtHeight = function elementAtHeight(height) {
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
  function findPosition(_ref0, ratio) {
    var total = _ref0.total,
      ranges = _ref0.ranges;
    if (ratio <= 0) return ranges[0].from;
    if (ratio >= 1) return ranges[ranges.length - 1].to;
    var dist2 = Math.floor(total * ratio);
    for (var _i44 = 0;; _i44++) {
      var _ranges$_i = ranges[_i44],
        from = _ranges$_i.from,
        to = _ranges$_i.to,
        size = to - from;
      if (dist2 <= size) return from + dist2;
      dist2 -= size;
    }
  }
  function findFraction(structure, pos) {
    var counted = 0;
    for (var _iterator98 = _createForOfIteratorHelperLoose(structure.ranges), _step98; !(_step98 = _iterator98()).done;) {
      var _step98$value = _step98.value,
        from = _step98$value.from,
        to = _step98$value.to;
      if (pos <= to) {
        counted += pos - from;
        break;
      }
      counted += to - from;
    }
    return counted / structure.total;
  }
  function find(array, f) {
    for (var _iterator99 = _createForOfIteratorHelperLoose(array), _step99; !(_step99 = _iterator99()).done;) {
      var _val3 = _step99.value;
      if (f(_val3)) return _val3;
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
      this.viewports = viewports.map(function (_ref1) {
        var from = _ref1.from,
          to = _ref1.to;
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
      for (var _iterator100 = _createForOfIteratorHelperLoose(this.viewports), _step100; !(_step100 = _iterator100()).done;) {
        var obj = _step100.value;
        obj.domTop = domBase + (obj.top - base2) * this.scale;
        domBase = obj.domBottom = obj.domTop + (obj.bottom - obj.top);
        base2 = obj.bottom;
      }
    }
    var _proto106 = _BigScaler.prototype;
    _proto106.toDOM = function toDOM(n) {
      for (var _i45 = 0, base2 = 0, domBase = 0;; _i45++) {
        var vp = _i45 < this.viewports.length ? this.viewports[_i45] : null;
        if (!vp || n < vp.top) return domBase + (n - base2) * this.scale;
        if (n <= vp.bottom) return vp.domTop + (n - vp.top);
        base2 = vp.bottom;
        domBase = vp.domBottom;
      }
    };
    _proto106.fromDOM = function fromDOM(n) {
      for (var _i46 = 0, base2 = 0, domBase = 0;; _i46++) {
        var vp = _i46 < this.viewports.length ? this.viewports[_i46] : null;
        if (!vp || n < vp.domTop) return base2 + (n - domBase) / this.scale;
        if (n <= vp.domBottom) return vp.top + (n - vp.domTop);
        base2 = vp.bottom;
        domBase = vp.domBottom;
      }
    };
    _proto106.eq = function eq(other) {
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
    combine: function combine(values2) {
      return values2.indexOf(true) > -1;
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
      var _this50 = this;
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
        for (var _iterator101 = _createForOfIteratorHelperLoose(mutations), _step101; !(_step101 = _iterator101()).done;) {
          var mut = _step101.value;
          _this50.queue.push(mut);
        }
        if ((browser.ie && browser.ie_version <= 11 || browser.ios && view.composing) && mutations.some(function (m) {
          return m.type == "childList" && m.removedNodes.length || m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length;
        })) _this50.flushSoon();else _this50.flush();
      });
      if (window.EditContext && browser.android && view.constructor.EDIT_CONTEXT !== false && !(browser.chrome && browser.chrome_version < 126)) {
        this.editContext = new EditContextManager(view);
        if (view.state.facet(editable)) view.contentDOM.editContext = this.editContext.editContext;
      }
      if (useCharData) this.onCharData = function (event) {
        _this50.queue.push({
          target: event.target,
          type: "characterData",
          oldValue: event.prevValue
        });
        _this50.flushSoon();
      };
      this.onSelectionChange = this.onSelectionChange.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onPrint = this.onPrint.bind(this);
      this.onScroll = this.onScroll.bind(this);
      if (window.matchMedia) this.printQuery = window.matchMedia("print");
      if (typeof ResizeObserver == "function") {
        this.resizeScroll = new ResizeObserver(function () {
          var _a2;
          if (((_a2 = _this50.view.docView) === null || _a2 === void 0 ? void 0 : _a2.lastUpdate) < Date.now() - 75) _this50.onResize();
        });
        this.resizeScroll.observe(view.scrollDOM);
      }
      this.addWindowListeners(this.win = view.win);
      this.start();
      if (typeof IntersectionObserver == "function") {
        this.intersection = new IntersectionObserver(function (entries) {
          if (_this50.parentCheck < 0) _this50.parentCheck = setTimeout(_this50.listenForScroll.bind(_this50), 1e3);
          if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0 != _this50.intersecting) {
            _this50.intersecting = !_this50.intersecting;
            if (_this50.intersecting != _this50.view.inView) _this50.onScrollChanged(document.createEvent("Event"));
          }
        }, {
          threshold: [0, 1e-3]
        });
        this.intersection.observe(this.dom);
        this.gapIntersection = new IntersectionObserver(function (entries) {
          if (entries.length > 0 && entries[entries.length - 1].intersectionRatio > 0) _this50.onScrollChanged(document.createEvent("Event"));
        }, {});
      }
      this.listenForScroll();
      this.readSelectionRange();
    }
    var _proto107 = DOMObserver.prototype;
    _proto107.onScrollChanged = function onScrollChanged(e) {
      this.view.inputState.runHandlers("scroll", e);
      if (this.intersecting) this.view.measure();
    };
    _proto107.onScroll = function onScroll(e) {
      if (this.intersecting) this.flush(false);
      if (this.editContext) this.view.requestMeasure(this.editContext.measureReq);
      this.onScrollChanged(e);
    };
    _proto107.onResize = function onResize() {
      var _this51 = this;
      if (this.resizeTimeout < 0) this.resizeTimeout = setTimeout(function () {
        _this51.resizeTimeout = -1;
        _this51.view.requestMeasure();
      }, 50);
    };
    _proto107.onPrint = function onPrint(event) {
      var _this52 = this;
      if ((event.type == "change" || !event.type) && !event.matches) return;
      this.view.viewState.printing = true;
      this.view.measure();
      setTimeout(function () {
        _this52.view.viewState.printing = false;
        _this52.view.requestMeasure();
      }, 500);
    };
    _proto107.updateGaps = function updateGaps(gaps) {
      if (this.gapIntersection && (gaps.length != this.gaps.length || this.gaps.some(function (g, i2) {
        return g != gaps[i2];
      }))) {
        this.gapIntersection.disconnect();
        for (var _iterator102 = _createForOfIteratorHelperLoose(gaps), _step102; !(_step102 = _iterator102()).done;) {
          var gap = _step102.value;
          this.gapIntersection.observe(gap);
        }
        this.gaps = gaps;
      }
    };
    _proto107.onSelectionChange = function onSelectionChange(event) {
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
    _proto107.readSelectionRange = function readSelectionRange() {
      var view = this.view;
      var selection2 = getSelection(view.root);
      if (!selection2) return false;
      var range = browser.safari && view.root.nodeType == 11 && view.root.activeElement == this.dom && safariSelectionRangeHack(this.view, selection2) || selection2;
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
    _proto107.setSelectionRange = function setSelectionRange(anchor, head) {
      this.selectionRange.set(anchor.node, anchor.offset, head.node, head.offset);
      this.selectionChanged = false;
    };
    _proto107.clearSelectionRange = function clearSelectionRange() {
      this.selectionRange.set(null, 0, null, 0);
    };
    _proto107.listenForScroll = function listenForScroll() {
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
        for (var _iterator103 = _createForOfIteratorHelperLoose(this.scrollTargets), _step103; !(_step103 = _iterator103()).done;) {
          var _dom = _step103.value;
          _dom.removeEventListener("scroll", this.onScroll);
        }
        for (var _iterator104 = _createForOfIteratorHelperLoose(this.scrollTargets = changed), _step104; !(_step104 = _iterator104()).done;) {
          var _dom2 = _step104.value;
          _dom2.addEventListener("scroll", this.onScroll);
        }
      }
    };
    _proto107.ignore = function ignore(f) {
      if (!this.active) return f();
      try {
        this.stop();
        return f();
      } finally {
        this.start();
        this.clear();
      }
    };
    _proto107.start = function start() {
      if (this.active) return;
      this.observer.observe(this.dom, observeOptions);
      if (useCharData) this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
      this.active = true;
    };
    _proto107.stop = function stop() {
      if (!this.active) return;
      this.active = false;
      this.observer.disconnect();
      if (useCharData) this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    };
    _proto107.clear = function clear() {
      this.processRecords();
      this.queue.length = 0;
      this.selectionChanged = false;
    };
    _proto107.delayAndroidKey = function delayAndroidKey(key, keyCode) {
      var _this53 = this;
      var _a2;
      if (!this.delayedAndroidKey) {
        var flush = function flush() {
          var key2 = _this53.delayedAndroidKey;
          if (key2) {
            _this53.clearDelayedAndroidKey();
            _this53.view.inputState.lastKeyCode = key2.keyCode;
            _this53.view.inputState.lastKeyTime = Date.now();
            var flushed = _this53.flush();
            if (!flushed && key2.force) dispatchKey(_this53.dom, key2.key, key2.keyCode);
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
    _proto107.clearDelayedAndroidKey = function clearDelayedAndroidKey() {
      this.win.cancelAnimationFrame(this.flushingAndroidKey);
      this.delayedAndroidKey = null;
      this.flushingAndroidKey = -1;
    };
    _proto107.flushSoon = function flushSoon() {
      var _this54 = this;
      if (this.delayedFlush < 0) this.delayedFlush = this.view.win.requestAnimationFrame(function () {
        _this54.delayedFlush = -1;
        _this54.flush();
      });
    };
    _proto107.forceFlush = function forceFlush() {
      if (this.delayedFlush >= 0) {
        this.view.win.cancelAnimationFrame(this.delayedFlush);
        this.delayedFlush = -1;
      }
      this.flush();
    };
    _proto107.pendingRecords = function pendingRecords() {
      for (var _iterator105 = _createForOfIteratorHelperLoose(this.observer.takeRecords()), _step105; !(_step105 = _iterator105()).done;) {
        var mut = _step105.value;
        this.queue.push(mut);
      }
      return this.queue;
    };
    _proto107.processRecords = function processRecords() {
      var records = this.pendingRecords();
      if (records.length) this.queue = [];
      var from = -1,
        to = -1,
        typeOver = false;
      for (var _iterator106 = _createForOfIteratorHelperLoose(records), _step106; !(_step106 = _iterator106()).done;) {
        var record = _step106.value;
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
    _proto107.readChange = function readChange() {
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
    _proto107.flush = function flush(readSelection) {
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
    _proto107.readMutation = function readMutation(rec) {
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
    _proto107.setWindow = function setWindow(win) {
      if (win != this.win) {
        this.removeWindowListeners(this.win);
        this.win = win;
        this.addWindowListeners(this.win);
      }
    };
    _proto107.addWindowListeners = function addWindowListeners(win) {
      win.addEventListener("resize", this.onResize);
      if (this.printQuery) {
        if (this.printQuery.addEventListener) this.printQuery.addEventListener("change", this.onPrint);else this.printQuery.addListener(this.onPrint);
      } else win.addEventListener("beforeprint", this.onPrint);
      win.addEventListener("scroll", this.onScroll);
      win.document.addEventListener("selectionchange", this.onSelectionChange);
    };
    _proto107.removeWindowListeners = function removeWindowListeners(win) {
      win.removeEventListener("scroll", this.onScroll);
      win.removeEventListener("resize", this.onResize);
      if (this.printQuery) {
        if (this.printQuery.removeEventListener) this.printQuery.removeEventListener("change", this.onPrint);else this.printQuery.removeListener(this.onPrint);
      } else win.removeEventListener("beforeprint", this.onPrint);
      win.document.removeEventListener("selectionchange", this.onSelectionChange);
    };
    _proto107.update = function update(_update7) {
      if (this.editContext) {
        this.editContext.update(_update7);
        if (_update7.startState.facet(editable) != _update7.state.facet(editable)) _update7.view.contentDOM.editContext = _update7.state.facet(editable) ? this.editContext.editContext : null;
      }
    };
    _proto107.destroy = function destroy() {
      var _a2, _b, _c;
      this.stop();
      (_a2 = this.intersection) === null || _a2 === void 0 ? void 0 : _a2.disconnect();
      (_b = this.gapIntersection) === null || _b === void 0 ? void 0 : _b.disconnect();
      (_c = this.resizeScroll) === null || _c === void 0 ? void 0 : _c.disconnect();
      for (var _iterator107 = _createForOfIteratorHelperLoose(this.scrollTargets), _step107; !(_step107 = _iterator107()).done;) {
        var dom = _step107.value;
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
      var _ref10 = [focusNode, focusOffset, anchorNode, anchorOffset];
      anchorNode = _ref10[0];
      anchorOffset = _ref10[1];
      focusNode = _ref10[2];
      focusOffset = _ref10[3];
    }
    return {
      anchorNode: anchorNode,
      anchorOffset: anchorOffset,
      focusNode: focusNode,
      focusOffset: focusOffset
    };
  }
  function safariSelectionRangeHack(view, selection2) {
    if (selection2.getComposedRanges) {
      var range = selection2.getComposedRanges(view.root)[0];
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
      var _this55 = this;
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
        var from = _this55.toEditorPos(e.updateRangeStart),
          to = _this55.toEditorPos(e.updateRangeEnd);
        if (view.inputState.composing >= 0 && !_this55.composing) _this55.composing = {
          contextBase: e.updateRangeStart,
          editorBase: from,
          drifted: false
        };
        var deletes = to - from > e.text.length;
        if (from == _this55.from && anchor < _this55.from) from = anchor;else if (to == _this55.to && anchor > _this55.to) to = anchor;
        var diff = findDiff(view.state.sliceDoc(from, to), e.text, (deletes ? main.from : main.to) - from, deletes ? "end" : null);
        if (!diff) {
          var newSel = EditorSelection.single(_this55.toEditorPos(e.selectionStart), _this55.toEditorPos(e.selectionEnd));
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
        _this55.pendingContextChange = change;
        if (!view.state.readOnly) {
          var newLen = _this55.to - _this55.from + (change.to - change.from + change.insert.length);
          applyDOMChangeInner(view, change, EditorSelection.single(_this55.toEditorPos(e.selectionStart, newLen), _this55.toEditorPos(e.selectionEnd, newLen)));
        }
        if (_this55.pendingContextChange) {
          _this55.revertPending(view.state);
          _this55.setSelection(view.state);
        }
        if (change.from < change.to && !change.insert.length && view.inputState.composing >= 0 && !/[\\p{Alphabetic}\\p{Number}_]/.test(context.text.slice(Math.max(0, e.updateRangeStart - 1), Math.min(context.text.length, e.updateRangeStart + 1)))) _this55.handlers.compositionend(e);
      };
      this.handlers.characterboundsupdate = function (e) {
        var rects = [],
          prev = null;
        for (var _i47 = _this55.toEditorPos(e.rangeStart), end = _this55.toEditorPos(e.rangeEnd); _i47 < end; _i47++) {
          var rect = view.coordsForChar(_i47);
          prev = rect && new DOMRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top) || prev || new DOMRect();
          rects.push(prev);
        }
        context.updateCharacterBounds(e.rangeStart, rects);
      };
      this.handlers.textformatupdate = function (e) {
        var deco = [];
        for (var _iterator108 = _createForOfIteratorHelperLoose(e.getTextFormats()), _step108; !(_step108 = _iterator108()).done;) {
          var format = _step108.value;
          var lineStyle = format.underlineStyle,
            thickness = format.underlineThickness;
          if (!new RegExp("none", "i").test(lineStyle) && !new RegExp("none", "i").test(thickness)) {
            var from = _this55.toEditorPos(format.rangeStart),
              to = _this55.toEditorPos(format.rangeEnd);
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
        if (_this55.composing) {
          var drifted = _this55.composing.drifted;
          _this55.composing = null;
          if (drifted) _this55.reset(view.state);
        }
      };
      for (var event in this.handlers) context.addEventListener(event, this.handlers[event]);
      this.measureReq = {
        read: function read(view2) {
          var sel = getSelection(view2.root);
          if (sel && sel.rangeCount) _this55.editContext.updateSelectionBounds(sel.getRangeAt(0).getBoundingClientRect());
        }
      };
    }
    var _proto108 = EditContextManager.prototype;
    _proto108.applyEdits = function applyEdits(update) {
      var _this56 = this;
      var off = 0,
        abort = false,
        pending = this.pendingContextChange;
      update.changes.iterChanges(function (fromA, toA, _fromB, _toB, insert2) {
        if (abort) return;
        var dLen = insert2.length - (toA - fromA);
        if (pending && toA >= pending.to) {
          if (pending.from == fromA && pending.to == toA && pending.insert.eq(insert2)) {
            pending = _this56.pendingContextChange = null;
            off += dLen;
            _this56.to += dLen;
            return;
          } else {
            pending = null;
            _this56.revertPending(update.state);
          }
        }
        fromA += off;
        toA += off;
        if (toA <= _this56.from) {
          _this56.from += dLen;
          _this56.to += dLen;
        } else if (fromA < _this56.to) {
          if (fromA < _this56.from || toA > _this56.to || _this56.to - _this56.from + insert2.length > 3e4) {
            abort = true;
            return;
          }
          _this56.editContext.updateText(_this56.toContextPos(fromA), _this56.toContextPos(toA), insert2.toString());
          _this56.to += dLen;
        }
        off += dLen;
      });
      if (pending && !abort) this.revertPending(update.state);
      return !abort;
    };
    _proto108.update = function update(_update8) {
      var _this57 = this;
      var reverted = this.pendingContextChange,
        startSel = _update8.startState.selection.main;
      if (this.composing && (this.composing.drifted || !_update8.changes.touchesRange(startSel.from, startSel.to) && _update8.transactions.some(function (tr) {
        return !tr.isUserEvent("input.type") && tr.changes.touchesRange(_this57.from, _this57.to);
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
    _proto108.resetRange = function resetRange(state) {
      var head = state.selection.main.head;
      this.from = Math.max(0, head - 1e4);
      this.to = Math.min(state.doc.length, head + 1e4);
    };
    _proto108.reset = function reset(state) {
      this.resetRange(state);
      this.editContext.updateText(0, this.editContext.text.length, state.doc.sliceString(this.from, this.to));
      this.setSelection(state);
    };
    _proto108.revertPending = function revertPending(state) {
      var pending = this.pendingContextChange;
      this.pendingContextChange = null;
      this.editContext.updateText(this.toContextPos(pending.from), this.toContextPos(pending.from + pending.insert.length), state.doc.sliceString(pending.from, pending.to));
    };
    _proto108.setSelection = function setSelection(state) {
      var main = state.selection.main;
      var start = this.toContextPos(Math.max(this.from, Math.min(this.to, main.anchor)));
      var end = this.toContextPos(main.head);
      if (this.editContext.selectionStart != start || this.editContext.selectionEnd != end) this.editContext.updateSelection(start, end);
    };
    _proto108.rangeIsValid = function rangeIsValid(state) {
      var head = state.selection.main.head;
      return !(this.from > 0 && head - this.from < 500 || this.to < state.doc.length && this.to - head < 500 || this.to - this.from > 1e4 * 3);
    };
    _proto108.toEditorPos = function toEditorPos(contextPos, clipLen) {
      if (clipLen === void 0) {
        clipLen = this.to - this.from;
      }
      contextPos = Math.min(contextPos, clipLen);
      var c = this.composing;
      return c && c.drifted ? c.editorBase + (contextPos - c.contextBase) : contextPos + this.from;
    };
    _proto108.toContextPos = function toContextPos(editorPos) {
      var c = this.composing;
      return c && c.drifted ? c.contextBase + (editorPos - c.editorBase) : editorPos - this.from;
    };
    _proto108.destroy = function destroy() {
      for (var event in this.handlers) this.editContext.removeEventListener(event, this.handlers[event]);
    };
    return EditContextManager;
  }();
  var EditorView = function () {
    function _EditorView(config) {
      var _this58 = this;
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
          return dispatch(tr, _this58);
        });
      } || function (trs) {
        return _this58.update(trs);
      };
      this.dispatch = this.dispatch.bind(this);
      this._root = config.root || getRoot(config.parent) || document;
      this.viewState = new ViewState(this, config.state || EditorState.create(config));
      if (config.scrollTo && config.scrollTo.is(_scrollIntoView)) this.viewState.scrollTarget = config.scrollTo.value.clip(this.viewState.state);
      this.plugins = this.state.facet(viewPlugin).map(function (spec) {
        return new PluginInstance(spec);
      });
      for (var _iterator109 = _createForOfIteratorHelperLoose(this.plugins), _step109; !(_step109 = _iterator109()).done;) {
        var plugin = _step109.value;
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
        _this58.viewState.mustMeasureContent = "refresh";
        _this58.requestMeasure();
      });
    }
    var _proto109 = _EditorView.prototype;
    _proto109.dispatch = function dispatch() {
      var _this$state;
      for (var _len7 = arguments.length, input = new Array(_len7), _key5 = 0; _key5 < _len7; _key5++) {
        input[_key5] = arguments[_key5];
      }
      var trs = input.length == 1 && input[0] instanceof Transaction ? input : input.length == 1 && Array.isArray(input[0]) ? input[0] : [(_this$state = this.state).update.apply(_this$state, input)];
      this.dispatchTransactions(trs, this);
    };
    _proto109.update = function update(transactions) {
      var _this59 = this;
      if (this.updateState != 0) throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
      var redrawn = false,
        attrsChanged = false,
        update;
      var state = this.state;
      for (var _iterator110 = _createForOfIteratorHelperLoose(transactions), _step110; !(_step110 = _iterator110()).done;) {
        var _tr = _step110.value;
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
        for (var _iterator111 = _createForOfIteratorHelperLoose(transactions), _step111; !(_step111 = _iterator111()).done;) {
          var tr = _step111.value;
          if (scrollTarget) scrollTarget = scrollTarget.map(tr.changes);
          if (tr.scrollIntoView) {
            var main = tr.state.selection.main;
            var _this$state$facet = this.state.facet(_EditorView.cursorScrollMargin),
              x = _this$state$facet.x,
              y = _this$state$facet.y;
            scrollTarget = new ScrollTarget(main.empty ? main : EditorSelection.cursor(main.head, main.head > main.anchor ? -1 : 1), "nearest", "nearest", y, x);
          }
          for (var _iterator112 = _createForOfIteratorHelperLoose(tr.effects), _step112; !(_step112 = _iterator112()).done;) {
            var e = _step112.value;
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
        for (var _iterator113 = _createForOfIteratorHelperLoose(this.state.facet(updateListener)), _step113; !(_step113 = _iterator113()).done;) {
          var listener = _step113.value;
          try {
            listener(update);
          } catch (_e7) {
            logException(this.state, _e7, "update listener");
          }
        }
      }
      if (dispatchFocus || domChange) Promise.resolve().then(function () {
        if (dispatchFocus && _this59.state == dispatchFocus.startState) _this59.dispatch(dispatchFocus);
        if (domChange) {
          if (!applyDOMChange(_this59, domChange) && pendingKey.force) dispatchKey(_this59.contentDOM, pendingKey.key, pendingKey.keyCode);
        }
      });
    };
    _proto109.setState = function setState(newState) {
      if (this.updateState != 0) throw new Error("Calls to EditorView.setState are not allowed while an update is in progress");
      if (this.destroyed) {
        this.viewState.state = newState;
        return;
      }
      this.updateState = 2;
      var hadFocus = this.hasFocus;
      try {
        for (var _iterator114 = _createForOfIteratorHelperLoose(this.plugins), _step114; !(_step114 = _iterator114()).done;) {
          var plugin = _step114.value;
          plugin.destroy(this);
        }
        this.viewState = new ViewState(this, newState);
        this.plugins = newState.facet(viewPlugin).map(function (spec) {
          return new PluginInstance(spec);
        });
        this.pluginMap.clear();
        for (var _iterator115 = _createForOfIteratorHelperLoose(this.plugins), _step115; !(_step115 = _iterator115()).done;) {
          var _plugin2 = _step115.value;
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
    _proto109.updatePlugins = function updatePlugins(update) {
      var prevSpecs = update.startState.facet(viewPlugin),
        specs = update.state.facet(viewPlugin);
      if (prevSpecs != specs) {
        var newPlugins = [];
        for (var _iterator116 = _createForOfIteratorHelperLoose(specs), _step116; !(_step116 = _iterator116()).done;) {
          var spec = _step116.value;
          var found = prevSpecs.indexOf(spec);
          if (found < 0) {
            newPlugins.push(new PluginInstance(spec));
          } else {
            var plugin = this.plugins[found];
            plugin.mustUpdate = update;
            newPlugins.push(plugin);
          }
        }
        for (var _iterator117 = _createForOfIteratorHelperLoose(this.plugins), _step117; !(_step117 = _iterator117()).done;) {
          var _plugin3 = _step117.value;
          if (_plugin3.mustUpdate != update) _plugin3.destroy(this);
        }
        this.plugins = newPlugins;
        this.pluginMap.clear();
      } else {
        for (var _iterator118 = _createForOfIteratorHelperLoose(this.plugins), _step118; !(_step118 = _iterator118()).done;) {
          var _p = _step118.value;
          _p.mustUpdate = update;
        }
      }
      for (var _i48 = 0; _i48 < this.plugins.length; _i48++) this.plugins[_i48].update(this);
      if (prevSpecs != specs) this.inputState.ensureHandlers(this.plugins);
    };
    _proto109.docViewUpdate = function docViewUpdate() {
      for (var _iterator119 = _createForOfIteratorHelperLoose(this.plugins), _step119; !(_step119 = _iterator119()).done;) {
        var plugin = _step119.value;
        var _val4 = plugin.value;
        if (_val4 && _val4.docViewUpdate) {
          try {
            _val4.docViewUpdate(this);
          } catch (_e8) {
            logException(this.state, _e8, "doc view update listener");
          }
        }
      }
    };
    _proto109.measure = function measure(flush) {
      var _this60 = this;
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
        for (var _i49 = 0;; _i49++) {
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
          if (_i49 > 5) {
            console.warn(this.measureRequests.length ? "Measure loop restarted more than 5 times" : "Viewport failed to stabilize");
            break;
          }
          var measuring = [];
          if (!(changed & 4)) {
            var _ref11 = [measuring, this.measureRequests];
            this.measureRequests = _ref11[0];
            measuring = _ref11[1];
          }
          var measured = measuring.map(function (m) {
            try {
              return m.read(_this60);
            } catch (_e9) {
              logException(_this60.state, _e9);
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
        for (var _iterator120 = _createForOfIteratorHelperLoose(this.state.facet(updateListener)), _step120; !(_step120 = _iterator120()).done;) {
          var listener = _step120.value;
          listener(updated);
        }
      }
    };
    _proto109.updateAttrs = function updateAttrs() {
      var _this61 = this;
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
        var changedContent = _updateAttrs(_this61.contentDOM, _this61.contentAttrs, contentAttrs);
        var changedEditor = _updateAttrs(_this61.dom, _this61.editorAttrs, editorAttrs);
        return changedContent || changedEditor;
      });
      this.editorAttrs = editorAttrs;
      this.contentAttrs = contentAttrs;
      return changed;
    };
    _proto109.showAnnouncements = function showAnnouncements(trs) {
      var first = true;
      for (var _iterator121 = _createForOfIteratorHelperLoose(trs), _step121; !(_step121 = _iterator121()).done;) {
        var tr = _step121.value;
        for (var _iterator122 = _createForOfIteratorHelperLoose(tr.effects), _step122; !(_step122 = _iterator122()).done;) {
          var effect = _step122.value;
          if (effect.is(_EditorView.announce)) {
            if (first) this.announceDOM.textContent = "";
            first = false;
            var div = this.announceDOM.appendChild(document.createElement("div"));
            div.textContent = effect.value;
          }
        }
      }
    };
    _proto109.mountStyles = function mountStyles() {
      this.styleModules = this.state.facet(styleModule);
      var nonce = this.state.facet(_EditorView.cspNonce);
      StyleModule.mount(this.root, this.styleModules.concat(baseTheme$1).reverse(), nonce ? {
        nonce: nonce
      } : void 0);
    };
    _proto109.readMeasured = function readMeasured() {
      if (this.updateState == 2) throw new Error("Reading the editor layout isn't allowed during an update");
      if (this.updateState == 0 && this.measureScheduled > -1) this.measure(false);
    };
    _proto109.requestMeasure = function requestMeasure(request) {
      var _this62 = this;
      if (this.measureScheduled < 0) this.measureScheduled = this.win.requestAnimationFrame(function () {
        return _this62.measure();
      });
      if (request) {
        if (this.measureRequests.indexOf(request) > -1) return;
        if (request.key != null) for (var _i50 = 0; _i50 < this.measureRequests.length; _i50++) {
          if (this.measureRequests[_i50].key === request.key) {
            this.measureRequests[_i50] = request;
            return;
          }
        }
        this.measureRequests.push(request);
      }
    };
    _proto109.plugin = function plugin(_plugin) {
      var known = this.pluginMap.get(_plugin);
      if (known === void 0 || known && known.plugin != _plugin) this.pluginMap.set(_plugin, known = this.plugins.find(function (p) {
        return p.plugin == _plugin;
      }) || null);
      return known && known.update(this).value;
    };
    _proto109.elementAtHeight = function elementAtHeight(height) {
      this.readMeasured();
      return this.viewState.elementAtHeight(height);
    };
    _proto109.lineBlockAtHeight = function lineBlockAtHeight(height) {
      this.readMeasured();
      return this.viewState.lineBlockAtHeight(height);
    };
    _proto109.lineBlockAt = function lineBlockAt(pos) {
      return this.viewState.lineBlockAt(pos);
    };
    _proto109.moveByChar = function moveByChar(start, forward, by) {
      return skipAtoms(this, start, _moveByChar(this, start, forward, by));
    };
    _proto109.moveByGroup = function moveByGroup(start, forward) {
      var _this63 = this;
      return skipAtoms(this, start, _moveByChar(this, start, forward, function (initial) {
        return byGroup(_this63, start.head, initial);
      }));
    };
    _proto109.visualLineSide = function visualLineSide(line, end) {
      var order = this.bidiSpans(line),
        dir = this.textDirectionAt(line.from);
      var span = order[end ? order.length - 1 : 0];
      return EditorSelection.cursor(span.side(end, dir) + line.from, span.forward(!end, dir) ? 1 : -1);
    };
    _proto109.moveToLineBoundary = function moveToLineBoundary(start, forward, includeWrap) {
      if (includeWrap === void 0) {
        includeWrap = true;
      }
      return _moveToLineBoundary(this, start, forward, includeWrap);
    };
    _proto109.moveVertically = function moveVertically(start, forward, distance) {
      return skipAtoms(this, start, _moveVertically(this, start, forward, distance));
    };
    _proto109.domAtPos = function domAtPos(pos, side) {
      if (side === void 0) {
        side = 1;
      }
      return this.docView.domAtPos(pos, side);
    };
    _proto109.posAtDOM = function posAtDOM(node, offset) {
      if (offset === void 0) {
        offset = 0;
      }
      return this.docView.posFromDOM(node, offset);
    };
    _proto109.posAtCoords = function posAtCoords(coords, precise) {
      if (precise === void 0) {
        precise = true;
      }
      this.readMeasured();
      var found = _posAtCoords(this, coords, precise);
      return found && found.pos;
    };
    _proto109.posAndSideAtCoords = function posAndSideAtCoords(coords, precise) {
      if (precise === void 0) {
        precise = true;
      }
      this.readMeasured();
      return _posAtCoords(this, coords, precise);
    };
    _proto109.coordsAtPos = function coordsAtPos(pos, side) {
      if (side === void 0) {
        side = 1;
      }
      this.readMeasured();
      var line = this.state.doc.lineAt(pos),
        order = this.bidiSpans(line);
      var span = order[BidiSpan.find(order, pos - line.from, -1, side)];
      return this.docView.coordsAt(pos, side, span.dir == Direction.RTL);
    };
    _proto109.coordsForChar = function coordsForChar(pos) {
      this.readMeasured();
      return this.docView.coordsForChar(pos);
    };
    _proto109.textDirectionAt = function textDirectionAt(pos) {
      var perLine = this.state.facet(perLineTextDirection);
      if (!perLine || pos < this.viewport.from || pos > this.viewport.to) return this.textDirection;
      this.readMeasured();
      return this.docView.textDirectionAt(pos);
    };
    _proto109.bidiSpans = function bidiSpans(line) {
      if (line.length > MaxBidiLine) return trivialOrder(line.length);
      var dir = this.textDirectionAt(line.from),
        isolates;
      for (var _iterator123 = _createForOfIteratorHelperLoose(this.bidiCache), _step123; !(_step123 = _iterator123()).done;) {
        var entry = _step123.value;
        if (entry.from == line.from && entry.dir == dir && (entry.fresh || isolatesEq(entry.isolates, isolates = getIsolatedRanges(this, line)))) return entry.order;
      }
      if (!isolates) isolates = getIsolatedRanges(this, line);
      var order = computeOrder(line.text, dir, isolates);
      this.bidiCache.push(new CachedOrder(line.from, line.to, dir, isolates, true, order));
      return order;
    };
    _proto109.focus = function focus() {
      var _this64 = this;
      this.observer.ignore(function () {
        focusPreventScroll(_this64.contentDOM);
        _this64.docView.updateSelection();
      });
    };
    _proto109.setRoot = function setRoot(root) {
      if (this._root != root) {
        this._root = root;
        this.observer.setWindow((root.nodeType == 9 ? root : root.ownerDocument).defaultView || window);
        this.mountStyles();
      }
    };
    _proto109.destroy = function destroy() {
      if (this.root.activeElement == this.contentDOM) this.contentDOM.blur();
      for (var _iterator124 = _createForOfIteratorHelperLoose(this.plugins), _step124; !(_step124 = _iterator124()).done;) {
        var plugin = _step124.value;
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
    _proto109.scrollSnapshot = function scrollSnapshot() {
      var _this$scrollDOM = this.scrollDOM,
        scrollTop = _this$scrollDOM.scrollTop,
        scrollLeft = _this$scrollDOM.scrollLeft;
      var ref = this.viewState.scrollAnchorAt(scrollTop);
      return _scrollIntoView.of(new ScrollTarget(EditorSelection.cursor(ref.from), "start", "start", ref.top - scrollTop, scrollLeft, true));
    };
    _proto109.setTabFocusMode = function setTabFocusMode(to) {
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
      for (var _iterator125 = _createForOfIteratorHelperLoose(inputs), _step125; !(_step125 = _iterator125()).done;) {
        var _i51 = _step125.value;
        if (typeof _i51 == "number") x = y = _i51;else {
          x = _i51.x;
          y = _i51.y;
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
    combine: function combine(values2) {
      return values2.length ? values2[0] : "";
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
    _CachedOrder.update = function update(cache2, changes) {
      if (changes.empty && !cache2.some(function (c) {
        return c.fresh;
      })) return cache2;
      var result = [],
        lastDir = cache2.length ? cache2[cache2.length - 1].dir : Direction.LTR;
      for (var _i52 = Math.max(0, cache2.length - 10); _i52 < cache2.length; _i52++) {
        var entry = cache2[_i52];
        if (entry.dir == lastDir && !changes.touchesRange(entry.from, entry.to)) result.push(new _CachedOrder(changes.mapPos(entry.from, 1), changes.mapPos(entry.to, -1), entry.dir, entry.isolates, false, entry.order));
      }
      return result;
    };
    return _CachedOrder;
  }();
  function attrsFromFacet(view, facet, base2) {
    for (var sources = view.state.facet(facet), _i53 = sources.length - 1; _i53 >= 0; _i53--) {
      var source = sources[_i53],
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
    for (var _i54 = 0; _i54 < parts.length - 1; ++_i54) {
      var mod = parts[_i54];
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
    var add = function add(scope, key, command2, preventDefault, stopPropagation) {
      var _a2, _b;
      var scopeObj = bound[scope] || (bound[scope] = Object.create(null));
      var parts = key.split(/ (?!$)/).map(function (k) {
        return normalizeKeyName(k, platform);
      });
      var _loop12 = function _loop12() {
        var prefix = parts.slice(0, _i55).join(" ");
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
      for (var _i55 = 1; _i55 < parts.length; _i55++) {
        _loop12();
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
    for (var _iterator126 = _createForOfIteratorHelperLoose(bindings), _step126; !(_step126 = _iterator126()).done;) {
      var b = _step126.value;
      var scopes = b.scope ? b.scope.split(" ") : ["editor"];
      if (b.any) {
        var _loop13 = function _loop13() {
          var scope = _step127.value;
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
        for (var _iterator127 = _createForOfIteratorHelperLoose(scopes), _step127; !(_step127 = _iterator127()).done;) {
          _loop13();
        }
      }
      var _name6 = b[platform] || b.key;
      if (!_name6) continue;
      for (var _iterator128 = _createForOfIteratorHelperLoose(scopes), _step128; !(_step128 = _iterator128()).done;) {
        var scope = _step128.value;
        add(scope, _name6, b.run, b.preventDefault, b.stopPropagation);
        if (b.shift) add(scope, "Shift-" + _name6, b.shift, b.preventDefault, b.stopPropagation);
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
        for (var _iterator129 = _createForOfIteratorHelperLoose(binding.run), _step129; !(_step129 = _iterator129()).done;) {
          var cmd2 = _step129.value;
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
    var _proto110 = GutterMarker.prototype;
    _proto110.compare = function compare(other) {
      return this == other || this.constructor == other.constructor && this.eq(other);
    };
    _proto110.eq = function eq(other) {
      return false;
    };
    _proto110.destroy = function destroy(dom) {};
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
    combine: function combine(values2) {
      return values2.some(function (x) {
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
      for (var _iterator130 = _createForOfIteratorHelperLoose(this.gutters), _step130; !(_step130 = _iterator130()).done;) {
        var gutter2 = _step130.value;
        if (gutter2.config.side == "after") this.getDOMAfter().appendChild(gutter2.dom);else this.dom.appendChild(gutter2.dom);
      }
      if (this.fixed) {
        this.dom.style.position = "sticky";
      }
      this.syncGutters(false);
      view.scrollDOM.insertBefore(this.dom, view.contentDOM);
    }
    var _proto111 = _class2.prototype;
    _proto111.getDOMAfter = function getDOMAfter() {
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
    _proto111.update = function update(_update9) {
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
    _proto111.syncGutters = function syncGutters(detach) {
      var _this65 = this;
      var after = this.dom.nextSibling;
      if (detach) {
        this.dom.remove();
        if (this.domAfter) this.domAfter.remove();
      }
      var lineClasses = RangeSet.iter(this.view.state.facet(gutterLineClass), this.view.viewport.from);
      var classSet = [];
      var contexts = this.gutters.map(function (gutter2) {
        return new UpdateContext(gutter2, _this65.view.viewport, -_this65.view.documentPadding.top);
      });
      for (var _iterator131 = _createForOfIteratorHelperLoose(this.view.viewportLineBlocks), _step131; !(_step131 = _iterator131()).done;) {
        var line = _step131.value;
        if (classSet.length) classSet = [];
        if (Array.isArray(line.type)) {
          var first = true;
          for (var _iterator133 = _createForOfIteratorHelperLoose(line.type), _step133; !(_step133 = _iterator133()).done;) {
            var b = _step133.value;
            if (b.type == BlockType.Text && first) {
              advanceCursor(lineClasses, classSet, b.from);
              for (var _iterator134 = _createForOfIteratorHelperLoose(contexts), _step134; !(_step134 = _iterator134()).done;) {
                var cx = _step134.value;
                cx.line(this.view, b, classSet);
              }
              first = false;
            } else if (b.widget) {
              for (var _iterator135 = _createForOfIteratorHelperLoose(contexts), _step135; !(_step135 = _iterator135()).done;) {
                var _cx = _step135.value;
                _cx.widget(this.view, b);
              }
            }
          }
        } else if (line.type == BlockType.Text) {
          advanceCursor(lineClasses, classSet, line.from);
          for (var _iterator136 = _createForOfIteratorHelperLoose(contexts), _step136; !(_step136 = _iterator136()).done;) {
            var _cx2 = _step136.value;
            _cx2.line(this.view, line, classSet);
          }
        } else if (line.widget) {
          for (var _iterator137 = _createForOfIteratorHelperLoose(contexts), _step137; !(_step137 = _iterator137()).done;) {
            var _cx3 = _step137.value;
            _cx3.widget(this.view, line);
          }
        }
      }
      for (var _iterator132 = _createForOfIteratorHelperLoose(contexts), _step132; !(_step132 = _iterator132()).done;) {
        var _cx4 = _step132.value;
        _cx4.finish();
      }
      if (detach) {
        this.view.scrollDOM.insertBefore(this.dom, after);
        if (this.domAfter) this.view.scrollDOM.appendChild(this.domAfter);
      }
    };
    _proto111.updateGutters = function updateGutters(update) {
      var prev = update.startState.facet(activeGutters),
        cur = update.state.facet(activeGutters);
      var change = update.docChanged || update.heightChanged || update.viewportChanged || !RangeSet.eq(update.startState.facet(gutterLineClass), update.state.facet(gutterLineClass), update.view.viewport.from, update.view.viewport.to);
      if (prev == cur) {
        for (var _iterator138 = _createForOfIteratorHelperLoose(this.gutters), _step138; !(_step138 = _iterator138()).done;) {
          var gutter2 = _step138.value;
          if (gutter2.update(update)) change = true;
        }
      } else {
        change = true;
        var gutters2 = [];
        for (var _iterator139 = _createForOfIteratorHelperLoose(cur), _step139; !(_step139 = _iterator139()).done;) {
          var conf = _step139.value;
          var known = prev.indexOf(conf);
          if (known < 0) {
            gutters2.push(new SingleGutterView(this.view, conf));
          } else {
            this.gutters[known].update(update);
            gutters2.push(this.gutters[known]);
          }
        }
        for (var _iterator140 = _createForOfIteratorHelperLoose(this.gutters), _step140; !(_step140 = _iterator140()).done;) {
          var _g = _step140.value;
          _g.dom.remove();
          if (gutters2.indexOf(_g) < 0) _g.destroy();
        }
        for (var _i56 = 0, _gutters = gutters2; _i56 < _gutters.length; _i56++) {
          var g = _gutters[_i56];
          if (g.config.side == "after") this.getDOMAfter().appendChild(g.dom);else this.dom.appendChild(g.dom);
        }
        this.gutters = gutters2;
      }
      return change;
    };
    _proto111.destroy = function destroy() {
      for (var _iterator141 = _createForOfIteratorHelperLoose(this.gutters), _step141; !(_step141 = _iterator141()).done;) {
        var view = _step141.value;
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
  function advanceCursor(cursor2, collect, pos) {
    while (cursor2.value && cursor2.from <= pos) {
      if (cursor2.from == pos) collect.push(cursor2.value);
      cursor2.next();
    }
  }
  var UpdateContext = function () {
    function UpdateContext(gutter2, viewport, height) {
      this.gutter = gutter2;
      this.height = height;
      this.i = 0;
      this.cursor = RangeSet.iter(gutter2.markers, viewport.from);
    }
    var _proto112 = UpdateContext.prototype;
    _proto112.addElement = function addElement(view, block, markers) {
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
    _proto112.line = function line(view, _line2, extraMarkers) {
      var localMarkers = [];
      advanceCursor(this.cursor, localMarkers, _line2.from);
      if (extraMarkers.length) localMarkers = localMarkers.concat(extraMarkers);
      var forLine = this.gutter.config.lineMarker(view, _line2, localMarkers);
      if (forLine) localMarkers.unshift(forLine);
      var gutter2 = this.gutter;
      if (localMarkers.length == 0 && !gutter2.config.renderEmptyElements) return;
      this.addElement(view, _line2, localMarkers);
    };
    _proto112.widget = function widget(view, block) {
      var marker = this.gutter.config.widgetMarker(view, block.widget, block),
        markers = marker ? [marker] : null;
      for (var _iterator142 = _createForOfIteratorHelperLoose(view.state.facet(gutterWidgetClass)), _step142; !(_step142 = _iterator142()).done;) {
        var cls = _step142.value;
        var marker2 = cls(view, block.widget, block);
        if (marker2) (markers || (markers = [])).push(marker2);
      }
      if (markers) this.addElement(view, block, markers);
    };
    _proto112.finish = function finish() {
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
      var _this66 = this;
      this.view = view;
      this.config = config;
      this.elements = [];
      this.spacer = null;
      this.dom = document.createElement("div");
      this.dom.className = "cm-gutter" + (this.config.class ? " " + this.config.class : "");
      var _loop14 = function _loop14(prop) {
        _this66.dom.addEventListener(prop, function (event) {
          var target = event.target,
            y;
          if (target != _this66.dom && _this66.dom.contains(target)) {
            while (target.parentNode != _this66.dom) target = target.parentNode;
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
        _loop14(prop);
      }
      this.markers = asArray2(config.markers(view));
      if (config.initialSpacer) {
        this.spacer = new GutterElement(view, 0, 0, [config.initialSpacer(view)]);
        this.dom.appendChild(this.spacer.dom);
        this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
      }
    }
    var _proto113 = SingleGutterView.prototype;
    _proto113.update = function update(_update0) {
      var prevMarkers = this.markers;
      this.markers = asArray2(this.config.markers(_update0.view));
      if (this.spacer && this.config.updateSpacer) {
        var updated = this.config.updateSpacer(this.spacer.markers[0], _update0);
        if (updated != this.spacer.markers[0]) this.spacer.update(_update0.view, 0, 0, [updated]);
      }
      var vp = _update0.view.viewport;
      return !RangeSet.eq(this.markers, prevMarkers, vp.from, vp.to) || (this.config.lineMarkerChange ? this.config.lineMarkerChange(_update0) : false);
    };
    _proto113.destroy = function destroy() {
      for (var _iterator143 = _createForOfIteratorHelperLoose(this.elements), _step143; !(_step143 = _iterator143()).done;) {
        var elt = _step143.value;
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
    var _proto114 = GutterElement.prototype;
    _proto114.update = function update(view, height, above, markers) {
      if (this.height != height) {
        this.height = height;
        this.dom.style.height = height + "px";
      }
      if (this.above != above) this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
      if (!sameMarkers(this.markers, markers)) this.setMarkers(view, markers);
    };
    _proto114.setMarkers = function setMarkers(view, markers) {
      var cls = "cm-gutterElement",
        domPos = this.dom.firstChild;
      for (var iNew = 0, iOld = 0;;) {
        var skipTo = iOld,
          marker = iNew < markers.length ? markers[iNew++] : null,
          matched = false;
        if (marker) {
          var c = marker.elementClass;
          if (c) cls += " " + c;
          for (var _i57 = iOld; _i57 < this.markers.length; _i57++) if (this.markers[_i57].compare(marker)) {
            skipTo = _i57;
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
    _proto114.destroy = function destroy() {
      this.setMarkers(null, []);
    };
    return GutterElement;
  }();
  function sameMarkers(a, b) {
    if (a.length != b.length) return false;
    for (var _i58 = 0; _i58 < a.length; _i58++) if (!a[_i58].compare(b[_i58])) return false;
    return true;
  }
  var lineNumberMarkers = Facet.define();
  var lineNumberWidgetMarker = Facet.define();
  var lineNumberConfig = Facet.define({
    combine: function combine(values2) {
      return combineConfig(values2, {
        formatNumber: String,
        domEventHandlers: {}
      }, {
        domEventHandlers: function domEventHandlers(a, b) {
          var result = Object.assign({}, a);
          var _loop15 = function _loop15() {
            var exists = result[event],
              add = b[event];
            result[event] = exists ? function (view, line, event2) {
              return exists(view, line, event2) || add(view, line, event2);
            } : add;
          };
          for (var event in b) {
            _loop15();
          }
          return result;
        }
      });
    }
  });
  var NumberMarker = function (_GutterMarker) {
    function NumberMarker(number2) {
      var _this67;
      _this67 = _GutterMarker.call(this) || this;
      _this67.number = number2;
      return _this67;
    }
    _inheritsLoose(NumberMarker, _GutterMarker);
    var _proto115 = NumberMarker.prototype;
    _proto115.eq = function eq(other) {
      return this.number == other.number;
    };
    _proto115.toDOM = function toDOM() {
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
        for (var _iterator144 = _createForOfIteratorHelperLoose(view.state.facet(lineNumberWidgetMarker)), _step144; !(_step144 = _iterator144()).done;) {
          var m = _step144.value;
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
  var _a;
  var languageDataProp = new NodeProp();
  function defineLanguageFacet(baseData) {
    return Facet.define({
      combine: baseData ? function (values2) {
        return values2.concat(baseData);
      } : void 0
    });
  }
  var sublanguageProp = new NodeProp();
  var Language = function () {
    function Language(data, parser4, extraExtensions, name2) {
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
      this.parser = parser4;
      this.extension = [language.of(this), EditorState.languageData.of(function (state, pos, side) {
        var top2 = topNodeAt(state, pos, side),
          data2 = top2.type.prop(languageDataProp);
        if (!data2) return [];
        var base2 = state.facet(data2),
          sub = top2.type.prop(sublanguageProp);
        if (sub) {
          var innerNode = top2.resolve(pos - top2.from, side);
          for (var _iterator145 = _createForOfIteratorHelperLoose(sub), _step145; !(_step145 = _iterator145()).done;) {
            var sublang = _step145.value;
            if (sublang.test(innerNode, state)) {
              var data3 = state.facet(sublang.facet);
              return sublang.type == "replace" ? data3 : data3.concat(base2);
            }
          }
        }
        return base2;
      })].concat(extraExtensions);
    }
    var _proto116 = Language.prototype;
    _proto116.isActiveAt = function isActiveAt(state, pos, side) {
      if (side === void 0) {
        side = -1;
      }
      return topNodeAt(state, pos, side).type.prop(languageDataProp) == this.data;
    };
    _proto116.findRegions = function findRegions(state) {
      var _this68 = this;
      var lang = state.facet(language);
      if ((lang === null || lang === void 0 ? void 0 : lang.data) == this.data) return [{
        from: 0,
        to: state.doc.length
      }];
      if (!lang || !lang.allowsNesting) return [];
      var result = [];
      var _explore2 = function explore(tree, from) {
        if (tree.prop(languageDataProp) == _this68.data) {
          result.push({
            from: from,
            to: from + tree.length
          });
          return;
        }
        var mount = tree.prop(NodeProp.mounted);
        if (mount) {
          if (mount.tree.prop(languageDataProp) == _this68.data) {
            if (mount.overlay) {
              for (var _iterator146 = _createForOfIteratorHelperLoose(mount.overlay), _step146; !(_step146 = _iterator146()).done;) {
                var _r2 = _step146.value;
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
            _explore2(mount.tree, mount.overlay[0].from + from);
            if (result.length > size) return;
          }
        }
        for (var _i59 = 0; _i59 < tree.children.length; _i59++) {
          var ch = tree.children[_i59];
          if (ch instanceof Tree) _explore2(ch, tree.positions[_i59] + from);
        }
      };
      _explore2(syntaxTree(state), 0);
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
  var LRLanguage = function (_Language) {
    function _LRLanguage(data, parser4, name2) {
      var _this69;
      _this69 = _Language.call(this, data, parser4, [], name2) || this;
      _this69.parser = parser4;
      return _this69;
    }
    _inheritsLoose(_LRLanguage, _Language);
    _LRLanguage.define = function define(spec) {
      var data = defineLanguageFacet(spec.languageData);
      return new _LRLanguage(data, spec.parser.configure({
        props: [languageDataProp.add(function (type) {
          return type.isTop ? data : void 0;
        })]
      }), spec.name);
    };
    var _proto117 = _LRLanguage.prototype;
    _proto117.configure = function configure(options, name2) {
      return new _LRLanguage(this.data, this.parser.configure(options), name2 || this.name);
    };
    return _createClass(_LRLanguage, [{
      key: "allowsNesting",
      get: function get() {
        return this.parser.hasWrappers();
      }
    }]);
  }(Language);
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
    var _proto118 = DocInput.prototype;
    _proto118.syncTo = function syncTo(pos) {
      this.string = this.cursor.next(pos - this.cursorPos).value;
      this.cursorPos = pos + this.string.length;
      return this.cursorPos - this.string.length;
    };
    _proto118.chunk = function chunk(pos) {
      this.syncTo(pos);
      return this.string;
    };
    _proto118.read = function read(from, to) {
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
    function _ParseContext(parser4, state, fragments, tree, treeLen, viewport, skipped, scheduleOn) {
      if (fragments === void 0) {
        fragments = [];
      }
      this.parser = parser4;
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
    _ParseContext.create = function create(parser4, state, viewport) {
      return new _ParseContext(parser4, state, [], Tree.empty, 0, viewport, [], null);
    };
    var _proto119 = _ParseContext.prototype;
    _proto119.startParse = function startParse() {
      return this.parser.startParse(new DocInput(this.state.doc), this.fragments);
    };
    _proto119.work = function work(until, upto) {
      var _this70 = this;
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
        if (!_this70.parse) _this70.parse = _this70.startParse();
        if (upto != null && (_this70.parse.stoppedAt == null || _this70.parse.stoppedAt > upto) && upto < _this70.state.doc.length) _this70.parse.stopAt(upto);
        for (;;) {
          var done = _this70.parse.advance();
          if (done) {
            _this70.fragments = _this70.withoutTempSkipped(TreeFragment.addTree(done, _this70.fragments, _this70.parse.stoppedAt != null));
            _this70.treeLen = (_a2 = _this70.parse.stoppedAt) !== null && _a2 !== void 0 ? _a2 : _this70.state.doc.length;
            _this70.tree = done;
            _this70.parse = null;
            if (_this70.treeLen < (upto !== null && upto !== void 0 ? upto : _this70.state.doc.length)) _this70.parse = _this70.startParse();else return true;
          }
          if (until()) return false;
        }
      });
    };
    _proto119.takeTree = function takeTree() {
      var _this71 = this;
      var pos, tree;
      if (this.parse && (pos = this.parse.parsedPos) >= this.treeLen) {
        if (this.parse.stoppedAt == null || this.parse.stoppedAt > pos) this.parse.stopAt(pos);
        this.withContext(function () {
          while (!(tree = _this71.parse.advance())) {}
        });
        this.treeLen = pos;
        this.tree = tree;
        this.fragments = this.withoutTempSkipped(TreeFragment.addTree(this.tree, this.fragments, true));
        this.parse = null;
      }
    };
    _proto119.withContext = function withContext(f) {
      var prev = currentContext;
      currentContext = this;
      try {
        return f();
      } finally {
        currentContext = prev;
      }
    };
    _proto119.withoutTempSkipped = function withoutTempSkipped(fragments) {
      for (var _r3; _r3 = this.tempSkipped.pop();) fragments = cutFragments(fragments, _r3.from, _r3.to);
      return fragments;
    };
    _proto119.changes = function changes(_changes, newState) {
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
          for (var _iterator147 = _createForOfIteratorHelperLoose(this.skipped), _step147; !(_step147 = _iterator147()).done;) {
            var _r4 = _step147.value;
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
    _proto119.updateViewport = function updateViewport(viewport) {
      if (this.viewport.from == viewport.from && this.viewport.to == viewport.to) return false;
      this.viewport = viewport;
      var startLen = this.skipped.length;
      for (var _i60 = 0; _i60 < this.skipped.length; _i60++) {
        var _this$skipped$_i = this.skipped[_i60],
          from = _this$skipped$_i.from,
          to = _this$skipped$_i.to;
        if (from < viewport.to && to > viewport.from) {
          this.fragments = cutFragments(this.fragments, from, to);
          this.skipped.splice(_i60--, 1);
        }
      }
      if (this.skipped.length >= startLen) return false;
      this.reset();
      return true;
    };
    _proto119.reset = function reset() {
      if (this.parse) {
        this.takeTree();
        this.parse = null;
      }
    };
    _proto119.skipUntilInView = function skipUntilInView(from, to) {
      this.skipped.push({
        from: from,
        to: to
      });
    };
    _ParseContext.getSkippingParser = function getSkippingParser(until) {
      return new (function (_Parser2) {
        function _class3() {
          return _Parser2.apply(this, arguments) || this;
        }
        _inheritsLoose(_class3, _Parser2);
        var _proto120 = _class3.prototype;
        _proto120.createParse = function createParse(input, fragments, ranges) {
          var from = ranges[0].from,
            to = ranges[ranges.length - 1].to;
          var parser4 = {
            parsedPos: from,
            advance: function advance() {
              var cx = currentContext;
              if (cx) {
                for (var _iterator148 = _createForOfIteratorHelperLoose(ranges), _step148; !(_step148 = _iterator148()).done;) {
                  var _r5 = _step148.value;
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
          return parser4;
        };
        return _class3;
      }(Parser))();
    };
    _proto119.isDone = function isDone(upto) {
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
    var _proto121 = _LanguageState.prototype;
    _proto121.apply = function apply(tr) {
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
      for (var _iterator149 = _createForOfIteratorHelperLoose(tr.effects), _step149; !(_step149 = _iterator149()).done;) {
        var e = _step149.value;
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
    var _proto122 = ParseWorker.prototype;
    _proto122.update = function update(_update1) {
      var cx = this.view.state.field(Language.state).context;
      if (cx.updateViewport(_update1.view.viewport) || this.view.viewport.to > cx.treeLen) this.scheduleWork();
      if (_update1.docChanged || _update1.selectionSet) {
        if (this.view.hasFocus) this.chunkBudget += 50;
        this.scheduleWork();
      }
      this.checkAsyncSchedule(cx);
    };
    _proto122.scheduleWork = function scheduleWork() {
      if (this.working) return;
      var state = this.view.state,
        field = state.field(Language.state);
      if (field.tree != field.context.tree || !field.context.isDone(state.doc.length)) this.working = requestIdle(this.work);
    };
    _proto122.work = function work(deadline) {
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
    _proto122.checkAsyncSchedule = function checkAsyncSchedule(cx) {
      var _this72 = this;
      if (cx.scheduleOn) {
        this.workScheduled++;
        cx.scheduleOn.then(function () {
          return _this72.scheduleWork();
        }).catch(function (err) {
          return logException(_this72.view.state, err);
        }).then(function () {
          return _this72.workScheduled--;
        });
        cx.scheduleOn = null;
      }
    };
    _proto122.destroy = function destroy() {
      if (this.working) this.working();
    };
    _proto122.isWorking = function isWorking() {
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
  var LanguageSupport = function LanguageSupport(language2, support) {
    if (support === void 0) {
      support = [];
    }
    this.language = language2;
    this.support = support;
    this.extension = [language2, support];
  };
  var indentService = Facet.define();
  var indentUnit = Facet.define({
    combine: function combine(values2) {
      if (!values2.length) return "  ";
      var unit = values2[0];
      if (!unit || /\S/.test(unit) || Array.from(unit).some(function (e) {
        return e != unit[0];
      })) throw new Error("Invalid indent unit: " + JSON.stringify(values2[0]));
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
    for (var _i61 = 0; _i61 < cols; _i61++) result += ch;
    return result;
  }
  function getIndentation(context, pos) {
    if (context instanceof EditorState) context = new IndentContext(context);
    for (var _iterator150 = _createForOfIteratorHelperLoose(context.state.facet(indentService)), _step150; !(_step150 = _iterator150()).done;) {
      var service = _step150.value;
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
    var _proto123 = IndentContext.prototype;
    _proto123.lineAt = function lineAt(pos, bias) {
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
    _proto123.textAfterPos = function textAfterPos(pos, bias) {
      if (bias === void 0) {
        bias = 1;
      }
      if (this.options.simulateDoubleBreak && pos == this.options.simulateBreak) return "";
      var _this$lineAt = this.lineAt(pos, bias),
        text = _this$lineAt.text,
        from = _this$lineAt.from;
      return text.slice(pos - from, Math.min(text.length, pos + 100 - from));
    };
    _proto123.column = function column(pos, bias) {
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
    _proto123.countColumn = function countColumn(line, pos) {
      if (pos === void 0) {
        pos = line.length;
      }
      return _countColumn(line, this.state.tabSize, pos);
    };
    _proto123.lineIndent = function lineIndent(pos, bias) {
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
      var add = [];
      for (var cur = inner; cur && !(cur.from < stack.node.from || cur.to > stack.node.to || cur.from == stack.node.from && cur.type == stack.node.type); cur = cur.parent) add.push(cur);
      for (var _i62 = add.length - 1; _i62 >= 0; _i62--) stack = {
        node: add[_i62],
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
      var _this73;
      _this73 = _IndentContext.call(this, base2.state, base2.options) || this;
      _this73.base = base2;
      _this73.pos = pos;
      _this73.context = context;
      return _this73;
    }
    _inheritsLoose(_TreeIndentContext, _IndentContext);
    _TreeIndentContext.create = function create(base2, pos, context) {
      return new _TreeIndentContext(base2, pos, context);
    };
    var _proto124 = _TreeIndentContext.prototype;
    _proto124.baseIndentFor = function baseIndentFor(node) {
      var line = this.state.doc.lineAt(node.from);
      for (;;) {
        var atBreak = node.resolve(line.from);
        while (atBreak.parent && atBreak.parent.from == atBreak.from) atBreak = atBreak.parent;
        if (isParent(atBreak, node)) break;
        line = this.state.doc.lineAt(atBreak.from);
      }
      return this.lineIndent(line.from);
    };
    _proto124.continue = function _continue() {
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
    var lineEnd = sim == null || sim <= openLine.from ? openLine.to : Math.min(openLine.to, sim);
    for (var pos = openToken.to;;) {
      var next = tree.childAfter(pos);
      if (!next || next == last) return null;
      if (!next.type.isSkipped) {
        if (next.from >= lineEnd) return null;
        var space3 = /^ */.exec(openLine.text.slice(openToken.to - openLine.from))[0].length;
        return {
          from: openToken.from,
          to: openToken.to + space3
        };
      }
      pos = next.to;
    }
  }
  function delimitedIndent(_ref12) {
    var closing = _ref12.closing,
      _ref12$align = _ref12.align,
      align = _ref12$align === void 0 ? true : _ref12$align,
      _ref12$units = _ref12.units,
      units = _ref12$units === void 0 ? 1 : _ref12$units;
    return function (context) {
      return delimitedStrategy(context, align, units, closing);
    };
  }
  function delimitedStrategy(context, align, units, closing, closedAt) {
    var after = context.textAfter,
      space3 = after.match(/^\s*/)[0].length;
    var closed = closing && after.slice(space3, space3 + closing.length) == closing || closedAt == context.pos + space3;
    var aligned = align ? bracketedAligned(context) : null;
    if (aligned) return closed ? context.column(aligned.from) : context.column(aligned.to);
    return context.baseIndent + (closed ? 0 : context.unit * units);
  }
  var flatIndent = function flatIndent(context) {
    return context.baseIndent;
  };
  function continuedIndent(_temp) {
    var _ref13 = _temp === void 0 ? {} : _temp,
      except = _ref13.except,
      _ref13$units = _ref13.units,
      units = _ref13$units === void 0 ? 1 : _ref13$units;
    return function (context) {
      var matchExcept = except && except.test(context.textAfter);
      return context.baseIndent + (matchExcept ? 0 : units * context.unit);
    };
  }
  var foldNodeProp = new NodeProp();
  function foldInside(node) {
    var first = node.firstChild,
      last = node.lastChild;
    return first && first.to < last.from ? {
      from: first.to,
      to: last.type.isError ? node.to : last.from
    } : null;
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
  var highlighterFacet = Facet.define();
  var fallbackHighlighter = Facet.define({
    combine: function combine(values2) {
      return values2.length ? [values2[0]] : null;
    }
  });
  function getHighlighters(state) {
    var main = state.facet(highlighterFacet);
    return main.length ? main : state.facet(fallbackHighlighter);
  }
  function syntaxHighlighting(highlighter, options) {
    var ext = [treeHighlighter],
      themeType;
    if (highlighter instanceof HighlightStyle) {
      if (highlighter.module) ext.push(EditorView.styleModule.of(highlighter.module));
      themeType = highlighter.themeType;
    }
    if (options === null || options === void 0 ? void 0 : options.fallback) ext.push(fallbackHighlighter.of(highlighter));else if (themeType) ext.push(highlighterFacet.computeN([EditorView.darkTheme], function (state) {
      return state.facet(EditorView.darkTheme) == (themeType == "dark") ? [highlighter] : [];
    }));else ext.push(highlighterFacet.of(highlighter));
    return ext;
  }
  var TreeHighlighter = function () {
    function TreeHighlighter(view) {
      this.markCache = Object.create(null);
      this.tree = syntaxTree(view.state);
      this.decorations = this.buildDeco(view, getHighlighters(view.state));
      this.decoratedTo = view.viewport.to;
    }
    var _proto125 = TreeHighlighter.prototype;
    _proto125.update = function update(_update10) {
      var tree = syntaxTree(_update10.state),
        highlighters = getHighlighters(_update10.state);
      var styleChange = highlighters != getHighlighters(_update10.startState);
      var viewport = _update10.view.viewport,
        decoratedToMapped = _update10.changes.mapPos(this.decoratedTo, 1);
      if (tree.length < viewport.to && !styleChange && tree.type == this.tree.type && decoratedToMapped >= viewport.to) {
        this.decorations = this.decorations.map(_update10.changes);
        this.decoratedTo = decoratedToMapped;
      } else if (tree != this.tree || _update10.viewportChanged || styleChange) {
        this.tree = tree;
        this.decorations = this.buildDeco(_update10.view, highlighters);
        this.decoratedTo = viewport.to;
      }
    };
    _proto125.buildDeco = function buildDeco(view, highlighters) {
      var _this74 = this;
      if (!highlighters || !this.tree.length) return Decoration.none;
      var builder = new RangeSetBuilder();
      for (var _iterator151 = _createForOfIteratorHelperLoose(view.visibleRanges), _step151; !(_step151 = _iterator151()).done;) {
        var _step151$value = _step151.value,
          from = _step151$value.from,
          to = _step151$value.to;
        highlightTree(this.tree, highlighters, function (from2, to2, style) {
          builder.add(from2, to2, _this74.markCache[style] || (_this74.markCache[style] = Decoration.mark({
            class: style
          })));
        }, from, to);
      }
      return builder.finish();
    };
    return TreeHighlighter;
  }();
  var treeHighlighter = Prec.high(ViewPlugin.fromClass(TreeHighlighter, {
    decorations: function decorations(v) {
      return v.decorations;
    }
  }));
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
      cursor2 = parent === null || parent === void 0 ? void 0 : parent.cursor();
    if (cursor2 && (dir < 0 ? cursor2.childBefore(token.from) : cursor2.childAfter(token.to))) do {
      if (dir < 0 ? cursor2.to <= token.from : cursor2.from >= token.to) {
        if (depth == 0 && matching.indexOf(cursor2.type.name) > -1 && cursor2.from < cursor2.to) {
          var endHandle = findHandle(cursor2);
          return {
            start: firstToken,
            end: endHandle ? {
              from: endHandle.from,
              to: endHandle.to
            } : void 0,
            matched: true
          };
        } else if (matchingNodes(cursor2.type, dir, brackets)) {
          depth++;
        } else if (matchingNodes(cursor2.type, -dir, brackets)) {
          if (depth == 0) {
            var _endHandle = findHandle(cursor2);
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
    } while (dir < 0 ? cursor2.prevSibling() : cursor2.nextSibling());
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
  for (var _i63 = 0, _arr2 = [["variable", "variableName"], ["variable-2", "variableName.special"], ["string-2", "string.special"], ["def", "variableName.definition"], ["tag", "tagName"], ["attribute", "attributeName"], ["type", "typeName"], ["builtin", "variableName.standard"], ["qualifier", "modifier"], ["error", "invalid"], ["header", "heading"], ["property", "propertyName"]]; _i63 < _arr2.length; _i63++) {
    var _arr2$_i = _slicedToArray(_arr2[_i63], 2),
      legacyName = _arr2$_i[0],
      _name7 = _arr2$_i[1];
    defaultTable[legacyName] = createTokenType(noTokens, _name7);
  }
  function warnForPart(part, msg) {
    if (warned.indexOf(part) > -1) return;
    warned.push(part);
    console.warn(msg);
  }
  function createTokenType(extra, tagStr) {
    var _styleTags;
    var tags$1 = [];
    for (var _iterator152 = _createForOfIteratorHelperLoose(tagStr.split(" ")), _step152; !(_step152 = _iterator152()).done;) {
      var name3 = _step152.value;
      var found = [];
      for (var _iterator153 = _createForOfIteratorHelperLoose(name3.split(".")), _step153; !(_step153 = _iterator153()).done;) {
        var part = _step153.value;
        var value = extra[part] || tags[part];
        if (!value) {
          warnForPart(part, "Unknown highlighting tag " + part);
        } else if (typeof value == "function") {
          if (!found.length) warnForPart(part, "Modifier " + part + " used at start of tag");else found = found.map(value);
        } else {
          if (found.length) warnForPart(part, "Tag " + part + " used as modifier");else found = Array.isArray(value) ? value : [value];
        }
      }
      for (var _iterator154 = _createForOfIteratorHelperLoose(found), _step154; !(_step154 = _iterator154()).done;) {
        var tag = _step154.value;
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
  var _properties = null;
  function properties() {
    if (!_properties && typeof document == "object" && document.body) {
      var style = document.body.style,
        names = [],
        seen = new Set();
      for (var prop in style) if (prop != "cssText" && prop != "cssFloat") {
        if (typeof style[prop] == "string") {
          if (/[A-Z]/.test(prop)) prop = prop.replace(new RegExp("[A-Z]", "g"), function (ch) {
            return "-" + ch.toLowerCase();
          });
          if (!seen.has(prop)) {
            names.push(prop);
            seen.add(prop);
          }
        }
      }
      _properties = names.sort().map(function (name2) {
        return {
          type: "property",
          label: name2,
          apply: name2 + ": "
        };
      });
    }
    return _properties || [];
  }
  var pseudoClasses = ["active", "after", "any-link", "autofill", "backdrop", "before", "checked", "cue", "default", "defined", "disabled", "empty", "enabled", "file-selector-button", "first", "first-child", "first-letter", "first-line", "first-of-type", "focus", "focus-visible", "focus-within", "fullscreen", "has", "host", "host-context", "hover", "in-range", "indeterminate", "invalid", "is", "lang", "last-child", "last-of-type", "left", "link", "marker", "modal", "not", "nth-child", "nth-last-child", "nth-last-of-type", "nth-of-type", "only-child", "only-of-type", "optional", "out-of-range", "part", "placeholder", "placeholder-shown", "read-only", "read-write", "required", "right", "root", "scope", "selection", "slotted", "target", "target-text", "valid", "visited", "where"].map(function (name2) {
    return {
      type: "class",
      label: name2
    };
  });
  var values = ["above", "absolute", "activeborder", "additive", "activecaption", "after-white-space", "ahead", "alias", "all", "all-scroll", "alphabetic", "alternate", "always", "antialiased", "appworkspace", "asterisks", "attr", "auto", "auto-flow", "avoid", "avoid-column", "avoid-page", "avoid-region", "axis-pan", "background", "backwards", "baseline", "below", "bidi-override", "blink", "block", "block-axis", "bold", "bolder", "border", "border-box", "both", "bottom", "break", "break-all", "break-word", "bullets", "button", "button-bevel", "buttonface", "buttonhighlight", "buttonshadow", "buttontext", "calc", "capitalize", "caps-lock-indicator", "caption", "captiontext", "caret", "cell", "center", "checkbox", "circle", "cjk-decimal", "clear", "clip", "close-quote", "col-resize", "collapse", "color", "color-burn", "color-dodge", "column", "column-reverse", "compact", "condensed", "contain", "content", "contents", "content-box", "context-menu", "continuous", "copy", "counter", "counters", "cover", "crop", "cross", "crosshair", "currentcolor", "cursive", "cyclic", "darken", "dashed", "decimal", "decimal-leading-zero", "default", "default-button", "dense", "destination-atop", "destination-in", "destination-out", "destination-over", "difference", "disc", "discard", "disclosure-closed", "disclosure-open", "document", "dot-dash", "dot-dot-dash", "dotted", "double", "down", "e-resize", "ease", "ease-in", "ease-in-out", "ease-out", "element", "ellipse", "ellipsis", "embed", "end", "ethiopic-abegede-gez", "ethiopic-halehame-aa-er", "ethiopic-halehame-gez", "ew-resize", "exclusion", "expanded", "extends", "extra-condensed", "extra-expanded", "fantasy", "fast", "fill", "fill-box", "fixed", "flat", "flex", "flex-end", "flex-start", "footnotes", "forwards", "from", "geometricPrecision", "graytext", "grid", "groove", "hand", "hard-light", "help", "hidden", "hide", "higher", "highlight", "highlighttext", "horizontal", "hsl", "hsla", "hue", "icon", "ignore", "inactiveborder", "inactivecaption", "inactivecaptiontext", "infinite", "infobackground", "infotext", "inherit", "initial", "inline", "inline-axis", "inline-block", "inline-flex", "inline-grid", "inline-table", "inset", "inside", "intrinsic", "invert", "italic", "justify", "keep-all", "landscape", "large", "larger", "left", "level", "lighter", "lighten", "line-through", "linear", "linear-gradient", "lines", "list-item", "listbox", "listitem", "local", "logical", "loud", "lower", "lower-hexadecimal", "lower-latin", "lower-norwegian", "lowercase", "ltr", "luminosity", "manipulation", "match", "matrix", "matrix3d", "medium", "menu", "menutext", "message-box", "middle", "min-intrinsic", "mix", "monospace", "move", "multiple", "multiple_mask_images", "multiply", "n-resize", "narrower", "ne-resize", "nesw-resize", "no-close-quote", "no-drop", "no-open-quote", "no-repeat", "none", "normal", "not-allowed", "nowrap", "ns-resize", "numbers", "numeric", "nw-resize", "nwse-resize", "oblique", "opacity", "open-quote", "optimizeLegibility", "optimizeSpeed", "outset", "outside", "outside-shape", "overlay", "overline", "padding", "padding-box", "painted", "page", "paused", "perspective", "pinch-zoom", "plus-darker", "plus-lighter", "pointer", "polygon", "portrait", "pre", "pre-line", "pre-wrap", "preserve-3d", "progress", "push-button", "radial-gradient", "radio", "read-only", "read-write", "read-write-plaintext-only", "rectangle", "region", "relative", "repeat", "repeating-linear-gradient", "repeating-radial-gradient", "repeat-x", "repeat-y", "reset", "reverse", "rgb", "rgba", "ridge", "right", "rotate", "rotate3d", "rotateX", "rotateY", "rotateZ", "round", "row", "row-resize", "row-reverse", "rtl", "run-in", "running", "s-resize", "sans-serif", "saturation", "scale", "scale3d", "scaleX", "scaleY", "scaleZ", "screen", "scroll", "scrollbar", "scroll-position", "se-resize", "self-start", "self-end", "semi-condensed", "semi-expanded", "separate", "serif", "show", "single", "skew", "skewX", "skewY", "skip-white-space", "slide", "slider-horizontal", "slider-vertical", "sliderthumb-horizontal", "sliderthumb-vertical", "slow", "small", "small-caps", "small-caption", "smaller", "soft-light", "solid", "source-atop", "source-in", "source-out", "source-over", "space", "space-around", "space-between", "space-evenly", "spell-out", "square", "start", "static", "status-bar", "stretch", "stroke", "stroke-box", "sub", "subpixel-antialiased", "svg_masks", "super", "sw-resize", "symbolic", "symbols", "system-ui", "table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row", "table-row-group", "text", "text-bottom", "text-top", "textarea", "textfield", "thick", "thin", "threeddarkshadow", "threedface", "threedhighlight", "threedlightshadow", "threedshadow", "to", "top", "transform", "translate", "translate3d", "translateX", "translateY", "translateZ", "transparent", "ultra-condensed", "ultra-expanded", "underline", "unidirectional-pan", "unset", "up", "upper-latin", "uppercase", "url", "var", "vertical", "vertical-text", "view-box", "visible", "visibleFill", "visiblePainted", "visibleStroke", "visual", "w-resize", "wait", "wave", "wider", "window", "windowframe", "windowtext", "words", "wrap", "wrap-reverse", "x-large", "x-small", "xor", "xx-large", "xx-small"].map(function (name2) {
    return {
      type: "keyword",
      label: name2
    };
  }).concat(["aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "grey", "green", "greenyellow", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen"].map(function (name2) {
    return {
      type: "constant",
      label: name2
    };
  }));
  var tags2 = ["a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "figcaption", "figure", "footer", "form", "header", "hgroup", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "meter", "nav", "ol", "output", "p", "pre", "ruby", "section", "select", "small", "source", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "tr", "u", "ul"].map(function (name2) {
    return {
      type: "type",
      label: name2
    };
  });
  var atRules = ["@charset", "@color-profile", "@container", "@counter-style", "@font-face", "@font-feature-values", "@font-palette-values", "@import", "@keyframes", "@layer", "@media", "@namespace", "@page", "@position-try", "@property", "@scope", "@starting-style", "@supports", "@view-transition"].map(function (label) {
    return {
      type: "keyword",
      label: label
    };
  });
  var identifier2 = /^(\w[\w-]*|-\w[\w-]*|)$/;
  var variable = /^-(-[\w-]*)?$/;
  function isVarArg(node, doc2) {
    var _a2;
    if (node.name == "(" || node.type.isError) node = node.parent || node;
    if (node.name != "ArgList") return false;
    var callee2 = (_a2 = node.parent) === null || _a2 === void 0 ? void 0 : _a2.firstChild;
    if ((callee2 === null || callee2 === void 0 ? void 0 : callee2.name) != "Callee") return false;
    return doc2.sliceString(callee2.from, callee2.to) == "var";
  }
  var VariablesByNode = new NodeWeakMap();
  var declSelector = ["Declaration"];
  function astTop(node) {
    for (var cur = node;;) {
      if (cur.type.isTop) return cur;
      if (!(cur = cur.parent)) return node;
    }
  }
  function variableNames(doc2, node, isVariable) {
    if (node.to - node.from > 4096) {
      var known = VariablesByNode.get(node);
      if (known) return known;
      var result = [],
        seen = new Set(),
        cursor2 = node.cursor(IterMode.IncludeAnonymous);
      if (cursor2.firstChild()) do {
        for (var _iterator155 = _createForOfIteratorHelperLoose(variableNames(doc2, cursor2.node, isVariable)), _step155; !(_step155 = _iterator155()).done;) {
          var option = _step155.value;
          if (!seen.has(option.label)) {
            seen.add(option.label);
            result.push(option);
          }
        }
      } while (cursor2.nextSibling());
      VariablesByNode.set(node, result);
      return result;
    } else {
      var _result = [],
        _seen = new Set();
      node.cursor().iterate(function (node2) {
        var _a2;
        if (isVariable(node2) && node2.matchContext(declSelector) && ((_a2 = node2.node.nextSibling) === null || _a2 === void 0 ? void 0 : _a2.name) == ":") {
          var _name8 = doc2.sliceString(node2.from, node2.to);
          if (!_seen.has(_name8)) {
            _seen.add(_name8);
            _result.push({
              label: _name8,
              type: "variable"
            });
          }
        }
      });
      return _result;
    }
  }
  var defineCSSCompletionSource = function defineCSSCompletionSource(isVariable) {
    return function (context) {
      var state = context.state,
        pos = context.pos,
        node = syntaxTree(state).resolveInner(pos, -1);
      var isDash = node.type.isError && node.from == node.to - 1 && state.doc.sliceString(node.from, node.to) == "-";
      if (node.name == "PropertyName" || (isDash || node.name == "TagName") && /^(Block|Styles)$/.test(node.resolve(node.to).name)) return {
        from: node.from,
        options: properties(),
        validFor: identifier2
      };
      if (node.name == "ValueName") return {
        from: node.from,
        options: values,
        validFor: identifier2
      };
      if (node.name == "PseudoClassName") return {
        from: node.from,
        options: pseudoClasses,
        validFor: identifier2
      };
      if (isVariable(node) || (context.explicit || isDash) && isVarArg(node, state.doc)) return {
        from: isVariable(node) || isDash ? node.from : pos,
        options: variableNames(state.doc, astTop(node), isVariable),
        validFor: variable
      };
      if (node.name == "TagName") {
        for (var parent = node.parent; parent; parent = parent.parent) if (parent.name == "Block") return {
          from: node.from,
          options: properties(),
          validFor: identifier2
        };
        return {
          from: node.from,
          options: tags2,
          validFor: identifier2
        };
      }
      if (node.name == "AtKeyword") return {
        from: node.from,
        options: atRules,
        validFor: identifier2
      };
      if (!context.explicit) return null;
      var above = node.resolve(pos),
        before = above.childBefore(pos);
      if (before && before.name == ":" && above.name == "PseudoClassSelector") return {
        from: pos,
        options: pseudoClasses,
        validFor: identifier2
      };
      if (before && before.name == ":" && above.name == "Declaration" || above.name == "ArgList") return {
        from: pos,
        options: values,
        validFor: identifier2
      };
      if (above.name == "Block" || above.name == "Styles") return {
        from: pos,
        options: properties(),
        validFor: identifier2
      };
      return null;
    };
  };
  var cssCompletionSource = defineCSSCompletionSource(function (n) {
    return n.name == "VariableName";
  });
  var cssLanguage = LRLanguage.define({
    name: "css",
    parser: parser.configure({
      props: [indentNodeProp.add({
        Declaration: continuedIndent()
      }), foldNodeProp.add({
        "Block KeyframeList": foldInside
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
  function css() {
    return new LanguageSupport(cssLanguage, cssLanguage.data.of({
      autocomplete: cssCompletionSource
    }));
  }
  var scriptText = 55;
  var StartCloseScriptTag = 1;
  var styleText = 56;
  var StartCloseStyleTag = 2;
  var textareaText = 57;
  var StartCloseTextareaTag = 3;
  var EndTag = 4;
  var SelfClosingEndTag = 5;
  var StartTag = 6;
  var StartScriptTag = 7;
  var StartStyleTag = 8;
  var StartTextareaTag = 9;
  var StartSelfClosingTag = 10;
  var StartCloseTag = 11;
  var NoMatchStartCloseTag = 12;
  var MismatchedStartCloseTag = 13;
  var missingCloseTag = 58;
  var IncompleteTag = 14;
  var IncompleteCloseTag = 15;
  var commentContent$1 = 59;
  var Element = 21;
  var TagName = 23;
  var Attribute = 24;
  var AttributeName = 25;
  var AttributeValue = 27;
  var UnquotedAttributeValue = 28;
  var ScriptText = 29;
  var StyleText = 32;
  var TextareaText = 35;
  var OpenTag = 37;
  var CloseTag = 38;
  var Dialect_noMatch = 0;
  var Dialect_selfClosing = 1;
  var selfClosers = {
    area: true,
    base: true,
    br: true,
    col: true,
    command: true,
    embed: true,
    frame: true,
    hr: true,
    img: true,
    input: true,
    keygen: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true,
    menuitem: true
  };
  var implicitlyClosed = {
    dd: true,
    li: true,
    optgroup: true,
    option: true,
    p: true,
    rp: true,
    rt: true,
    tbody: true,
    td: true,
    tfoot: true,
    th: true,
    tr: true
  };
  var closeOnOpen = {
    dd: {
      dd: true,
      dt: true
    },
    dt: {
      dd: true,
      dt: true
    },
    li: {
      li: true
    },
    option: {
      option: true,
      optgroup: true
    },
    optgroup: {
      optgroup: true
    },
    p: {
      address: true,
      article: true,
      aside: true,
      blockquote: true,
      dir: true,
      div: true,
      dl: true,
      fieldset: true,
      footer: true,
      form: true,
      h1: true,
      h2: true,
      h3: true,
      h4: true,
      h5: true,
      h6: true,
      header: true,
      hgroup: true,
      hr: true,
      menu: true,
      nav: true,
      ol: true,
      p: true,
      pre: true,
      section: true,
      table: true,
      ul: true
    },
    rp: {
      rp: true,
      rt: true
    },
    rt: {
      rp: true,
      rt: true
    },
    tbody: {
      tbody: true,
      tfoot: true
    },
    td: {
      td: true,
      th: true
    },
    tfoot: {
      tbody: true
    },
    th: {
      td: true,
      th: true
    },
    thead: {
      tbody: true,
      tfoot: true
    },
    tr: {
      tr: true
    }
  };
  function nameChar(ch) {
    return ch == 45 || ch == 46 || ch == 58 || ch >= 65 && ch <= 90 || ch == 95 || ch >= 97 && ch <= 122 || ch >= 161;
  }
  var cachedName = null;
  var cachedInput = null;
  var cachedPos = 0;
  function tagNameAfter(input, offset) {
    var pos = input.pos + offset;
    if (cachedPos == pos && cachedInput == input) return cachedName;
    var next = input.peek(offset),
      name2 = "";
    for (;;) {
      if (!nameChar(next)) break;
      name2 += String.fromCharCode(next);
      next = input.peek(++offset);
    }
    cachedInput = input;
    cachedPos = pos;
    return cachedName = name2 ? name2.toLowerCase() : next == question || next == bang ? void 0 : null;
  }
  var lessThan = 60;
  var greaterThan = 62;
  var slash = 47;
  var question = 63;
  var bang = 33;
  var dash2 = 45;
  function ElementContext(name2, parent) {
    this.name = name2;
    this.parent = parent;
  }
  var startTagTerms = [StartTag, StartSelfClosingTag, StartScriptTag, StartStyleTag, StartTextareaTag];
  var elementContext = new ContextTracker({
    start: null,
    shift: function shift(context, term, stack, input) {
      return startTagTerms.indexOf(term) > -1 ? new ElementContext(tagNameAfter(input, 1) || "", context) : context;
    },
    reduce: function reduce(context, term) {
      return term == Element && context ? context.parent : context;
    },
    reuse: function reuse(context, node, stack, input) {
      var type = node.type.id;
      return type == StartTag || type == OpenTag ? new ElementContext(tagNameAfter(input, 1) || "", context) : context;
    },
    strict: false
  });
  var tagStart = new ExternalTokenizer(function (input, stack) {
    if (input.next != lessThan) {
      if (input.next < 0 && stack.context) input.acceptToken(missingCloseTag);
      return;
    }
    input.advance();
    var close = input.next == slash;
    if (close) input.advance();
    var name2 = tagNameAfter(input, 0);
    if (name2 === void 0) return;
    if (!name2) return input.acceptToken(close ? IncompleteCloseTag : IncompleteTag);
    var parent = stack.context ? stack.context.name : null;
    if (close) {
      if (name2 == parent) return input.acceptToken(StartCloseTag);
      if (parent && implicitlyClosed[parent]) return input.acceptToken(missingCloseTag, -2);
      if (stack.dialectEnabled(Dialect_noMatch)) return input.acceptToken(NoMatchStartCloseTag);
      for (var cx = stack.context; cx; cx = cx.parent) if (cx.name == name2) return;
      input.acceptToken(MismatchedStartCloseTag);
    } else {
      if (name2 == "script") return input.acceptToken(StartScriptTag);
      if (name2 == "style") return input.acceptToken(StartStyleTag);
      if (name2 == "textarea") return input.acceptToken(StartTextareaTag);
      if (selfClosers.hasOwnProperty(name2)) return input.acceptToken(StartSelfClosingTag);
      if (parent && closeOnOpen[parent] && closeOnOpen[parent][name2]) input.acceptToken(missingCloseTag, -1);else input.acceptToken(StartTag);
    }
  }, {
    contextual: true
  });
  var commentContent = new ExternalTokenizer(function (input) {
    for (var dashes = 0, _i64 = 0;; _i64++) {
      if (input.next < 0) {
        if (_i64) input.acceptToken(commentContent$1);
        break;
      }
      if (input.next == dash2) {
        dashes++;
      } else if (input.next == greaterThan && dashes >= 2) {
        if (_i64 >= 3) input.acceptToken(commentContent$1, -2);
        break;
      } else {
        dashes = 0;
      }
      input.advance();
    }
  });
  function inForeignElement(context) {
    for (; context; context = context.parent) if (context.name == "svg" || context.name == "math") return true;
    return false;
  }
  var endTag = new ExternalTokenizer(function (input, stack) {
    if (input.next == slash && input.peek(1) == greaterThan) {
      var selfClosing = stack.dialectEnabled(Dialect_selfClosing) || inForeignElement(stack.context);
      input.acceptToken(selfClosing ? SelfClosingEndTag : EndTag, 2);
    } else if (input.next == greaterThan) {
      input.acceptToken(EndTag, 1);
    }
  });
  function contentTokenizer(tag, textToken, endToken) {
    var lastState = 2 + tag.length;
    return new ExternalTokenizer(function (input) {
      for (var state = 0, matchedLen = 0, _i65 = 0;; _i65++) {
        if (input.next < 0) {
          if (_i65) input.acceptToken(textToken);
          break;
        }
        if (state == 0 && input.next == lessThan || state == 1 && input.next == slash || state >= 2 && state < lastState && input.next == tag.charCodeAt(state - 2)) {
          state++;
          matchedLen++;
        } else if (state == lastState && input.next == greaterThan) {
          if (_i65 > matchedLen) input.acceptToken(textToken, -matchedLen);else input.acceptToken(endToken, -(matchedLen - 2));
          break;
        } else if ((input.next == 10 || input.next == 13) && _i65) {
          input.acceptToken(textToken, 1);
          break;
        } else {
          state = matchedLen = 0;
        }
        input.advance();
      }
    });
  }
  var scriptTokens = contentTokenizer("script", scriptText, StartCloseScriptTag);
  var styleTokens = contentTokenizer("style", styleText, StartCloseStyleTag);
  var textareaTokens = contentTokenizer("textarea", textareaText, StartCloseTextareaTag);
  var htmlHighlighting = styleTags({
    "Text RawText IncompleteTag IncompleteCloseTag": tags.content,
    "StartTag StartCloseTag SelfClosingEndTag EndTag": tags.angleBracket,
    TagName: tags.tagName,
    "MismatchedCloseTag/TagName": [tags.tagName, tags.invalid],
    AttributeName: tags.attributeName,
    "AttributeValue UnquotedAttributeValue": tags.attributeValue,
    Is: tags.definitionOperator,
    "EntityReference CharacterReference": tags.character,
    Comment: tags.blockComment,
    ProcessingInst: tags.processingInstruction,
    DoctypeDecl: tags.documentMeta
  });
  var parser2 = LRParser.deserialize({
    version: 14,
    states: ",xOVO!rOOO!ZQ#tO'#CrO!`Q#tO'#C{O!eQ#tO'#DOO!jQ#tO'#DRO!oQ#tO'#DTO!tOaO'#CqO#PObO'#CqO#[OdO'#CqO$kO!rO'#CqOOO`'#Cq'#CqO$rO$fO'#DUO$zQ#tO'#DWO%PQ#tO'#DXOOO`'#Dl'#DlOOO`'#DZ'#DZQVO!rOOO%UQ&rO,59^O%aQ&rO,59gO%lQ&rO,59jO%wQ&rO,59mO&SQ&rO,59oOOOa'#D_'#D_O&_OaO'#CyO&jOaO,59]OOOb'#D`'#D`O&rObO'#C|O&}ObO,59]OOOd'#Da'#DaO'VOdO'#DPO'bOdO,59]OOO`'#Db'#DbO'jO!rO,59]O'qQ#tO'#DSOOO`,59],59]OOOp'#Dc'#DcO'vO$fO,59pOOO`,59p,59pO(OQ#|O,59rO(TQ#|O,59sOOO`-E7X-E7XO(YQ&rO'#CtOOQW'#D['#D[O(hQ&rO1G.xOOOa1G.x1G.xOOO`1G/Z1G/ZO(sQ&rO1G/ROOOb1G/R1G/RO)OQ&rO1G/UOOOd1G/U1G/UO)ZQ&rO1G/XOOO`1G/X1G/XO)fQ&rO1G/ZOOOa-E7]-E7]O)qQ#tO'#CzOOO`1G.w1G.wOOOb-E7^-E7^O)vQ#tO'#C}OOOd-E7_-E7_O){Q#tO'#DQOOO`-E7`-E7`O*QQ#|O,59nOOOp-E7a-E7aOOO`1G/[1G/[OOO`1G/^1G/^OOO`1G/_1G/_O*VQ,UO,59`OOQW-E7Y-E7YOOOa7+$d7+$dOOO`7+$u7+$uOOOb7+$m7+$mOOOd7+$p7+$pOOO`7+$s7+$sO*bQ#|O,59fO*gQ#|O,59iO*lQ#|O,59lOOO`1G/Y1G/YO*qO7[O'#CwO+SOMhO'#CwOOQW1G.z1G.zOOO`1G/Q1G/QOOO`1G/T1G/TOOO`1G/W1G/WOOOO'#D]'#D]O+eO7[O,59cOOQW,59c,59cOOOO'#D^'#D^O+vOMhO,59cOOOO-E7Z-E7ZOOQW1G.}1G.}OOOO-E7[-E7[",
    stateData: ",c~O!_OS~OUSOVPOWQOXROYTO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O|_O!eZO~OgaO~OgbO~OgcO~OgdO~OgeO~O!XfOPmP![mP~O!YiOQpP![pP~O!ZlORsP![sP~OUSOVPOWQOXROYTOZqO[]O][O^^O_^Oa^Ob^Oc^Od^Oy^O!eZO~O![rO~P#gO!]sO!fuO~OgvO~OgwO~OS|OT}OiyO~OS!POT}OiyO~OS!ROT}OiyO~OS!TOT}OiyO~OS}OT}OiyO~O!XfOPmX![mX~OP!WO![!XO~O!YiOQpX![pX~OQ!ZO![!XO~O!ZlORsX![sX~OR!]O![!XO~O![!XO~P#gOg!_O~O!]sO!f!aO~OS!bO~OS!cO~Oj!dOShXThXihX~OS!fOT!gOiyO~OS!hOT!gOiyO~OS!iOT!gOiyO~OS!jOT!gOiyO~OS!gOT!gOiyO~Og!kO~Og!lO~Og!mO~OS!nO~Ol!qO!a!oO!c!pO~OS!rO~OS!sO~OS!tO~Ob!uOc!uOd!uO!a!wO!b!uO~Ob!xOc!xOd!xO!c!wO!d!xO~Ob!uOc!uOd!uO!a!{O!b!uO~Ob!xOc!xOd!xO!c!{O!d!xO~OT~cbd!ey|!e~",
    goto: "%q!aPPPPPPPPPPPPPPPPPPPPP!b!hP!nPP!zP!}#Q#T#Z#^#a#g#j#m#s#y!bP!b!bP$P$V$m$s$y%P%V%]%cPPPPPPPP%iX^OX`pXUOX`pezabcde{!O!Q!S!UR!q!dRhUR!XhXVOX`pRkVR!XkXWOX`pRnWR!XnXXOX`pQrXR!XpXYOX`pQ`ORx`Q{aQ!ObQ!QcQ!SdQ!UeZ!e{!O!Q!S!UQ!v!oR!z!vQ!y!pR!|!yQgUR!VgQjVR!YjQmWR![mQpXR!^pQtZR!`tS_O`ToXp",
    nodeNames: "\u26A0 StartCloseTag StartCloseTag StartCloseTag EndTag SelfClosingEndTag StartTag StartTag StartTag StartTag StartTag StartCloseTag StartCloseTag StartCloseTag IncompleteTag IncompleteCloseTag Document Text EntityReference CharacterReference InvalidEntity Element OpenTag TagName Attribute AttributeName Is AttributeValue UnquotedAttributeValue ScriptText CloseTag OpenTag StyleText CloseTag OpenTag TextareaText CloseTag OpenTag CloseTag SelfClosingTag Comment ProcessingInst MismatchedCloseTag CloseTag DoctypeDecl",
    maxTerm: 68,
    context: elementContext,
    nodeProps: [["closedBy", -10, 1, 2, 3, 7, 8, 9, 10, 11, 12, 13, "EndTag", 6, "EndTag SelfClosingEndTag", -4, 22, 31, 34, 37, "CloseTag"], ["openedBy", 4, "StartTag StartCloseTag", 5, "StartTag", -4, 30, 33, 36, 38, "OpenTag"], ["group", -10, 14, 15, 18, 19, 20, 21, 40, 41, 42, 43, "Entity", 17, "Entity TextContent", -3, 29, 32, 35, "TextContent Entity"], ["isolate", -11, 22, 30, 31, 33, 34, 36, 37, 38, 39, 42, 43, "ltr", -3, 27, 28, 40, ""]],
    propSources: [htmlHighlighting],
    skippedNodes: [0],
    repeatNodeCount: 9,
    tokenData: "!<p!aR!YOX$qXY,QYZ,QZ[$q[]&X]^,Q^p$qpq,Qqr-_rs3_sv-_vw3}wxHYx}-_}!OH{!O!P-_!P!Q$q!Q![-_![!]Mz!]!^-_!^!_!$S!_!`!;x!`!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4U-_4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!Z$|caPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr$qrs&}sv$qvw+Pwx(tx!^$q!^!_*V!_!a&X!a#S$q#S#T&X#T;'S$q;'S;=`+z<%lO$q!R&bXaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&Xq'UVaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}P'pTaPOv'kw!^'k!_;'S'k;'S;=`(P<%lO'kP(SP;=`<%l'kp([S!dpOv(Vx;'S(V;'S;=`(h<%lO(Vp(kP;=`<%l(Vq(qP;=`<%l&}a({WaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t`)jT!b`Or)esv)ew;'S)e;'S;=`)y<%lO)e`)|P;=`<%l)ea*SP;=`<%l(t!Q*^V!b`!dpOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!Q*vP;=`<%l*V!R*|P;=`<%l&XW+UYlWOX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+PW+wP;=`<%l+P!Z+}P;=`<%l$q!a,]`aP!b`!dp!_^OX&XXY,QYZ,QZ]&X]^,Q^p&Xpq,Qqr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!_-ljiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q[/ebiSlWOX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+PS0rXiSqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0mS1bP;=`<%l0m[1hP;=`<%l/^!V1vciSaP!b`!dpOq&Xqr1krs&}sv1kvw0mwx(tx!P1k!P!Q&X!Q!^1k!^!_*V!_!a&X!a#s1k#s$f&X$f;'S1k;'S;=`3R<%l?Ah1k?Ah?BY&X?BY?Mn1k?MnO&X!V3UP;=`<%l1k!_3[P;=`<%l-_!Z3hV!ahaP!dpOv&}wx'kx!^&}!^!_(V!_;'S&};'S;=`(n<%lO&}!_4WiiSlWd!ROX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst>]tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^/^!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!Z5zblWOX5uXZ7SZ[5u[^7S^p5uqr5urs7Sst+Ptw5uwx7Sx!]5u!]!^7w!^!a7S!a#S5u#S#T7S#T;'S5u;'S;=`8n<%lO5u!R7VVOp7Sqs7St!]7S!]!^7l!^;'S7S;'S;=`7q<%lO7S!R7qOb!R!R7tP;=`<%l7S!Z8OYlWb!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!Z8qP;=`<%l5u!_8{iiSlWOX5uXZ7SZ[5u[^7S^p5uqr8trs7Sst/^tw8twx7Sx!P8t!P!Q5u!Q!]8t!]!^:j!^!a7S!a#S8t#S#T;{#T#s8t#s$f5u$f;'S8t;'S;=`>V<%l?Ah8t?Ah?BY5u?BY?Mn8t?MnO5u!_:sbiSlWb!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!V<QciSOp7Sqr;{rs7Sst0mtw;{wx7Sx!P;{!P!Q7S!Q!];{!]!^=]!^!a7S!a#s;{#s$f7S$f;'S;{;'S;=`>P<%l?Ah;{?Ah?BY7S?BY?Mn;{?MnO7S!V=dXiSb!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!V>SP;=`<%l;{!_>YP;=`<%l8t!_>dhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^/^!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!Z@TalWOX@OXZAYZ[@O[^AY^p@Oqr@OrsAYsw@OwxAYx!]@O!]!^Az!^!aAY!a#S@O#S#TAY#T;'S@O;'S;=`Bq<%lO@O!RA]UOpAYq!]AY!]!^Ao!^;'SAY;'S;=`At<%lOAY!RAtOc!R!RAwP;=`<%lAY!ZBRYlWc!ROX+PZ[+P^p+Pqr+Psw+Px!^+P!a#S+P#T;'S+P;'S;=`+t<%lO+P!ZBtP;=`<%l@O!_COhiSlWOX@OXZAYZ[@O[^AY^p@OqrBwrsAYswBwwxAYx!PBw!P!Q@O!Q!]Bw!]!^Dj!^!aAY!a#SBw#S#TE{#T#sBw#s$f@O$f;'SBw;'S;=`HS<%l?AhBw?Ah?BY@O?BY?MnBw?MnO@O!_DsbiSlWc!ROX+PZ[+P^p+Pqr/^sw/^x!P/^!P!Q+P!Q!^/^!a#S/^#S#T0m#T#s/^#s$f+P$f;'S/^;'S;=`1e<%l?Ah/^?Ah?BY+P?BY?Mn/^?MnO+P!VFQbiSOpAYqrE{rsAYswE{wxAYx!PE{!P!QAY!Q!]E{!]!^GY!^!aAY!a#sE{#s$fAY$f;'SE{;'S;=`G|<%l?AhE{?Ah?BYAY?BY?MnE{?MnOAY!VGaXiSc!Rqr0msw0mx!P0m!Q!^0m!a#s0m$f;'S0m;'S;=`1_<%l?Ah0m?BY?Mn0m!VHPP;=`<%lE{!_HVP;=`<%lBw!ZHcW!cxaP!b`Or(trs'ksv(tw!^(t!^!_)e!_;'S(t;'S;=`*P<%lO(t!aIYliSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OKQ!O!P-_!P!Q$q!Q!^-_!^!_*V!_!a&X!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!aK_kiSaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx!P-_!P!Q$q!Q!^-_!^!_*V!_!`&X!`!aMS!a#S-_#S#T1k#T#s-_#s$f$q$f;'S-_;'S;=`3X<%l?Ah-_?Ah?BY$q?BY?Mn-_?MnO$q!TM_XaP!b`!dp!fQOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X!aNZ!ZiSgQaPlW!b`!dpOX$qXZ&XZ[$q[^&X^p$qpq&Xqr-_rs&}sv-_vw/^wx(tx}-_}!OMz!O!PMz!P!Q$q!Q![Mz![!]Mz!]!^-_!^!_*V!_!a&X!a!c-_!c!}Mz!}#R-_#R#SMz#S#T1k#T#oMz#o#s-_#s$f$q$f$}-_$}%OMz%O%W-_%W%oMz%o%p-_%p&aMz&a&b-_&b1pMz1p4UMz4U4dMz4d4e-_4e$ISMz$IS$I`-_$I`$IbMz$Ib$Je-_$Je$JgMz$Jg$Kh-_$Kh%#tMz%#t&/x-_&/x&EtMz&Et&FV-_&FV;'SMz;'S;:j!#|;:j;=`3X<%l?&r-_?&r?AhMz?Ah?BY$q?BY?MnMz?MnO$q!a!$PP;=`<%lMz!R!$ZY!b`!dpOq*Vqr!$yrs(Vsv*Vwx)ex!a*V!a!b!4t!b;'S*V;'S;=`*s<%lO*V!R!%Q]!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!%y!O!f*V!f!g!']!g#W*V#W#X!0`#X;'S*V;'S;=`*s<%lO*V!R!&QX!b`!dpOr*Vrs(Vsv*Vwx)ex}*V}!O!&m!O;'S*V;'S;=`*s<%lO*V!R!&vV!b`!dp!ePOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!'dX!b`!dpOr*Vrs(Vsv*Vwx)ex!q*V!q!r!(P!r;'S*V;'S;=`*s<%lO*V!R!(WX!b`!dpOr*Vrs(Vsv*Vwx)ex!e*V!e!f!(s!f;'S*V;'S;=`*s<%lO*V!R!(zX!b`!dpOr*Vrs(Vsv*Vwx)ex!v*V!v!w!)g!w;'S*V;'S;=`*s<%lO*V!R!)nX!b`!dpOr*Vrs(Vsv*Vwx)ex!{*V!{!|!*Z!|;'S*V;'S;=`*s<%lO*V!R!*bX!b`!dpOr*Vrs(Vsv*Vwx)ex!r*V!r!s!*}!s;'S*V;'S;=`*s<%lO*V!R!+UX!b`!dpOr*Vrs(Vsv*Vwx)ex!g*V!g!h!+q!h;'S*V;'S;=`*s<%lO*V!R!+xY!b`!dpOr!+qrs!,hsv!+qvw!-Swx!.[x!`!+q!`!a!/j!a;'S!+q;'S;=`!0Y<%lO!+qq!,mV!dpOv!,hvx!-Sx!`!,h!`!a!-q!a;'S!,h;'S;=`!.U<%lO!,hP!-VTO!`!-S!`!a!-f!a;'S!-S;'S;=`!-k<%lO!-SP!-kO|PP!-nP;=`<%l!-Sq!-xS!dp|POv(Vx;'S(V;'S;=`(h<%lO(Vq!.XP;=`<%l!,ha!.aX!b`Or!.[rs!-Ssv!.[vw!-Sw!`!.[!`!a!.|!a;'S!.[;'S;=`!/d<%lO!.[a!/TT!b`|POr)esv)ew;'S)e;'S;=`)y<%lO)ea!/gP;=`<%l!.[!R!/sV!b`!dp|POr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!0]P;=`<%l!+q!R!0gX!b`!dpOr*Vrs(Vsv*Vwx)ex#c*V#c#d!1S#d;'S*V;'S;=`*s<%lO*V!R!1ZX!b`!dpOr*Vrs(Vsv*Vwx)ex#V*V#V#W!1v#W;'S*V;'S;=`*s<%lO*V!R!1}X!b`!dpOr*Vrs(Vsv*Vwx)ex#h*V#h#i!2j#i;'S*V;'S;=`*s<%lO*V!R!2qX!b`!dpOr*Vrs(Vsv*Vwx)ex#m*V#m#n!3^#n;'S*V;'S;=`*s<%lO*V!R!3eX!b`!dpOr*Vrs(Vsv*Vwx)ex#d*V#d#e!4Q#e;'S*V;'S;=`*s<%lO*V!R!4XX!b`!dpOr*Vrs(Vsv*Vwx)ex#X*V#X#Y!+q#Y;'S*V;'S;=`*s<%lO*V!R!4{Y!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!a!4t!a!b!:]!b;'S!4t;'S;=`!;r<%lO!4tq!5pV!dpOv!5kvx!6Vx!a!5k!a!b!7W!b;'S!5k;'S;=`!8V<%lO!5kP!6YTO!a!6V!a!b!6i!b;'S!6V;'S;=`!7Q<%lO!6VP!6lTO!`!6V!`!a!6{!a;'S!6V;'S;=`!7Q<%lO!6VP!7QOyPP!7TP;=`<%l!6Vq!7]V!dpOv!5kvx!6Vx!`!5k!`!a!7r!a;'S!5k;'S;=`!8V<%lO!5kq!7yS!dpyPOv(Vx;'S(V;'S;=`(h<%lO(Vq!8YP;=`<%l!5ka!8bX!b`Or!8]rs!6Vsv!8]vw!6Vw!a!8]!a!b!8}!b;'S!8];'S;=`!:V<%lO!8]a!9SX!b`Or!8]rs!6Vsv!8]vw!6Vw!`!8]!`!a!9o!a;'S!8];'S;=`!:V<%lO!8]a!9vT!b`yPOr)esv)ew;'S)e;'S;=`)y<%lO)ea!:YP;=`<%l!8]!R!:dY!b`!dpOr!4trs!5ksv!4tvw!6Vwx!8]x!`!4t!`!a!;S!a;'S!4t;'S;=`!;r<%lO!4t!R!;]V!b`!dpyPOr*Vrs(Vsv*Vwx)ex;'S*V;'S;=`*s<%lO*V!R!;uP;=`<%l!4t!V!<TXjSaP!b`!dpOr&Xrs&}sv&Xwx(tx!^&X!^!_*V!_;'S&X;'S;=`*y<%lO&X",
    tokenizers: [scriptTokens, styleTokens, textareaTokens, endTag, tagStart, commentContent, 0, 1, 2, 3, 4, 5],
    topRules: {
      "Document": [0, 16]
    },
    dialects: {
      noMatch: 0,
      selfClosing: 515
    },
    tokenPrec: 517
  });
  function getAttrs2(openTag, input) {
    var attrs = Object.create(null);
    for (var _iterator156 = _createForOfIteratorHelperLoose(openTag.getChildren(Attribute)), _step156; !(_step156 = _iterator156()).done;) {
      var att = _step156.value;
      var _name9 = att.getChild(AttributeName),
        value = att.getChild(AttributeValue) || att.getChild(UnquotedAttributeValue);
      if (_name9) attrs[input.read(_name9.from, _name9.to)] = !value ? "" : value.type.id == AttributeValue ? input.read(value.from + 1, value.to - 1) : input.read(value.from, value.to);
    }
    return attrs;
  }
  function findTagName(openTag, input) {
    var tagNameNode = openTag.getChild(TagName);
    return tagNameNode ? input.read(tagNameNode.from, tagNameNode.to) : " ";
  }
  function maybeNest(node, input, tags3) {
    var attrs;
    for (var _iterator157 = _createForOfIteratorHelperLoose(tags3), _step157; !(_step157 = _iterator157()).done;) {
      var tag = _step157.value;
      if (!tag.attrs || tag.attrs(attrs || (attrs = getAttrs2(node.node.parent.firstChild, input)))) return {
        parser: tag.parser,
        bracketed: true
      };
    }
    return null;
  }
  function configureNesting(tags3, attributes) {
    if (tags3 === void 0) {
      tags3 = [];
    }
    if (attributes === void 0) {
      attributes = [];
    }
    var script = [],
      style = [],
      textarea = [],
      other = [];
    for (var _iterator158 = _createForOfIteratorHelperLoose(tags3), _step158; !(_step158 = _iterator158()).done;) {
      var tag = _step158.value;
      var array = tag.tag == "script" ? script : tag.tag == "style" ? style : tag.tag == "textarea" ? textarea : other;
      array.push(tag);
    }
    var attrs = attributes.length ? Object.create(null) : null;
    for (var _iterator159 = _createForOfIteratorHelperLoose(attributes), _step159; !(_step159 = _iterator159()).done;) {
      var attr = _step159.value;
      (attrs[attr.name] || (attrs[attr.name] = [])).push(attr);
    }
    return parseMixed(function (node, input) {
      var id2 = node.type.id;
      if (id2 == ScriptText) return maybeNest(node, input, script);
      if (id2 == StyleText) return maybeNest(node, input, style);
      if (id2 == TextareaText) return maybeNest(node, input, textarea);
      if (id2 == Element && other.length) {
        var n = node.node,
          open = n.firstChild,
          tagName = open && findTagName(open, input),
          attrs2;
        if (tagName) for (var _i66 = 0, _other = other; _i66 < _other.length; _i66++) {
          var tag = _other[_i66];
          if (tag.tag == tagName && (!tag.attrs || tag.attrs(attrs2 || (attrs2 = getAttrs2(open, input))))) {
            var close = n.lastChild;
            var to = close.type.id == CloseTag ? close.from : n.to;
            if (to > open.to) return {
              parser: tag.parser,
              overlay: [{
                from: open.to,
                to: to
              }]
            };
          }
        }
      }
      if (attrs && id2 == Attribute) {
        var _n = node.node,
          nameNode;
        if (nameNode = _n.firstChild) {
          var matches = attrs[input.read(nameNode.from, nameNode.to)];
          if (matches) {
            for (var _iterator160 = _createForOfIteratorHelperLoose(matches), _step160; !(_step160 = _iterator160()).done;) {
              var attr = _step160.value;
              if (attr.tagName && attr.tagName != findTagName(_n.parent, input)) continue;
              var value = _n.lastChild;
              if (value.type.id == AttributeValue) {
                var from = value.from + 1;
                var last = value.lastChild,
                  _to2 = value.to - (last && last.isError ? 0 : 1);
                if (_to2 > from) return {
                  parser: attr.parser,
                  overlay: [{
                    from: from,
                    to: _to2
                  }],
                  bracketed: true
                };
              } else if (value.type.id == UnquotedAttributeValue) {
                return {
                  parser: attr.parser,
                  overlay: [{
                    from: value.from,
                    to: value.to
                  }]
                };
              }
            }
          }
        }
      }
      return null;
    });
  }
  var noSemi = 316;
  var noSemiType = 317;
  var incdec = 1;
  var incdecPrefix = 2;
  var questionDot = 3;
  var JSXStartTag = 4;
  var insertSemi = 318;
  var spaces = 320;
  var newline2 = 321;
  var LineComment = 5;
  var BlockComment = 6;
  var Dialect_jsx = 0;
  var space2 = [9, 10, 11, 12, 13, 32, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288];
  var braceR = 125;
  var semicolon = 59;
  var slash2 = 47;
  var star = 42;
  var plus = 43;
  var minus = 45;
  var lt = 60;
  var comma = 44;
  var question2 = 63;
  var dot = 46;
  var bracketL2 = 91;
  var trackNewline = new ContextTracker({
    start: false,
    shift: function shift(context, term) {
      return term == LineComment || term == BlockComment || term == spaces ? context : term == newline2;
    },
    strict: false
  });
  var insertSemicolon = new ExternalTokenizer(function (input, stack) {
    var next = input.next;
    if (next == braceR || next == -1 || stack.context) input.acceptToken(insertSemi);
  }, {
    contextual: true,
    fallback: true
  });
  var noSemicolon = new ExternalTokenizer(function (input, stack) {
    var next = input.next,
      after;
    if (space2.indexOf(next) > -1) return;
    if (next == slash2 && ((after = input.peek(1)) == slash2 || after == star)) return;
    if (next != braceR && next != semicolon && next != -1 && !stack.context) input.acceptToken(noSemi);
  }, {
    contextual: true
  });
  var noSemicolonType = new ExternalTokenizer(function (input, stack) {
    if (input.next == bracketL2 && !stack.context) input.acceptToken(noSemiType);
  }, {
    contextual: true
  });
  var operatorToken = new ExternalTokenizer(function (input, stack) {
    var next = input.next;
    if (next == plus || next == minus) {
      input.advance();
      if (next == input.next) {
        input.advance();
        var mayPostfix = !stack.context && stack.canShift(incdec);
        input.acceptToken(mayPostfix ? incdec : incdecPrefix);
      }
    } else if (next == question2 && input.peek(1) == dot) {
      input.advance();
      input.advance();
      if (input.next < 48 || input.next > 57) input.acceptToken(questionDot);
    }
  }, {
    contextual: true
  });
  function identifierChar(ch, start) {
    return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch == 95 || ch >= 192 || !start && ch >= 48 && ch <= 57;
  }
  var jsx = new ExternalTokenizer(function (input, stack) {
    if (input.next != lt || !stack.dialectEnabled(Dialect_jsx)) return;
    input.advance();
    if (input.next == slash2) return;
    var back = 0;
    while (space2.indexOf(input.next) > -1) {
      input.advance();
      back++;
    }
    if (identifierChar(input.next, true)) {
      input.advance();
      back++;
      while (identifierChar(input.next, false)) {
        input.advance();
        back++;
      }
      while (space2.indexOf(input.next) > -1) {
        input.advance();
        back++;
      }
      if (input.next == comma) return;
      for (var _i67 = 0;; _i67++) {
        if (_i67 == 7) {
          if (!identifierChar(input.next, true)) return;
          break;
        }
        if (input.next != "extends".charCodeAt(_i67)) break;
        input.advance();
        back++;
      }
    }
    input.acceptToken(JSXStartTag, -back);
  });
  var jsHighlight = styleTags({
    "get set async static": tags.modifier,
    "for while do if else switch try catch finally return throw break continue default case defer": tags.controlKeyword,
    "in of await yield void typeof delete instanceof as satisfies": tags.operatorKeyword,
    "let var const using function class extends": tags.definitionKeyword,
    "import export from": tags.moduleKeyword,
    "with debugger new": tags.keyword,
    TemplateString: tags.special(tags.string),
    super: tags.atom,
    BooleanLiteral: tags.bool,
    this: tags.self,
    null: tags.null,
    Star: tags.modifier,
    VariableName: tags.variableName,
    "CallExpression/VariableName TaggedTemplateExpression/VariableName": tags.function(tags.variableName),
    VariableDefinition: tags.definition(tags.variableName),
    Label: tags.labelName,
    PropertyName: tags.propertyName,
    PrivatePropertyName: tags.special(tags.propertyName),
    "CallExpression/MemberExpression/PropertyName": tags.function(tags.propertyName),
    "FunctionDeclaration/VariableDefinition": tags.function(tags.definition(tags.variableName)),
    "ClassDeclaration/VariableDefinition": tags.definition(tags.className),
    "NewExpression/VariableName": tags.className,
    PropertyDefinition: tags.definition(tags.propertyName),
    PrivatePropertyDefinition: tags.definition(tags.special(tags.propertyName)),
    UpdateOp: tags.updateOperator,
    "LineComment Hashbang": tags.lineComment,
    BlockComment: tags.blockComment,
    Number: tags.number,
    String: tags.string,
    Escape: tags.escape,
    ArithOp: tags.arithmeticOperator,
    LogicOp: tags.logicOperator,
    BitOp: tags.bitwiseOperator,
    CompareOp: tags.compareOperator,
    RegExp: tags.regexp,
    Equals: tags.definitionOperator,
    Arrow: tags.function(tags.punctuation),
    ": Spread": tags.punctuation,
    "( )": tags.paren,
    "[ ]": tags.squareBracket,
    "{ }": tags.brace,
    "InterpolationStart InterpolationEnd": tags.special(tags.brace),
    ".": tags.derefOperator,
    ", ;": tags.separator,
    "@": tags.meta,
    TypeName: tags.typeName,
    TypeDefinition: tags.definition(tags.typeName),
    "type enum interface implements namespace module declare": tags.definitionKeyword,
    "abstract global Privacy readonly override": tags.modifier,
    "is keyof unique infer asserts": tags.operatorKeyword,
    JSXAttributeValue: tags.attributeValue,
    JSXText: tags.content,
    "JSXStartTag JSXStartCloseTag JSXSelfCloseEndTag JSXEndTag": tags.angleBracket,
    "JSXIdentifier JSXNameSpacedName": tags.tagName,
    "JSXAttribute/JSXIdentifier JSXAttribute/JSXNameSpacedName": tags.attributeName,
    "JSXBuiltin/JSXIdentifier": tags.standard(tags.tagName)
  });
  var spec_identifier2 = {
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
  };
  var spec_word = {
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
  };
  var spec_LessThan = {
    __proto__: null,
    "<": 193
  };
  var parser3 = LRParser.deserialize({
    version: 14,
    states: "$F|Q%TQlOOO%[QlOOO'_QpOOP(lO`OOO*zQ!0MxO'#CiO+RO#tO'#CjO+aO&jO'#CjO+oO#@ItO'#DaO.QQlO'#DgO.bQlO'#DrO%[QlO'#DzO0fQlO'#ESOOQ!0Lf'#E['#E[O1PQ`O'#EXOOQO'#Ep'#EpOOQO'#Il'#IlO1XQ`O'#GsO1dQ`O'#EoO1iQ`O'#EoO3hQ!0MxO'#JrO6[Q!0MxO'#JsO6uQ`O'#F]O6zQ,UO'#FtOOQ!0Lf'#Ff'#FfO7VO7dO'#FfO9XQMhO'#F|O9`Q`O'#F{OOQ!0Lf'#Js'#JsOOQ!0Lb'#Jr'#JrO9eQ`O'#GwOOQ['#K_'#K_O9pQ`O'#IYO9uQ!0LrO'#IZOOQ['#J`'#J`OOQ['#I_'#I_Q`QlOOQ`QlOOO9}Q!L^O'#DvO:UQlO'#EOO:]QlO'#EQO9kQ`O'#GsO:dQMhO'#CoO:rQ`O'#EnO:}Q`O'#EyO;hQMhO'#FeO;xQ`O'#GsOOQO'#K`'#K`O;}Q`O'#K`O<]Q`O'#G{O<]Q`O'#G|O<]Q`O'#HOO9kQ`O'#HRO=SQ`O'#HUO>kQ`O'#CeO>{Q`O'#HcO?TQ`O'#HiO?TQ`O'#HkO`QlO'#HmO?TQ`O'#HoO?TQ`O'#HrO?YQ`O'#HxO?_Q!0LsO'#IOO%[QlO'#IQO?jQ!0LsO'#ISO?uQ!0LsO'#IUO9uQ!0LrO'#IWO@QQ!0MxO'#CiOASQpO'#DlQOQ`OOO%[QlO'#EQOAjQ`O'#ETO:dQMhO'#EnOAuQ`O'#EnOBQQ!bO'#FeOOQ['#Cg'#CgOOQ!0Lb'#Dq'#DqOOQ!0Lb'#Jv'#JvO%[QlO'#JvOOQO'#Jy'#JyOOQO'#Ih'#IhOCQQpO'#EgOOQ!0Lb'#Ef'#EfOOQ!0Lb'#J}'#J}OC|Q!0MSO'#EgODWQpO'#EWOOQO'#Jx'#JxODlQpO'#JyOEyQpO'#EWODWQpO'#EgPFWO&2DjO'#CbPOOO)CD})CD}OOOO'#I`'#I`OFcO#tO,59UOOQ!0Lh,59U,59UOOOO'#Ia'#IaOFqO&jO,59UOGPQ!L^O'#DcOOOO'#Ic'#IcOGWO#@ItO,59{OOQ!0Lf,59{,59{OGfQlO'#IdOGyQ`O'#JtOIxQ!fO'#JtO+}QlO'#JtOJPQ`O,5:ROJgQ`O'#EpOJtQ`O'#KTOKPQ`O'#KSOKPQ`O'#KSOKXQ`O,5;^OK^Q`O'#KROOQ!0Ln,5:^,5:^OKeQlO,5:^OMcQ!0MxO,5:fONSQ`O,5:nONmQ!0LrO'#KQONtQ`O'#KPO9eQ`O'#KPO! YQ`O'#KPO! bQ`O,5;]O! gQ`O'#KPO!#lQ!fO'#JsOOQ!0Lh'#Ci'#CiO%[QlO'#ESO!$[Q!fO,5:sOOQS'#Jz'#JzOOQO-E<j-E<jO9kQ`O,5=_O!$rQ`O,5=_O!$wQlO,5;ZO!&zQMhO'#EkO!(eQ`O,5;ZO!(jQlO'#DyO!(tQpO,5;dO!(|QpO,5;dO%[QlO,5;dOOQ['#FT'#FTOOQ['#FV'#FVO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eO%[QlO,5;eOOQ['#FZ'#FZO!)[QlO,5;tOOQ!0Lf,5;y,5;yOOQ!0Lf,5;z,5;zOOQ!0Lf,5;|,5;|O%[QlO'#IpO!+_Q!0LrO,5<iO%[QlO,5;eO!&zQMhO,5;eO!+|QMhO,5;eO!-nQMhO'#E^O%[QlO,5;wOOQ!0Lf,5;{,5;{O!-uQ,UO'#FjO!.rQ,UO'#KXO!.^Q,UO'#KXO!.yQ,UO'#KXOOQO'#KX'#KXO!/_Q,UO,5<SOOOW,5<`,5<`O!/pQlO'#FvOOOW'#Io'#IoO7VO7dO,5<QO!/wQ,UO'#FxOOQ!0Lf,5<Q,5<QO!0hQ$IUO'#CyOOQ!0Lh'#C}'#C}O!0{O#@ItO'#DRO!1iQMjO,5<eO!1pQ`O,5<hO!3YQ(CWO'#GXO!3jQ`O'#GYO!3oQ`O'#GYO!5_Q(CWO'#G^O!6dQpO'#GbOOQO'#Gn'#GnO!,TQMhO'#GmOOQO'#Gp'#GpO!,TQMhO'#GoO!7VQ$IUO'#JlOOQ!0Lh'#Jl'#JlO!7aQ`O'#JkO!7oQ`O'#JjO!7wQ`O'#CuOOQ!0Lh'#C{'#C{O!8YQ`O'#C}OOQ!0Lh'#DV'#DVOOQ!0Lh'#DX'#DXO!8_Q`O,5<eO1SQ`O'#DZO!,TQMhO'#GPO!,TQMhO'#GRO!8gQ`O'#GTO!8lQ`O'#GUO!3oQ`O'#G[O!,TQMhO'#GaO<]Q`O'#JkO!8qQ`O'#EqO!9`Q`O,5<gOOQ!0Lb'#Cr'#CrO!9hQ`O'#ErO!:bQpO'#EsOOQ!0Lb'#KR'#KRO!:iQ!0LrO'#KaO9uQ!0LrO,5=cO`QlO,5>tOOQ['#Jh'#JhOOQ[,5>u,5>uOOQ[-E<]-E<]O!<hQ!0MxO,5:bO!:]QpO,5:`O!?RQ!0MxO,5:jO%[QlO,5:jO!AiQ!0MxO,5:lOOQO,5@z,5@zO!BYQMhO,5=_O!BhQ!0LrO'#JiO9`Q`O'#JiO!ByQ!0LrO,59ZO!CUQpO,59ZO!C^QMhO,59ZO:dQMhO,59ZO!CiQ`O,5;ZO!CqQ`O'#HbO!DVQ`O'#KdO%[QlO,5;}O!:]QpO,5<PO!D_Q`O,5=zO!DdQ`O,5=zO!DiQ`O,5=zO!DwQ`O,5=zO9uQ!0LrO,5=zO<]Q`O,5=jOOQO'#Cy'#CyO!EOQpO,5=gO!EWQMhO,5=hO!EcQ`O,5=jO!EhQ!bO,5=mO!EpQ`O'#K`O?YQ`O'#HWO9kQ`O'#HYO!EuQ`O'#HYO:dQMhO'#H[O!EzQ`O'#H[OOQ[,5=p,5=pO!FPQ`O'#H]O!FbQ`O'#CoO!FgQ`O,59PO!FqQ`O,59PO!HvQlO,59POOQ[,59P,59PO!IWQ!0LrO,59PO%[QlO,59PO!KcQlO'#HeOOQ['#Hf'#HfOOQ['#Hg'#HgO`QlO,5=}O!KyQ`O,5=}O`QlO,5>TO`QlO,5>VO!LOQ`O,5>XO`QlO,5>ZO!LTQ`O,5>^O!LYQlO,5>dOOQ[,5>j,5>jO%[QlO,5>jO9uQ!0LrO,5>lOOQ[,5>n,5>nO#!dQ`O,5>nOOQ[,5>p,5>pO#!dQ`O,5>pOOQ[,5>r,5>rO##QQpO'#D_O%[QlO'#JvO##sQpO'#JvO##}QpO'#DmO#$`QpO'#DmO#&qQlO'#DmO#&xQ`O'#JuO#'QQ`O,5:WO#'VQ`O'#EtO#'eQ`O'#KUO#'mQ`O,5;_O#'rQpO'#DmO#(PQpO'#EVOOQ!0Lf,5:o,5:oO%[QlO,5:oO#(WQ`O,5:oO?YQ`O,5;YO!CUQpO,5;YO!C^QMhO,5;YO:dQMhO,5;YO#(`Q`O,5@bO#(eQ07dO,5:sOOQO-E<f-E<fO#)kQ!0MSO,5;RODWQpO,5:rO#)uQpO,5:rODWQpO,5;RO!ByQ!0LrO,5:rOOQ!0Lb'#Ej'#EjOOQO,5;R,5;RO%[QlO,5;RO#*SQ!0LrO,5;RO#*_Q!0LrO,5;RO!CUQpO,5:rOOQO,5;X,5;XO#*mQ!0LrO,5;RPOOO'#I^'#I^P#+RO&2DjO,58|POOO,58|,58|OOOO-E<^-E<^OOQ!0Lh1G.p1G.pOOOO-E<_-E<_OOOO,59},59}O#+^Q!bO,59}OOOO-E<a-E<aOOQ!0Lf1G/g1G/gO#+cQ!fO,5?OO+}QlO,5?OOOQO,5?U,5?UO#+mQlO'#IdOOQO-E<b-E<bO#+zQ`O,5@`O#,SQ!fO,5@`O#,ZQ`O,5@nOOQ!0Lf1G/m1G/mO%[QlO,5@oO#,cQ`O'#IjOOQO-E<h-E<hO#,ZQ`O,5@nOOQ!0Lb1G0x1G0xOOQ!0Ln1G/x1G/xOOQ!0Ln1G0Y1G0YO%[QlO,5@lO#,wQ!0LrO,5@lO#-YQ!0LrO,5@lO#-aQ`O,5@kO9eQ`O,5@kO#-iQ`O,5@kO#-wQ`O'#ImO#-aQ`O,5@kOOQ!0Lb1G0w1G0wO!(tQpO,5:uO!)PQpO,5:uOOQS,5:w,5:wO#.iQdO,5:wO#.qQMhO1G2yO9kQ`O1G2yOOQ!0Lf1G0u1G0uO#/PQ!0MxO1G0uO#0UQ!0MvO,5;VOOQ!0Lh'#GW'#GWO#0rQ!0MzO'#JlO!$wQlO1G0uO#2}Q!fO'#JwO%[QlO'#JwO#3XQ`O,5:eOOQ!0Lh'#D_'#D_OOQ!0Lf1G1O1G1OO%[QlO1G1OOOQ!0Lf1G1f1G1fO#3^Q`O1G1OO#5rQ!0MxO1G1PO#5yQ!0MxO1G1PO#8aQ!0MxO1G1PO#8hQ!0MxO1G1PO#;OQ!0MxO1G1PO#=fQ!0MxO1G1PO#=mQ!0MxO1G1PO#=tQ!0MxO1G1PO#@[Q!0MxO1G1PO#@cQ!0MxO1G1PO#BpQ?MtO'#CiO#DkQ?MtO1G1`O#DrQ?MtO'#JsO#EVQ!0MxO,5?[OOQ!0Lb-E<n-E<nO#GdQ!0MxO1G1PO#HaQ!0MzO1G1POOQ!0Lf1G1P1G1PO#IdQMjO'#J|O#InQ`O,5:xO#IsQ!0MxO1G1cO#JgQ,UO,5<WO#JoQ,UO,5<XO#JwQ,UO'#FoO#K`Q`O'#FnOOQO'#KY'#KYOOQO'#In'#InO#KeQ,UO1G1nOOQ!0Lf1G1n1G1nOOOW1G1y1G1yO#KvQ?MtO'#JrO#LQQ`O,5<bO!)[QlO,5<bOOOW-E<m-E<mOOQ!0Lf1G1l1G1lO#LVQpO'#KXOOQ!0Lf,5<d,5<dO#L_QpO,5<dO#LdQMhO'#DTOOOO'#Ib'#IbO#LkO#@ItO,59mOOQ!0Lh,59m,59mO%[QlO1G2PO!8lQ`O'#IrO#LvQ`O,5<zOOQ!0Lh,5<w,5<wO!,TQMhO'#IuO#MdQMjO,5=XO!,TQMhO'#IwO#NVQMjO,5=ZO!&zQMhO,5=]OOQO1G2S1G2SO#NaQ!dO'#CrO#NtQ(CWO'#ErO$ |QpO'#GbO$!dQ!dO,5<sO$!kQ`O'#K[O9eQ`O'#K[O$!yQ`O,5<uO$#aQ!dO'#C{O!,TQMhO,5<tO$#kQ`O'#GZO$$PQ`O,5<tO$$UQ!dO'#GWO$$cQ!dO'#K]O$$mQ`O'#K]O!&zQMhO'#K]O$$rQ`O,5<xO$$wQlO'#JvO$%RQpO'#GcO#$`QpO'#GcO$%dQ`O'#GgO!3oQ`O'#GkO$%iQ!0LrO'#ItO$%tQpO,5<|OOQ!0Lp,5<|,5<|O$%{QpO'#GcO$&YQpO'#GdO$&kQpO'#GdO$&pQMjO,5=XO$'QQMjO,5=ZOOQ!0Lh,5=^,5=^O!,TQMhO,5@VO!,TQMhO,5@VO$'bQ`O'#IyO$'vQ`O,5@UO$(OQ`O,59aOOQ!0Lh,59i,59iO$(TQ`O,5@VO$)TQ$IYO,59uOOQ!0Lh'#Jp'#JpO$)vQMjO,5<kO$*iQMjO,5<mO@zQ`O,5<oOOQ!0Lh,5<p,5<pO$*sQ`O,5<vO$*xQMjO,5<{O$+YQ`O'#KPO!$wQlO1G2RO$+_Q`O1G2RO9eQ`O'#KSO9eQ`O'#EtO%[QlO'#EtO9eQ`O'#I{O$+dQ!0LrO,5@{OOQ[1G2}1G2}OOQ[1G4`1G4`OOQ!0Lf1G/|1G/|OOQ!0Lf1G/z1G/zO$-fQ!0MxO1G0UOOQ[1G2y1G2yO!&zQMhO1G2yO%[QlO1G2yO#.tQ`O1G2yO$/jQMhO'#EkOOQ!0Lb,5@T,5@TO$/wQ!0LrO,5@TOOQ[1G.u1G.uO!ByQ!0LrO1G.uO!CUQpO1G.uO!C^QMhO1G.uO$0YQ`O1G0uO$0_Q`O'#CiO$0jQ`O'#KeO$0rQ`O,5=|O$0wQ`O'#KeO$0|Q`O'#KeO$1[Q`O'#JRO$1jQ`O,5AOO$1rQ!fO1G1iOOQ!0Lf1G1k1G1kO9kQ`O1G3fO@zQ`O1G3fO$1yQ`O1G3fO$2OQ`O1G3fO!DiQ`O1G3fO9uQ!0LrO1G3fOOQ[1G3f1G3fO!EcQ`O1G3UO!&zQMhO1G3RO$2TQ`O1G3ROOQ[1G3S1G3SO!&zQMhO1G3SO$2YQ`O1G3SO$2bQpO'#HQOOQ[1G3U1G3UO!6_QpO'#I}O!EhQ!bO1G3XOOQ[1G3X1G3XOOQ[,5=r,5=rO$2jQMhO,5=tO9kQ`O,5=tO$%dQ`O,5=vO9`Q`O,5=vO!CUQpO,5=vO!C^QMhO,5=vO:dQMhO,5=vO$2xQ`O'#KcO$3TQ`O,5=wOOQ[1G.k1G.kO$3YQ!0LrO1G.kO@zQ`O1G.kO$3eQ`O1G.kO9uQ!0LrO1G.kO$5mQ!fO,5AQO$5zQ`O,5AQO9eQ`O,5AQO$6VQlO,5>PO$6^Q`O,5>POOQ[1G3i1G3iO`QlO1G3iOOQ[1G3o1G3oOOQ[1G3q1G3qO?TQ`O1G3sO$6cQlO1G3uO$:gQlO'#HtOOQ[1G3x1G3xO$:tQ`O'#HzO?YQ`O'#H|OOQ[1G4O1G4OO$:|QlO1G4OO9uQ!0LrO1G4UOOQ[1G4W1G4WOOQ!0Lb'#G_'#G_O9uQ!0LrO1G4YO9uQ!0LrO1G4[O$?TQ`O,5@bO!)[QlO,5;`O9eQ`O,5;`O?YQ`O,5:XO!)[QlO,5:XO!CUQpO,5:XO$?YQ?MtO,5:XOOQO,5;`,5;`O$?dQpO'#IeO$?zQ`O,5@aOOQ!0Lf1G/r1G/rO$@SQpO'#IkO$@^Q`O,5@pOOQ!0Lb1G0y1G0yO#$`QpO,5:XOOQO'#Ig'#IgO$@fQpO,5:qOOQ!0Ln,5:q,5:qO#(ZQ`O1G0ZOOQ!0Lf1G0Z1G0ZO%[QlO1G0ZOOQ!0Lf1G0t1G0tO?YQ`O1G0tO!CUQpO1G0tO!C^QMhO1G0tOOQ!0Lb1G5|1G5|O!ByQ!0LrO1G0^OOQO1G0m1G0mO%[QlO1G0mO$@mQ!0LrO1G0mO$@xQ!0LrO1G0mO!CUQpO1G0^ODWQpO1G0^O$AWQ!0LrO1G0mOOQO1G0^1G0^O$AlQ!0MxO1G0mPOOO-E<[-E<[POOO1G.h1G.hOOOO1G/i1G/iO$AvQ!bO,5<iO$BOQ!fO1G4jOOQO1G4p1G4pO%[QlO,5?OO$BYQ`O1G5zO$BbQ`O1G6YO$BjQ!fO1G6ZO9eQ`O,5?UO$BtQ!0MxO1G6WO%[QlO1G6WO$CUQ!0LrO1G6WO$CgQ`O1G6VO$CgQ`O1G6VO9eQ`O1G6VO$CoQ`O,5?XO9eQ`O,5?XOOQO,5?X,5?XO$DTQ`O,5?XO$+YQ`O,5?XOOQO-E<k-E<kOOQS1G0a1G0aOOQS1G0c1G0cO#.lQ`O1G0cOOQ[7+(e7+(eO!&zQMhO7+(eO%[QlO7+(eO$DcQ`O7+(eO$DnQMhO7+(eO$D|Q!0MzO,5=XO$GXQ!0MzO,5=ZO$IdQ!0MzO,5=XO$KuQ!0MzO,5=ZO$NWQ!0MzO,59uO%!]Q!0MzO,5<kO%$hQ!0MzO,5<mO%&sQ!0MzO,5<{OOQ!0Lf7+&a7+&aO%)UQ!0MxO7+&aO%)xQlO'#IfO%*VQ`O,5@cO%*_Q!fO,5@cOOQ!0Lf1G0P1G0PO%*iQ`O7+&jOOQ!0Lf7+&j7+&jO%*nQ?MtO,5:fO%[QlO7+&zO%*xQ?MtO,5:bO%+VQ?MtO,5:jO%+aQ?MtO,5:lO%+kQMhO'#IiO%+uQ`O,5@hOOQ!0Lh1G0d1G0dOOQO1G1r1G1rOOQO1G1s1G1sO%+}Q!jO,5<ZO!)[QlO,5<YOOQO-E<l-E<lOOQ!0Lf7+'Y7+'YOOOW7+'e7+'eOOOW1G1|1G1|O%,YQ`O1G1|OOQ!0Lf1G2O1G2OOOOO,59o,59oO%,_Q!dO,59oOOOO-E<`-E<`OOQ!0Lh1G/X1G/XO%,fQ!0MxO7+'kOOQ!0Lh,5?^,5?^O%-YQMhO1G2fP%-aQ`O'#IrPOQ!0Lh-E<p-E<pO%-}QMjO,5?aOOQ!0Lh-E<s-E<sO%.pQMjO,5?cOOQ!0Lh-E<u-E<uO%.zQ!dO1G2wO%/RQ!dO'#CrO%/iQMhO'#KSO$$wQlO'#JvOOQ!0Lh1G2_1G2_O%/sQ`O'#IqO%0[Q`O,5@vO%0[Q`O,5@vO%0dQ`O,5@vO%0oQ`O,5@vOOQO1G2a1G2aO%0}QMjO1G2`O$+YQ`O'#K[O!,TQMhO1G2`O%1_Q(CWO'#IsO%1lQ`O,5@wO!&zQMhO,5@wO%1tQ!dO,5@wOOQ!0Lh1G2d1G2dO%4UQ!fO'#CiO%4`Q`O,5=POOQ!0Lb,5<},5<}O%4hQpO,5<}OOQ!0Lb,5=O,5=OOCwQ`O,5<}O%4sQpO,5<}OOQ!0Lb,5=R,5=RO$+YQ`O,5=VOOQO,5?`,5?`OOQO-E<r-E<rOOQ!0Lp1G2h1G2hO#$`QpO,5<}O$$wQlO,5=PO%5RQ`O,5=OO%5^QpO,5=OO!,TQMhO'#IuO%6WQMjO1G2sO!,TQMhO'#IwO%6yQMjO1G2uO%7TQMjO1G5qO%7_QMjO1G5qOOQO,5?e,5?eOOQO-E<w-E<wOOQO1G.{1G.{O!,TQMhO1G5qO!,TQMhO1G5qO!:]QpO,59wO%[QlO,59wOOQ!0Lh,5<j,5<jO%7lQ`O1G2ZO!,TQMhO1G2bO%7qQ!0MxO7+'mOOQ!0Lf7+'m7+'mO!$wQlO7+'mO%8eQ`O,5;`OOQ!0Lb,5?g,5?gOOQ!0Lb-E<y-E<yO%8jQ!dO'#K^O#(ZQ`O7+(eO4UQ!fO7+(eO$DfQ`O7+(eO%8tQ!0MvO'#CiO%9XQ!0MvO,5=SO%9lQ`O,5=SO%9tQ`O,5=SOOQ!0Lb1G5o1G5oOOQ[7+$a7+$aO!ByQ!0LrO7+$aO!CUQpO7+$aO!$wQlO7+&aO%9yQ`O'#JQO%:bQ`O,5APOOQO1G3h1G3hO9kQ`O,5APO%:bQ`O,5APO%:jQ`O,5APOOQO,5?m,5?mOOQO-E=P-E=POOQ!0Lf7+'T7+'TO%:oQ`O7+)QO9uQ!0LrO7+)QO9kQ`O7+)QO@zQ`O7+)QO%:tQ`O7+)QOOQ[7+)Q7+)QOOQ[7+(p7+(pO%:yQ!0MvO7+(mO!&zQMhO7+(mO!E^Q`O7+(nOOQ[7+(n7+(nO!&zQMhO7+(nO%;TQ`O'#KbO%;`Q`O,5=lOOQO,5?i,5?iOOQO-E<{-E<{OOQ[7+(s7+(sO%<rQpO'#HZOOQ[1G3`1G3`O!&zQMhO1G3`O%[QlO1G3`O%<yQ`O1G3`O%=UQMhO1G3`O9uQ!0LrO1G3bO$%dQ`O1G3bO9`Q`O1G3bO!CUQpO1G3bO!C^QMhO1G3bO%=dQ`O'#JPO%=xQ`O,5@}O%>QQpO,5@}OOQ!0Lb1G3c1G3cOOQ[7+$V7+$VO@zQ`O7+$VO9uQ!0LrO7+$VO%>]Q`O7+$VO%[QlO1G6lO%[QlO1G6mO%>bQ!0LrO1G6lO%>lQlO1G3kO%>sQ`O1G3kO%>xQlO1G3kOOQ[7+)T7+)TO9uQ!0LrO7+)_O`QlO7+)aOOQ['#Kh'#KhOOQ['#JS'#JSO%?PQlO,5>`OOQ[,5>`,5>`O%[QlO'#HuO%?^Q`O'#HwOOQ[,5>f,5>fO9eQ`O,5>fOOQ[,5>h,5>hOOQ[7+)j7+)jOOQ[7+)p7+)pOOQ[7+)t7+)tOOQ[7+)v7+)vO%?cQpO1G5|O%?}Q?MtO1G0zO%@XQ`O1G0zOOQO1G/s1G/sO%@dQ?MtO1G/sO?YQ`O1G/sO!)[QlO'#DmOOQO,5?P,5?POOQO-E<c-E<cOOQO,5?V,5?VOOQO-E<i-E<iO!CUQpO1G/sOOQO-E<e-E<eOOQ!0Ln1G0]1G0]OOQ!0Lf7+%u7+%uO#(ZQ`O7+%uOOQ!0Lf7+&`7+&`O?YQ`O7+&`O!CUQpO7+&`OOQO7+%x7+%xO$AlQ!0MxO7+&XOOQO7+&X7+&XO%[QlO7+&XO%@nQ!0LrO7+&XO!ByQ!0LrO7+%xO!CUQpO7+%xO%@yQ!0LrO7+&XO%AXQ!0MxO7++rO%[QlO7++rO%AiQ`O7++qO%AiQ`O7++qOOQO1G4s1G4sO9eQ`O1G4sO%AqQ`O1G4sOOQS7+%}7+%}O#(ZQ`O<<LPO4UQ!fO<<LPO%BPQ`O<<LPOOQ[<<LP<<LPO!&zQMhO<<LPO%[QlO<<LPO%BXQ`O<<LPO%BdQ!0MzO,5?aO%DoQ!0MzO,5?cO%FzQ!0MzO1G2`O%I]Q!0MzO1G2sO%KhQ!0MzO1G2uO%MsQ!fO,5?QO%[QlO,5?QOOQO-E<d-E<dO%M}Q`O1G5}OOQ!0Lf<<JU<<JUO%NVQ?MtO1G0uO&!^Q?MtO1G1PO&!eQ?MtO1G1PO&$fQ?MtO1G1PO&$mQ?MtO1G1PO&&nQ?MtO1G1PO&(oQ?MtO1G1PO&(vQ?MtO1G1PO&(}Q?MtO1G1PO&+OQ?MtO1G1PO&+VQ?MtO1G1PO&+^Q!0MxO<<JfO&-UQ?MtO1G1PO&.RQ?MvO1G1PO&/UQ?MvO'#JlO&1[Q?MtO1G1cO&1iQ?MtO1G0UO&1sQMjO,5?TOOQO-E<g-E<gO!)[QlO'#FqOOQO'#KZ'#KZOOQO1G1u1G1uO&1}Q`O1G1tO&2SQ?MtO,5?[OOOW7+'h7+'hOOOO1G/Z1G/ZO&2^Q!dO1G4xOOQ!0Lh7+(Q7+(QP!&zQMhO,5?^O!,TQMhO7+(cO&2eQ`O,5?]O9eQ`O,5?]O$+YQ`O,5?]OOQO-E<o-E<oO&2sQ`O1G6bO&2sQ`O1G6bO&2{Q`O1G6bO&3WQMjO7+'zO&3hQ!dO,5?_O&3rQ`O,5?_O!&zQMhO,5?_OOQO-E<q-E<qO&3wQ!dO1G6cO&4RQ`O1G6cO&4ZQ`O1G2kO!&zQMhO1G2kOOQ!0Lb1G2i1G2iOOQ!0Lb1G2j1G2jO%4hQpO1G2iO!CUQpO1G2iOCwQ`O1G2iOOQ!0Lb1G2q1G2qO&4`QpO1G2iO&4nQ`O1G2kO$+YQ`O1G2jOCwQ`O1G2jO$$wQlO1G2kO&4vQ`O1G2jO&5jQMjO,5?aOOQ!0Lh-E<t-E<tO&6]QMjO,5?cOOQ!0Lh-E<v-E<vO!,TQMhO7++]O&6gQMjO7++]O&6qQMjO7++]OOQ!0Lh1G/c1G/cO&7OQ`O1G/cOOQ!0Lh7+'u7+'uO&7TQMjO7+'|O&7eQ!0MxO<<KXOOQ!0Lf<<KX<<KXO&8XQ`O1G0zO!&zQMhO'#IzO&8^Q`O,5@xO&:`Q!fO<<LPO!&zQMhO1G2nO&:gQ!0LrO1G2nOOQ[<<G{<<G{O!ByQ!0LrO<<G{O&:xQ!0MxO<<I{OOQ!0Lf<<I{<<I{OOQO,5?l,5?lO&;lQ`O,5?lO&;qQ`O,5?lOOQO-E=O-E=OO&<PQ`O1G6kO&<PQ`O1G6kO9kQ`O1G6kO@zQ`O<<LlOOQ[<<Ll<<LlO&<XQ`O<<LlO9uQ!0LrO<<LlO9kQ`O<<LlOOQ[<<LX<<LXO%:yQ!0MvO<<LXOOQ[<<LY<<LYO!E^Q`O<<LYO&<^QpO'#I|O&<iQ`O,5@|O!)[QlO,5@|OOQ[1G3W1G3WOOQO'#JO'#JOO9uQ!0LrO'#JOO&<qQpO,5=uOOQ[,5=u,5=uO&<xQpO'#EgO&=PQpO'#GeO&=UQ`O7+(zO&=ZQ`O7+(zOOQ[7+(z7+(zO!&zQMhO7+(zO%[QlO7+(zO&=cQ`O7+(zOOQ[7+(|7+(|O9uQ!0LrO7+(|O$%dQ`O7+(|O9`Q`O7+(|O!CUQpO7+(|O&=nQ`O,5?kOOQO-E<}-E<}OOQO'#H^'#H^O&=yQ`O1G6iO9uQ!0LrO<<GqOOQ[<<Gq<<GqO@zQ`O<<GqO&>RQ`O7+,WO&>WQ`O7+,XO%[QlO7+,WO%[QlO7+,XOOQ[7+)V7+)VO&>]Q`O7+)VO&>bQlO7+)VO&>iQ`O7+)VOOQ[<<Ly<<LyOOQ[<<L{<<L{OOQ[-E=Q-E=QOOQ[1G3z1G3zO&>nQ`O,5>aOOQ[,5>c,5>cO&>sQ`O1G4QO9eQ`O7+&fO!)[QlO7+&fOOQO7+%_7+%_O&>xQ?MtO1G6ZO?YQ`O7+%_OOQ!0Lf<<Ia<<IaOOQ!0Lf<<Iz<<IzO?YQ`O<<IzOOQO<<Is<<IsO$AlQ!0MxO<<IsO%[QlO<<IsOOQO<<Id<<IdO!ByQ!0LrO<<IdO&?SQ!0LrO<<IsO&?_Q!0MxO<= ^O&?oQ`O<= ]OOQO7+*_7+*_O9eQ`O7+*_OOQ[ANAkANAkO&?wQ!fOANAkO!&zQMhOANAkO#(ZQ`OANAkO4UQ!fOANAkO&@OQ`OANAkO%[QlOANAkO&@WQ!0MzO7+'zO&BiQ!0MzO,5?aO&DtQ!0MzO,5?cO&GPQ!0MzO7+'|O&IbQ!fO1G4lO&IlQ?MtO7+&aO&KpQ?MvO,5=XO&MwQ?MvO,5=ZO&NXQ?MvO,5=XO&NiQ?MvO,5=ZO&NyQ?MvO,59uO'#PQ?MvO,5<kO'%SQ?MvO,5<mO''hQ?MvO,5<{O')^Q?MtO7+'kO')kQ?MtO7+'mO')xQ`O,5<]OOQO7+'`7+'`OOQ!0Lh7+*d7+*dO')}QMjO<<K}OOQO1G4w1G4wO'*UQ`O1G4wO'*aQ`O1G4wO'*oQ`O7++|O'*oQ`O7++|O!&zQMhO1G4yO'*wQ!dO1G4yO'+RQ`O7++}O'+ZQ`O7+(VO'+fQ!dO7+(VOOQ!0Lb7+(T7+(TOOQ!0Lb7+(U7+(UO!CUQpO7+(TOCwQ`O7+(TO'+pQ`O7+(VO!&zQMhO7+(VO$+YQ`O7+(UO'+uQ`O7+(VOCwQ`O7+(UO'+}QMjO<<NwO!,TQMhO<<NwOOQ!0Lh7+$}7+$}O',XQ!dO,5?fOOQO-E<x-E<xO',cQ!0MvO7+(YO!&zQMhO7+(YOOQ[AN=gAN=gO9kQ`O1G5WOOQO1G5W1G5WO',sQ`O1G5WO',xQ`O7+,VO',xQ`O7+,VO9uQ!0LrOANBWO@zQ`OANBWOOQ[ANBWANBWO'-QQ`OANBWOOQ[ANAsANAsOOQ[ANAtANAtO'-VQ`O,5?hOOQO-E<z-E<zO'-bQ?MtO1G6hOOQO,5?j,5?jOOQO-E<|-E<|OOQ[1G3a1G3aO'-lQ`O,5=POOQ[<<Lf<<LfO!&zQMhO<<LfO&=UQ`O<<LfO'-qQ`O<<LfO%[QlO<<LfOOQ[<<Lh<<LhO9uQ!0LrO<<LhO$%dQ`O<<LhO9`Q`O<<LhO'-yQpO1G5VO'.UQ`O7+,TOOQ[AN=]AN=]O9uQ!0LrOAN=]OOQ[<= r<= rOOQ[<= s<= sO'.^Q`O<= rO'.cQ`O<= sOOQ[<<Lq<<LqO'.hQ`O<<LqO'.mQlO<<LqOOQ[1G3{1G3{O?YQ`O7+)lO'.tQ`O<<JQO'/PQ?MtO<<JQOOQO<<Hy<<HyOOQ!0LfAN?fAN?fOOQOAN?_AN?_O$AlQ!0MxOAN?_OOQOAN?OAN?OO%[QlOAN?_OOQO<<My<<MyOOQ[G27VG27VO!&zQMhOG27VO#(ZQ`OG27VO'/ZQ!fOG27VO4UQ!fOG27VO'/bQ`OG27VO'/jQ?MtO<<JfO'/wQ?MvO1G2`O'1mQ?MvO,5?aO'3pQ?MvO,5?cO'5sQ?MvO1G2sO'7vQ?MvO1G2uO'9yQ?MtO<<KXO':WQ?MtO<<I{OOQO1G1w1G1wO!,TQMhOANAiOOQO7+*c7+*cO':eQ`O7+*cO':pQ`O<= hO':xQ!dO7+*eOOQ!0Lb<<Kq<<KqO$+YQ`O<<KqOCwQ`O<<KqO';SQ`O<<KqO!&zQMhO<<KqOOQ!0Lb<<Ko<<KoO!CUQpO<<KoO';_Q!dO<<KqOOQ!0Lb<<Kp<<KpO';iQ`O<<KqO!&zQMhO<<KqO$+YQ`O<<KpO';nQMjOANDcO';xQ!0MvO<<KtOOQO7+*r7+*rO9kQ`O7+*rO'<YQ`O<= qOOQ[G27rG27rO9uQ!0LrOG27rO@zQ`OG27rO!)[QlO1G5SO'<bQ`O7+,SO'<jQ`O1G2kO&=UQ`OANBQOOQ[ANBQANBQO!&zQMhOANBQO'<oQ`OANBQOOQ[ANBSANBSO9uQ!0LrOANBSO$%dQ`OANBSOOQO'#H_'#H_OOQO7+*q7+*qOOQ[G22wG22wOOQ[ANE^ANE^OOQ[ANE_ANE_OOQ[ANB]ANB]O'<wQ`OANB]OOQ[<<MW<<MWO!)[QlOAN?lOOQOG24yG24yO$AlQ!0MxOG24yO#(ZQ`OLD,qOOQ[LD,qLD,qO!&zQMhOLD,qO'<|Q!fOLD,qO'=TQ?MvO7+'zO'>yQ?MvO,5?aO'@|Q?MvO,5?cO'CPQ?MvO7+'|O'DuQMjOG27TOOQO<<M}<<M}OOQ!0LbANA]ANA]O$+YQ`OANA]OCwQ`OANA]O'EVQ!dOANA]OOQ!0LbANAZANAZO'E^Q`OANA]O!&zQMhOANA]O'EiQ!dOANA]OOQ!0LbANA[ANA[OOQO<<N^<<N^OOQ[LD-^LD-^O9uQ!0LrOLD-^O'EsQ?MtO7+*nOOQO'#Gf'#GfOOQ[G27lG27lO&=UQ`OG27lO!&zQMhOG27lOOQ[G27nG27nO9uQ!0LrOG27nOOQ[G27wG27wO'E}Q?MtOG25WOOQOLD*eLD*eOOQ[!$(!]!$(!]O#(ZQ`O!$(!]O!&zQMhO!$(!]O'FXQ!0MzOG27TOOQ!0LbG26wG26wO$+YQ`OG26wO'HjQ`OG26wOCwQ`OG26wO'HuQ!dOG26wO!&zQMhOG26wOOQ[!$(!x!$(!xOOQ[LD-WLD-WO&=UQ`OLD-WOOQ[LD-YLD-YOOQ[!)9Ew!)9EwO#(ZQ`O!)9EwOOQ!0LbLD,cLD,cO$+YQ`OLD,cOCwQ`OLD,cO'H|Q`OLD,cO'IXQ!dOLD,cOOQ[!$(!r!$(!rOOQ[!.K;c!.K;cO'I`Q?MvOG27TOOQ!0Lb!$( }!$( }O$+YQ`O!$( }OCwQ`O!$( }O'KUQ`O!$( }OOQ!0Lb!)9Ei!)9EiO$+YQ`O!)9EiOCwQ`O!)9EiOOQ!0Lb!.K;T!.K;TO$+YQ`O!.K;TOOQ!0Lb!4/0o!4/0oO!)[QlO'#DzO1PQ`O'#EXO'KaQ!fO'#JrO'KhQ!L^O'#DvO'KoQlO'#EOO'KvQ!fO'#CiO'N^Q!fO'#CiO!)[QlO'#EQO'NnQlO,5;ZO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO,5;eO!)[QlO'#IpO(!qQ`O,5<iO!)[QlO,5;eO(!yQMhO,5;eO($dQMhO,5;eO!)[QlO,5;wO!&zQMhO'#GmO(!yQMhO'#GmO!&zQMhO'#GoO(!yQMhO'#GoO1SQ`O'#DZO1SQ`O'#DZO!&zQMhO'#GPO(!yQMhO'#GPO!&zQMhO'#GRO(!yQMhO'#GRO!&zQMhO'#GaO(!yQMhO'#GaO!)[QlO,5:jO($kQpO'#D_O($uQpO'#JvO!)[QlO,5@oO'NnQlO1G0uO(%PQ?MtO'#CiO!)[QlO1G2PO!&zQMhO'#IuO(!yQMhO'#IuO!&zQMhO'#IwO(!yQMhO'#IwO(%ZQ!dO'#CrO!&zQMhO,5<tO(!yQMhO,5<tO'NnQlO1G2RO!)[QlO7+&zO!&zQMhO1G2`O(!yQMhO1G2`O!&zQMhO'#IuO(!yQMhO'#IuO!&zQMhO'#IwO(!yQMhO'#IwO!&zQMhO1G2bO(!yQMhO1G2bO'NnQlO7+'mO'NnQlO7+&aO!&zQMhOANAiO(!yQMhOANAiO(%nQ`O'#EoO(%sQ`O'#EoO(%{Q`O'#F]O(&QQ`O'#EyO(&VQ`O'#KTO(&bQ`O'#KRO(&mQ`O,5;ZO(&rQMjO,5<eO(&yQ`O'#GYO('OQ`O'#GYO('TQ`O,5<eO(']Q`O,5<gO('eQ`O,5;ZO('mQ?MtO1G1`O('tQ`O,5<tO('yQ`O,5<tO((OQ`O,5<vO((TQ`O,5<vO((YQ`O1G2RO((_Q`O1G0uO((dQMjO<<K}O((kQMjO<<K}O((rQMhO'#F|O9`Q`O'#F{OAuQ`O'#EnO!)[QlO,5;tO!3oQ`O'#GYO!3oQ`O'#GYO!3oQ`O'#G[O!3oQ`O'#G[O!,TQMhO7+(cO!,TQMhO7+(cO%.zQ!dO1G2wO%.zQ!dO1G2wO!&zQMhO,5=]O!&zQMhO,5=]",
    stateData: "()x~O'|OS'}OSTOS(ORQ~OPYOQYOSfOY!VOaqOdzOeyOl!POpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_XO!iuO!lZO!oYO!pYO!qYO!svO!uwO!xxO!|]O$W|O$niO%h}O%j!QO%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO%y!UO&W!WO&^!XO&`!YO&b!ZO&d![O&g!]O&m!^O&s!_O&u!`O&w!aO&y!bO&{!cO(TSO(VTO(YUO(aVO(o[O~OWtO~P`OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oa!wOs!nO!S!oO!b!yO!c!vO!d!vO!|<VO#T!pO#U!pO#V!xO#W!pO#X!pO#[!zO#]!zO(U!lO(VTO(YUO(e!mO(o!sO~O(O!{O~OP]XR]X[]Xa]Xj]Xr]X!Q]X!S]X!]]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X'z]X(a]X(r]X(y]X(z]X~O!g%RX~P(qO_!}O(V#PO(W!}O(X#PO~O_#QO(X#PO(Y#PO(Z#QO~Ox#SO!U#TO(b#TO(c#VO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T<ZO(VTO(YUO(aVO(o[O~O![#ZO!]#WO!Y(hP!Y(vP~P+}O!^#cO~P`OPYOQYOSfOd!jOe!iOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(VTO(YUO(aVO(o[O~Op#mO![#iO!|]O#i#lO#j#iO(T<[O!k(sP~P.iO!l#oO(T#nO~O!x#sO!|]O%h#tO~O#k#uO~O!g#vO#k#uO~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!]$_O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~Oa(fX'z(fX'w(fX!k(fX!Y(fX!_(fX%i(fX!g(fX~P1qO#S$dO#`$eO$Q$eOP(gXR(gX[(gXj(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX!_(gX%i(gX~Oa(gX'z(gX'w(gX!Y(gX!k(gXv(gX!g(gX~P4UO#`$eO~O$]$hO$_$gO$f$mO~OSfO!_$nO$i$oO$k$qO~Oh%VOj%dOk%dOp%WOr%XOs$tOt$tOz%YO|%ZO!O%]O!S${O!_$|O!i%bO!l$xO#j%cO$W%`O$t%^O$v%_O$y%aO(T$sO(VTO(YUO(a$uO(y$}O(z%POg(^P~Ol%[O~P7eO!l%eO~O!S%hO!_%iO(T%gO~O!g%mO~Oa%nO'z%nO~O!Q%rO~P%[O(U!lO~P%[O%n%vO~P%[Oh%VO!l%eO(T%gO(U!lO~Oe%}O!l%eO(T%gO~Oj$RO~O!_&PO(T%gO(U!lO(VTO(YUO`)WP~O!Q&SO!l&RO%j&VO&T&WO~P;SO!x#sO~O%s&YO!S)SX!_)SX(T)SX~O(T&ZO~Ol!PO!u&`O%j!QO%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO~Od&eOe&dO!x&bO%h&cO%{&aO~P<bOd&hOeyOl!PO!_&gO!u&`O!xxO!|]O%h}O%l!OO%m!OO%n!OO%q!RO%s!SO%v!TO%w!TO%y!UO~Ob&kO#`&nO%j&iO(U!lO~P=gO!l&oO!u&sO~O!l#oO~O!_XO~Oa%nO'x&{O'z%nO~Oa%nO'x'OO'z%nO~Oa%nO'x'QO'z%nO~O'w]X!Y]Xv]X!k]X&[]X!_]X%i]X!g]X~P(qO!b'_O!c'WO!d'WO(U!lO(VTO(YUO~Os'UO!S'TO!['XO(e'SO!^(iP!^(xP~P@nOn'bO!_'`O(T%gO~Oe'gO!l%eO(T%gO~O!Q&SO!l&RO~Os!nO!S!oO!|<VO#T!pO#U!pO#W!pO#X!pO(U!lO(VTO(YUO(e!mO(o!sO~O!b'mO!c'lO!d'lO#V!pO#['nO#]'nO~PBYOa%nOh%VO!g#vO!l%eO'z%nO(r'pO~O!p'tO#`'rO~PChOs!nO!S!oO(VTO(YUO(e!mO(o!sO~O!_XOs(mX!S(mX!b(mX!c(mX!d(mX!|(mX#T(mX#U(mX#V(mX#W(mX#X(mX#[(mX#](mX(U(mX(V(mX(Y(mX(e(mX(o(mX~O!c'lO!d'lO(U!lO~PDWO(P'xO(Q'xO(R'zO~O_!}O(V'|O(W!}O(X'|O~O_#QO(X'|O(Y'|O(Z#QO~Ov(OO~P%[Ox#SO!U#TO(b#TO(c(RO~O![(TO!Y'WX!Y'^X!]'WX!]'^X~P+}O!](VO!Y(hX~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!](VO!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~O!Y(hX~PHRO!Y([O~O!Y(uX!](uX!g(uX!k(uX(r(uX~O#`(uX#k#dX!^(uX~PJUO#`(]O!Y(wX!](wX~O!](^O!Y(vX~O!Y(aO~O#`$eO~PJUO!^(bO~P`OR#zO!Q#yO!S#{O!l#xO(aVOP!na[!naj!nar!na!]!na!p!na#R!na#n!na#o!na#p!na#q!na#r!na#s!na#t!na#u!na#v!na#x!na#z!na#{!na(r!na(y!na(z!na~Oa!na'z!na'w!na!Y!na!k!nav!na!_!na%i!na!g!na~PKlO!k(cO~O!g#vO#`(dO(r'pO!](tXa(tX'z(tX~O!k(tX~PNXO!S%hO!_%iO!|]O#i(iO#j(hO(T%gO~O!](jO!k(sX~O!k(lO~O!S%hO!_%iO#j(hO(T%gO~OP(gXR(gX[(gXj(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX~O!g#vO!k(gX~P! uOR(nO!Q(mO!l#xO#S$dO!|!{a!S!{a~O!x!{a%h!{a!_!{a#i!{a#j!{a(T!{a~P!#vO!x(rO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_XO!iuO!lZO!oYO!pYO!qYO!svO!u!gO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~O#k(xO~O![(zO!k(kP~P%[O(e(|O(o[O~O!S)OO!l#xO(e(|O(o[O~OP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_!eO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(T)]O(VTO(YUO(aVO(o[O~O!]$_Oa$qa'z$qa'w$qa!k$qa!Y$qa!_$qa%i$qa!g$qa~Ol)dO~P!&zOh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O%]O!S${O!_$|O!i%bO!l$xO#j%cO$W%`O$t%^O$v%_O$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~Og(pP~P!,TO!Q)iO!g)hO!_$^X$Z$^X$]$^X$_$^X$f$^X~O!g)hO!_({X$Z({X$]({X$_({X$f({X~O!Q)iO~P!.^O!Q)iO!_({X$Z({X$]({X$_({X$f({X~O!_)kO$Z)oO$])jO$_)jO$f)pO~O![)sO~P!)[O$]$hO$_$gO$f)wO~On$zX!Q$zX#S$zX'y$zX(y$zX(z$zX~OgmXg$zXnmX!]mX#`mX~P!0SOx)yO(b)zO(c)|O~On*VO!Q*OO'y*PO(y$}O(z%PO~Og)}O~P!1WOg*WO~Oh%VOr%XOs$tOt$tOz%YO|%ZO!O<sO!S*YO!_*ZO!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(VTO(YUO(a$uO(y$}O(z%PO~Op*`O![*^O(T*XO!k)OP~P!1uO#k*aO~O!l*bO~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(T*dO(VTO(YUO(a$uO(y$}O(z%PO~O![*gO!Y)PP~P!3tOr*sOs!nO!S*iO!b*qO!c*kO!d*kO!l*bO#[*rO%`*mO(U!lO(VTO(YUO(e!mO~O!^*pO~P!5iO#S$dOn(`X!Q(`X'y(`X(y(`X(z(`X!](`X#`(`X~Og(`X$O(`X~P!6kOn*xO#`*wOg(_X!](_X~O!]*yOg(^X~Oj%dOk%dOl%dO(T&ZOg(^P~Os*|O~Og)}O(T&ZO~O!l+SO~O(T(vO~Op+WO!S%hO![#iO!_%iO!|]O#i#lO#j#iO(T%gO!k(sP~O!g#vO#k+XO~O!S%hO![+ZO!](^O!_%iO(T%gO!Y(vP~Os'[O!S+]O![+[O(VTO(YUO(e(|O~O!^(xP~P!9|O!]+^Oa)TX'z)TX~OP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO#z$WO#{$XO(aVO(r$YO(y#|O(z#}O~Oa!ja!]!ja'z!ja'w!ja!Y!ja!k!jav!ja!_!ja%i!ja!g!ja~P!:tOR#zO!Q#yO!S#{O!l#xO(aVOP!ra[!raj!rar!ra!]!ra!p!ra#R!ra#n!ra#o!ra#p!ra#q!ra#r!ra#s!ra#t!ra#u!ra#v!ra#x!ra#z!ra#{!ra(r!ra(y!ra(z!ra~Oa!ra'z!ra'w!ra!Y!ra!k!rav!ra!_!ra%i!ra!g!ra~P!=[OR#zO!Q#yO!S#{O!l#xO(aVOP!ta[!taj!tar!ta!]!ta!p!ta#R!ta#n!ta#o!ta#p!ta#q!ta#r!ta#s!ta#t!ta#u!ta#v!ta#x!ta#z!ta#{!ta(r!ta(y!ta(z!ta~Oa!ta'z!ta'w!ta!Y!ta!k!tav!ta!_!ta%i!ta!g!ta~P!?rOh%VOn+gO!_'`O%i+fO~O!g+iOa(]X!_(]X'z(]X!](]X~Oa%nO!_XO'z%nO~Oh%VO!l%eO~Oh%VO!l%eO(T%gO~O!g#vO#k(xO~Ob+tO%j+uO(T+qO(VTO(YUO!^)XP~O!]+vO`)WX~O[+zO~O`+{O~O!_&PO(T%gO(U!lO`)WP~O%j,OO~P;SOh%VO#`,SO~Oh%VOn,VO!_$|O~O!_,XO~O!Q,ZO!_XO~O%n%vO~O!x,`O~Oe,eO~Ob,fO(T#nO(VTO(YUO!^)VP~Oe%}O~O%j!QO(T&ZO~P=gO[,kO`,jO~OPYOQYOSfOdzOeyOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!iuO!lZO!oYO!pYO!qYO!svO!xxO!|]O$niO%h}O(VTO(YUO(aVO(o[O~O!_!eO!u!gO$W!kO(T!dO~P!FyO`,jOa%nO'z%nO~OPYOQYOSfOd!jOe!iOpkOrYOskOtkOzkO|YO!OYO!SWO!WkO!XkO!_!eO!iuO!lZO!oYO!pYO!qYO!svO!x!hO$W!kO$niO(T!dO(VTO(YUO(aVO(o[O~Oa,pOl!OO!uwO%l!OO%m!OO%n!OO~P!IcO!l&oO~O&^,vO~O!_,xO~O&o,zO&q,{OP&laQ&laS&laY&laa&lad&lae&lal&lap&lar&las&lat&laz&la|&la!O&la!S&la!W&la!X&la!_&la!i&la!l&la!o&la!p&la!q&la!s&la!u&la!x&la!|&la$W&la$n&la%h&la%j&la%l&la%m&la%n&la%q&la%s&la%v&la%w&la%y&la&W&la&^&la&`&la&b&la&d&la&g&la&m&la&s&la&u&la&w&la&y&la&{&la'w&la(T&la(V&la(Y&la(a&la(o&la!^&la&e&lab&la&j&la~O(T-QO~Oh!eX!]!RX!^!RX!g!RX!g!eX!l!eX#`!RX~O!]!eX!^!eX~P#!iO!g-VO#`-UOh(jX!]#hX!^#hX!g(jX!l(jX~O!](jX!^(jX~P##[Oh%VO!g-XO!l%eO!]!aX!^!aX~Os!nO!S!oO(VTO(YUO(e!mO~OP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_!eO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(VTO(YUO(aVO(o[O~O(T=QO~P#$qO!]-]O!^(iX~O!^-_O~O!g-VO#`-UO!]#hX!^#hX~O!]-`O!^(xX~O!^-bO~O!c-cO!d-cO(U!lO~P#$`O!^-fO~P'_On-iO!_'`O~O!Y-nO~Os!{a!b!{a!c!{a!d!{a#T!{a#U!{a#V!{a#W!{a#X!{a#[!{a#]!{a(U!{a(V!{a(Y!{a(e!{a(o!{a~P!#vO!p-sO#`-qO~PChO!c-uO!d-uO(U!lO~PDWOa%nO#`-qO'z%nO~Oa%nO!g#vO#`-qO'z%nO~Oa%nO!g#vO!p-sO#`-qO'z%nO(r'pO~O(P'xO(Q'xO(R-zO~Ov-{O~O!Y'Wa!]'Wa~P!:tO![.PO!Y'WX!]'WX~P%[O!](VO!Y(ha~O!Y(ha~PHRO!](^O!Y(va~O!S%hO![.TO!_%iO(T%gO!Y'^X!]'^X~O#`.VO!](ta!k(taa(ta'z(ta~O!g#vO~P#,wO!](jO!k(sa~O!S%hO!_%iO#j.ZO(T%gO~Op.`O!S%hO![.]O!_%iO!|]O#i._O#j.]O(T%gO!]'aX!k'aX~OR.dO!l#xO~Oh%VOn.gO!_'`O%i.fO~Oa#ci!]#ci'z#ci'w#ci!Y#ci!k#civ#ci!_#ci%i#ci!g#ci~P!:tOn>]O!Q*OO'y*PO(y$}O(z%PO~O#k#_aa#_a#`#_a'z#_a!]#_a!k#_a!_#_a!Y#_a~P#/sO#k(`XP(`XR(`X[(`Xa(`Xj(`Xr(`X!S(`X!l(`X!p(`X#R(`X#n(`X#o(`X#p(`X#q(`X#r(`X#s(`X#t(`X#u(`X#v(`X#x(`X#z(`X#{(`X'z(`X(a(`X(r(`X!k(`X!Y(`X'w(`Xv(`X!_(`X%i(`X!g(`X~P!6kO!].tO!k(kX~P!:tO!k.wO~O!Y.yO~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O(aVO[#mia#mij#mir#mi!]#mi#R#mi#o#mi#p#mi#q#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#n#mi~P#3cO#n$OO~P#3cOP$[OR#zOr$aO!Q#yO!S#{O!l#xO!p$[O#n$OO#o$PO#p$PO#q$PO(aVO[#mia#mij#mi!]#mi#R#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#r#mi~P#6QO#r$QO~P#6QOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO(aVOa#mi!]#mi#x#mi#z#mi#{#mi'z#mi(r#mi(y#mi(z#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#v#mi~P#8oOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO(aVO(z#}Oa#mi!]#mi#z#mi#{#mi'z#mi(r#mi(y#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#x$UO~P#;VO#x#mi~P#;VO#v$SO~P#8oOP$[OR#zO[$cOj$ROr$aO!Q#yO!S#{O!l#xO!p$[O#R$RO#n$OO#o$PO#p$PO#q$PO#r$QO#s$RO#t$RO#u$bO#v$SO#x$UO(aVO(y#|O(z#}Oa#mi!]#mi#{#mi'z#mi(r#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~O#z#mi~P#={O#z$WO~P#={OP]XR]X[]Xj]Xr]X!Q]X!S]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X!]]X!^]X~O$O]X~P#@jOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO#x<eO#z<gO#{<hO(aVO(r$YO(y#|O(z#}O~O$O.{O~P#BwO#S$dO#`<nO$Q<nO$O(gX!^(gX~P! uOa'da!]'da'z'da'w'da!k'da!Y'dav'da!_'da%i'da!g'da~P!:tO[#mia#mij#mir#mi!]#mi#R#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi'z#mi(r#mi'w#mi!Y#mi!k#miv#mi!_#mi%i#mi!g#mi~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O#n$OO#o$PO#p$PO#q$PO(aVO(y#mi(z#mi~P#EyOn>]O!Q*OO'y*PO(y$}O(z%POP#miR#mi!S#mi!l#mi!p#mi#n#mi#o#mi#p#mi#q#mi(a#mi~P#EyO!]/POg(pX~P!1WOg/RO~Oa$Pi!]$Pi'z$Pi'w$Pi!Y$Pi!k$Piv$Pi!_$Pi%i$Pi!g$Pi~P!:tO$]/SO$_/SO~O$]/TO$_/TO~O!g)hO#`/UO!_$cX$Z$cX$]$cX$_$cX$f$cX~O![/VO~O!_)kO$Z/XO$])jO$_)jO$f/YO~O!]<iO!^(fX~P#BwO!^/ZO~O!g)hO$f({X~O$f/]O~Ov/^O~P!&zOx)yO(b)zO(c/aO~O!S/dO~O(y$}On%aa!Q%aa'y%aa(z%aa!]%aa#`%aa~Og%aa$O%aa~P#L{O(z%POn%ca!Q%ca'y%ca(y%ca!]%ca#`%ca~Og%ca$O%ca~P#MnO!]fX!gfX!kfX!k$zX(rfX~P!0SOp%WO![/mO!](^O(T/lO!Y(vP!Y)PP~P!1uOr*sO!b*qO!c*kO!d*kO!l*bO#[*rO%`*mO(U!lO(VTO(YUO~Os<}O!S/nO![+[O!^*pO(e<|O!^(xP~P$ [O!k/oO~P#/sO!]/pO!g#vO(r'pO!k)OX~O!k/uO~OnoX!QoX'yoX(yoX(zoX~O!g#vO!koX~P$#OOp/wO!S%hO![*^O!_%iO(T%gO!k)OP~O#k/xO~O!Y$zX!]$zX!g%RX~P!0SO!]/yO!Y)PX~P#/sO!g/{O~O!Y/}O~OpkO(T0OO~P.iOh%VOr0TO!g#vO!l%eO(r'pO~O!g+iO~Oa%nO!]0XO'z%nO~O!^0ZO~P!5iO!c0[O!d0[O(U!lO~P#$`Os!nO!S0]O(VTO(YUO(e!mO~O#[0_O~Og%aa!]%aa#`%aa$O%aa~P!1WOg%ca!]%ca#`%ca$O%ca~P!1WOj%dOk%dOl%dO(T&ZOg'mX!]'mX~O!]*yOg(^a~Og0hO~On0jO#`0iOg(_a!](_a~OR0kO!Q0kO!S0lO#S$dOn}a'y}a(y}a(z}a!]}a#`}a~Og}a$O}a~P$(cO!Q*OO'y*POn$sa(y$sa(z$sa!]$sa#`$sa~Og$sa$O$sa~P$)_O!Q*OO'y*POn$ua(y$ua(z$ua!]$ua#`$ua~Og$ua$O$ua~P$*QO#k0oO~Og%Ta!]%Ta#`%Ta$O%Ta~P!1WO!g#vO~O#k0rO~O!]+^Oa)Ta'z)Ta~OR#zO!Q#yO!S#{O!l#xO(aVOP!ri[!rij!rir!ri!]!ri!p!ri#R!ri#n!ri#o!ri#p!ri#q!ri#r!ri#s!ri#t!ri#u!ri#v!ri#x!ri#z!ri#{!ri(r!ri(y!ri(z!ri~Oa!ri'z!ri'w!ri!Y!ri!k!riv!ri!_!ri%i!ri!g!ri~P$+oOh%VOr%XOs$tOt$tOz%YO|%ZO!O<sO!S${O!_$|O!i>VO!l$xO#j<yO$W%`O$t<uO$v<wO$y%aO(VTO(YUO(a$uO(y$}O(z%PO~Op0{O%]0|O(T0zO~P$.VO!g+iOa(]a!_(]a'z(]a!](]a~O#k1SO~O[]X!]fX!^fX~O!]1TO!^)XX~O!^1VO~O[1WO~Ob1YO(T+qO(VTO(YUO~O!_&PO(T%gO`'uX!]'uX~O!]+vO`)Wa~O!k1]O~P!:tO[1`O~O`1aO~O#`1fO~On1iO!_$|O~O(e(|O!^)UP~Oh%VOn1rO!_1oO%i1qO~O[1|O!]1zO!^)VX~O!^1}O~O`2POa%nO'z%nO~O(T#nO(VTO(YUO~O#S$dO#`$eO$Q$eOP(gXR(gX[(gXr(gX!Q(gX!S(gX!](gX!l(gX!p(gX#R(gX#n(gX#o(gX#p(gX#q(gX#r(gX#s(gX#t(gX#u(gX#v(gX#x(gX#z(gX#{(gX(a(gX(r(gX(y(gX(z(gX~Oj2SO&[2TOa(gX~P$3pOj2SO#`$eO&[2TO~Oa2VO~P%[Oa2XO~O&e2[OP&ciQ&ciS&ciY&cia&cid&cie&cil&cip&cir&cis&cit&ciz&ci|&ci!O&ci!S&ci!W&ci!X&ci!_&ci!i&ci!l&ci!o&ci!p&ci!q&ci!s&ci!u&ci!x&ci!|&ci$W&ci$n&ci%h&ci%j&ci%l&ci%m&ci%n&ci%q&ci%s&ci%v&ci%w&ci%y&ci&W&ci&^&ci&`&ci&b&ci&d&ci&g&ci&m&ci&s&ci&u&ci&w&ci&y&ci&{&ci'w&ci(T&ci(V&ci(Y&ci(a&ci(o&ci!^&cib&ci&j&ci~Ob2bO!^2`O&j2aO~P`O!_XO!l2dO~O&q,{OP&liQ&liS&liY&lia&lid&lie&lil&lip&lir&lis&lit&liz&li|&li!O&li!S&li!W&li!X&li!_&li!i&li!l&li!o&li!p&li!q&li!s&li!u&li!x&li!|&li$W&li$n&li%h&li%j&li%l&li%m&li%n&li%q&li%s&li%v&li%w&li%y&li&W&li&^&li&`&li&b&li&d&li&g&li&m&li&s&li&u&li&w&li&y&li&{&li'w&li(T&li(V&li(Y&li(a&li(o&li!^&li&e&lib&li&j&li~O!Y2jO~O!]!aa!^!aa~P#BwOs!nO!S!oO![2pO(e!mO!]'XX!^'XX~P@nO!]-]O!^(ia~O!]'_X!^'_X~P!9|O!]-`O!^(xa~O!^2wO~P'_Oa%nO#`3QO'z%nO~Oa%nO!g#vO#`3QO'z%nO~Oa%nO!g#vO!p3UO#`3QO'z%nO(r'pO~Oa%nO'z%nO~P!:tO!]$_Ov$qa~O!Y'Wi!]'Wi~P!:tO!](VO!Y(hi~O!](^O!Y(vi~O!Y(wi!](wi~P!:tO!](ti!k(tia(ti'z(ti~P!:tO#`3WO!](ti!k(tia(ti'z(ti~O!](jO!k(si~O!S%hO!_%iO!|]O#i3]O#j3[O(T%gO~O!S%hO!_%iO#j3[O(T%gO~On3dO!_'`O%i3cO~Oh%VOn3dO!_'`O%i3cO~O#k%aaP%aaR%aa[%aaa%aaj%aar%aa!S%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa'z%aa(a%aa(r%aa!k%aa!Y%aa'w%aav%aa!_%aa%i%aa!g%aa~P#L{O#k%caP%caR%ca[%caa%caj%car%ca!S%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca'z%ca(a%ca(r%ca!k%ca!Y%ca'w%cav%ca!_%ca%i%ca!g%ca~P#MnO#k%aaP%aaR%aa[%aaa%aaj%aar%aa!S%aa!]%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa'z%aa(a%aa(r%aa!k%aa!Y%aa'w%aa#`%aav%aa!_%aa%i%aa!g%aa~P#/sO#k%caP%caR%ca[%caa%caj%car%ca!S%ca!]%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca'z%ca(a%ca(r%ca!k%ca!Y%ca'w%ca#`%cav%ca!_%ca%i%ca!g%ca~P#/sO#k}aP}a[}aa}aj}ar}a!l}a!p}a#R}a#n}a#o}a#p}a#q}a#r}a#s}a#t}a#u}a#v}a#x}a#z}a#{}a'z}a(a}a(r}a!k}a!Y}a'w}av}a!_}a%i}a!g}a~P$(cO#k$saP$saR$sa[$saa$saj$sar$sa!S$sa!l$sa!p$sa#R$sa#n$sa#o$sa#p$sa#q$sa#r$sa#s$sa#t$sa#u$sa#v$sa#x$sa#z$sa#{$sa'z$sa(a$sa(r$sa!k$sa!Y$sa'w$sav$sa!_$sa%i$sa!g$sa~P$)_O#k$uaP$uaR$ua[$uaa$uaj$uar$ua!S$ua!l$ua!p$ua#R$ua#n$ua#o$ua#p$ua#q$ua#r$ua#s$ua#t$ua#u$ua#v$ua#x$ua#z$ua#{$ua'z$ua(a$ua(r$ua!k$ua!Y$ua'w$uav$ua!_$ua%i$ua!g$ua~P$*QO#k%TaP%TaR%Ta[%Taa%Taj%Tar%Ta!S%Ta!]%Ta!l%Ta!p%Ta#R%Ta#n%Ta#o%Ta#p%Ta#q%Ta#r%Ta#s%Ta#t%Ta#u%Ta#v%Ta#x%Ta#z%Ta#{%Ta'z%Ta(a%Ta(r%Ta!k%Ta!Y%Ta'w%Ta#`%Tav%Ta!_%Ta%i%Ta!g%Ta~P#/sOa#cq!]#cq'z#cq'w#cq!Y#cq!k#cqv#cq!_#cq%i#cq!g#cq~P!:tO![3lO!]'YX!k'YX~P%[O!].tO!k(ka~O!].tO!k(ka~P!:tO!Y3oO~O$O!na!^!na~PKlO$O!ja!]!ja!^!ja~P#BwO$O!ra!^!ra~P!=[O$O!ta!^!ta~P!?rOg']X!]']X~P!,TO!]/POg(pa~OSfO!_4TO$d4UO~O!^4YO~Ov4ZO~P#/sOa$mq!]$mq'z$mq'w$mq!Y$mq!k$mqv$mq!_$mq%i$mq!g$mq~P!:tO!Y4]O~P!&zO!S4^O~O!Q*OO'y*PO(z%POn'ia(y'ia!]'ia#`'ia~Og'ia$O'ia~P%-fO!Q*OO'y*POn'ka(y'ka(z'ka!]'ka#`'ka~Og'ka$O'ka~P%.XO(r$YO~P#/sO!YfX!Y$zX!]fX!]$zX!g%RX#`fX~P!0SOp%WO(T=WO~P!1uOp4bO!S%hO![4aO!_%iO(T%gO!]'eX!k'eX~O!]/pO!k)Oa~O!]/pO!g#vO!k)Oa~O!]/pO!g#vO(r'pO!k)Oa~Og$|i!]$|i#`$|i$O$|i~P!1WO![4jO!Y'gX!]'gX~P!3tO!]/yO!Y)Pa~O!]/yO!Y)Pa~P#/sOP]XR]X[]Xj]Xr]X!Q]X!S]X!Y]X!]]X!l]X!p]X#R]X#S]X#`]X#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X~Oj%YX!g%YX~P%2OOj4oO!g#vO~Oh%VO!g#vO!l%eO~Oh%VOr4tO!l%eO(r'pO~Or4yO!g#vO(r'pO~Os!nO!S4zO(VTO(YUO(e!mO~O(y$}On%ai!Q%ai'y%ai(z%ai!]%ai#`%ai~Og%ai$O%ai~P%5oO(z%POn%ci!Q%ci'y%ci(y%ci!]%ci#`%ci~Og%ci$O%ci~P%6bOg(_i!](_i~P!1WO#`5QOg(_i!](_i~P!1WO!k5VO~Oa$oq!]$oq'z$oq'w$oq!Y$oq!k$oqv$oq!_$oq%i$oq!g$oq~P!:tO!Y5ZO~O!]5[O!_)QX~P#/sOa$zX!_$zX%^]X'z$zX!]$zX~P!0SO%^5_OaoX!_oX'zoX!]oX~P$#OOp5`O(T#nO~O%^5_O~Ob5fO%j5gO(T+qO(VTO(YUO!]'tX!^'tX~O!]1TO!^)Xa~O[5kO~O`5lO~O[5pO~Oa%nO'z%nO~P#/sO!]5uO#`5wO!^)UX~O!^5xO~Or6OOs!nO!S*iO!b!yO!c!vO!d!vO!|<VO#T!pO#U!pO#V!pO#W!pO#X!pO#[5}O#]!zO(U!lO(VTO(YUO(e!mO(o!sO~O!^5|O~P%;eOn6TO!_1oO%i6SO~Oh%VOn6TO!_1oO%i6SO~Ob6[O(T#nO(VTO(YUO!]'sX!^'sX~O!]1zO!^)Va~O(VTO(YUO(e6^O~O`6bO~Oj6eO&[6fO~PNXO!k6gO~P%[Oa6iO~Oa6iO~P%[Ob2bO!^6nO&j2aO~P`O!g6pO~O!g6rOh(ji!](ji!^(ji!g(ji!l(jir(ji(r(ji~O!]#hi!^#hi~P#BwO#`6sO!]#hi!^#hi~O!]!ai!^!ai~P#BwOa%nO#`6|O'z%nO~Oa%nO!g#vO#`6|O'z%nO~O!](tq!k(tqa(tq'z(tq~P!:tO!](jO!k(sq~O!S%hO!_%iO#j7TO(T%gO~O!_'`O%i7WO~On7[O!_'`O%i7WO~O#k'iaP'iaR'ia['iaa'iaj'iar'ia!S'ia!l'ia!p'ia#R'ia#n'ia#o'ia#p'ia#q'ia#r'ia#s'ia#t'ia#u'ia#v'ia#x'ia#z'ia#{'ia'z'ia(a'ia(r'ia!k'ia!Y'ia'w'iav'ia!_'ia%i'ia!g'ia~P%-fO#k'kaP'kaR'ka['kaa'kaj'kar'ka!S'ka!l'ka!p'ka#R'ka#n'ka#o'ka#p'ka#q'ka#r'ka#s'ka#t'ka#u'ka#v'ka#x'ka#z'ka#{'ka'z'ka(a'ka(r'ka!k'ka!Y'ka'w'kav'ka!_'ka%i'ka!g'ka~P%.XO#k$|iP$|iR$|i[$|ia$|ij$|ir$|i!S$|i!]$|i!l$|i!p$|i#R$|i#n$|i#o$|i#p$|i#q$|i#r$|i#s$|i#t$|i#u$|i#v$|i#x$|i#z$|i#{$|i'z$|i(a$|i(r$|i!k$|i!Y$|i'w$|i#`$|iv$|i!_$|i%i$|i!g$|i~P#/sO#k%aiP%aiR%ai[%aia%aij%air%ai!S%ai!l%ai!p%ai#R%ai#n%ai#o%ai#p%ai#q%ai#r%ai#s%ai#t%ai#u%ai#v%ai#x%ai#z%ai#{%ai'z%ai(a%ai(r%ai!k%ai!Y%ai'w%aiv%ai!_%ai%i%ai!g%ai~P%5oO#k%ciP%ciR%ci[%cia%cij%cir%ci!S%ci!l%ci!p%ci#R%ci#n%ci#o%ci#p%ci#q%ci#r%ci#s%ci#t%ci#u%ci#v%ci#x%ci#z%ci#{%ci'z%ci(a%ci(r%ci!k%ci!Y%ci'w%civ%ci!_%ci%i%ci!g%ci~P%6bO!]'Ya!k'Ya~P!:tO!].tO!k(ki~O$O#ci!]#ci!^#ci~P#BwOP$[OR#zO!Q#yO!S#{O!l#xO!p$[O(aVO[#mij#mir#mi#R#mi#o#mi#p#mi#q#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#n#mi~P%NdO#n<_O~P%NdOP$[OR#zOr<kO!Q#yO!S#{O!l#xO!p$[O#n<_O#o<`O#p<`O#q<`O(aVO[#mij#mi#R#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#r#mi~P&!lO#r<aO~P&!lOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO(aVO#x#mi#z#mi#{#mi$O#mi(r#mi(y#mi(z#mi!]#mi!^#mi~O#v#mi~P&$tOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO(aVO(z#}O#z#mi#{#mi$O#mi(r#mi(y#mi!]#mi!^#mi~O#x<eO~P&&uO#x#mi~P&&uO#v<cO~P&$tOP$[OR#zO[<mOj<bOr<kO!Q#yO!S#{O!l#xO!p$[O#R<bO#n<_O#o<`O#p<`O#q<`O#r<aO#s<bO#t<bO#u<lO#v<cO#x<eO(aVO(y#|O(z#}O#{#mi$O#mi(r#mi!]#mi!^#mi~O#z#mi~P&)UO#z<gO~P&)UOa#|y!]#|y'z#|y'w#|y!Y#|y!k#|yv#|y!_#|y%i#|y!g#|y~P!:tO[#mij#mir#mi#R#mi#r#mi#s#mi#t#mi#u#mi#v#mi#x#mi#z#mi#{#mi$O#mi(r#mi!]#mi!^#mi~OP$[OR#zO!Q#yO!S#{O!l#xO!p$[O#n<_O#o<`O#p<`O#q<`O(aVO(y#mi(z#mi~P&,QOn>^O!Q*OO'y*PO(y$}O(z%POP#miR#mi!S#mi!l#mi!p#mi#n#mi#o#mi#p#mi#q#mi(a#mi~P&,QO#S$dOP(`XR(`X[(`Xj(`Xn(`Xr(`X!Q(`X!S(`X!l(`X!p(`X#R(`X#n(`X#o(`X#p(`X#q(`X#r(`X#s(`X#t(`X#u(`X#v(`X#x(`X#z(`X#{(`X$O(`X'y(`X(a(`X(r(`X(y(`X(z(`X!](`X!^(`X~O$O$Pi!]$Pi!^$Pi~P#BwO$O!ri!^!ri~P$+oOg']a!]']a~P!1WO!^7nO~O!]'da!^'da~P#BwO!Y7oO~P#/sO!g#vO(r'pO!]'ea!k'ea~O!]/pO!k)Oi~O!]/pO!g#vO!k)Oi~Og$|q!]$|q#`$|q$O$|q~P!1WO!Y'ga!]'ga~P#/sO!g7vO~O!]/yO!Y)Pi~P#/sO!]/yO!Y)Pi~O!Y7yO~Oh%VOr8OO!l%eO(r'pO~Oj8QO!g#vO~Or8TO!g#vO(r'pO~O!Q*OO'y*PO(z%POn'ja(y'ja!]'ja#`'ja~Og'ja$O'ja~P&5RO!Q*OO'y*POn'la(y'la(z'la!]'la#`'la~Og'la$O'la~P&5tOg(_q!](_q~P!1WO#`8VOg(_q!](_q~P!1WO!Y8WO~Og%Oq!]%Oq#`%Oq$O%Oq~P!1WOa$oy!]$oy'z$oy'w$oy!Y$oy!k$oyv$oy!_$oy%i$oy!g$oy~P!:tO!g6rO~O!]5[O!_)Qa~O!_'`OP$TaR$Ta[$Taj$Tar$Ta!Q$Ta!S$Ta!]$Ta!l$Ta!p$Ta#R$Ta#n$Ta#o$Ta#p$Ta#q$Ta#r$Ta#s$Ta#t$Ta#u$Ta#v$Ta#x$Ta#z$Ta#{$Ta(a$Ta(r$Ta(y$Ta(z$Ta~O%i7WO~P&8fO%^8[Oa%[i!_%[i'z%[i!]%[i~Oa#cy!]#cy'z#cy'w#cy!Y#cy!k#cyv#cy!_#cy%i#cy!g#cy~P!:tO[8^O~Ob8`O(T+qO(VTO(YUO~O!]1TO!^)Xi~O`8dO~O(e(|O!]'pX!^'pX~O!]5uO!^)Ua~O!^8nO~P%;eO(o!sO~P$&YO#[8oO~O!_1oO~O!_1oO%i8qO~On8tO!_1oO%i8qO~O[8yO!]'sa!^'sa~O!]1zO!^)Vi~O!k8}O~O!k9OO~O!k9RO~O!k9RO~P%[Oa9TO~O!g9UO~O!k9VO~O!](wi!^(wi~P#BwOa%nO#`9_O'z%nO~O!](ty!k(tya(ty'z(ty~P!:tO!](jO!k(sy~O%i9bO~P&8fO!_'`O%i9bO~O#k$|qP$|qR$|q[$|qa$|qj$|qr$|q!S$|q!]$|q!l$|q!p$|q#R$|q#n$|q#o$|q#p$|q#q$|q#r$|q#s$|q#t$|q#u$|q#v$|q#x$|q#z$|q#{$|q'z$|q(a$|q(r$|q!k$|q!Y$|q'w$|q#`$|qv$|q!_$|q%i$|q!g$|q~P#/sO#k'jaP'jaR'ja['jaa'jaj'jar'ja!S'ja!l'ja!p'ja#R'ja#n'ja#o'ja#p'ja#q'ja#r'ja#s'ja#t'ja#u'ja#v'ja#x'ja#z'ja#{'ja'z'ja(a'ja(r'ja!k'ja!Y'ja'w'jav'ja!_'ja%i'ja!g'ja~P&5RO#k'laP'laR'la['laa'laj'lar'la!S'la!l'la!p'la#R'la#n'la#o'la#p'la#q'la#r'la#s'la#t'la#u'la#v'la#x'la#z'la#{'la'z'la(a'la(r'la!k'la!Y'la'w'lav'la!_'la%i'la!g'la~P&5tO#k%OqP%OqR%Oq[%Oqa%Oqj%Oqr%Oq!S%Oq!]%Oq!l%Oq!p%Oq#R%Oq#n%Oq#o%Oq#p%Oq#q%Oq#r%Oq#s%Oq#t%Oq#u%Oq#v%Oq#x%Oq#z%Oq#{%Oq'z%Oq(a%Oq(r%Oq!k%Oq!Y%Oq'w%Oq#`%Oqv%Oq!_%Oq%i%Oq!g%Oq~P#/sO!]'Yi!k'Yi~P!:tO$O#cq!]#cq!^#cq~P#BwO(y$}OP%aaR%aa[%aaj%aar%aa!S%aa!l%aa!p%aa#R%aa#n%aa#o%aa#p%aa#q%aa#r%aa#s%aa#t%aa#u%aa#v%aa#x%aa#z%aa#{%aa$O%aa(a%aa(r%aa!]%aa!^%aa~On%aa!Q%aa'y%aa(z%aa~P&IyO(z%POP%caR%ca[%caj%car%ca!S%ca!l%ca!p%ca#R%ca#n%ca#o%ca#p%ca#q%ca#r%ca#s%ca#t%ca#u%ca#v%ca#x%ca#z%ca#{%ca$O%ca(a%ca(r%ca!]%ca!^%ca~On%ca!Q%ca'y%ca(y%ca~P&LQOn>^O!Q*OO'y*PO(z%PO~P&IyOn>^O!Q*OO'y*PO(y$}O~P&LQOR0kO!Q0kO!S0lO#S$dOP}a[}aj}an}ar}a!l}a!p}a#R}a#n}a#o}a#p}a#q}a#r}a#s}a#t}a#u}a#v}a#x}a#z}a#{}a$O}a'y}a(a}a(r}a(y}a(z}a!]}a!^}a~O!Q*OO'y*POP$saR$sa[$saj$san$sar$sa!S$sa!l$sa!p$sa#R$sa#n$sa#o$sa#p$sa#q$sa#r$sa#s$sa#t$sa#u$sa#v$sa#x$sa#z$sa#{$sa$O$sa(a$sa(r$sa(y$sa(z$sa!]$sa!^$sa~O!Q*OO'y*POP$uaR$ua[$uaj$uan$uar$ua!S$ua!l$ua!p$ua#R$ua#n$ua#o$ua#p$ua#q$ua#r$ua#s$ua#t$ua#u$ua#v$ua#x$ua#z$ua#{$ua$O$ua(a$ua(r$ua(y$ua(z$ua!]$ua!^$ua~On>^O!Q*OO'y*PO(y$}O(z%PO~OP%TaR%Ta[%Taj%Tar%Ta!S%Ta!l%Ta!p%Ta#R%Ta#n%Ta#o%Ta#p%Ta#q%Ta#r%Ta#s%Ta#t%Ta#u%Ta#v%Ta#x%Ta#z%Ta#{%Ta$O%Ta(a%Ta(r%Ta!]%Ta!^%Ta~P''VO$O$mq!]$mq!^$mq~P#BwO$O$oq!]$oq!^$oq~P#BwO!^9oO~O$O9pO~P!1WO!g#vO!]'ei!k'ei~O!g#vO(r'pO!]'ei!k'ei~O!]/pO!k)Oq~O!Y'gi!]'gi~P#/sO!]/yO!Y)Pq~Or9wO!g#vO(r'pO~O[9yO!Y9xO~P#/sO!Y9xO~Oj:PO!g#vO~Og(_y!](_y~P!1WO!]'na!_'na~P#/sOa%[q!_%[q'z%[q!]%[q~P#/sO[:UO~O!]1TO!^)Xq~O`:YO~O#`:ZO!]'pa!^'pa~O!]5uO!^)Ui~P#BwO!S:]O~O!_1oO%i:`O~O(VTO(YUO(e:eO~O!]1zO!^)Vq~O!k:hO~O!k:iO~O!k:jO~O!k:jO~P%[O#`:mO!]#hy!^#hy~O!]#hy!^#hy~P#BwO%i:rO~P&8fO!_'`O%i:rO~O$O#|y!]#|y!^#|y~P#BwOP$|iR$|i[$|ij$|ir$|i!S$|i!l$|i!p$|i#R$|i#n$|i#o$|i#p$|i#q$|i#r$|i#s$|i#t$|i#u$|i#v$|i#x$|i#z$|i#{$|i$O$|i(a$|i(r$|i!]$|i!^$|i~P''VO!Q*OO'y*PO(z%POP'iaR'ia['iaj'ian'iar'ia!S'ia!l'ia!p'ia#R'ia#n'ia#o'ia#p'ia#q'ia#r'ia#s'ia#t'ia#u'ia#v'ia#x'ia#z'ia#{'ia$O'ia(a'ia(r'ia(y'ia!]'ia!^'ia~O!Q*OO'y*POP'kaR'ka['kaj'kan'kar'ka!S'ka!l'ka!p'ka#R'ka#n'ka#o'ka#p'ka#q'ka#r'ka#s'ka#t'ka#u'ka#v'ka#x'ka#z'ka#{'ka$O'ka(a'ka(r'ka(y'ka(z'ka!]'ka!^'ka~O(y$}OP%aiR%ai[%aij%ain%air%ai!Q%ai!S%ai!l%ai!p%ai#R%ai#n%ai#o%ai#p%ai#q%ai#r%ai#s%ai#t%ai#u%ai#v%ai#x%ai#z%ai#{%ai$O%ai'y%ai(a%ai(r%ai(z%ai!]%ai!^%ai~O(z%POP%ciR%ci[%cij%cin%cir%ci!Q%ci!S%ci!l%ci!p%ci#R%ci#n%ci#o%ci#p%ci#q%ci#r%ci#s%ci#t%ci#u%ci#v%ci#x%ci#z%ci#{%ci$O%ci'y%ci(a%ci(r%ci(y%ci!]%ci!^%ci~O$O$oy!]$oy!^$oy~P#BwO$O#cy!]#cy!^#cy~P#BwO!g#vO!]'eq!k'eq~O!]/pO!k)Oy~O!Y'gq!]'gq~P#/sOr:|O!g#vO(r'pO~O[;QO!Y;PO~P#/sO!Y;PO~Og(_!R!](_!R~P!1WOa%[y!_%[y'z%[y!]%[y~P#/sO!]1TO!^)Xy~O!]5uO!^)Uq~O(T;XO~O!_1oO%i;[O~O!k;_O~O%i;dO~P&8fOP$|qR$|q[$|qj$|qr$|q!S$|q!l$|q!p$|q#R$|q#n$|q#o$|q#p$|q#q$|q#r$|q#s$|q#t$|q#u$|q#v$|q#x$|q#z$|q#{$|q$O$|q(a$|q(r$|q!]$|q!^$|q~P''VO!Q*OO'y*PO(z%POP'jaR'ja['jaj'jan'jar'ja!S'ja!l'ja!p'ja#R'ja#n'ja#o'ja#p'ja#q'ja#r'ja#s'ja#t'ja#u'ja#v'ja#x'ja#z'ja#{'ja$O'ja(a'ja(r'ja(y'ja!]'ja!^'ja~O!Q*OO'y*POP'laR'la['laj'lan'lar'la!S'la!l'la!p'la#R'la#n'la#o'la#p'la#q'la#r'la#s'la#t'la#u'la#v'la#x'la#z'la#{'la$O'la(a'la(r'la(y'la(z'la!]'la!^'la~OP%OqR%Oq[%Oqj%Oqr%Oq!S%Oq!l%Oq!p%Oq#R%Oq#n%Oq#o%Oq#p%Oq#q%Oq#r%Oq#s%Oq#t%Oq#u%Oq#v%Oq#x%Oq#z%Oq#{%Oq$O%Oq(a%Oq(r%Oq!]%Oq!^%Oq~P''VOg%e!Z!]%e!Z#`%e!Z$O%e!Z~P!1WO!Y;hO~P#/sOr;iO!g#vO(r'pO~O[;kO!Y;hO~P#/sO!]'pq!^'pq~P#BwO!]#h!Z!^#h!Z~P#BwO#k%e!ZP%e!ZR%e!Z[%e!Za%e!Zj%e!Zr%e!Z!S%e!Z!]%e!Z!l%e!Z!p%e!Z#R%e!Z#n%e!Z#o%e!Z#p%e!Z#q%e!Z#r%e!Z#s%e!Z#t%e!Z#u%e!Z#v%e!Z#x%e!Z#z%e!Z#{%e!Z'z%e!Z(a%e!Z(r%e!Z!k%e!Z!Y%e!Z'w%e!Z#`%e!Zv%e!Z!_%e!Z%i%e!Z!g%e!Z~P#/sOr;tO!g#vO(r'pO~O!Y;uO~P#/sOr;|O!g#vO(r'pO~O!Y;}O~P#/sOP%e!ZR%e!Z[%e!Zj%e!Zr%e!Z!S%e!Z!l%e!Z!p%e!Z#R%e!Z#n%e!Z#o%e!Z#p%e!Z#q%e!Z#r%e!Z#s%e!Z#t%e!Z#u%e!Z#v%e!Z#x%e!Z#z%e!Z#{%e!Z$O%e!Z(a%e!Z(r%e!Z!]%e!Z!^%e!Z~P''VOr<QO!g#vO(r'pO~Ov(fX~P1qO!Q%rO~P!)[O(U!lO~P!)[O!YfX!]fX#`fX~P%2OOP]XR]X[]Xj]Xr]X!Q]X!S]X!]]X!]fX!l]X!p]X#R]X#S]X#`]X#`fX#kfX#n]X#o]X#p]X#q]X#r]X#s]X#t]X#u]X#v]X#x]X#z]X#{]X$Q]X(a]X(r]X(y]X(z]X~O!gfX!k]X!kfX(rfX~P'LTOP<UOQ<UOSfOd>ROe!iOpkOr<UOskOtkOzkO|<UO!O<UO!SWO!WkO!XkO!_XO!i<XO!lZO!o<UO!p<UO!q<UO!s<YO!u<]O!x!hO$W!kO$n>PO(T)]O(VTO(YUO(aVO(o[O~O!]<iO!^$qa~Oh%VOp%WOr%XOs$tOt$tOz%YO|%ZO!O<tO!S${O!_$|O!i>WO!l$xO#j<zO$W%`O$t<vO$v<xO$y%aO(T(vO(VTO(YUO(a$uO(y$}O(z%PO~Ol)dO~P(!yOr!eX(r!eX~P#!iOr(jX(r(jX~P##[O!^]X!^fX~P'LTO!YfX!Y$zX!]fX!]$zX#`fX~P!0SO#k<^O~O!g#vO#k<^O~O#`<nO~Oj<bO~O#`=OO!](wX!^(wX~O#`<nO!](uX!^(uX~O#k=PO~Og=RO~P!1WO#k=XO~O#k=YO~Og=RO(T&ZO~O!g#vO#k=ZO~O!g#vO#k=PO~O$O=[O~P#BwO#k=]O~O#k=^O~O#k=cO~O#k=dO~O#k=eO~O#k=fO~O$O=gO~P!1WO$O=hO~P!1WOl=sO~P7eOk#S#T#U#W#X#[#i#j#u$n$t$v$y%]%^%h%i%j%q%s%v%w%y%{~(OT#o!X'|(U#ps#n#qr!Q'}$]'}(T$_(e~",
    goto: "$9Y)]PPPPPP)^PP)aP)rP+W/]PPPP6mPP7TPP=QPPP@tPA^PA^PPPA^PCfPA^PA^PA^PCjPCoPD^PIWPPPI[PPPPI[L_PPPLeMVPI[PI[PP! eI[PPPI[PI[P!#lI[P!'S!(X!(bP!)U!)Y!)U!,gPPPPPPP!-W!(XPP!-h!/YP!2iI[I[!2n!5z!:h!:h!>gPPP!>oI[PPPPPPPPP!BOP!C]PPI[!DnPI[PI[I[I[I[I[PI[!FQP!I[P!LbP!Lf!Lp!Lt!LtP!IXP!Lx!LxP#!OP#!SI[PI[#!Y#%_CjA^PA^PA^A^P#&lA^A^#)OA^#+vA^#.SA^A^#.r#1W#1W#1]#1f#1W#1qPP#1WPA^#2ZA^#6YA^A^6mPPP#:_PPP#:x#:xP#:xP#;`#:xPP#;fP#;]P#;]#;y#;]#<e#<k#<n)aP#<q)aP#<z#<z#<zP)aP)aP)aP)aPP)aP#=Q#=TP#=T)aP#=XP#=[P)aP)aP)aP)aP)aP)a)aPP#=b#=h#=s#=y#>P#>V#>]#>k#>q#>{#?R#?]#?c#?s#?y#@k#@}#AT#AZ#Ai#BO#Cs#DR#DY#Et#FS#Gt#HS#HY#H`#Hf#Hp#Hv#H|#IW#Ij#IpPPPPPPPPPPP#IvPPPPPPP#Jk#Mx$ b$ i$ qPPP$']P$'f$*_$0x$0{$1O$1}$2Q$2X$2aP$2g$2jP$3W$3[$4S$5b$5g$5}PP$6S$6Y$6^$6a$6e$6i$7e$7|$8e$8i$8l$8o$8y$8|$9Q$9UR!|RoqOXst!Z#d%m&r&t&u&w,s,x2[2_Y!vQ'`-e1o5{Q%tvQ%|yQ&T|Q&j!VS'W!e-]Q'f!iS'l!r!yU*k$|*Z*oQ+o%}S+|&V&WQ,d&dQ-c'_Q-m'gQ-u'mQ0[*qQ1b,OQ1y,eR<{<Y%SdOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+],p,s,x-i-q.P.V.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3l4z6T6e6f6i6|8t9T9_S#q]<V!r)_$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SU+P%]<s<tQ+t&PQ,f&gQ,m&oQ0x+gQ0}+iQ1Y+uQ2R,kQ3`.gQ5`0|Q5f1TQ6[1zQ7Y3dQ8`5gR9e7['QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S!S!nQ!r!v!y!z$|'W'_'`'l'm'n*k*o*q*r-]-c-e-u0[0_1o5{5}%[$ti#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^Q&X|Q'U!eS'[%i-`Q+t&PQ,P&WQ,f&gQ0n+SQ1Y+uQ1_+{Q2Q,jQ2R,kQ5f1TQ5o1aQ6[1zQ6_1|Q6`2PQ8`5gQ8c5lQ8|6bQ:X8dQ:f8yQ;V:YR<}*ZrnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_R,h&k&z^OPXYstuvwz!Z!`!g!j!o#S#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'b'r(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>R>S[#]WZ#W#Z'X(T!b%jm#h#i#l$x%e%h(^(h(i(j*Y*^*b+Z+[+^,o-V.T.Z.[.]._/m/p2d3[3]4a6r7TQ%wxQ%{yW&Q|&V&W,OQ&_!TQ'c!hQ'e!iQ(q#sS+n%|%}Q+r&PQ,_&bQ,c&dS-l'f'gQ.i(rQ1R+oQ1X+uQ1Z+vQ1^+zQ1t,`S1x,d,eQ2|-mQ5e1TQ5i1WQ5n1`Q6Z1yQ8_5gQ8b5kQ8f5pQ:T8^R;T:U!U$zi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y!^%yy!i!u%{%|%}'V'e'f'g'k'u*j+n+o-Y-l-m-t0R0U1R2u2|3T4r4s4v7}9{Q+h%wQ,T&[Q,W&]Q,b&dQ.h(qQ1s,_U1w,c,d,eQ3e.iQ6U1tS6Y1x1yQ8x6Z#f>T#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^o>U<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hW%Ti%V*y>PS&[!Q&iQ&]!RQ&^!SU*}%[%d=sR,R&Y%]%Si#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^T)z$u){V+P%]<s<tW'[!e%i*Z-`S(}#y#zQ+c%rQ+y&SS.b(m(nQ1j,XQ5T0kR8i5u'QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S$i$^c#Y#e%q%s%u(S(Y(t(y)R)S)T)U)V)W)X)Y)Z)[)^)`)b)g)q+d+x-Z-x-}.S.U.s.v.z.|.}/O/b0p2k2n3O3V3k3p3q3r3s3t3u3v3w3x3y3z3{3|4P4Q4X5X5c6u6{7Q7a7b7k7l8k9X9]9g9m9n:o;W;`<W=vT#TV#U'RkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ'Y!eR2q-]!W!nQ!e!r!v!y!z$|'W'_'`'l'm'n*Z*k*o*q*r-]-c-e-u0[0_1o5{5}R1l,ZnqOXst!Z#d%m&r&t&u&w,s,x2[2_Q&y!^Q'v!xS(s#u<^Q+l%zQ,]&_Q,^&aQ-j'dQ-w'oS.r(x=PS0q+X=ZQ1P+mQ1n,[Q2c,zQ2e,{Q2m-WQ2z-kQ2}-oS5Y0r=eQ5a1QS5d1S=fQ6t2oQ6x2{Q6}3SQ8]5bQ9Y6vQ9Z6yQ9^7OR:l9V$d$]c#Y#e%s%u(S(Y(t(y)R)S)T)U)V)W)X)Y)Z)[)^)`)b)g)q+d+x-Z-x-}.S.U.s.v.z.}/O/b0p2k2n3O3V3k3p3q3r3s3t3u3v3w3x3y3z3{3|4P4Q4X5X5c6u6{7Q7a7b7k7l8k9X9]9g9m9n:o;W;`<W=vS(o#p'iQ)P#zS+b%q.|S.c(n(pR3^.d'QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SS#q]<VQ&t!XQ&u!YQ&w![Q&x!]R2Z,vQ'a!hQ+e%wQ-h'cS.e(q+hQ2x-gW3b.h.i0w0yQ6w2yW7U3_3a3e5^U9a7V7X7ZU:q9c9d9fS;b:p:sQ;p;cR;x;qU!wQ'`-eT5y1o5{!Q_OXZ`st!V!Z#d#h%e%m&i&k&r&t&u&w(j,s,x.[2[2_]!pQ!r'`-e1o5{T#q]<V%^{OPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_S(}#y#zS.b(m(n!s=l$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SU$fd)_,mS(p#p'iU*v%R(w4OU0m+O.n7gQ5^0xQ7V3`Q9d7YR:s9em!tQ!r!v!y!z'`'l'm'n-e-u1o5{5}Q't!uS(f#g2US-s'k'wQ/s*]Q0R*jQ3U-vQ4f/tQ4r0TQ4s0UQ4x0^Q7r4`S7}4t4vS8R4y4{Q9r7sQ9v7yQ9{8OQ:Q8TS:{9w9xS;g:|;PS;s;h;iS;{;t;uS<P;|;}R<S<QQ#wbQ's!uS(e#g2US(g#m+WQ+Y%fQ+j%xQ+p&OU-r'k't'wQ.W(fU/r*]*`/wQ0S*jQ0V*lQ1O+kQ1u,aS3R-s-vQ3Z.`S4e/s/tQ4n0PS4q0R0^Q4u0WQ6W1vQ7P3US7q4`4bQ7u4fU7|4r4x4{Q8P4wQ8v6XS9q7r7sQ9u7yQ9}8RQ:O8SQ:c8wQ:y9rS:z9v9xQ;S:QQ;^:dS;f:{;PS;r;g;hS;z;s;uS<O;{;}Q<R<PQ<T<SQ=o=jQ={=tR=|=uV!wQ'`-e%^aOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_S#wz!j!r=i$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SR=o>R%^bOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_Q%fj!^%xy!i!u%{%|%}'V'e'f'g'k'u*j+n+o-Y-l-m-t0R0U1R2u2|3T4r4s4v7}9{S&Oz!jQ+k%yQ,a&dW1v,b,c,d,eU6X1w1x1yS8w6Y6ZQ:d8x!r=j$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ=t>QR=u>R%QeOPXYstuvw!Z!`!g!o#S#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_Y#bWZ#W#Z(T!b%jm#h#i#l$x%e%h(^(h(i(j*Y*^*b+Z+[+^,o-V.T.Z.[.]._/m/p2d3[3]4a6r7TQ,n&o!p=k$Z$n)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SR=n'XU']!e%i*ZR2s-`%SdOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+],p,s,x-i-q.P.V.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3l4z6T6e6f6i6|8t9T9_!r)_$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SQ,m&oQ0x+gQ3`.gQ7Y3dR9e7[!b$Tc#Y%q(S(Y(t(y)Z)[)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<W!P<d)^)q-Z.|2k2n3p3y3z4P4X6u7b7k7l8k9X9g9m9n;W;`=v!f$Vc#Y%q(S(Y(t(y)W)X)Z)[)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<W!T<f)^)q-Z.|2k2n3p3v3w3y3z4P4X6u7b7k7l8k9X9g9m9n;W;`=v!^$Zc#Y%q(S(Y(t(y)`)g+x-x-}.S.U.s.v/b0p3O3V3k3{5X5c6{7Q7a9]:o<WQ4_/kz>S)^)q-Z.|2k2n3p4P4X6u7b7k7l8k9X9g9m9n;W;`=vQ>X>ZR>Y>['QkOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>SS$oh$pR4U/U'XgOPWXYZhstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n$p%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/U/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>ST$kf$qQ$ifS)j$l)nR)v$qT$jf$qT)l$l)n'XhOPWXYZhstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$Z$_$a$e$n$p%m%t&R&k&n&o&r&t&u&w&{'T'X'b'r(T(V(](d(x(z)O)s)}*i+X+]+g,p,s,x-U-X-i-q.P.V.g.t.{/U/V/n0]0l0r1S1r2S2T2V2X2[2_2a2p3Q3W3d3l4T4z5w6T6e6f6i6s6|7[8t9T9_:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>ST$oh$pQ$rhR)u$p%^jOPWXYZstuvw!Z!`!g!o#S#W#Z#d#o#u#x#{$O$P$Q$R$S$T$U$V$W$X$_$a$e%m%t&R&k&n&o&r&t&u&w&{'T'b'r(T(V(](d(x(z)O)}*i+X+]+g,p,s,x-i-q.P.V.g.t.{/n0]0l0r1S1r2S2T2V2X2[2_2a3Q3W3d3l4z6T6e6f6i6|7[8t9T9_!s>Q$Z$n'X)s-U-X/V2p4T5w6s:Z:m<U<X<Y<]<^<_<`<a<b<c<d<e<f<g<h<i<k<n<{=O=P=R=Z=[=e=f>S#glOPXZst!Z!`!o#S#d#o#{$n%m&k&n&o&r&t&u&w&{'T'b)O)s*i+]+g,p,s,x-i.g/V/n0]0l1r2S2T2V2X2[2_2a3d4T4z6T6e6f6i7[8t9T!U%Ri$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y#f(w#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^Q+T%aQ/c*Oo4O<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!U$yi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>YQ*c$zU*l$|*Z*oQ+U%bQ0W*m#f=q#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n=r<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hQ=w>TQ=x>UQ=y>VR=z>W!U%Ri$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y#f(w#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^o4O<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=hnoOXst!Z#d%m&r&t&u&w,s,x2[2_S*f${*YQ-R'OQ-S'QR4i/y%[%Si#v$b$c$d$x${%O%Q%^%_%c)y*R*T*V*Y*a*g*w*x+f+i,S,V.f/P/d/m/x/y/{0`0b0i0j0o1f1i1q3c4^4_4j4o5Q5[5_6S7W7v8Q8V8[8q9b9p9y:P:`:r;Q;[;d;k<l<m<o<p<q<r<u<v<w<x<y<z=S=T=U=V=X=Y=]=^=_=`=a=b=c=d=g=h>P>X>Y>]>^Q,U&]Q1h,WQ5s1gR8h5tV*n$|*Z*oU*n$|*Z*oT5z1o5{S0P*i/nQ4w0]T8S4z:]Q+j%xQ0V*lQ1O+kQ1u,aQ6W1vQ8v6XQ:c8wR;^:d!U%Oi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Yx*R$v)e*S*u+V/v0d0e4R4g5R5S5W7p8U:R:x=p=}>OS0`*t0a#f<o#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n<p<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!d=S(u)c*[*e.j.m.q/_/k/|0v1e3h4[4h4l5r7]7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[`=T3}7c7f7j9h:t:w;yS=_.l3iT=`7e9k!U%Qi$d%O%Q%^%_%c*R*T*a*w*x/P/x0`0b0i0j0o4_5Q8V9p>P>X>Y|*T$v)e*U*t+V/g/v0d0e4R4g4|5R5S5W7p8U:R:x=p=}>OS0b*u0c#f<q#v$b$c$x${)y*V*Y*g+f+i,S,V.f/d/m/y/{1f1i1q3c4^4j4o5[5_6S7W7v8Q8[8q9b9y:P:`:r;Q;[;d;k<o<q<u<w<y=S=U=X=]=_=a=c=g>]>^n<r<l<m<p<r<v<x<z=T=V=Y=^=`=b=d=h!h=U(u)c*[*e.k.l.q/_/k/|0v1e3f3h4[4h4l5r7]7^7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[d=V3}7d7e7j9h9i:t:u:w;yS=a.m3jT=b7f9lrnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_Q&f!UR,p&ornOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_R&f!UQ,Y&^R1d,RsnOXst!V!Z#d%m&i&r&t&u&w,s,x2[2_Q1p,_S6R1s1tU8p6P6Q6US:_8r8sS;Y:^:aQ;m;ZR;w;nQ&m!VR,i&iR6_1|R:f8yW&Q|&V&W,OR1Z+vQ&r!WR,s&sR,y&xT2],x2_R,}&yQ,|&yR2f,}Q'y!{R-y'ySsOtQ#dXT%ps#dQ#OTR'{#OQ#RUR'}#RQ){$uR/`){Q#UVR(Q#UQ#XWU(W#X(X.QQ(X#YR.Q(YQ-^'YR2r-^Q.u(yS3m.u3nR3n.vQ-e'`R2v-eY!rQ'`-e1o5{R'j!rQ/Q)eR4S/QU#_W%h*YU(_#_(`.RQ(`#`R.R(ZQ-a']R2t-at`OXst!V!Z#d%m&i&k&r&t&u&w,s,x2[2_S#hZ%eU#r`#h.[R.[(jQ(k#jQ.X(gW.a(k.X3X7RQ3X.YR7R3YQ)n$lR/W)nQ$phR)t$pQ$`cU)a$`-|<jQ-|<WR<j)qQ/q*]W4c/q4d7t9sU4d/r/s/tS7t4e4fR9s7u$e*Q$v(u)c)e*[*e*t*u+Q+R+V.l.m.o.p.q/_/g/i/k/v/|0d0e0v1e3f3g3h3}4R4[4g4h4l4|5O5R5S5W5r7]7^7_7`7e7f7h7i7j7p7w7z8U8X8Z9h9i9j9t9|:R:S:t:u:v:w:x:};R;e;j;v;y=p=}>O>Z>[Q/z*eU4k/z4m7xQ4m/|R7x4lS*o$|*ZR0Y*ox*S$v)e*t*u+V/v0d0e4R4g5R5S5W7p8U:R:x=p=}>O!d.j(u)c*[*e.l.m.q/_/k/|0v1e3h4[4h4l5r7]7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[U/h*S.j7ca7c3}7e7f7j9h:t:w;yQ0a*tQ3i.lU4}0a3i9kR9k7e|*U$v)e*t*u+V/g/v0d0e4R4g4|5R5S5W7p8U:R:x=p=}>O!h.k(u)c*[*e.l.m.q/_/k/|0v1e3f3h4[4h4l5r7]7^7`7w7z8X8Z9t9|:S:};R;e;j;v>Z>[U/j*U.k7de7d3}7e7f7j9h9i:t:u:w;yQ0c*uQ3j.mU5P0c3j9lR9l7fQ*z%UR0g*zQ5]0vR8Y5]Q+_%kR0u+_Q5v1jS8j5v:[R:[8kQ,[&_R1m,[Q5{1oR8m5{Q1{,fS6]1{8zR8z6_Q1U+rW5h1U5j8a:VQ5j1XQ8a5iR:V8bQ+w&QR1[+wQ2_,xR6m2_YrOXst#dQ&v!ZQ+a%mQ,r&rQ,t&tQ,u&uQ,w&wQ2Y,sS2],x2_R6l2[Q%opQ&z!_Q&}!aQ'P!bQ'R!cQ'q!uQ+`%lQ+l%zQ,Q&XQ,h&mQ-P&|W-p'k's't'wQ-w'oQ0X*nQ1P+mQ1c,PS2O,i,lQ2g-OQ2h-RQ2i-SQ2}-oW3P-r-s-v-xQ5a1QQ5m1_Q5q1eQ6V1uQ6a2QQ6k2ZU6z3O3R3UQ6}3SQ8]5bQ8e5oQ8g5rQ8l5zQ8u6WQ8{6`S9[6{7PQ9^7OQ:W8cQ:b8vQ:g8|Q:n9]Q;U:XQ;]:cQ;a:oQ;l;VR;o;^Q%zyQ'd!iQ'o!uU+m%{%|%}Q-W'VU-k'e'f'gS-o'k'uQ0Q*jS1Q+n+oQ2o-YS2{-l-mQ3S-tS4p0R0UQ5b1RQ6v2uQ6y2|Q7O3TU7{4r4s4vQ9z7}R;O9{S$wi>PR*{%VU%Ui%V>PR0f*yQ$viS(u#v+iS)c$b$cQ)e$dQ*[$xS*e${*YQ*t%OQ*u%QQ+Q%^Q+R%_Q+V%cQ.l<oQ.m<qQ.o<uQ.p<wQ.q<yQ/_)yQ/g*RQ/i*TQ/k*VQ/v*aS/|*g/mQ0d*wQ0e*xl0v+f,V.f1i1q3c6S7W8q9b:`:r;[;dQ1e,SQ3f=SQ3g=UQ3h=XS3}<l<mQ4R/PS4[/d4^Q4g/xQ4h/yQ4l/{Q4|0`Q5O0bQ5R0iQ5S0jQ5W0oQ5r1fQ7]=]Q7^=_Q7_=aQ7`=cQ7e<pQ7f<rQ7h<vQ7i<xQ7j<zQ7p4_Q7w4jQ7z4oQ8U5QQ8X5[Q8Z5_Q9h=YQ9i=TQ9j=VQ9t7vQ9|8QQ:R8VQ:S8[Q:t=^Q:u=`Q:v=bQ:w=dQ:x9pQ:}9yQ;R:PQ;e=gQ;j;QQ;v;kQ;y=hQ=p>PQ=}>XQ>O>YQ>Z>]R>[>^Q+O%]Q.n<sR7g<tnpOXst!Z#d%m&r&t&u&w,s,x2[2_Q!fPS#fZ#oQ&|!`W'h!o*i0]4zQ(P#SQ)Q#{Q)r$nS,l&k&nQ,q&oQ-O&{S-T'T/nQ-g'bQ.x)OQ/[)sQ0s+]Q0y+gQ2W,pQ2y-iQ3a.gQ4W/VQ5U0lQ6Q1rQ6c2SQ6d2TQ6h2VQ6j2XQ6o2aQ7Z3dQ7m4TQ8s6TQ9P6eQ9Q6fQ9S6iQ9f7[Q:a8tR:k9T#[cOPXZst!Z!`!o#d#o#{%m&k&n&o&r&t&u&w&{'T'b)O*i+]+g,p,s,x-i.g/n0]0l1r2S2T2V2X2[2_2a3d4z6T6e6f6i7[8t9TQ#YWQ#eYQ%quQ%svS%uw!gS(S#W(VQ(Y#ZQ(t#uQ(y#xQ)R$OQ)S$PQ)T$QQ)U$RQ)V$SQ)W$TQ)X$UQ)Y$VQ)Z$WQ)[$XQ)^$ZQ)`$_Q)b$aQ)g$eW)q$n)s/V4TQ+d%tQ+x&RS-Z'X2pQ-x'rS-}(T.PQ.S(]Q.U(dQ.s(xQ.v(zQ.z<UQ.|<XQ.}<YQ/O<]Q/b)}Q0p+XQ2k-UQ2n-XQ3O-qQ3V.VQ3k.tQ3p<^Q3q<_Q3r<`Q3s<aQ3t<bQ3u<cQ3v<dQ3w<eQ3x<fQ3y<gQ3z<hQ3{.{Q3|<kQ4P<nQ4Q<{Q4X<iQ5X0rQ5c1SQ6u=OQ6{3QQ7Q3WQ7a3lQ7b=PQ7k=RQ7l=ZQ8k5wQ9X6sQ9]6|Q9g=[Q9m=eQ9n=fQ:o9_Q;W:ZQ;`:mQ<W#SR=v>SR#[WR'Z!el!tQ!r!v!y!z'`'l'm'n-e-u1o5{5}S'V!e-]U*j$|*Z*oS-Y'W'_S0U*k*qQ0^*rQ2u-cQ4v0[R4{0_R({#xQ!fQT-d'`-e]!qQ!r'`-e1o5{Q#p]R'i<VR)f$dY!uQ'`-e1o5{Q'k!rS'u!v!yS'w!z5}S-t'l'mQ-v'nR3T-uT#kZ%eS#jZ%eS%km,oU(g#h#i#lS.Y(h(iQ.^(jQ0t+^Q3Y.ZU3Z.[.]._S7S3[3]R9`7Td#^W#W#Z%h(T(^*Y+Z.T/mr#gZm#h#i#l%e(h(i(j+^.Z.[.]._3[3]7TS*]$x*bQ/t*^Q2U,oQ2l-VQ4`/pQ6q2dQ7s4aQ9W6rT=m'X+[V#aW%h*YU#`W%h*YS(U#W(^U(Z#Z+Z/mS-['X+[T.O(T.TV'^!e%i*ZQ$lfR)x$qT)m$l)nR4V/UT*_$x*bT*h${*YQ0w+fQ1g,VQ3_.fQ5t1iQ6P1qQ7X3cQ8r6SQ9c7WQ:^8qQ:p9bQ;Z:`Q;c:rQ;n;[R;q;dnqOXst!Z#d%m&r&t&u&w,s,x2[2_Q&l!VR,h&itmOXst!U!V!Z#d%m&i&r&t&u&w,s,x2[2_R,o&oT%lm,oR1k,XR,g&gQ&U|S+}&V&WR1^,OR+s&PT&p!W&sT&q!W&sT2^,x2_",
    nodeNames: "\u26A0 ArithOp ArithOp ?. JSXStartTag LineComment BlockComment Script Hashbang ExportDeclaration export Star as VariableName String Escape from ; default FunctionDeclaration async function VariableDefinition > < TypeParamList in out const TypeDefinition extends ThisType this LiteralType ArithOp Number BooleanLiteral TemplateType InterpolationEnd Interpolation InterpolationStart NullType null VoidType void TypeofType typeof MemberExpression . PropertyName [ TemplateString Escape Interpolation super RegExp ] ArrayExpression Spread , } { ObjectExpression Property async get set PropertyDefinition Block : NewTarget new NewExpression ) ( ArgList UnaryExpression delete LogicOp BitOp YieldExpression yield AwaitExpression await ParenthesizedExpression ClassExpression class ClassBody MethodDeclaration Decorator @ MemberExpression PrivatePropertyName CallExpression TypeArgList CompareOp < declare Privacy static abstract override PrivatePropertyDefinition PropertyDeclaration readonly accessor Optional TypeAnnotation Equals StaticBlock FunctionExpression ArrowFunction ParamList ParamList ArrayPattern ObjectPattern PatternProperty Privacy readonly Arrow MemberExpression BinaryExpression ArithOp ArithOp ArithOp ArithOp BitOp CompareOp instanceof satisfies CompareOp BitOp BitOp BitOp LogicOp LogicOp ConditionalExpression LogicOp LogicOp AssignmentExpression UpdateOp PostfixExpression CallExpression InstantiationExpression TaggedTemplateExpression DynamicImport import ImportMeta JSXElement JSXSelfCloseEndTag JSXSelfClosingTag JSXIdentifier JSXBuiltin JSXIdentifier JSXNamespacedName JSXMemberExpression JSXSpreadAttribute JSXAttribute JSXAttributeValue JSXEscape JSXEndTag JSXOpenTag JSXFragmentTag JSXText JSXEscape JSXStartCloseTag JSXCloseTag PrefixCast < ArrowFunction TypeParamList SequenceExpression InstantiationExpression KeyofType keyof UniqueType unique ImportType InferredType infer TypeName ParenthesizedType FunctionSignature ParamList NewSignature IndexedType TupleType Label ArrayType ReadonlyType ObjectType MethodType PropertyType IndexSignature PropertyDefinition CallSignature TypePredicate asserts is NewSignature new UnionType LogicOp IntersectionType LogicOp ConditionalType ParameterizedType ClassDeclaration abstract implements type VariableDeclaration let var using TypeAliasDeclaration InterfaceDeclaration interface EnumDeclaration enum EnumBody NamespaceDeclaration namespace module AmbientDeclaration declare GlobalDeclaration global ClassDeclaration ClassBody AmbientFunctionDeclaration ExportGroup VariableName VariableName ImportDeclaration defer ImportGroup ForStatement for ForSpec ForInSpec ForOfSpec of WhileStatement while WithStatement with DoStatement do IfStatement if else SwitchStatement switch SwitchBody CaseLabel case DefaultLabel TryStatement try CatchClause catch FinallyClause finally ReturnStatement return ThrowStatement throw BreakStatement break ContinueStatement continue DebuggerStatement debugger LabeledStatement ExpressionStatement SingleExpression SingleClassItem",
    maxTerm: 380,
    context: trackNewline,
    nodeProps: [["isolate", -8, 5, 6, 14, 37, 39, 51, 53, 55, ""], ["group", -26, 9, 17, 19, 68, 207, 211, 215, 216, 218, 221, 224, 234, 237, 243, 245, 247, 249, 252, 258, 264, 266, 268, 270, 272, 274, 275, "Statement", -34, 13, 14, 32, 35, 36, 42, 51, 54, 55, 57, 62, 70, 72, 76, 80, 82, 84, 85, 110, 111, 120, 121, 136, 139, 141, 142, 143, 144, 145, 147, 148, 167, 169, 171, "Expression", -23, 31, 33, 37, 41, 43, 45, 173, 175, 177, 178, 180, 181, 182, 184, 185, 186, 188, 189, 190, 201, 203, 205, 206, "Type", -3, 88, 103, 109, "ClassItem"], ["openedBy", 23, "<", 38, "InterpolationStart", 56, "[", 60, "{", 73, "(", 160, "JSXStartCloseTag"], ["closedBy", -2, 24, 168, ">", 40, "InterpolationEnd", 50, "]", 61, "}", 74, ")", 165, "JSXEndTag"]],
    propSources: [jsHighlight],
    skippedNodes: [0, 5, 6, 278],
    repeatNodeCount: 37,
    tokenData: "$Fq07[R!bOX%ZXY+gYZ-yZ[+g[]%Z]^.c^p%Zpq+gqr/mrs3cst:_tuEruvJSvwLkwx! Yxy!'iyz!(sz{!)}{|!,q|}!.O}!O!,q!O!P!/Y!P!Q!9j!Q!R#:O!R![#<_![!]#I_!]!^#Jk!^!_#Ku!_!`$![!`!a$$v!a!b$*T!b!c$,r!c!}Er!}#O$-|#O#P$/W#P#Q$4o#Q#R$5y#R#SEr#S#T$7W#T#o$8b#o#p$<r#p#q$=h#q#r$>x#r#s$@U#s$f%Z$f$g+g$g#BYEr#BY#BZ$A`#BZ$ISEr$IS$I_$A`$I_$I|Er$I|$I}$Dk$I}$JO$Dk$JO$JTEr$JT$JU$A`$JU$KVEr$KV$KW$A`$KW&FUEr&FU&FV$A`&FV;'SEr;'S;=`I|<%l?HTEr?HT?HU$A`?HUOEr(n%d_$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z&j&hT$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c&j&zP;=`<%l&c'|'U]$i&j(Z!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!b(SU(Z!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}!b(iP;=`<%l'}'|(oP;=`<%l&}'[(y]$i&j(WpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(rp)wU(WpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)rp*^P;=`<%l)r'[*dP;=`<%l(r#S*nX(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g#S+^P;=`<%l*g(n+dP;=`<%l%Z07[+rq$i&j(Wp(Z!b'|0/lOX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p$f%Z$f$g+g$g#BY%Z#BY#BZ+g#BZ$IS%Z$IS$I_+g$I_$JT%Z$JT$JU+g$JU$KV%Z$KV$KW+g$KW&FU%Z&FU&FV+g&FV;'S%Z;'S;=`+a<%l?HT%Z?HT?HU+g?HUO%Z07[.ST(X#S$i&j'}0/lO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c07[.n_$i&j(Wp(Z!b'}0/lOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z)3p/x`$i&j!p),Q(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW1V`#v(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`2X!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW2d_#v(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'At3l_(V':f$i&j(Z!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k(^4r_$i&j(Z!bOY4kYZ5qZr4krs7nsw4kwx5qx!^4k!^!_8p!_#O4k#O#P5q#P#o4k#o#p8p#p;'S4k;'S;=`:X<%lO4k&z5vX$i&jOr5qrs6cs!^5q!^!_6y!_#o5q#o#p6y#p;'S5q;'S;=`7h<%lO5q&z6jT$d`$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c`6|TOr6yrs7]s;'S6y;'S;=`7b<%lO6y`7bO$d``7eP;=`<%l6y&z7kP;=`<%l5q(^7w]$d`$i&j(Z!bOY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}!r8uZ(Z!bOY8pYZ6yZr8prs9hsw8pwx6yx#O8p#O#P6y#P;'S8p;'S;=`:R<%lO8p!r9oU$d`(Z!bOY'}Zw'}x#O'}#P;'S'};'S;=`(f<%lO'}!r:UP;=`<%l8p(^:[P;=`<%l4k%9[:hh$i&j(Wp(Z!bOY%ZYZ&cZq%Zqr<Srs&}st%ZtuCruw%Zwx(rx!^%Z!^!_*g!_!c%Z!c!}Cr!}#O%Z#O#P&c#P#R%Z#R#SCr#S#T%Z#T#oCr#o#p*g#p$g%Z$g;'SCr;'S;=`El<%lOCr(r<__WS$i&j(Wp(Z!bOY<SYZ&cZr<Srs=^sw<Swx@nx!^<S!^!_Bm!_#O<S#O#P>`#P#o<S#o#pBm#p;'S<S;'S;=`Cl<%lO<S(Q=g]WS$i&j(Z!bOY=^YZ&cZw=^wx>`x!^=^!^!_?q!_#O=^#O#P>`#P#o=^#o#p?q#p;'S=^;'S;=`@h<%lO=^&n>gXWS$i&jOY>`YZ&cZ!^>`!^!_?S!_#o>`#o#p?S#p;'S>`;'S;=`?k<%lO>`S?XSWSOY?SZ;'S?S;'S;=`?e<%lO?SS?hP;=`<%l?S&n?nP;=`<%l>`!f?xWWS(Z!bOY?qZw?qwx?Sx#O?q#O#P?S#P;'S?q;'S;=`@b<%lO?q!f@eP;=`<%l?q(Q@kP;=`<%l=^'`@w]WS$i&j(WpOY@nYZ&cZr@nrs>`s!^@n!^!_Ap!_#O@n#O#P>`#P#o@n#o#pAp#p;'S@n;'S;=`Bg<%lO@ntAwWWS(WpOYApZrAprs?Ss#OAp#O#P?S#P;'SAp;'S;=`Ba<%lOAptBdP;=`<%lAp'`BjP;=`<%l@n#WBvYWS(Wp(Z!bOYBmZrBmrs?qswBmwxApx#OBm#O#P?S#P;'SBm;'S;=`Cf<%lOBm#WCiP;=`<%lBm(rCoP;=`<%l<S%9[C}i$i&j(o%1l(Wp(Z!bOY%ZYZ&cZr%Zrs&}st%ZtuCruw%Zwx(rx!Q%Z!Q![Cr![!^%Z!^!_*g!_!c%Z!c!}Cr!}#O%Z#O#P&c#P#R%Z#R#SCr#S#T%Z#T#oCr#o#p*g#p$g%Z$g;'SCr;'S;=`El<%lOCr%9[EoP;=`<%lCr07[FRk$i&j(Wp(Z!b$]#t(T,2j(e$I[OY%ZYZ&cZr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$g%Z$g;'SEr;'S;=`I|<%lOEr+dHRk$i&j(Wp(Z!b$]#tOY%ZYZ&cZr%Zrs&}st%ZtuGvuw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Gv![!^%Z!^!_*g!_!c%Z!c!}Gv!}#O%Z#O#P&c#P#R%Z#R#SGv#S#T%Z#T#oGv#o#p*g#p$g%Z$g;'SGv;'S;=`Iv<%lOGv+dIyP;=`<%lGv07[JPP;=`<%lEr(KWJ_`$i&j(Wp(Z!b#p(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KWKl_$i&j$Q(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z,#xLva(z+JY$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sv%ZvwM{wx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KWNW`$i&j#z(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'At! c_(Y';W$i&j(WpOY!!bYZ!#hZr!!brs!#hsw!!bwx!$xx!^!!b!^!_!%z!_#O!!b#O#P!#h#P#o!!b#o#p!%z#p;'S!!b;'S;=`!'c<%lO!!b'l!!i_$i&j(WpOY!!bYZ!#hZr!!brs!#hsw!!bwx!$xx!^!!b!^!_!%z!_#O!!b#O#P!#h#P#o!!b#o#p!%z#p;'S!!b;'S;=`!'c<%lO!!b&z!#mX$i&jOw!#hwx6cx!^!#h!^!_!$Y!_#o!#h#o#p!$Y#p;'S!#h;'S;=`!$r<%lO!#h`!$]TOw!$Ywx7]x;'S!$Y;'S;=`!$l<%lO!$Y`!$oP;=`<%l!$Y&z!$uP;=`<%l!#h'l!%R]$d`$i&j(WpOY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(r!Q!&PZ(WpOY!%zYZ!$YZr!%zrs!$Ysw!%zwx!&rx#O!%z#O#P!$Y#P;'S!%z;'S;=`!']<%lO!%z!Q!&yU$d`(WpOY)rZr)rs#O)r#P;'S)r;'S;=`*Z<%lO)r!Q!'`P;=`<%l!%z'l!'fP;=`<%l!!b/5|!'t_!l/.^$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#&U!)O_!k!Lf$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z-!n!*[b$i&j(Wp(Z!b(U%&f#q(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rxz%Zz{!+d{!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW!+o`$i&j(Wp(Z!b#n(ChOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z+;x!,|`$i&j(Wp(Z!br+4YOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z,$U!.Z_!]+Jf$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[!/ec$i&j(Wp(Z!b!Q.2^OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!0p!P!Q%Z!Q![!3Y![!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#%|!0ya$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!2O!P!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z#%|!2Z_![!L^$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!3eg$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!3Y![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S!3Y#S#X%Z#X#Y!4|#Y#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!5Vg$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx{%Z{|!6n|}%Z}!O!6n!O!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!6wc$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad!8_c$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![!8S![!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S!8S#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[!9uf$i&j(Wp(Z!b#o(ChOY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcxz!;Zz{#-}{!P!;Z!P!Q#/d!Q!^!;Z!^!_#(i!_!`#7S!`!a#8i!a!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z?O!;fb$i&j(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z>^!<w`$i&j(Z!b!X7`OY!<nYZ&cZw!<nwx!=yx!P!<n!P!Q!Eq!Q!^!<n!^!_!Gr!_!}!<n!}#O!KS#O#P!Dy#P#o!<n#o#p!Gr#p;'S!<n;'S;=`!L]<%lO!<n<z!>Q^$i&j!X7`OY!=yYZ&cZ!P!=y!P!Q!>|!Q!^!=y!^!_!@c!_!}!=y!}#O!CW#O#P!Dy#P#o!=y#o#p!@c#p;'S!=y;'S;=`!Ek<%lO!=y<z!?Td$i&j!X7`O!^&c!_#W&c#W#X!>|#X#Z&c#Z#[!>|#[#]&c#]#^!>|#^#a&c#a#b!>|#b#g&c#g#h!>|#h#i&c#i#j!>|#j#k!>|#k#m&c#m#n!>|#n#o&c#p;'S&c;'S;=`&w<%lO&c7`!@hX!X7`OY!@cZ!P!@c!P!Q!AT!Q!}!@c!}#O!Ar#O#P!Bq#P;'S!@c;'S;=`!CQ<%lO!@c7`!AYW!X7`#W#X!AT#Z#[!AT#]#^!AT#a#b!AT#g#h!AT#i#j!AT#j#k!AT#m#n!AT7`!AuVOY!ArZ#O!Ar#O#P!B[#P#Q!@c#Q;'S!Ar;'S;=`!Bk<%lO!Ar7`!B_SOY!ArZ;'S!Ar;'S;=`!Bk<%lO!Ar7`!BnP;=`<%l!Ar7`!BtSOY!@cZ;'S!@c;'S;=`!CQ<%lO!@c7`!CTP;=`<%l!@c<z!C][$i&jOY!CWYZ&cZ!^!CW!^!_!Ar!_#O!CW#O#P!DR#P#Q!=y#Q#o!CW#o#p!Ar#p;'S!CW;'S;=`!Ds<%lO!CW<z!DWX$i&jOY!CWYZ&cZ!^!CW!^!_!Ar!_#o!CW#o#p!Ar#p;'S!CW;'S;=`!Ds<%lO!CW<z!DvP;=`<%l!CW<z!EOX$i&jOY!=yYZ&cZ!^!=y!^!_!@c!_#o!=y#o#p!@c#p;'S!=y;'S;=`!Ek<%lO!=y<z!EnP;=`<%l!=y>^!Ezl$i&j(Z!b!X7`OY&}YZ&cZw&}wx&cx!^&}!^!_'}!_#O&}#O#P&c#P#W&}#W#X!Eq#X#Z&}#Z#[!Eq#[#]&}#]#^!Eq#^#a&}#a#b!Eq#b#g&}#g#h!Eq#h#i&}#i#j!Eq#j#k!Eq#k#m&}#m#n!Eq#n#o&}#o#p'}#p;'S&};'S;=`(l<%lO&}8r!GyZ(Z!b!X7`OY!GrZw!Grwx!@cx!P!Gr!P!Q!Hl!Q!}!Gr!}#O!JU#O#P!Bq#P;'S!Gr;'S;=`!J|<%lO!Gr8r!Hse(Z!b!X7`OY'}Zw'}x#O'}#P#W'}#W#X!Hl#X#Z'}#Z#[!Hl#[#]'}#]#^!Hl#^#a'}#a#b!Hl#b#g'}#g#h!Hl#h#i'}#i#j!Hl#j#k!Hl#k#m'}#m#n!Hl#n;'S'};'S;=`(f<%lO'}8r!JZX(Z!bOY!JUZw!JUwx!Arx#O!JU#O#P!B[#P#Q!Gr#Q;'S!JU;'S;=`!Jv<%lO!JU8r!JyP;=`<%l!JU8r!KPP;=`<%l!Gr>^!KZ^$i&j(Z!bOY!KSYZ&cZw!KSwx!CWx!^!KS!^!_!JU!_#O!KS#O#P!DR#P#Q!<n#Q#o!KS#o#p!JU#p;'S!KS;'S;=`!LV<%lO!KS>^!LYP;=`<%l!KS>^!L`P;=`<%l!<n=l!Ll`$i&j(Wp!X7`OY!LcYZ&cZr!Lcrs!=ys!P!Lc!P!Q!Mn!Q!^!Lc!^!_# o!_!}!Lc!}#O#%P#O#P!Dy#P#o!Lc#o#p# o#p;'S!Lc;'S;=`#&Y<%lO!Lc=l!Mwl$i&j(Wp!X7`OY(rYZ&cZr(rrs&cs!^(r!^!_)r!_#O(r#O#P&c#P#W(r#W#X!Mn#X#Z(r#Z#[!Mn#[#](r#]#^!Mn#^#a(r#a#b!Mn#b#g(r#g#h!Mn#h#i(r#i#j!Mn#j#k!Mn#k#m(r#m#n!Mn#n#o(r#o#p)r#p;'S(r;'S;=`*a<%lO(r8Q# vZ(Wp!X7`OY# oZr# ors!@cs!P# o!P!Q#!i!Q!}# o!}#O#$R#O#P!Bq#P;'S# o;'S;=`#$y<%lO# o8Q#!pe(Wp!X7`OY)rZr)rs#O)r#P#W)r#W#X#!i#X#Z)r#Z#[#!i#[#])r#]#^#!i#^#a)r#a#b#!i#b#g)r#g#h#!i#h#i)r#i#j#!i#j#k#!i#k#m)r#m#n#!i#n;'S)r;'S;=`*Z<%lO)r8Q#$WX(WpOY#$RZr#$Rrs!Ars#O#$R#O#P!B[#P#Q# o#Q;'S#$R;'S;=`#$s<%lO#$R8Q#$vP;=`<%l#$R8Q#$|P;=`<%l# o=l#%W^$i&j(WpOY#%PYZ&cZr#%Prs!CWs!^#%P!^!_#$R!_#O#%P#O#P!DR#P#Q!Lc#Q#o#%P#o#p#$R#p;'S#%P;'S;=`#&S<%lO#%P=l#&VP;=`<%l#%P=l#&]P;=`<%l!Lc?O#&kn$i&j(Wp(Z!b!X7`OY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#W%Z#W#X#&`#X#Z%Z#Z#[#&`#[#]%Z#]#^#&`#^#a%Z#a#b#&`#b#g%Z#g#h#&`#h#i%Z#i#j#&`#j#k#&`#k#m%Z#m#n#&`#n#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z9d#(r](Wp(Z!b!X7`OY#(iZr#(irs!Grsw#(iwx# ox!P#(i!P!Q#)k!Q!}#(i!}#O#+`#O#P!Bq#P;'S#(i;'S;=`#,`<%lO#(i9d#)th(Wp(Z!b!X7`OY*gZr*grs'}sw*gwx)rx#O*g#P#W*g#W#X#)k#X#Z*g#Z#[#)k#[#]*g#]#^#)k#^#a*g#a#b#)k#b#g*g#g#h#)k#h#i*g#i#j#)k#j#k#)k#k#m*g#m#n#)k#n;'S*g;'S;=`+Z<%lO*g9d#+gZ(Wp(Z!bOY#+`Zr#+`rs!JUsw#+`wx#$Rx#O#+`#O#P!B[#P#Q#(i#Q;'S#+`;'S;=`#,Y<%lO#+`9d#,]P;=`<%l#+`9d#,cP;=`<%l#(i?O#,o`$i&j(Wp(Z!bOY#,fYZ&cZr#,frs!KSsw#,fwx#%Px!^#,f!^!_#+`!_#O#,f#O#P!DR#P#Q!;Z#Q#o#,f#o#p#+`#p;'S#,f;'S;=`#-q<%lO#,f?O#-tP;=`<%l#,f?O#-zP;=`<%l!;Z07[#.[b$i&j(Wp(Z!b(O0/l!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z07[#/o_$i&j(Wp(Z!bT0/lOY#/dYZ&cZr#/drs#0nsw#/dwx#4Ox!^#/d!^!_#5}!_#O#/d#O#P#1p#P#o#/d#o#p#5}#p;'S#/d;'S;=`#6|<%lO#/d06j#0w]$i&j(Z!bT0/lOY#0nYZ&cZw#0nwx#1px!^#0n!^!_#3R!_#O#0n#O#P#1p#P#o#0n#o#p#3R#p;'S#0n;'S;=`#3x<%lO#0n05W#1wX$i&jT0/lOY#1pYZ&cZ!^#1p!^!_#2d!_#o#1p#o#p#2d#p;'S#1p;'S;=`#2{<%lO#1p0/l#2iST0/lOY#2dZ;'S#2d;'S;=`#2u<%lO#2d0/l#2xP;=`<%l#2d05W#3OP;=`<%l#1p01O#3YW(Z!bT0/lOY#3RZw#3Rwx#2dx#O#3R#O#P#2d#P;'S#3R;'S;=`#3r<%lO#3R01O#3uP;=`<%l#3R06j#3{P;=`<%l#0n05x#4X]$i&j(WpT0/lOY#4OYZ&cZr#4Ors#1ps!^#4O!^!_#5Q!_#O#4O#O#P#1p#P#o#4O#o#p#5Q#p;'S#4O;'S;=`#5w<%lO#4O00^#5XW(WpT0/lOY#5QZr#5Qrs#2ds#O#5Q#O#P#2d#P;'S#5Q;'S;=`#5q<%lO#5Q00^#5tP;=`<%l#5Q05x#5zP;=`<%l#4O01p#6WY(Wp(Z!bT0/lOY#5}Zr#5}rs#3Rsw#5}wx#5Qx#O#5}#O#P#2d#P;'S#5};'S;=`#6v<%lO#5}01p#6yP;=`<%l#5}07[#7PP;=`<%l#/d)3h#7ab$i&j$Q(Ch(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;ZAt#8vb$Z#t$i&j(Wp(Z!b!X7`OY!;ZYZ&cZr!;Zrs!<nsw!;Zwx!Lcx!P!;Z!P!Q#&`!Q!^!;Z!^!_#(i!_!}!;Z!}#O#,f#O#P!Dy#P#o!;Z#o#p#(i#p;'S!;Z;'S;=`#-w<%lO!;Z'Ad#:Zp$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!3Y!P!Q%Z!Q![#<_![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S#<_#S#U%Z#U#V#?i#V#X%Z#X#Y!4|#Y#b%Z#b#c#>_#c#d#Bq#d#l%Z#l#m#Es#m#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#<jk$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!O%Z!O!P!3Y!P!Q%Z!Q![#<_![!^%Z!^!_*g!_!g%Z!g!h!4|!h#O%Z#O#P&c#P#R%Z#R#S#<_#S#X%Z#X#Y!4|#Y#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#>j_$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#?rd$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#AQ!R!S#AQ!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#AQ#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#A]f$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!R#AQ!R!S#AQ!S!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#AQ#S#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Bzc$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#DV!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#DV#S#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Dbe$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q!Y#DV!Y!^%Z!^!_*g!_#O%Z#O#P&c#P#R%Z#R#S#DV#S#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#E|g$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#Ge![!^%Z!^!_*g!_!c%Z!c!i#Ge!i#O%Z#O#P&c#P#R%Z#R#S#Ge#S#T%Z#T#Z#Ge#Z#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z'Ad#Gpi$i&j(Wp(Z!bs'9tOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!Q%Z!Q![#Ge![!^%Z!^!_*g!_!c%Z!c!i#Ge!i#O%Z#O#P&c#P#R%Z#R#S#Ge#S#T%Z#T#Z#Ge#Z#b%Z#b#c#>_#c#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z*)x#Il_!g$b$i&j$O)Lv(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z)[#Jv_al$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z04f#LS^h#)`#R-<U(Wp(Z!b$n7`OY*gZr*grs'}sw*gwx)rx!P*g!P!Q#MO!Q!^*g!^!_#Mt!_!`$ f!`#O*g#P;'S*g;'S;=`+Z<%lO*g(n#MXX$k&j(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g(El#M}Z#r(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx!_*g!_!`#Np!`#O*g#P;'S*g;'S;=`+Z<%lO*g(El#NyX$Q(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g(El$ oX#s(Ch(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g*)x$!ga#`*!Y$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`0z!`!a$#l!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(K[$#w_#k(Cl$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z*)x$%Vag!*r#s(Ch$f#|$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`$&[!`!a$'f!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$&g_#s(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$'qa#r(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`!a$(v!a#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$)R`#r(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(Kd$*`a(r(Ct$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!a%Z!a!b$+e!b#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$+p`$i&j#{(Ch(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z%#`$,}_!|$Ip$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z04f$.X_!S0,v$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(n$/]Z$i&jO!^$0O!^!_$0f!_#i$0O#i#j$0k#j#l$0O#l#m$2^#m#o$0O#o#p$0f#p;'S$0O;'S;=`$4i<%lO$0O(n$0VT_#S$i&jO!^&c!_#o&c#p;'S&c;'S;=`&w<%lO&c#S$0kO_#S(n$0p[$i&jO!Q&c!Q![$1f![!^&c!_!c&c!c!i$1f!i#T&c#T#Z$1f#Z#o&c#o#p$3|#p;'S&c;'S;=`&w<%lO&c(n$1kZ$i&jO!Q&c!Q![$2^![!^&c!_!c&c!c!i$2^!i#T&c#T#Z$2^#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$2cZ$i&jO!Q&c!Q![$3U![!^&c!_!c&c!c!i$3U!i#T&c#T#Z$3U#Z#o&c#p;'S&c;'S;=`&w<%lO&c(n$3ZZ$i&jO!Q&c!Q![$0O![!^&c!_!c&c!c!i$0O!i#T&c#T#Z$0O#Z#o&c#p;'S&c;'S;=`&w<%lO&c#S$4PR!Q![$4Y!c!i$4Y#T#Z$4Y#S$4]S!Q![$4Y!c!i$4Y#T#Z$4Y#q#r$0f(n$4lP;=`<%l$0O#1[$4z_!Y#)l$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z(KW$6U`#x(Ch$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z+;p$7c_$i&j(Wp(Z!b(a+4QOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[$8qk$i&j(Wp(Z!b(T,2j$_#t(e$I[OY%ZYZ&cZr%Zrs&}st%Ztu$8buw%Zwx(rx}%Z}!O$:f!O!Q%Z!Q![$8b![!^%Z!^!_*g!_!c%Z!c!}$8b!}#O%Z#O#P&c#P#R%Z#R#S$8b#S#T%Z#T#o$8b#o#p*g#p$g%Z$g;'S$8b;'S;=`$<l<%lO$8b+d$:qk$i&j(Wp(Z!b$_#tOY%ZYZ&cZr%Zrs&}st%Ztu$:fuw%Zwx(rx}%Z}!O$:f!O!Q%Z!Q![$:f![!^%Z!^!_*g!_!c%Z!c!}$:f!}#O%Z#O#P&c#P#R%Z#R#S$:f#S#T%Z#T#o$:f#o#p*g#p$g%Z$g;'S$:f;'S;=`$<f<%lO$:f+d$<iP;=`<%l$:f07[$<oP;=`<%l$8b#Jf$<{X!_#Hb(Wp(Z!bOY*gZr*grs'}sw*gwx)rx#O*g#P;'S*g;'S;=`+Z<%lO*g,#x$=sa(y+JY$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_!`Ka!`#O%Z#O#P&c#P#o%Z#o#p*g#p#q$+e#q;'S%Z;'S;=`+a<%lO%Z)>v$?V_!^(CdvBr$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z?O$@a_!q7`$i&j(Wp(Z!bOY%ZYZ&cZr%Zrs&}sw%Zwx(rx!^%Z!^!_*g!_#O%Z#O#P&c#P#o%Z#o#p*g#p;'S%Z;'S;=`+a<%lO%Z07[$Aq|$i&j(Wp(Z!b'|0/l$]#t(T,2j(e$I[OX%ZXY+gYZ&cZ[+g[p%Zpq+gqr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$f%Z$f$g+g$g#BYEr#BY#BZ$A`#BZ$ISEr$IS$I_$A`$I_$JTEr$JT$JU$A`$JU$KVEr$KV$KW$A`$KW&FUEr&FU&FV$A`&FV;'SEr;'S;=`I|<%l?HTEr?HT?HU$A`?HUOEr07[$D|k$i&j(Wp(Z!b'}0/l$]#t(T,2j(e$I[OY%ZYZ&cZr%Zrs&}st%ZtuEruw%Zwx(rx}%Z}!OGv!O!Q%Z!Q![Er![!^%Z!^!_*g!_!c%Z!c!}Er!}#O%Z#O#P&c#P#R%Z#R#SEr#S#T%Z#T#oEr#o#p*g#p$g%Z$g;'SEr;'S;=`I|<%lOEr",
    tokenizers: [noSemicolon, noSemicolonType, operatorToken, jsx, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, insertSemicolon, new LocalTokenGroup("$S~RRtu[#O#Pg#S#T#|~_P#o#pb~gOx~~jVO#i!P#i#j!U#j#l!P#l#m!q#m;'S!P;'S;=`#v<%lO!P~!UO!U~~!XS!Q![!e!c!i!e#T#Z!e#o#p#Z~!hR!Q![!q!c!i!q#T#Z!q~!tR!Q![!}!c!i!}#T#Z!}~#QR!Q![!P!c!i!P#T#Z!P~#^R!Q![#g!c!i#g#T#Z#g~#jS!Q![#g!c!i#g#T#Z#g#q#r!P~#yP;=`<%l!P~$RO(c~~", 141, 340), new LocalTokenGroup("j~RQYZXz{^~^O(Q~~aP!P!Qd~iO(R~~", 25, 323)],
    topRules: {
      "Script": [0, 7],
      "SingleExpression": [1, 276],
      "SingleClassItem": [2, 277]
    },
    dialects: {
      jsx: 0,
      ts: 15175
    },
    dynamicPrecedences: {
      "80": 1,
      "82": 1,
      "94": 1,
      "169": 1,
      "199": 1
    },
    specialized: [{
      term: 327,
      get: function get(value) {
        return spec_identifier2[value] || -1;
      }
    }, {
      term: 343,
      get: function get(value) {
        return spec_word[value] || -1;
      }
    }, {
      term: 95,
      get: function get(value) {
        return spec_LessThan[value] || -1;
      }
    }],
    tokenPrec: 15201
  });
  function toSet(chars) {
    var flat = Object.keys(chars).join("");
    var words = /\w/.test(flat);
    if (words) flat = flat.replace(new RegExp("\\w", "g"), "");
    return "[" + (words ? "\\w" : "") + flat.replace(new RegExp("[^\\w\\s]", "g"), "\\$&") + "]";
  }
  function prefixMatch(options) {
    var first = Object.create(null),
      rest = Object.create(null);
    for (var _iterator161 = _createForOfIteratorHelperLoose(options), _step161; !(_step161 = _iterator161()).done;) {
      var label = _step161.value.label;
      first[label[0]] = true;
      for (var _i68 = 1; _i68 < label.length; _i68++) rest[label[_i68]] = true;
    }
    var source = toSet(first) + toSet(rest) + "*$";
    return [new RegExp("^" + source), new RegExp(source)];
  }
  function completeFromList(list) {
    var options = list.map(function (o) {
      return typeof o == "string" ? {
        label: o
      } : o;
    });
    var _ref14 = options.every(function (o) {
        return /^\w+$/.test(o.label);
      }) ? [/\w*$/, /\w+$/] : prefixMatch(options),
      _ref15 = _slicedToArray(_ref14, 2),
      validFor = _ref15[0],
      match = _ref15[1];
    return function (context) {
      var token = context.matchBefore(match);
      return token || context.explicit ? {
        from: token ? token.from : context.pos,
        options: options,
        validFor: validFor
      } : null;
    };
  }
  function ifNotIn(nodes, source) {
    return function (context) {
      for (var pos = syntaxTree(context.state).resolveInner(context.pos, -1); pos; pos = pos.parent) {
        if (nodes.indexOf(pos.name) > -1) return null;
        if (pos.type.isTop) break;
      }
      return source(context);
    };
  }
  var pickedCompletion = Annotation.define();
  var windows = typeof navigator == "object" && /Win/.test(navigator.platform);
  var baseTheme2 = EditorView.baseTheme({
    ".cm-tooltip.cm-tooltip-autocomplete": {
      "& > ul": {
        fontFamily: "monospace",
        whiteSpace: "nowrap",
        overflow: "hidden auto",
        maxWidth_fallback: "700px",
        maxWidth: "min(700px, 95vw)",
        minWidth: "250px",
        maxHeight: "10em",
        height: "100%",
        listStyle: "none",
        margin: 0,
        padding: 0,
        "& > li, & > completion-section": {
          padding: "1px 3px",
          lineHeight: 1.2
        },
        "& > li": {
          overflowX: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer"
        },
        "& > completion-section": {
          display: "list-item",
          borderBottom: "1px solid silver",
          paddingLeft: "0.5em",
          opacity: 0.7
        }
      }
    },
    "&light .cm-tooltip-autocomplete ul li[aria-selected]": {
      background: "#17c",
      color: "white"
    },
    "&light .cm-tooltip-autocomplete-disabled ul li[aria-selected]": {
      background: "#777"
    },
    "&dark .cm-tooltip-autocomplete ul li[aria-selected]": {
      background: "#347",
      color: "white"
    },
    "&dark .cm-tooltip-autocomplete-disabled ul li[aria-selected]": {
      background: "#444"
    },
    ".cm-completionListIncompleteTop:before, .cm-completionListIncompleteBottom:after": {
      content: '"\xB7\xB7\xB7"',
      opacity: 0.5,
      display: "block",
      textAlign: "center",
      cursor: "pointer"
    },
    ".cm-tooltip.cm-completionInfo": {
      position: "absolute",
      padding: "3px 9px",
      width: "max-content",
      maxWidth: 400 + "px",
      boxSizing: "border-box",
      whiteSpace: "pre-line"
    },
    ".cm-completionInfo.cm-completionInfo-left": {
      right: "100%"
    },
    ".cm-completionInfo.cm-completionInfo-right": {
      left: "100%"
    },
    ".cm-completionInfo.cm-completionInfo-left-narrow": {
      right: 30 + "px"
    },
    ".cm-completionInfo.cm-completionInfo-right-narrow": {
      left: 30 + "px"
    },
    "&light .cm-snippetField": {
      backgroundColor: "#00000022"
    },
    "&dark .cm-snippetField": {
      backgroundColor: "#ffffff22"
    },
    ".cm-snippetFieldPosition": {
      verticalAlign: "text-top",
      width: 0,
      height: "1.15em",
      display: "inline-block",
      margin: "0 -0.7px -.7em",
      borderLeft: "1.4px dotted #888"
    },
    ".cm-completionMatchedText": {
      textDecoration: "underline"
    },
    ".cm-completionDetail": {
      marginLeft: "0.5em",
      fontStyle: "italic"
    },
    ".cm-completionIcon": {
      fontSize: "90%",
      width: ".8em",
      display: "inline-block",
      textAlign: "center",
      paddingRight: ".6em",
      opacity: "0.6",
      boxSizing: "content-box"
    },
    ".cm-completionIcon-function, .cm-completionIcon-method": {
      "&:after": {
        content: "'\u0192'"
      }
    },
    ".cm-completionIcon-class": {
      "&:after": {
        content: "'\u25CB'"
      }
    },
    ".cm-completionIcon-interface": {
      "&:after": {
        content: "'\u25CC'"
      }
    },
    ".cm-completionIcon-variable": {
      "&:after": {
        content: "'\uD835\uDC65'"
      }
    },
    ".cm-completionIcon-constant": {
      "&:after": {
        content: "'\uD835\uDC36'"
      }
    },
    ".cm-completionIcon-type": {
      "&:after": {
        content: "'\uD835\uDC61'"
      }
    },
    ".cm-completionIcon-enum": {
      "&:after": {
        content: "'\u222A'"
      }
    },
    ".cm-completionIcon-property": {
      "&:after": {
        content: "'\u25A1'"
      }
    },
    ".cm-completionIcon-keyword": {
      "&:after": {
        content: "'\uD83D\uDD11\uFE0E'"
      }
    },
    ".cm-completionIcon-namespace": {
      "&:after": {
        content: "'\u25A2'"
      }
    },
    ".cm-completionIcon-text": {
      "&:after": {
        content: "'abc'",
        fontSize: "50%",
        verticalAlign: "middle"
      }
    }
  });
  var FieldPos = function FieldPos(field, line, from, to) {
    this.field = field;
    this.line = line;
    this.from = from;
    this.to = to;
  };
  var FieldRange = function () {
    function _FieldRange(field, from, to) {
      this.field = field;
      this.from = from;
      this.to = to;
    }
    var _proto126 = _FieldRange.prototype;
    _proto126.map = function map(changes) {
      var from = changes.mapPos(this.from, -1, MapMode.TrackDel);
      var to = changes.mapPos(this.to, 1, MapMode.TrackDel);
      return from == null || to == null ? null : new _FieldRange(this.field, from, to);
    };
    return _FieldRange;
  }();
  var Snippet = function () {
    function _Snippet(lines, fieldPositions) {
      this.lines = lines;
      this.fieldPositions = fieldPositions;
    }
    var _proto127 = _Snippet.prototype;
    _proto127.instantiate = function instantiate(state, pos) {
      var text = [],
        lineStart = [pos];
      var lineObj = state.doc.lineAt(pos),
        baseIndent = /^\s*/.exec(lineObj.text)[0];
      for (var _iterator162 = _createForOfIteratorHelperLoose(this.lines), _step162; !(_step162 = _iterator162()).done;) {
        var line = _step162.value;
        if (text.length) {
          var indent = baseIndent,
            tabs = /^\t*/.exec(line)[0].length;
          for (var _i69 = 0; _i69 < tabs; _i69++) indent += state.facet(indentUnit);
          lineStart.push(pos + indent.length - tabs);
          line = indent + line.slice(tabs);
        }
        text.push(line);
        pos += line.length + 1;
      }
      var ranges = this.fieldPositions.map(function (pos2) {
        return new FieldRange(pos2.field, lineStart[pos2.line] + pos2.from, lineStart[pos2.line] + pos2.to);
      });
      return {
        text: text,
        ranges: ranges
      };
    };
    _Snippet.parse = function parse(template) {
      var fields = [];
      var lines = [],
        positions = [],
        m;
      for (var _iterator163 = _createForOfIteratorHelperLoose(template.split(/\r\n?|\n/)), _step163; !(_step163 = _iterator163()).done;) {
        var line = _step163.value;
        while (m = /[#$]\{(?:(\d+)(?::([^{}]*))?|((?:\\[{}]|[^{}])*))\}/.exec(line)) {
          var seq = m[1] ? +m[1] : null,
            rawName = m[2] || m[3] || "",
            found = -1;
          if (seq === 0) seq = 1e9;
          var _name0 = rawName.replace(new RegExp("\\\\[{}]", "g"), function (m2) {
            return m2[1];
          });
          for (var _i70 = 0; _i70 < fields.length; _i70++) {
            if (seq != null ? fields[_i70].seq == seq : _name0 ? fields[_i70].name == _name0 : false) found = _i70;
          }
          if (found < 0) {
            var _i71 = 0;
            while (_i71 < fields.length && (seq == null || fields[_i71].seq != null && fields[_i71].seq < seq)) _i71++;
            fields.splice(_i71, 0, {
              seq: seq,
              name: _name0
            });
            found = _i71;
            for (var _iterator164 = _createForOfIteratorHelperLoose(positions), _step164; !(_step164 = _iterator164()).done;) {
              var pos = _step164.value;
              if (pos.field >= found) pos.field++;
            }
          }
          for (var _iterator165 = _createForOfIteratorHelperLoose(positions), _step165; !(_step165 = _iterator165()).done;) {
            var _pos2 = _step165.value;
            if (_pos2.line == lines.length && _pos2.from > m.index) {
              var snip = m[2] ? 3 + (m[1] || "").length : 2;
              _pos2.from -= snip;
              _pos2.to -= snip;
            }
          }
          positions.push(new FieldPos(found, lines.length, m.index, m.index + _name0.length));
          line = line.slice(0, m.index) + rawName + line.slice(m.index + m[0].length);
        }
        line = line.replace(new RegExp("\\\\([{}])", "g"), function (_, brace, index) {
          for (var _iterator166 = _createForOfIteratorHelperLoose(positions), _step166; !(_step166 = _iterator166()).done;) {
            var _pos3 = _step166.value;
            if (_pos3.line == lines.length && _pos3.from > index) {
              _pos3.from--;
              _pos3.to--;
            }
          }
          return brace;
        });
        lines.push(line);
      }
      return new _Snippet(lines, positions);
    };
    return _Snippet;
  }();
  var fieldMarker = Decoration.widget({
    widget: new (function (_WidgetType5) {
      function _class4() {
        return _WidgetType5.apply(this, arguments) || this;
      }
      _inheritsLoose(_class4, _WidgetType5);
      var _proto128 = _class4.prototype;
      _proto128.toDOM = function toDOM() {
        var span = document.createElement("span");
        span.className = "cm-snippetFieldPosition";
        return span;
      };
      _proto128.ignoreEvent = function ignoreEvent() {
        return false;
      };
      return _class4;
    }(WidgetType))()
  });
  var fieldRange = Decoration.mark({
    class: "cm-snippetField"
  });
  var ActiveSnippet = function () {
    function _ActiveSnippet(ranges, active) {
      this.ranges = ranges;
      this.active = active;
      this.deco = Decoration.set(ranges.map(function (r) {
        return (r.from == r.to ? fieldMarker : fieldRange).range(r.from, r.to);
      }), true);
    }
    var _proto129 = _ActiveSnippet.prototype;
    _proto129.map = function map(changes) {
      var ranges = [];
      for (var _iterator167 = _createForOfIteratorHelperLoose(this.ranges), _step167; !(_step167 = _iterator167()).done;) {
        var _r6 = _step167.value;
        var mapped = _r6.map(changes);
        if (!mapped) return null;
        ranges.push(mapped);
      }
      return new _ActiveSnippet(ranges, this.active);
    };
    _proto129.selectionInsideField = function selectionInsideField(sel) {
      var _this75 = this;
      return sel.ranges.every(function (range) {
        return _this75.ranges.some(function (r) {
          return r.field == _this75.active && r.from <= range.from && r.to >= range.to;
        });
      });
    };
    return _ActiveSnippet;
  }();
  var setActive = StateEffect.define({
    map: function map(value, changes) {
      return value && value.map(changes);
    }
  });
  var moveToField = StateEffect.define();
  var snippetState = StateField.define({
    create: function create() {
      return null;
    },
    update: function update(value, tr) {
      for (var _iterator168 = _createForOfIteratorHelperLoose(tr.effects), _step168; !(_step168 = _iterator168()).done;) {
        var effect = _step168.value;
        if (effect.is(setActive)) return effect.value;
        if (effect.is(moveToField) && value) return new ActiveSnippet(value.ranges, effect.value);
      }
      if (value && tr.docChanged) value = value.map(tr.changes);
      if (value && tr.selection && !value.selectionInsideField(tr.selection)) value = null;
      return value;
    },
    provide: function provide(f) {
      return EditorView.decorations.from(f, function (val) {
        return val ? val.deco : Decoration.none;
      });
    }
  });
  function fieldSelection(ranges, field) {
    return EditorSelection.create(ranges.filter(function (r) {
      return r.field == field;
    }).map(function (r) {
      return EditorSelection.range(r.from, r.to);
    }));
  }
  function snippet(template) {
    var snippet2 = Snippet.parse(template);
    return function (editor, completion, from, to) {
      var _snippet2$instantiate = snippet2.instantiate(editor.state, from),
        text = _snippet2$instantiate.text,
        ranges = _snippet2$instantiate.ranges;
      var main = editor.state.selection.main;
      var spec = {
        changes: {
          from: from,
          to: to == main.from ? main.to : to,
          insert: Text.of(text)
        },
        scrollIntoView: true,
        annotations: completion ? [pickedCompletion.of(completion), Transaction.userEvent.of("input.complete")] : void 0
      };
      if (ranges.length) spec.selection = fieldSelection(ranges, 0);
      if (ranges.some(function (r) {
        return r.field > 0;
      })) {
        var active = new ActiveSnippet(ranges, 0);
        var effects = spec.effects = [setActive.of(active)];
        if (editor.state.field(snippetState, false) === void 0) effects.push(StateEffect.appendConfig.of([snippetState, addSnippetKeymap, snippetPointerHandler, baseTheme2]));
      }
      editor.dispatch(editor.state.update(spec));
    };
  }
  function moveField(dir) {
    return function (_ref16) {
      var state = _ref16.state,
        dispatch = _ref16.dispatch;
      var active = state.field(snippetState, false);
      if (!active || dir < 0 && active.active == 0) return false;
      var next = active.active + dir,
        last = dir > 0 && !active.ranges.some(function (r) {
          return r.field == next + dir;
        });
      dispatch(state.update({
        selection: fieldSelection(active.ranges, next),
        effects: setActive.of(last ? null : new ActiveSnippet(active.ranges, next)),
        scrollIntoView: true
      }));
      return true;
    };
  }
  var clearSnippet = function clearSnippet(_ref17) {
    var state = _ref17.state,
      dispatch = _ref17.dispatch;
    var active = state.field(snippetState, false);
    if (!active) return false;
    dispatch(state.update({
      effects: setActive.of(null)
    }));
    return true;
  };
  var nextSnippetField = moveField(1);
  var prevSnippetField = moveField(-1);
  var defaultSnippetKeymap = [{
    key: "Tab",
    run: nextSnippetField,
    shift: prevSnippetField
  }, {
    key: "Escape",
    run: clearSnippet
  }];
  var snippetKeymap = Facet.define({
    combine: function combine(maps) {
      return maps.length ? maps[0] : defaultSnippetKeymap;
    }
  });
  var addSnippetKeymap = Prec.highest(keymap.compute([snippetKeymap], function (state) {
    return state.facet(snippetKeymap);
  }));
  function snippetCompletion(template, completion) {
    return _extends({}, completion, {
      apply: snippet(template)
    });
  }
  var snippetPointerHandler = EditorView.domEventHandlers({
    mousedown: function mousedown(event, view) {
      var active = view.state.field(snippetState, false),
        pos;
      if (!active || (pos = view.posAtCoords({
        x: event.clientX,
        y: event.clientY
      })) == null) return false;
      var match = active.ranges.find(function (r) {
        return r.from <= pos && r.to >= pos;
      });
      if (!match || match.field == active.active) return false;
      view.dispatch({
        selection: fieldSelection(active.ranges, match.field),
        effects: setActive.of(active.ranges.some(function (r) {
          return r.field > match.field;
        }) ? new ActiveSnippet(active.ranges, match.field) : null),
        scrollIntoView: true
      });
      return true;
    }
  });
  var closedBracket = new (function (_RangeValue4) {
    function _class5() {
      return _RangeValue4.apply(this, arguments) || this;
    }
    _inheritsLoose(_class5, _RangeValue4);
    return _class5;
  }(RangeValue))();
  closedBracket.startSide = 1;
  closedBracket.endSide = -1;
  var android = typeof navigator == "object" && /Android\b/.test(navigator.userAgent);
  var snippets = [snippetCompletion("function ${name}(${params}) {\n	${}\n}", {
    label: "function",
    detail: "definition",
    type: "keyword"
  }), snippetCompletion("for (let ${index} = 0; ${index} < ${bound}; ${index}++) {\n	${}\n}", {
    label: "for",
    detail: "loop",
    type: "keyword"
  }), snippetCompletion("for (let ${name} of ${collection}) {\n	${}\n}", {
    label: "for",
    detail: "of loop",
    type: "keyword"
  }), snippetCompletion("do {\n	${}\n} while (${})", {
    label: "do",
    detail: "loop",
    type: "keyword"
  }), snippetCompletion("while (${}) {\n	${}\n}", {
    label: "while",
    detail: "loop",
    type: "keyword"
  }), snippetCompletion("try {\n	${}\n} catch (${error}) {\n	${}\n}", {
    label: "try",
    detail: "/ catch block",
    type: "keyword"
  }), snippetCompletion("if (${}) {\n	${}\n}", {
    label: "if",
    detail: "block",
    type: "keyword"
  }), snippetCompletion("if (${}) {\n	${}\n} else {\n	${}\n}", {
    label: "if",
    detail: "/ else block",
    type: "keyword"
  }), snippetCompletion("class ${name} {\n	constructor(${params}) {\n		${}\n	}\n}", {
    label: "class",
    detail: "definition",
    type: "keyword"
  }), snippetCompletion('import {${names}} from "${module}"\n${}', {
    label: "import",
    detail: "named",
    type: "keyword"
  }), snippetCompletion('import ${name} from "${module}"\n${}', {
    label: "import",
    detail: "default",
    type: "keyword"
  })];
  var typescriptSnippets = snippets.concat([snippetCompletion("interface ${name} {\n	${}\n}", {
    label: "interface",
    detail: "definition",
    type: "keyword"
  }), snippetCompletion("type ${name} = ${type}", {
    label: "type",
    detail: "definition",
    type: "keyword"
  }), snippetCompletion("enum ${name} {\n	${}\n}", {
    label: "enum",
    detail: "definition",
    type: "keyword"
  })]);
  var cache = new NodeWeakMap();
  var ScopeNodes = new Set(["Script", "Block", "FunctionExpression", "FunctionDeclaration", "ArrowFunction", "MethodDeclaration", "ForStatement"]);
  function defID(type) {
    return function (node, def) {
      var id2 = node.node.getChild("VariableDefinition");
      if (id2) def(id2, type);
      return true;
    };
  }
  var functionContext = ["FunctionDeclaration"];
  var gatherCompletions = {
    FunctionDeclaration: defID("function"),
    ClassDeclaration: defID("class"),
    ClassExpression: function ClassExpression() {
      return true;
    },
    EnumDeclaration: defID("constant"),
    TypeAliasDeclaration: defID("type"),
    NamespaceDeclaration: defID("namespace"),
    VariableDefinition: function VariableDefinition(node, def) {
      if (!node.matchContext(functionContext)) def(node, "variable");
    },
    TypeDefinition: function TypeDefinition(node, def) {
      def(node, "type");
    },
    __proto__: null
  };
  function getScope(doc2, node) {
    var cached = cache.get(node);
    if (cached) return cached;
    var completions = [],
      top2 = true;
    function def(node2, type) {
      var name2 = doc2.sliceString(node2.from, node2.to);
      completions.push({
        label: name2,
        type: type
      });
    }
    node.cursor(IterMode.IncludeAnonymous).iterate(function (node2) {
      if (top2) {
        top2 = false;
      } else if (node2.name) {
        var gather = gatherCompletions[node2.name];
        if (gather && gather(node2, def) || ScopeNodes.has(node2.name)) return false;
      } else if (node2.to - node2.from > 8192) {
        for (var _iterator169 = _createForOfIteratorHelperLoose(getScope(doc2, node2.node)), _step169; !(_step169 = _iterator169()).done;) {
          var c = _step169.value;
          completions.push(c);
        }
        return false;
      }
    });
    cache.set(node, completions);
    return completions;
  }
  var Identifier = /^[\w$\xa1-\uffff][\w$\d\xa1-\uffff]*$/;
  var dontComplete = ["TemplateString", "String", "RegExp", "LineComment", "BlockComment", "VariableDefinition", "TypeDefinition", "Label", "PropertyDefinition", "PropertyName", "PrivatePropertyDefinition", "PrivatePropertyName", "JSXText", "JSXAttributeValue", "JSXOpenTag", "JSXCloseTag", "JSXSelfClosingTag", ".", "?."];
  function localCompletionSource(context) {
    var inner = syntaxTree(context.state).resolveInner(context.pos, -1);
    if (dontComplete.indexOf(inner.name) > -1) return null;
    var isWord = inner.name == "VariableName" || inner.to - inner.from < 20 && Identifier.test(context.state.sliceDoc(inner.from, inner.to));
    if (!isWord && !context.explicit) return null;
    var options = [];
    for (var pos = inner; pos; pos = pos.parent) {
      if (ScopeNodes.has(pos.name)) options = options.concat(getScope(context.state.doc, pos));
    }
    return {
      options: options,
      from: isWord ? inner.from : context.pos,
      validFor: Identifier
    };
  }
  var javascriptLanguage = LRLanguage.define({
    name: "javascript",
    parser: parser3.configure({
      props: [indentNodeProp.add({
        IfStatement: continuedIndent({
          except: /^\s*({|else\b)/
        }),
        TryStatement: continuedIndent({
          except: /^\s*({|catch\b|finally\b)/
        }),
        LabeledStatement: flatIndent,
        SwitchBody: function SwitchBody(context) {
          var after = context.textAfter,
            closed = /^\s*\}/.test(after),
            isCase = /^\s*(case|default)\b/.test(after);
          return context.baseIndent + (closed ? 0 : isCase ? 1 : 2) * context.unit;
        },
        Block: delimitedIndent({
          closing: "}"
        }),
        ArrowFunction: function ArrowFunction(cx) {
          return cx.baseIndent + cx.unit;
        },
        "TemplateString BlockComment": function TemplateString_BlockComment() {
          return null;
        },
        "Statement Property": continuedIndent({
          except: /^\s*{/
        }),
        JSXElement: function JSXElement(context) {
          var closed = /^\s*<\//.test(context.textAfter);
          return context.lineIndent(context.node.from) + (closed ? 0 : context.unit);
        },
        JSXEscape: function JSXEscape(context) {
          var closed = /\s*\}/.test(context.textAfter);
          return context.lineIndent(context.node.from) + (closed ? 0 : context.unit);
        },
        "JSXOpenTag JSXSelfClosingTag": function JSXOpenTag_JSXSelfClosingTag(context) {
          return context.column(context.node.from) + context.unit;
        }
      }), foldNodeProp.add({
        "Block ClassBody SwitchBody EnumBody ObjectExpression ArrayExpression ObjectType": foldInside,
        BlockComment: function BlockComment(tree) {
          return {
            from: tree.from + 2,
            to: tree.to - 2
          };
        },
        JSXElement: function JSXElement(tree) {
          var open = tree.firstChild;
          if (!open || open.name == "JSXSelfClosingTag") return null;
          var close = tree.lastChild;
          return {
            from: open.to,
            to: close.type.isError ? tree.to : close.from
          };
        },
        "JSXSelfClosingTag JSXOpenTag": function JSXSelfClosingTag_JSXOpenTag(tree) {
          var _a2;
          var name2 = (_a2 = tree.firstChild) === null || _a2 === void 0 ? void 0 : _a2.nextSibling,
            close = tree.lastChild;
          if (!name2 || name2.type.isError) return null;
          return {
            from: name2.to,
            to: close.type.isError ? tree.to : close.from
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
  });
  var jsxSublanguage = {
    test: function test(node) {
      return /^JSX/.test(node.name);
    },
    facet: defineLanguageFacet({
      commentTokens: {
        block: {
          open: "{/*",
          close: "*/}"
        }
      }
    })
  };
  var typescriptLanguage = javascriptLanguage.configure({
    dialect: "ts"
  }, "typescript");
  var jsxLanguage = javascriptLanguage.configure({
    dialect: "jsx",
    props: [sublanguageProp.add(function (n) {
      return n.isTop ? [jsxSublanguage] : void 0;
    })]
  });
  var tsxLanguage = javascriptLanguage.configure({
    dialect: "jsx ts",
    props: [sublanguageProp.add(function (n) {
      return n.isTop ? [jsxSublanguage] : void 0;
    })]
  }, "typescript");
  var kwCompletion = function kwCompletion(name2) {
    return {
      label: name2,
      type: "keyword"
    };
  };
  var keywords = "break case const continue default delete export extends false finally in instanceof let new return static super switch this throw true typeof var yield".split(" ").map(kwCompletion);
  var typescriptKeywords = keywords.concat(["declare", "implements", "private", "protected", "public"].map(kwCompletion));
  function javascript(config) {
    if (config === void 0) {
      config = {};
    }
    var lang = config.jsx ? config.typescript ? tsxLanguage : jsxLanguage : config.typescript ? typescriptLanguage : javascriptLanguage;
    var completions = config.typescript ? typescriptSnippets.concat(typescriptKeywords) : snippets.concat(keywords);
    return new LanguageSupport(lang, [javascriptLanguage.data.of({
      autocomplete: ifNotIn(dontComplete, completeFromList(completions))
    }), javascriptLanguage.data.of({
      autocomplete: localCompletionSource
    }), config.jsx ? autoCloseTags : []]);
  }
  function findOpenTag(node) {
    for (;;) {
      if (node.name == "JSXOpenTag" || node.name == "JSXSelfClosingTag" || node.name == "JSXFragmentTag") return node;
      if (node.name == "JSXEscape" || !node.parent) return null;
      node = node.parent;
    }
  }
  function elementName(doc2, tree, max) {
    if (max === void 0) {
      max = doc2.length;
    }
    for (var ch = tree === null || tree === void 0 ? void 0 : tree.firstChild; ch; ch = ch.nextSibling) {
      if (ch.name == "JSXIdentifier" || ch.name == "JSXBuiltin" || ch.name == "JSXNamespacedName" || ch.name == "JSXMemberExpression") return doc2.sliceString(ch.from, Math.min(ch.to, max));
    }
    return "";
  }
  var android2 = typeof navigator == "object" && /Android\b/.test(navigator.userAgent);
  var autoCloseTags = EditorView.inputHandler.of(function (view, from, to, text, defaultInsert) {
    if ((android2 ? view.composing : view.compositionStarted) || view.state.readOnly || from != to || text != ">" && text != "/" || !javascriptLanguage.isActiveAt(view.state, from, -1)) return false;
    var base2 = defaultInsert(),
      state = base2.state;
    var closeTags = state.changeByRange(function (range) {
      var _a2;
      var head = range.head,
        around = syntaxTree(state).resolveInner(head - 1, -1),
        name2;
      if (around.name == "JSXStartTag") around = around.parent;
      if (state.doc.sliceString(head - 1, head) != text || around.name == "JSXAttributeValue" && around.to > head) ;else if (text == ">" && around.name == "JSXFragmentTag") {
        return {
          range: range,
          changes: {
            from: head,
            insert: "</>"
          }
        };
      } else if (text == "/" && around.name == "JSXStartCloseTag") {
        var empty = around.parent,
          base3 = empty.parent;
        if (base3 && empty.from == head - 2 && ((name2 = elementName(state.doc, base3.firstChild, head)) || ((_a2 = base3.firstChild) === null || _a2 === void 0 ? void 0 : _a2.name) == "JSXFragmentTag")) {
          var insert2 = name2 + ">";
          return {
            range: EditorSelection.cursor(head + insert2.length, -1),
            changes: {
              from: head,
              insert: insert2
            }
          };
        }
      } else if (text == ">") {
        var openTag = findOpenTag(around);
        if (openTag && openTag.name == "JSXOpenTag" && !/^\/?>|^<\//.test(state.doc.sliceString(head, head + 2)) && (name2 = elementName(state.doc, openTag, head))) return {
          range: range,
          changes: {
            from: head,
            insert: "</" + name2 + ">"
          }
        };
      }
      return {
        range: range
      };
    });
    if (closeTags.changes.empty) return false;
    view.dispatch([base2, state.update(closeTags, {
      userEvent: "input.complete",
      scrollIntoView: true
    })]);
    return true;
  });
  var Targets = ["_blank", "_self", "_top", "_parent"];
  var Charsets = ["ascii", "utf-8", "utf-16", "latin1", "latin1"];
  var Methods = ["get", "post", "put", "delete"];
  var Encs = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"];
  var Bool = ["true", "false"];
  var S = {};
  var Tags = {
    a: {
      attrs: {
        href: null,
        ping: null,
        type: null,
        media: null,
        target: Targets,
        hreflang: null
      }
    },
    abbr: S,
    address: S,
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
    article: S,
    aside: S,
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
    b: S,
    base: {
      attrs: {
        href: null,
        target: Targets
      }
    },
    bdi: S,
    bdo: S,
    blockquote: {
      attrs: {
        cite: null
      }
    },
    body: S,
    br: S,
    button: {
      attrs: {
        form: null,
        formaction: null,
        name: null,
        value: null,
        autofocus: ["autofocus"],
        disabled: ["autofocus"],
        formenctype: Encs,
        formmethod: Methods,
        formnovalidate: ["novalidate"],
        formtarget: Targets,
        type: ["submit", "reset", "button"]
      }
    },
    canvas: {
      attrs: {
        width: null,
        height: null
      }
    },
    caption: S,
    center: S,
    cite: S,
    code: S,
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
    dd: S,
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
    dfn: S,
    div: S,
    dl: S,
    dt: S,
    em: S,
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
    figcaption: S,
    figure: S,
    footer: S,
    form: {
      attrs: {
        action: null,
        name: null,
        "accept-charset": Charsets,
        autocomplete: ["on", "off"],
        enctype: Encs,
        method: Methods,
        novalidate: ["novalidate"],
        target: Targets
      }
    },
    h1: S,
    h2: S,
    h3: S,
    h4: S,
    h5: S,
    h6: S,
    head: {
      children: ["title", "base", "link", "style", "meta", "script", "noscript", "command"]
    },
    header: S,
    hgroup: S,
    hr: S,
    html: {
      attrs: {
        manifest: null
      }
    },
    i: S,
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
        formenctype: Encs,
        formmethod: Methods,
        formnovalidate: ["novalidate"],
        formtarget: Targets,
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
    kbd: S,
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
    legend: S,
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
    mark: S,
    menu: {
      attrs: {
        label: null,
        type: ["list", "context", "toolbar"]
      }
    },
    meta: {
      attrs: {
        content: null,
        charset: Charsets,
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
    nav: S,
    noscript: S,
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
    p: S,
    param: {
      attrs: {
        name: null,
        value: null
      }
    },
    pre: S,
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
    rp: S,
    rt: S,
    ruby: S,
    samp: S,
    script: {
      attrs: {
        type: ["text/javascript"],
        src: null,
        async: ["async"],
        defer: ["defer"],
        charset: Charsets
      }
    },
    section: S,
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
    small: S,
    source: {
      attrs: {
        src: null,
        type: null,
        media: null
      }
    },
    span: S,
    strong: S,
    style: {
      attrs: {
        type: ["text/css"],
        media: null,
        scoped: null
      }
    },
    sub: S,
    summary: S,
    sup: S,
    table: S,
    tbody: S,
    td: {
      attrs: {
        colspan: null,
        rowspan: null,
        headers: null
      }
    },
    template: S,
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
    tfoot: S,
    th: {
      attrs: {
        colspan: null,
        rowspan: null,
        headers: null,
        scope: ["row", "col", "rowgroup", "colgroup"]
      }
    },
    thead: S,
    time: {
      attrs: {
        datetime: null
      }
    },
    title: S,
    tr: S,
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
    var: S,
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
    wbr: S
  };
  var GlobalAttrs = {
    accesskey: null,
    class: null,
    contenteditable: Bool,
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
    spellcheck: Bool,
    autocorrect: Bool,
    autocapitalize: Bool,
    style: null,
    tabindex: null,
    title: null,
    translate: ["yes", "no"],
    rel: ["stylesheet", "alternate", "author", "bookmark", "help", "license", "next", "nofollow", "noreferrer", "prefetch", "prev", "search", "tag"],
    role: "alert application article banner button cell checkbox complementary contentinfo dialog document feed figure form grid gridcell heading img list listbox listitem main navigation region row rowgroup search switch tab table tabpanel textbox timer".split(" "),
    "aria-activedescendant": null,
    "aria-atomic": Bool,
    "aria-autocomplete": ["inline", "list", "both", "none"],
    "aria-busy": Bool,
    "aria-checked": ["true", "false", "mixed", "undefined"],
    "aria-controls": null,
    "aria-describedby": null,
    "aria-disabled": Bool,
    "aria-dropeffect": null,
    "aria-expanded": ["true", "false", "undefined"],
    "aria-flowto": null,
    "aria-grabbed": ["true", "false", "undefined"],
    "aria-haspopup": Bool,
    "aria-hidden": Bool,
    "aria-invalid": ["true", "false", "grammar", "spelling"],
    "aria-label": null,
    "aria-labelledby": null,
    "aria-level": null,
    "aria-live": ["off", "polite", "assertive"],
    "aria-multiline": Bool,
    "aria-multiselectable": Bool,
    "aria-owns": null,
    "aria-posinset": null,
    "aria-pressed": ["true", "false", "mixed", "undefined"],
    "aria-readonly": Bool,
    "aria-relevant": null,
    "aria-required": Bool,
    "aria-selected": ["true", "false", "undefined"],
    "aria-setsize": null,
    "aria-sort": ["ascending", "descending", "none", "other"],
    "aria-valuemax": null,
    "aria-valuemin": null,
    "aria-valuenow": null,
    "aria-valuetext": null
  };
  var eventAttributes = "beforeunload copy cut dragstart dragover dragleave dragenter dragend drag paste focus blur change click load mousedown mouseenter mouseleave mouseup keydown keyup resize scroll unload".split(" ").map(function (n) {
    return "on" + n;
  });
  for (var _iterator170 = _createForOfIteratorHelperLoose(eventAttributes), _step170; !(_step170 = _iterator170()).done;) {
    var a = _step170.value;
    GlobalAttrs[a] = null;
  }
  var Schema = function Schema(extraTags, extraAttrs) {
    this.tags = _extends({}, Tags, extraTags);
    this.globalAttrs = _extends({}, GlobalAttrs, extraAttrs);
    this.allTags = Object.keys(this.tags);
    this.globalAttrNames = Object.keys(this.globalAttrs);
  };
  Schema.default = new Schema();
  function elementName2(doc2, tree, max) {
    if (max === void 0) {
      max = doc2.length;
    }
    if (!tree) return "";
    var tag = tree.firstChild;
    var name2 = tag && tag.getChild("TagName");
    return name2 ? doc2.sliceString(name2.from, Math.min(name2.to, max)) : "";
  }
  function findParentElement(tree, skip) {
    if (skip === void 0) {
      skip = false;
    }
    for (; tree; tree = tree.parent) if (tree.name == "Element") {
      if (skip) skip = false;else return tree;
    }
    return null;
  }
  function allowedChildren(doc2, tree, schema) {
    var parentInfo = schema.tags[elementName2(doc2, findParentElement(tree))];
    return (parentInfo === null || parentInfo === void 0 ? void 0 : parentInfo.children) || schema.allTags;
  }
  function openTags(doc2, tree) {
    var open = [];
    for (var parent = findParentElement(tree); parent && !parent.type.isTop; parent = findParentElement(parent.parent)) {
      var tagName = elementName2(doc2, parent);
      if (tagName && parent.lastChild.name == "CloseTag") break;
      if (tagName && open.indexOf(tagName) < 0 && (tree.name == "EndTag" || tree.from >= parent.firstChild.to)) open.push(tagName);
    }
    return open;
  }
  var identifier3 = /^[:\-\.\w\u00b7-\uffff]*$/;
  function completeTag(state, schema, tree, from, to) {
    var end = /\s*>/.test(state.sliceDoc(to, to + 5)) ? "" : ">";
    var parent = findParentElement(tree, tree.name == "StartTag" || tree.name == "TagName");
    return {
      from: from,
      to: to,
      options: allowedChildren(state.doc, parent, schema).map(function (tagName) {
        return {
          label: tagName,
          type: "type"
        };
      }).concat(openTags(state.doc, tree).map(function (tag, i2) {
        return {
          label: "/" + tag,
          apply: "/" + tag + end,
          type: "type",
          boost: 99 - i2
        };
      })),
      validFor: /^\/?[:\-\.\w\u00b7-\uffff]*$/
    };
  }
  function completeCloseTag(state, tree, from, to) {
    var end = /\s*>/.test(state.sliceDoc(to, to + 5)) ? "" : ">";
    return {
      from: from,
      to: to,
      options: openTags(state.doc, tree).map(function (tag, i2) {
        return {
          label: tag,
          apply: tag + end,
          type: "type",
          boost: 99 - i2
        };
      }),
      validFor: identifier3
    };
  }
  function completeStartTag(state, schema, tree, pos) {
    var options = [],
      level = 0;
    for (var _iterator171 = _createForOfIteratorHelperLoose(allowedChildren(state.doc, tree, schema)), _step171; !(_step171 = _iterator171()).done;) {
      var tagName = _step171.value;
      options.push({
        label: "<" + tagName,
        type: "type"
      });
    }
    for (var _iterator172 = _createForOfIteratorHelperLoose(openTags(state.doc, tree)), _step172; !(_step172 = _iterator172()).done;) {
      var open = _step172.value;
      options.push({
        label: "</" + open + ">",
        type: "type",
        boost: 99 - level++
      });
    }
    return {
      from: pos,
      to: pos,
      options: options,
      validFor: /^<\/?[:\-\.\w\u00b7-\uffff]*$/
    };
  }
  function completeAttrName(state, schema, tree, from, to) {
    var elt = findParentElement(tree),
      info = elt ? schema.tags[elementName2(state.doc, elt)] : null;
    var localAttrs = info && info.attrs ? Object.keys(info.attrs) : [];
    var names = info && info.globalAttrs === false ? localAttrs : localAttrs.length ? localAttrs.concat(schema.globalAttrNames) : schema.globalAttrNames;
    return {
      from: from,
      to: to,
      options: names.map(function (attrName) {
        return {
          label: attrName,
          type: "property"
        };
      }),
      validFor: identifier3
    };
  }
  function completeAttrValue(state, schema, tree, from, to) {
    var _a2;
    var nameNode = (_a2 = tree.parent) === null || _a2 === void 0 ? void 0 : _a2.getChild("AttributeName");
    var options = [],
      token = void 0;
    if (nameNode) {
      var attrName = state.sliceDoc(nameNode.from, nameNode.to);
      var attrs = schema.globalAttrs[attrName];
      if (!attrs) {
        var elt = findParentElement(tree),
          info = elt ? schema.tags[elementName2(state.doc, elt)] : null;
        attrs = (info === null || info === void 0 ? void 0 : info.attrs) && info.attrs[attrName];
      }
      if (attrs) {
        var base2 = state.sliceDoc(from, to).toLowerCase(),
          quoteStart = '"',
          quoteEnd = '"';
        if (/^['"]/.test(base2)) {
          token = base2[0] == '"' ? /^[^"]*$/ : /^[^']*$/;
          quoteStart = "";
          quoteEnd = state.sliceDoc(to, to + 1) == base2[0] ? "" : base2[0];
          base2 = base2.slice(1);
          from++;
        } else {
          token = /^[^\s<>='"]*$/;
        }
        for (var _iterator173 = _createForOfIteratorHelperLoose(attrs), _step173; !(_step173 = _iterator173()).done;) {
          var value = _step173.value;
          options.push({
            label: value,
            apply: quoteStart + value + quoteEnd,
            type: "constant"
          });
        }
      }
    }
    return {
      from: from,
      to: to,
      options: options,
      validFor: token
    };
  }
  function htmlCompletionFor(schema, context) {
    var state = context.state,
      pos = context.pos,
      tree = syntaxTree(state).resolveInner(pos, -1),
      around = tree.resolve(pos);
    for (var scan = pos, before; around == tree && (before = tree.childBefore(scan));) {
      var last = before.lastChild;
      if (!last || !last.type.isError || last.from < last.to) break;
      around = tree = before;
      scan = last.from;
    }
    if (tree.name == "TagName") {
      return tree.parent && /CloseTag$/.test(tree.parent.name) ? completeCloseTag(state, tree, tree.from, pos) : completeTag(state, schema, tree, tree.from, pos);
    } else if (tree.name == "StartTag" || tree.name == "IncompleteTag") {
      return completeTag(state, schema, tree, pos, pos);
    } else if (tree.name == "StartCloseTag" || tree.name == "IncompleteCloseTag") {
      return completeCloseTag(state, tree, pos, pos);
    } else if (tree.name == "OpenTag" || tree.name == "SelfClosingTag" || tree.name == "AttributeName") {
      return completeAttrName(state, schema, tree, tree.name == "AttributeName" ? tree.from : pos, pos);
    } else if (tree.name == "Is" || tree.name == "AttributeValue" || tree.name == "UnquotedAttributeValue") {
      return completeAttrValue(state, schema, tree, tree.name == "Is" ? pos : tree.from, pos);
    } else if (context.explicit && (around.name == "Element" || around.name == "Text" || around.name == "Document")) {
      return completeStartTag(state, schema, tree, pos);
    } else {
      return null;
    }
  }
  function htmlCompletionSourceWith(config) {
    var extraTags = config.extraTags,
      extraAttrs = config.extraGlobalAttributes;
    var schema = extraAttrs || extraTags ? new Schema(extraTags, extraAttrs) : Schema.default;
    return function (context) {
      return htmlCompletionFor(schema, context);
    };
  }
  var jsonParser = javascriptLanguage.parser.configure({
    top: "SingleExpression"
  });
  var defaultNesting = [{
    tag: "script",
    attrs: function attrs(_attrs) {
      return _attrs.type == "text/typescript" || _attrs.lang == "ts";
    },
    parser: typescriptLanguage.parser
  }, {
    tag: "script",
    attrs: function attrs(_attrs2) {
      return _attrs2.type == "text/babel" || _attrs2.type == "text/jsx";
    },
    parser: jsxLanguage.parser
  }, {
    tag: "script",
    attrs: function attrs(_attrs3) {
      return _attrs3.type == "text/typescript-jsx";
    },
    parser: tsxLanguage.parser
  }, {
    tag: "script",
    attrs: function attrs(_attrs4) {
      return new RegExp("^(importmap|speculationrules|application\\/(.+\\+)?json)$", "i").test(_attrs4.type);
    },
    parser: jsonParser
  }, {
    tag: "script",
    attrs: function attrs(_attrs5) {
      return !_attrs5.type || new RegExp("^(?:text|application)\\/(?:x-)?(?:java|ecma)script$|^module$|^$", "i").test(_attrs5.type);
    },
    parser: javascriptLanguage.parser
  }, {
    tag: "style",
    attrs: function attrs(_attrs6) {
      return (!_attrs6.lang || _attrs6.lang == "css") && (!_attrs6.type || new RegExp("^(text\\/)?(x-)?(stylesheet|css)$", "i").test(_attrs6.type));
    },
    parser: cssLanguage.parser
  }];
  var defaultAttrs = [{
    name: "style",
    parser: cssLanguage.parser.configure({
      top: "Styles"
    })
  }].concat(eventAttributes.map(function (name2) {
    return {
      name: name2,
      parser: javascriptLanguage.parser
    };
  }));
  var htmlPlain = LRLanguage.define({
    name: "html",
    parser: parser2.configure({
      props: [indentNodeProp.add({
        Element: function Element(context) {
          var after = /^(\s*)(<\/)?/.exec(context.textAfter);
          if (context.node.to <= context.pos + after[0].length) return context.continue();
          return context.lineIndent(context.node.from) + (after[2] ? 0 : context.unit);
        },
        "OpenTag CloseTag SelfClosingTag": function OpenTag_CloseTag_SelfClosingTag(context) {
          return context.column(context.node.from) + context.unit;
        },
        Document: function Document(context) {
          if (context.pos + /\s*/.exec(context.textAfter)[0].length < context.node.to) return context.continue();
          var endElt = null,
            close;
          for (var cur = context.node;;) {
            var last = cur.lastChild;
            if (!last || last.name != "Element" || last.to != cur.to) break;
            endElt = cur = last;
          }
          if (endElt && !((close = endElt.lastChild) && (close.name == "CloseTag" || close.name == "SelfClosingTag"))) return context.lineIndent(endElt.from) + context.unit;
          return null;
        }
      }), foldNodeProp.add({
        Element: function Element(node) {
          var first = node.firstChild,
            last = node.lastChild;
          if (!first || first.name != "OpenTag") return null;
          return {
            from: first.to,
            to: last.name == "CloseTag" ? last.from : node.to
          };
        }
      }), bracketMatchingHandle.add({
        "OpenTag CloseTag": function OpenTag_CloseTag(node) {
          return node.getChild("TagName");
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
  });
  var htmlLanguage = htmlPlain.configure({
    wrap: configureNesting(defaultNesting, defaultAttrs)
  });
  function html(config) {
    if (config === void 0) {
      config = {};
    }
    var dialect = "",
      wrap;
    if (config.matchClosingTags === false) dialect = "noMatch";
    if (config.selfClosingTags === true) dialect = (dialect ? dialect + " " : "") + "selfClosing";
    if (config.nestedLanguages && config.nestedLanguages.length || config.nestedAttributes && config.nestedAttributes.length) wrap = configureNesting((config.nestedLanguages || []).concat(defaultNesting), (config.nestedAttributes || []).concat(defaultAttrs));
    var lang = wrap ? htmlPlain.configure({
      wrap: wrap,
      dialect: dialect
    }) : dialect ? htmlLanguage.configure({
      dialect: dialect
    }) : htmlLanguage;
    return new LanguageSupport(lang, [htmlLanguage.data.of({
      autocomplete: htmlCompletionSourceWith(config)
    }), config.autoCloseTags !== false ? autoCloseTags2 : [], javascript().support, css().support]);
  }
  var selfClosers2 = new Set("area base br col command embed frame hr img input keygen link meta param source track wbr menuitem".split(" "));
  function isClosed(doc2, elt, name2) {
    var _a2;
    for (;;) {
      if (((_a2 = elt.lastChild) === null || _a2 === void 0 ? void 0 : _a2.name) != "CloseTag") return false;
      var next = elt.parent;
      if (!next || elementName2(doc2, next) != name2) return true;
      elt = next;
    }
  }
  var autoCloseTags2 = EditorView.inputHandler.of(function (view, from, to, text, insertTransaction) {
    if (view.composing || view.state.readOnly || from != to || text != ">" && text != "/" || !htmlLanguage.isActiveAt(view.state, from, -1)) return false;
    var base2 = insertTransaction(),
      state = base2.state;
    var closeTags = state.changeByRange(function (range) {
      var _a2;
      var didType = state.doc.sliceString(range.from - 1, range.to) == text;
      var head = range.head,
        after = syntaxTree(state).resolveInner(head, -1),
        name2;
      if (didType && text == ">" && after.name == "EndTag") {
        var tag = after.parent;
        if ((name2 = elementName2(state.doc, tag.parent, head)) && !selfClosers2.has(name2) && !isClosed(state.doc, tag.parent, name2)) {
          var to2 = head + (state.doc.sliceString(head, head + 1) === ">" ? 1 : 0);
          var insert2 = "</" + name2 + ">";
          return {
            range: range,
            changes: {
              from: head,
              to: to2,
              insert: insert2
            }
          };
        }
      } else if (didType && text == "/" && after.name == "IncompleteCloseTag") {
        var _tag = after.parent;
        if (after.from == head - 2 && ((_a2 = _tag.lastChild) === null || _a2 === void 0 ? void 0 : _a2.name) != "CloseTag" && (name2 = elementName2(state.doc, _tag, head)) && !selfClosers2.has(name2)) {
          var _to3 = head + (state.doc.sliceString(head, head + 1) === ">" ? 1 : 0);
          var _insert = name2 + ">";
          return {
            range: EditorSelection.cursor(head + _insert.length, -1),
            changes: {
              from: head,
              to: _to3,
              insert: _insert
            }
          };
        }
      }
      return {
        range: range
      };
    });
    if (closeTags.changes.empty) return false;
    view.dispatch([base2, state.update(closeTags, {
      userEvent: "input.complete",
      scrollIntoView: true
    })]);
    return true;
  });
  var toggleComment = function toggleComment(target) {
    var state = target.state,
      line = state.doc.lineAt(state.selection.main.from),
      config = getConfig(target.state, line.from);
    return config.line ? toggleLineComment(target) : config.block ? toggleBlockCommentByLine(target) : false;
  };
  function command(f, option) {
    return function (_ref18) {
      var state = _ref18.state,
        dispatch = _ref18.dispatch;
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
  function findBlockComment(state, _ref19, from, to) {
    var open = _ref19.open,
      close = _ref19.close;
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
    for (var _iterator174 = _createForOfIteratorHelperLoose(state.selection.ranges), _step174; !(_step174 = _iterator174()).done;) {
      var _r7 = _step174.value;
      var fromLine = state.doc.lineAt(_r7.from);
      var toLine = _r7.to <= fromLine.to ? fromLine : state.doc.lineAt(_r7.to);
      if (toLine.from > fromLine.from && toLine.from == _r7.to) toLine = _r7.to == fromLine.to + 1 ? fromLine : state.doc.lineAt(_r7.to - 1);
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
      for (var _i72 = 0, comment2; _i72 < comments.length; _i72++) if (comment2 = comments[_i72]) {
        var token = tokens[_i72],
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
    ranges: for (var _iterator175 = _createForOfIteratorHelperLoose(ranges), _step175; !(_step175 = _iterator175()).done;) {
      var _step175$value = _step175.value,
        _from2 = _step175$value.from,
        _to4 = _step175$value.to;
      var startI = lines.length,
        minIndent = 1e9,
        _token2 = void 0;
      for (var pos = _from2; pos <= _to4;) {
        var _line4 = state.doc.lineAt(pos);
        if (_token2 == void 0) {
          _token2 = getConfig(state, _line4.from).line;
          if (!_token2) continue ranges;
        }
        if (_line4.from > prevLine && (_from2 == _to4 || _to4 > _line4.from)) {
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
        for (var _i73 = startI; _i73 < lines.length; _i73++) if (lines[_i73].indent < lines[_i73].line.text.length) lines[_i73].indent = minIndent;
      }
      if (lines.length == startI + 1) lines[startI].single = true;
    }
    if (option != 2 && lines.some(function (l) {
      return l.comment < 0 && (!l.empty || l.single);
    })) {
      var changes = [];
      for (var _iterator176 = _createForOfIteratorHelperLoose(lines), _step176; !(_step176 = _iterator176()).done;) {
        var _step176$value = _step176.value,
          line = _step176$value.line,
          token = _step176$value.token,
          indent = _step176$value.indent,
          empty = _step176$value.empty,
          single = _step176$value.single;
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
      for (var _iterator177 = _createForOfIteratorHelperLoose(lines), _step177; !(_step177 = _iterator177()).done;) {
        var _step177$value = _step177.value,
          _line3 = _step177$value.line,
          comment2 = _step177$value.comment,
          _token = _step177$value.token;
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
  function cmd(side, selection2) {
    return function (_ref20) {
      var state = _ref20.state,
        dispatch = _ref20.dispatch;
      if (!selection2 && state.readOnly) return false;
      var historyState = state.field(historyField_, false);
      if (!historyState) return false;
      var tr = historyState.pop(side, state, selection2);
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
    var _proto130 = _HistEvent.prototype;
    _proto130.setSelAfter = function setSelAfter(after) {
      return new _HistEvent(this.changes, this.effects, this.mapped, this.startSelection, after);
    };
    _proto130.toJSON = function toJSON() {
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
    _HistEvent.fromTransaction = function fromTransaction(tr, selection2) {
      var effects = none2;
      for (var _iterator178 = _createForOfIteratorHelperLoose(tr.startState.facet(invertedEffects)), _step178; !(_step178 = _iterator178()).done;) {
        var invert = _step178.value;
        var result = invert(tr);
        if (result.length) effects = effects.concat(result);
      }
      if (!effects.length && tr.changes.empty) return null;
      return new _HistEvent(tr.changes.invert(tr.startState.doc), effects, void 0, selection2 || tr.startState.selection, none2);
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
      for (var _i74 = 0; _i74 < ranges.length;) {
        var from = ranges[_i74++],
          to = ranges[_i74++];
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
  function _addSelection(branch, selection2) {
    if (!branch.length) {
      return [HistEvent.selection([selection2])];
    } else {
      var lastEvent = branch[branch.length - 1];
      var sels = lastEvent.selectionsAfter.slice(Math.max(0, lastEvent.selectionsAfter.length - MaxSelectionsPerEvent));
      if (sels.length && sels[sels.length - 1].eq(selection2)) return branch;
      sels.push(selection2);
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
    var _proto131 = _HistoryState.prototype;
    _proto131.isolate = function isolate() {
      return this.prevTime ? new _HistoryState(this.done, this.undone) : this;
    };
    _proto131.addChanges = function addChanges(event, time, userEvent, config, tr) {
      var done = this.done,
        lastEvent = done[done.length - 1];
      if (lastEvent && lastEvent.changes && !lastEvent.changes.empty && event.changes && (!userEvent || joinableUserEvent.test(userEvent)) && (!lastEvent.selectionsAfter.length && time - this.prevTime < config.newGroupDelay && config.joinToEvent(tr, isAdjacent(lastEvent.changes, event.changes)) || userEvent == "input.type.compose")) {
        done = updateBranch(done, done.length - 1, config.minDepth, new HistEvent(event.changes.compose(lastEvent.changes), conc(StateEffect.mapEffects(event.effects, lastEvent.changes), lastEvent.effects), lastEvent.mapped, lastEvent.startSelection, none2));
      } else {
        done = updateBranch(done, done.length, config.minDepth, event);
      }
      return new _HistoryState(done, none2, time, userEvent);
    };
    _proto131.addSelection = function addSelection(selection2, time, userEvent, newGroupDelay) {
      var last = this.done.length ? this.done[this.done.length - 1].selectionsAfter : none2;
      if (last.length > 0 && time - this.prevTime < newGroupDelay && userEvent == this.prevUserEvent && userEvent && /^select($|\.)/.test(userEvent) && eqSelectionShape(last[last.length - 1], selection2)) return this;
      return new _HistoryState(_addSelection(this.done, selection2), this.undone, time, userEvent);
    };
    _proto131.addMapping = function addMapping(mapping) {
      return new _HistoryState(addMappingToBranch(this.done, mapping), addMappingToBranch(this.undone, mapping), this.prevTime, this.prevUserEvent);
    };
    _proto131.pop = function pop(side, state, onlySelection) {
      var branch = side == 0 ? this.done : this.undone;
      if (branch.length == 0) return null;
      var event = branch[branch.length - 1],
        selection2 = event.selectionsAfter[0] || (event.startSelection ? event.startSelection.map(event.changes.invertedDesc, 1) : state.selection);
      if (onlySelection && event.selectionsAfter.length) {
        return state.update({
          selection: event.selectionsAfter[event.selectionsAfter.length - 1],
          annotations: fromHistory.of({
            side: side,
            rest: popSelection(branch),
            selection: selection2
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
            selection: selection2
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
  function setSel(state, selection2) {
    return state.update({
      selection: selection2,
      scrollIntoView: true,
      userEvent: "select"
    });
  }
  function moveSel(_ref21, how) {
    var state = _ref21.state,
      dispatch = _ref21.dispatch;
    var selection2 = updateSel(state.selection, how);
    if (selection2.eq(state.selection, true)) return false;
    dispatch(setSel(state, selection2));
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
      for (var _iterator179 = _createForOfIteratorHelperLoose(view.state.facet(EditorView.scrollMargins)), _step179; !(_step179 = _iterator179()).done;) {
        var source = _step179.value;
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
      selection2 = updateSel(state.selection, function (range) {
        return range.empty ? view.moveVertically(range, forward, page.height) : rangeEnd(range, forward);
      });
    if (selection2.eq(state.selection)) return false;
    var effect;
    if (page.selfScroll) {
      var startPos = view.coordsAtPos(state.selection.main.head);
      var scrollRect = view.scrollDOM.getBoundingClientRect();
      var scrollTop = scrollRect.top + page.marginTop,
        scrollBottom = scrollRect.bottom - page.marginBottom;
      if (startPos && startPos.top > scrollTop && startPos.bottom < scrollBottom) effect = EditorView.scrollIntoView(selection2.main.head, {
        y: "start",
        yMargin: startPos.top - scrollTop
      });
    }
    view.dispatch(setSel(state, selection2), {
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
      var space3 = /^\s*/.exec(view.state.sliceDoc(line.from, Math.min(line.from + 100, line.to)))[0].length;
      if (space3 && start.head != line.from + space3) moved = EditorSelection.cursor(line.from + space3);
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
      selection2 = updateSel(state.selection, function (range) {
        var matching = matchBrackets(state, range.head, -1) || matchBrackets(state, range.head, 1) || range.head > 0 && matchBrackets(state, range.head - 1, 1) || range.head < state.doc.length && matchBrackets(state, range.head + 1, -1);
        if (!matching || !matching.end) return range;
        found = true;
        var head = matching.start.from == range.head ? matching.end.to : matching.end.from;
        return extend ? EditorSelection.range(range.anchor, head) : EditorSelection.cursor(head);
      });
    if (!found) return false;
    dispatch(setSel(state, selection2));
    return true;
  }
  var cursorMatchingBracket = function cursorMatchingBracket(_ref22) {
    var state = _ref22.state,
      dispatch = _ref22.dispatch;
    return toMatchingBracket(state, dispatch, false);
  };
  function extendSel(target, forward, how) {
    var selection2 = updateSel(target.state.selection, function (range) {
      if (range.undirectional && range.head >= range.anchor != forward) range = EditorSelection.range(range.head, range.anchor);
      var head = how(range);
      return EditorSelection.range(range.anchor, head.head, head.goalColumn, head.bidiLevel || void 0, head.assoc);
    });
    if (selection2.eq(target.state.selection)) return false;
    target.dispatch(setSel(target.state, selection2));
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
  var cursorDocStart = function cursorDocStart(_ref23) {
    var state = _ref23.state,
      dispatch = _ref23.dispatch;
    dispatch(setSel(state, {
      anchor: 0
    }));
    return true;
  };
  var cursorDocEnd = function cursorDocEnd(_ref24) {
    var state = _ref24.state,
      dispatch = _ref24.dispatch;
    dispatch(setSel(state, {
      anchor: state.doc.length
    }));
    return true;
  };
  var selectDocStart = function selectDocStart(_ref25) {
    var state = _ref25.state,
      dispatch = _ref25.dispatch;
    dispatch(setSel(state, {
      anchor: state.selection.main.anchor,
      head: 0
    }));
    return true;
  };
  var selectDocEnd = function selectDocEnd(_ref26) {
    var state = _ref26.state,
      dispatch = _ref26.dispatch;
    dispatch(setSel(state, {
      anchor: state.selection.main.anchor,
      head: state.doc.length
    }));
    return true;
  };
  var selectAll = function selectAll(_ref27) {
    var state = _ref27.state,
      dispatch = _ref27.dispatch;
    dispatch(state.update({
      selection: {
        anchor: 0,
        head: state.doc.length
      },
      userEvent: "select"
    }));
    return true;
  };
  var selectLine = function selectLine(_ref28) {
    var state = _ref28.state,
      dispatch = _ref28.dispatch;
    var ranges = selectedLineBlocks(state).map(function (_ref29) {
      var from = _ref29.from,
        to = _ref29.to;
      return EditorSelection.undirectionalRange(from, Math.min(to + 1, state.doc.length));
    });
    dispatch(state.update({
      selection: EditorSelection.create(ranges),
      userEvent: "select"
    }));
    return true;
  };
  var selectParentSyntax = function selectParentSyntax(_ref30) {
    var state = _ref30.state,
      dispatch = _ref30.dispatch;
    var selection2 = updateSel(state.selection, function (range) {
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
    if (selection2.eq(state.selection)) return false;
    dispatch(setSel(state, selection2));
    return true;
  };
  function addCursorVertically(view, forward) {
    var state = view.state,
      sel = state.selection,
      ranges = state.selection.ranges.slice();
    for (var _iterator180 = _createForOfIteratorHelperLoose(state.selection.ranges), _step180; !(_step180 = _iterator180()).done;) {
      var range = _step180.value;
      var line = state.doc.lineAt(range.head);
      if (forward ? line.to < view.state.doc.length : line.from > 0) {
        var _loop16 = function _loop16(_cur2) {
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
          _ret2 = _loop16(cur);
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
  var simplifySelection = function simplifySelection(_ref31) {
    var state = _ref31.state,
      dispatch = _ref31.dispatch;
    var cur = state.selection,
      selection2 = null;
    if (cur.ranges.length > 1) selection2 = EditorSelection.create([cur.main]);else if (!cur.main.empty) selection2 = EditorSelection.create([EditorSelection.cursor(cur.main.head)]);
    if (!selection2) return false;
    dispatch(setSel(state, selection2));
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
      for (var _iterator181 = _createForOfIteratorHelperLoose(target.state.facet(EditorView.atomicRanges).map(function (f) {
          return f(target);
        })), _step181; !(_step181 = _iterator181()).done;) {
        var ranges = _step181.value;
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
        for (var _i75 = 0; _i75 < drop && before[before.length - 1 - _i75] == " "; _i75++) pos--;
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
      var lineEnd = view.lineBlockAt(range.head).to;
      return range.head < lineEnd ? lineEnd : Math.min(view.state.doc.length, range.head + 1);
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
  var splitLine = function splitLine(_ref32) {
    var state = _ref32.state,
      dispatch = _ref32.dispatch;
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
  var transposeChars = function transposeChars(_ref33) {
    var state = _ref33.state,
      dispatch = _ref33.dispatch;
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
    for (var _iterator182 = _createForOfIteratorHelperLoose(state.selection.ranges), _step182; !(_step182 = _iterator182()).done;) {
      var range = _step182.value;
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
    for (var _iterator183 = _createForOfIteratorHelperLoose(selectedLineBlocks(state)), _step183; !(_step183 = _iterator183()).done;) {
      var block = _step183.value;
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
        for (var _iterator184 = _createForOfIteratorHelperLoose(block.ranges), _step184; !(_step184 = _iterator184()).done;) {
          var _r8 = _step184.value;
          ranges.push(EditorSelection.range(Math.min(state.doc.length, _r8.anchor + size), Math.min(state.doc.length, _r8.head + size)));
        }
      } else {
        changes.push({
          from: nextLine.from,
          to: block.from
        }, {
          from: block.to,
          insert: state.lineBreak + nextLine.text
        });
        for (var _iterator185 = _createForOfIteratorHelperLoose(block.ranges), _step185; !(_step185 = _iterator185()).done;) {
          var _r9 = _step185.value;
          ranges.push(EditorSelection.range(_r9.anchor - size, _r9.head - size));
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
  var moveLineUp = function moveLineUp(_ref34) {
    var state = _ref34.state,
      dispatch = _ref34.dispatch;
    return moveLine(state, dispatch, false);
  };
  var moveLineDown = function moveLineDown(_ref35) {
    var state = _ref35.state,
      dispatch = _ref35.dispatch;
    return moveLine(state, dispatch, true);
  };
  function copyLine(state, dispatch, forward) {
    if (state.readOnly) return false;
    var changes = [];
    for (var _iterator186 = _createForOfIteratorHelperLoose(selectedLineBlocks(state)), _step186; !(_step186 = _iterator186()).done;) {
      var block = _step186.value;
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
  var copyLineUp = function copyLineUp(_ref36) {
    var state = _ref36.state,
      dispatch = _ref36.dispatch;
    return copyLine(state, dispatch, false);
  };
  var copyLineDown = function copyLineDown(_ref37) {
    var state = _ref37.state,
      dispatch = _ref37.dispatch;
    return copyLine(state, dispatch, true);
  };
  var deleteLine = function deleteLine(view) {
    if (view.state.readOnly) return false;
    var state = view.state,
      changes = state.changes(selectedLineBlocks(state).map(function (_ref38) {
        var from = _ref38.from,
          to = _ref38.to;
        if (from > 0) from--;else if (to < state.doc.length) to++;
        return {
          from: from,
          to: to
        };
      }));
    var selection2 = updateSel(state.selection, function (range) {
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
      selection: selection2,
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
    return function (_ref39) {
      var state = _ref39.state,
        dispatch = _ref39.dispatch;
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
  var indentSelection = function indentSelection(_ref40) {
    var state = _ref40.state,
      dispatch = _ref40.dispatch;
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
  var indentMore = function indentMore(_ref41) {
    var state = _ref41.state,
      dispatch = _ref41.dispatch;
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
  var indentLess = function indentLess(_ref42) {
    var state = _ref42.state,
      dispatch = _ref42.dispatch;
    if (state.readOnly) return false;
    dispatch(state.update(changeBySelectedLine(state, function (line, changes) {
      var space3 = /^\s*/.exec(line.text)[0];
      if (!space3) return;
      var col = _countColumn(space3, state.tabSize),
        keep = 0;
      var insert2 = indentString(state, Math.max(0, col - getIndentUnit(state)));
      while (keep < space3.length && keep < insert2.length && space3.charCodeAt(keep) == insert2.charCodeAt(keep)) keep++;
      changes.push({
        from: line.from + keep,
        to: line.from + space3.length,
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
  var chalky = "#e5c07b";
  var coral = "#e06c75";
  var cyan = "#56b6c2";
  var invalid = "#ffffff";
  var ivory = "#abb2bf";
  var stone = "#7d8799";
  var malibu = "#61afef";
  var sage = "#98c379";
  var whiskey = "#d19a66";
  var violet = "#c678dd";
  var darkBackground = "#21252b";
  var highlightBackground = "#2c313a";
  var background = "#282c34";
  var tooltipBackground = "#353a42";
  var selection = "#3E4451";
  var cursor = "#528bff";
  var oneDarkTheme = EditorView.theme({
    "&": {
      color: ivory,
      backgroundColor: background
    },
    ".cm-content": {
      caretColor: cursor
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: cursor
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: selection
    },
    ".cm-panels": {
      backgroundColor: darkBackground,
      color: ivory
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "2px solid black"
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "2px solid black"
    },
    ".cm-searchMatch": {
      backgroundColor: "#72a1ff59",
      outline: "1px solid #457dff"
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "#6199ff2f"
    },
    ".cm-activeLine": {
      backgroundColor: "#6699ff0b"
    },
    ".cm-selectionMatch": {
      backgroundColor: "#aafe661a"
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "#bad0f847"
    },
    ".cm-gutters": {
      backgroundColor: background,
      color: stone,
      border: "none"
    },
    ".cm-activeLineGutter": {
      backgroundColor: highlightBackground
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "#ddd"
    },
    ".cm-tooltip": {
      border: "none",
      backgroundColor: tooltipBackground
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent"
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: tooltipBackground,
      borderBottomColor: tooltipBackground
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: highlightBackground,
        color: ivory
      }
    }
  }, {
    dark: true
  });
  var oneDarkHighlightStyle = HighlightStyle.define([{
    tag: tags.keyword,
    color: violet
  }, {
    tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
    color: coral
  }, {
    tag: [tags.function(tags.variableName), tags.labelName],
    color: malibu
  }, {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: whiskey
  }, {
    tag: [tags.definition(tags.name), tags.separator],
    color: ivory
  }, {
    tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace],
    color: chalky
  }, {
    tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, tags.special(tags.string)],
    color: cyan
  }, {
    tag: [tags.meta, tags.comment],
    color: stone
  }, {
    tag: tags.strong,
    fontWeight: "bold"
  }, {
    tag: tags.emphasis,
    fontStyle: "italic"
  }, {
    tag: tags.strikethrough,
    textDecoration: "line-through"
  }, {
    tag: tags.link,
    color: stone,
    textDecoration: "underline"
  }, {
    tag: tags.heading,
    fontWeight: "bold",
    color: coral
  }, {
    tag: [tags.atom, tags.bool, tags.special(tags.variableName)],
    color: whiskey
  }, {
    tag: [tags.processingInstruction, tags.string, tags.inserted],
    color: sage
  }, {
    tag: tags.invalid,
    color: invalid
  }]);
  var oneDark = [oneDarkTheme, syntaxHighlighting(oneDarkHighlightStyle)];
  var fixtures_default = {
    "typescript": {
      "path": "examples/codemirror/fixtures/example.ts",
      "text": 'type Project = {\n  name: string;\n  files: string[];\n  sandboxed: boolean;\n};\n\nconst projects: Project[] = [\n  { name: "Article", files: ["index.html", "style.css"], sandboxed: true },\n  { name: "Clock", files: ["index.html", "clock.js"], sandboxed: true },\n];\n\nexport function projectSummary(project: Project): string {\n  const mode = project.sandboxed ? "sandboxed" : "trusted";\n  return `${project.name}: ${project.files.length} files, ${mode}`;\n}\n\nfor (const project of projects) {\n  console.log(projectSummary(project));\n}\n'
    },
    "html": {
      "path": "examples/codemirror/fixtures/example.html",
      "text": '<!doctype html>\n<meta charset="utf-8">\n<title>Small article</title>\n<article>\n  <h1>A small article</h1>\n  <p>A constrained document can still be useful and expressive.</p>\n  <p><a href="https://en.wikipedia.org/wiki/WebAssembly">Read about WebAssembly</a>.</p>\n</article>\n'
    },
    "css": {
      "path": "examples/codemirror/fixtures/example.css",
      "text": ":root {\n  color-scheme: dark;\n  font-family: system-ui, sans-serif;\n}\n\narticle {\n  max-width: 42rem;\n  margin: 4rem auto;\n  line-height: 1.6;\n}\n\na { color: #61afef; }\n"
    },
    "json": {
      "path": "examples/codemirror/fixtures/example.json",
      "text": '{\n  "container": "article",\n  "limits": {\n    "elements": 500,\n    "links": 8\n  },\n  "allowedHosts": ["*.wikipedia.org"]\n}\n'
    },
    "markdown": {
      "path": "examples/codemirror/fixtures/example.md",
      "text": "# Sandboxed editor\n\nThe editor state belongs to QuickJS. The browser receives a constrained DOM\nprojection and returns only explicitly supported events and measurements.\n\n## Goals\n\n- Preserve familiar CodeMirror behavior.\n- Keep the browser host generic.\n- Measure before adding specialized batching.\n"
    }
  };
  var nativeCaret = EditorView.theme({
    "&.cm-focused .cm-content, &.cm-focused .cm-line": {
      caretColor: "#528bff !important"
    },
    ".cm-cursorLayer": {
      display: "none"
    }
  });
  function startMultiEditor(files) {
    var workspace = document.getElementById("workspace");
    var tabs = document.createElement("nav");
    var search = document.createElement("form");
    var input = document.createElement("input");
    var results = document.createElement("ol");
    var editors = document.createElement("section");
    var records = [];
    var active = 0;
    tabs.className = "file-tabs";
    tabs.setAttribute("aria-label", "Open files");
    search.className = "file-search";
    input.type = "search";
    input.placeholder = "Search across files";
    input.setAttribute("aria-label", "Search across files");
    results.className = "search-results";
    editors.className = "file-editors";
    search.appendChild(input);
    search.appendChild(results);
    workspace.appendChild(tabs);
    workspace.appendChild(search);
    workspace.appendChild(editors);
    function ensureView(index) {
      var record = records[index];
      if (record.view) return record.view;
      record.view = new EditorView({
        doc: fixtures_default[record.fixture].text,
        extensions: [lineNumbers(), history(), keymap.of([].concat(_toConsumableArray(defaultKeymap), historyKeymap)), record.language(), oneDark, nativeCaret, EditorView.lineWrapping],
        parent: record.surface
      });
      return record.view;
    }
    function activate(index, selection2) {
      active = index;
      records.forEach(function (record, position) {
        var selected = position === index;
        record.button.setAttribute("aria-selected", String(selected));
        record.surface.style.display = selected ? "block" : "none";
      });
      var view = ensureView(index);
      if (selection2) view.dispatch({
        selection: selection2,
        scrollIntoView: true
      });
    }
    function searchFiles(query) {
      results.replaceChildren();
      if (!query) return [];
      var needle = query.toLowerCase();
      var matches = [];
      records.forEach(function (record, fileIndex) {
        var text = record.view ? record.view.state.doc.toString() : fixtures_default[record.fixture].text;
        var lower = text.toLowerCase();
        var from = 0;
        while ((from = lower.indexOf(needle, from)) >= 0) {
          var line = text.slice(0, from).split("\n").length;
          matches.push({
            fileIndex: fileIndex,
            from: from,
            to: from + query.length,
            line: line
          });
          from += Math.max(1, query.length);
        }
      });
      matches.forEach(function (match) {
        var item = document.createElement("li");
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = records[match.fileIndex].name + ":" + match.line;
        button.addEventListener("click", function () {
          return activate(match.fileIndex, {
            anchor: match.from,
            head: match.to
          });
        });
        item.appendChild(button);
        results.appendChild(item);
      });
      return matches;
    }
    files.forEach(function (file, index) {
      var fixture = file[0];
      var name2 = file[1];
      var language2 = file[2];
      var button = document.createElement("button");
      var surface = document.createElement("div");
      button.type = "button";
      button.textContent = name2;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(index === 0));
      button.addEventListener("click", function () {
        return activate(index);
      });
      surface.className = "file-editor";
      surface.style.display = index === 0 ? "block" : "none";
      editors.appendChild(surface);
      tabs.appendChild(button);
      records.push({
        fixture: fixture,
        name: name2,
        language: language2,
        button: button,
        surface: surface,
        view: null
      });
    });
    ensureView(0);
    search.addEventListener("submit", function (event) {
      event.preventDefault();
      searchFiles(input.value);
    });
    input.addEventListener("input", function () {
      return searchFiles(input.value);
    });
    globalThis.multiEditorExample = {
      activate: activate,
      files: records.map(function (record) {
        return record.name;
      }),
      search: searchFiles,
      text: function text(index) {
        if (index === void 0) {
          index = active;
        }
        return ensureView(index).state.doc.toString();
      }
    };
    globalThis.__wwcResult = function () {
      return "CodeMirror:multi:" + records.length + ":" + records.map(function (record) {
        return record.view ? record.view.state.doc.lines : fixtures_default[record.fixture].text.split("\n").length;
      }).join(",");
    };
  }
  startMultiEditor([["typescript", "example.ts", function () {
    return javascript({
      typescript: true
    });
  }], ["html", "example.html", html], ["css", "example.css", css]]);
})();