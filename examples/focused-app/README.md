# Focused App

Focused App is the portable shell intended for `app.resources.co` and
`app.macchiato.dev`. It presents small sandboxed apps in an Evernote-like
workspace without a top bar. Its sidebar can be resized or collapsed
completely.

The sidebar starts with Documents and Info tabs. Documents owns collection
navigation, search, and the three-line document list. Info shows the selected
document's storage, encoded byte size, update time, sandbox declaration, and a
local download action. Creating a document selects Info so its authority and
persistence are visible before the user starts treating it as durable.

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
compact heading contains New Collection and whose two-line entries explain
their storage and keep the read-only Library last. Hover a storage icon for its
type. Drag the sidebar separator horizontally to resize it. The arrow beside
the collection button collapses the sidebar and remains a single small arrow
while the sidebar is visible. When hidden it becomes a side nub. Hold a hover
on that nub for 1.2 seconds to reveal its deliberately subdued dots and
vertical grip; leaving it collapses the utility again after 750 ms. Its menu
contains Show and Move to Right/Left. On the right edge it uses a
sidebar-layout icon because a directional arrow would be ambiguous. Side and
vertical position persist locally. A document's dot menu can also hide it. Use
`Ctrl/Cmd-K` or
`Ctrl/Cmd-Shift-K`, then Show Sidebar, to restore it without the tab. Drag a
text file anywhere onto the page to import it. Files larger than 1 MB default
to Memory. Manual changes in Memory or Session Storage enable the browser's
leave-page warning. Command search follows the same `command-palette-use`
surface as Resources Edge rather than introducing a second palette design.
Apps may claim plain Command/Ctrl-K in their sandbox declaration;
Command/Ctrl-Shift-K remains reserved for the host. A future controlled-iframe
`postMessage` bridge is documented but deliberately unspecified and disabled.

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
