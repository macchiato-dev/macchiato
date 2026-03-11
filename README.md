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
indeed exact (in npm an exact version is with an `=` sign or a bare
version number - I've used an equal sign because in cargo, a bare version
number is not exact, but instead also supports a patch version, the
equivalent of starting with a `^`). Once audited, make a note of the
package name and version number.

The program `view-md` starts a simple HTTP server on a random port, and
gives you a link to view it in the browser. It shows the content of
README.md neatly formatted. It prevents accidentally following links, by
having you approve them after clicking them, and once approved, allowing
you to simply click the link to go to the destination.

`view-md` is intentionally quite simple, so it can easily be audited. It
only supports small documents on a small subset of Markdown. As Macchiato
grows, it will include tools for loading more complex Markdown documents.
However, many Macchiato tools only support subsets of formats, and they
will show an error rather than attempt to process a document that it
doesn't know how to process.

Having it require clicking on a link to follow it is to prevent exfiltration.
This enables some sandboxing workflows.

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

Now, this may seem unlikely, but it's because we avoid running untrusted
code! However, if we could run untrusted code, that unlocks more
possiblities. Data processing tools could be more easily crowdsourced.
You could run the program and see if the output is interesting, and only
if you see potential go through the trouble of auditing the code before
using the output.
