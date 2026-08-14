# @macchiato-dev/dom-use-lite

`dom-use-lite` is a zero-configuration WebAssembly-to-DOM boundary intended to
stop accidental exfiltration. Its published runtime will be one concise,
readable, commented JavaScript module. It supplies no guest runtime.

```js
import mount from "@macchiato-dev/dom-use-lite";

const app = await mount("/app.tar.gz", document);
```

Passing an element instead of `document` gives the guest that container. A
third argument may attach finite JSON-shaped JavaScript objects for explicit
coordination with trusted page code.

The standalone distribution is being developed in `/root/dom-use-lite`; this
workspace copy is where it is integrated with Macchiato's declarative apps and
browser tests.

See [DESIGN.md](DESIGN.md) for the requirements being stabilized before the
host implementation is minimized.
