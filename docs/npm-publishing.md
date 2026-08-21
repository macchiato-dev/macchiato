# npm publishing order

Macchiato's packages form layers. Publish and test them from the bottom up;
do not publish the entire workspace as one versioned batch.

## First set: the schema-bound DOM stack

Publish these together as prereleases, in this order:

1. `@macchiato-dev/style-use`
2. `@macchiato-dev/html-use`
3. `@macchiato-dev/dom-use`

This is the clearest reusable unit in the repository. `style-use` is a leaf.
`html-use` depends only on it. `dom-use` composes both into the complete DOM
policy boundary. The three packages have focused documentation, small
tarballs, exact internal dependency versions, and direct tests.

Use a prerelease such as `0.1.0-next.0` until a clean-directory consumer test
has installed the packed tarballs and exercised both Node and browser usage.
The standalone `html-use` sanitizer is structural; the complete attribute,
URL, tree, content, and gas policy belongs to `dom-use`.

## Later sets

| Set | Packages | Publish after |
| --- | --- | --- |
| Data boundaries | `http-use`, `sqlite-use` | Request-size/error policy and database-adapter compatibility are documented and tested. |
| Live browser capabilities | `browser-use`, `canvas-use` | The guest timer/event ABI and renewable resource-budget semantics settle. |
| Sandbox runtime | `quickjs-emscripten-sandbox` | Interrupt/time limits and production diagnostics are explicit. |
| Editors | `project-editor` and later editor packages | Their machine boundary, guest artifacts, IME, selection, and teardown contracts stabilize. |
| App composition | `declarative-app-server`, `site`, menus, themes | The declarative application and asset protocol is versioned. |
| Product/runtime | `app-db-sqlite`, `app`, `macchiato` | Deployment adapters and migrations are treated as supported public APIs. |

`dashboard` is an app-owned development UI and does not need to be public
until it has a use case outside the Macchiato server.

## Release gates

- Choose and add a repository license. There is currently no `LICENSE` file;
  this blocks a responsible public release.
- Confirm ownership and name availability for the `@macchiato-dev` npm scope.
- Run the root test suite and each package's test script.
- Run `npm pack --dry-run` and inspect every tarball. Examples, tests,
  development databases, and generated build inputs should not leak into a
  runtime package unless they are intentionally part of its API.
- Install the tarballs into a new directory with no workspace or hoisted
  dependencies, then import every documented export.
- Generate provenance and use npm two-factor authentication for publication.
- Publish dependencies first, install exactly what was published, and only
  then publish their consumers.

Do not describe a package as an isolation boundary more broadly than its tests
support. In particular, distinguish structural filtering, host capability
policy, WebAssembly/QuickJS execution, and OS/process isolation.
