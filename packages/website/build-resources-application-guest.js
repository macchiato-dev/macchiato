import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, "generated/resources-application.js");
await mkdir(dirname(output), { recursive: true });
await build({
  entryPoints: [join(here, "resources-application-guest.js")],
  outfile: output,
  bundle: true,
  format: "iife",
  platform: "neutral",
  target: "es2023",
  legalComments: "inline",
  minify: false,
});
