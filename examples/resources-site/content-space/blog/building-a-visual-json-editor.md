# Building a Visual JSON Editor - Part 1 of ?
- Slug: building-a-visual-json-editor
- Published: 2020-09-21

## Body

Some time ago, we embarked upon building a group chat like UI with a visual JSON editor. Our work in progress is at [console.resources.co](https://console.resources.co/) and is downloadable as an Electron-based Mac app. It is Open Source and our code is available both on [GitHub](https://github.com/ResourcesCo/resources/) and [GitLab](https://gitlab.com/ResourcesCo/resources). This is the beginning of a series documenting how it is being built.

JSON data is in a hierarchy, with a root node, interior nodes, and leaf nodes. To make it easy to see at a glance what the nodes are, the node names are shown in bubbles.

This applies not just to key value pairs in a JSON object but to array elements.

- Example: [Visual hierarchy](/-/blog-examples/vtv/index.html?preset=hierarchy)

By choosing an indentation level that isn't too shallow, and using a familiar bubble style for all of the keys (object keys and array indexes), it's easy to see what the underlying JSON data is like. Also the number of items is wrapped in the type of brackets used in the JSON: curly braces for objects and square brackets for arrays.

The implementation is in React with [styled-jsx](https://github.com/vercel/styled-jsx). The key classes involved in showing the visual hierarchy are NodeView and NodeNameView . NodeNameView was settled on partly because it sounds like [No Name Key](https://en.wikipedia.org/wiki/No_Name_Key) which is not far from where we're based, in Miami.

NodeView creates a row with the NodeNameView, and sets up the menus, which can be activated by clicking on the name, or by clicking on the triple dots on the right side of the screen (cropped out of the picture above). The children are rendered underneath it, with padding according to the nesting level.

Expanding/Collapsing is an obvious feature of any tree editor. Here it's implemented by keeping track of whether each key is expanded. This is done by having two properties in the component, value and state . Upon clicking the expand button, a message is passed to the top of the tree, and the state for the node is updated to expanded . The state follows the same hierarchical structure as the value , except because it's designed to support editing any JSON, the properties like expanded are prefixed with an underscore. If there is a key starting with an underscore in the value , it is prefixed with an extra underscore.

If the node is expanded, it renders the children, and if it is not, it doesn't. This way a large JSON object won't cause a slowdown of the page, unless it is expanded. Adding pagination is a future task.

State is managed using messages that update the value and the state. The messages contain a path to the node being updated, which is a list of keys, and an action such as edit or insert . There is a major missing feature, undo, and a lot of room for improvement. Still it works surprisingly well most of the time.

It is immutable but we may go mutable, with something like MobX, in the future. It is in a separate package from the React component library. The react component library is called [vtv](https://github.com/ResourcesCo/resources/tree/develop/packages/vtv) (Versatile Tree View) and the state management library is called [vtv-model](https://github.com/ResourcesCo/resources/tree/develop/packages/vtv-model).

Thank you for reading! Please check out the [code](https://github.com/ResourcesCo/resources) and/or the [demo](https://console.resources.co/), and follow our social media for more updates about our tools for interacting with data and APIs!
