# A Markdown-based Code Playground
- Slug: a-markdown-based-code-playground
- Published: 2021-03-31
- Example: [markdown-based-code-playground](https://codesandbox.io/embed/markdown-based-code-playground-1sfkk?fontsize=14&hidenavigation=1&theme=dark&view=preview)

## Body

Here's a very simple Markdown-based code playground.

It has HTML, CSS, and JavaScript code snippets like [CodePen](https://codepen.io/) and [jsbin](https://jsbin.com/), except instead of appearing in different panes, they appear as Markdown code blocks.

If you change the code in the HTML, CSS, or JavaScript blocks, it will update the sandbox view below it. It also highlights each type of code in the editor (after the first keypress - we're investigating how to make it highlight on load). This is similar to what CodePen provides in that the CSS and JavaScript are in separate blocks rather than being wrapped inside of HTML tags, but also a bit more like a code notebook such as [Jupyter](https://jupyter.org/) and [Observable](https://observablehq.com/).

The building blocks for this are from [CodeMirror 6](https://codemirror.net/6/) and the [Unified.js](https://unifiedjs.com/) projects.

[markdown-based-code-playground](https://codesandbox.io/s/markdown-based-code-playground-1sfkk?file=/src/CodeEditor.js)

We are working on code sandboxes and code notebooks as tools to work with data and APIs. Our work is on [GitHub](https://github.com/ResourcesCo) and [GitLab](https://gitlab.com/ResourcesCo). Follow us at [@ResourcesCo on Twitter](https://twitter.com/ResourcesCo) for updates!
