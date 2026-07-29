# browser-use

`browser-use` grants QuickJS opaque handles to one live browser subtree. It is
for widgets that need selection, layout, or incremental native DOM behavior
that the serialized `dom-use` tree cannot preserve.

The guest gets a deliberately ordinary-looking `document` wrapper with scoped
`querySelector`, `querySelectorAll`, and a small property surface. Every call
is forwarded as JSON to `BrowserDomHost`; native nodes never enter QuickJS.
Selectors, reads, and writes are allowlisted.

The host also detects the actual subtree shape at mount time and after every
mutation. A policy limits tags, attributes, class-name patterns, depth, element
count, and text. A violation disconnects observation and clears the granted
root. Specialized adapters should narrow this generic policy further.
