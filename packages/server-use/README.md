# @macchiato-dev/server-use

`server-use` is the HTTP device between a server host and a machine controller.
It converts an allowed route into bounded plain data, exposes only named
request headers, and validates the controller's response descriptor before a
real `Response` is created.

The guest does not receive a host `Request`, `Response`, socket, environment,
or unrestricted `fetch`. It receives a route name and data expressible by the
machine wire format: plain records, arrays, strings, integers, booleans, null,
and `Uint8Array`.

```js
const server = new ServerUse({
  routes: [{ name: "home", method: "GET", path: "/" }],
  dispatch: message => controller.request(message),
});

return server.handle(request, authenticatedContext);
```

Routing is deliberately exact in 0.1. Parameterized route matching belongs in
a policy compiler, not in guest code. The caller supplies authenticated context
separately from request input, so `sql-use` can bind actor and tenant values
without trusting fields sent by the client or guest.

`ServerMachineController` implements the same `msg`/`onmsg` ABI used by browser
machines without importing DOM code. Requests and device results enter the
guest as wire values. A guest may issue asynchronous device calls; the
controller finishes them outside Wasm and delivers a later result message.
This lets MicroQuickJS remain synchronous internally without moving database or
network authority into the interpreter.

Large request bodies use `requestBody: "resource"`. `server-use` does not call
`arrayBuffer()` for those routes. Instead, dispatch receives a request-scoped
body resource that returns sequential chunks of at most 64 KiB and enforces a
route limit of up to 128 MiB while the stream is consumed. A controller can
grant that resource only for the current request:

```js
const result = await controller.request(message, {
  devices: {
    body: (operation, input) => operation === "read"
      ? resources.body.read(input[0])
      : resources.body.cancel(),
  },
});
```

Request-scoped devices disappear when the serialized guest request completes;
an unread stream is cancelled before `server-use` returns its response. This
keeps a project-sized body out of the one-shot wire message and prevents one
request from retaining or invoking another request's body authority.

Routes may independently raise their bounded response limit to 128 MiB as
well. This is useful when an authenticated large-write endpoint returns its
normalized resource: the controller can retain that response outside a small
guest arena while the guest still owns the status and header decision.
