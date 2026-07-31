export class CodeMirrorInputBridge {
  constructor(root, sandbox, { isStopped = () => false } = {}) {
    this.root = root;
    this.sandbox = sandbox;
    this.isStopped = isStopped;
    this.dragAnchor = null;
    this.dragNativeAnchor = null;
    this.pendingDragPoint = null;
    this.dragFrame = 0;
    this.suppressNextClick = false;
    this.snapshot = null;
    this.listeners = [];
  }

  listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    this.listeners.push(() => target.removeEventListener(type, listener, options));
  }

  captureSnapshot() {
    const content = this.root.querySelector(".cm-content");
    const lines = content ? Array.from(content.querySelectorAll(":scope > .cm-line")) : [];
    this.snapshot = {
      content,
      lines,
      rectangles: lines.map((line) => line.getBoundingClientRect()),
    };
    return this.snapshot;
  }

  locationFromPoint(x, y) {
    const snapshot = this.snapshot || this.captureSnapshot();
    const { content, lines, rectangles } = snapshot;
    if (!content || !lines.length) return null;
    let lineIndex = 0;
    let nearestDistance = Infinity;
    for (let index = 0; index < lines.length; index += 1) {
      const rect = rectangles[index];
      const distance = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        lineIndex = index;
      }
    }
    const line = lines[lineIndex];
    const lineRect = rectangles[lineIndex];
    let lineOffset;
    let domNode = null;
    let domOffset = 0;
    if (x <= lineRect.left) lineOffset = 0;
    else if (x >= lineRect.right) lineOffset = line.textContent.length;
    else {
      const sampleY = Math.max(lineRect.top + 1, Math.min(lineRect.bottom - 1, y));
      const caret = document.caretPositionFromPoint?.(x, sampleY);
      const fallback = caret ? null : document.caretRangeFromPoint?.(x, sampleY);
      const node = caret?.offsetNode || fallback?.startContainer;
      const offset = caret?.offset ?? fallback?.startOffset;
      const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      if (node && element && line.contains(element)) {
        const range = document.createRange();
        range.setStart(line, 0);
        try {
          range.setEnd(node, offset);
          lineOffset = range.toString().length;
          domNode = node;
          domOffset = offset;
        } catch {}
      }
      if (lineOffset == null) lineOffset = x < (lineRect.left + lineRect.right) / 2 ? 0 : line.textContent.length;
    }
    lineOffset = Math.max(0, Math.min(line.textContent.length, lineOffset));
    if (!domNode) {
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      let remaining = lineOffset;
      while (walker.nextNode()) {
        const length = walker.currentNode.textContent.length;
        if (remaining <= length) {
          domNode = walker.currentNode;
          domOffset = remaining;
          break;
        }
        remaining -= length;
      }
      if (!domNode) {
        domNode = line;
        domOffset = line.childNodes.length;
      }
    }
    return { renderedLineIndex: lineIndex, lineOffset, text: line.textContent, domNode, domOffset };
  }

  flush() {
    this.sandbox.callJsonFunction("__browserUseFlush", {});
  }

  selectAtPoint(point, anchor) {
    const location = this.locationFromPoint(point.clientX, point.clientY);
    if (!location) return null;
    const headLocation = { renderedLineIndex: location.renderedLineIndex, lineOffset: location.lineOffset };
    const selection = this.sandbox.callJsonFunction("__codeEditorSelect", { anchor, headLocation });
    this.flush();
    this.root.querySelector(".cm-content")?.focus({ preventScroll: true });
    return selection;
  }

  preview(point) {
    if (!this.dragNativeAnchor) return;
    const location = this.locationFromPoint(point.clientX, point.clientY);
    if (!location) return;
    document.getSelection()?.setBaseAndExtent(
      this.dragNativeAnchor.domNode,
      this.dragNativeAnchor.domOffset,
      location.domNode,
      location.domOffset,
    );
  }

  attach() {
    this.listen(this.root, "mousedown", (event) => {
      if (this.isStopped() || event.button !== 0 || !event.target.closest?.(".cm-content")) return;
      this.captureSnapshot();
      this.suppressNextClick = true;
      const location = this.locationFromPoint(event.clientX, event.clientY);
      if (!location) return;
      if (event.detail === 2) {
        const word = /[\p{L}\p{N}_$]/u;
        let probe = Math.min(location.text.length - 1, location.lineOffset);
        if (probe >= 0 && !word.test(location.text[probe]) && probe > 0 && word.test(location.text[probe - 1])) probe -= 1;
        let from = probe;
        let to = probe + 1;
        while (from > 0 && word.test(location.text[from - 1])) from -= 1;
        while (to < location.text.length && word.test(location.text[to])) to += 1;
        this.dragAnchor = null;
        this.sandbox.callJsonFunction("__codeEditorSelect", {
          anchorLocation: { renderedLineIndex: location.renderedLineIndex, lineOffset: from },
          headLocation: { renderedLineIndex: location.renderedLineIndex, lineOffset: to },
        });
        this.flush();
      } else {
        const existing = event.shiftKey ? this.sandbox.callJsonFunction("__codeEditorGetSelection", {}) : null;
        const selected = this.selectAtPoint(event, existing?.anchor);
        this.dragAnchor = existing?.anchor ?? selected?.anchor ?? null;
        this.dragNativeAnchor = event.shiftKey ? null : { domNode: location.domNode, domOffset: location.domOffset };
        if (!event.shiftKey) this.root.classList.add("cm-drag-preview");
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    this.listen(this.root, "click", (event) => {
      if (!this.suppressNextClick) return;
      this.suppressNextClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    this.listen(window, "mousemove", (event) => {
      if (this.dragAnchor == null || !(event.buttons & 1)) return;
      this.pendingDragPoint = { clientX: event.clientX, clientY: event.clientY };
      if (!this.dragFrame) {
        this.dragFrame = requestAnimationFrame(() => {
          this.dragFrame = 0;
          if (this.pendingDragPoint && this.dragAnchor != null) this.preview(this.pendingDragPoint);
          this.pendingDragPoint = null;
        });
      }
      event.preventDefault();
    }, true);
    this.listen(window, "mouseup", (event) => {
      if (this.dragAnchor != null) {
        this.preview(event);
        this.selectAtPoint(event, this.dragAnchor);
      }
      this.dragAnchor = null;
      this.dragNativeAnchor = null;
      this.root.classList.remove("cm-drag-preview");
      this.pendingDragPoint = null;
      this.snapshot = null;
    }, false);
    this.listen(this.root, "beforeinput", (event) => {
      if (this.isStopped()) return;
      const result = this.sandbox.callJsonFunction("__codeEditorBeforeInput", { inputType: event.inputType, data: event.data });
      this.flush();
      this.snapshot = null;
      if (result.handled) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    this.listen(this.root, "keydown", (event) => {
      if (this.isStopped()) return;
      const result = this.sandbox.callJsonFunction("__codeEditorCommand", {
        key: event.key, code: event.code, ctrlKey: event.ctrlKey, shiftKey: event.shiftKey,
        mod: event.ctrlKey || event.metaKey,
      });
      this.flush();
      this.snapshot = null;
      if (result.handled) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    return this;
  }

  destroy() {
    for (const remove of this.listeners.splice(0)) remove();
    if (this.dragFrame) cancelAnimationFrame(this.dragFrame);
    this.root.classList.remove("cm-drag-preview");
  }
}
