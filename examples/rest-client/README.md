# REST Desk

A small Insomnia-style REST workbench. Each project has a name, base URL and
collection of named requests. A desktop sidebar becomes an overlay on narrow
screens, including the project's split output pane. Create, duplicate, rename
and delete requests; switch projects without losing their edits. Relative
request paths use the selected project's base URL, while full URLs override it.

Headers and query parameters have editable name/value rows, enable switches,
and add/remove controls. The resolved URL shows encoded parameters before
sending. Each request retains its own response, response tab and JSON-format
setting while the app is open—even when switching during a pending request.
Collections and the selected request persist in session storage; responses do
not. There is no server-side collection storage or application dependency.

The application is an ES module executed inside the project's QuickJS machine.
Changing a base URL is not a network permission grant.

## Markdown interchange

The sidebar exports the current collection (one project) or all projects as
ordinary Markdown. The import/export dialog exposes the text for copying to a
file or pasting from one, without clipboard or filesystem permissions. Imports
append projects; malformed input leaves the existing collection untouched.

Projects and requests use headings. Metadata uses labeled list items. Headers
and parameters use task lists: `[x]` means enabled, `[ ]` means disabled. String
values are JSON string literals inside Markdown code spans, so empty values,
backticks and embedded newlines survive a round trip. Bodies use fenced code
blocks; fences grow when the body contains backticks. Request order and duplicate
header/parameter names are retained. Internal IDs and response data are omitted.

````markdown
# REST Desk

## Project
- Name: `"Demo API"`
- Base URL: `"https://httpbingo.org"`

### Request
- Name: `"Find items"`
- Method: `"GET"`
- URL: `"/get"`

#### Parameters
- [x] `"search"`: `"hello world"`

#### Headers
- [x] `"Accept"`: `"application/json"`
- [ ] `"X-Debug"`: `"true"`

#### Body
```text

```
````

`markdown.js` contains the small, strict reader/writer for this format.

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
