# Focused app architecture

The `focused-app` plugin is the portable app workspace for `app.resources.co`
and `app.macchiato.dev`. Its default declarative subdomain is `app`, but plugin
installation may map it elsewhere:

```bash
node packages/app/src/index.js --app-plugin focused-app
node packages/macchiato/src/macchiato.js app install focused-app \
  --map focused-app=workspace
```

The sidebar is navigation, not part of a running document's authority. There
is no top bar competing with the app. A rich collection list keeps storage
identity visible, the separator resizes horizontally, and the edge arrow
beside the collection picker collapses the sidebar for a full viewport. A
hidden sidebar leaves a small side nub. A continuous 1.2-second hover—not an
incidental pointer crossing—expands the nub to expose low-emphasis dots and a
vertical grip. It contracts 750 ms after pointer exit. Moving the control right
replaces its arrow with a sidebar-layout icon. Its side and vertical position
are local UI preferences persisted across reloads. Document dot menus also
expose Hide, while the
command palette exposes Show Sidebar through either K shortcut. The palette
uses the same `command-palette-use` markup and visual contract as Resources
Edge, with commands supplied by this workspace. Every document retains an
explicit sandbox declaration independently of the collection that stores its
bytes.

A dropped `.html`, `.css`, or `.js` file is detected as a
`standard-web-app`. The workspace shows its entry kind and package/version
requirements and renders it in a sandboxed iframe. Authored script elements
are removed; QuickJS/WASM in the parent evaluates extracted JavaScript through
a scoped `browser-use` DOM bridge. Build the same implementation for GitHub
Pages with `npm run export:focused-app -- <directory>`.

Documents and Info are separate sidebar views, joined by an Activity view
that streams workspace actions (adding apps or collections, changing
settings) from a locally persisted, size-capped log. Info is selected after
document creation and derives its size and sandbox declaration from the
current document model; Download creates a local Blob and does not grant
network access. The visible collapse arrow aligns with these tabs and has a padded,
transparent hit target whose shape appears only on hover.

Shortcut ownership

Documents default to `sandbox.shortcuts.commandK: "host"`. A document that
needs Command/Ctrl-K may declare `"app"` instead; the host then leaves the
plain shortcut alone. Command/Ctrl-Shift-K is always reserved as the host
palette escape hatch.

A fully controlled iframe may eventually need to forward that shifted shortcut
to its host with `postMessage`. That bridge is intentionally not implemented
yet: its message shape, source-window checks, origin rules, capability
declaration, and replay behavior must be specified together. Arbitrary iframe
messages must never be treated as host commands.

Storage boundary

```text
workspace UI -> collection interface -> Memory | Session | Local | Library
                                      -> hosted SQLite (future)
                                      -> self-hosted adapter (future)
                                      -> content-addressed/decentralized adapter (future)
```

Memory and Session are ephemeral and warn before leaving after manual edits.
Local Storage persists in the browser. Library is read-only. A deployment can
add adapters, but storage access does not imply network access for an app:
network, DOM, HTTP, and other capabilities remain separate sandbox grants.

Distribution and trust

The exported shell uses relative URLs and includes its pinned QuickJS modules.
It can run unchanged on Resources, macchiato.dev, GitHub Pages, or a static
self-host without SQLite. Hosted services are a convenience, not a requirement;
self-hosting is recommended when an operator is ready to own updates and
persistence.

A future Resources “open in my instance” link should behave like file import.
It must use a bounded payload and either a verifiable signature or an
explicitly approved source capability. Referrer checks can inform UI but are
not authentication. Blockchain integration belongs behind the same collection
interface: content hashes, signatures, or discovery records may be
decentralized without granting sandboxed code an unrestricted network channel.
