import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "src");
const build = join(root, "build");
mkdirSync(build, { recursive: true });

const cc = process.env.CC || "cc";
const cppflags = (process.env.CPPFLAGS || "").split(/\s+/).filter(Boolean);
const common = [
  "-std=c11", "-D_GNU_SOURCE", ...cppflags,
  "-Os", "-Wall", "-Wextra", `-I${source}`,
];

execFileSync(cc, [
  ...common,
  join(source, "mqjs_stdlib.c"),
  join(source, "mquickjs_build.c"),
  "-o", join(build, "mqjs-stdlib"),
], { stdio: "inherit" });

const stdlibCompiler = join(build, "mqjs-stdlib");
writeFileSync(join(build, "mqjs_stdlib.h"), execFileSync(stdlibCompiler));
writeFileSync(join(build, "mquickjs_atom.h"),
  execFileSync(stdlibCompiler, ["-a"]));

execFileSync(cc, [
  ...common, `-I${build}`,
  join(source, "mqjs.c"),
  join(source, "readline.c"),
  join(source, "readline_tty.c"),
  join(source, "mquickjs.c"),
  join(source, "microesnext.c"),
  join(source, "dtoa.c"),
  join(source, "libm.c"),
  join(source, "cutils.c"),
  "-lm", "-o", join(build, "mqjs"),
], { stdio: "inherit" });
