const storage = new Map();

const localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(String(key), String(value));
  },
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

class GuestNode {
  constructor() {
    this.parentNode = null;
    this.children = [];
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  insertBefore(newNode, refNode) {
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    const index = refNode ? this.children.indexOf(refNode) : -1;
    if (index === -1) this.children.push(newNode);
    else this.children.splice(index, 0, newNode);
    newNode.parentNode = this;
    return newNode;
  }
}

class GuestText extends GuestNode {
  constructor(text) {
    super();
    this.tagName = "#text";
    this.textContent = String(text);
  }
}

class GuestElement extends GuestNode {
  constructor(tagName) {
    super();
    this.tagName = String(tagName).toLowerCase();
    this.attributes = {};
    this._classList = new Set();
    this._listeners = {};
    this._textContent = "";
    this._value = "";
    this.checked = false;
  }

  get id() {
    return this.attributes.id || "";
  }

  set id(value) {
    if (value) this.attributes.id = String(value);
    else delete this.attributes.id;
  }

  get className() {
    return Array.from(this._classList).join(" ");
  }

  set className(value) {
    this._classList = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get textContent() {
    if (this.children.length) {
      return this.children.map((child) => child.textContent || "").join("");
    }
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get value() {
    return this._value || this.attributes.value || "";
  }

  set value(value) {
    this._value = String(value);
    if (this.tagName === "input") this.attributes.value = this._value;
  }

  get dataset() {
    const result = {};
    for (const [name, value] of Object.entries(this.attributes)) {
      if (!name.startsWith("data-")) continue;
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      result[key] = value;
    }
    return result;
  }

  get classList() {
    return {
      add: (...classes) => {
        for (const className of classes) if (className) this._classList.add(className);
      },
      remove: (...classes) => {
        for (const className of classes) this._classList.delete(className);
      },
      toggle: (className) => {
        if (this._classList.has(className)) {
          this._classList.delete(className);
          return false;
        }
        this._classList.add(className);
        return true;
      },
      contains: (className) => this._classList.has(className),
    };
  }

  set innerHTML(value) {
    this.children = [];
    const source = String(value);
    const strong = source.match(/^<strong>(.*?)<\/strong>(.*)$/);
    if (strong) {
      const node = new GuestElement("strong");
      node.textContent = strong[1];
      this.appendChild(node);
      if (strong[2]) this.appendChild(new GuestText(strong[2]));
      return;
    }
    this.appendChild(new GuestText(source));
  }

  setAttribute(name, value) {
    const key = String(name);
    const text = String(value);
    this.attributes[key] = text;
    if (key === "value") this._value = text;
    if (key === "checked") this.checked = true;
  }

  getAttribute(name) {
    return this.attributes[String(name)] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[String(name)];
  }

  addEventListener(event, handler) {
    const name = String(event);
    if (!this._listeners[name]) this._listeners[name] = [];
    this._listeners[name].push(handler);
  }

  removeEventListener(event, handler) {
    const name = String(event);
    if (!this._listeners[name]) return;
    this._listeners[name] = this._listeners[name].filter((entry) => entry !== handler);
  }
}

class GuestDocument {
  constructor() {
    this.body = this.createElement("body");
  }

  createElement(tagName) {
    return new GuestElement(tagName);
  }

  createTextNode(text) {
    return new GuestText(text);
  }

  getElementById(id) {
    return this.find((node) => node.id === id);
  }

  querySelector(selector) {
    if (!this.body) return null;
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      return this.find((node) => node.classList?.contains(className));
    }
    return this.find((node) => node.tagName === selector.toLowerCase());
  }

  find(predicate, node = this.body) {
    if (predicate(node)) return node;
    for (const child of node.children || []) {
      const found = this.find(predicate, child);
      if (found) return found;
    }
    return null;
  }
}

const doc = new GuestDocument();
let currentRoot = null;
let eventTargets = {};
let nextNodeId = 1;
let nextTodoId = 1;

let state = {
  todos: JSON.parse(localStorage.getItem("guest-todos") || "[]"),
  filter: "all",
  editingId: null,
};

function save() {
  localStorage.setItem("guest-todos", JSON.stringify(state.todos));
}

function setState(patch) {
  state = { ...state, ...patch };
  save();
}

function nextId() {
  return `todo-${nextTodoId++}`;
}

function addTodo(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return;
  setState({
    todos: [...state.todos, { id: nextId(), text: trimmed, completed: false }],
  });
}

function buildApp() {
  const filtered = state.todos.filter((todo) => (
    state.filter === "all" ? true : state.filter === "active" ? !todo.completed : todo.completed
  ));
  const activeCount = state.todos.filter((todo) => !todo.completed).length;

  const app = doc.createElement("div");
  app.className = "todoapp";

  const header = doc.createElement("header");
  header.className = "header";

  const h1 = doc.createElement("h1");
  h1.textContent = "todos";
  header.appendChild(h1);

  const inputWrap = doc.createElement("div");
  inputWrap.className = "input-wrap";

  const input = doc.createElement("input");
  input.className = "new-todo";
  input.setAttribute("placeholder", "What needs to be done?");
  input.setAttribute("type", "text");
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTodo(event.target.value);
  });
  inputWrap.appendChild(input);

  const addButton = doc.createElement("button");
  addButton.className = "add-btn";
  addButton.textContent = "Add";
  addButton.addEventListener("click", (event) => {
    addTodo(event.target.value);
  });
  inputWrap.appendChild(addButton);
  header.appendChild(inputWrap);
  app.appendChild(header);

  if (state.todos.length) {
    const list = doc.createElement("ul");
    list.className = "todo-list";
    list.id = "todo-list";

    filtered.forEach((todo) => {
      const item = doc.createElement("li");
      item.className = `todo-item${todo.completed ? " completed" : ""}${state.editingId === todo.id ? " editing" : ""}`;
      item.setAttribute("data-id", todo.id);

      const toggle = doc.createElement("input");
      toggle.className = "toggle";
      toggle.setAttribute("type", "checkbox");
      if (todo.completed) toggle.setAttribute("checked", "checked");
      toggle.addEventListener("change", () => {
        setState({
          todos: state.todos.map((entry) => (
            entry.id === todo.id ? { ...entry, completed: !entry.completed } : entry
          )),
        });
      });
      item.appendChild(toggle);

      const label = doc.createElement("label");
      label.textContent = todo.text;
      label.addEventListener("dblclick", () => setState({ editingId: todo.id }));
      item.appendChild(label);

      const edit = doc.createElement("input");
      edit.className = "edit";
      edit.setAttribute("type", "text");
      edit.setAttribute("value", todo.text);
      edit.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          const text = event.target.value.trim();
          if (text) {
            setState({
              todos: state.todos.map((entry) => (entry.id === todo.id ? { ...entry, text } : entry)),
              editingId: null,
            });
          }
        } else if (event.key === "Escape") {
          setState({ editingId: null });
        }
      });
      edit.addEventListener("blur", (event) => {
        const text = event.target.value.trim();
        if (text) {
          setState({
            todos: state.todos.map((entry) => (entry.id === todo.id ? { ...entry, text } : entry)),
            editingId: null,
          });
        }
      });
      item.appendChild(edit);

      const destroy = doc.createElement("button");
      destroy.className = "destroy";
      destroy.textContent = "x";
      destroy.addEventListener("click", () => {
        setState({ todos: state.todos.filter((entry) => entry.id !== todo.id) });
      });
      item.appendChild(destroy);

      list.appendChild(item);
    });

    app.appendChild(list);

    const footer = doc.createElement("footer");
    footer.className = "footer";

    const count = doc.createElement("span");
    count.className = "todo-count";
    count.innerHTML = `<strong>${activeCount}</strong> item${activeCount === 1 ? "" : "s"} left`;
    footer.appendChild(count);

    const filters = doc.createElement("ul");
    filters.className = "filters";
    for (const filter of [
      { label: "All", value: "all" },
      { label: "Active", value: "active" },
      { label: "Completed", value: "completed" },
    ]) {
      const li = doc.createElement("li");
      const anchor = doc.createElement("a");
      anchor.textContent = filter.label;
      if (state.filter === filter.value) anchor.className = "selected";
      anchor.addEventListener("click", () => setState({ filter: filter.value }));
      li.appendChild(anchor);
      filters.appendChild(li);
    }
    footer.appendChild(filters);

    const clearButton = doc.createElement("button");
    clearButton.className = state.todos.some((todo) => todo.completed)
      ? "clear-completed"
      : "clear-completed hidden";
    clearButton.textContent = "Clear completed";
    clearButton.addEventListener("click", () => {
      setState({ todos: state.todos.filter((todo) => !todo.completed) });
    });
    footer.appendChild(clearButton);
    app.appendChild(footer);
  }

  return app;
}

function serialize(node) {
  if (node.tagName === "#text") return escapeHtml(node.textContent);

  let nodeId = "";
  if (Object.keys(node._listeners || {}).length) {
    nodeId = String(nextNodeId++);
    eventTargets[nodeId] = node;
  }

  const attrs = { ...node.attributes };
  if (node.className) attrs.class = node.className;
  if (nodeId) attrs["data-node-id"] = nodeId;
  if (node.tagName === "input" && node.value) attrs.value = node.value;
  if (node.tagName === "input" && node.checked) attrs.checked = "checked";

  const attrText = Object.entries(attrs)
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([name, value]) => value === true || value === ""
      ? ` ${name}`
      : ` ${name}="${escapeAttr(value)}"`)
    .join("");

  if (node.tagName === "input") return `<input${attrText}>`;

  const children = node.children.length
    ? node.children.map(serialize).join("")
    : escapeHtml(node._textContent || "");
  return `<${node.tagName}${attrText}>${children}</${node.tagName}>`;
}

function render() {
  nextNodeId = 1;
  eventTargets = {};
  currentRoot = buildApp();
  doc.body.replaceChildren?.(currentRoot);
  doc.body.children = [currentRoot];
  return serialize(currentRoot);
}

function makeEvent(target, payload) {
  target.value = payload.value || "";
  target.checked = Boolean(payload.checked);
  return {
    target,
    key: payload.key || "",
    preventDefault() {},
    stopPropagation() {},
    dataTransfer: {
      getData() { return ""; },
      setData() {},
      effectAllowed: "move",
    },
  };
}

globalThis.__macchiatoRender = () => render();

globalThis.__macchiatoDispatch = (json) => {
  const event = JSON.parse(json);
  const target = eventTargets[String(event.nodeId)];
  if (!target) return render();

  const handlers = target._listeners[event.type] || [];
  const guestEvent = makeEvent(target, event.payload || {});
  for (const handler of handlers) handler(guestEvent);
  return render();
};
