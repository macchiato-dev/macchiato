# Frontend app

This directory is the live preview application controlled by the Pi agent. Its
`index.html` runs inside a same-origin iframe in the workspace Content tab at
`/agent-app/index.html`. Every completed change is reloaded in that iframe, so
write code intended to execute visibly inside this bounded frame rather than as
a standalone server or full browser shell. Make layouts responsive to the
iframe's dimensions and use root-relative `/agent-app/` asset URLs.

Keep it frontend-only: use HTML, CSS, browser-native ES modules in `.js` files,
and static assets. Do not add a backend, CommonJS, `.mjs` files, build step,
package manager, or external network dependency. Update the visible app
directly and finish by briefly stating what the user should now see in Content.
