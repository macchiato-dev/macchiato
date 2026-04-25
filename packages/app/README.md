# @macchiato-dev/app

Cross-runtime HTTP server. Serves a page per subdomain.

## Quick start (Deno)

```bash
deno run --allow-net=:8765 src/index.js
```

Then open `http://example.localhost:8765`.

You should see `<h1>example</h1>`.

### Minimal permissions

Deno requires only network access to the chosen port:

```bash
deno run --allow-net=:8765 src/index.js
```

To bind to all interfaces (dual-stack, needed for containers):

```bash
deno run --allow-net=[::]:8765 src/index.js -b 0.0.0.0
```

## Node.js

Requires Node 22+ with `--experimental-strip-types` or a build step.

```bash
# Run directly
node src/index.js
```

## Bun

```bash
bun run src/index.js
```

## Options

| Flag | Description |
|------|-------------|
| `-b`, `--host` | Bind address (default: `127.0.0.1`) |
| `-p`, `--port` | Port (default: `8765`) |

## Publishing

```bash
npm publish --access public
```

After publishing, use via `npx`:

```bash
npx @macchiato-dev/app -b 0.0.0.0
```
