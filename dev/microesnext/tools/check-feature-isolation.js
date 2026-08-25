import { execFileSync } from "node:child_process";

const cargo = process.env.CARGO ?? "cargo";

function packages(features) {
  const args = [
    "tree",
    "--package=microesnext",
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--prefix=none",
    "--format={p}",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  const tree = execFileSync(cargo, args, { encoding: "utf8" });
  return new Set(
    tree.trim().split("\n").map((line) => line.split(" ", 1)[0]),
  );
}

function assertPresence(features, present, absent) {
  const graph = packages(features);
  for (const name of present) {
    if (!graph.has(name)) {
      throw new Error(`${features || "minimal"}: expected ${name}`);
    }
  }
  for (const name of absent) {
    if (graph.has(name)) {
      throw new Error(`${features || "minimal"}: unexpectedly contains ${name}`);
    }
  }
}

const environments = "microesnext-environments";
const parameters = "microesnext-parameters";
const suspension = "microesnext-suspension";
const recursiveFunctions = "microesnext-recursive-functions";

assertPresence([], [], [environments, parameters, recursiveFunctions, suspension]);
assertPresence(
  ["functions"],
  ["microesnext-functions"],
  [environments, parameters, recursiveFunctions],
);
assertPresence(
  ["locals"],
  ["microesnext-locals"],
  [environments, parameters, recursiveFunctions],
);
assertPresence(
  ["function-arguments"],
  [parameters],
  [environments, recursiveFunctions],
);
assertPresence(["async"], [suspension], [environments, parameters]);
assertPresence(
  ["recursive-functions"],
  [environments, "microesnext-functions", recursiveFunctions],
  [parameters, suspension],
);
assertPresence(
  ["environments", "functions", "locals"],
  [environments, "microesnext-functions", "microesnext-locals"],
  [parameters, recursiveFunctions, suspension],
);

console.log("feature dependency isolation verified");
