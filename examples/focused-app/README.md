# Focused App

Focused App is the portable shell intended for `app.resources.co` and
`app.macchiato.dev`. It presents small sandboxed apps in an Evernote-like
workspace without a top bar. Its sidebar can be resized or collapsed
completely.

The first prototype is deliberately serverless. A collection owns a storage
adapter and documents own sandbox declarations. The built-in adapters are
Memory, Session Storage (the default), Local Storage, and a read-only Library.
That boundary is the extension point for hosted SQLite, remote self-hosted
storage, content-addressed stores, and blockchain-backed references; those
future adapters must not silently add network authority to a document sandbox.

Run it

```bash
node packages/app/src/index.js --host 127.0.0.1 --port 8765 \
  --app-plugin focused-app
```

Open `http://app.localhost:8765`. The collection button opens a rich list whose
two-line entries explain their storage and keep the read-only Library last.
Hover a storage icon for its type. Drag the sidebar separator horizontally to
resize it. The prominent edge arrow collapses it; hover that control to reveal
file import and a handle that moves the control vertically. Use `Ctrl/Cmd-K`
for the command surface, or drag a text file anywhere onto the page. Files
larger than 1 MB default to Memory. Manual changes in Memory or Session Storage
enable the browser's leave-page warning.

Deployment

The handler serves only `index.html`, `client.js`, `model.js`, and `style.css`
with a CSP that disables all network connections. The same four files can be
published unchanged at:

- `app.resources.co` as the hosted Resources platform;
- `app.macchiato.dev` as the open-source project deployment;
- GitHub Pages for an auditable fork; or
- any static/self-hosted web server.

GitHub Pages should deploy `examples/focused-app/` as its site root (or copy
the four runtime files to a Pages artifact). Relative asset URLs keep project
Pages paths working. A self-hosted instance can replace storage adapters while
retaining this UI and document format.

Import links are intentionally not enabled yet. The eventual claim link should
carry content in a fragment or fetch it only through a separately declared
import capability, and should verify a signature or an operator-approved
origin. Referrer checking alone is not authentication.
