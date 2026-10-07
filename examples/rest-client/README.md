# REST Desk

A small Insomnia-style REST workbench. The application is an ES module executed
inside the project's QuickJS machine, with a request editor, response headers,
JSON formatting, timing, HTTP error responses, and session-only draft recovery.
It has no application dependencies.

Import this directory as project files and choose `index.html` as the entry.
The project configuration must explicitly grant its sample API origin:

```json
{
  "entry": "index.html",
  "template": "html",
  "containerOptions": {
    "allowedFetchOrigins": ["https://httpbingo.org"]
  }
}
```

The controller accepts GET, HEAD, POST, PUT, PATCH, DELETE and OPTIONS, text
bodies, and explicit request headers. Requests and responses are capped at
1 MiB; request headers at 16 KiB. It never forwards ambient browser cookies,
referrers, redirects, or URL credentials. CORS applies normally. Grant another
HTTPS origin in the project configuration to inspect your own API. Do not
paste secrets into a request sent to the public demonstration service.

Both the frame and direct output controllers share `project-fetch.js`. The
output frame's CSP permits HTTPS connections by that trusted controller, not
by guest code: the machine exposes no native network API, and the controller
still requires the per-project origin grant. A direct-page embedding may
additionally need its own CSP to permit that origin.

API errors are response data, not transport failures. A 422 remains 422. The
UI does not follow response links or render response HTML; it displays text.
