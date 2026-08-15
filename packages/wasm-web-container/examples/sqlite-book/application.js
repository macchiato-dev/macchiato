(function () {
  var book = document.getElementById("book");

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function internalLink(label, path) {
    var link = element("a", "", label);
    link.setAttribute("href", "#" + path);
    return link;
  }

  function closeModal(modal) {
    modal.remove();
  }

  function showExternal(url) {
    var modal = element("div", "modal");
    var panel = element("section", "modal-panel");
    var field = document.createElement("textarea");
    var close = element("button", "modal-close", "×");
    field.setAttribute("aria-label", "External URL");
    field.value = url;
    field.addEventListener("beforeinput", function (event) { event.preventDefault(); });
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", function () { closeModal(modal); });
    panel.append(field, close);
    modal.append(panel);
    document.body.append(modal);
  }

  function sourceButton(page) {
    var row = element("div", "source-row");
    var button = element("button", "external-link", "View the original on sqlite.org");
    button.setAttribute("data-href", page.source);
    button.addEventListener("click", function () { showExternal(page.source); });
    row.append(button);
    return row;
  }

  function findPage(name) {
    for (var index = 0; index < BOOK_PAGES.length; index++) {
      if (BOOK_PAGES[index].name === name) return BOOK_PAGES[index];
    }
    return null;
  }

  function renderHome() {
    var title = element("h1", "", "SQLite: selected technical documentation");
    var intro = element("p", "prose",
      "A compact, offline reading edition packaged inside one WebAssembly module.");
    var list = element("section", "page-list");
    for (var index = 0; index < BOOK_PAGES.length; index++) {
      list.append(internalLink(BOOK_PAGES[index].title, "/" + BOOK_PAGES[index].name));
    }
    book.replaceChildren(title, intro, list);
  }

  function renderPage(page, section) {
    var title = element("h1", "", page.title);
    var home = internalLink("All chapters", "/");
    var contents = element("section", "page-list");
    var nodes = [home, title];
    for (var index = 0; index < page.sections.length; index++) {
      var entry = page.sections[index];
      contents.append(internalLink(entry.title,
        "/" + page.name + "#" + entry.id));
    }
    nodes.push(contents);
    for (var sectionIndex = 0; sectionIndex < page.sections.length; sectionIndex++) {
      var item = page.sections[sectionIndex];
      var heading = element("p", "section-title", item.title);
      heading.setAttribute("id", item.id);
      nodes.push(heading);
      for (var paragraph = 0; paragraph < item.paragraphs.length; paragraph++) {
        nodes.push(element("p", "prose", item.paragraphs[paragraph]));
      }
    }
    nodes.push(sourceButton(page));
    book.replaceChildren.apply(book, nodes);
    if (section) {
      var target = document.getElementById(section);
      if (target) target.scrollIntoView();
    }
  }

  function render() {
    var route = location.pathname;
    if (route === "/") return renderHome();
    var parts = route.slice(1).split("#");
    var page = findPage(parts[0]);
    if (!page) return renderHome();
    renderPage(page, parts[1] || "");
  }

  addEventListener("hashchange", render);
  render();
})();
