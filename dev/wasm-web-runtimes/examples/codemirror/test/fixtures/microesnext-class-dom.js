var View = class {
  get state() {
    return this.viewState.state;
  }

  constructor(config = {}) {
    this.plugins = [];
    this.editorAttrs = {};
    this.dom = document.createElement("div");
    if (config.parent) config.parent.appendChild(this.dom);
  }
};

var view = new View({ parent: document.getElementById("editor") });
globalThis.__wwcResult = function () { return view.dom.className; };
