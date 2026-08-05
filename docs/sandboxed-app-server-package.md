# Sandboxed App Server System Design

## Status

This is a design sketch for one sandboxed app server system, not an
implementation contract and not the only sandboxing direction Macchiato should
explore.

In this document, "system" means the runtime architecture and authority model.
"Package" means one concrete implementation of that system. "Exploration" means
a sibling package that may try a different runtime, isolation boundary,
language strategy, or compatibility target.

The first implementation would be a reusable server/runtime package, not just a
mode inside `@macchiato-dev/app`. A possible name is:

```text
@macchiato-dev/sandboxed-app-server
```

The package's job is to run existing web apps behind explicit capabilities. It
should make normal web app behavior possible while ensuring that network,
storage, filesystem, process, DOM, and host environment access are mediated by
Macchiato-owned policy.

There will likely be other packages for other explorations: smaller QuickJS
server runtimes, WebAssembly component runtimes, frontend-only sandboxes,
browser compatibility experiments, machine orchestration, or framework-specific
adapters. This package is the concrete server package for the "run existing web
apps with brokered effects" system. It should share vocabulary and policy shapes
with those other packages where that helps, but it should not absorb every
experiment into one large runtime.

This is similar in spirit to the current QuickJS browser work:

- guest code runs in a controlled execution environment;
- guest code gets narrow host capabilities, not direct host objects;
- every host effect is routed through policy;
- fallback execution targets can be swapped without changing the app contract.

The difference is that the server-side package must also handle network access,
backend endpoints, credentials, filesystem boundaries, process lifecycle, and
stronger isolation options.

## Goal

The package should let Macchiato run existing web apps in a sandboxed server
environment where selected endpoints can perform selected effects.

Examples:

- a Next/Express/Hono-style app route can render HTML;
- a server action can fetch from a configured upstream API;
- a webhook endpoint can receive input and enqueue a job;
- an app can read a configured SQLite database or object store;
- a frontend sandbox can call a brokered backend endpoint without getting raw
  credentials or unrestricted network access.

The package should not require every app to be rewritten as QuickJS code. It
should support multiple execution backends, from lightweight in-process
sandboxes to full machine isolation.

One concrete north-star target is a WeKan-class app: a self-hosted kanban
application with boards, lists, cards, users, attachments, realtime updates,
and persistence. Current WeKan is a large Meteor/Node/MongoDB application, so
running the original code unchanged inside a lightweight WebAssembly runtime is
not a near-term assumption. It is still a useful compatibility target because
it forces the system to account for the hard parts:

- a full web app, not a toy endpoint;
- database reads and writes;
- realtime or subscription-style updates;
- user sessions and permissions;
- file uploads or attachments;
- background work and notifications;
- existing framework assumptions about globals, environment variables,
  filesystem, timers, network, and database clients.

The target should have two tracks:

- **Original-code track**: run original or nearly original apps in a strong
  isolation driver, such as a machine/container/microVM, with egress and
  credentials brokered outside the app.
- **Lightweight-runtime track**: run a WeKan-like app through smaller runtime
  components, such as WebAssembly components, QuickJS contexts, or language
  interpreters compiled to Wasm, with persistence exposed through capability
  modules like `sql-use`.

The original-code track validates compatibility. The lightweight-runtime track
validates the long-term capability model.

## Package Family

This package should sit in a family of sandbox/runtime packages rather than
becoming the only abstraction:

```text
@macchiato-dev/sandboxed-app-server       existing web apps + brokered effects
@macchiato-dev/quickjs-server-runtime     small server actions in QuickJS
@macchiato-dev/wasm-component-runtime     component-style Wasm capability ABI
@macchiato-dev/browser-sandbox-runtime    frontend sandbox package/assets
@macchiato-dev/machine-sandbox-driver     VM/container/microVM isolation driver
@macchiato-dev/framework-adapter-*        adapters for specific app frameworks
@macchiato-dev/sql-use                    SQL/database capability
@macchiato-dev/network-use                brokered network capability
@macchiato-dev/storage-use                file/object/blob storage capability
```

Names are placeholders. The important part is separation of concerns:

- packages can explore different runtimes without forcing one implementation
  path;
- shared contracts can emerge around endpoint policy, capability names, and
  broker protocols;
- drivers can be swapped or promoted when an exploration becomes solid;
- the main app server can depend on stable packages rather than carrying every
  experiment directly.

## Package Shape

The package should expose a server builder and a small set of isolation drivers:

```javascript
import { createSandboxedAppServer } from "@macchiato-dev/sandboxed-app-server";

const server = createSandboxedAppServer({
  apps,
  policyStore,
  isolationDrivers,
  networkBroker,
});
```

The package owns:

- app registration and routing;
- endpoint policy compilation;
- request normalization;
- sandbox lifecycle;
- capability injection;
- network brokering;
- audit/event logging hooks;
- response validation and header policy.

It should not own all persistence or all deployment machinery. Those should be
pluggable.

## Core Architecture

```text
client/browser
    |
    v
sandboxed app server package
    |
    +--> route matcher
    |
    +--> app + endpoint policy resolver
    |
    +--> execution target selector
    |       |
    |       +--> isolated machine / VM / container
    |       +--> worker process
    |       +--> QuickJS context
    |       +--> instrumented WebAssembly module
    |
    +--> capability broker
            |
            +--> network broker
            +--> storage broker
            +--> secret broker
            +--> DOM/render broker
            +--> clock/random/timer broker
```

The route handler should not directly hand the request to arbitrary app code.
It should first resolve an endpoint policy that answers:

- which app is being run;
- which endpoint is being invoked;
- which isolation backend is required;
- which capabilities are available;
- which network destinations are allowed;
- which request headers/body fields are passed through;
- which response headers/body shapes are allowed;
- whether credentials may be attached;
- how much CPU, memory, wall time, and output size are permitted.

## Endpoint Policy

An endpoint policy should be declarative and specific. It should be closer to
the existing app config direction than to a free-form server callback.

Sketch:

```json
{
  "app": "inventory",
  "route": "POST /api/reprice",
  "runtime": {
    "driver": "machine",
    "image": "macchiato/inventory-worker:2026-07-01",
    "timeoutMs": 5000,
    "memoryMb": 256
  },
  "capabilities": {
    "network": [
      {
        "name": "pricing-api",
        "method": ["GET", "POST"],
        "origin": "https://pricing.internal.example",
        "pathPrefix": "/v1/",
        "credentials": "pricing-api-token"
      }
    ],
    "storage": [
      {
        "name": "cache",
        "type": "sqlite",
        "mode": "read-write"
      }
    ],
    "secrets": ["pricing-api-token"]
  }
}
```

This does not mean every policy has to be stored as JSON forever. It means the
runtime should operate on a structured policy object, not implicit host access.

## Network Broker

The network broker is the key server-side capability.

Guest app code should not get arbitrary `fetch`. It should get a capability
that can only request named network grants:

```javascript
await network.request("pricing-api", {
  method: "POST",
  path: "/v1/quote",
  body: { sku, quantity }
});
```

The broker validates:

- grant name;
- method;
- scheme;
- origin;
- path prefix or route pattern;
- request headers;
- body size and content type;
- redirect policy;
- response size;
- timeout;
- whether credentials may be attached.

The broker performs the actual request outside the guest. Credentials never
enter the guest environment unless a policy explicitly grants a derived token
or short-lived value.

For higher isolation, the broker request can happen from a separate network
machine rather than the web-facing server. That gives the app server no direct
route to private networks except through the broker plane.

## Isolation Drivers

The package should support a small driver interface:

```javascript
driver.startSession(policy)
driver.invoke(session, request)
driver.dispose(session)
```

Potential drivers:

- **machine driver**: starts or selects a separate VM/container/microVM for an
  app or endpoint class. Strongest boundary and the right default for untrusted
  existing backend apps.
- **process driver**: runs a worker process with restricted environment,
  cwd, argv, stdio, and OS-level limits. Useful for trusted-ish internal apps.
- **QuickJS driver**: runs JavaScript in a QuickJS context with explicit host
  functions. Useful for small server actions, transforms, and app logic that can
  fit inside a JS capability model.
- **Wasm driver**: runs a WebAssembly program through a capability ABI. Useful
  when globals/imports can be controlled and the module can be instrumented or
  compiled for the contract.
- **frontend driver**: packages browser-side sandbox assets and pairs them with
  brokered backend endpoints. This mirrors the existing browser QuickJS pattern.

The driver choice is policy, not app code preference.

## Language And Runtime Research

The system should support multiple languages, but not by giving every language
ambient host access. Each runtime should bind to the same capability vocabulary
where possible.

Research tracks:

- **JavaScript/TypeScript**: QuickJS for small actions and browser/server
  parity; Node-compatible machine/process driver for existing apps.
- **Rust/Zig/C/C++**: Wasm components with explicit imports for network,
  storage, SQL, time, randomness, and logging.
- **Go**: Wasm/WASI for constrained components where practical; process or
  machine isolation for full apps.
- **Python/Ruby/PHP**: lightweight interpreters compiled to Wasm may be useful
  for plugins and scripts, while existing full apps likely start in machine
  isolation.
- **JVM/.NET**: probably process or machine isolation first, unless a specific
  Wasm component path becomes practical.

The common research question is:

```text
Can each language call the same host capabilities without receiving raw host
authority?
```

For example, all of these should be equivalent in authority:

```text
network.request("pricing-api", ...)
sql.query("kanban-db", ...)
blob.write("attachments", ...)
clock.now()
```

The syntax changes by language; the permission model should not.

## Multi-machine placement

Multi-machine operation is a priority, not a late scaling retrofit. A component,
guest VM, or container should be addressable as a scheduling unit with explicit
resource limits and a serializable capability contract. The logical application
must not assume that its layout, editor, preview, backend action, database
broker, and activity service share a process or machine.

The first placement model should distinguish:

- **request-local edge work**, which is stateless and cheap to start;
- **warm component workers**, retained opportunistically for interactive work;
- **durable services**, whose state lives in a database, object store, or
  append-oriented log rather than worker memory; and
- **heavier containers**, used when memory, native dependencies, long-lived
  work, or a broader audited runtime makes edge isolates unsuitable.

Placement is a host concern. Guests address named capabilities and component
instances, not machine addresses. A broker may colocate components, move them,
or recreate them from durable state. Sticky routing is an optimization, never
the only copy of authored input or version history.

Every remotely runnable operation needs a bounded request envelope, stable
project/container identity, idempotency key where mutation is possible,
deadline, cancellation behavior, and correlation ID. Component messages must
be versioned. Leases or epochs prevent an old worker from continuing to write
after ownership moves. Activity/version sequence allocation remains
transactional in durable storage rather than relying on arrival order from
several machines.

This decomposition helps control cold starts and memory in both directions. A
small request should not load every app component, while frequently used
components may be kept warm within an aggregate memory ceiling. The scheduler
needs measurements for bundle/VM initialization time, active and retained
memory, operation gas, last use, queue depth, and reconstruction cost. Eviction
must dispose guests and revoke leases without losing drafts or unreported
diagnostics.

### Bunny Edge Scripting

Bunny Edge Scripting is a useful request router and lightweight execution tier,
but nested Deno Web Workers should not yet be assumed. Standard Deno supports
module workers and permission narrowing; that provides same-machine isolation
and parallelism, not multi-machine placement. Bunny documents a Deno/V8 runtime
with standard Web APIs, but does not currently document the `Worker` constructor
as a supported Edge Scripting API.

Bunny's documented Edge Scripting ceilings also make measurement important:
128 MB active memory per isolate, a 500 ms startup limit, 30 seconds of CPU per
request, and 50 subrequests. Before using nested workers, deploy a probe that
constructs a module worker from bundled code, exchanges structured messages,
loads WebAssembly, terminates cleanly, and records memory/error behavior. Treat
failure or undocumented behavior as “unsupported,” not as a polyfill target.

The architecture should work without that feature: use separate Edge Scripts
or edge instances for lightweight capability endpoints, Bunny Database/object
storage for durable state, and Magic Containers or ordinary self-hosted
machines for heavier/warm workers. A later confirmed nested-worker path can be
an optimization inside one placement target without changing guest capability
contracts.

## Use Modules

The `*-use` package pattern should apply beyond DOM and CSS. A WeKan-class app
needs data and side effects, so future capability packages may include:

- `sql-use`: prepared SQL queries, transactions, migrations, row limits, and
  schema-specific access.
- `mongo-use` or document-store use: only if document databases remain a direct
  target rather than being adapted through SQL-like capabilities.
- `network-use`: named outbound network grants with method, origin, path,
  header, body, redirect, timeout, and credential policy.
- `blob-use`: attachment/object storage with content type, size, scanning, and
  path/key constraints.
- `session-use`: user/session identity without exposing raw cookies.
- `realtime-use`: subscriptions, invalidation, pub/sub, or changefeed-style
  updates behind explicit channels.

These packages should be usable by multiple runtime packages. A Wasm component,
a QuickJS script, and a machine-isolated app adapter should all be able to call
the same logical capability, even if the transport differs.

## WeKan-Class App Decomposition

A lighter WeKan-like app is a good first substantial target because it can be
split into capabilities:

```text
boards/lists/cards/users      -> sql-use or document-store capability
attachments                   -> blob-use
activity stream               -> sql-use + realtime-use
notifications                 -> network-use or queue-use
auth/session                  -> session-use
live board updates            -> realtime-use
frontend interactivity         -> browser sandbox runtime
server actions                 -> QuickJS/Wasm/process/machine driver
```

The system does not need to run all of Meteor first. It can start with a
lighter kanban app that exercises the same shapes. Then the original-code track
can measure how much real WeKan compatibility requires machine isolation,
framework adapters, MongoDB compatibility, or a document-store capability.

## Machine Isolation

For existing web apps, machine isolation is likely the most realistic baseline.
Many existing apps assume:

- access to `process.env`;
- unrestricted global APIs;
- framework-level route loaders;
- filesystem reads;
- HTTP clients;
- native dependencies;
- background tasks.

The sandbox package can still run them by putting them in a machine boundary and
restricting what that machine can reach.

The machine does not need broad network access. It can be placed on an isolated
network where the only reachable service is the Macchiato capability broker.
When the app tries to make an external request, the integration should route it
through a broker endpoint or a shimmed SDK. Stronger modes can block raw egress
entirely.

## Smaller Components

Not every endpoint needs a machine. The same package should allow smaller
components where the app/runtime can fit:

- QuickJS contexts for JavaScript server actions.
- WebAssembly components with explicit imports.
- Instrumented browser-side modules that do not receive real `window`,
  `document`, `fetch`, storage, or credentials.

These smaller components should use the same capability names and broker
contract as the machine driver. That keeps policies portable:

```text
network.request("pricing-api", ...)
storage.open("cache", ...)
secrets.derive("session-signing-key", ...)
```

The implementation backend changes, not the authority model.

## Frontend Sandboxing

Frontend sandboxing should be a first-class use of the same package.

A browser sandbox can run app code in:

- QuickJS/WebAssembly in the browser;
- an iframe with strict CSP and no ambient privileges;
- an instrumented module loader that hides globals;
- no-JS SSR fallback mode.

The frontend sandbox does not call arbitrary backend URLs. It calls brokered
server endpoints. Those endpoints are policy-bound and can use the same network
broker as server-side sandbox code.

This makes browser and server sandboxing composable:

```text
browser sandbox
    |
    v
brokered endpoint
    |
    v
server sandbox / network broker
```

## Existing Web App Compatibility

The package should have compatibility tiers:

- **native capability apps**: written directly against the Macchiato capability
  APIs.
- **adapted framework apps**: use adapters for framework request/response
  shapes, but network/storage is still brokered.
- **machine-isolated existing apps**: run mostly unchanged inside a constrained
  machine, with egress and credentials controlled outside.

This avoids pretending a small JS sandbox can run every existing app. The
package chooses the minimum isolation driver that can safely and practically run
the app.

## Request Flow

1. Receive request.
2. Resolve app and endpoint policy.
3. Validate request method, headers, content type, and body size.
4. Select or start isolation driver.
5. Create an invocation context with only named capabilities.
6. Invoke guest endpoint.
7. Broker any guest effects: network, storage, secrets, rendering, timers.
8. Validate response status, headers, body size, and content type.
9. Apply host response headers and CSP.
10. Log invocation metadata and capability usage.

## Non-Goals For The First Version

- Full browser emulation.
- Transparent support for every Node.js global.
- Perfect network compatibility for arbitrary libraries.
- Distributed scheduling.
- Multi-tenant billing.
- A complete plugin marketplace.

The first version should prove the contract with one or two drivers and one
network broker.

## First Useful Package Milestone

Build `@macchiato-dev/sandboxed-app-server` with:

- endpoint policy definitions;
- a local process or QuickJS driver;
- a network broker with allowlisted origins and paths;
- request/response size limits;
- audit records for invocations and brokered requests;
- an adapter that lets `@macchiato-dev/app` register one declarative sandboxed
  app endpoint.

After that, add the machine driver.

The machine driver should be an extension of the same package contract, not a
separate architecture.
