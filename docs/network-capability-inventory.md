# Browser network-capability inventory

Allowing a DOM element or attribute does not implicitly allow its network
effect. `dom-use` owns the shared schema and delegates parsing and CSS checks to
`html-use` and `style-use`. Specialized machine guests do not have to pay for
that general runtime on every operation, but must be audited
against this inventory and prove their narrower policy cannot construct an
ungranted network surface.

Containers grant URL behavior separately, with destination patterns and an
effect such as `load`, `navigate`, `submit`, or `hint`. Automatic and
interaction-triggered requests both matter. Unknown URL-bearing constructs
remain denied until classified and tested.

## HTML

| Trigger | Effect | Element and attribute combinations | Default treatment |
| --- | --- | --- | --- |
| Parsing/mutation | Automatic load | `img[src|srcset]`, `source[src|srcset]`, `audio[src]`, `video[src|poster]`, `track[src]`, `input[type=image][src]` | Filter from sanitized input; deny direct assignment until both the attribute and qualified URL destination are granted |
| Parsing/mutation | Load and execute | `script[src]` | Filter/deny the element unless a specialized executable container explicitly implements it; a URL rule alone is insufficient |
| Parsing/mutation | Embedded browsing/plugin surface | `iframe[src]`, `embed[src]`, `object[data]` | Filter/deny by default; manually enabled containers must separately constrain the nested surface |
| Parsing/mutation | Relationship load/connection | `link[href]` with `stylesheet`, `icon`, `manifest`, `preload`, `modulepreload`, `prefetch`, `dns-prefetch`, or `preconnect` | Filter/deny by default; manually admit `link`, constrain `rel`, and grant `link.href` for the intended destination |
| Parsing/mutation | Responsive preload | `link[imagesrcset]` (usually with `rel=preload` and `as=image`) | Filter/deny each candidate as a URL list; admitting `link.href` does not implicitly admit `link.imagesrcset` |
| Parsing | Changes relative-URL resolution | `base[href]` | Filter/deny by default; this can redirect otherwise relative requests and navigation, so grant `base.href` only deliberately |
| Click | Navigation | `a[href]`, `area[href]` | Keep harmless text/content but filter a rejected element during sanitization; deny direct URL assignment |
| Click | Additional report request | `a[ping]` | Filter/deny the URL list independently of `a.href` |
| Submit | Form request | `form[action]`, `button[formaction]`, `input[formaction]` | Filter rejected sanitized subtrees; deny direct assignment |
| Parsing | Document navigation | `meta[http-equiv=refresh][content]` | Filter/deny `meta.content` by default; manually enabling it requires a qualified `meta.content` destination rule and a constrained `http-equiv` value |
| Parsing | Nested document, no direct request | `iframe[srcdoc]` | Filter/deny unless a container explicitly grants a separately sanitized nested-document surface |
| Contextual/legacy | Browser-dependent load, navigation, or reference | `html[manifest]`, `body|table|td|th[background]`, `applet[archive|codebase]`, `img[longdesc|usemap]`, `head[profile]`, and `blockquote|q|del|ins[cite]` | Treat the plain attribute as URL-capable and deny its URL values by default even where current browsers do not fetch it; same-document `usemap` fragments follow fragment policy |

Companion attributes including `crossorigin`, `referrerpolicy`, `target`,
`download`, `rel`, `as`, `imagesrcset`, `imagesizes`, and `type` can change
whether or how a URL is requested. Validate them with it. Prefer qualified
schema rules such as `a.href` and `img.src` over a global `href` or `src` rule.

## SVG and mixed namespaces

SVG policy must be namespace-aware.

| Trigger | Effect | Element and attribute combinations | Default treatment |
| --- | --- | --- | --- |
| Parsing/mutation | Automatic load | `image[href|xlink:href]`, `use[href|xlink:href]`, `feImage[href|xlink:href]` | Filter sanitized elements and deny direct assignment without a qualified URL rule |
| Parsing/mutation | External reference | `textPath[href|xlink:href]`, `mpath[href|xlink:href]` | Filter/deny external values; same-document fragments follow the separately configurable fragment policy |
| Parsing/mutation | Load and execute | `script[href|xlink:href]` | Filter/deny unless an executable SVG container explicitly implements it |
| Click | Navigation | `a[href|xlink:href]` | Filter/deny external values; fragments may be granted independently |
| Rendering/style | Paint/filter/resource reference | URL values in `fill`, `stroke`, `filter`, `clip-path`, `mask`, `marker`, `marker-start`, `marker-mid`, `marker-end`, and `cursor` | Ordinary colors/keywords remain attribute values; `url(...)` is filtered/denied unless its fragment or external destination is granted |
| Parsing | Embedded HTML surface | `foreignObject` | Filter/deny unless a namespace-aware container supplies a separate HTML subtree policy |

The general structural path should reject SVG unless its container has an
explicit namespace-aware schema. Local fragments such as `url(#mask)` may be
granted separately from external URLs.

## CSS

| Trigger | CSS construct | Common sinks | Default treatment |
| --- | --- | --- | --- |
| Stylesheet parsing | `@import` | Imported stylesheets | Denied unless `imports: true`; every imported URL must also match a URL rule |
| Font selection | `@font-face src` | Remote fonts | `url(...)` denied without a destination rule; `src` must also be an allowed declaration in the relevant at-rule policy |
| Paint/layout | `url(...)` | `background*`, `border-image*`, `content`, `list-style*`, `cursor`, `filter`, `clip-path`, `mask*`, SVG presentation properties | Denied as a URL regardless of whether the property itself is allowed |
| Paint/layout | `image-set()` and `-webkit-image-set()` | Backgrounds, generated images, borders | Quoted and bare candidates are extracted and denied unless each matches the property's URL rule |
| Future/unknown | New image or resource functions and request-capable at-rules | Any | Deny until classified and covered by tests |

“Filtered” describes permissive HTML sanitization: the rejected element/subtree
is omitted. “Denied” describes strict sanitization and direct guest mutation:
the operation throws. `attrs` is still the first gate. The second gate treats
the unqualified attribute name as URL-capable by default, while destination
rules prefer the qualified `tag.attribute` key. This means allowing ordinary
`href` syntax does not accidentally grant every `href` context.

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
