#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const sourceArg = process.argv[2] || "https://resources.co/blog";
const remote = /^https:\/\//.test(sourceArg);
const source = remote ? new URL(sourceArg) : resolve(sourceArg);
const out = resolve(process.argv[3] || "packages/website/content-space/blog");

async function load(name = "index.html") {
  if (!remote) return readFile(resolve(source, name), "utf8");
  const url = name === "index.html" ? source : new URL(name, `${source.href.replace(/\/$/, "")}/`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url.href} returned ${response.status}`);
  return response.text();
}

function text(value) {
  return String(value)
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      let target = remote ? new URL(href, source).href : href;
      if (!remote && /^[a-z0-9-]+\.html$/.test(target)) target = `/blog/${target.slice(0, -5)}`;
      if (/^http:\/\/(?:github|gitlab)\.com\//.test(target)) target = target.replace(/^http:/, "https:");
      return `[${text(label)}](${target})`;
    })
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

function isoDate(value) {
  const date = new Date(`${value} 00:00:00 UTC`);
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid post date: ${value}`);
  return date.toISOString().slice(0, 10);
}

const index = await load();
const entries = [...index.matchAll(/<div class="post">\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<p class="date">([^<]+)<\/p>/g)];
if (!entries.length) throw new Error("No legacy blog posts found");
await mkdir(out, { recursive: true });

for (const [, href, indexTitle, indexDate] of entries) {
  const file = `${basename(href, ".html")}.html`;
  const slug = basename(href, ".html");
  const html = await load(file);
  const container = /<div class="container">([\s\S]*?)<\/div>\s*<\/body>/.exec(html)?.[1];
  const title = text(/<h1>([\s\S]*?)<\/h1>/.exec(container || "")?.[1] || indexTitle);
  const published = isoDate(text(/<p class="date">([\s\S]*?)<\/p>/.exec(container || "")?.[1] || indexDate));
  const afterDate = (container || "").replace(/[\s\S]*?<p class="date">[\s\S]*?<\/p>/, "");
  const paragraphs = [...afterDate.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map((match) => text(match[1])).filter(Boolean);
  const examples = [...afterDate.matchAll(/<iframe\s[\s\S]*?src="([^"]+)"[\s\S]*?title="([^"]+)"[\s\S]*?<\/iframe>/g)].map((match) => {
    const url = new URL(match[1], "https://resources.co");
    if (url.hostname !== "codesandbox.io" || !url.pathname.startsWith("/embed/")) throw new Error(`Unsupported example URL: ${url.href}`);
    return `- Example: [${text(match[2])}](${url.href})`;
  });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !paragraphs.length) throw new Error(`Could not parse ${file}`);
  const metadata = [`# ${title}`, `- Slug: ${slug}`, `- Published: ${published}`, ...examples].join("\n");
  const markdown = `${metadata}\n\n## Body\n\n${paragraphs.join("\n\n")}\n`;
  await writeFile(resolve(out, `${slug}.md`), markdown, "utf8");
  console.log(`Imported ${slug}`);
}
