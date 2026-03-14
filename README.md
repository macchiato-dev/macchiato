# macchiato

> [!NOTE]
> The `view-md` program hasn't been implemented or published yet.

This is a system, composed of various npm modules in the
[@macchiato-dev](https://www.npmjs.com/org/macchiato-dev)
npm organization, for document-driven workflows.

These documents are structured, semi-structured, or even unstructured files
that contain content. Examples of content include:

- Plain text
- Rich text
- Hypertext
- Raster images
- Vector images
- Hierarchical data
- Tabular data
- 3D models
- Audio
- Video

A document can appear in a variety of formats. Markdown has a special role in
Macchiato. Markdown, with internal DSLs, is used to visualize, generate,
compress, transform, connect (through links), and annotate all sorts of data.
For instance tabular data can be formatted as a GFM table, a nested list, or
a code block. Hierarchical data can be formatted as a nested list. Markdown
is also used to structure binary data.

These tools are designed to do one thing, and to do it well, and to be
auditable. To try out Macchiato, you can start by viewing this README by
downloading it and running:

```sh
npx @macchiato-dev/view-md@0.0.1 README.md
```

Before you do that, you can audit the code, by looking at the contents of
the npm package and its dependencies. To download the code to audit, you
can create a new directory, run `npm init -y` to create `package.json`,
and install it with `npm install @macchiato-dev/view-md@0.0.1`. This will
place all the code in `node_modules`.

You can audit it once and be confident that if you install it with the
same version again, it won't change, because I've taken care to make sure
the versions are exact for each dependency in the dependency tree for
`view-md@0.0.1`, and npm [doesn't allow the code for a version to change
once it's been published](https://docs.npmjs.com/policies/unpublish).
Each version in the dependency tree is set to an exact version, by
specifying it like `"packagename": "=1.0.0"`. Carefully audit all files
in `node_modules`. Check that in `package.json` the version numbers are
indeed exact. Once audited, make a note of the package name and version
number.

The program `view-md` starts a simple HTTP server on a random port, and
gives you a link to view it in the browser. It shows the content of
README.md neatly formatted. 

`view-md` is intentionally quite simple, so it can easily be audited. It
only supports small documents on a small subset of Markdown. This ensures
performance. As Macchiato grows, it will include tools for loading more
complex Markdown documents. However, many Macchiato tools only support
subsets of formats, and they will show an error rather than attempt to
process a document that it doesn't know how to process.

It prevents exfiltration of data by making it so links can't be opened
but have to be copied and pasted, unless they are allowed by passing a
parameter when running `view-md`. It handles links that appear likely
to have a significant amount of data embedded in them differently.
The parameters to allow a link to be opened on click accept a pattern
for the link, such as a hostname or a hostname with a path, but require
an additional prefix to allow long links to be opened on click. These
long links can still be opened manually through copying and pasting.
The same options are available in programmatic usage of the viewer.

It also does the same with image URLs, though with images the copying
and pasting is going to be clunkier, and for a good experience allowing
them using a parameter will be more important. There is a parameter for
allowing them to load after clicking a button that is shown next to the
image URL. Images are often more demanding on exfiltration prevention
because they more commonly have long IDs in the URLs which can be used
to hide data, so embedding the images is encouraged. A fenced code
block with base64 data can be used, with newlines, for pure markdown
that is viewable using a text editor. This is built into view-md,
though by default it requires clicking to view the content. Other tools
will support more efficient ways of embedding images, such as CBOR,
zip, tar, or a binary format based on Markdown (`.mcb`, Markdown
container binary).

The viewing of links and images works by updating the inline
representation of the link with a name, using the index of the block
as well as the index of the inline element, and showing details after
the block. The details will include a copy and pastable URL. If an
option to allow loading images in place is given, a button to load the
iamge is shown. The detail view can be closed simply by clicking an X
which will also set the inline reference back to what it was. The
details will also show the title and alt text. This will make it copy
and pastable.

This exfiltration prevention enables some sandboxing workflows.

Picture this scenario:

- You have private data, which is a CSV file containing unpublished numbers
- You hire a new freelancer to write a program to analyze that data, and
  give you a report in Markdown, with the CSV file as input
- The freelancer sends you the program
- You run that program in a sandbox that has no network access
- It outputs the Markdown file, and you run `view-md` on it, and open it in
  your browser

Let's assume that the program written by the freelancer is untrusted code,
and that's why you're running it in the sandbox. We've already established
that the data is private. That meets two conditions of [The Lethal
Trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)! The
third is the ability to externally communicate. For this, you have to ask
how the untrusted code could communicate externally. In this case, it could
be by linking to a server, with private data included in the link. Remember
that the untrusted code is taking the private data as input, and is
generating a Markdown file. Now, it could base64 encode the private data
and stick it in a link to a server controlled by a malicious party. The
link could be designed to look interesting, and upon clicking it, the
base64 data would show up in the server's logs, and the person with access
to the server could decode it and they would then have the private data!

This may seem unlikely, but it's because we avoid running untrusted code!
However, if we could run untrusted code, that unlocks more possiblities.
Data processing tools could be more easily crowdsourced. You could run the
program and see if the output is interesting, and only if you see
potential go through the trouble of auditing the code before using the
output.

# First implementation

To start the implementation, pre-release packages are being written so it
can be used to render a website from Markdown.

This is composed of these packages:

- parse-layout: parses layout info from a subset of Markdown
- render-layout: creates/updates layout in the DOM using output from
  parse-layout
- parse-prose: parses prose from a subset of Markdown
- render-prose: creates/updates prose in the DOM using output from
  parse-prose
- build-static: provides a partial DOM for the renderers on the server
  side and renders it statically

These will be under `packages/`. There will also be examples under
`examples/`.

The protocol between parse and render will be contextual instructions in
a format inspired by MessagePack: hypertokens and hypertables. In
MessagePack there is [a table with a meaning of the first byte](
https://github.com/msgpack/msgpack/blob/master/spec.md#overview). This
will build and update in memory structures. For instance in the layout it
could have a code in the table for starting the title, and the next code
for starting a string with the length. However, being called hypertokens
instead of embedding a full string in memory, it could build it from
tokens. And if a sequence of tokens isn't reused, the sequence could be
preserved in the token definition, and the first token and the length
could be used, to use the tokens separated by spaces. So if I said
*frolicking purple narwhals* storing the tokens next to each other and
rendering them sequentially would be better than having to specify the
ID of each token individually. And this would also work for "sauté the
rutabaga" but with a special command that templates it with "the".
