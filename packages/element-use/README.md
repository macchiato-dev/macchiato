# @macchiato-dev/element-use

`element-use` is a small, fixed-shape container extracted for the Mahjong game
surface. It is intentionally not a replacement for the configurable `dom-use`,
`html-use`, `style-use`, or `browser-use` packages.

The outer controller creates a sandboxed iframe. It grants `allow-same-origin`
only so the trusted runner can load ordinary ES modules from its own package;
the untrusted game never receives the iframe's `window` or native `document`.
Its JavaScript runs in a dedicated QuickJS WebAssembly VM and talks to a minimal
host element bridge. The policy is hard-coded and readable in
[`src/policy.js`](src/policy.js): eight element names, a short attribute list,
the inline styles used by tile positioning, `click` events, 320 elements, and
base64 image data URLs only.

Two independent rolling one-minute limits protect the hot bridge:

- `rateLimit`: 10,000 guest-to-host calls;
- `imageLimit`: 50 MiB cumulatively assigned to `img.src` data URLs.

Replacing an image with the same URL counts again. This keeps accounting simple
and bounds decoding pressure without retaining or hashing large values. There is
no guest `fetch`, storage, navigation, external stylesheet, font, or script
capability. Resources are fetched by the parent under the project grant,
converted to data URLs, and passed into the guest as immutable inputs.

This narrow package is useful when a known component benefits more from an
auditable special-purpose surface than from a general schema engine. Changes to
the Mahjong DOM or CSS must be reflected explicitly in the policy and tests.
