import { resolve } from "node:path";
import { instrumentedQuickjsCodeMirrorHandler } from "../../../dev/wasm-web-runtimes/examples/codemirror/handler.js";
import { directoryWritableFileResponse } from "./directory-file-access.js";

const traceDirectory = resolve(new URL("../../../dev/wasm-web-runtimes/examples/codemirror/", import.meta.url).pathname);

export async function instrumentedCodeMirrorHandler(request, app) {
  const writable = await directoryWritableFileResponse(request, app, traceDirectory);
  return writable || instrumentedQuickjsCodeMirrorHandler(request);
}
