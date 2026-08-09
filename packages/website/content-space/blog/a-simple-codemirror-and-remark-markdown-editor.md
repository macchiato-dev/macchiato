# A Simple CodeMirror and Remark Markdown Editor
- Slug: a-simple-codemirror-and-remark-markdown-editor
- Published: 2021-02-28

## Body

Here is a [simple CodeMirror 6 and Remark Markdown Editor](https://codesandbox.io/s/codemirror-remark-editor-4m4z9?file=/src/App.js), with syntax highlighting and a live preview, written in React, on CodeSandbox.

It uses React hooks, with [useDebounce](https://github.com/xnimorz/use-debounce) to make it so it only updates every few hundred milliseconds, and with a useImperativeHandle hook so it can provide its own interface to get the text from CodeMirror.

- Example: [CodeMirror and Remark Markdown editor](/-/blog-examples/markdown-editor/index.html)

The CodeEditor and MarkdownView components are simplified versions of what we're using in the new [web app](https://github.com/ResourcesCo/app) we're building.
