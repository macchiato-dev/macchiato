import { mountElementUse } from "/host.js";

const protocol = "element-use-example-v1";
let active;

addEventListener("message", async (event) => {
  if (event.data?.protocol !== protocol || event.data.type !== "mount") return;
  try {
    active?.destroy();
    active = await mountElementUse({
      root: document.querySelector("#game"),
      source: event.data.project.file,
      guestUrl: "/guest.js",
      resources: event.data.project.resources,
      onError(error) {
        parent.postMessage({
          protocol,
          type: "blocked",
          message: error.message,
        }, "*");
      },
    });
    parent.postMessage({ protocol, type: "mounted" }, "*");
  } catch (error) {
    parent.postMessage(
      { protocol, type: "blocked", message: error.message },
      "*",
    );
  }
});

parent.postMessage({ protocol, type: "ready" }, "*");
