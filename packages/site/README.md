# @macchiato-dev/site

SSR site framework for Macchiato pages.

`site` sits above `dom-use`, `html-use`, `style-use`, and the QuickJS runtime.
It is responsible for full HTML documents, page transitions, and deployment
policy. It does not replace the lower-level validators.

## Shape

- Server-side render a complete HTML document.
- Serve authored CSP as policy, after validation.
- Support page transitions by swapping trusted pre-sanitized HTML.
- Fall back to client-side WebAssembly sanitization when trusted pre-sanitized
  HTML is unavailable and the policy allows it.
- Fall back to normal document navigation when neither safe transition path is
  available.

## Schema Scope

The first version should use one effective DOM/CSS/resource/runtime schema for
the whole site. Different routes can eventually have different schemas, but
site-wide schema policy keeps the first SSR and transition model simple and
easier to audit.

Route-level schemas are still part of the design direction. When added, route
policy should narrow or explicitly replace the site schema through the cascade
engine, with provenance recorded for debugging and review.

## Trusted Pre-Sanitized HTML

The efficient transition path is a trusted pre-sanitized HTML swap. A build or
publishing step sanitizes HTML ahead of time, writes it to a restricted location,
and the browser can swap it without running the sanitizer.

Good candidates:

- a specific object-storage bucket exposed through a fixed HTTPS origin or path;
- a specific CDN prefix backed by restricted writes;
- same-origin server output that is known to be sanitized.

The important constraint is write access. The pre-sanitized HTML cache is part
of the trusted computing base. It should be written only by the sanitizer/build
pipeline, not by arbitrary app users or broad production roles.

## SQLite Routes

For local development, a site can be mapped by subdomain and served from route
rows in SQLite. Each row stores a friendly path, title, HTML body, CSS, optional
head content, optional CSP, and transition metadata.

The Macchiato app resolves the request subdomain first. If rows exist for that
subdomain in `site_routes`, the request path is matched against those rows and
rendered as a full SSR document. This supports local routes such as:

- `http://resources-co.localhost:8765/`
- `http://resources-co.localhost:8765/resources/containers`
- `http://resources-co.localhost:8765/macchiato/components`

The CLI can load simple local-dev routes:

```sh
macchiato site add-route resources-co /resources/containers page.html styles.css --title "Containers - Resources.co"
```

This is deliberately separate from the trusted pre-sanitized cache. SQLite route
storage is useful for development and small self-hosted sites; production write
access still needs to be narrow and explicit.

## Fallback

If the pre-sanitized HTML is not present on the server or cache, and the policy
allows browser WebAssembly, the client can fetch unsanitized source and sanitize
it locally before swapping. If WebAssembly is unavailable or disallowed, the
framework should use normal document navigation.

The fallback order is:

1. trusted pre-sanitized swap;
2. client WebAssembly sanitize-and-swap;
3. document navigation.

## Current API

- `renderDocument` renders a full SSR HTML document.
- `initSiteDb` initializes the SQLite route table.
- `putSiteRoute`, `getSiteRoute`, and `renderSiteRoute` store and render route
  rows.
- `createSitePolicy` normalizes transition policy.
- `chooseTransitionMode` selects the transition strategy for a navigation.
- `isTrustedTransitionSource` checks configured trusted sources.
- `createTransitionManifest` emits client-safe transition metadata.
