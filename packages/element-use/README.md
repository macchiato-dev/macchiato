# @macchiato-dev/element-use

`element-use` is the deliberately small element capability used by the Mahjong
example. The complete library consists of two readable JavaScript files:

- [`host.js`](host.js) contains the fixed policy, validation, rate accounting,
  native element bridge, and QuickJS setup.
- [`guest.js`](guest.js) runs inside QuickJS and exposes only the DOM-shaped API
  the game needs.

There is no iframe code in the library. A composing application supplies a root
element and decides whether that root lives in the page, an iframe, or another
container. The example owns its script-only iframe and invokes `host.js` from
inside it.

The package has no npm dependencies. `host.js` imports pinned
`quickjs-emscripten@0.32.0` browser modules from jsDelivr. The example loads the
tile art from jsDelivr too; its only local library import is `host.js`, which in
turn reads the local `guest.js` source for evaluation inside QuickJS.

The hard-coded policy allows nine elements, a short attribute and inline-style
list, `click`, 320 elements, 10,000 bridge calls per minute, and 50 MiB of
cumulative base64 image assignments per minute. Each image is capped at 8 MiB.
There is no guest network, storage, navigation, external stylesheet, font, or
script capability. The example fetches its approved inputs and passes data URLs
to the guest.

```js
import { mountElementUse } from "./host.js";

const controller = await mountElementUse({
  root: document.querySelector("#game"),
  source: gameHtml,
  guestUrl: "./guest.js",
  resources: approvedDataUrls,
});

controller.destroy();
```
