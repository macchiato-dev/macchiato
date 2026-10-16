// Local-profile browser script. seed.js clientScript() serves it inline after
// declaring resourcesDomSchema, resourcesCssSchema, userbarSandboxSource,
// userMenuBehavior, authConfig, createSafeTriangle and pointInSafeTriangle.
(() => {
  const root = document.documentElement;
  const routeCache = new Map();
  let userbarSandboxPromise = null;
  let transitionDomUsePromise = null;
  let userbarHoverGuard = null;

  function attributesFor(node) {
    return Object.fromEntries(Array.from(node.attributes || [], (attr) => [attr.name, attr.value]));
  }

  async function transitionDomUse() {
    if (!transitionDomUsePromise) {
      transitionDomUsePromise = Promise.all([
        import("@macchiato-dev/dom-use"),
        import("@macchiato-dev/style-use"),
      ]).then(([domUseModule, styleUseModule]) => (
        new domUseModule.DomUse(resourcesDomSchema, new styleUseModule.StyleUse(resourcesCssSchema))
      ));
    }
    return transitionDomUsePromise;
  }

  async function sanitizeRegionInner(node) {
    const domUse = await transitionDomUse();
    return domUse.sanitizeHTML(node.innerHTML, {
      container: {
        tagName: node.tagName.toLowerCase(),
        attributes: attributesFor(node),
      },
    });
  }

  async function setSanitizedInnerHTML(target, source) {
    target.innerHTML = await sanitizeRegionInner(source);
  }

  async function sanitizedOuterHTML(node) {
    const domUse = await transitionDomUse();
    return domUse.sanitizeHTML(node.innerHTML, {
      container: {
        tagName: node.tagName.toLowerCase(),
        attributes: attributesFor(node),
      },
      includeContainer: true,
    });
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    const dark = theme === "dark";
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      const thumb = button.querySelector(".tb-thumb");
      button.setAttribute("aria-checked", dark ? "true" : "false");
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      if (thumb) thumb.style.transform = dark ? "translateX(38px)" : "translateX(0)";
    });
  }

  function applyAuthState(state) {
    const authenticated = state === "in";
    if (authenticated) delete document.body.dataset.auth;
    else document.body.dataset.auth = "out";
    try { localStorage.setItem(authConfig.storageKey, authenticated ? "in" : "out"); } catch {}
  }

  function initialAuthState() {
    try { return localStorage.getItem(authConfig.storageKey) || authConfig.defaultState; } catch { return authConfig.defaultState; }
  }

  function setMenuOpen(open) {
    const menu = document.querySelector(".menu");
    const button = menu && menu.querySelector(".menu-button");
    if (!menu || !button) return;
    menu.dataset.open = open ? "true" : "false";
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function applyUserbarState(state) {
    const userbar = document.querySelector(".userbar");
    if (!userbar || !state) return;
    userbar.dataset.userbarPinned = state.pinned ? "true" : "false";
    if (state.hoverPaused) userbar.dataset.userbarHoverPaused = "true";
    else delete userbar.dataset.userbarHoverPaused;
    userbar.querySelectorAll(".ub-pop").forEach((pop, index) => {
      const open = Boolean(state.open && state.open[index]);
      pop.dataset.open = open ? "true" : "false";
      const button = pop.querySelector("button[aria-expanded]");
      if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
      if (state.blurIndex === index && button) button.blur();
    });
  }

  function applyUserbarResult(result) {
    if (!result) return {};
    if (result.state) {
      applyUserbarState(result.state);
      return result;
    }
    applyUserbarState(result);
    return { state: result };
  }

  async function userbarSandbox() {
    if (!userbarSandboxPromise) {
      userbarSandboxPromise = import("@macchiato-dev/quickjs-emscripten-sandbox").then(({ getOrCreateRoleSandbox }) => getOrCreateRoleSandbox("resources-frontend", {
        wasmMachine: "dedicated",
        memoryLimitBytes: 16 * 1024 * 1024,
        maxStackBytes: 512 * 1024,
      })).then((sandbox) => {
        sandbox.evalGlobal(userbarSandboxSource, "resources-userbar-state.js");
        document.documentElement.dataset.resourcesFrontendMachine = "quickjs";
        document.documentElement.dataset.resourcesFrontendMachineId = sandbox.inspectMachine().machineId;
        return sandbox;
      }).catch((error) => {
        console.warn("Userbar sandbox unavailable", error);
        return null;
      });
    }
    return userbarSandboxPromise;
  }

  async function dispatchUserbarEvent(event) {
    const sandbox = await userbarSandbox();
    if (!sandbox) return;
    return applyUserbarResult(sandbox.callJsonFunction("__resourcesUserbarEvent", event));
  }

  function beginUserbarHoverGuard(event, pop) {
    const behavior = userMenuBehavior.hover;
    if (!behavior.enabled || !behavior.safePolygon || pop.dataset.open !== "true") return;
    const panel = pop.querySelector(".popover");
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const triangle = createSafeTriangle({ x: event.clientX, y: event.clientY }, rect, behavior);
    if (!triangle) return;
    userbarHoverGuard = {
      pop,
      triangle,
      expires: performance.now() + behavior.timeoutMs,
    };
  }

  function installUserbarHoverIntent() {
    const behavior = userMenuBehavior.hover;
    const userbar = document.querySelector(".userbar");
    if (!behavior.enabled || !userbar || userbar.dataset.userbarControlled === "true") return;
    userbar.dataset.userbarControlled = "true";
    const pops = Array.from(userbar.querySelectorAll(".ub-pop"));
    pops.forEach((pop, index) => {
      const button = pop.querySelector(":scope > button");
      button?.addEventListener("pointerenter", (event) => {
        if (userbarHoverGuard && pointInSafeTriangle({ x: event.clientX, y: event.clientY }, userbarHoverGuard.triangle)) return;
        userbarHoverGuard = null;
        dispatchUserbarEvent({ type: "hover", index });
      });
      button?.addEventListener("pointerleave", (event) => beginUserbarHoverGuard(event, pop));
    });
    document.addEventListener("pointermove", (event) => {
      if (!userbarHoverGuard) return;
      if (userbarHoverGuard.pop.querySelector(".popover")?.contains(event.target)) {
        userbarHoverGuard = null;
        return;
      }
      const point = { x: event.clientX, y: event.clientY };
      if (performance.now() <= userbarHoverGuard.expires && pointInSafeTriangle(point, userbarHoverGuard.triangle)) return;
      userbarHoverGuard = null;
      const button = event.target.closest(".userbar .ub-pop > button");
      if (button) dispatchUserbarEvent({ type: "hover", index: pops.indexOf(button.closest(".ub-pop")) });
    });
  }

  function userbarEventPayload(event) {
    const userbar = document.querySelector(".userbar");
    const button = event.target.closest(".userbar .ub-pop > button");
    let target = { insideUserbar: Boolean(event.target.closest(".userbar")) };
    if (button && userbar) {
      const pop = button.closest(".ub-pop");
      target = {
        ...target,
        kind: "userbar-button",
        index: Array.from(userbar.querySelectorAll(".ub-pop")).indexOf(pop),
      };
    }
    return { type: event.type, target };
  }

  function addUserbarBinding(binding) {
    if (binding?.target === "document" && binding.type === "click") {
      document.addEventListener("click", (event) => {
        const payload = userbarEventPayload(event);
        if (payload.target.kind === "userbar-button") {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        dispatchUserbarEvent(payload);
      });
    }
    if (binding?.target === ".userbar" && binding.type === "pointerleave") {
      document.querySelector(".userbar")?.addEventListener("pointerleave", (event) => {
        dispatchUserbarEvent({ type: event.type, target: { insideUserbar: false } });
      });
    }
  }

  async function installUserbarApp() {
    const sandbox = await userbarSandbox();
    if (!sandbox) return;
    const bindings = sandbox.callJsonFunction("__resourcesUserbarBindings", {});
    bindings.forEach(addUserbarBinding);
  }

  function prepareUserbarMenus() {
    const userbar = document.querySelector(".userbar");
    if (!userbar || userbar.dataset.userbarReady === "true") return;
    userbar.dataset.userbarReady = "true";
    installUserbarHoverIntent();
    installUserbarApp();
  }

  function syncActiveNav(nextDoc) {
    const active = nextDoc.querySelector("[data-section][aria-current='page']");
    const activeKey = active && active.getAttribute("data-section");
    document.querySelectorAll("[data-section]").forEach((link) => {
      if (activeKey && link.getAttribute("data-section") === activeKey) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function sameSiteRoute(link) {
    if (!link || !link.href) return null;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.hash || link.target) return null;
    return url;
  }

  async function fetchRoute(url) {
    const key = url.pathname;
    if (!routeCache.has(key)) {
      routeCache.set(key, fetch(key, { headers: { Accept: "text/html" } })
        .then(async (response) => {
          if (!response.ok) throw new Error("Route fetch failed");
          const html = await response.text();
          const inertHtml = html
            .replace(new RegExp("<head\\b[\\s\\S]*?</head>", "i"), "<head></head>")
            .replace(new RegExp("<script\\b[\\s\\S]*?</scr" + "ipt>", "gi"), "");
          return new DOMParser().parseFromString(inertHtml, "text/html");
        })
        .catch((error) => {
          routeCache.delete(key);
          throw error;
        }));
    }
    return routeCache.get(key);
  }

  function prefetchRoute(link) {
    const url = sameSiteRoute(link);
    if (!url || url.pathname === location.pathname) return;
    if (link.dataset.prefetch === "ready" || link.dataset.prefetch === "pending") return;
    link.dataset.prefetch = "pending";
    fetchRoute(url)
      .then(() => { link.dataset.prefetch = "ready"; })
      .catch(() => { delete link.dataset.prefetch; });
  }

  function showSkeleton() {
    const content = document.getElementById("content");
    if (!content) return;
    content.dataset.loading = "true";
    content.setAttribute("aria-busy", "true");
    content.replaceChildren(...[0, 1].map(() => {
      const block = document.createElement("section");
      block.className = "box skeleton-block";
      block.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 4; i += 1) {
        const line = document.createElement("span");
        line.className = "skeleton-line";
        block.appendChild(line);
      }
      return block;
    }));
  }

  function clearSkeleton() {
    const content = document.getElementById("content");
    if (!content) return;
    delete content.dataset.loading;
    content.removeAttribute("aria-busy");
  }

  function preparePrefetching(rootNode = document) {
    if (window.__resourcesDisablePrefetch) return;
    const links = Array.from(rootNode.querySelectorAll("a[href]"))
      .filter((link) => sameSiteRoute(link) && !link.hasAttribute("data-project-link"));
    links.forEach((link) => {
      link.addEventListener("pointerenter", () => prefetchRoute(link), { once: true });
      link.addEventListener("focus", () => prefetchRoute(link), { once: true });
      link.addEventListener("touchstart", () => prefetchRoute(link), { once: true, passive: true });
    });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          prefetchRoute(entry.target);
        }
      }, { rootMargin: "160px" });
      links.forEach((link) => observer.observe(link));
    }
  }

  function prepareLocalExamples(rootNode = document) {
    rootNode.querySelectorAll("iframe[data-example-path]").forEach((frame) => {
      const path = frame.dataset.examplePath;
      if (!new RegExp("^/-/blog-examples/[A-Za-z0-9._~?&=/%+-]+$").test(path)) return;
      const port = location.port ? ":" + location.port : "";
      frame.src = location.protocol + "//blog-examples.localhost" + port + path;
      delete frame.dataset.examplePath;
    });
  }

  applyTheme(root.getAttribute("data-theme") || "dark");
  applyAuthState(initialAuthState());
  prepareUserbarMenus();
  preparePrefetching();
  prepareLocalExamples();
  document.addEventListener("click", (event) => {
    const provider = event.target.closest(".auth-provider");
    if (provider) {
      event.preventDefault();
      applyAuthState("in");
      navigate(new URL("/", location.href), "push");
      return;
    }
    if (event.target.closest(".auth-signout")) {
      event.preventDefault();
      applyAuthState("out");
      dispatchUserbarEvent({ type: "close" });
      navigate(new URL("/", location.href), "push");
      return;
    }
    const menuButton = event.target.closest(".menu-button");
    if (menuButton) {
      const menu = menuButton.closest(".menu");
      setMenuOpen(menu.dataset.open !== "true");
      return;
    }
    if (!event.target.closest(".menu")) setMenuOpen(false);

    const themeButton = event.target.closest(".theme-toggle");
    if (themeButton) {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
      return;
    }
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const next = new URL(link.href, location.href);
    if (next.origin !== location.origin || next.hash || link.target) return;
    // Project pages have their own controller and disposable editor/output
    // machines. A normal navigation lets the server-rendered project shell
    // paint before those pane-local machines finish starting.
    if (link.hasAttribute("data-project-link")) return;
    event.preventDefault();
    setMenuOpen(false);
    navigate(next, "push");
  });

  addEventListener("popstate", () => navigate(new URL(location.href), "replace"));

  async function navigate(url, historyMode) {
    const cached = routeCache.has(url.pathname);
    if (!cached) showSkeleton();
    let nextDoc;
    try {
      nextDoc = await fetchRoute(url);
    } catch {
      location.href = url.href;
      return;
    }
    const nextContent = nextDoc.getElementById("content");
    const currentContent = document.getElementById("content");
    const currentCrumb = document.getElementById("crumb");
    const nextCrumb = nextDoc.getElementById("crumb");
    const currentBrand = document.querySelector("[data-screen-label='brand']");
    const nextBrand = nextDoc.querySelector("[data-screen-label='brand']");
    const currentLayout = document.querySelector("main.layout");
    const nextLayout = nextDoc.querySelector("main.layout");
    if (!nextContent || !currentContent) {
      location.href = url.href;
      return;
    }
    document.title = nextDoc.title;
    if (currentLayout && nextLayout) {
      const view = nextLayout.dataset.view === "focused" ? "focused" : "standard";
      currentLayout.dataset.view = view;
      currentLayout.classList.toggle("focused-view", view === "focused");
    }
    if (currentBrand && nextBrand) currentBrand.outerHTML = await sanitizedOuterHTML(nextBrand);
    if (currentCrumb && nextCrumb) currentCrumb.outerHTML = await sanitizedOuterHTML(nextCrumb);
    else if (currentCrumb) currentCrumb.remove();
    else if (nextCrumb) document.getElementById("main").insertAdjacentHTML("afterbegin", await sanitizedOuterHTML(nextCrumb));
    clearSkeleton();
    await setSanitizedInnerHTML(currentContent, nextContent);
    syncActiveNav(nextDoc);
    applyTheme(root.getAttribute("data-theme") || "dark");
    preparePrefetching(currentContent);
    prepareLocalExamples(currentContent);
    if (historyMode === "push") history.pushState(null, "", url.pathname);
    scrollTo({ top: 0, behavior: "auto" });
  }
})();
