function _regeneratorValues(e) { if (null != e) { var t = e["function" == typeof Symbol && Symbol.iterator || "@@iterator"], r = 0; if (t) return t.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) return { next: function next() { return e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }; } }; } throw new TypeError(typeof e + " is not iterable"); }
function _regenerator() { var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (_t) { i = e, c = 1, u = _t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (_e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _createForOfIteratorHelperLoose(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (t) return (t = t.call(r)).next.bind(t); if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var o = 0; return function () { return o >= r.length ? { done: !0 } : { done: !1, value: r[o++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (_n) { return void e(_n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
(function () {
  var _resourcesFrontend = _asyncToGenerator(_regenerator().m(function _callee2() {
    var isMac, shortcut, _iterator, _step, label, paletteFor, openPalette, closePalette, _loop, _iterator3, _step3, root, choices, storageKey, media, storedTheme, resolved, apply, syncSystemTheme, menuSelector, closeMenus, pending, nextRequest, editorListeners, outputListeners, requestFrontendService, FrontendHeaders, FrontendResponse, root2;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
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
              } catch (_unused6) {}
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
            } catch (_unused5) {
              return null;
            }
          };
          closePalette = function _closePalette(dialog) {
            if (dialog != null && dialog.open) dialog.close();
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
              search.href = query ? "/browse?q=" + encodeURIComponent(query) : "/browse";
            }
          });
          document.addEventListener("keydown", function (event) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
              event.preventDefault();
              openPalette(document.querySelector("[data-command-open]"));
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
          _loop = _regenerator().m(function _loop() {
            var dialog;
            return _regenerator().w(function (_context2) {
              while (1) switch (_context2.n) {
                case 0:
                  dialog = _step3.value;
                  dialog.addEventListener("click", function (event) {
                    if (event.target === dialog) closePalette(dialog);
                  });
                case 1:
                  return _context2.a(2);
              }
            }, _loop);
          });
          _iterator3 = _createForOfIteratorHelperLoose(document.querySelectorAll("[data-command-dialog]"));
        case 1:
          if ((_step3 = _iterator3()).done) {
            _context3.n = 3;
            break;
          }
          return _context3.d(_regeneratorValues(_loop()), 2);
        case 2:
          _context3.n = 1;
          break;
        case 3:
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
                var name = _ref[0],
                  value = _ref[1];
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
              return _regenerator().w(function (_context) {
                while (1) switch (_context.n) {
                  case 0:
                    if (init === void 0) {
                      init = {};
                    }
                    _context.n = 1;
                    return requestFrontendService("fetch", {
                      url: String(input),
                      method: String(init.method || "GET").toUpperCase(),
                      headers: init.headers || {},
                      body: init.body == null ? null : String(init.body)
                    });
                  case 1:
                    response = _context.v;
                    return _context.a(2, new FrontendResponse(response));
                }
              }, _callee);
            }));
            function frontendFetch(_x, _x2) {
              return _frontendFetch.apply(this, arguments);
            }
            return frontendFetch;
          }();
          if (document.querySelector("[data-project-editor]")) {
            requestFrontendService("editor.mount").catch(function (error) {
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
                link.href = "/" + encodeURIComponent(project.namespace) + "/" + encodeURIComponent(project.slug);
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
        case 4:
          return _context3.a(2);
      }
    }, _callee2);
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