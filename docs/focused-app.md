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
compact hover expansion adds a vertical grip and low-emphasis dots for Hide
and Move to Right/Left. Moving the control right replaces its arrow with a
sidebar-layout icon. Its side and vertical position are local UI preferences
persisted across reloads. Document dot menus also expose Hide, while the
command palette exposes Show Sidebar through either K shortcut. The palette
uses the same `command-palette-use` markup and visual contract as Resources
Edge, with commands supplied by this workspace. Every document retains an
explicit sandbox declaration independently of the collection that stores its
bytes.

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

The current shell is four relative-URL static assets and has
`connect-src 'none'`. It can run unchanged on Resources, macchiato.dev, GitHub
Pages, or a static self-host. Hosted services are a convenience, not a
requirement; self-hosting is recommended when an operator is ready to own
updates and persistence.

A future Resources “open in my instance” link should behave like file import.
It must use a bounded payload and either a verifiable signature or an
explicitly approved source capability. Referrer checks can inform UI but are
not authentication. Blockchain integration belongs behind the same collection
interface: content hashes, signatures, or discovery records may be
decentralized without granting sandboxed code an unrestricted network channel.
