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

## Ordinary web applications

`standard-web-app` configuration accepts an ordinary HTML entry containing
stylesheet links, inline styles, external scripts, and inline scripts. Loading
it follows a deliberately asymmetric path:

1. HTML is sanitized through the configured `html-use` schema.
2. Every stylesheet is validated independently through `style-use` and served
   at its original URL. Inline styles receive stable generated URLs.
3. Authored script elements are removed. Their source order and code appear in
   `/-/app-manifest.json` and non-executable `text/plain` guest endpoints.
4. The only executable element the server adds is `/-/runtime.js`, the trusted
   host bootstrap named by the configuration. It starts the selected WASM
   sandbox, installs the host/guest capability layer, fetches the guest sources,
   and evaluates them inside QuickJS.

Run `macchiato-detect-app [directory]` to find and validate either
`macchiato.app.json` or `package.json#macchiato`. Its JSON result is intended
for people, automation, and a future configuration-detection skill.

The independently installable `example/` project is a small counter using this
entire path. It has ordinary `index.html`, `style.css`, and `app.js` files; the
configuration is the only Macchiato-specific application file. Run it with
`cd example && npm install && npm start`. It is excluded from the published npm
package.
