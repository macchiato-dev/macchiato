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
const asyncFunctions = "microesnext-async-functions";
const recursiveAsyncFunctions = "microesnext-recursive-async-functions";
const promiseResolution = "microesnext-promise-resolution";

assertPresence(
  [],
  [],
  [
    asyncFunctions,
    environments,
    parameters,
    promiseResolution,
    recursiveAsyncFunctions,
    recursiveFunctions,
    suspension,
  ],
);
assertPresence(
  ["functions"],
  ["microesnext-functions"],
  [
    asyncFunctions,
    environments,
    parameters,
    promiseResolution,
    recursiveAsyncFunctions,
    recursiveFunctions,
  ],
);
assertPresence(
  ["locals"],
  ["microesnext-locals"],
  [
    asyncFunctions,
    environments,
    parameters,
    promiseResolution,
    recursiveAsyncFunctions,
    recursiveFunctions,
  ],
);
assertPresence(
  ["function-arguments"],
  [parameters],
  [
    asyncFunctions,
    environments,
    promiseResolution,
    recursiveAsyncFunctions,
    recursiveFunctions,
  ],
);
assertPresence(
  ["async"],
  [suspension],
  [
    asyncFunctions,
    environments,
    parameters,
    promiseResolution,
    recursiveAsyncFunctions,
  ],
);
assertPresence(["promises"], ["microesnext-promises"], [promiseResolution]);
assertPresence(
  ["promise-resolution"],
  ["microesnext-promises", promiseResolution],
  [asyncFunctions, environments, parameters, recursiveAsyncFunctions, suspension],
);
assertPresence(
  ["async-functions"],
  [
    asyncFunctions,
    "microesnext-functions",
    "microesnext-promises",
    promiseResolution,
    suspension,
  ],
  [environments, parameters, recursiveAsyncFunctions, recursiveFunctions],
);
assertPresence(
  ["recursive-async-functions"],
  [
    asyncFunctions,
    environments,
    "microesnext-functions",
    "microesnext-promises",
    promiseResolution,
    recursiveAsyncFunctions,
    suspension,
  ],
  [parameters, recursiveFunctions],
);
assertPresence(
  ["recursive-functions"],
  [environments, "microesnext-functions", recursiveFunctions],
  [parameters, promiseResolution, recursiveAsyncFunctions, suspension],
);
assertPresence(
  ["environments", "functions", "locals"],
  [environments, "microesnext-functions", "microesnext-locals"],
  [
    asyncFunctions,
    parameters,
    promiseResolution,
    recursiveAsyncFunctions,
    recursiveFunctions,
    suspension,
  ],
);

console.log("feature dependency isolation verified");
