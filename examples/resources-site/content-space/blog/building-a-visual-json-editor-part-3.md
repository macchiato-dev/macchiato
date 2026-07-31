# Building a Visual JSON Editor - Part 3 of ?: Data Type Detection
- Slug: building-a-visual-json-editor-part-3
- Published: 2021-01-22
- Example: [Strings and non-strings](/-/blog-examples/vtv/index.html?preset=types)

## Body

([Previous post here.](/blog/building-a-visual-json-editor-part-2))

In this post, I'm sharing some info about our ongoing project to build a visual JSON editor.

In JSON, all strings are wrapped in double quotes. This adds a small amount of visual noise, and requires typing a couple extra keystrokes, but it makes it unambiguous whether something is a string or not.

We're building something that is a little bit more like a spreadsheet. In a spreadsheet, you don't have to put every string in quotes. However, it is a little bit ambiguous, and sometimes requires selecting a number format.

We solve the problem in much the same way [YAML](https://yaml.org/) does, by wrapping strings that would not be strings if they weren't quoted in double quotes.

For instance, take the strings "1" and "true" in JSON. Those are strings. If you remove the quotes, they'll turn into the integer value 1 and the boolean value true . If you have the strings in a JavaScript variable, you can get the length of them and convert them to uppercase, but not with the integer or boolean values!

Our editor is based on JSON, which only supports a few non-string values: booleans, numbers, and null. YAML supports more, including alternative representations of booleans such as yes and no . Some have meant for no to mean Norway, but had it read in as false , causing issues. Syntax highlighting helps, and we can do highlighting in our visual editor.

To determine whether a value needs quotes, we just try parsing it as JSON. If it parses as JSON, it needs quotes.

For instance, the string "hello" doesn't need quotes. On the other hand, "1234" does need quotes; otherwise it will be interpreted as a number.

What if we want a string that contains a double quote followed by the letter "s" followed by another double quote?

Simple. We escape the quotes. It's "\"s\"" . This parses as JSON.

For an empty string, we also show the JSON. It is just an empty pair of quotes: "" .

If you delete all the text and then unfocus it, it turns into null. To set a value to an empty string, type an empty pair of quotes.

To wrap it up, here is an example of some strings and non-strings:

You can try editing the values in the interactive demo, and watch the formats change. To see the JSON, click one of the node names (the bubbles) and View > JSON.

This works well, but there are tradeoffs. On one end, with JSON, there is very little ambiguity because all strings are quoted. On the other end, with spreadsheets, you can't always tell just by looking at something whether it is text or not — it requires looking at the format. This is in between, where some strings are quoted. We will need to iterate on vtv to get to the point where developers, ourselves included, want to use it regularly, and as we get feedback, we may adjust how this works. Based on what we've observed so far, with YAML, and with testing our own tool out, it seems likely that this is a [sensible default](https://stevebennett.co/2017/07/24/the-power-of-sensible-defaults/).

We are working on this visual JSON viewing and editing component, vtv, to improve the [Resources.co console](https://console.resources.co/) which is somewhere between a code notebook like Jupyter and a group chat (Slack, Discord) for developers. We also want it to be useful as a standalone component. To keep up with future developments, follow us on social media at one of the links in our footer.
