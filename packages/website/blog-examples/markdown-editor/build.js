import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await build({ entryPoints: ["main.js"], bundle: true, outfile: "dist/app.js", format: "esm", minify: true });
await cp("index.html", "dist/index.html");
await cp("style.css", "dist/app.css");
