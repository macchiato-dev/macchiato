# @macchiato-dev/quickjs-emscripten-sandbox

Sandboxed JavaScript execution via QuickJS.

## Quick start (Deno)

```bash
deno run --allow-net=:8765 --allow-read src/server.js
```

Then open `http://macchiato-quickjs-emscripten-sandbox.localhost:8765`.

To bind to all interfaces (containers):

```bash
deno run --allow-net=[::]:8765 --allow-read src/server.js -b 0.0.0.0
```

## API

```javascript
import { runInSandbox } from "@macchiato-dev/quickjs-emscripten-sandbox";

const result = await runInSandbox("1 + 1");
console.log(result); // { ok: true, value: 2 }
```

## Publishing

```bash
npm publish --access public
```
