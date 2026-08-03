# Browser network-capability inventory

Allowing a DOM element or attribute does not implicitly allow its network
effect. `dom-use` owns the shared schema and delegates parsing and CSS checks to
`html-use` and `style-use`. Specialized adapters such as `code-editor-use` do
not have to pay for that general runtime on every operation, but must be audited
against this inventory and prove their narrower policy cannot construct an
ungranted network surface.

Containers grant URL behavior separately, with destination patterns and an
effect such as `load`, `navigate`, `submit`, or `hint`. Automatic and
interaction-triggered requests both matter. Unknown URL-bearing constructs
remain denied until classified and tested.

## HTML

| Effect | Element and attribute combinations |
| --- | --- |
| Automatic load | `img[src|srcset]`, `source[src|srcset]`, `audio[src]`, `video[src|poster]`, `track[src]`, `script[src]`, `iframe[src]`, `embed[src]`, `object[data]`, `input[type=image][src]` |
| Relationship load/connection | `link[href]` with `stylesheet`, `icon`, `manifest`, `preload`, `modulepreload`, `prefetch`, `dns-prefetch`, or `preconnect`, plus future request-causing `rel` values |
| User navigation/submission | `a[href]`, `area[href]`, `form[action]`, submit controls with `formaction`, and additional requests from `a[ping]` |
| Document navigation | `meta[http-equiv=refresh][content]` |
| Embedded surface | `iframe[srcdoc]`; its value is not a request, but the nested document needs its own policy |
| Legacy/contextual URL | `background`, `manifest`, `icon`, `archive`, `codebase`, `longdesc`, `profile`, `usemap`, and URL-valued `cite`; even when a current browser does not fetch one, it is not ordinary text |

Companion attributes including `crossorigin`, `referrerpolicy`, `target`,
`download`, `rel`, `as`, `imagesrcset`, `imagesizes`, and `type` can change
whether or how a URL is requested. Validate them with it. Prefer qualified
schema rules such as `a.href` and `img.src` over a global `href` or `src` rule.

## SVG and mixed namespaces

SVG policy must be namespace-aware. Request/navigation surfaces include:

- `image`, `use`, `feImage`, `textPath`, and `mpath` with `href` or
  `xlink:href`;
- `script[href|xlink:href]` and `a[href|xlink:href]`;
- URL references in `fill`, `stroke`, `filter`, `clip-path`, `mask`,
  `marker-*`, and `cursor`; and
- `foreignObject`, whose HTML subtree needs an HTML policy.

The general structural path should reject SVG unless its container has an
explicit namespace-aware schema. Local fragments such as `url(#mask)` may be
granted separately from external URLs.

## CSS

Network-capable CSS includes `@import`; `@font-face src`; external `url(...)`;
`image-set()` and related image functions; and URL values in backgrounds,
borders, generated content, list markers, cursors, filters, masks, clipping,
and SVG presentation properties. A property allowlist does not grant its URLs.
`style-use` keeps URL rules and import permission separate.

## Script and browser APIs

DOM permission does not grant `fetch`, `XMLHttpRequest`, `WebSocket`,
`EventSource`, `sendBeacon`, location/navigation, workers, service workers,
module/dynamic import, `importScripts`, WebRTC, or media sinks. Higher-level
capabilities such as `http-use` grant these independently. Blob and data URLs
also need classification because they can create another execution/document
surface without contacting a server directly.

## Response headers and server output

- `Link`, including HTTP `103 Early Hints`, can cause `preconnect`,
  `dns-prefetch`, `prefetch`, `preload`, `modulepreload`, stylesheet, icon, and
  other relation requests. Remove unapproved destinations and relations.
- `Refresh` and redirect `Location` navigate outside the DOM.
- CSP reporting, `Report-To`, `Reporting-Endpoints`, and `NEL` can transmit
  browser reports.
- Cookies, authentication challenges, CORS, referrer policy, and cache headers
  modify authority or later requests and belong in the response schema.

Servers, caches, and proxies should use a small response-header allowlist and
must not forward arbitrary upstream headers into a sandboxed page.

## Current schema direction

```json
{
  "urls": {
    "a.href": "^https://[^/]+\\.wikipedia\\.org/",
    "img.src": "^https://images\\.example\\.test/"
  }
}
```

The existing `dom-use` and `style-use` `urls` rules are today's enforcement
primitives. Effect labels and namespace-qualified keys can evolve without
weakening their deny-by-default behavior.
