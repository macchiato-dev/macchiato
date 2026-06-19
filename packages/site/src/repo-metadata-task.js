import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

function safeRelative(base, target) {
  const rel = relative(base, target);
  if (!rel || rel.startsWith("..") || rel.split(sep).includes("..")) return null;
  return rel.replaceAll(sep, "/");
}

function gitVisibleFiles(repoRoot) {
  const stdout = execFileSync(
    "git",
    ["-C", repoRoot, "ls-files", "-c", "-o", "--exclude-standard"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return stdout.split("\n").map((line) => line.trim()).filter(Boolean).sort();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function workspaceRoots(repoRoot) {
  const rootPackage = readJson(join(repoRoot, "package.json"));
  const workspaces = Array.isArray(rootPackage.workspaces) ? rootPackage.workspaces : [];
  return workspaces.flatMap((workspace) => {
    if (!workspace.endsWith("/*")) return [];
    const parent = workspace.slice(0, -2);
    return { parent, prefix: `${parent}/` };
  });
}

function packageDirectoryForFile(file, workspaces) {
  for (const workspace of workspaces) {
    if (!file.startsWith(workspace.prefix)) continue;
    const rest = file.slice(workspace.prefix.length);
    const packageName = rest.split("/")[0];
    if (!packageName) continue;
    return `${workspace.parent}/${packageName}`;
  }
  return null;
}

function projectNamespaceForPackage(packageName) {
  if (packageName.startsWith("@macchiato-dev/")) return "macchiato";
  if (packageName.startsWith("@resources/") || packageName.startsWith("@resources-co/")) return "resources";
  if (packageName.startsWith("@")) return packageName.slice(1).split("/")[0];
  return "resources";
}

function publicNameForPackage(packageName) {
  if (packageName.startsWith("@")) return packageName.split("/")[1] || packageName.slice(1);
  return packageName;
}

function exportsList(pkg) {
  if (!pkg.exports) return [];
  if (typeof pkg.exports === "string") return ["."];
  if (Array.isArray(pkg.exports)) return ["."];
  return Object.keys(pkg.exports).sort();
}

function binList(pkg) {
  if (!pkg.bin) return [];
  if (typeof pkg.bin === "string") return [publicNameForPackage(pkg.name || "")].filter(Boolean);
  return Object.keys(pkg.bin).sort();
}

function internalDependencies(pkg, packageNames) {
  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.peerDependencies || {}),
    ...(pkg.optionalDependencies || {}),
  };
  return Object.keys(deps).filter((name) => packageNames.has(name)).sort();
}

function languageCounts(files) {
  const counts = {};
  for (const file of files) {
    const ext = file.includes(".") ? file.split(".").pop().toLowerCase() : "plain";
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function packageKind(pkg) {
  if (pkg.bin) return "tool";
  if (pkg.name?.includes("dashboard")) return "app";
  if (pkg.name?.includes("sandbox")) return "runtime";
  if (pkg.description?.toLowerCase().includes("framework")) return "framework";
  return "library";
}

export function readRepoProjectMetadata({ repoRoot = process.cwd() } = {}) {
  const root = resolve(repoRoot);
  const visibleFiles = gitVisibleFiles(root);
  const workspaces = workspaceRoots(root);
  const packageFiles = visibleFiles.filter((file) => file.endsWith("/package.json"));
  const packageDirs = new Set(packageFiles.map((file) => dirname(file)));
  const packageNames = new Set();

  for (const packageDir of packageDirs) {
    const pkg = readJson(join(root, packageDir, "package.json"));
    if (pkg.name) packageNames.add(pkg.name);
  }

  const projects = [];
  for (const packageDir of [...packageDirs].sort()) {
    const packagePath = join(root, packageDir, "package.json");
    if (!existsSync(packagePath) || !statSync(packagePath).isFile()) continue;
    const pkg = readJson(packagePath);
    if (!pkg.name || pkg.private === true) continue;

    const namespace = projectNamespaceForPackage(pkg.name);
    const publicName = publicNameForPackage(pkg.name);
    const projectPath = `${namespace}/${publicName}`;
    const files = visibleFiles.filter((file) => file === packageDir || file.startsWith(`${packageDir}/`));

    projects.push({
      id: projectPath,
      path: `/${projectPath}`,
      namespace,
      slug: publicName,
      npmName: pkg.name,
      version: pkg.version || "",
      title: publicName,
      description: pkg.description || `${pkg.name} package.`,
      kind: packageKind(pkg),
      packageDir,
      packageJson: safeRelative(root, packagePath),
      files: files.length,
      languages: languageCounts(files),
      exports: exportsList(pkg),
      bins: binList(pkg),
      dependencies: internalDependencies(pkg, packageNames),
    });
  }

  return {
    repoRoot: root,
    generatedAt: new Date().toISOString(),
    files: visibleFiles.length,
    projects: projects.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function repoMetadataTask(options = {}) {
  return readRepoProjectMetadata(options);
}
