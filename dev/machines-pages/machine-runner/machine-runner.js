class MachineRunnerController {
  constructor(root) {
    if (!(root instanceof HTMLElement)) throw new TypeError("Machine runner needs a mount element");
    this.root = root;
  }

  start() {
    const heading = document.createElement("h1");
    heading.textContent = "Macchiato Machine Runner";
    const status = document.createElement("p");
    status.textContent = "Static runner preview ready.";
    this.root.replaceChildren(heading, status);
  }
}

export function startMachineRunner(root) {
  new MachineRunnerController(root).start();
}
