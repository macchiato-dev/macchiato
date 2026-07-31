# Building a Visual JSON Editor - Part 2 of ?: Code View
- Slug: building-a-visual-json-editor-part-2
- Published: 2020-10-21
- Example: [Code values](/-/blog-examples/vtv/index.html?preset=code)

## Body

([Previous post here.](/blog/building-a-visual-json-editor))

We're working on a visual JSON editor that will make it easy to edit all sorts of JSON data. Because JSON is used by countless APIs, it contains all the different types of data APIs contain. While a neat JSON document like a package.json contains maybe a dozen or two nodes with each leaf node having no more than a couple hundred characters, JSON documents found in the wild can contain hundreds or thousands or tens of thousands of nodes, multiline strings, and binary data encoded as base64.

This post is about viewing and editing multiline strings, that can be found in a lot of different types of APIs including Content Management Systems (like WordPress or Ghost), Functions as a Service providers (like AWS Lambda, OpenFaas, or Vercel), Email Providers (like MailJet), and code repository hosts (like GitHub and GitLab).

[vtv](https://github.com/ResourcesCo/resources/tree/develop/packages/vtv) has a code view based on CodeMirror.

In JSON, strings can only appear in a single line. The \n escape sequence is used to store multiline strings.

This is practical for serialization, is inconvenient for working with strings in multiple lines. As JSON is used for more and more things, this limitation is becoming more noticeable, and alternatives like YAML are being used more often, and [new formats are being developed](https://nestedtext.org/en/latest/).

To facilitate editing code, [CodeMirror](https://codemirror.net/) is used with react-codemirror2.

To integrate it with Next.js, the CSS files are added to pages/_app.tsx and a dynamic import is added to load CodeMirror only in the browser, because it depends on navigator which is not available on the server.

The [previous post](/blog/building-a-visual-json-editor) describes the state , which contains information for each node, such as whether it is expanded or not. This is also where it stores what format each node is, for syntax highlighting. The data is passed in as the value prop to the [vtv](https://github.com/ResourcesCo/resources/tree/develop/packages/vtv) React component, and these details are passed in as the "state" prop. Here is the data and state for a JSON object containing some HTML and CSS:

Here is the view with the above value and state:

As you can see, each code block is highlighted with its language. The language can be changed by selecting View from the menu that pops up when clicking on a node.

To get JSON in and out of it, click the parent node and select View > JSON, and copy and paste from the JSON code editor that appears.

There are numerous things that can be improved:

This can be used to make API requests in the [Resources.co](https://console.resources.co/) console, and we've tested sending emails on SendGrid using the code view. To keep up with future developments, follow us on social media at one of the links in our footer.
