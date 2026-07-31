# declarative-app-server

A storage-neutral renderer and minimal Node HTTP adapter for small declarative
Macchiato apps. It has no runtime dependencies and does not import SQLite or the
main app server.

An app declares a standard layout and a content area. The content area names
the block types it permits; non-core blocks only work when their renderer is
explicitly imported and supplied by the app. Layout customization is limited to
validated theme tokens so an app can be distinctive without replacing the
layout contract.

```js
import { defineDeclarativeApp, serveDeclarativeApp } from "@macchiato-dev/declarative-app-server";

const app = defineDeclarativeApp({
  id: "notes",
  layout: { title: "Notes", theme: { accent: "#67e8d4" } },
  content: { allowedBlocks: ["paragraph"], blocks: [{ type: "paragraph", text: "Hello." }] },
});
const { url } = await serveDeclarativeApp(app);
console.log(url);
```

The server uses `PORT` when set and asks the operating system for a free port
otherwise. `HOST` defaults to `127.0.0.1`. An imported block supplies markup;
the optional `assets(request)` hook serves only the files it needs.
