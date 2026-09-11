function _regeneratorValues(e) { if (null != e) { var t = e["function" == typeof Symbol && Symbol.iterator || "@@iterator"], r = 0; if (t) return t.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) return { next: function next() { return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }; } }; } throw new TypeError(typeof e + " is not iterable"); }
function _regenerator() { var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (_t9) { i = e, c = 1, u = _t9; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (_e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (_n) { return void e(_n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (_r) { o = !0, n = _r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _createForOfIteratorHelperLoose(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (t) return (t = t.call(r)).next.bind(t); if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var o = 0; return function () { return o >= r.length ? { done: !0 } : { done: !1, value: r[o++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
(function (_document$querySelect) {
  globalThis.__resourcesDatasetGet = function (element, name) {
    var value = element.getAttribute(name);
    return value === null ? void 0 : value;
  };
  globalThis.__resourcesDatasetSet = function (element, name, value) {
    element.setAttribute(name, String(value));
    return value;
  };
  globalThis.__resourcesDatasetDelete = function (element, name) {
    element.removeAttribute(name);
    return true;
  };
  var PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?\/?)(?!.*\\)[A-Za-z0-9._~/-]{1,240}$/;
  var MAX_FILES = 64;
  var MAX_FILE_BYTES = 70 * 1024 * 1024;
  var MAX_CONFIG_BYTES = 64e3;
  var MAX_SNAPSHOT_BYTES = 70 * 1024 * 1024;
  var fileJsonBytes = new WeakMap();
  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }
  function jsonValue(value, label) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.map(function (item) {
      return jsonValue(item, label);
    });
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.fromEntries(Object.keys(value).sort().map(function (key) {
        return [key, jsonValue(value[key], label)];
      }));
    }
    throw new Error(label + " must contain only JSON values");
  }
  function same(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  function fileMap(snapshot) {
    return new Map(snapshot.files.map(function (file) {
      return [file.path, file.content];
    }));
  }
  function normalizeProjectSnapshot(value) {
    var _value$config;
    if (value === void 0) {
      value = {};
    }
    var sourceFiles = Array.isArray(value.files) ? value.files : [];
    if (sourceFiles.length > MAX_FILES) throw new Error("Project snapshot exceeds " + MAX_FILES + " files");
    var seen = new Set();
    var files = sourceFiles.map(function (file) {
      var _file$content;
      var path = String((file == null ? void 0 : file.path) || "");
      var content = String((_file$content = file == null ? void 0 : file.content) != null ? _file$content : "");
      if (!PATH.test(path) || path.includes("//")) throw new Error("Invalid project file path: " + path);
      if (seen.has(path)) throw new Error("Duplicate project file path: " + path);
      var previous = file && typeof file === "object" ? fileJsonBytes.get(file) : null;
      var cached = previous && previous.path === path && previous.content === content;
      if (!cached && new TextEncoder().encode(content).byteLength > MAX_FILE_BYTES) throw new Error("Project file exceeds the 50 MB portable-artifact budget: " + path);
      seen.add(path);
      var normalized = Object.freeze({
        path: path,
        content: content
      });
      fileJsonBytes.set(normalized, cached ? previous : {
        path: path,
        content: content,
        bytes: new TextEncoder().encode(JSON.stringify(normalized)).byteLength
      });
      return normalized;
    }).sort(function (left, right) {
      return left.path.localeCompare(right.path);
    });
    var config = jsonValue((_value$config = value.config) != null ? _value$config : {}, "Project configuration");
    if (!config || Array.isArray(config) || typeof config !== "object") throw new Error("Project configuration must be an object");
    if (new TextEncoder().encode(JSON.stringify(config)).byteLength > MAX_CONFIG_BYTES) throw new Error("Project configuration is too large");
    var snapshotBytes = new TextEncoder().encode(JSON.stringify({
      files: [],
      config: config
    })).byteLength + files.reduce(function (bytes, file) {
      return bytes + fileJsonBytes.get(file).bytes;
    }, 0) + Math.max(0, files.length - 1);
    if (snapshotBytes > MAX_SNAPSHOT_BYTES) throw new Error("Project snapshot is too large");
    return Object.freeze({
      files: Object.freeze(files),
      config: Object.freeze(config)
    });
  }
  function textSplice(before, after) {
    var start = 0;
    var common = Math.min(before.length, after.length);
    while (start < common && before.charCodeAt(start) === after.charCodeAt(start)) start++;
    var beforeEnd = before.length;
    var afterEnd = after.length;
    while (beforeEnd > start && afterEnd > start && before.charCodeAt(beforeEnd - 1) === after.charCodeAt(afterEnd - 1)) {
      beforeEnd--;
      afterEnd--;
    }
    return Object.freeze({
      start: start,
      remove: before.slice(start, beforeEnd),
      insert: after.slice(start, afterEnd)
    });
  }
  function configDiff(before, after, path, operations) {
    if (same(before, after)) return;
    var beforeObject = before && typeof before === "object" && !Array.isArray(before);
    var afterObject = after && typeof after === "object" && !Array.isArray(after);
    if (!beforeObject || !afterObject) {
      operations.push(Object.freeze({
        op: "set",
        path: Object.freeze(path),
        before: before,
        value: after
      }));
      return;
    }
    var keys = _toConsumableArray(new Set([].concat(_toConsumableArray(Object.keys(before)), _toConsumableArray(Object.keys(after))))).sort();
    for (var _iterator = _createForOfIteratorHelperLoose(keys), _step; !(_step = _iterator()).done;) {
      var key = _step.value;
      if (!own(after, key)) operations.push(Object.freeze({
        op: "delete",
        path: Object.freeze([].concat(_toConsumableArray(path), [key])),
        before: before[key]
      }));else if (!own(before, key)) operations.push(Object.freeze({
        op: "set",
        path: Object.freeze([].concat(_toConsumableArray(path), [key])),
        absent: true,
        value: after[key]
      }));else configDiff(before[key], after[key], [].concat(_toConsumableArray(path), [key]), operations);
    }
  }
  function diffProjectSnapshots(beforeValue, afterValue) {
    var before = normalizeProjectSnapshot(beforeValue);
    var after = normalizeProjectSnapshot(afterValue);
    var beforeFiles = fileMap(before);
    var afterFiles = fileMap(after);
    var files = [];
    for (var _iterator2 = _createForOfIteratorHelperLoose(_toConsumableArray(new Set([].concat(_toConsumableArray(beforeFiles.keys()), _toConsumableArray(afterFiles.keys())))).sort()), _step2; !(_step2 = _iterator2()).done;) {
      var path = _step2.value;
      if (!afterFiles.has(path)) files.push(Object.freeze({
        op: "delete",
        path: path,
        before: beforeFiles.get(path)
      }));else if (!beforeFiles.has(path)) files.push(Object.freeze({
        op: "add",
        path: path,
        content: afterFiles.get(path)
      }));else if (beforeFiles.get(path) !== afterFiles.get(path)) files.push(Object.freeze(_extends({
        op: "splice",
        path: path
      }, textSplice(beforeFiles.get(path), afterFiles.get(path)))));
    }
    var config = [];
    configDiff(before.config, after.config, [], config);
    return Object.freeze({
      version: 1,
      files: Object.freeze(files),
      config: Object.freeze(config)
    });
  }
  function projectSnapshotsEqual(beforeValue, afterValue) {
    var before = normalizeProjectSnapshot(beforeValue);
    var after = normalizeProjectSnapshot(afterValue);
    return before.files.length === after.files.length && before.files.every(function (file, index) {
      return file.path === after.files[index].path && file.content === after.files[index].content;
    }) && same(before.config, after.config);
  }
  function configParent(root, path) {
    var current = root;
    for (var _iterator3 = _createForOfIteratorHelperLoose(path.slice(0, -1)), _step3; !(_step3 = _iterator3()).done;) {
      var key = _step3.value;
      if (!current || typeof current !== "object" || Array.isArray(current) || !own(current, key)) throw new Error("Configuration patch path does not exist: " + path.join("."));
      current = current[key];
    }
    return {
      parent: current,
      key: path.at(-1)
    };
  }
  function applyProjectPatch(snapshotValue, patch) {
    if (!patch || patch.version !== 1 || !Array.isArray(patch.files) || !Array.isArray(patch.config)) throw new Error("Invalid project patch");
    var snapshot = normalizeProjectSnapshot(snapshotValue);
    var files = fileMap(snapshot);
    for (var _iterator4 = _createForOfIteratorHelperLoose(patch.files), _step4; !(_step4 = _iterator4()).done;) {
      var operation = _step4.value;
      var path = String(operation.path || "");
      if (!PATH.test(path)) throw new Error("Invalid project patch path: " + path);
      if (operation.op === "add") {
        var _operation$content;
        if (files.has(path)) throw new Error("Project patch expected missing file: " + path);
        files.set(path, String((_operation$content = operation.content) != null ? _operation$content : ""));
      } else if (operation.op === "delete") {
        if (!files.has(path) || files.get(path) !== operation.before) throw new Error("Project patch delete mismatch: " + path);
        files.delete(path);
      } else if (operation.op === "splice") {
        var content = files.get(path);
        var start = Number(operation.start);
        if (typeof content !== "string" || !Number.isSafeInteger(start) || start < 0 || content.slice(start, start + operation.remove.length) !== operation.remove) {
          throw new Error("Project patch splice mismatch: " + path);
        }
        files.set(path, content.slice(0, start) + operation.insert + content.slice(start + operation.remove.length));
      } else throw new Error("Unsupported project file operation: " + operation.op);
    }
    var config = structuredClone(snapshot.config);
    for (var _iterator5 = _createForOfIteratorHelperLoose(patch.config), _step5; !(_step5 = _iterator5()).done;) {
      var _operation = _step5.value;
      if (!Array.isArray(_operation.path) || _operation.path.length === 0 || _operation.path.some(function (key2) {
        return typeof key2 !== "string" || !key2;
      })) throw new Error("Invalid configuration patch path");
      var _configParent = configParent(config, _operation.path),
        parent = _configParent.parent,
        key = _configParent.key;
      if (!parent || typeof parent !== "object" || Array.isArray(parent)) throw new Error("Invalid configuration patch parent: " + _operation.path.join("."));
      if (_operation.op === "delete") {
        if (!own(parent, key) || !same(parent[key], _operation.before)) throw new Error("Configuration patch delete mismatch: " + _operation.path.join("."));
        delete parent[key];
      } else if (_operation.op === "set") {
        if (_operation.absent ? own(parent, key) : !own(parent, key) || !same(parent[key], _operation.before)) throw new Error("Configuration patch set mismatch: " + _operation.path.join("."));
        parent[key] = structuredClone(_operation.value);
      } else throw new Error("Unsupported configuration operation: " + _operation.op);
    }
    return normalizeProjectSnapshot({
      files: _toConsumableArray(files).map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2),
          path = _ref2[0],
          content = _ref2[1];
        return {
          path: path,
          content: content
        };
      }),
      config: config
    });
  }
  function projectPatchIsEmpty(patch) {
    var _patch$files, _patch$config;
    return (patch == null ? void 0 : patch.version) === 1 && ((_patch$files = patch.files) == null ? void 0 : _patch$files.length) === 0 && ((_patch$config = patch.config) == null ? void 0 : _patch$config.length) === 0;
  }
  function emptyProjectSnapshot() {
    return normalizeProjectSnapshot({
      files: [],
      config: {}
    });
  }
  var notifyHost = globalThis.__browserUseNotify;
  globalThis.__codeEditorNotify = function (message) {
    if (message && ["change", "ready", "limit"].includes(message.type)) {
      globalThis.__resourcesEditorLocalReceive == null || globalThis.__resourcesEditorLocalReceive(message);
      return;
    }
    notifyHost(JSON.stringify(message));
  };
  notifyHost(JSON.stringify({
    type: "editor-application-ready"
  }));
  if (!globalThis.TextEncoder) {
    globalThis.TextEncoder = function () {
      function TextEncoder() {}
      var _proto = TextEncoder.prototype;
      _proto.encode = function encode(value) {
        var byteLength = 0;
        for (var _iterator6 = _createForOfIteratorHelperLoose(String(value)), _step6; !(_step6 = _iterator6()).done;) {
          var character = _step6.value;
          var point = character.codePointAt(0);
          byteLength += point <= 127 ? 1 : point <= 2047 ? 2 : point <= 65535 ? 3 : 4;
        }
        return {
          byteLength: byteLength
        };
      };
      return TextEncoder;
    }();
  }
  if (!globalThis.structuredClone) globalThis.structuredClone = function (value) {
    return JSON.parse(JSON.stringify(value));
  };
  var history = null;
  function normalizeHistory(value) {
    if (!value || typeof value !== "object") throw new TypeError("Project editor history is required");
    var snapshot = normalizeProjectSnapshot(value.snapshot);
    var snapshots = Array.isArray(value.snapshots) && value.snapshots.length ? value.snapshots.map(normalizeProjectSnapshot) : [snapshot];
    var patches = Array.isArray(value.patches) ? value.patches : [];
    var versionTimes = Array.isArray(value.versionTimes) ? value.versionTimes.map(Number) : [];
    if (patches.length !== snapshots.length || patches.length !== versionTimes.length) {
      throw new Error("Project editor history arrays must have equal lengths");
    }
    return {
      snapshot: snapshot,
      checkpoint: normalizeProjectSnapshot(value.checkpoint || snapshots.at(-1)),
      snapshots: snapshots,
      patches: patches,
      versionTimes: versionTimes,
      createdAt: Number(value.createdAt || versionTimes[0] || Date.now()),
      lastVersionAt: Number(value.lastVersionAt || versionTimes.at(-1) || Date.now())
    };
  }
  function result() {
    return JSON.stringify(history);
  }
  globalThis.__resourcesProjectHistoryInitialize = function (json) {
    history = normalizeHistory(JSON.parse(json));
    return result();
  };
  globalThis.__resourcesProjectHistorySetCurrent = function (json) {
    if (!history) throw new Error("Project editor history is not initialized");
    history.snapshot = normalizeProjectSnapshot(JSON.parse(json).snapshot);
    return result();
  };
  globalThis.__resourcesProjectHistoryCheckpoint = function (json) {
    if (!history) throw new Error("Project editor history is not initialized");
    var request = JSON.parse(json);
    var snapshot = normalizeProjectSnapshot(request.snapshot);
    var now = Number(request.now || Date.now());
    var interval = Number(request.checkpointIntervalMs);
    history.snapshot = snapshot;
    if (request.destructive !== true && now - history.lastVersionAt < interval) return result();
    var patch = diffProjectSnapshots(history.snapshots.at(-1), snapshot);
    if (projectPatchIsEmpty(patch)) return result();
    history.patches.push(patch);
    history.snapshots.push(snapshot);
    history.versionTimes.push(now);
    history.checkpoint = snapshot;
    history.lastVersionAt = now;
    return result();
  };
  globalThis.__resourcesProjectHistoryInspect = function () {
    return result();
  };
  var projectStatus = {
    generation: 0,
    sequence: 0,
    blocking: null,
    events: []
  };
  function projectStatusResult(extra) {
    if (extra === void 0) {
      extra = {};
    }
    return JSON.stringify(_extends({}, projectStatus, extra));
  }
  globalThis.__resourcesProjectStatusBegin = function (json) {
    var generation = Number(JSON.parse(json).generation);
    if (!Number.isSafeInteger(generation) || generation < 1) throw new TypeError("Project status generation is invalid");
    projectStatus = {
      generation: generation,
      sequence: 0,
      blocking: null,
      events: []
    };
    return projectStatusResult({
      accepted: true
    });
  };
  globalThis.__resourcesProjectStatusReport = function (json) {
    var _request$event, _request$event2;
    var request = JSON.parse(json);
    var generation = Number(request.generation);
    if (generation !== projectStatus.generation) return projectStatusResult({
      accepted: false,
      stale: true
    });
    var type = String(((_request$event = request.event) == null ? void 0 : _request$event.type) || "");
    if (!["blocked", "escape", "mounted", "storage"].includes(type)) throw new TypeError("Unsupported project status: " + type);
    var event = {
      type: type,
      sequence: ++projectStatus.sequence,
      message: String(((_request$event2 = request.event) == null ? void 0 : _request$event2.message) || "").slice(0, 2e3)
    };
    if (type === "blocked" && !event.message) event.message = "Project operation was blocked";
    projectStatus.events.push(event);
    if (projectStatus.events.length > 50) projectStatus.events.shift();
    if (type === "blocked") projectStatus.blocking = event;
    return projectStatusResult({
      accepted: true,
      event: event
    });
  };
  globalThis.__resourcesProjectStatusInspect = function () {
    return projectStatusResult();
  };
  var HOST_LABEL = new RegExp("^(?:\\*|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$", "i");
  function wildcardSource(value, _temp) {
    var _ref3 = _temp === void 0 ? {} : _temp,
      _ref3$dotAware = _ref3.dotAware,
      dotAware = _ref3$dotAware === void 0 ? false : _ref3$dotAware;
    return value.split("*").map(function (part) {
      return part.replace(new RegExp("[\\\\^$.*+?()[\\]{}|]", "g"), "\\$&");
    }).join(dotAware ? "[^.]+" : ".*");
  }
  function compileAllowedUrlPattern(input) {
    var source = String(input || "").trim();
    if (!source) throw new Error("URL pattern cannot be empty");
    if (source.startsWith("`") || source.endsWith("`")) {
      if (!(source.length > 2 && source.startsWith("`") && source.endsWith("`"))) throw new Error("Exact URLs need matching backquotes");
      var exact = source.slice(1, -1);
      var parsed = new URL(exact);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Exact URLs must use HTTP or HTTPS");
      return function (value) {
        return String(value) === exact;
      };
    }
    if (source.startsWith("/")) {
      var lastSlash = source.lastIndexOf("/");
      if (lastSlash === 0) throw new Error("Regular expressions need a closing slash");
      var expression2 = new RegExp(source.slice(1, lastSlash), source.slice(lastSlash + 1));
      return function (value) {
        expression2.lastIndex = 0;
        return expression2.test(String(value));
      };
    }
    var slash = source.indexOf("/");
    var hostname = (slash < 0 ? source : source.slice(0, slash)).toLowerCase();
    var path = slash < 0 ? "/*" : source.slice(slash);
    if (!hostname.includes(".") || hostname.split(".").some(function (label) {
      return !HOST_LABEL.test(label);
    })) throw new Error("Use a hostname such as *.wikipedia.org");
    if (!path.startsWith("/")) throw new Error("A hostname path must start with /");
    var hostnamePattern = wildcardSource(hostname, {
      dotAware: true
    });
    var pathPattern = wildcardSource(path);
    var expression = new RegExp("^" + hostnamePattern + "$", "i");
    var pathname = new RegExp("^" + pathPattern + "$");
    return function (value) {
      try {
        var url = new URL(String(value));
        return (url.protocol === "https:" || url.protocol === "http:") && expression.test(url.hostname) && pathname.test("" + url.pathname + url.search + url.hash);
      } catch (_unused) {
        return false;
      }
    };
  }
  function validateAllowedUrlPatterns(patterns) {
    for (var _iterator7 = _createForOfIteratorHelperLoose(patterns || []), _step7; !(_step7 = _iterator7()).done;) {
      var pattern = _step7.value;
      compileAllowedUrlPattern(pattern);
    }
    return patterns;
  }
  var listeners = null;
  var nextRequest = 1;
  var pending = new Map();
  function callGuest(name, payload) {
    if (payload === void 0) {
      payload = {};
    }
    try {
      var result2 = globalThis[name](JSON.stringify(payload));
      return result2 == null ? null : JSON.parse(result2);
    } catch (_error) {
      throw new Error(name + ": " + ((_error == null ? void 0 : _error.message) || String(_error)));
    }
  }
  function callHost(name, payload) {
    if (payload === void 0) {
      payload = {};
    }
    return JSON.parse(globalThis.__wwcServiceCall(name, JSON.stringify(payload)));
  }
  function requestHost(name, payload) {
    if (payload === void 0) {
      payload = {};
    }
    var id = nextRequest++;
    return new Promise(function (resolve, reject) {
      pending.set(id, {
        resolve: resolve,
        reject: reject
      });
      globalThis.__wwcPostMessage(JSON.stringify({
        protocol: "resources-editor-v1",
        id: id,
        name: name,
        payload: payload
      }));
    });
  }
  var previousEditorReceive = globalThis.__resourcesEditorReceive;
  globalThis.__resourcesEditorReceive = function (json) {
    var message = JSON.parse(json);
    if (message.type === "output-error") return previousEditorReceive ? previousEditorReceive(json) : "null";
    var operation = pending.get(message.id);
    if (!operation) return previousEditorReceive ? previousEditorReceive(json) : "null";
    pending.delete(message.id);
    if (message.error) operation.reject(new Error(message.error));else operation.resolve(message.value);
    return "null";
  };
  globalThis.__resourcesEditorLocalReceive = function (message) {
    var _listeners, _listeners2, _listeners3, _listeners4, _listeners5;
    if (message.type === "change") (_listeners = listeners) == null || _listeners.onChange == null || _listeners.onChange(message.content, {
      syntaxErrors: message.syntaxErrors === true
    });else if (message.type === "ready") (_listeners2 = listeners) == null || _listeners2.onReady == null || _listeners2.onReady(message);else if (message.type === "limit") (_listeners3 = listeners) == null || _listeners3.onLimit == null || _listeners3.onLimit(message);else if (message.type === "output-error") (_listeners4 = listeners) == null || _listeners4.onOutputError == null || _listeners4.onOutputError(new Error(message.message));else if (message.type === "output-ready") (_listeners5 = listeners) == null || _listeners5.onOutputReady == null || _listeners5.onOutputReady();
  };
  var EditorResponse = function () {
    function EditorResponse(value) {
      this.status = value.status;
      this.ok = value.status >= 200 && value.status < 300;
      this.url = value.url;
      this.body = value.body;
    }
    var _proto2 = EditorResponse.prototype;
    _proto2.text = function text() {
      return Promise.resolve(this.body);
    };
    _proto2.json = function json() {
      return Promise.resolve(JSON.parse(this.body));
    };
    return EditorResponse;
  }();
  globalThis.fetch = function (input, init) {
    if (init === void 0) {
      init = {};
    }
    return requestHost("fetch", {
      url: String(input),
      method: String(init.method || "GET").toUpperCase(),
      headers: init.headers || {},
      body: init.body == null ? null : String(init.body)
    }).then(function (value) {
      return new EditorResponse(value);
    });
  };
  function downloadProjectArchive(snapshot, name) {
    return callHost("archive.download", {
      snapshot: snapshot,
      name: name
    });
  }
  function importProjectArchive() {
    return requestHost("archive.import");
  }
  function replaceFrontendPath(path) {
    return callHost("route.replace", {
      path: path
    });
  }
  function mountResourcesProjectEditor(_x) {
    return _mountResourcesProjectEditor.apply(this, arguments);
  }
  function _mountResourcesProjectEditor() {
    _mountResourcesProjectEditor = _asyncToGenerator(_regenerator().m(function _callee(options) {
      return _regenerator().w(function (_context) {
        while (1) switch (_context.n) {
          case 0:
            listeners = options;
            return _context.a(2, Object.freeze({
              setContent: function setContent(content, language, settings) {
                if (language === void 0) {
                  language = "plain";
                }
                if (settings === void 0) {
                  settings = {};
                }
                callGuest("__resourcesProjectSelectFile", {
                  path: settings.path || ""
                });
                return callGuest("__codeEditorSetContent", _extends({
                  content: content,
                  language: language
                }, settings));
              },
              setSnapshot: function setSnapshot(snapshot) {
                return callGuest("__resourcesProjectSetSnapshot", {
                  snapshot: snapshot
                });
              },
              renderSnapshot: function renderSnapshot() {
                return callGuest("__resourcesProjectRenderSnapshot");
              },
              command: function command(payload) {
                return callGuest("__codeEditorCommand", payload);
              },
              inspect: function inspect() {
                return callGuest("__codeEditorInspect");
              },
              focus: function focus() {
                return callGuest("__codeEditorFocus");
              },
              destroy: function destroy() {
                listeners = null;
              },
              history: Object.freeze({
                initialize: function initialize(value) {
                  return callGuest("__resourcesProjectHistoryInitialize", value);
                },
                setCurrent: function setCurrent(snapshot) {
                  return callGuest("__resourcesProjectHistorySetCurrent", {
                    snapshot: snapshot
                  });
                },
                checkpoint: function checkpoint(snapshot, settings) {
                  if (settings === void 0) {
                    settings = {};
                  }
                  return callGuest("__resourcesProjectHistoryCheckpoint", {
                    snapshot: snapshot,
                    now: settings.now || Date.now(),
                    destructive: settings.destructive === true,
                    checkpointIntervalMs: settings.checkpointIntervalMs
                  });
                },
                inspect: function inspect() {
                  return callGuest("__resourcesProjectHistoryInspect");
                }
              }),
              projectStatus: Object.freeze({
                begin: function begin(generation) {
                  return callGuest("__resourcesProjectStatusBegin", {
                    generation: generation
                  });
                },
                report: function report(generation, event) {
                  return callGuest("__resourcesProjectStatusReport", {
                    generation: generation,
                    event: event
                  });
                },
                inspect: function inspect() {
                  return callGuest("__resourcesProjectStatusInspect");
                }
              }),
              projectOutput: Object.freeze({
                request: function request(generation) {
                  return callGuest("__resourcesProjectRequestOutput", {
                    generation: generation
                  });
                }
              }),
              setTheme: function setTheme(theme) {
                return callGuest("__codeEditorSetTheme", {
                  theme: theme
                });
              }
            }));
        }
      }, _callee);
    }));
    return _mountResourcesProjectEditor.apply(this, arguments);
  }
  var editorLanguages = [{
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
    name: "markdown",
    title: "Markdown",
    extensions: ["md", "markdown"],
    aliases: ["md"],
    package: "markdown"
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
  }];
  function editorLanguageForPath(path) {
    if (path === "config") return "json";
    var extension = String(path).split("/").pop().split(".").pop().toLowerCase();
    var entry = editorLanguages.find(function (language) {
      return language.extensions.includes(extension);
    });
    return entry ? entry.name : "plain";
  }
  function mountContentNameFields() {
    var generatedSlugs = new WeakMap();
    var pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    var slugSelector = "#project-slug, #organization-slug";
    function slugify(value) {
      var text = String(value || "");
      var normalized = typeof text.normalize === "function" ? text.normalize("NFKD") : text;
      return normalized.replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLowerCase().replace(new RegExp("[\u2019']", "g"), "").replace(new RegExp("[^a-z0-9]+", "g"), "-").replace(new RegExp("^-+|-+$", "g"), "").slice(0, 63).replace(new RegExp("-+$", "g"), "");
    }
    function validate(slug, touched) {
      if (touched === void 0) {
        touched = true;
      }
      var error = document.getElementById(slug.getAttribute("aria-describedby"));
      if (!error) return;
      var invalid = slug.value !== "" && !pattern.test(slug.value);
      slug.setCustomValidity(invalid ? __resourcesDatasetGet(error, "data-message") : "");
      slug.setAttribute("aria-invalid", invalid ? "true" : "false");
      error.hidden = !invalid || !touched;
    }
    function onInput(event) {
      var source = event.target.closest == null ? void 0 : event.target.closest("[data-slug-source], #project-name, #organization-name");
      if (source) {
        var _generatedSlugs$get;
        var id = __resourcesDatasetGet(source, "data-slug-source") || (source.id === "project-name" ? "project-slug" : source.id === "organization-name" ? "organization-slug" : "");
        var slug2 = document.getElementById(id);
        if (!slug2) return;
        var previous = (_generatedSlugs$get = generatedSlugs.get(source)) != null ? _generatedSlugs$get : "";
        if (slug2.value !== "" && slug2.value !== previous) return;
        var generated = slugify(source.value);
        generatedSlugs.set(source, generated);
        slug2.value = generated;
        validate(slug2, false);
        return;
      }
      var slug = event.target.closest == null ? void 0 : event.target.closest(slugSelector);
      if (slug) validate(slug);
    }
    function onFocusOut(event) {
      var slug = event.target.closest == null ? void 0 : event.target.closest(slugSelector);
      if (slug) validate(slug);
    }
    for (var _iterator8 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-slug-source], #project-name, #organization-name, " + slugSelector)), _step8; !(_step8 = _iterator8()).done;) {
      var field = _step8.value;
      field.addEventListener("input", onInput);
    }
    for (var _iterator9 = _createForOfIteratorHelperLoose(document.querySelectorAll(slugSelector)), _step9; !(_step9 = _iterator9()).done;) {
      var _field = _step9.value;
      _field.addEventListener("focusout", onFocusOut);
    }
  }
  var DRAFT_KEY = "resources_project_draft_v5";
  function pendingProjectSnapshotKey(projectId) {
    return projectId ? "resources_project_pending_v1:" + projectId : "";
  }
  var PROJECT_IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
  function isProjectImage(file) {
    var extension = String((file == null ? void 0 : file.path) || "").split(".").at(-1).toLowerCase();
    return PROJECT_IMAGE_TYPES.has(extension) && /^data:image\//.test((file == null ? void 0 : file.content) || "");
  }
  function queryParameter(name) {
    var match = new RegExp("(?:^|&)" + name.replace(new RegExp("[.*+?^${}()|[\\]\\\\]", "g"), "\\$&") + "=([^&]*)").exec(String(location.search || "").replace(/^\?/, ""));
    return match ? decodeURIComponent(match[1].replace(new RegExp("\\+", "g"), " ")) : null;
  }
  function internalHref(link) {
    var href = (link == null || link.getAttribute == null ? void 0 : link.getAttribute("href")) || "";
    return href.startsWith("/") && !href.startsWith("//") ? href : null;
  }
  var _loop = function _loop() {
    var split = _step0.value;
    var trigger = split.querySelector("[data-save-menu-trigger]");
    var menu = split.querySelector("[data-save-menu]");
    trigger.addEventListener("click", function () {
      var opening = menu.hidden;
      menu.hidden = !opening;
      trigger.setAttribute("aria-expanded", String(opening));
    });
    document.addEventListener("pointerdown", function (event) {
      if (!split.contains(event.target)) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  };
  for (var _iterator0 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-save-split]")), _step0; !(_step0 = _iterator0()).done;) {
    _loop();
  }
  document.addEventListener("click", function (event) {
    var link = event.target.closest == null ? void 0 : event.target.closest("a[href]");
    if (!link || link.classList.contains("project-close")) return;
    var target = internalHref(link);
    if (target && /^\/[^/?#]+\/[^/?#]+(?:[?#].*)?$/.test(target)) {
      var stack = [];
      try {
        stack = JSON.parse(sessionStorage.getItem("resources-project-close-stack")) || [];
      } catch (_unused2) {}
      var current = location.pathname + location.search;
      if (stack.at(-1) !== current) stack.push(current);
      sessionStorage.setItem("resources-project-close-stack", JSON.stringify(stack.slice(-20)));
    }
  });
  var _loop2 = function _loop2() {
    var close = _step1.value;
    var stack = [];
    try {
      stack = JSON.parse(sessionStorage.getItem("resources-project-close-stack")) || [];
    } catch (_unused9) {}
    if (!Array.isArray(stack)) stack = [];
    var previous = stack.at(-1);
    close.setAttribute("href", typeof previous === "string" && previous.startsWith("/") && !previous.startsWith("//") ? previous : "/");
    close.addEventListener("click", function () {
      stack.pop();
      sessionStorage.setItem("resources-project-close-stack", JSON.stringify(stack));
    });
  };
  for (var _iterator1 = _createForOfIteratorHelperLoose(document.querySelectorAll(".project-close")), _step1; !(_step1 = _iterator1()).done;) {
    _loop2();
  }
  var _loop3 = function _loop3() {
    var overflow = _step10.value;
    var trigger = overflow.querySelector("[data-project-overflow-trigger]");
    var menu = overflow.querySelector("[data-project-overflow-menu]");
    trigger.addEventListener("click", function () {
      var opening = menu.hidden;
      menu.hidden = !opening;
      trigger.setAttribute("aria-expanded", String(opening));
    });
    document.addEventListener("pointerdown", function (event) {
      if (!overflow.contains(event.target)) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  };
  for (var _iterator10 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-project-overflow]")), _step10; !(_step10 = _iterator10()).done;) {
    _loop3();
  }
  var _loop4 = function _loop4() {
    var _fields$querySelector;
    var fields = _step11.value;
    var modal = fields.querySelector("[data-version-title-modal]");
    if (!modal) return 1;
    var input = modal.querySelector("[data-version-title-input]");
    var hidden = fields.querySelector("[data-version-title]");
    var close = function close() {
      modal.hidden = true;
      input.value = "";
    };
    (_fields$querySelector = fields.querySelector("[data-open-version-title]")) == null || _fields$querySelector.addEventListener("click", function () {
      fields.querySelector("[data-save-menu]").hidden = true;
      modal.hidden = false;
      input.focus();
    });
    modal.querySelector("[data-version-title-cancel]").addEventListener("click", close);
    modal.querySelector("[data-version-title-save]").addEventListener("click", function () {
      var _fields$closest;
      hidden.value = input.value.trim();
      modal.hidden = true;
      (_fields$closest = fields.closest("form")) == null || _fields$closest.requestSubmit(fields.querySelector("[data-project-submit]"));
    });
    modal.addEventListener("pointerdown", function (event) {
      if (event.target === modal) close();
    });
  };
  for (var _iterator11 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-project-fields]")), _step11; !(_step11 = _iterator11()).done;) {
    if (_loop4()) continue;
  }
  var CHECKPOINT_MS = 3e5;
  var STARTING_POINTS = Object.freeze({
    article: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width">\n  <title>A small article</title>\n  <link rel="stylesheet" href="./style.css">\n</head>\n<body>\n  <article>\n    <h1>A small article</h1>\n    <p><a href="https://en.wikipedia.org/wiki/Hypertext">Hypertext</a> connects documents through links and gives the web its navigable structure.</p>\n    <p><a href="https://en.wikipedia.org/wiki/WebAssembly">WebAssembly</a> provides a portable execution format for programs in the browser.</p>\n    <p><a href="https://en.wikipedia.org/wiki/Capability-based_security">Capability-based security</a> limits programs to the authority they are explicitly given.</p>\n  </article>\n</body>\n</html>'
      }, {
        path: "style.css",
        content: "body {\n  margin: 0;\n  font: 17px/1.6 system-ui, sans-serif;\n  color: #eef2ff;\n  background: #151717;\n}\narticle {\n  max-width: 44rem;\n  margin: auto;\n  padding: 3rem 2rem;\n}\na { color: #30d5c8; }\n"
      }],
      config: {
        entry: "index.html",
        template: "article",
        container: "article",
        containerOptions: {
          allowedLinkPatterns: ["*.wikipedia.org"],
          links: {
            addTargetBlank: true
          }
        },
        sandbox: {
          network: false,
          storage: "session"
        }
      }
    },
    hello: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>Hello, HTML</title>\n  <link rel="stylesheet" href="./style.css">\n</head>\n<body>\n  <main>\n    <h1>Hello, HTML</h1>\n    <p>This small page is made from familiar HTML elements.</p>\n    <ul><li>A heading</li><li>A paragraph</li><li>A list</li></ul>\n  </main>\n</body>\n</html>'
      }, {
        path: "style.css",
        content: "body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  color: #f5f7f7;\n  background: #171a1a;\n}\nmain {\n  max-width: 42rem;\n  padding: 2rem;\n}\n"
      }],
      config: {
        entry: "index.html",
        template: "hello",
        container: "page",
        containerOptions: {
          links: {
            addTargetBlank: true
          }
        },
        sandbox: {
          network: false,
          storage: "session"
        }
      }
    },
    html: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width">\n  <title>Single-file document</title>\n  <style>body { margin: 0; min-height: 100vh; display: grid; place-items: center; font: 18px system-ui; color: #eef2ff; background: #171a1a; }</style>\n</head>\n<body><main><h1>Single-file document</h1><p>HTML, CSS, and JavaScript can live together here.</p></main></body>\n</html>'
      }],
      config: {
        entry: "index.html",
        template: "html",
        sandbox: {
          network: false,
          storage: "session"
        }
      }
    },
    clock: {
      files: [{
        path: "index.html",
        content: "<!doctype html>\n<meta charset=\"utf-8\">\n<title>Digital clock</title>\n<main><h1 id=\"time\">--:--:--</h1><p id=\"date\">Waiting for the sandbox\u2026</p></main>\n<script src=\"./script.js\"></script>"
      }, {
        path: "style.css",
        content: "body { margin: 0; font-family: ui-monospace, monospace; color: #f5f7f7; background: #171a1a; }\nmain { padding: 3rem; text-align: center; }\nh1 { font-size: clamp(2rem, 10vw, 5rem); }\n"
      }, {
        path: "script.js",
        content: 'const pad = (value) => String(value).padStart(2, "0");\nfunction tick() {\n  const now = new Date();\n  document.getElementById("time").textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;\n  document.getElementById("date").textContent = now.toLocaleDateString();\n}\ntick();\nsetInterval(tick, 1000);'
      }],
      config: {
        entry: "index.html",
        template: "clock",
        container: "page",
        containerOptions: {
          links: {
            addTargetBlank: true
          }
        },
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    mark: {
      files: [{
        path: "image.svg",
        content: '<svg viewBox="0 0 640 420" role="img" aria-labelledby="mark-title">\n  <title id="mark-title">Logo mark</title>\n  <defs><linearGradient id="mark-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#30d5c8"/><stop offset="100%" stop-color="#3267e3"/></linearGradient></defs>\n  <circle cx="320" cy="210" r="160" fill="url(#mark-gradient)"/>\n  <path d="M 245 285 L 320 120 L 395 285 Z" fill="#151717"/>\n</svg>'
      }],
      config: {
        entry: "image.svg",
        template: "mark",
        container: "svg",
        containerOptions: {
          links: {
            addTargetBlank: true
          }
        },
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    chart: {
      files: [{
        path: "image.svg",
        content: '<svg viewBox="0 0 720 440" role="img" aria-labelledby="chart-title">\n  <title id="chart-title">Bar chart</title>\n  <line x1="80" y1="360" x2="660" y2="360" stroke="#839099"/>\n  <rect x="130" y="210" width="90" height="150" rx="8" fill="#30d5c8"/>\n  <rect x="315" y="120" width="90" height="240" rx="8" fill="#3267e3"/>\n  <rect x="500" y="170" width="90" height="190" rx="8" fill="#ae79ff"/>\n  <text x="148" y="395" fill="#eef2ff">HTML</text><text x="340" y="395" fill="#eef2ff">SVG</text><text x="510" y="395" fill="#eef2ff">Canvas</text>\n</svg>'
      }],
      config: {
        entry: "image.svg",
        template: "chart",
        container: "svg",
        containerOptions: {
          links: {
            addTargetBlank: true
          }
        },
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    ball: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<meta charset="utf-8">\n<title>Bouncing ball</title>\n<canvas width="720" height="440" aria-label="Animated bouncing ball"></canvas>\n<script src="./script.js"></script>'
      }, {
        path: "script.js",
        content: 'const canvas = document.querySelector("canvas");\nconst context = canvas.getContext("2d");\nlet x = 90, y = 80, dx = 5, dy = 4;\nfunction frame() {\n  x += dx; y += dy;\n  if (x < 28 || x > canvas.width - 28) dx *= -1;\n  if (y < 28 || y > canvas.height - 28) dy *= -1;\n  context.clearRect(0, 0, canvas.width, canvas.height);\n  context.fillStyle = "#30d5c8"; context.beginPath(); context.arc(x, y, 26, 0, Math.PI * 2); context.fill();\n  requestAnimationFrame(frame);\n}\nframe();'
      }],
      config: {
        entry: "index.html",
        template: "ball",
        container: "canvas",
        containerOptions: {
          links: {
            addTargetBlank: true
          }
        },
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    stars: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<meta charset="utf-8">\n<title>Starfield</title>\n<canvas width="720" height="440" aria-label="Animated starfield"></canvas>\n<script src="./script.js"></script>'
      }, {
        path: "script.js",
        content: 'const canvas = document.querySelector("canvas");\nconst context = canvas.getContext("2d");\nconst width = canvas.width, height = canvas.height;\nconst stars = Array.from({ length: 120 }, () => ({ x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() }));\nlet last = null;\nfunction frame(time) {\n  if (last === null) last = time;\n  const elapsed = Math.min((time - last) / 1000, 0.1); last = time;\n  context.fillStyle = "rgba(0,0,0,0.4)"; context.fillRect(0, 0, width, height);\n  for (const star of stars) {\n    star.z -= 0.5 * elapsed;\n    if (star.z <= 0.02) { star.x = Math.random() - 0.5; star.y = Math.random() - 0.5; star.z = 1; }\n    const x = width / 2 + (star.x / star.z) * width;\n    const y = height / 2 + (star.y / star.z) * height;\n    context.fillStyle = "#cdd9ff"; context.beginPath(); context.arc(x, y, (1 - star.z) * 2.3, 0, Math.PI * 2); context.fill();\n  }\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);'
      }],
      config: {
        entry: "index.html",
        template: "stars",
        container: "canvas",
        containerOptions: {
          links: {
            addTargetBlank: true
          }
        },
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    paint: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<meta charset="utf-8">\n<title>Canvas paint</title>\n<canvas width="720" height="440" aria-label="Click to paint colorful squares"></canvas>\n<script src="./script.js"></script>'
      }, {
        path: "script.js",
        content: 'const canvas = document.querySelector("canvas");\nconst context = canvas.getContext("2d");\ncontext.fillStyle = "#111827";\ncontext.fillRect(0, 0, canvas.width, canvas.height);\nlet color = 0;\ncanvas.addEventListener("click", (event) => {\n  const box = canvas.getBoundingClientRect();\n  const x = (event.clientX - box.left) * canvas.width / box.width;\n  const y = (event.clientY - box.top) * canvas.height / box.height;\n  const colors = ["#30d5c8", "#ae79ff", "#ff8f6b", "#facc15"];\n  context.fillStyle = colors[color++ % colors.length];\n  context.fillRect(x - 18, y - 18, 36, 36);\n});'
      }],
      config: {
        entry: "index.html",
        template: "paint",
        container: "canvas",
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    webgl: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<meta charset="utf-8">\n<title>WebGL triangle</title>\n<canvas width="720" height="440" aria-label="A triangle drawn with WebGL"></canvas>\n<script src="./script.js"></script>'
      }, {
        path: "script.js",
        content: 'const canvas = document.querySelector("canvas");\nconst gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });\nif (!gl) throw new Error("WebGL is unavailable");\nfunction shader(type, source) {\n  const value = gl.createShader(type);\n  gl.shaderSource(value, source);\n  gl.compileShader(value);\n  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed");\n  return value;\n}\nconst program = gl.createProgram();\ngl.attachShader(program, shader(gl.VERTEX_SHADER, "attribute vec2 point; void main(){ gl_Position=vec4(point,0.0,1.0); }"));\ngl.attachShader(program, shader(gl.FRAGMENT_SHADER, "precision mediump float; void main(){ gl_FragColor=vec4(0.19,0.84,0.78,1.0); }"));\ngl.linkProgram(program);\nif (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Program linking failed");\ngl.useProgram(program);\nconst buffer = gl.createBuffer();\ngl.bindBuffer(gl.ARRAY_BUFFER, buffer);\ngl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.75,-0.65, 0.75,-0.65, 0,0.75]), gl.STATIC_DRAW);\nconst point = gl.getAttribLocation(program, "point");\ngl.enableVertexAttribArray(point);\ngl.vertexAttribPointer(point, 2, gl.FLOAT, false, 0, 0);\ngl.viewport(0, 0, canvas.width, canvas.height);\ngl.clearColor(0.06, 0.09, 0.16, 1);\ngl.clear(gl.COLOR_BUFFER_BIT);\ngl.drawArrays(gl.TRIANGLES, 0, 3);'
      }],
      config: {
        entry: "index.html",
        template: "webgl",
        container: "canvas",
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    webgpu: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<meta charset="utf-8">\n<title>WebGPU triangle</title>\n<canvas width="720" height="440" aria-label="A triangle drawn with WebGPU"></canvas>\n<script src="./script.js"></script>'
      }, {
        path: "script.js",
        content: 'const canvas = document.querySelector("canvas");\nconst gpu = canvas.getContext("webgpu");\nif (!gpu) throw new Error("WebGPU is unavailable");\ngpu.renderTriangle();'
      }],
      config: {
        entry: "index.html",
        template: "webgpu",
        container: "canvas",
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    three: {
      files: [{
        path: "scene.js",
        content: 'const canvas = document.querySelector("canvas");\nconst geometry = new THREE.BufferGeometry();\ngeometry.setAttribute("position", new THREE.Float32BufferAttribute([-0.72,-0.62,0, 0.72,-0.62,0, 0,0.72,0], 3));\nconst points = geometry.getAttribute("position").array;\nconst gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });\nfunction shader(type, source) { const item = gl.createShader(type); gl.shaderSource(item, source); gl.compileShader(item); return item; }\nconst program = gl.createProgram();\ngl.attachShader(program, shader(gl.VERTEX_SHADER, "attribute vec3 point; void main(){ gl_Position=vec4(point,1.0); }"));\ngl.attachShader(program, shader(gl.FRAGMENT_SHADER, "precision mediump float; void main(){ gl_FragColor=vec4(1.0,0.56,0.42,1.0); }"));\ngl.linkProgram(program); gl.useProgram(program);\nconst buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);\nconst point = gl.getAttribLocation(program, "point"); gl.enableVertexAttribArray(point); gl.vertexAttribPointer(point, 3, gl.FLOAT, false, 0, 0);\ngl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0.06,0.09,0.16,1); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES,0,3);'
      }, {
        path: "three-build-runtime.js",
        content: "module.exports = { build: function (source, config) { return { files: [\n  { path: 'index.html', content: '<!doctype html><meta charset=\\\"utf-8\\\"><title>Three.js triangle</title><canvas width=\\\"720\\\" height=\\\"440\\\" aria-label=\\\"A triangle built with Three.js\\\"></canvas><script src=\\\"./three-runtime.js\\\"><\\/script><script src=\\\"./scene.js\\\"><\\/script>' },\n  { path: 'three-runtime.js', content: BUILD_API.runtime('three') },\n  { path: 'scene.js', content: source }\n], config: { entry: 'index.html', template: config.template } }; } };"
      }, {
        path: "build.js",
        content: "module.exports = function (input) { return input.runtime.build(input.application, input.config); };"
      }],
      config: {
        entry: "scene.js",
        template: "three",
        build: {
          runtime: "three-build-runtime.js",
          script: "build.js",
          application: "scene.js"
        },
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    vue: {
      files: [{
        path: "App.vue",
        content: '<template>\n  <main>\n    <h1>Vue SFC</h1>\n    <button @click="count++">Count {{ count }}</button>\n  </main>\n</template>\n\n<script>\nexport default {\n  data() { return { count: 0 }; }\n};\n</script>\n\n<style>\nbody { margin: 0; display: flex; min-height: 100vh; align-items: center; justify-content: center; font: 16px system-ui; background: #182120; color: #edf7f5; }\nmain { text-align: center; }\nbutton { padding: 0.6rem 1rem; border: 0; border-radius: 0.5rem; color: #102523; background: #55d8c9; cursor: pointer; }\n</style>'
      }, {
        path: "vue-build-runtime.js",
        content: "module.exports = {\n  build: function (source, path, config) {\n    var compiled = BUILD_API.compileVue(source, path);\n    var component = compiled.script.replace(/export\\s+default/, 'var component =');\n    var render = 'var render = (new Function(\\\"Vue\\\", ' + JSON.stringify(compiled.render) + '))(Vue);\\ncomponent.render = render;\\nVue.createApp(component).mount(\\\"#app\\\");';\n    return {\n      files: [\n        { path: 'index.html', content: '<!doctype html><html><head><meta charset=\\\"utf-8\\\"><title>Vue SFC</title><link rel=\\\"stylesheet\\\" href=\\\"./style.css\\\"></head><body><div id=\\\"app\\\"></div><script src=\\\"./vue-runtime.js\\\"><\\/script><script src=\\\"./app.js\\\"><\\/script></body></html>' },\n        { path: 'style.css', content: compiled.styles },\n        { path: 'vue-runtime.js', content: BUILD_API.runtime('vue') },\n        { path: 'app.js', content: component + '\\n' + render }\n      ],\n      config: { entry: 'index.html', template: config.template, stylesheets: ['style.css'] }\n    };\n  }\n};"
      }, {
        path: "build.js",
        content: "module.exports = function (input) {\n  return input.runtime.build(input.application, input.applicationPath, input.config);\n};"
      }],
      config: {
        entry: "App.vue",
        template: "vue",
        build: {
          runtime: "vue-build-runtime.js",
          script: "build.js",
          application: "App.vue"
        },
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    svelte: {
      files: [{
        path: "App.svelte",
        content: "<script>\n  let count = 0;\n</script>\n\n<main>\n  <h1>Svelte</h1>\n  <button onclick={() => count++}>Count {count}</button>\n</main>\n\n<style>\n  :global(body) { margin: 0; display: grid; min-height: 100vh; place-items: center; font: 16px system-ui; background: #221b1b; color: #fff3ed; }\n  main { text-align: center; }\n  button { padding: 0.6rem 1rem; border: 0; border-radius: 0.5rem; color: #32170f; background: #ff8f6b; cursor: pointer; }\n</style>"
      }, {
        path: "svelte-build-runtime.js",
        content: "module.exports = {\n  build: function (source, path, config) {\n    var compiled = BUILD_API.compileSvelte(source, path).code\n      .replace(/^import ['\"]svelte\\/internal\\/(?:disclose-version|flags\\/legacy)['\"];?\\s*$/gm, '')\n      .replace(/^import \\* as \\$ from ['\"]svelte\\/internal\\/client['\"];?\\s*$/m, 'var $ = SvelteInternal;')\n      .replace('export default function App', 'function App');\n    compiled += '\\nSvelte.mount(App, { target: document.getElementById(\\\"app\\\") });';\n    return {\n      files: [\n        { path: 'index.html', content: '<!doctype html><html><head><meta charset=\\\"utf-8\\\"><title>Svelte</title></head><body><div id=\\\"app\\\"></div><script src=\\\"./svelte-runtime.js\\\"><\\/script><script src=\\\"./app.js\\\"><\\/script></body></html>' },\n        { path: 'svelte-runtime.js', content: BUILD_API.runtime('svelte') },\n        { path: 'app.js', content: compiled }\n      ],\n      config: { entry: 'index.html', template: config.template }\n    };\n  }\n};"
      }, {
        path: "build.js",
        content: "module.exports = function (input) {\n  return input.runtime.build(input.application, input.applicationPath, input.config);\n};"
      }],
      config: {
        entry: "App.svelte",
        template: "svelte",
        build: {
          runtime: "svelte-build-runtime.js",
          script: "build.js",
          application: "App.svelte"
        },
        sandbox: {
          network: false,
          storage: "memory"
        }
      }
    },
    blank: {
      files: [{
        path: "index.html",
        content: ""
      }],
      config: {
        entry: "index.html",
        template: "blank",
        container: "page",
        containerOptions: {
          links: {
            addTargetBlank: true
          }
        },
        sandbox: {
          network: false,
          storage: "session"
        }
      }
    },
    slides: {
      files: [{
        path: "index.html",
        content: '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Small presentation</title><style>html,body{margin:0;height:100%;background:#101321;color:#f4f6ff;font:20px system-ui}main{height:100%;display:grid;place-items:center;text-align:center}small{color:#9da8d8}</style></head><body><main><div><h1>Small presentation</h1><p>A portable, single-file starting point.</p><small>Import a Resources project ZIP to replace it.</small></div></main></body></html>'
      }],
      config: {
        entry: "index.html",
        template: "slides",
        container: "single-file-web-app",
        sandbox: {
          network: false,
          storage: "session"
        }
      }
    }
  });
  for (var _iterator12 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-project-template]")), _step12; !(_step12 = _iterator12()).done;) {
    var select = _step12.value;
    var before = select.querySelector('option[value="vue"]');
    for (var _i = 0, _arr = [["paint", "Canvas paint"], ["webgl", "WebGL triangle"], ["webgpu", "WebGPU triangle"], ["three", "Three.js triangle"], ["slides", "Presentation"]]; _i < _arr.length; _i++) {
      var _arr$_i = _slicedToArray(_arr[_i], 2),
        value = _arr$_i[0],
        label = _arr$_i[1];
      if (select.querySelector("option[value=\"" + value + "\"]")) continue;
      var option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.insertBefore(option, before);
    }
  }
  mountContentNameFields();
  (_document$querySelect = document.querySelector("[data-try-form]")) == null || _document$querySelect.addEventListener("submit", function (event) {
    return event.preventDefault();
  });
  function attachInstantTooltip(button, label, shouldShow) {
    if (label === void 0) {
      label = __resourcesDatasetGet(button, "data-instant-tooltip");
    }
    if (shouldShow === void 0) {
      shouldShow = function shouldShow() {
        return true;
      };
    }
    if (!label || __resourcesDatasetGet(button, "data-instant-tooltip-attached") === "true") return;
    __resourcesDatasetSet(button, "data-instant-tooltip", label);
    __resourcesDatasetSet(button, "data-instant-tooltip-attached", "true");
    var tooltip = null;
    var showTimer = null;
    var show = function show() {
      if (!shouldShow(button) || button.getAttribute("aria-expanded") === "true") return;
      if (!tooltip) {
        tooltip = document.createElement("span");
        tooltip.className = "instant-tooltip";
        tooltip.textContent = label;
        document.body.append(tooltip);
      }
      requestAnimationFrame(function () {
        if (!tooltip) return;
        __resourcesDatasetSet(tooltip, "data-visible", "");
        var anchor = button.getBoundingClientRect();
        var width = tooltip.offsetWidth;
        var left = Math.max(8, Math.min(innerWidth - width - 8, anchor.left + anchor.width / 2 - width / 2));
        tooltip.style.left = left + "px";
        tooltip.style.top = anchor.bottom + 4 + "px";
      });
    };
    var hide = function hide() {
      var _tooltip;
      clearTimeout(showTimer);
      showTimer = null;
      (_tooltip = tooltip) == null || _tooltip.remove();
      tooltip = null;
    };
    button._hideInstantTooltip = hide;
    button.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "touch" || !shouldShow(button)) return;
      clearTimeout(showTimer);
      showTimer = setTimeout(show, 600);
    });
    button.addEventListener("pointerleave", hide);
    button.addEventListener("pointerdown", hide);
    button.addEventListener("dragstart", hide);
    button.addEventListener("focus", function () {
      if (button.matches(":focus-visible")) show();
    });
    button.addEventListener("blur", hide);
    button.addEventListener("instanttooltiphide", hide);
  }
  for (var _iterator13 = _createForOfIteratorHelperLoose(document.querySelectorAll("button[data-instant-tooltip]")), _step13; !(_step13 = _iterator13()).done;) {
    var button = _step13.value;
    attachInstantTooltip(button);
  }
  document.addEventListener("click", function (event) {
    var _event$target$closest, _open$closest, _cancel$closest;
    event.target.closest == null || (_event$target$closest = event.target.closest("[data-dismiss-draft-flash]")) == null || (_event$target$closest = _event$target$closest.closest("[data-draft-flash]")) == null || _event$target$closest.remove();
    var open = event.target.closest == null ? void 0 : event.target.closest("[data-open-draft-delete], [data-open-project-delete]");
    if (open) (_open$closest = open.closest("[data-project-fields]")) == null || (_open$closest = _open$closest.querySelector("[data-destructive-confirm]")) == null || _open$closest.removeAttribute("hidden");
    var cancel = event.target.closest == null ? void 0 : event.target.closest("[data-cancel-delete]");
    if (cancel) (_cancel$closest = cancel.closest("[data-destructive-confirm]")) == null || _cancel$closest.setAttribute("hidden", "");
    if (event.target.closest != null && event.target.closest("[data-confirm-draft-delete]")) {
      sessionStorage.removeItem(DRAFT_KEY);
      location.reload();
    }
  });
  function draftHistory(snapshot) {
    var empty = emptyProjectSnapshot();
    var createdAt = Date.now();
    return {
      snapshot: snapshot,
      checkpoint: snapshot,
      snapshots: [snapshot],
      patches: [diffProjectSnapshots(empty, snapshot)],
      versionTimes: [createdAt],
      createdAt: createdAt,
      lastVersionAt: createdAt
    };
  }
  function rebuildDraft(patches, sequence) {
    if (sequence === void 0) {
      sequence = patches.length;
    }
    var snapshot = emptyProjectSnapshot();
    for (var _iterator14 = _createForOfIteratorHelperLoose(patches.slice(0, sequence)), _step14; !(_step14 = _iterator14()).done;) {
      var patch = _step14.value;
      snapshot = applyProjectPatch(snapshot, patch);
    }
    return snapshot;
  }
  function relativeVersionTime(timestamp, now) {
    if (now === void 0) {
      now = Date.now();
    }
    var then = new Date(Number(timestamp));
    var current = new Date(now);
    var seconds = Math.max(0, Math.floor((current - then) / 1e3));
    var spanish = document.documentElement.lang === "es";
    var amount = function amount(value, singular, plural) {
      return value + " " + (value === 1 ? singular : plural);
    };
    if (seconds < 60) return amount(seconds, spanish ? "segundo" : "second", spanish ? "segundos" : "seconds") + " " + (spanish ? "atr\xE1s" : "ago");
    var minutes = Math.floor(seconds / 60);
    var remainderSeconds = seconds % 60;
    if (minutes < 60) {
      var parts = [amount(minutes, spanish ? "minuto" : "minute", spanish ? "minutos" : "minutes")];
      if (remainderSeconds) parts.push(amount(remainderSeconds, spanish ? "segundo" : "second", spanish ? "segundos" : "seconds"));
      return parts.join(" ") + " " + (spanish ? "atr\xE1s" : "ago");
    }
    var sameDay = then.getFullYear() === current.getFullYear() && then.getMonth() === current.getMonth() && then.getDate() === current.getDate();
    if (sameDay || seconds < 8 * 3600) {
      var hours = Math.floor(minutes / 60);
      var remainderMinutes = minutes % 60;
      var _parts = [amount(hours, spanish ? "hora" : "hour", spanish ? "horas" : "hours")];
      if (remainderMinutes) _parts.push(amount(remainderMinutes, spanish ? "minuto" : "minute", spanish ? "minutos" : "minutes"));
      return _parts.join(" ") + " " + (spanish ? "atr\xE1s" : "ago");
    }
    var dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    var thenDayStart = new Date(then.getFullYear(), then.getMonth(), then.getDate());
    var days = Math.round((dayStart - thenDayStart) / 864e5);
    var clock = formatVersionClock(then, spanish);
    if (days === 1) return (spanish ? "Ayer" : "Yesterday") + " " + clock;
    var weekdays = spanish ? ["domingo", "lunes", "martes", "mi\xE9rcoles", "jueves", "viernes", "s\xE1bado"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (days < 7) return weekdays[then.getDay()] + " " + clock;
    var months = spanish ? ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return spanish ? then.getDate() + " " + months[then.getMonth()] + " " + then.getFullYear() + ", " + clock : months[then.getMonth()] + " " + then.getDate() + ", " + then.getFullYear() + ", " + clock;
  }
  function formatVersionClock(date, spanish) {
    if (spanish === void 0) {
      spanish = document.documentElement.lang === "es";
    }
    var englishUS = !spanish && new RegExp("^en-US\\b", "i").test(navigator.language || "");
    if (!englishUS) return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    var hour = date.getHours();
    return (hour % 12 || 12) + ":" + String(date.getMinutes()).padStart(2, "0") + (hour < 12 ? "am" : "pm");
  }
  function formatVersionDateTime(timestamp) {
    var date = new Date(Number(timestamp));
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + " " + formatVersionClock(date);
  }
  function versionChoice(label, timestamp, _temp2) {
    var _ref4 = _temp2 === void 0 ? {} : _temp2,
      _ref4$current = _ref4.current,
      current = _ref4$current === void 0 ? false : _ref4$current,
      _ref4$sequence = _ref4.sequence,
      sequence = _ref4$sequence === void 0 ? 0 : _ref4$sequence,
      _ref4$title = _ref4.title,
      title = _ref4$title === void 0 ? "" : _ref4$title,
      _ref4$latest = _ref4.latest,
      latest = _ref4$latest === void 0 ? false : _ref4$latest;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "project-editor__version";
    if (title) {
      var name = document.createElement("span");
      name.className = "project-editor__version-title";
      name.textContent = title;
      button.append(name);
    }
    var time = document.createElement("span");
    time.textContent = label;
    __resourcesDatasetSet(time, "data-version-time", String(Number(timestamp)));
    button.append(time);
    if (latest) {
      var badge = document.createElement("span");
      badge.className = "project-editor__latest";
      badge.textContent = "LATEST";
      button.append(badge);
    }
    button.title = formatVersionDateTime(timestamp);
    if (sequence) __resourcesDatasetSet(button, "data-version-sequence", String(sequence));
    if (current) {
      button.setAttribute("aria-current", "true");
    }
    return button;
  }
  function mountProjectRoot(_x2) {
    return _mountProjectRoot.apply(this, arguments);
  }
  function _mountProjectRoot() {
    _mountProjectRoot = _asyncToGenerator(_regenerator().m(function _callee9(root) {
      var _root$closest, _root$querySelector, _exec, _state$files$, _state$config4, _workspacePayload, _fileFilter$previousE, _state$config6, _state$config7;
      var editorMount, preview, snapshotField, status, statusSave, statusError, statusNotice, versionButton, versionCount, currentVersion, historyPanel, versionList, projectId, persistence, draft, memoryOnly, readOnly, pendingSnapshotKey, initialProjectLayout, initialDetailsButton, initiallyNarrow, restoredDraft, snapshotUrl, workspacePayload, _root$closest2, response, draftFlash, parsedSnapshot, state, initialOutputSnapshot, historyInEditorMachine, recoveredPendingSnapshot, pendingValue, recovered, _root$closest3, _state$config, _state$config2, fields, templateField, patternsField, requestedTemplate, currentSnapshot, viewingHistorical, selected, tabSessionKey, openTabs, ready, pending2, saveTimer, pendingDestructive, templateOnlyPending, changeGeneration, unsavedChangeCount, currentUpdatedAt, saving, localHistory, editorController, editorGeneration, editorPreviewTimer, activeError, activeErrorAction, activeStatusSurface, activeNotice, persistenceState, showCurrentVersion, refreshSubmitLabel, showSelectedVersion, _navigationEntries$, navigationEntries, navigationType, _stored$patches, stored, _localHistory, _localHistory2, _root$closest6, _root$closest7, selectedContent, mode, language, sendContent, renderPreview, mountEditorMachine, _mountEditorMachine, rotateContainerMachines, renderTabs, renderStatusState, clearNotice, showTemplateNotice, setStatus, resetStoppedEditor, updateSnapshot, checkpointDraft, save, _save, renderDraftVersions, renderStoredVersions, _renderStoredVersions, receiveEditorChange, selectProjectFile, openTabList, tabScrollBack, tabScrollForward, _i2, _arr2, _arr2$_i, _button2, _label, text, syncTabOverflow, closeOpenTab, draggedTab, fileTrigger, fileTriggerIcon, _i3, _arr3, d, path, fileTriggerArrow, fileTriggerArrowPath, fileMenu, fileFilter, fileEmpty, filterProjectFiles, closeFileMenu, editorOverflow, editorOverflowTrigger, editorOverflowMenu, closeEditorOverflow, archiveInput, workspace, outputOverflow, outputOverflowTrigger, outputOverflowMenu, fullscreenButton, closeOutputOverflow, splitter, projectLayout, projectClose, projectCloseHome, projectViewControls, projectDetails, placeProjectClose, setSplit, _loop8, _iterator23, _step23, narrowWorkspace, syncResponsiveWorkspace, form, template, linkPatterns, _option2, growTextarea, updateContainer, applyTemplateSnapshot, _loop9, _iterator25, _step25, _iterator26, _step26, field, closeHistory, positionHistory, openVersionHistory, _t7, _t8;
      return _regenerator().w(function (_context10) {
        while (1) switch (_context10.p = _context10.n) {
          case 0:
            positionHistory = function _positionHistory() {
              var _historyPanel$parentE;
              var gap = 5;
              var edge = 8;
              var buttonRect = versionButton.getBoundingClientRect();
              var panelRect = historyPanel.getBoundingClientRect();
              var containingRect = ((_historyPanel$parentE = historyPanel.parentElement) == null ? void 0 : _historyPanel$parentE.getBoundingClientRect()) || {
                left: 0,
                top: 0
              };
              historyPanel.style.left = Math.max(edge, Math.min(buttonRect.left, innerWidth - panelRect.width - edge)) - containingRect.left + "px";
              historyPanel.style.top = buttonRect.bottom + gap - containingRect.top + "px";
              historyPanel.style.maxHeight = Math.max(120, innerHeight - buttonRect.bottom - gap - edge) + "px";
            };
            closeHistory = function _closeHistory(_temp1) {
              var _ref15 = _temp1 === void 0 ? {} : _temp1,
                _ref15$restoreFocus = _ref15.restoreFocus,
                restoreFocus = _ref15$restoreFocus === void 0 ? false : _ref15$restoreFocus;
              historyPanel.hidden = true;
              versionButton.setAttribute("aria-expanded", "false");
              if (restoreFocus) versionButton.focus();
            };
            applyTemplateSnapshot = function _applyTemplateSnapsho(next, _temp0) {
              var _next$config$containe, _next$config;
              var _ref13 = _temp0 === void 0 ? {} : _temp0,
                _ref13$notice = _ref13.notice,
                notice = _ref13$notice === void 0 ? true : _ref13$notice,
                _ref13$previousSnapsh = _ref13.previousSnapshot,
                previousSnapshot = _ref13$previousSnapsh === void 0 ? state : _ref13$previousSnapsh;
              if (linkPatterns) linkPatterns.value = (((_next$config$containe = next.config.containerOptions) == null ? void 0 : _next$config$containe.allowedLinkPatterns) || []).join("\n");
              if (template) template.value = next.config.template || "blank";
              growTextarea(linkPatterns);
              selected = next.files[0].path;
              openTabs = Array.isArray((_next$config = next.config) == null ? void 0 : _next$config.editorTabs) ? _toConsumableArray(next.config.editorTabs) : next.files.map(function (file) {
                return file.path;
              });
              updateSnapshot(next, {
                destructive: true
              });
              templateOnlyPending = true;
              renderTabs();
              sendContent();
              renderPreview();
              if (notice) showTemplateNotice(previousSnapshot);
            };
            updateContainer = function _updateContainer() {
              var allowedLinkPatterns = String((linkPatterns == null ? void 0 : linkPatterns.value) || "").split(/\r?\n/).map(function (value) {
                return value.trim();
              }).filter(Boolean);
              try {
                validateAllowedUrlPatterns(allowedLinkPatterns);
                linkPatterns == null || linkPatterns.setCustomValidity("");
                linkPatterns == null || linkPatterns.setAttribute("aria-invalid", "false");
              } catch (_error13) {
                linkPatterns == null || linkPatterns.setCustomValidity(_error13.message);
                linkPatterns == null || linkPatterns.setAttribute("aria-invalid", "true");
                return;
              }
              clearNotice();
              templateOnlyPending = false;
              updateSnapshot({
                files: state.files,
                config: _extends({}, state.config, {
                  containerOptions: _extends({}, state.config.containerOptions, {
                    allowedLinkPatterns: allowedLinkPatterns
                  })
                })
              }, {
                destructive: true
              });
              sendContent();
              renderPreview();
            };
            growTextarea = function _growTextarea(textarea) {
              if (!textarea) return;
              var replica = textarea.closest("[data-autogrow-replica]");
              if (replica) {
                var measure = replica.querySelector("[data-autogrow-measure]");
                if (measure) measure.textContent = textarea.value + " ";
                textarea.style.removeProperty("height");
                return;
              }
              textarea.style.height = "auto";
              textarea.style.height = textarea.scrollHeight + 2 + "px";
            };
            syncResponsiveWorkspace = function _syncResponsiveWorksp() {
              var view = narrowWorkspace.matches ? "preview" : "split";
              var selectedButton = root.querySelector("[data-project-view=\"" + view + "\"]");
              var detailsButton = projectDetails;
              if (narrowWorkspace.matches) {
                __resourcesDatasetSet(projectLayout, "data-details-visible", "false");
                __resourcesDatasetDelete(projectLayout, "data-mobile-view");
                detailsButton.setAttribute("aria-pressed", "false");
                placeProjectClose(false);
              } else {
                __resourcesDatasetDelete(projectLayout, "data-mobile-view");
                __resourcesDatasetSet(projectLayout, "data-details-visible", "true");
                detailsButton.setAttribute("aria-pressed", "true");
                placeProjectClose(true);
              }
              __resourcesDatasetSet(workspace, "data-view", view);
              for (var _iterator24 = _createForOfIteratorHelperLoose(root.querySelectorAll(".project-view-segments [data-project-view]")), _step24; !(_step24 = _iterator24()).done;) {
                var item = _step24.value;
                item.setAttribute("aria-pressed", item === selectedButton ? "true" : "false");
              }
              renderStatusState();
            };
            setSplit = function _setSplit(clientX) {
              var rect = workspace.getBoundingClientRect();
              var percent = Math.max(20, Math.min(80, (clientX - rect.left) / rect.width * 100));
              root.style.setProperty("--source-width", percent + "%");
              splitter.setAttribute("aria-valuenow", String(Math.round(percent)));
            };
            placeProjectClose = function _placeProjectClose(detailsVisible) {
              if (!projectClose) return;
              if (detailsVisible) {
                projectCloseHome.append(projectClose);
                projectCloseHome.insertBefore(projectDetails, projectClose);
              } else {
                projectViewControls.append(projectDetails);
                projectViewControls.append(projectClose);
              }
            };
            closeOutputOverflow = function _closeOutputOverflow(_temp9) {
              var _ref11 = _temp9 === void 0 ? {} : _temp9,
                _ref11$focus = _ref11.focus,
                focus = _ref11$focus === void 0 ? false : _ref11$focus;
              outputOverflowMenu.hidden = true;
              outputOverflowTrigger.setAttribute("aria-expanded", "false");
              if (focus) outputOverflowTrigger.focus();
            };
            closeEditorOverflow = function _closeEditorOverflow(_temp8) {
              var _ref1 = _temp8 === void 0 ? {} : _temp8,
                _ref1$focus = _ref1.focus,
                focus = _ref1$focus === void 0 ? false : _ref1$focus;
              editorOverflowMenu.hidden = true;
              editorOverflowTrigger.setAttribute("aria-expanded", "false");
              if (focus) editorOverflowTrigger.focus();
            };
            closeFileMenu = function _closeFileMenu(_temp7) {
              var _ref0 = _temp7 === void 0 ? {} : _temp7,
                _ref0$focus = _ref0.focus,
                focus = _ref0$focus === void 0 ? false : _ref0$focus;
              fileMenu.hidden = true;
              fileTrigger.setAttribute("aria-expanded", "false");
              if (focus) fileTrigger.focus();
            };
            filterProjectFiles = function _filterProjectFiles() {
              var query = fileFilter.value.trim().toLowerCase();
              var visible = 0;
              for (var _iterator21 = _createForOfIteratorHelperLoose(fileMenu.querySelectorAll('[role="menuitemradio"]')), _step21; !(_step21 = _iterator21()).done;) {
                var _option = _step21.value;
                var row = _option.closest(".project-editor__file-option-row");
                row.hidden = Boolean(query && !_option.textContent.toLowerCase().includes(query));
                if (!row.hidden) visible += 1;
              }
              for (var _iterator22 = _createForOfIteratorHelperLoose(fileMenu.querySelectorAll("[data-project-file-available], [data-project-open-files]")), _step22; !(_step22 = _iterator22()).done;) {
                var group = _step22.value;
                group.hidden = !group.querySelector(".project-editor__file-option-row:not([hidden])");
              }
              fileEmpty.hidden = visible !== 0;
            };
            closeOpenTab = function _closeOpenTab(path) {
              if (openTabs.length <= 1) return;
              var index = openTabs.indexOf(path);
              if (index < 0) return;
              openTabs.splice(index, 1);
              if (selected === path) selected = openTabs[Math.min(index, openTabs.length - 1)];
              renderTabs();
              requestAnimationFrame(syncTabOverflow);
              sendContent();
            };
            syncTabOverflow = function _syncTabOverflow() {
              var overflowed = openTabList.scrollWidth > openTabList.clientWidth + 2;
              tabScrollBack.hidden = !overflowed;
              tabScrollForward.hidden = !overflowed;
              tabScrollBack.disabled = openTabList.scrollLeft <= 1;
              tabScrollForward.disabled = openTabList.scrollLeft + openTabList.clientWidth >= openTabList.scrollWidth - 1;
            };
            selectProjectFile = function _selectProjectFile(event) {
              var target = event.target;
              var next = "";
              while (target && target !== fileMenu) {
                var path = target.getAttribute == null ? void 0 : target.getAttribute("data-project-file");
                if (path !== null && path !== void 0) {
                  next = path;
                  break;
                }
                if (target.hasAttribute != null && target.hasAttribute("data-project-config")) {
                  next = "config";
                  break;
                }
                target = target.parentElement;
              }
              if (!next) return;
              selected = next;
              if (!openTabs.includes(selected)) openTabs.push(selected);
              renderTabs();
              sendContent();
            };
            receiveEditorChange = function _receiveEditorChange(content, _temp6) {
              var _ref9 = _temp6 === void 0 ? {} : _temp6,
                _ref9$syntaxErrors = _ref9.syntaxErrors,
                syntaxErrors = _ref9$syntaxErrors === void 0 ? false : _ref9$syntaxErrors;
              if (typeof content !== "string") return;
              if (readOnly || selected === "config" || content === selectedContent()) return;
              try {
                clearNotice();
                if (updateSnapshot({
                  files: state.files.map(function (file) {
                    return file.path === selected ? _extends({}, file, {
                      content: content
                    }) : file;
                  }),
                  config: state.config
                })) templateOnlyPending = false;
                clearTimeout(editorPreviewTimer);
                if (syntaxErrors) {
                  editorPreviewTimer = setTimeout(function () {
                    setStatus("Blocked: Output is waiting for valid syntax.", "error", null, "output");
                  }, 5e3);
                } else {
                  var _state$config5;
                  var debounceMs = Math.min(5e3, Math.max(250, Number((_state$config5 = state.config) == null || (_state$config5 = _state$config5.output) == null ? void 0 : _state$config5.debounceMs) || 900));
                  editorPreviewTimer = setTimeout(function () {
                    var _editorController4;
                    return (_editorController4 = editorController) == null ? void 0 : _editorController4.renderSnapshot();
                  }, debounceMs);
                }
              } catch (_error12) {
                setStatus("Editor update failed: " + (_error12.message || String(_error12)), "error", null, "editor");
              }
            };
            _renderStoredVersions = function _renderStoredVersions3() {
              _renderStoredVersions = _asyncToGenerator(_regenerator().m(function _callee8() {
                var response, _yield$response$json, versions, current, _loop7, _iterator28, _step28;
                return _regenerator().w(function (_context9) {
                  while (1) switch (_context9.n) {
                    case 0:
                      versionList.textContent = "Loading\u2026";
                      _context9.n = 1;
                      return fetch("/api/projects/" + encodeURIComponent(projectId) + "/versions");
                    case 1:
                      response = _context9.v;
                      if (response.ok) {
                        _context9.n = 2;
                        break;
                      }
                      versionList.textContent = "Version history unavailable.";
                      return _context9.a(2);
                    case 2:
                      _context9.n = 3;
                      return response.json();
                    case 3:
                      _yield$response$json = _context9.v;
                      versions = _yield$response$json.versions;
                      versionList.replaceChildren();
                      showCurrentVersion();
                      current = versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, {
                        current: true
                      });
                      current.addEventListener("click", function () {
                        clearNotice();
                        if (!viewingHistorical) return;
                        state = currentSnapshot;
                        viewingHistorical = false;
                        snapshotField.value = JSON.stringify(state);
                        historyPanel.hidden = true;
                        versionButton.setAttribute("aria-expanded", "false");
                        renderTabs();
                        sendContent();
                        renderPreview();
                        showCurrentVersion();
                        setStatus("Current version");
                      });
                      versionList.append(current);
                      _loop7 = _regenerator().m(function _loop7() {
                        var version, timestamp, button;
                        return _regenerator().w(function (_context8) {
                          while (1) switch (_context8.n) {
                            case 0:
                              version = _step28.value;
                              timestamp = version.savedAt || version.createdAt;
                              button = versionChoice(relativeVersionTime(timestamp), timestamp, {
                                sequence: version.sequence,
                                title: version.title,
                                latest: version.latest
                              });
                              button.addEventListener("click", _asyncToGenerator(_regenerator().m(function _callee7() {
                                var response2, result2;
                                return _regenerator().w(function (_context7) {
                                  while (1) switch (_context7.n) {
                                    case 0:
                                      clearNotice();
                                      _context7.n = 1;
                                      return save();
                                    case 1:
                                      if (!viewingHistorical) currentSnapshot = state;
                                      _context7.n = 2;
                                      return fetch("/api/projects/" + encodeURIComponent(projectId) + "/versions/" + version.sequence);
                                    case 2:
                                      response2 = _context7.v;
                                      if (response2.ok) {
                                        _context7.n = 3;
                                        break;
                                      }
                                      setStatus("Version unavailable", true);
                                      return _context7.a(2);
                                    case 3:
                                      _context7.n = 4;
                                      return response2.json();
                                    case 4:
                                      result2 = _context7.v;
                                      state = normalizeProjectSnapshot(result2.snapshot);
                                      viewingHistorical = true;
                                      snapshotField.value = JSON.stringify(state);
                                      historyPanel.hidden = true;
                                      versionButton.setAttribute("aria-expanded", "false");
                                      renderTabs();
                                      sendContent();
                                      renderPreview();
                                      showSelectedVersion(relativeVersionTime(timestamp), timestamp);
                                      setStatus("Viewing " + button.textContent);
                                    case 5:
                                      return _context7.a(2);
                                  }
                                }, _callee7);
                              })));
                              versionList.append(button);
                            case 1:
                              return _context8.a(2);
                          }
                        }, _loop7);
                      });
                      _iterator28 = _createForOfIteratorHelperLoose(versions);
                    case 4:
                      if ((_step28 = _iterator28()).done) {
                        _context9.n = 6;
                        break;
                      }
                      return _context9.d(_regeneratorValues(_loop7()), 5);
                    case 5:
                      _context9.n = 4;
                      break;
                    case 6:
                      return _context9.a(2);
                  }
                }, _callee8);
              }));
              return _renderStoredVersions.apply(this, arguments);
            };
            renderStoredVersions = function _renderStoredVersions2() {
              return _renderStoredVersions.apply(this, arguments);
            };
            renderDraftVersions = function _renderDraftVersions() {
              versionList.replaceChildren();
              var current = versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, {
                current: true
              });
              current.addEventListener("click", function () {
                clearNotice();
                if (!viewingHistorical) return;
                state = currentSnapshot;
                viewingHistorical = false;
                snapshotField.value = JSON.stringify(state);
                historyPanel.hidden = true;
                versionButton.setAttribute("aria-expanded", "false");
                renderTabs();
                sendContent();
                renderPreview();
                showCurrentVersion();
                setStatus("Current version");
              });
              versionList.append(current);
              _toConsumableArray(localHistory.patches).reverse().forEach(function (_, reverseIndex) {
                var sequence = localHistory.patches.length - reverseIndex;
                var button = versionChoice(relativeVersionTime(localHistory.versionTimes[sequence - 1]), localHistory.versionTimes[sequence - 1], {
                  sequence: sequence
                });
                button.addEventListener("click", function () {
                  clearNotice();
                  if (pending2) checkpointDraft({
                    destructive: pendingDestructive
                  });
                  pending2 = false;
                  pendingDestructive = false;
                  currentSnapshot = localHistory.snapshot;
                  var target = normalizeProjectSnapshot(localHistory.snapshots[sequence - 1] || rebuildDraft(localHistory.patches, sequence));
                  state = target;
                  viewingHistorical = true;
                  snapshotField.value = JSON.stringify(state);
                  renderTabs();
                  historyPanel.hidden = true;
                  versionButton.setAttribute("aria-expanded", "false");
                  sendContent();
                  renderPreview();
                  setStatus("Viewing version " + sequence);
                  showSelectedVersion(button.textContent, localHistory.versionTimes[sequence - 1]);
                });
                versionList.append(button);
              });
            };
            _save = function _save3() {
              _save = _asyncToGenerator(_regenerator().m(function _callee6() {
                var savingGeneration, savingSnapshot, savingDestructive, requestSave, _response, failure, _find, page, documentCopy, fresh, _failure, result2, _t5, _t6;
                return _regenerator().w(function (_context6) {
                  while (1) switch (_context6.p = _context6.n) {
                    case 0:
                      if (!(!pending2 || saving)) {
                        _context6.n = 1;
                        break;
                      }
                      return _context6.a(2);
                    case 1:
                      if (!(draft || memoryOnly)) {
                        _context6.n = 2;
                        break;
                      }
                      if (!templateOnlyPending) checkpointDraft({
                        destructive: pendingDestructive || selected === "config"
                      });
                      pending2 = false;
                      pendingDestructive = false;
                      templateOnlyPending = false;
                      __resourcesDatasetDelete(root, "data-draft-dirty");
                      __resourcesDatasetSet(root, "data-draft-state", "saved");
                      setStatus(memoryOnly ? "" : "Draft saved in this session");
                      return _context6.a(2);
                    case 2:
                      savingGeneration = changeGeneration;
                      savingSnapshot = state;
                      savingDestructive = pendingDestructive && !templateOnlyPending;
                      saving = true;
                      setStatus("Saving\u2026");
                      _context6.p = 3;
                      requestSave = function requestSave() {
                        return fetch("/api/projects/" + encodeURIComponent(projectId) + "/snapshot", {
                          method: "POST",
                          headers: {
                            "content-type": "application/json",
                            "x-resources-csrf": __resourcesDatasetGet(root, "data-csrf")
                          },
                          body: JSON.stringify({
                            snapshot: savingSnapshot,
                            destructive: savingDestructive
                          })
                        });
                      };
                      _context6.n = 4;
                      return requestSave();
                    case 4:
                      _response = _context6.v;
                      if (!(_response.status === 403)) {
                        _context6.n = 9;
                        break;
                      }
                      _context6.n = 5;
                      return _response.clone().json().catch(function () {
                        return null;
                      });
                    case 5:
                      failure = _context6.v;
                      if (!((failure == null ? void 0 : failure.error) === "request_token")) {
                        _context6.n = 9;
                        break;
                      }
                      _context6.n = 6;
                      return fetch(location.href, {
                        cache: "no-store"
                      });
                    case 6:
                      page = _context6.v;
                      _t5 = new DOMParser();
                      _context6.n = 7;
                      return page.text();
                    case 7:
                      documentCopy = _t5.parseFromString.call(_t5, _context6.v, "text/html");
                      fresh = (_find = _toConsumableArray(documentCopy.querySelectorAll("[data-project-editor]")).find(function (editor) {
                        return __resourcesDatasetGet(editor, "data-project-id") === projectId;
                      })) == null ? void 0 : __resourcesDatasetGet(_find, "data-csrf");
                      if (!fresh) {
                        _context6.n = 9;
                        break;
                      }
                      __resourcesDatasetSet(root, "data-csrf", fresh);
                      _context6.n = 8;
                      return requestSave();
                    case 8:
                      _response = _context6.v;
                    case 9:
                      if (_response.ok) {
                        _context6.n = 11;
                        break;
                      }
                      _context6.n = 10;
                      return _response.json().catch(function () {
                        return null;
                      });
                    case 10:
                      _failure = _context6.v;
                      throw new Error((_failure == null ? void 0 : _failure.message) || "Save failed (" + _response.status + ")");
                    case 11:
                      _context6.n = 12;
                      return _response.json();
                    case 12:
                      result2 = _context6.v;
                      versionCount.textContent = String(result2.versionCount);
                      if (changeGeneration === savingGeneration) {
                        pending2 = false;
                        pendingDestructive = false;
                        templateOnlyPending = false;
                        __resourcesDatasetDelete(root, "data-draft-dirty");
                        __resourcesDatasetSet(root, "data-draft-state", "saved");
                        if (pendingSnapshotKey) sessionStorage.removeItem(pendingSnapshotKey);
                        setStatus("Saved");
                      } else {
                        setStatus("Saving\u2026");
                      }
                      _context6.n = 14;
                      break;
                    case 13:
                      _context6.p = 13;
                      _t6 = _context6.v;
                      setStatus(_t6.message, true);
                    case 14:
                      _context6.p = 14;
                      saving = false;
                      if (pending2 && changeGeneration !== savingGeneration) {
                        clearTimeout(saveTimer);
                        saveTimer = setTimeout(save, 250);
                      }
                      return _context6.f(14);
                    case 15:
                      return _context6.a(2);
                  }
                }, _callee6, null, [[3, 13, 14, 15]]);
              }));
              return _save.apply(this, arguments);
            };
            save = function _save2() {
              return _save.apply(this, arguments);
            };
            checkpointDraft = function _checkpointDraft(_temp5) {
              var _ref8 = _temp5 === void 0 ? {} : _temp5,
                _ref8$destructive = _ref8.destructive,
                destructive = _ref8$destructive === void 0 ? false : _ref8$destructive;
              var now = Date.now();
              if (editorController && historyInEditorMachine) {
                localHistory = editorController.history.checkpoint(state, {
                  now: now,
                  destructive: destructive,
                  checkpointIntervalMs: CHECKPOINT_MS
                });
              } else {
                if (!destructive && now - localHistory.lastVersionAt < CHECKPOINT_MS) return;
                var patch = diffProjectSnapshots(localHistory.snapshots.at(-1), state);
                if (projectPatchIsEmpty(patch)) return;
                localHistory.patches.push(patch);
                localHistory.snapshots.push(state);
                localHistory.versionTimes.push(now);
                localHistory.checkpoint = state;
                localHistory.lastVersionAt = now;
                localHistory.snapshot = state;
              }
              versionCount.textContent = String(localHistory.patches.length);
              if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
            };
            updateSnapshot = function _updateSnapshot(next, _temp4) {
              var _editorController3, _root$closest8;
              var _ref7 = _temp4 === void 0 ? {} : _temp4,
                _ref7$destructive = _ref7.destructive,
                destructive = _ref7$destructive === void 0 ? false : _ref7$destructive;
              var normalized = normalizeProjectSnapshot(next);
              if (projectSnapshotsEqual(state, normalized)) return false;
              var branchedFromHistory = viewingHistorical;
              showCurrentVersion();
              viewingHistorical = false;
              state = normalized;
              (_editorController3 = editorController) == null || _editorController3.setSnapshot(state);
              currentUpdatedAt = Date.now();
              currentSnapshot = state;
              var serialized = JSON.stringify(state);
              snapshotField.value = serialized;
              pending2 = true;
              if (pendingSnapshotKey && !draft && !memoryOnly) sessionStorage.setItem(pendingSnapshotKey, serialized);
              __resourcesDatasetSet(root, "data-draft-dirty", "true");
              __resourcesDatasetSet(root, "data-draft-state", "dirty");
              unsavedChangeCount += 1;
              if (workspacePayload) workspacePayload.hasUnpublishedChanges = true;
              refreshSubmitLabel();
              if (draft) (_root$closest8 = root.closest("form")) == null || (_root$closest8 = _root$closest8.querySelector("[data-draft-actions]")) == null || _root$closest8.removeAttribute("hidden");
              changeGeneration += 1;
              pendingDestructive || (pendingDestructive = destructive || branchedFromHistory);
              if (draft || memoryOnly) {
                localHistory.snapshot = state;
                if (editorController && historyInEditorMachine) localHistory = editorController.history.setCurrent(state);
                if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(localHistory));
              }
              clearTimeout(saveTimer);
              saveTimer = setTimeout(save, 1500);
              return true;
            };
            resetStoppedEditor = function _resetStoppedEditor() {
              activeError = "";
              activeErrorAction = null;
              renderStatusState();
              mountEditorMachine("manual-reset");
            };
            setStatus = function _setStatus(text, severity, action, surface) {
              if (severity === void 0) {
                severity = "normal";
              }
              if (action === void 0) {
                action = null;
              }
              if (surface === void 0) {
                surface = "editor";
              }
              var nextState = severity === true ? "error" : severity;
              if (nextState === "error") {
                activeError = text;
                activeErrorAction = action;
                activeStatusSurface = surface;
              } else {
                persistenceState = nextState;
                statusSave.textContent = text;
              }
              renderStatusState();
            };
            showTemplateNotice = function _showTemplateNotice(previousSnapshot) {
              activeNotice = true;
              activeStatusSurface = "editor";
              statusNotice.replaceChildren(document.createTextNode((__resourcesDatasetGet(root, "data-template-replaced-label") || "Template replaced the project.") + " "));
              var undo = document.createElement("button");
              undo.type = "button";
              undo.textContent = __resourcesDatasetGet(root, "data-undo-label") || "Undo";
              undo.addEventListener("click", function () {
                applyTemplateSnapshot(previousSnapshot, {
                  notice: false
                });
                clearNotice();
              }, {
                once: true
              });
              statusNotice.append(undo);
              renderStatusState();
            };
            clearNotice = function _clearNotice() {
              activeNotice = false;
              statusNotice.replaceChildren();
              renderStatusState();
            };
            renderStatusState = function _renderStatusState() {
              var _root$querySelector2;
              __resourcesDatasetSet(status, "data-state", activeError ? "error" : activeNotice ? "warning" : persistenceState);
              var persistenceWarning = !activeError && !activeNotice && persistenceState === "warning";
              var workspaceView = (_root$querySelector2 = root.querySelector(".project-editor__workspace")) == null ? void 0 : __resourcesDatasetGet(_root$querySelector2, "data-view");
              var targetSurface = activeStatusSurface === "editor" || workspaceView === "editor" ? editorMount.closest(".project-editor__source") : preview.closest(".project-editor__preview");
              if (targetSurface && status.parentElement !== targetSurface) targetSurface.append(status);
              status.hidden = !(activeError || activeNotice || persistenceWarning);
              statusNotice.hidden = !activeNotice || Boolean(activeError);
              statusError.hidden = !activeError;
              statusSave.hidden = !persistenceWarning;
              statusError.replaceChildren();
              if (activeError) statusError.append(document.createTextNode(activeError));
              if (activeErrorAction) {
                var action = document.createElement("button");
                action.type = "button";
                action.className = "project-editor__status-action";
                action.textContent = activeErrorAction.label;
                action.addEventListener("click", activeErrorAction.run);
                statusError.append(document.createTextNode(" "), action);
              }
            };
            renderTabs = function _renderTabs() {
              var _state$files$2;
              var menu = root.querySelector("[data-project-file-options]");
              var tabs = root.querySelector("[data-project-tabs]");
              var available = new Set([].concat(_toConsumableArray(state.files.map(function (file) {
                return file.path;
              })), ["config"]));
              var selectedAvailable = typeof selected === "string" && available.has(selected);
              openTabs = openTabs.filter(function (path, index) {
                return available.has(path) && openTabs.indexOf(path) === index;
              });
              if (!openTabs.length) openTabs.push(selectedAvailable ? selected : ((_state$files$2 = state.files[0]) == null ? void 0 : _state$files$2.path) || "config");
              if (selectedAvailable && !openTabs.includes(selected)) openTabs.push(selected);
              sessionStorage.setItem(tabSessionKey, JSON.stringify(openTabs));
              menu.replaceChildren();
              for (var _iterator17 = _createForOfIteratorHelperLoose(tabs.querySelectorAll("[data-instant-tooltip-attached='true']")), _step17; !(_step17 = _iterator17()).done;) {
                var _button = _step17.value;
                _button._hideInstantTooltip == null || _button._hideInstantTooltip();
              }
              tabs.replaceChildren();
              var availableChoices = document.createElement("div");
              availableChoices.className = "project-editor__file-choices";
              __resourcesDatasetSet(availableChoices, "data-project-file-available", "");
              availableChoices.setAttribute("role", "group");
              var openSection = document.createElement("section");
              openSection.className = "project-editor__open-files";
              __resourcesDatasetSet(openSection, "data-project-open-files", "");
              var openHeading = document.createElement("p");
              openHeading.textContent = __resourcesDatasetGet(menu, "data-open-files-label") || "Open files";
              var openChoices = document.createElement("div");
              openChoices.className = "project-editor__open-file-choices";
              openChoices.setAttribute("role", "group");
              openChoices.setAttribute("aria-label", openHeading.textContent);
              openSection.append(openHeading, openChoices);
              menu.append(availableChoices, openSection);
              function addChoice(_ref6) {
                var path = _ref6.path,
                  label = _ref6.label,
                  _ref6$config = _ref6.config,
                  config = _ref6$config === void 0 ? false : _ref6$config,
                  _ref6$open = _ref6.open,
                  open = _ref6$open === void 0 ? false : _ref6$open;
                var tabPath = config ? "config" : path;
                var row = document.createElement("div");
                row.className = "project-editor__file-option-row";
                __resourcesDatasetSet(row, "data-project-file-choice", open ? "open" : "available");
                var button = document.createElement("button");
                button.type = "button";
                button.className = "project-editor__tab";
                if (config) __resourcesDatasetSet(button, "data-project-config", "");else __resourcesDatasetSet(button, "data-project-file", path);
                button.setAttribute("aria-selected", (config ? selected === "config" : path === selected) ? "true" : "false");
                button.textContent = label;
                var option = button;
                option.className = "project-editor__file-option";
                option.setAttribute("role", "menuitemradio");
                option.setAttribute("aria-checked", button.getAttribute("aria-selected"));
                option.removeAttribute("aria-selected");
                row.append(option);
                if (open && openTabs.length > 1) {
                  var close = document.createElement("button");
                  close.type = "button";
                  close.className = "project-editor__file-option-close";
                  __resourcesDatasetSet(close, "data-close-menu-tab", tabPath);
                  close.setAttribute("aria-label", "Close " + label);
                  close.textContent = "\xD7";
                  row.append(close);
                }
                (open ? openChoices : availableChoices).append(row);
              }
              for (var _iterator18 = _createForOfIteratorHelperLoose(state.files), _step18; !(_step18 = _iterator18()).done;) {
                var file = _step18.value;
                if (!openTabs.includes(file.path)) addChoice({
                  path: file.path,
                  label: file.path
                });
              }
              if (!openTabs.includes("config")) addChoice({
                label: __resourcesDatasetGet(root, "data-config-label") || "Configuration",
                config: true
              });
              var _loop5 = function _loop5() {
                var path = _step19.value;
                var file = state.files.find(function (candidate) {
                  return candidate.path === path;
                });
                addChoice({
                  path: file == null ? void 0 : file.path,
                  label: path === "config" ? __resourcesDatasetGet(root, "data-config-label") || "Configuration" : (file == null ? void 0 : file.path) || path,
                  config: path === "config",
                  open: true
                });
              };
              for (var _iterator19 = _createForOfIteratorHelperLoose(openTabs), _step19; !(_step19 = _iterator19()).done;) {
                _loop5();
              }
              var _loop6 = function _loop6() {
                var path = _step20.value;
                var tab = document.createElement("div");
                tab.className = "project-editor__open-tab";
                __resourcesDatasetSet(tab, "data-tab-path", path);
                tab.setAttribute("draggable", "true");
                var select = document.createElement("button");
                select.type = "button";
                __resourcesDatasetSet(select, "data-open-tab", path);
                select.setAttribute("role", "tab");
                select.setAttribute("aria-selected", String(path === selected));
                var tabLabel = path === "config" ? __resourcesDatasetGet(root, "data-config-label") || "Configuration" : path.split("/").at(-1);
                select.textContent = tabLabel;
                var nestedPath = path !== "config" && path.includes("/");
                attachInstantTooltip(select, path === "config" ? tabLabel : path, function (button) {
                  return nestedPath || button.scrollWidth > button.clientWidth;
                });
                tab.append(select);
                if (openTabs.length > 1 && path === selected) {
                  var close = document.createElement("button");
                  close.type = "button";
                  close.className = "project-editor__tab-close";
                  __resourcesDatasetSet(close, "data-close-tab", path);
                  close.setAttribute("aria-label", "Close " + tabLabel);
                  close.textContent = "\xD7";
                  tab.append(close);
                }
                tabs.append(tab);
              };
              for (var _iterator20 = _createForOfIteratorHelperLoose(openTabs), _step20; !(_step20 = _iterator20()).done;) {
                _loop6();
              }
              root.querySelector("[data-project-file-current]").textContent = selected === "config" ? __resourcesDatasetGet(root, "data-config-label") || "Configuration" : selected;
            };
            rotateContainerMachines = function _rotateContainerMachi(reason) {
              if (reason === void 0) {
                reason = "container-change";
              }
              mountEditorMachine(reason);
            };
            _mountEditorMachine = function _mountEditorMachine3() {
              _mountEditorMachine = _asyncToGenerator(_regenerator().m(function _callee5(reason) {
                var _editorController6;
                var generation, _controller$inspect, controller, _t4;
                return _regenerator().w(function (_context5) {
                  while (1) switch (_context5.p = _context5.n) {
                    case 0:
                      if (reason === void 0) {
                        reason = "project-open";
                      }
                      generation = ++editorGeneration;
                      ready = false;
                      (_editorController6 = editorController) == null || _editorController6.destroy();
                      editorController = null;
                      __resourcesDatasetDelete(root, "data-editor-machine-id");
                      __resourcesDatasetSet(root, "data-editor-machine-state", "starting");
                      __resourcesDatasetSet(root, "data-editor-machine-reason", reason);
                      _context5.p = 1;
                      _context5.n = 2;
                      return mountResourcesProjectEditor({
                        root: editorMount,
                        limits: false,
                        onChange: receiveEditorChange,
                        onOutputError: function onOutputError(error) {
                          setStatus("Output stopped: " + error.message, "error", null, "output");
                        },
                        onOutputReady: function onOutputReady() {
                          if (activeStatusSurface !== "output") return;
                          activeError = "";
                          activeErrorAction = null;
                          renderStatusState();
                        },
                        onViolation: function onViolation(error) {
                          setStatus("Editor stopped: " + error.message, true, {
                            label: __resourcesDatasetGet(root, "data-reset-label") || "Reset",
                            run: resetStoppedEditor
                          }, "editor");
                        }
                      });
                    case 2:
                      controller = _context5.v;
                      if (!(generation !== editorGeneration)) {
                        _context5.n = 3;
                        break;
                      }
                      controller.destroy();
                      return _context5.a(2);
                    case 3:
                      editorController = controller;
                      __resourcesDatasetSet(root, "data-editor-machine-stage", "snapshot");
                      editorController.setSnapshot(state);
                      __resourcesDatasetSet(root, "data-editor-machine-id", ((_controller$inspect = controller.inspect()) == null || (_controller$inspect = _controller$inspect.machine) == null ? void 0 : _controller$inspect.machineId) || "quickjs-editor");
                      __resourcesDatasetSet(root, "data-editor-machine-state", "ready");
                      __resourcesDatasetSet(root, "data-editor-machine-stage", "history");
                      if (localHistory && historyInEditorMachine) localHistory = editorController.history.initialize(localHistory);
                      ready = true;
                      __resourcesDatasetSet(root, "data-editor-machine-stage", "content");
                      sendContent();
                      __resourcesDatasetSet(root, "data-editor-machine-stage", "ready");
                      if (__resourcesDatasetGet(root, "data-output-machine-error")) {
                        setStatus("Output stopped: " + __resourcesDatasetGet(root, "data-output-machine-error"), "error", null, "output");
                      }
                      if (__resourcesDatasetGet(root, "data-output-machine-state") === "waiting" || !projectSnapshotsEqual(initialOutputSnapshot, state)) renderPreview();
                      _context5.n = 6;
                      break;
                    case 4:
                      _context5.p = 4;
                      _t4 = _context5.v;
                      if (!(generation !== editorGeneration)) {
                        _context5.n = 5;
                        break;
                      }
                      return _context5.a(2);
                    case 5:
                      __resourcesDatasetSet(root, "data-editor-machine-state", "failed");
                      __resourcesDatasetSet(root, "data-editor-machine-error", _t4.stack || _t4.message);
                      setStatus("Editor failed to start: " + _t4.message, true, null, "editor");
                    case 6:
                      return _context5.a(2);
                  }
                }, _callee5, null, [[1, 4]]);
              }));
              return _mountEditorMachine.apply(this, arguments);
            };
            mountEditorMachine = function _mountEditorMachine2(_x3) {
              return _mountEditorMachine.apply(this, arguments);
            };
            renderPreview = function _renderPreview() {
              var _editorController, _editorController2;
              clearTimeout(editorPreviewTimer);
              editorPreviewTimer = 0;
              (_editorController = editorController) == null || _editorController.setSnapshot(state);
              (_editorController2 = editorController) == null || _editorController2.renderSnapshot();
            };
            sendContent = function _sendContent(_temp3) {
              var _editorMount$parentEl, _editorMount$parentEl2;
              var _ref5 = _temp3 === void 0 ? {} : _temp3,
                _ref5$resetHistoryOnE = _ref5.resetHistoryOnEdit,
                resetHistoryOnEdit = _ref5$resetHistoryOnE === void 0 ? false : _ref5$resetHistoryOnE;
              if (!ready || !editorController) return;
              __resourcesDatasetSet(root, "data-editor-loading", "true");
              var selectedFile = state.files.find(function (file) {
                return file.path === selected;
              });
              (_editorMount$parentEl = editorMount.parentElement.querySelector(".project-editor__image-view")) == null || _editorMount$parentEl.remove();
              (_editorMount$parentEl2 = editorMount.parentElement.querySelector(".project-editor__asset-view")) == null || _editorMount$parentEl2.remove();
              editorMount.hidden = isProjectImage(selectedFile);
              if (isProjectImage(selectedFile)) {
                var image = document.createElement("img");
                image.className = "project-editor__image-view";
                image.src = selectedFile.content;
                image.alt = selectedFile.path;
                editorMount.parentElement.append(image);
                __resourcesDatasetDelete(root, "data-editor-loading");
                return;
              }
              editorController.setContent(selectedContent(), language(), {
                path: selected,
                readOnly: readOnly || selected === "config",
                resetHistoryOnEdit: resetHistoryOnEdit
              });
              __resourcesDatasetDelete(root, "data-editor-loading");
            };
            language = function _language() {
              return editorLanguageForPath(selected);
            };
            mode = function _mode() {
              return selected.endsWith(".md") ? "markdown" : "code";
            };
            selectedContent = function _selectedContent() {
              var _state$files$find$con, _state$files$find;
              if (selected === "config") return JSON.stringify(state.config, null, 2) + "\n";
              return (_state$files$find$con = (_state$files$find = state.files.find(function (file) {
                return file.path === selected;
              })) == null ? void 0 : _state$files$find.content) != null ? _state$files$find$con : "";
            };
            showSelectedVersion = function _showSelectedVersion(label, timestamp) {
              currentVersion.textContent = label;
              __resourcesDatasetSet(currentVersion, "data-version-time", String(Number(timestamp)));
              currentVersion.title = formatVersionDateTime(timestamp);
            };
            refreshSubmitLabel = function _refreshSubmitLabel() {
              var _root$closest4, _workspacePayload2, _root$closest5;
              var button = (_root$closest4 = root.closest("form")) == null ? void 0 : _root$closest4.querySelector("[data-project-submit]");
              if (!button || draft) return;
              button.textContent = __resourcesDatasetGet(button, "data-default-label");
              var disabled = unsavedChangeCount === 0 && ((_workspacePayload2 = workspacePayload) == null ? void 0 : _workspacePayload2.hasUnpublishedChanges) !== true && !recoveredPendingSnapshot;
              button.disabled = disabled;
              var menuTrigger = (_root$closest5 = root.closest("form")) == null ? void 0 : _root$closest5.querySelector("[data-save-menu-trigger]");
              if (disabled) menuTrigger == null || menuTrigger.setAttribute("disabled", "");else menuTrigger == null || menuTrigger.removeAttribute("disabled");
            };
            showCurrentVersion = function _showCurrentVersion() {
              currentVersion.textContent = relativeVersionTime(currentUpdatedAt);
              __resourcesDatasetSet(currentVersion, "data-version-time", String(currentUpdatedAt));
              currentVersion.title = formatVersionDateTime(currentUpdatedAt);
            };
            editorMount = root.querySelector("[data-project-editor-mount]");
            preview = root.querySelector("[data-project-preview]");
            snapshotField = root.querySelector("[data-project-snapshot]");
            status = root.querySelector("[data-project-status]");
            statusSave = root.querySelector("[data-project-save]");
            statusError = root.querySelector("[data-project-error]");
            statusNotice = root.querySelector("[data-project-notice]");
            versionButton = ((_root$closest = root.closest(".project-create__layout")) == null ? void 0 : _root$closest.querySelector("[data-project-versions-proxy]")) || root.querySelector("[data-project-versions]");
            versionCount = versionButton.querySelector(".project-editor__version-count");
            currentVersion = versionButton.querySelector("[data-current-version]");
            historyPanel = root.querySelector("[data-project-history]");
            versionList = historyPanel.querySelector("[data-project-version-list]");
            document.body.append(historyPanel);
            projectId = __resourcesDatasetGet(root, "data-project-id");
            persistence = __resourcesDatasetGet(root, "data-persistence") || "stored";
            draft = persistence === "session";
            memoryOnly = persistence === "memory";
            readOnly = __resourcesDatasetGet(root, "data-read-only") === "true";
            pendingSnapshotKey = pendingProjectSnapshotKey(projectId);
            initialProjectLayout = root.closest(".project-create__layout");
            initialDetailsButton = root.querySelector('[data-project-view="details"]');
            initiallyNarrow = (globalThis.matchMedia == null ? void 0 : globalThis.matchMedia("(max-width: 760px)").matches) === true;
            if (initialProjectLayout) __resourcesDatasetSet(initialProjectLayout, "data-details-visible", String(!initiallyNarrow));
            initialDetailsButton == null || initialDetailsButton.setAttribute("aria-pressed", String(!initiallyNarrow));
            __resourcesDatasetSet(root, "data-draft-state", "clean");
            restoredDraft = false;
            snapshotUrl = (_root$querySelector = root.querySelector("[data-project-snapshot-url]")) == null ? void 0 : __resourcesDatasetGet(_root$querySelector, "data-project-snapshot-url");
            workspacePayload = null;
            if (!snapshotUrl) {
              _context10.n = 6;
              break;
            }
            _context10.p = 1;
            _context10.n = 2;
            return fetch(snapshotUrl, {
              headers: {
                Accept: "application/json"
              },
              cache: "no-store"
            });
          case 2:
            response = _context10.v;
            if (response.ok) {
              _context10.n = 3;
              break;
            }
            throw new Error("Project workspace response: " + response.status);
          case 3:
            _context10.n = 4;
            return response.json();
          case 4:
            workspacePayload = _context10.v;
            snapshotField.value = JSON.stringify(workspacePayload.snapshot);
            versionCount.textContent = String(workspacePayload.versionCount || 1);
            draftFlash = (_root$closest2 = root.closest(".project-create__layout")) == null ? void 0 : _root$closest2.querySelector("[data-draft-flash]");
            if (draftFlash && workspacePayload.hasUnpublishedChanges) draftFlash.hidden = false;else draftFlash == null || draftFlash.remove();
            _context10.n = 6;
            break;
          case 5:
            _context10.p = 5;
            _t7 = _context10.v;
            __resourcesDatasetSet(root, "data-editor-machine-state", "failed");
            __resourcesDatasetSet(status, "data-state", "error");
            status.hidden = false;
            statusError.hidden = false;
            statusError.textContent = "Project failed to load: " + _t7.message;
            return _context10.a(2);
          case 6:
            if (!(typeof (snapshotField == null ? void 0 : snapshotField.value) !== "string")) {
              _context10.n = 7;
              break;
            }
            throw new Error("Project snapshot field is unavailable");
          case 7:
            _context10.p = 7;
            parsedSnapshot = JSON.parse(snapshotField.value);
            _context10.n = 9;
            break;
          case 8:
            _context10.p = 8;
            _t8 = _context10.v;
            throw new Error("Project snapshot JSON is invalid: " + ((_t8 == null ? void 0 : _t8.message) || _t8));
          case 9:
            state = normalizeProjectSnapshot(parsedSnapshot);
            initialOutputSnapshot = state;
            historyInEditorMachine = snapshotField.value.length <= 256e3;
            recoveredPendingSnapshot = false;
            if (!readOnly && !draft && !memoryOnly && pendingSnapshotKey) {
              try {
                pendingValue = sessionStorage.getItem(pendingSnapshotKey);
                if (pendingValue) {
                  recovered = normalizeProjectSnapshot(JSON.parse(pendingValue));
                  if (!projectSnapshotsEqual(state, recovered)) {
                    state = recovered;
                    snapshotField.value = JSON.stringify(state);
                    recoveredPendingSnapshot = true;
                  } else {
                    sessionStorage.removeItem(pendingSnapshotKey);
                  }
                }
              } catch (_unused6) {
                sessionStorage.removeItem(pendingSnapshotKey);
              }
            }
            if (workspacePayload) {
              fields = (_root$closest3 = root.closest(".project-create__layout")) == null ? void 0 : _root$closest3.querySelector("[data-project-fields]");
              templateField = fields == null ? void 0 : fields.querySelector("[data-project-template]");
              patternsField = fields == null ? void 0 : fields.querySelector("#project-link-patterns");
              if (templateField) templateField.value = ((_state$config = state.config) == null ? void 0 : _state$config.template) || "article";
              if (patternsField) patternsField.value = (((_state$config2 = state.config) == null || (_state$config2 = _state$config2.containerOptions) == null ? void 0 : _state$config2.allowedLinkPatterns) || []).join("\n");
            }
            requestedTemplate = memoryOnly ? ((_exec = /^\/try\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(location.pathname)) == null ? void 0 : _exec[1]) || queryParameter("template") : null;
            if (requestedTemplate && STARTING_POINTS[requestedTemplate]) {
              state = normalizeProjectSnapshot(STARTING_POINTS[requestedTemplate]);
              snapshotField.value = JSON.stringify(state);
            }
            currentSnapshot = state;
            viewingHistorical = false;
            selected = state.files.some(function (file) {
              var _state$config3;
              return file.path === ((_state$config3 = state.config) == null ? void 0 : _state$config3.entry);
            }) ? state.config.entry : ((_state$files$ = state.files[0]) == null ? void 0 : _state$files$.path) || "config";
            tabSessionKey = "resources_project_tabs_v1:" + (projectId || persistence);
            openTabs = [];
            try {
              openTabs = JSON.parse(sessionStorage.getItem(tabSessionKey)) || [];
            } catch (_unused7) {}
            if (!openTabs.length) openTabs = Array.isArray((_state$config4 = state.config) == null ? void 0 : _state$config4.editorTabs) ? _toConsumableArray(state.config.editorTabs) : [selected];
            ready = false;
            pending2 = recoveredPendingSnapshot;
            saveTimer = 0;
            pendingDestructive = false;
            templateOnlyPending = false;
            changeGeneration = 0;
            unsavedChangeCount = 0;
            currentUpdatedAt = recoveredPendingSnapshot ? Date.now() : Number(((_workspacePayload = workspacePayload) == null ? void 0 : _workspacePayload.updatedAt) || Date.now());
            saving = false;
            localHistory = null;
            editorController = null;
            editorGeneration = 0;
            editorPreviewTimer = 0;
            activeError = "";
            activeErrorAction = null;
            activeStatusSurface = "output";
            activeNotice = false;
            persistenceState = __resourcesDatasetGet(status, "data-state") || "normal";
            refreshSubmitLabel();
            if (draft || memoryOnly) {
              if (draft) {
                navigationEntries = typeof performance.getEntriesByType === "function" ? performance.getEntriesByType("navigation") : [];
                navigationType = (_navigationEntries$ = navigationEntries[0]) == null ? void 0 : _navigationEntries$.type;
                if (navigationType !== "reload" && navigationType !== "back_forward") sessionStorage.removeItem(DRAFT_KEY);
                try {
                  stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
                  if (stored != null && (_stored$patches = stored.patches) != null && _stored$patches.length) {
                    restoredDraft = true;
                    localHistory = stored;
                    (_localHistory = localHistory).versionTimes || (_localHistory.versionTimes = stored.patches.map(function (_, index) {
                      return Number(stored.createdAt || Date.now()) + index;
                    }));
                    (_localHistory2 = localHistory).snapshots || (_localHistory2.snapshots = stored.patches.map(function (_, index) {
                      return rebuildDraft(stored.patches, index + 1);
                    }));
                    state = normalizeProjectSnapshot(stored.snapshot);
                  }
                } catch (_unused8) {
                  sessionStorage.removeItem(DRAFT_KEY);
                }
              }
              localHistory || (localHistory = draftHistory(state));
              versionCount.textContent = String(localHistory.patches.length);
            }
            if (restoredDraft) {
              __resourcesDatasetSet(root, "data-draft-state", "saved");
              (_root$closest6 = root.closest("form")) == null || (_root$closest6 = _root$closest6.querySelector("[data-draft-actions]")) == null || _root$closest6.removeAttribute("hidden");
              (_root$closest7 = root.closest("form")) == null || (_root$closest7 = _root$closest7.querySelector("[data-new-draft-flash]")) == null || _root$closest7.removeAttribute("hidden");
            }
            openTabList = root.querySelector("[data-project-tabs]");
            tabScrollBack = document.createElement("button");
            tabScrollForward = document.createElement("button");
            for (_i2 = 0, _arr2 = [[tabScrollBack, "Scroll tabs left", "\u2039"], [tabScrollForward, "Scroll tabs right", "\u203A"]]; _i2 < _arr2.length; _i2++) {
              _arr2$_i = _slicedToArray(_arr2[_i2], 3), _button2 = _arr2$_i[0], _label = _arr2$_i[1], text = _arr2$_i[2];
              _button2.type = "button";
              _button2.className = "project-editor__tab-scroll";
              _button2.setAttribute("aria-label", _label);
              _button2.textContent = text;
              _button2.hidden = true;
            }
            openTabList.before(tabScrollBack);
            openTabList.after(tabScrollForward);
            tabScrollBack.addEventListener("click", function () {
              return openTabList.scrollBy({
                left: -Math.max(120, openTabList.clientWidth * 0.7),
                behavior: "smooth"
              });
            });
            tabScrollForward.addEventListener("click", function () {
              return openTabList.scrollBy({
                left: Math.max(120, openTabList.clientWidth * 0.7),
                behavior: "smooth"
              });
            });
            openTabList.addEventListener("scroll", syncTabOverflow);
            new ResizeObserver(syncTabOverflow).observe(openTabList);
            openTabList.addEventListener("click", function (event) {
              var close = event.target.closest("[data-close-tab]");
              if (close && openTabs.length > 1) {
                closeOpenTab(__resourcesDatasetGet(close, "data-close-tab"));
                return;
              }
              var tab = event.target.closest("[data-open-tab]");
              if (!tab) return;
              selected = __resourcesDatasetGet(tab, "data-open-tab");
              renderTabs();
              requestAnimationFrame(syncTabOverflow);
              sendContent();
            });
            draggedTab = "";
            openTabList.addEventListener("dragstart", function (event) {
              var _event$target$closest2;
              draggedTab = ((_event$target$closest2 = event.target.closest("[data-tab-path]")) == null ? void 0 : __resourcesDatasetGet(_event$target$closest2, "data-tab-path")) || "";
              if (draggedTab) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", draggedTab);
              }
            });
            openTabList.addEventListener("dragover", function (event) {
              if (draggedTab) event.preventDefault();
            });
            openTabList.addEventListener("drop", function (event) {
              var _event$target$closest3;
              event.preventDefault();
              var target = (_event$target$closest3 = event.target.closest("[data-tab-path]")) == null ? void 0 : __resourcesDatasetGet(_event$target$closest3, "data-tab-path");
              if (!draggedTab || !target || draggedTab === target) return;
              var sourceIndex = openTabs.indexOf(draggedTab);
              var targetIndex = openTabs.indexOf(target);
              openTabs.splice(sourceIndex, 1);
              openTabs.splice(targetIndex, 0, draggedTab);
              draggedTab = "";
              renderTabs();
              requestAnimationFrame(syncTabOverflow);
            });
            openTabList.addEventListener("dragend", function () {
              draggedTab = "";
            });
            fileTrigger = root.querySelector("[data-project-file-trigger]");
            fileTriggerIcon = fileTrigger.querySelector("svg");
            fileTriggerIcon.replaceChildren();
            for (_i3 = 0, _arr3 = ["M7 4h12v14H7zM4 7v14h12", "M10 8h6M10 11h6M10 14h4"]; _i3 < _arr3.length; _i3++) {
              d = _arr3[_i3];
              path = document.createElementNS("http://www.w3.org/2000/svg", "path");
              path.setAttribute("d", d);
              fileTriggerIcon.append(path);
            }
            fileTriggerArrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            fileTriggerArrow.classList.add("project-editor__file-arrow");
            fileTriggerArrow.setAttribute("viewBox", "0 0 12 12");
            fileTriggerArrow.setAttribute("fill", "none");
            fileTriggerArrow.setAttribute("stroke", "currentColor");
            fileTriggerArrow.setAttribute("stroke-width", "1.5");
            fileTriggerArrow.setAttribute("aria-hidden", "true");
            fileTriggerArrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            fileTriggerArrowPath.setAttribute("d", "m2 4 4 4 4-4");
            fileTriggerArrow.append(fileTriggerArrowPath);
            fileTrigger.append(fileTriggerArrow);
            fileMenu = root.querySelector("[data-project-file-menu]");
            fileFilter = root.querySelector("[data-project-file-filter]");
            (_fileFilter$previousE = fileFilter.previousElementSibling) == null || _fileFilter$previousE.remove();
            fileFilter.setAttribute("aria-label", "Filter files");
            fileEmpty = root.querySelector("[data-project-file-empty]");
            fileTrigger.addEventListener("click", function () {
              var opening = fileMenu.hidden;
              fileMenu.hidden = !opening;
              fileTrigger.setAttribute("aria-expanded", String(opening));
              if (opening) {
                fileFilter.value = "";
                filterProjectFiles();
                fileFilter.focus();
              }
            });
            fileFilter.addEventListener("input", filterProjectFiles);
            fileMenu.addEventListener("click", function (event) {
              var close = event.target.closest("[data-close-menu-tab]");
              if (close) {
                closeOpenTab(__resourcesDatasetGet(close, "data-close-menu-tab"));
                filterProjectFiles();
                return;
              }
              selectProjectFile(event);
              closeFileMenu({
                focus: true
              });
            });
            fileMenu.addEventListener("keydown", function (event) {
              var _options$next;
              if (event.key === "Escape") {
                event.preventDefault();
                closeFileMenu({
                  focus: true
                });
                return;
              }
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              var options = _toConsumableArray(fileMenu.querySelectorAll('[role="menuitemradio"]')).filter(function (option) {
                return !option.closest(".project-editor__file-option-row").hidden;
              });
              var current = Math.max(0, options.indexOf(document.activeElement));
              var next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
              (_options$next = options[next]) == null || _options$next.focus();
            });
            document.addEventListener("pointerdown", function (event) {
              if (!root.querySelector("[data-project-file-picker]").contains(event.target)) closeFileMenu();
            });
            editorOverflow = root.querySelector("[data-editor-overflow]");
            editorOverflowTrigger = root.querySelector("[data-editor-overflow-trigger]");
            editorOverflowMenu = root.querySelector("[data-editor-overflow-menu]");
            editorOverflowTrigger.addEventListener("click", function () {
              var _editorOverflowMenu$q;
              var opening = editorOverflowMenu.hidden;
              editorOverflowMenu.hidden = !opening;
              editorOverflowTrigger.setAttribute("aria-expanded", String(opening));
              if (opening) (_editorOverflowMenu$q = editorOverflowMenu.querySelector('[role="menuitem"]')) == null || _editorOverflowMenu$q.focus();
            });
            editorOverflowMenu.addEventListener("keydown", function (event) {
              if (event.key !== "Escape") return;
              event.preventDefault();
              closeEditorOverflow({
                focus: true
              });
            });
            document.addEventListener("pointerdown", function (event) {
              if (!editorOverflow.contains(event.target)) closeEditorOverflow();
            });
            root.querySelector("[data-save-tab-configuration]").addEventListener("click", function () {
              closeEditorOverflow();
              updateSnapshot({
                files: state.files,
                config: _extends({}, state.config, {
                  editorTabs: _toConsumableArray(openTabs)
                })
              });
              setStatus("Tab configuration saved");
            });
            archiveInput = root.querySelector("[data-project-archive-file]");
            root.querySelector("[data-project-import]").addEventListener("click", function () {
              closeEditorOverflow();
              archiveInput.click();
            });
            root.querySelector("[data-project-export]").addEventListener("click", function () {
              closeEditorOverflow();
              try {
                var _root$closest9;
                var projectName = String(((_root$closest9 = root.closest("form")) == null || (_root$closest9 = _root$closest9.elements) == null || (_root$closest9 = _root$closest9.namedItem("slug")) == null ? void 0 : _root$closest9.value) || __resourcesDatasetGet(root, "data-project-slug") || "").trim();
                downloadProjectArchive(state, projectName);
              } catch (_error11) {
                setStatus(_error11.message, "error");
              }
            });
            archiveInput.addEventListener("change", _asyncToGenerator(_regenerator().m(function _callee2() {
              var imported, _imported$config, _t, _t2;
              return _regenerator().w(function (_context2) {
                while (1) switch (_context2.p = _context2.n) {
                  case 0:
                    _context2.p = 0;
                    _t = normalizeProjectSnapshot;
                    _context2.n = 1;
                    return importProjectArchive();
                  case 1:
                    imported = _t(_context2.v);
                    selected = imported.config.entry && imported.files.some(function (item) {
                      return item.path === imported.config.entry;
                    }) ? imported.config.entry : imported.files[0].path;
                    updateSnapshot(imported, {
                      destructive: true
                    });
                    if (template) template.value = imported.config.template || "blank";
                    if (linkPatterns) {
                      linkPatterns.value = (((_imported$config = imported.config) == null || (_imported$config = _imported$config.containerOptions) == null ? void 0 : _imported$config.allowedLinkPatterns) || []).join("\n");
                      growTextarea(linkPatterns);
                    }
                    renderTabs();
                    sendContent();
                    renderPreview();
                    setStatus("ZIP imported");
                    _context2.n = 3;
                    break;
                  case 2:
                    _context2.p = 2;
                    _t2 = _context2.v;
                    setStatus(_t2.message, "error");
                  case 3:
                    _context2.p = 3;
                    archiveInput.value = "";
                    return _context2.f(3);
                  case 4:
                    return _context2.a(2);
                }
              }, _callee2, null, [[0, 2, 3, 4]]);
            })));
            workspace = root.querySelector(".project-editor__workspace");
            outputOverflow = root.querySelector("[data-output-overflow]");
            outputOverflowTrigger = root.querySelector("[data-output-overflow-trigger]");
            outputOverflowMenu = root.querySelector("[data-output-overflow-menu]");
            fullscreenButton = root.querySelector("[data-project-fullscreen]");
            outputOverflowTrigger.addEventListener("click", function () {
              var opening = outputOverflowMenu.hidden;
              outputOverflowMenu.hidden = !opening;
              outputOverflowTrigger.setAttribute("aria-expanded", String(opening));
              if (opening) fullscreenButton.focus();
            });
            fullscreenButton.addEventListener("click", _asyncToGenerator(_regenerator().m(function _callee3() {
              var frame, _t3;
              return _regenerator().w(function (_context3) {
                while (1) switch (_context3.p = _context3.n) {
                  case 0:
                    closeOutputOverflow();
                    frame = root.querySelector(".project-editor__output-frame");
                    if (frame) {
                      _context3.n = 1;
                      break;
                    }
                    return _context3.a(2, setStatus("Output is not ready", "error"));
                  case 1:
                    _context3.p = 1;
                    _context3.n = 2;
                    return frame.requestFullscreen();
                  case 2:
                    _context3.n = 4;
                    break;
                  case 3:
                    _context3.p = 3;
                    _t3 = _context3.v;
                    setStatus("Full screen failed: " + ((_t3 == null ? void 0 : _t3.message) || String(_t3)), "error");
                  case 4:
                    return _context3.a(2);
                }
              }, _callee3, null, [[1, 3]]);
            })));
            outputOverflowMenu.addEventListener("keydown", function (event) {
              if (event.key !== "Escape") return;
              event.preventDefault();
              closeOutputOverflow({
                focus: true
              });
            });
            document.addEventListener("pointerdown", function (event) {
              if (!outputOverflow.contains(event.target)) closeOutputOverflow();
            });
            splitter = root.querySelector(".project-editor__splitter");
            projectLayout = root.closest(".project-create__layout");
            projectClose = projectLayout.querySelector(".project-fields__toolbar .project-close");
            projectCloseHome = projectClose == null ? void 0 : projectClose.parentElement;
            projectViewControls = root.querySelector(".project-editor__view-controls");
            projectDetails = root.querySelector('[data-project-view="details"]');
            splitter.addEventListener("pointerdown", function (event) {
              splitter.setPointerCapture(event.pointerId);
              setSplit(event.clientX);
            });
            splitter.addEventListener("pointermove", function (event) {
              if (splitter.hasPointerCapture(event.pointerId)) setSplit(event.clientX);
            });
            splitter.addEventListener("keydown", function (event) {
              if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
              event.preventDefault();
              var next = Math.max(20, Math.min(80, Number(splitter.getAttribute("aria-valuenow")) + (event.key === "ArrowRight" ? 5 : -5)));
              root.style.setProperty("--source-width", next + "%");
              splitter.setAttribute("aria-valuenow", String(next));
            });
            _loop8 = _regenerator().m(function _loop8() {
              var button;
              return _regenerator().w(function (_context0) {
                while (1) switch (_context0.n) {
                  case 0:
                    button = _step23.value;
                    button.addEventListener("click", function () {
                      var _editorController7;
                      var detailsButton = projectDetails;
                      if (__resourcesDatasetGet(button, "data-project-view") === "details") {
                        if (narrowWorkspace.matches) {
                          var showing = __resourcesDatasetGet(projectLayout, "data-mobile-view") === "details";
                          if (showing) __resourcesDatasetDelete(projectLayout, "data-mobile-view");else __resourcesDatasetSet(projectLayout, "data-mobile-view", "details");
                          detailsButton.setAttribute("aria-pressed", String(!showing));
                          placeProjectClose(!showing);
                        } else {
                          var _showing = __resourcesDatasetGet(projectLayout, "data-details-visible") !== "false";
                          __resourcesDatasetSet(projectLayout, "data-details-visible", String(!_showing));
                          detailsButton.setAttribute("aria-pressed", String(!_showing));
                          placeProjectClose(!_showing);
                        }
                      } else {
                        __resourcesDatasetDelete(projectLayout, "data-mobile-view");
                        __resourcesDatasetSet(workspace, "data-view", __resourcesDatasetGet(button, "data-project-view"));
                        for (var _iterator29 = _createForOfIteratorHelperLoose(root.querySelectorAll(".project-view-segments [data-project-view]")), _step29; !(_step29 = _iterator29()).done;) {
                          var item = _step29.value;
                          item.setAttribute("aria-pressed", item === button ? "true" : "false");
                        }
                        if (narrowWorkspace.matches) {
                          detailsButton.setAttribute("aria-pressed", "false");
                          placeProjectClose(false);
                        }
                      }
                      renderStatusState();
                      if (__resourcesDatasetGet(button, "data-project-view") === "editor") (_editorController7 = editorController) == null || _editorController7.focus();
                    });
                  case 1:
                    return _context0.a(2);
                }
              }, _loop8);
            });
            _iterator23 = _createForOfIteratorHelperLoose(root.querySelectorAll("[data-project-view]"));
          case 10:
            if ((_step23 = _iterator23()).done) {
              _context10.n = 12;
              break;
            }
            return _context10.d(_regeneratorValues(_loop8()), 11);
          case 11:
            _context10.n = 10;
            break;
          case 12:
            narrowWorkspace = matchMedia("(max-width: 760px)");
            syncResponsiveWorkspace();
            narrowWorkspace.addEventListener == null || narrowWorkspace.addEventListener("change", syncResponsiveWorkspace);
            form = root.closest("form") || document.querySelector("[data-project-fields]");
            template = form == null ? void 0 : form.querySelector("[data-project-template]");
            linkPatterns = form == null ? void 0 : form.querySelector("#project-link-patterns");
            if (template && !template.querySelector('option[value="slides"]')) {
              _option2 = document.createElement("option");
              _option2.setAttribute("value", "slides");
              _option2.textContent = "Presentation";
              template.append(_option2);
            }
            if (template && (_state$config6 = state.config) != null && _state$config6.template) template.value = state.config.template;
            if (linkPatterns) linkPatterns.value = (((_state$config7 = state.config) == null || (_state$config7 = _state$config7.containerOptions) == null ? void 0 : _state$config7.allowedLinkPatterns) || []).join("\n");
            growTextarea(linkPatterns);
            template == null || template.addEventListener("change", _asyncToGenerator(_regenerator().m(function _callee4() {
              var next, previousSnapshot;
              return _regenerator().w(function (_context4) {
                while (1) switch (_context4.n) {
                  case 0:
                    next = STARTING_POINTS[template.value];
                    if (next) {
                      _context4.n = 1;
                      break;
                    }
                    return _context4.a(2);
                  case 1:
                    if (memoryOnly && (location.pathname === "/try" || location.pathname.startsWith("/try/"))) {
                      replaceFrontendPath("/try/" + encodeURIComponent(template.value));
                    }
                    if (!pending2) {
                      _context4.n = 4;
                      break;
                    }
                    if (!templateOnlyPending) {
                      _context4.n = 2;
                      break;
                    }
                    clearTimeout(saveTimer);
                    pending2 = false;
                    pendingDestructive = false;
                    _context4.n = 4;
                    break;
                  case 2:
                    if (!(draft || memoryOnly)) {
                      _context4.n = 3;
                      break;
                    }
                    checkpointDraft({
                      destructive: true
                    });
                    _context4.n = 4;
                    break;
                  case 3:
                    _context4.n = 4;
                    return save();
                  case 4:
                    previousSnapshot = state;
                    applyTemplateSnapshot(next, {
                      previousSnapshot: previousSnapshot
                    });
                  case 5:
                    return _context4.a(2);
                }
              }, _callee4);
            })));
            _loop9 = _regenerator().m(function _loop9() {
              var textarea;
              return _regenerator().w(function (_context1) {
                while (1) switch (_context1.n) {
                  case 0:
                    textarea = _step25.value;
                    textarea.addEventListener("input", function () {
                      return growTextarea(textarea);
                    });
                    growTextarea(textarea);
                  case 1:
                    return _context1.a(2);
                }
              }, _loop9);
            });
            _iterator25 = _createForOfIteratorHelperLoose((form == null ? void 0 : form.querySelectorAll("textarea[data-autogrow]")) || []);
          case 13:
            if ((_step25 = _iterator25()).done) {
              _context10.n = 15;
              break;
            }
            return _context10.d(_regeneratorValues(_loop9()), 14);
          case 14:
            _context10.n = 13;
            break;
          case 15:
            linkPatterns == null || linkPatterns.addEventListener("input", updateContainer);
            _iterator26 = _createForOfIteratorHelperLoose((form == null ? void 0 : form.querySelectorAll("[data-project-fields] input:not([type=hidden]), [data-project-fields] textarea:not([data-project-snapshot]), [data-project-fields] select")) || []);
          case 16:
            if ((_step26 = _iterator26()).done) {
              _context10.n = 19;
              break;
            }
            field = _step26.value;
            if (!field.matches("[data-project-template], #project-link-patterns, [data-version-title-input]")) {
              _context10.n = 17;
              break;
            }
            return _context10.a(3, 18);
          case 17:
            field.addEventListener("input", function () {
              unsavedChangeCount += 1;
              refreshSubmitLabel();
            }, {
              once: true
            });
            field.addEventListener("change", function () {
              if (!unsavedChangeCount) {
                unsavedChangeCount = 1;
                refreshSubmitLabel();
              }
            });
          case 18:
            _context10.n = 16;
            break;
          case 19:
            openVersionHistory = function openVersionHistory() {
              if (!historyPanel.hidden) {
                closeHistory();
                return;
              }
              versionButton._hideInstantTooltip == null || versionButton._hideInstantTooltip();
              historyPanel.hidden = false;
              versionButton.setAttribute("aria-expanded", "true");
              positionHistory();
              if (readOnly) {
                versionList.replaceChildren(versionChoice(relativeVersionTime(currentUpdatedAt), currentUpdatedAt, {
                  current: true
                }));
                positionHistory();
              } else if (draft || memoryOnly) {
                renderDraftVersions();
                positionHistory();
              } else {
                renderStoredVersions().then(positionHistory).catch(function (error) {
                  versionList.textContent = "Version history unavailable: " + error.message;
                  positionHistory();
                });
              }
            };
            versionButton.addEventListener("click", openVersionHistory);
            versionButton.getBoundingClientRect();
            document.addEventListener("pointerdown", function (event) {
              if (historyPanel.hidden || historyPanel.contains(event.target) || versionButton.contains(event.target)) return;
              closeHistory();
            });
            setInterval(function () {
              if (readOnly) return;
              if (draft || memoryOnly) checkpointDraft();else if (pending2) save();
            }, CHECKPOINT_MS);
            setInterval(function () {
              for (var _iterator27 = _createForOfIteratorHelperLoose(((_root$closest0 = root.closest(".project-create__layout")) == null ? void 0 : _root$closest0.querySelectorAll("[data-version-time]")) || []), _step27; !(_step27 = _iterator27()).done;) {
                var _root$closest0;
                var _label2 = _step27.value;
                _label2.textContent = relativeVersionTime(__resourcesDatasetGet(_label2, "data-version-time"));
              }
            }, 3e4);
            if (!readOnly && !draft && !memoryOnly) renderStoredVersions();
            renderTabs();
            mountEditorMachine();
            if (recoveredPendingSnapshot) saveTimer = setTimeout(save, 0);
            addEventListener("pagehide", function () {
              var _editorController5;
              historyPanel.remove();
              editorGeneration += 1;
              (_editorController5 = editorController) == null || _editorController5.destroy();
              clearTimeout(editorPreviewTimer);
            }, {
              once: true
            });
          case 20:
            return _context10.a(2);
        }
      }, _callee9, null, [[7, 8], [1, 5]]);
    }));
    return _mountProjectRoot.apply(this, arguments);
  }
  for (var _iterator15 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-project-editor]")), _step15; !(_step15 = _iterator15()).done;) {
    var root = _step15.value;
    mountProjectRoot(root).catch(function (error) {
      return globalThis.__wwcReportError == null ? void 0 : globalThis.__wwcReportError((error == null ? void 0 : error.stack) || (error == null ? void 0 : error.message) || String(error));
    });
  }
  var _loop0 = function _loop0() {
    var figure = _step16.value;
    var focusBlogPresentation = function focusBlogPresentation() {
        var _frame$contentWindow;
        if (!presentationReady) return;
        frame == null || frame.focus({
          preventScroll: true
        });
        frame == null || (_frame$contentWindow = frame.contentWindow) == null || _frame$contentWindow.postMessage({
          protocol: "resources-project-presentation-v1",
          type: "focus"
        }, "*");
      },
      closeBlogPresentation = function closeBlogPresentation(_temp10) {
        var _ref17 = _temp10 === void 0 ? {} : _temp10,
          _ref17$focus = _ref17.focus,
          focus = _ref17$focus === void 0 ? true : _ref17$focus;
        if (!figure.classList.contains("blog-example-block--fullscreen")) return;
        figure.classList.remove("blog-example-block--fullscreen");
        blogContentBlock == null || blogContentBlock.style.removeProperty("animation");
        blogContentBlock == null || blogContentBlock.style.removeProperty("backdrop-filter");
        blogContentBlock == null || blogContentBlock.style.removeProperty("transform");
        document.body.classList.remove("blog-example-presenting");
        button.textContent = "View full screen \u2197";
        button.setAttribute("aria-label", "View full screen");
        if (focus) button.focus();
      };
    var button = figure.querySelector(".blog-example-fullscreen");
    var frame = figure.querySelector(".blog-example");
    var error = figure.querySelector(".blog-example-error");
    var presentationReady = false;
    if (!button) return 1;
    var blogContentBlock = figure.closest(".content-block");
    button.addEventListener("click", function (event) {
      if (figure.classList.contains("blog-example-block--fullscreen")) {
        closeBlogPresentation({
          focus: event.detail === 0
        });
        return;
      }
      figure.classList.add("blog-example-block--fullscreen");
      blogContentBlock == null || blogContentBlock.style.setProperty("animation", "none");
      blogContentBlock == null || blogContentBlock.style.setProperty("backdrop-filter", "none");
      blogContentBlock == null || blogContentBlock.style.setProperty("transform", "none");
      document.body.classList.add("blog-example-presenting");
      button.textContent = "\xD7";
      button.setAttribute("aria-label", "Close full screen");
      button.blur();
      requestAnimationFrame(focusBlogPresentation);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !figure.classList.contains("blog-example-block--fullscreen")) return;
      event.preventDefault();
      closeBlogPresentation();
    });
    addEventListener("message", function (event) {
      var _event$data;
      if (event.source !== (frame == null ? void 0 : frame.contentWindow) || ((_event$data = event.data) == null ? void 0 : _event$data.protocol) !== "resources-project-presentation-v1") return;
      if (event.data.type === "ready") {
        presentationReady = true;
        if (figure.classList.contains("blog-example-block--fullscreen")) focusBlogPresentation();
      }
      if (event.data.type === "escape") closeBlogPresentation();
      if (event.data.type === "status") {
        error.hidden = event.data.status !== "blocked";
        error.textContent = event.data.status === "blocked" ? "Blocked: " + event.data.message : "";
      }
    });
    addEventListener("pagehide", function () {
      return closeBlogPresentation({
        focus: false
      });
    }, {
      once: true
    });
  };
  for (var _iterator16 = _createForOfIteratorHelperLoose(document.querySelectorAll(".blog-example-block")), _step16; !(_step16 = _iterator16()).done;) {
    if (_loop0()) continue;
  }
})();