# @macchiato-dev/quickjs-emscripten-sandbox

Sandboxed JavaScript execution via QuickJS.

## Quick start (Deno)

```bash
deno run --allow-net=:8765 src/server.js
```

Then open `http://macchiato-quickjs-emscripten-sandbox.localhost:8765`.

To bind to all interfaces (containers):

```bash
deno run --allow-net=[::]:8765 src/server.js -b 0.0.0.0
```

## API

```javascript
import { runInSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

const result = await runInSandbox("1 + 1");
console.log(result); // { ok: true, value: 2 }
```

### Host-provided modules

Guests can use ES module imports when the host provides a module loader:

```javascript
import {
  createSandbox,
  nodeHttpModuleSource,
  nodeSqliteModuleSource,
} from "@macchiato-dev/quickjs-emscripten-sandbox";

const sandbox = await createSandbox({
  modules: {
    "node:http": nodeHttpModuleSource(),
    "node:sqlite": nodeSqliteModuleSource(),
  },
});

sandbox.installJsonHostFunction("__macchiatoHost", (message) => {
  if (message.op === "http.createServer") return { id: "server-1" };
  if (message.op === "http.listen") return { listening: true };
  if (message.op === "sqlite.open") return { id: "db-1" };
  if (message.op === "sqlite.get") return { name: "Resources.co" };
  throw new Error(`Unsupported operation: ${message.op}`);
});

sandbox.evalModule(`
  import http from "node:http";
  import { DatabaseSync } from "node:sqlite";

  const db = new DatabaseSync("app");
  const row = db.prepare("select name from projects limit 1").get();

  const server = http.createServer(() => {});
  server.listen(8080);
`);
```

The imported module name can look like a Node built-in, but the implementation
is still a capability wrapper supplied by the host. Unprovided modules are
rejected by the loader.

## Publishing

```bash
npm publish --access public
```
