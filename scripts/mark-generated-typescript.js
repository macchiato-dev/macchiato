import { readFileSync, writeFileSync } from "node:fs";

const path = process.argv[2];
if (!path) throw new Error("Usage: mark-generated-typescript.js <bundle.ts>");
const source = readFileSync(path, "utf8");
const marker = "// @ts-nocheck -- generated JavaScript bundle\n";
writeFileSync(path, source.startsWith("// @ts-nocheck") ? source : marker + source);
