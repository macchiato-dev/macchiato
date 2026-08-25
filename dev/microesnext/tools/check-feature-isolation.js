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
      throw new Error(
        `${features || "minimal"}: unexpectedly contains ${name}`,
      );
    }
  }
}

function compilerTree(features) {
  const args = [
    "tree",
    "--package=microesnext-compiler",
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--edges=features",
    "--invert=microesnext-bytecode",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  return execFileSync(cargo, args, { encoding: "utf8" });
}

function assertCompilerFeatures(features, present, absent) {
  const tree = compilerTree(features);
  for (const feature of present) {
    if (!tree.includes(`microesnext-bytecode feature "${feature}"`)) {
      throw new Error(`compiler ${features || "minimal"}: expected ${feature}`);
    }
  }
  for (const feature of absent) {
    if (tree.includes(`microesnext-bytecode feature "${feature}"`)) {
      throw new Error(
        `compiler ${features || "minimal"}: unexpectedly contains ${feature}`,
      );
    }
  }
}

const environments = "microesnext-environments";
const parameters = "microesnext-parameters";
const suspension = "microesnext-suspension";
const recursiveFunctions = "microesnext-recursive-functions";
const asyncFunctions = "microesnext-async-functions";
const asyncThenables = "microesnext-async-thenables";
const recursiveAsyncFunctions = "microesnext-recursive-async-functions";
const promiseResolution = "microesnext-promise-resolution";
const promiseResolvers = "microesnext-promise-resolvers";
const errors = "microesnext-errors";
const receivers = "microesnext-receivers";
const thenables = "microesnext-thenables";
const integerOperations = "microesnext-integer-operations";
const equality = "microesnext-equality";
const logicalOperations = "microesnext-logical-operations";
const numberOperations = "microesnext-number-operations";

assertCompilerFeatures(
  ["locals"],
  ["locals"],
  ["environments", "function-arguments", "functions", "receivers"],
);
assertCompilerFeatures(
  ["functions"],
  [
    "environments",
    "function-arguments",
    "functions",
    "locals",
    "recursive-functions",
  ],
  ["async", "async-functions", "receivers"],
);
assertCompilerFeatures(
  [],
  [],
  [
    "arrays",
    "async",
    "async-functions",
    "atoms",
    "control-flow",
    "equality",
    "exceptions",
    "functions",
    "function-arguments",
    "integer-operations",
    "logical-operations",
    "locals",
    "numbers",
    "number-operations",
    "objects",
    "receivers",
    "recursive-functions",
    "strings",
  ],
);
assertCompilerFeatures(
  ["async-functions"],
  ["async", "async-functions", "recursive-async-functions"],
  ["arrays", "control-flow", "equality", "numbers", "objects"],
);
assertCompilerFeatures(
  ["exceptions"],
  ["exceptions"],
  ["arrays", "control-flow", "equality", "logical-operations", "objects"],
);
assertCompilerFeatures(
  ["control-flow"],
  ["control-flow"],
  ["arrays", "equality", "logical-operations", "numbers", "objects"],
);
assertCompilerFeatures(
  ["number-operations"],
  ["integer-operations", "numbers", "number-operations"],
  ["equality", "logical-operations"],
);
assertCompilerFeatures(
  ["objects"],
  ["atoms", "objects", "strings"],
  ["arrays", "numbers", "number-operations"],
);

assertPresence(
  [],
  [],
  [
    asyncFunctions,
    asyncThenables,
    environments,
    errors,
    equality,
    integerOperations,
    logicalOperations,
    numberOperations,
    parameters,
    promiseResolution,
    promiseResolvers,
    recursiveAsyncFunctions,
    recursiveFunctions,
    receivers,
    suspension,
    thenables,
  ],
);
assertPresence(
  ["equality"],
  [equality],
  [
    asyncFunctions,
    environments,
    integerOperations,
    "microesnext-numbers",
    "microesnext-strings",
  ],
);
assertPresence(
  ["equality", "numbers"],
  [equality, "microesnext-numbers"],
  [
    "microesnext-atoms",
    numberOperations,
    "microesnext-objects",
    "microesnext-strings",
  ],
);
assertPresence(
  ["number-operations"],
  [integerOperations, numberOperations, "microesnext-numbers"],
  ["microesnext-strings"],
);
assertPresence(
  ["minimal-program"],
  [integerOperations, "microesnext-locals", "microesnext-truthiness"],
  [
    asyncFunctions,
    environments,
    "microesnext-numbers",
    "microesnext-strings",
  ],
);
assertPresence(
  ["logical-operations"],
  [logicalOperations, "microesnext-truthiness"],
  ["microesnext-numbers", "microesnext-strings"],
);
assertPresence(
  ["logical-operations", "numbers"],
  [logicalOperations, "microesnext-numbers", "microesnext-truthiness"],
  ["microesnext-strings"],
);
assertPresence(
  ["functions"],
  ["microesnext-functions"],
  [
    asyncFunctions,
    environments,
    errors,
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
    errors,
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
    errors,
    promiseResolution,
    recursiveAsyncFunctions,
    recursiveFunctions,
    receivers,
  ],
);
assertPresence(
  ["receivers"],
  ["microesnext-functions", "microesnext-locals", parameters, receivers],
  [asyncFunctions, environments, errors, promiseResolution, suspension],
);
assertPresence(
  ["async"],
  [suspension],
  [
    asyncFunctions,
    environments,
    errors,
    parameters,
    promiseResolution,
    recursiveAsyncFunctions,
  ],
);
assertPresence(
  ["errors"],
  [errors],
  [asyncFunctions, environments, promiseResolution, suspension],
);
assertPresence(
  ["promises"],
  ["microesnext-promises"],
  [errors, promiseResolution],
);
assertPresence(
  ["promise-resolution"],
  [errors, "microesnext-promises", promiseResolution],
  [
    asyncFunctions,
    environments,
    parameters,
    promiseResolvers,
    recursiveAsyncFunctions,
    suspension,
    thenables,
  ],
);
assertPresence(
  ["promise-resolvers"],
  [
    errors,
    "microesnext-functions",
    "microesnext-locals",
    "microesnext-promises",
    parameters,
    promiseResolution,
    promiseResolvers,
  ],
  [asyncFunctions, environments, receivers, suspension, thenables],
);
assertPresence(
  ["thenables"],
  [
    errors,
    "microesnext-functions",
    "microesnext-objects",
    "microesnext-promises",
    promiseResolution,
    promiseResolvers,
    receivers,
    thenables,
  ],
  [
    asyncFunctions,
    asyncThenables,
    environments,
    recursiveAsyncFunctions,
    suspension,
  ],
);
assertPresence(
  ["async-functions"],
  [
    asyncFunctions,
    errors,
    "microesnext-functions",
    "microesnext-promises",
    promiseResolution,
    suspension,
  ],
  [
    asyncThenables,
    environments,
    parameters,
    recursiveAsyncFunctions,
    recursiveFunctions,
    thenables,
  ],
);
assertPresence(
  ["async-thenables"],
  [
    asyncFunctions,
    asyncThenables,
    "microesnext-functions",
    "microesnext-objects",
    "microesnext-promises",
    promiseResolution,
    promiseResolvers,
    receivers,
    suspension,
    thenables,
  ],
  [environments, recursiveAsyncFunctions, recursiveFunctions],
);
assertPresence(
  ["recursive-async-functions"],
  [
    asyncFunctions,
    environments,
    errors,
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
  [errors, parameters, promiseResolution, recursiveAsyncFunctions, suspension],
);
assertPresence(
  ["environments", "functions", "locals"],
  [environments, "microesnext-functions", "microesnext-locals"],
  [
    asyncFunctions,
    errors,
    parameters,
    promiseResolution,
    recursiveAsyncFunctions,
    recursiveFunctions,
    suspension,
  ],
);

console.log("feature dependency isolation verified");
