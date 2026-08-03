import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBlogPostMarkdown(markdown, filename = "blog post") {
  const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
  const title = /^# (.+)$/.exec(lines[0] || "")?.[1]?.trim();
  const slug = /^- Slug: (.+)$/.exec(lines[1] || "")?.[1]?.trim();
  const published = /^- Published: (.+)$/.exec(lines[2] || "")?.[1]?.trim();
  if (!title || title.length > 160) throw new Error(`${filename}: invalid title`);
  if (!SLUG.test(slug || "")) throw new Error(`${filename}: invalid slug`);
  if (!DATE.test(published || "") || Number.isNaN(Date.parse(`${published}T00:00:00Z`))) throw new Error(`${filename}: invalid publication date`);
  let offset = 3;
  const examples = [];
  const parseExample = (line) => {
    const match = /^- Example: \[([^\]]{1,200})\]\((https:\/\/[^\s)]+|\/-\/blog-examples\/[A-Za-z0-9._~?&=/%+-]+)\)$/.exec(line);
    if (!match) throw new Error(`${filename}: invalid example`);
    const external = match[2].startsWith("https://");
    const url = new URL(match[2], "https://resources.invalid");
    if (external && (url.hostname !== "codesandbox.io" || !url.pathname.startsWith("/embed/"))) throw new Error(`${filename}: unsupported example host`);
    if (!external && !url.pathname.startsWith("/-/blog-examples/")) throw new Error(`${filename}: unsupported local example`);
    return Object.freeze({ title: match[1], url: external ? url.href : `${url.pathname}${url.search}`, external });
  };
  while (lines[offset]?.startsWith("- Example: ")) {
    examples.push(parseExample(lines[offset]));
    offset += 1;
  }
  if (lines[offset] !== "" || lines[offset + 1] !== "## Body" || lines[offset + 2] !== "") throw new Error(`${filename}: expected a Body heading after metadata`);
  const parseBodyBlock = (value) => {
    const blockLines = value.split("\n").map((line) => line.trim()).filter(Boolean);
    if (blockLines.every((line) => line.startsWith("- ")) && !blockLines.some((line) => line.startsWith("- Example: "))) {
      return Object.freeze({ type: "list", items: Object.freeze(blockLines.map((line) => line.slice(2))) });
    }
    const flat = blockLines.join(" ");
    if (flat.startsWith("- Example: ")) return Object.freeze({ type: "example", example: parseExample(flat) });
    const image = /^!\[([^\]]{1,300})\]\((\/-\/blog-images\/[a-z0-9]+(?:-[a-z0-9]+)*\.png) "([^"]{1,500})"\)$/.exec(flat);
    if (image) return Object.freeze({ type: "image", alt: image[1], src: image[2], caption: image[3] });
    return Object.freeze({ type: "paragraph", markdown: flat });
  };
  const body = lines.slice(offset + 3).join("\n").trim().split(/\n{2,}/).map(parseBodyBlock);
  const paragraphs = body.filter((item) => item.type === "paragraph").map((item) => item.markdown);
  if (!paragraphs.length || paragraphs.some((value) => value.length > 5_000)) throw new Error(`${filename}: invalid body`);
  const orderedBody = examples.length
    ? [...body, ...examples.map((example) => Object.freeze({ type: "example", example }))]
    : body;
  return Object.freeze({ title, slug, published, paragraphs: Object.freeze(paragraphs), examples: Object.freeze(examples), body: Object.freeze(orderedBody) });
}

export function loadBlogPosts(root = process.env.RESOURCES_CONTENT_ROOT || resolve("examples/resources-site/content-space"), locale = "en") {
  const directory = locale === "en" ? join(resolve(root), "blog") : join(resolve(root), locale, "blog");
  let names;
  try {
    names = readdirSync(directory).filter((name) => name.endsWith(".md")).sort();
  } catch (error) {
    if (error?.code === "ENOENT") return Object.freeze([]);
    throw error;
  }
  const posts = names.map((name) => parseBlogPostMarkdown(readFileSync(join(directory, name), "utf8"), name));
  const slugs = new Set();
  for (const post of posts) {
    if (slugs.has(post.slug)) throw new Error(`Duplicate blog slug: ${post.slug}`);
    slugs.add(post.slug);
  }
  return Object.freeze(posts.sort((a, b) => b.published.localeCompare(a.published)));
}

export function renderBlogInline(markdown, escapeHtml) {
  const renderText = (value) => {
    let rendered = "";
    let offset = 0;
    for (const match of String(value).matchAll(/\*([^*\n]{1,200})\*/g)) {
      rendered += escapeHtml(value.slice(offset, match.index));
      rendered += `<em>${escapeHtml(match[1])}</em>`;
      offset = match.index + match[0].length;
    }
    return rendered + escapeHtml(value.slice(offset));
  };
  let output = "";
  let cursor = 0;
  const links = /\[([^\]\n]{1,200})\]\((https:\/\/[^\s)]+|\/(?:blog|language\/en\/blog)\/[a-z0-9]+(?:-[a-z0-9]+)*|\/try\?template=(?:article|hello|mark|ball))\)/g;
  for (const match of markdown.matchAll(links)) {
    output += renderText(markdown.slice(cursor, match.index));
    const external = match[2].startsWith("https://");
    const href = new URL(match[2], "https://resources.invalid");
    if (href.username || href.password) throw new Error("Blog links cannot contain credentials");
    output += `<a href="${escapeHtml(external ? href.href : `${href.pathname}${href.search}`)}">${escapeHtml(match[1])}</a>`;
    cursor = match.index + match[0].length;
  }
  return output + renderText(markdown.slice(cursor));
}
