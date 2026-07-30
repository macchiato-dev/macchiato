import {
  BUILTIN_COLLECTION,
  STORAGE_TYPES,
  createCollection,
  createDocument,
  parseStoredCollections,
} from "./model.js";

const KEY = "macchiato.focused-app.collections.v1";
const UI_KEY = "macchiato.focused-app.sidebar.v1";
const memoryCollections = [createCollection({ id: "memory", name: "Memory", storage: "memory" })];
const adapters = {
  memory: {
    load: () => memoryCollections,
    save: (collections) => memoryCollections.splice(0, memoryCollections.length, ...collections),
  },
  session: {
    load: () => parseStoredCollections(sessionStorage.getItem(KEY), "session"),
    save: (collections) => sessionStorage.setItem(KEY, JSON.stringify(collections)),
  },
  local: {
    load: () => parseStoredCollections(localStorage.getItem(KEY), "local"),
    save: (collections) => localStorage.setItem(KEY, JSON.stringify(collections)),
  },
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  app: $(".app"),
  sidebar: $(".sidebar"),
  collectionTrigger: $("#collection-trigger"),
  collectionMenu: $("#collection-menu"),
  collectionOptions: $("#collection-options"),
  documents: $("#documents"),
  search: $("#search"),
  title: $("#document-title"),
  summary: $("#document-summary"),
  editor: $("#editor"),
  sandbox: $("#sandbox"),
  empty: $("#empty"),
  workspace: $("#workspace"),
  status: $("#status"),
  importDialog: $("#import-dialog"),
  importCollection: $("#import-collection"),
};
let collections = [];
let activeCollectionId = "session";
let activeDocumentId;
let dirtyEphemeral = false;
let filterMode = "all";

function writableCollections() {
  return collections.filter((collection) => collection.storage !== "library");
}

function ensureDefaults() {
  const session = adapters.session.load();
  if (!session.length) {
    session.push(createCollection({ id: "session", name: "Session Storage", storage: "session" }));
    adapters.session.save(session);
  }
  const local = adapters.local.load();
  if (!local.length) {
    local.push(createCollection({ id: "local", name: "Local Storage", storage: "local" }));
    adapters.local.save(local);
  }
  collections = [...session, ...local, ...memoryCollections, BUILTIN_COLLECTION];
}

function saveCollection(collection) {
  if (collection.storage === "library") return;
  const related = collections.filter((candidate) => candidate.storage === collection.storage);
  adapters[collection.storage].save(related);
  if (collection.storage !== "local") dirtyEphemeral = true;
}

function storageLabel(collection) {
  return STORAGE_TYPES[collection.storage];
}

function renderCollectionOptions() {
  const collection = currentCollection();
  elements.collectionTrigger.replaceChildren(...collectionOptionContents(collection));
  elements.collectionOptions.replaceChildren(...collections.map((candidate) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "collection-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(candidate.id === activeCollectionId));
    option.dataset.collection = candidate.id;
    option.append(...collectionOptionContents(candidate));
    option.addEventListener("click", () => {
      closeCollectionMenu();
      selectCollection(candidate.id);
    });
    return option;
  }));
  elements.importCollection.replaceChildren(...writableCollections().map((candidate) => {
    const option = document.createElement("option");
    const candidateType = storageLabel(candidate);
    option.value = candidate.id;
    option.textContent = `${candidateType.icon} ${candidate.name}`;
    return option;
  }));
}

function collectionOptionContents(collection) {
  const type = storageLabel(collection);
  const icon = document.createElement("span");
  icon.className = `storage-icon storage-icon--${collection.storage}`;
  icon.dataset.tooltip = type.label;
  icon.setAttribute("aria-label", type.label);
  icon.textContent = type.icon.slice(1, 2);
  const copy = document.createElement("span");
  copy.className = "collection-copy";
  const name = document.createElement("strong");
  name.textContent = collection.name;
  const detail = document.createElement("small");
  detail.textContent = `${type.label} · ${collection.documents.length} app${collection.documents.length === 1 ? "" : "s"}`;
  copy.append(name, detail);
  return [icon, copy];
}

function closeCollectionMenu() {
  elements.collectionMenu.hidden = true;
  elements.collectionTrigger.setAttribute("aria-expanded", "false");
}

function toggleCollectionMenu() {
  const open = elements.collectionMenu.hidden;
  elements.collectionMenu.hidden = !open;
  elements.collectionTrigger.setAttribute("aria-expanded", String(open));
}

function currentCollection() {
  return collections.find((collection) => collection.id === activeCollectionId) || collections[0];
}

function filteredDocuments() {
  const query = elements.search.value.trim().toLowerCase();
  return currentCollection().documents.filter((document) =>
    (!query || `${document.title} ${document.summary} ${document.body}`.toLowerCase().includes(query))
    && (filterMode === "all" || (filterMode === "sandboxed" && document.sandbox.runtime !== "document")));
}

function showDocument(document) {
  activeDocumentId = document?.id;
  elements.workspace.hidden = !document;
  elements.empty.hidden = Boolean(document);
  if (!document) return;
  elements.title.textContent = document.title;
  elements.summary.textContent = document.summary;
  elements.editor.value = document.body;
  elements.editor.readOnly = currentCollection().storage === "library";
  elements.sandbox.textContent = JSON.stringify(document.sandbox, null, 2);
}

function renderDocuments() {
  const documents = filteredDocuments();
  elements.documents.replaceChildren(...documents.map((entry) => {
    const item = document.createElement("li");
    item.className = "document-item";
    item.dataset.active = String(entry.id === activeDocumentId);
    const button = document.createElement("button");
    button.className = "document-open";
    button.type = "button";
    const title = document.createElement("strong");
    title.textContent = entry.title;
    const summary = document.createElement("span");
    summary.textContent = entry.summary;
    const time = document.createElement("time");
    time.dateTime = new Date(entry.updatedAt).toISOString();
    time.textContent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(entry.updatedAt);
    button.append(title, summary, time);
    button.addEventListener("click", () => {
      showDocument(entry);
      renderDocuments();
    });
    const menu = document.createElement("button");
    menu.type = "button";
    menu.className = "document-menu";
    menu.setAttribute("aria-label", `Actions for ${entry.title}`);
    menu.textContent = "•••";
    menu.addEventListener("click", () => {
      const popover = $("#document-actions");
      const box = menu.getBoundingClientRect();
      popover.style.left = `${Math.max(8, box.right - 120)}px`;
      popover.style.top = `${box.bottom + 4}px`;
      popover.hidden = false;
    });
    item.append(button, menu);
    return item;
  }));
  const active = documents.find((document) => document.id === activeDocumentId) || documents[0];
  showDocument(active);
}

function selectCollection(id) {
  activeCollectionId = id;
  activeDocumentId = undefined;
  renderCollectionOptions();
  renderDocuments();
  elements.status.textContent = `${currentCollection().name} uses ${storageLabel(currentCollection()).label}.`;
}

function addDocument(document, collectionId = activeCollectionId) {
  const collection = collections.find((candidate) => candidate.id === collectionId);
  if (!collection || collection.storage === "library") throw new Error("Choose a writable collection.");
  collection.documents.unshift(document);
  saveCollection(collection);
  activeCollectionId = collection.id;
  activeDocumentId = document.id;
  renderCollectionOptions();
  renderDocuments();
}

function suggestedCollection(file) {
  return file.size > 1_000_000 ? collections.find((collection) => collection.storage === "memory") : currentCollection();
}

async function importFile(file) {
  const collection = suggestedCollection(file);
  elements.importDialog.querySelector("[name=name]").value = file.name;
  elements.importDialog.querySelector("[name=content]").value = await file.text();
  elements.importCollection.value = collection.storage === "library" ? "session" : collection.id;
  elements.importDialog.showModal();
}

function setSidebarHidden(hidden) {
  elements.app.dataset.sidebar = hidden ? "hidden" : "visible";
  if (hidden) closeCollectionMenu();
  $("#toggle-sidebar").setAttribute("aria-label", hidden ? "Show sidebar" : "Hide sidebar");
  $("#toggle-sidebar").setAttribute("title", hidden ? "Show sidebar" : "Hide sidebar");
  $("#sidebar-menu-visibility").textContent = hidden ? "Show" : "Hide";
  persistSidebar();
}

function setControlSide(side) {
  const normalized = side === "right" ? "right" : "left";
  $("#sidebar-control").dataset.side = normalized;
  $("#sidebar-menu-side").textContent = normalized === "right" ? "Move to Left" : "Move to Right";
  persistSidebar();
}

function persistSidebar() {
  localStorage.setItem(UI_KEY, JSON.stringify({
    hidden: elements.app.dataset.sidebar === "hidden",
    side: $("#sidebar-control").dataset.side,
    top: elements.app.style.getPropertyValue("--control-y") || "18px",
  }));
}

function restoreSidebar() {
  try {
    const state = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
    if (typeof state.top === "string" && /^\d+(?:\.\d+)?px$/.test(state.top)) {
      elements.app.style.setProperty("--control-y", state.top);
    }
    setControlSide(state.side);
    setSidebarHidden(Boolean(state.hidden));
  } catch {
    setControlSide("left");
    setSidebarHidden(false);
  }
}

$("#toggle-sidebar").addEventListener("click", () =>
  setSidebarHidden(elements.app.dataset.sidebar !== "hidden"));
elements.collectionTrigger.addEventListener("click", toggleCollectionMenu);
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".collection-picker")) closeCollectionMenu();
});
elements.search.addEventListener("input", renderDocuments);
$("#filter").addEventListener("click", () => {
  filterMode = filterMode === "all" ? "sandboxed" : "all";
  $("#filter").setAttribute("aria-label", `Filter documents: ${filterMode}`);
  $("#filter").dataset.active = String(filterMode !== "all");
  renderDocuments();
  elements.status.textContent = filterMode === "all" ? "Showing all documents." : "Showing sandboxed apps.";
});
$("#new-document").addEventListener("click", () => {
  const collection = currentCollection().storage === "library"
    ? collections.find((candidate) => candidate.id === "session")
    : currentCollection();
  addDocument(createDocument({ name: "Untitled app", text: "# Start here\n" }), collection.id);
  elements.editor.focus();
});
$("#new-collection").addEventListener("click", () => $("#collection-dialog").showModal());
$("#collection-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const collection = createCollection({ name: data.get("name"), storage: data.get("storage") });
  collections.push(collection);
  saveCollection(collection);
  event.currentTarget.closest("dialog").close();
  event.currentTarget.reset();
  selectCollection(collection.id);
});
elements.editor.addEventListener("input", () => {
  const collection = currentCollection();
  const document = collection.documents.find((candidate) => candidate.id === activeDocumentId);
  if (!document || collection.storage === "library") return;
  document.body = elements.editor.value;
  document.summary = document.body.trim().split(/\n+/)[0]?.slice(0, 140) || "Empty document";
  document.updatedAt = Date.now();
  saveCollection(collection);
  elements.summary.textContent = document.summary;
  elements.status.textContent = `Saved to ${storageLabel(collection).label}.`;
});
$("#file").addEventListener("change", (event) => event.target.files[0] && importFile(event.target.files[0]));
elements.importDialog.querySelector("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  addDocument(createDocument({ name: data.get("name"), text: data.get("content") }), data.get("collection"));
  elements.importDialog.close();
});
for (const eventName of ["dragenter", "dragover"]) {
  document.addEventListener(eventName, (event) => {
    event.preventDefault();
    document.body.dataset.drop = "true";
  });
}
document.addEventListener("dragleave", (event) => {
  if (!event.relatedTarget) delete document.body.dataset.drop;
});
document.addEventListener("drop", (event) => {
  event.preventDefault();
  delete document.body.dataset.drop;
  if (event.dataTransfer.files[0]) importFile(event.dataTransfer.files[0]);
});
window.addEventListener("beforeunload", (event) => {
  if (!dirtyEphemeral) return;
  event.preventDefault();
  event.returnValue = "";
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (!$("#command-palette").open) $("#command-palette").showModal();
    const input = $("#command-palette [data-command-input]");
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  }
  if (event.key === "Escape") document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
});
$("#open-command-palette").addEventListener("click", () => {
  $("#command-palette").showModal();
  $("#command-palette [data-command-input]").focus();
});
$("#settings").addEventListener("click", () => {
  elements.status.textContent = "Settings will configure app-wide themes, adapters, and trusted import sources.";
});
$("#profile").addEventListener("click", () => {
  elements.status.textContent = "This workspace is local and self-hosted; hosted identity adapters are optional.";
});
$("#document-hide-sidebar").addEventListener("click", () => {
  $("#document-actions").hidden = true;
  setSidebarHidden(true);
});
$("#command-show-sidebar").addEventListener("click", () => {
  setSidebarHidden(false);
  $("#command-palette").close();
});
$("#sidebar-control-more").addEventListener("click", () => {
  const menu = $("#sidebar-control-menu");
  menu.hidden = !menu.hidden;
  $("#sidebar-control-more").setAttribute("aria-expanded", String(!menu.hidden));
});
$("#sidebar-menu-visibility").addEventListener("click", () => {
  $("#sidebar-control-menu").hidden = true;
  setSidebarHidden(elements.app.dataset.sidebar !== "hidden");
});
$("#sidebar-menu-side").addEventListener("click", () => {
  $("#sidebar-control-menu").hidden = true;
  setControlSide($("#sidebar-control").dataset.side === "right" ? "left" : "right");
});
$("#command-palette [data-command-input]").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  for (const item of $("#command-palette").querySelectorAll("[data-command-label]")) {
    item.hidden = Boolean(query && !item.dataset.commandLabel.includes(query));
  }
});
$("#command-palette").addEventListener("click", (event) => {
  if (event.target === $("#command-palette")) $("#command-palette").close();
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".document-menu") && !event.target.closest("#document-actions")) {
    $("#document-actions").hidden = true;
  }
  if (!event.target.closest("#sidebar-control")) {
    $("#sidebar-control-menu").hidden = true;
    $("#sidebar-control-more").setAttribute("aria-expanded", "false");
  }
});
document.querySelectorAll("[data-close]").forEach((button) =>
  button.addEventListener("click", () => button.closest("dialog").close()));

$("#sidebar-resizer").addEventListener("pointerdown", (event) => {
  if (elements.app.dataset.sidebar === "hidden") return;
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const move = (moveEvent) => {
    const width = Math.max(260, Math.min(480, moveEvent.clientX));
    elements.app.style.setProperty("--sidebar-width", `${width}px`);
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", () => {
    handle.removeEventListener("pointermove", move);
  }, { once: true });
});
$("#sidebar-control-drag").addEventListener("pointerdown", (event) => {
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const move = (moveEvent) => {
    const top = Math.max(8, Math.min(innerHeight - 42, moveEvent.clientY - 16));
    elements.app.style.setProperty("--control-y", `${top}px`);
    setControlSide(moveEvent.clientX > innerWidth / 2 ? "right" : "left");
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", () => {
    handle.removeEventListener("pointermove", move);
    persistSidebar();
  }, { once: true });
});
ensureDefaults();
restoreSidebar();
renderCollectionOptions();
selectCollection(activeCollectionId);
document.body.dataset.ready = "true";
