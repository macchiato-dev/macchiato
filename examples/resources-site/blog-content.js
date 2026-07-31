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
  while (lines[offset]?.startsWith("- Example: ")) {
    const match = /^- Example: \[([^\]]{1,200})\]\((https:\/\/[^\s)]+)\)$/.exec(lines[offset]);
    if (!match) throw new Error(`${filename}: invalid example`);
    const url = new URL(match[2]);
    if (url.hostname !== "codesandbox.io" || !url.pathname.startsWith("/embed/")) throw new Error(`${filename}: unsupported example host`);
    examples.push(Object.freeze({ title: match[1], url: url.href }));
    offset += 1;
  }
  if (lines[offset] !== "" || lines[offset + 1] !== "## Body" || lines[offset + 2] !== "") throw new Error(`${filename}: expected a Body heading after metadata`);
  const paragraphs = lines.slice(offset + 3).join("\n").trim().split(/\n{2,}/).map((value) => value.replace(/\n/g, " ").trim()).filter(Boolean);
  if (!paragraphs.length || paragraphs.some((value) => value.length > 5_000)) throw new Error(`${filename}: invalid body`);
  return Object.freeze({ title, slug, published, paragraphs: Object.freeze(paragraphs), examples: Object.freeze(examples) });
}

export function loadBlogPosts(root = process.env.RESOURCES_CONTENT_ROOT || resolve("examples/resources-site/content-space")) {
  const directory = join(resolve(root), "blog");
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
  let output = "";
  let cursor = 0;
  const links = /\[([^\]\n]{1,200})\]\((https:\/\/[^\s)]+)\)/g;
  for (const match of markdown.matchAll(links)) {
    output += escapeHtml(markdown.slice(cursor, match.index));
    const href = new URL(match[2]);
    if (href.username || href.password) throw new Error("Blog links cannot contain credentials");
    output += `<a href="${escapeHtml(href.href)}">${escapeHtml(match[1])}</a>`;
    cursor = match.index + match[0].length;
  }
  return output + escapeHtml(markdown.slice(cursor));
}
