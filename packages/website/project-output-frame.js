const protocol = "resources-project-output-frame-v1";

addEventListener("message", (event) => {
  if (event.source !== parent || event.data?.protocol !== protocol || event.data.type !== "connect" || event.ports.length !== 1) return;
  const port = event.ports[0];
  const roots = [document.getElementById("project-output-a"), document.getElementById("project-output-b")];
  const styles = roots.map(() => document.head.appendChild(document.createElement("style")));
  let active = 0;
  const stagedGenerations = new Map();
  port.addEventListener("message", (message) => {
    if (message.data?.type === "stage" && typeof message.data.css === "string") {
      const staged = active ^ 1;
      styles[staged].textContent = message.data.css;
      styles[staged].disabled = true;
      roots[staged].replaceChildren();
      stagedGenerations.set(message.data.generation, staged);
      port.postMessage({ type: "staged", generation: message.data.generation, root: roots[staged].id });
      return;
    }
    if (message.data?.type === "commit") {
      const staged = stagedGenerations.get(message.data.generation);
      if (staged === undefined) return;
      roots[active].hidden = true;
      styles[active].disabled = true;
      roots[staged].hidden = false;
      styles[staged].disabled = false;
      active = staged;
      stagedGenerations.delete(message.data.generation);
      port.postMessage({ type: "committed", generation: message.data.generation, root: roots[active].id });
    }
  });
  port.start();
  port.postMessage({ type: "ready" });
});
