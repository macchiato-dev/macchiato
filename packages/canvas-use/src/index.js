const METHODS = new Set(["setTransform", "clearRect", "fillRect", "beginPath", "arc", "fill", "moveTo", "lineTo", "stroke"]);
const PROPERTIES = new Set(["fillStyle", "strokeStyle", "lineWidth"]);
const COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\([0-9., %]+\)|[a-z]{1,20})$/i;

function finite(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > 100_000) throw new Error("canvas-use rejected an unbounded number");
  return number;
}

export class CanvasUseHost {
  constructor(domHost, { maxCommands = 50_000 } = {}) {
    this.domHost = domHost;
    this.maxCommands = Math.max(1, Math.min(Number(maxCommands), 100_000));
    this.commands = 0;
    this.contexts = new Map();
  }

  dispatch(message) {
    const canvas = this.domHost.remoteNode(message.id);
    if (canvas?.localName !== "canvas") throw new Error("canvas-use requires an owned canvas");
    if (message.contextType !== "2d") throw new Error("canvas-use only grants a 2D context");
    const context = this.contexts.get(message.id) || canvas.getContext("2d");
    this.contexts.set(message.id, context);
    if (++this.commands > this.maxCommands) throw new Error("canvas-use command budget exceeded");
    if (message.action === "set") {
      if (!PROPERTIES.has(message.property)) throw new Error(`canvas-use rejected property: ${message.property}`);
      context[message.property] = message.property === "lineWidth"
        ? Math.max(0, finite(message.value))
        : (COLOR.test(String(message.value)) ? String(message.value) : (() => { throw new Error("canvas-use rejected color"); })());
      return {};
    }
    if (message.action !== "call" || !METHODS.has(message.method)) throw new Error(`canvas-use rejected method: ${message.method}`);
    context[message.method](...(message.args || []).map(finite));
    return {};
  }

  inspect() { return Object.freeze({ commands: this.commands, canvases: this.contexts.size }); }
}
