import { assemble } from "./microwasm.ts";

// Explicit assembly order; the actual instructions and data stay in Markdown.
export const rendererPages = [
  "00-module.md",
  "01-output.md",
  "02-scanning.md",
  "03-inline.md",
  "04-blocks.md",
  "06-tables.md",
  "05-data.md",
];

export async function assembleRenderer() {
  const pages = await Promise.all(rendererPages.map(async (name) => ({
    name,
    source: await Deno.readTextFile(
      new URL(`renderer/${name}`, import.meta.url),
    ),
  })));
  return { pages, ...assemble(pages.map((page) => page.source).join("\n\n")) };
}
