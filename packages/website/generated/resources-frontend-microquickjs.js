function _regeneratorValues(e) { if (null != e) { var t = e["function" == typeof Symbol && Symbol.iterator || "@@iterator"], r = 0; if (t) return t.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) return { next: function next() { return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }; } }; } throw new TypeError(typeof e + " is not iterable"); }
function _createForOfIteratorHelperLoose(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (t) return (t = t.call(r)).next.bind(t); if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var o = 0; return function () { return o >= r.length ? { done: !0 } : { done: !1, value: r[o++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _regenerator() { var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (_t) { i = e, c = 1, u = _t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (_e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (_r) { o = !0, n = _r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (_n) { return void e(_n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
(function () {
  var _resourcesFrontend = _asyncToGenerator(_regenerator().m(function _callee3() {
    var storageRequest, _loop, _i, _arr, isMac, shortcut, _iterator, _step, label, paletteFor, openPalette, openCommandPalette, closePalette, _loop2, _iterator3, _step3, root, choices, storageKey, media, storedTheme, resolved, apply, syncSystemTheme, menuSelector, closeMenus, pending, nextRequest, editorListeners, outputListeners, call, hasSessionValue, navigationType, setProjectEditorTheme, requestFrontendService, FrontendHeaders, FrontendResponse, mountProjectPresentation, DRAFT_KEY, PENDING_KEY_PREFIX, pendingProjectSnapshotKey, hasProjectRecovery, root3, deferOutput, openProject, _openProject, root2, mountContentNameFields;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.n) {
        case 0:
          mountContentNameFields = function _mountContentNameFiel() {
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
            for (var _iterator7 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-slug-source], #project-name, #organization-name, " + slugSelector)), _step7; !(_step7 = _iterator7()).done;) {
              var field = _step7.value;
              field.addEventListener("input", onInput);
              if (field.value) onInput({
                target: field
              });
            }
            for (var _iterator8 = _createForOfIteratorHelperLoose(document.querySelectorAll(slugSelector)), _step8; !(_step8 = _iterator8()).done;) {
              var _field = _step8.value;
              _field.addEventListener("focusout", onFocusOut);
            }
          };
          hasProjectRecovery = function _hasProjectRecovery(_ref3, storage) {
            var projectId = _ref3.projectId,
              _ref3$persistence = _ref3.persistence,
              persistence = _ref3$persistence === void 0 ? "stored" : _ref3$persistence,
              readOnly = _ref3.readOnly,
              navigationType2 = _ref3.navigationType;
            if (readOnly || persistence === "memory") return false;
            var key = persistence === "session" ? ["reload", "back_forward"].includes(navigationType2) ? DRAFT_KEY : "" : pendingProjectSnapshotKey(projectId);
            try {
              return !!key && storage.getItem(key) !== null;
            } catch (_unused9) {
              return false;
            }
          };
          pendingProjectSnapshotKey = function _pendingProjectSnapsh(projectId) {
            return projectId ? "" + PENDING_KEY_PREFIX + projectId : "";
          };
          mountProjectPresentation = function _mountProjectPresenta(root3) {
            var button = root3.querySelector("[data-project-present]");
            var close = root3.querySelector("[data-project-present-close]");
            var preview = root3.querySelector(".project-editor__preview");
            var content = root3.closest(".content-block");
            function hide() {
              __resourcesDatasetDelete(root3, "data-presenting");
              document.body.classList.remove("project-presenting");
              preview.classList.remove("project-editor__preview--presenting");
              for (var _i2 = 0, _arr2 = ["animation", "backdrop-filter", "transform"]; _i2 < _arr2.length; _i2++) {
                var name = _arr2[_i2];
                content == null || content.style.removeProperty(name);
              }
              button.setAttribute("aria-pressed", "false");
            }
            button.addEventListener("click", function () {
              __resourcesDatasetSet(root3, "data-presenting", "true");
              document.body.classList.add("project-presenting");
              preview.classList.add("project-editor__preview--presenting");
              for (var _i3 = 0, _arr3 = ["animation", "backdrop-filter", "transform"]; _i3 < _arr3.length; _i3++) {
                var name = _arr3[_i3];
                content == null || content.style.setProperty(name, "none");
              }
              button.setAttribute("aria-pressed", "true");
              close.blur();
              requestAnimationFrame(function () {
                var _root3$querySelector;
                return (_root3$querySelector = root3.querySelector(".project-editor__output-frame")) == null ? void 0 : _root3$querySelector.focus();
              });
            });
            close.addEventListener("click", function (event) {
              hide();
              if (event.detail === 0) button.focus();else button.blur();
            });
            document.addEventListener("keydown", function (event) {
              if (event.key === "Escape" && __resourcesDatasetGet(root3, "data-presenting") === "true") {
                event.preventDefault();
                hide();
                button.focus();
              } else if (event.key === "Escape" && parent !== window) {
                parent.postMessage({
                  protocol: "resources-project-presentation-v1",
                  type: "escape"
                }, "*");
              }
            });
          };
          requestFrontendService = function _requestFrontendServi(name, payload) {
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
                protocol: "resources-frontend-v1",
                id: id,
                name: name,
                payload: payload
              }));
            });
          };
          setProjectEditorTheme = function _setProjectEditorThem(theme) {
            return call("editor.theme", {
              theme: theme
            });
          };
          navigationType = function _navigationType() {
            return call("navigation.type");
          };
          hasSessionValue = function _hasSessionValue(key) {
            return storageRequest("has", "session", key);
          };
          call = function _call(name, payload) {
            if (payload === void 0) {
              payload = {};
            }
            return JSON.parse(globalThis.__wwcServiceCall(name, JSON.stringify(payload)));
          };
          closeMenus = function _closeMenus(except) {
            if (except === void 0) {
              except = null;
            }
            for (var _iterator5 = _createForOfIteratorHelperLoose(document.querySelectorAll(menuSelector + "[open]")), _step5; !(_step5 = _iterator5()).done;) {
              var menu = _step5.value;
              if (menu !== except) menu.removeAttribute("open");
            }
          };
          apply = function _apply(choice, persist) {
            if (persist === void 0) {
              persist = true;
            }
            if (!choices.has(choice)) return;
            var theme = resolved(choice);
            __resourcesDatasetSet(root, "data-theme", theme);
            __resourcesDatasetSet(root, "data-theme-choice", choice);
            for (var _iterator4 = _createForOfIteratorHelperLoose(document.querySelectorAll("button[data-theme-choice]")), _step4; !(_step4 = _iterator4()).done;) {
              var button = _step4.value;
              button.setAttribute("aria-pressed", String(__resourcesDatasetGet(button, "data-theme-choice") === choice));
            }
            if (persist) {
              try {
                localStorage.setItem(storageKey, choice);
              } catch (_unused8) {}
            }
            document.dispatchEvent(new CustomEvent("themechange", {
              detail: {
                choice: choice,
                theme: theme
              }
            }));
          };
          resolved = function _resolved(choice) {
            return choice === "system" ? media.matches ? "light" : "dark" : choice;
          };
          storedTheme = function _storedTheme() {
            try {
              var value = localStorage.getItem(storageKey);
              return choices.has(value) ? value : null;
            } catch (_unused7) {
              return null;
            }
          };
          closePalette = function _closePalette(dialog) {
            if (dialog != null && dialog.open) dialog.close();
          };
          openCommandPalette = function _openCommandPalette() {
            openPalette(document.querySelector("[data-command-open]"));
          };
          openPalette = function _openPalette(trigger) {
            var dialog = paletteFor(trigger);
            if (!dialog || dialog.open) return;
            dialog.showModal();
            var input = dialog.querySelector("[data-command-input]");
            input.value = "";
            input.dispatchEvent(new Event("input"));
            input.focus();
          };
          paletteFor = function _paletteFor(trigger) {
            var _trigger$closest;
            return ((_trigger$closest = trigger.closest(".userbar")) == null ? void 0 : _trigger$closest.querySelector("[data-command-dialog]")) || document.querySelector("[data-command-dialog]");
          };
          storageRequest = function _storageRequest(operation, kind, key, value) {
            var text = JSON.stringify({
              operation: operation,
              kind: kind,
              key: String(key),
              value: value
            });
            if (text.length > 2 * 1024 * 1024) throw new RangeError("Storage request exceeds its text limit");
            var result = JSON.parse(globalThis.__wwcServiceCall("storage.request", text));
            if (result.error) {
              var ErrorType = result.error.name === "RangeError" ? RangeError : result.error.name === "TypeError" ? TypeError : Error;
              var error = new ErrorType(result.error.message);
              error.name = result.error.name;
              throw error;
            }
            return result.value;
          };
          _loop = _regenerator().m(function _loop() {
            var _arr$_i, kind, area;
            return _regenerator().w(function (_context) {
              while (1) switch (_context.n) {
                case 0:
                  _arr$_i = _slicedToArray(_arr[_i], 2), kind = _arr$_i[0], area = _arr$_i[1];
                  area.getItem = function (key) {
                    return storageRequest("get", kind, key);
                  };
                  area.setItem = function (key, value) {
                    storageRequest("set", kind, key, String(value));
                  };
                  area.removeItem = function (key) {
                    storageRequest("delete", kind, key);
                  };
                case 1:
                  return _context.a(2);
              }
            }, _loop);
          });
          _i = 0, _arr = [["local", localStorage], ["session", sessionStorage]];
        case 1:
          if (!(_i < _arr.length)) {
            _context5.n = 3;
            break;
          }
          return _context5.d(_regeneratorValues(_loop()), 2);
        case 2:
          _i++;
          _context5.n = 1;
          break;
        case 3:
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
          isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
          shortcut = isMac ? "\u2318 K" : "Ctrl K";
          for (_iterator = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-command-shortcut]")); !(_step = _iterator()).done;) {
            label = _step.value;
            label.textContent = shortcut;
          }
          document.addEventListener("click", function (event) {
            var trigger = event.target.closest("[data-command-open]");
            if (trigger) {
              event.preventDefault();
              openPalette(trigger);
              return;
            }
            var search = event.target.closest("[data-search-elsewhere]");
            if (search) {
              var _dialog$querySelector;
              var dialog = search.closest("[data-command-dialog]");
              var query = (dialog == null || (_dialog$querySelector = dialog.querySelector("[data-command-input]")) == null ? void 0 : _dialog$querySelector.value.trim()) || "";
              search.setAttribute("href", query ? "/browse?q=" + encodeURIComponent(query) : "/browse");
            }
          });
          document.addEventListener("keydown", function (event) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
              event.preventDefault();
              openCommandPalette();
              return;
            }
            if (event.key === "Escape") closePalette(document.querySelector("[data-command-dialog][open]"));
          });
          document.addEventListener("input", function (event) {
            if (!event.target.matches("[data-command-input]")) return;
            var query = event.target.value.trim().toLowerCase();
            var dialog = event.target.closest("[data-command-dialog]");
            for (var _iterator2 = _createForOfIteratorHelperLoose(dialog.querySelectorAll("[data-command-label]")), _step2; !(_step2 = _iterator2()).done;) {
              var item = _step2.value;
              item.hidden = Boolean(query && !__resourcesDatasetGet(item, "data-command-label").includes(query));
            }
            var elsewhere = dialog.querySelector("[data-search-elsewhere] span");
            elsewhere.textContent = query ? "Search Resources.co for \u201C" + event.target.value.trim() + "\u201D" : "Search Resources.co";
          });
          _loop2 = _regenerator().m(function _loop2() {
            var dialog;
            return _regenerator().w(function (_context4) {
              while (1) switch (_context4.n) {
                case 0:
                  dialog = _step3.value;
                  dialog.addEventListener("click", function (event) {
                    if (event.target === dialog) closePalette(dialog);
                  });
                case 1:
                  return _context4.a(2);
              }
            }, _loop2);
          });
          _iterator3 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-command-dialog]"));
        case 4:
          if ((_step3 = _iterator3()).done) {
            _context5.n = 6;
            break;
          }
          return _context5.d(_regeneratorValues(_loop2()), 5);
        case 5:
          _context5.n = 4;
          break;
        case 6:
          root = document.documentElement;
          choices = new Set(["dark", "light", "system"]);
          storageKey = __resourcesDatasetGet(root, "data-theme-storage-key") || "macchiato-theme";
          media = matchMedia("(prefers-color-scheme: light)");
          document.addEventListener("click", function (event) {
            var button = event.target.closest("[data-theme-choice]");
            if (button) apply(__resourcesDatasetGet(button, "data-theme-choice"));
          });
          syncSystemTheme = function syncSystemTheme() {
            if (__resourcesDatasetGet(root, "data-theme-choice") === "system" && __resourcesDatasetGet(root, "data-theme") !== resolved("system")) apply("system", false);
          };
          media.onchange = syncSystemTheme;
          media.addEventListener == null || media.addEventListener("change", syncSystemTheme);
          apply(storedTheme() || "system", false);
          menuSelector = "details.edge-user-menu";
          document.addEventListener("click", function (event) {
            var menu = event.target.closest(menuSelector);
            if (!menu) closeMenus();else if (event.target.closest("summary")) closeMenus(menu);
          });
          document.addEventListener("keydown", function (event) {
            var _open$querySelector;
            if (event.key !== "Escape") return;
            var open = document.querySelector(menuSelector + "[open]");
            if (!open) return;
            open.removeAttribute("open");
            (_open$querySelector = open.querySelector("summary")) == null || _open$querySelector.focus();
          });
          document.addEventListener("change", function (event) {
            var select = event.target.closest == null ? void 0 : event.target.closest("select[data-language-select]");
            if (select != null && select.form) select.form.requestSubmit();
          });
          pending = new Map();
          nextRequest = 1;
          editorListeners = null;
          outputListeners = new Map();
          globalThis.__resourcesFrontendReceive = function (json) {
            var message = JSON.parse(json);
            if (message.type === "command-palette") {
              openCommandPalette();
              return "null";
            }
            if (message.type === "editor-change") {
              editorListeners == null || editorListeners.onChange == null || editorListeners.onChange(message.content, {
                syntaxErrors: message.syntaxErrors === true
              });
              return "null";
            }
            if (message.type === "editor-ready") {
              editorListeners == null || editorListeners.onReady == null || editorListeners.onReady(message.value);
              return "null";
            }
            if (message.type === "editor-limit") {
              editorListeners == null || editorListeners.onLimit == null || editorListeners.onLimit(message.value);
              return "null";
            }
            if (message.type === "editor-error") {
              editorListeners == null || editorListeners.onViolation == null || editorListeners.onViolation(new Error(message.message));
              return "null";
            }
            if (message.type === "output-error") {
              var _outputListeners$get;
              (_outputListeners$get = outputListeners.get(message.id)) == null || _outputListeners$get(new Error(message.message));
              return "null";
            }
            var operation = pending.get(message.id);
            if (!operation) return "null";
            pending.delete(message.id);
            if (message.error) operation.reject(new Error(message.error));else operation.resolve(message.value);
            return "null";
          };
          FrontendHeaders = function () {
            function FrontendHeaders(entries) {
              if (entries === void 0) {
                entries = [];
              }
              this.entries = new Map(entries.map(function (_ref) {
                var _ref2 = _slicedToArray(_ref, 2),
                  name = _ref2[0],
                  value = _ref2[1];
                return [name.toLowerCase(), value];
              }));
            }
            var _proto = FrontendHeaders.prototype;
            _proto.get = function get(name) {
              return this.entries.get(String(name).toLowerCase()) || null;
            };
            return FrontendHeaders;
          }();
          FrontendResponse = function () {
            function FrontendResponse(value) {
              this.status = value.status;
              this.ok = value.status >= 200 && value.status < 300;
              this.url = value.url;
              this.headers = new FrontendHeaders(value.headers);
              this.bodyText = value.body;
            }
            var _proto2 = FrontendResponse.prototype;
            _proto2.text = function text() {
              return Promise.resolve(this.bodyText);
            };
            _proto2.json = function json() {
              return Promise.resolve(JSON.parse(this.bodyText));
            };
            return FrontendResponse;
          }();
          globalThis.fetch = function () {
            var _frontendFetch = _asyncToGenerator(_regenerator().m(function _callee(input, init) {
              var response;
              return _regenerator().w(function (_context2) {
                while (1) switch (_context2.n) {
                  case 0:
                    if (init === void 0) {
                      init = {};
                    }
                    _context2.n = 1;
                    return requestFrontendService("fetch", {
                      url: String(input),
                      method: String(init.method || "GET").toUpperCase(),
                      headers: init.headers || {},
                      body: init.body == null ? null : String(init.body)
                    });
                  case 1:
                    response = _context2.v;
                    return _context2.a(2, new FrontendResponse(response));
                }
              }, _callee);
            }));
            function frontendFetch(_x, _x2) {
              return _frontendFetch.apply(this, arguments);
            }
            return frontendFetch;
          }();
          DRAFT_KEY = "resources_project_draft_v5";
          PENDING_KEY_PREFIX = "resources_project_pending_v1:";
          if (document.querySelector("[data-project-editor]")) {
            _openProject = function _openProject3() {
              _openProject = _asyncToGenerator(_regenerator().m(function _callee2() {
                var _root3$querySelector2, _workspace, _workspace2, _saved$project;
                var url, workspace, response, saved, config, savedConfig, useSaved;
                return _regenerator().w(function (_context3) {
                  while (1) switch (_context3.n) {
                    case 0:
                      url = (_root3$querySelector2 = root3.querySelector("[data-project-snapshot-url]")) == null ? void 0 : __resourcesDatasetGet(_root3$querySelector2, "data-project-snapshot-url");
                      if (!url) {
                        _context3.n = 3;
                        break;
                      }
                      _context3.n = 1;
                      return requestFrontendService("fetch", {
                        url: url,
                        method: "GET",
                        headers: {
                          Accept: "application/json"
                        }
                      });
                    case 1:
                      response = _context3.v;
                      if (!(response.status !== 200)) {
                        _context3.n = 2;
                        break;
                      }
                      throw new Error("Project workspace response: " + response.status);
                    case 2:
                      workspace = JSON.parse(response.body);
                    case 3:
                      saved = (_workspace = workspace) == null ? void 0 : _workspace.savedOutput;
                      config = ((_workspace2 = workspace) == null || (_workspace2 = _workspace2.snapshot) == null ? void 0 : _workspace2.config) || {};
                      savedConfig = (saved == null || (_saved$project = saved.project) == null ? void 0 : _saved$project.config) || {};
                      useSaved = (saved == null ? void 0 : saved.format) === "resources-project-output-v1" && JSON.stringify(savedConfig.containerOptions || {}) === JSON.stringify(config.containerOptions || {}) && JSON.stringify(savedConfig.environment || {}) === JSON.stringify(config.environment || {});
                      if (workspace) delete workspace.savedOutput;
                      _context3.n = 4;
                      return requestFrontendService("editor.mount", {
                        deferOutput: deferOutput && !useSaved,
                        workspace: workspace,
                        savedOutput: useSaved ? saved : null
                      });
                    case 4:
                      return _context3.a(2);
                  }
                }, _callee2);
              }));
              return _openProject.apply(this, arguments);
            };
            openProject = function _openProject2() {
              return _openProject.apply(this, arguments);
            };
            document.addEventListener("themechange", function (event) {
              return setProjectEditorTheme(event.detail.theme);
            });
            root3 = document.querySelector("[data-project-editor]");
            mountProjectPresentation(root3);
            deferOutput = hasProjectRecovery({
              projectId: __resourcesDatasetGet(root3, "data-project-id"),
              persistence: __resourcesDatasetGet(root3, "data-persistence"),
              readOnly: __resourcesDatasetGet(root3, "data-read-only") === "true",
              navigationType: navigationType()
            }, {
              getItem: function getItem(key) {
                return hasSessionValue(key) ? "" : null;
              }
            });
            openProject().catch(function (error) {
              var _document$querySelect;
              (_document$querySelect = document.querySelector("[data-project-editor]")) == null || _document$querySelect.setAttribute("data-editor-machine-state", "failed");
              globalThis.__wwcReportError((error == null ? void 0 : error.stack) || (error == null ? void 0 : error.message) || String(error));
            });
          }
          root2 = document.querySelector("[data-public-projects]");
          if (root2) {
            fetch("/api/public-projects", {
              headers: {
                accept: "application/json"
              },
              credentials: "same-origin"
            }).then(function (response) {
              if (!response.ok) throw new Error("Public projects response: " + response.status);
              return response.json();
            }).then(function (projects) {
              if (!Array.isArray(projects) || !projects.length) return;
              var grid = document.createElement("div");
              grid.className = "account-grid";
              for (var _iterator6 = _createForOfIteratorHelperLoose(projects), _step6; !(_step6 = _iterator6()).done;) {
                var project = _step6.value;
                if (!project || typeof project.namespace !== "string" || typeof project.slug !== "string") continue;
                var link = document.createElement("a");
                link.className = "account-card";
                __resourcesDatasetSet(link, "data-project-link", "");
                link.setAttribute("href", "/" + encodeURIComponent(project.namespace) + "/" + encodeURIComponent(project.slug));
                var title = document.createElement("h3");
                title.textContent = String(project.name || project.slug);
                var namespace = document.createElement("span");
                namespace.className = "account-card__namespace";
                namespace.textContent = project.namespace + "/" + project.slug;
                var description = document.createElement("p");
                description.textContent = String(project.description || String(project.template || "project").toUpperCase() + " project");
                link.append(title, namespace, description);
                grid.append(link);
              }
              if (grid.childElementCount) root2.replaceChildren(grid);
            }).catch(function () {});
          }
          if (!document.querySelector("[data-project-editor]")) mountContentNameFields();
        case 7:
          return _context5.a(2);
      }
    }, _callee3);
  }));
  function resourcesFrontend() {
    return _resourcesFrontend.apply(this, arguments);
  }
  return resourcesFrontend;
})()().catch(function (error) {
  var message = String(error);
  var stack = error && error.stack;
  __wwcReportError(stack && stack.indexOf(message) < 0 ? message + "\n" + stack : stack || message);
});