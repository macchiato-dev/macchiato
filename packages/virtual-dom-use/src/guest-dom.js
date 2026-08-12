// These objects imitate only the DOM vocabulary granted to a guest component.
// They hold handles, not browser nodes, and are safe to discard after a turn.
export function createGuestDomFacade(store) {
  let activeBatch = null;
  let generation = 0;

  function assertNode(id) {
    const node = store.nodes[id];
    if (!node) throw new Error(`Unknown guest node handle: ${id}`);
    return node;
  }

  function set(id, path, value) {
    if (!activeBatch) throw new Error("Guest DOM writes require an active mutation batch");
    activeBatch.push({ op: "set", path: ["nodes", id, ...path], value });
  }

  class GuestNode {
    #id;
    #generation;
    constructor(id) { assertNode(id); this.#id = id; this.#generation = generation; }
    get nodeHandle() { return this.#id; }
    get isConnected() { return this.#generation === generation && Boolean(store.nodes[this.#id]); }
    get textContent() { return assertNode(this.#id).text ?? ""; }
    set textContent(value) { set(this.#id, ["text"], String(value)); }
    release() { this.#generation = -1; this.#id = ""; }
  }

  class GuestElement extends GuestNode {
    get value() { return assertNode(this.nodeHandle).props?.value ?? ""; }
    set value(value) { set(this.nodeHandle, ["props", "value"], String(value)); }
    get disabled() { return Boolean(assertNode(this.nodeHandle).props?.disabled); }
    set disabled(value) { set(this.nodeHandle, ["props", "disabled"], Boolean(value)); }
    get selectionStart() { return assertNode(this.nodeHandle).props?.selectionStart ?? 0; }
    get selectionEnd() { return assertNode(this.nodeHandle).props?.selectionEnd ?? 0; }
    setSelectionRange(start, end = start) {
      set(this.nodeHandle, ["props", "selectionStart"], Number(start));
      set(this.nodeHandle, ["props", "selectionEnd"], Number(end));
    }
  }

  const document = Object.freeze({
    getElementById(id) { return new GuestElement(String(id)); },
    createHandle(id) { return new GuestElement(String(id)); },
  });

  return Object.freeze({
    document,
    beginBatch() {
      if (activeBatch) throw new Error("Nested guest DOM batches are not supported");
      activeBatch = [];
      return Object.freeze({
        finish() { const operations = activeBatch; activeBatch = null; generation += 1; return operations; },
        cancel() { activeBatch = null; generation += 1; },
      });
    },
  });
}
