import { mountQuickJsCodeEditor } from "@macchiato-dev/code-editor-use/controller";

export async function mountResourcesProjectEditor(options) {
  const guestSource = await (await fetch("/-/resources-site/project-editor-guest.js")).text();
  return mountQuickJsCodeEditor({ ...options, guestSource });
}
