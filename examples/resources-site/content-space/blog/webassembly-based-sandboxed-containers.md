# WebAssembly-based Sandboxed Containers
- Slug: webassembly-based-sandboxed-containers
- Published: 2026-08-03

## Body

For some time I've been working on the problem of running untrusted and semi-trusted code in containers. The thought is that it would be cool if I could run code from a new contractor that I just met or from agentic coding on private data without first verifying it, if it was running in a strict enough sort of container. One such sort of container would be a MicroVM without any network access.

As an example of untrusted code with private data, think of a super fancy presentation of earnings that can't be leaked ahead of time. If I had someone develop it in a web page, if the web page could load an image from an arbitrary web server, it could encode the data in the URL, and someone with access to the server logs could get the URL, decode it, and they'd have access to the private data.

I developed a project, [ristretto](https://news.ycombinator.com/item?id=41022890), with this in mind, and in the process found that WebAssembly was my favorite approach. I had used Content Security Policies with iframes, but while they are good for isolation, they don't control access at the level I wanted, and prevention of following links is a kludge (I wrapped in a nested iframe to prevent exfiltration by socially engineering someone into clicking a link that encoded the private data).

Today I present the beginning of a project to run code in WebAssembly with containers that only allow limited interactions. This means that code that is sandboxed and resistant to exfiltration can run without an iFrame and it controls its behavior. The containers are currently alpha, but conceptually they should limit the code running in WebAssembly to only be able to access specific things. Something that predates this and inspires it is [WASM-4](https://wasm4.org/), which grants access only to a pixel-based display and input, but this extends it further, by allowing access to various resources in a web page, and controlling the size and complexity and frequency of interactions.

![Private data enters a WebAssembly sandbox whose narrow capability channels produce a browser document.](/-/blog-images/webassembly-capability-container.png "A WebAssembly container exposes selected capabilities instead of the surrounding browser.")

Here are the current containers:

- [Article](/try?template=article): a small set of semantic HTML elements, constrained styles, and links that match configured URL patterns.
- [Page](/try?template=hello): a more general layout vocabulary whose DOM and CSS remain controlled by schemas.
- [SVG](/try?template=mark): a bounded vector surface for declarative shapes, paths, text, and gradients.
- [Canvas](/try?template=ball): limited drawing and animation operations instead of access to the surrounding browser.
- [Code Editor Use](/try?template=article): a constrained CodeMirror surface used by the playground to edit the selected container's files.

![Five bounded surfaces represent article, page, SVG, canvas, and code editor containers.](/-/blog-images/webassembly-container-surfaces.png "Containers assemble WebAssembly machines, *-use modules, and reviewed configurations for a particular kind of document.")

A container is a reusable environment made from WebAssembly machines, *-use modules, and their configurations, so a project can select a reviewed capability set rather than rebuilding one each time.

These are backed by components like dom-use, which takes the concept of *browser use*, and applies it to specific parts of the DOM.

I have one in development, which is working, called *Code Editor Use*, which provides a surface for CodeMirror. It is actually used in the playground.

Code Editor Use runs the editor setup inside QuickJS compiled to WebAssembly. A host bridge forwards the DOM operations and input events that the container permits. Similar work is underway for prose editing. An editor that genuinely needs a much broader browser surface can still use an iframe on a separate origin, but the iframe-free path is an important feature of robust *-use modules whose configurations are narrow enough for the content they host.

This is alpha software, not yet a claim that arbitrary hostile code is safe. The capability boundaries, resource limits, event handling, URL rules, and host implementations need continued testing and auditing. The useful direction is that authority becomes explicit: network access, storage, links, elements, styles, and host operations can each be absent or narrowly granted instead of arriving together with a browser global.

The goal is a practical middle ground between trusting an application and putting every small application in a full virtual machine. A tiny tool should be able to start quickly, run locally or on a server, and receive only the capabilities its job requires. If these containers can become more compatible without becoming less inspectable, they could make it much easier to try agent-generated tools and third-party interactive documents on sensitive data. The next step is to keep making the contracts smaller, the behavior more predictable, and the security properties easier to test and audit.
