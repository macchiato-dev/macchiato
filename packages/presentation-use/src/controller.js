const PROTOCOL = "macchiato-presentation-use-v1";

export function mountPresentationUse({ root, runnerUrl, project, onStatus = () => {} }) {
  if (!(root instanceof Element)) throw new TypeError("presentation-use root must be an Element");
  if (!runnerUrl) throw new TypeError("presentation-use runnerUrl is required");
  const channel = crypto.randomUUID();
  const frame = document.createElement("iframe");
  frame.className = "project-editor__presentation-frame";
  frame.title = project.title || "Presentation";
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("referrerpolicy", "no-referrer");
  frame.src = runnerUrl;
  root.replaceChildren(frame);
  const projectPayload = project.fileUrl
    ? fetch(project.fileUrl, { credentials: "omit", referrerPolicy: "no-referrer" }).then(async (response) => {
      if (!response.ok) throw new Error(`Presentation entry response: ${response.status}`);
      return { ...project, file: await response.text(), fileUrl: undefined };
    })
    : Promise.resolve(project);

  function receive(event) {
    if (event.source !== frame.contentWindow || event.data?.protocol !== PROTOCOL || event.data.channel !== channel) return;
    if (event.data.type === "ready") projectPayload
      .then((payload) => frame.contentWindow.postMessage({ protocol: PROTOCOL, channel, type: "mount", project: payload }, "*"))
      .catch((error) => onStatus({ type: "blocked", message: error.message }));
    else {
      if (event.data.runtime) frame.dataset.runtime = event.data.runtime;
      onStatus(event.data);
    }
  }
  window.addEventListener("message", receive);
  frame.addEventListener("load", () => frame.contentWindow.postMessage({ protocol: PROTOCOL, channel, type: "connect" }, "*"), { once: true });
  return {
    frame,
    inspect: () => ({ runtime: frame.dataset.runtime || "loading", sandbox: frame.getAttribute("sandbox") }),
    destroy() {
      window.removeEventListener("message", receive);
      frame.contentWindow?.postMessage({ protocol: PROTOCOL, channel, type: "destroy" }, "*");
      frame.remove();
    },
  };
}

export { PROTOCOL as presentationUseProtocol };
