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
    if (name === bindings || name === semantics) continue;
    if (!graph.has(name)) {
      throw new Error(`${features || "minimal"}: expected ${name}`);
    }
  }
  for (const name of absent) {
    if (name === bindings || name === semantics) continue;
    if (graph.has(name)) {
      throw new Error(
        `${features || "minimal"}: unexpectedly contains ${name}`,
      );
    }
  }
}

function assertBindingFeatures(features, present, absent) {
  if (!packages(features).has(bindings)) {
    if (present.length > 0) {
      throw new Error(`${features || "minimal"}: expected bindings`);
    }
    return;
  }
  const args = [
    "tree",
    "--package=microesnext",
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--edges=features",
    "--invert=microesnext-bindings",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  const tree = execFileSync(cargo, args, { encoding: "utf8" });
  for (const feature of present) {
    if (!tree.includes(`microesnext-bindings feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: expected bindings/${feature}`);
    }
  }
  for (const feature of absent) {
    if (tree.includes(`microesnext-bindings feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: unexpectedly contains bindings/${feature}`);
    }
  }
}

function assertSemanticFeatures(features, present, absent) {
  if (!packages(features).has(semantics)) {
    if (present.length > 0) {
      throw new Error(`${features || "minimal"}: expected semantics`);
    }
    return;
  }
  const args = [
    "tree",
    "--package=microesnext",
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--edges=features",
    "--invert=microesnext-semantics",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  const tree = execFileSync(cargo, args, { encoding: "utf8" });
  for (const feature of present) {
    if (!tree.includes(`microesnext-semantics feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: expected semantics/${feature}`);
    }
  }
  for (const feature of absent) {
    if (tree.includes(`microesnext-semantics feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: unexpectedly contains semantics/${feature}`);
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

const bindings = "microesnext-bindings";
const environments = bindings;
const parameters = bindings;
const execution = "microesnext-execution";
const suspension = execution;
const recursiveFunctions = bindings;
const asyncFunctions = execution;
const scheduler = "microesnext-scheduler";
const asyncThenables = scheduler;
const recursiveAsyncFunctions = execution;
const promises = "microesnext-promises";
const promiseResolution = promises;
const promiseResolvers = promises;
const errors = "microesnext-errors";
const receivers = bindings;
const thenables = scheduler;
const semantics = "microesnext-semantics";
const integerOperations = semantics;
const equality = semantics;
const logicalOperations = semantics;
const typeOf = semantics;

assertCompilerFeatures(
  ["locals"],
  ["locals"],
  ["environments", "function-arguments", "functions", "receivers"],
);
assertCompilerFeatures(
  ["conditional-expressions"],
  ["control-flow"],
  ["functions", "locals", "logical-operations", "objects"],
);
assertCompilerFeatures(
  ["nonterminal-conditionals"],
  ["control-flow"],
  ["exceptions", "functions", "locals", "stack-operations"],
);
assertCompilerFeatures(
  ["nested-conditionals"],
  ["control-flow"],
  ["exceptions", "functions", "locals", "stack-operations"],
);
assertCompilerFeatures(
  ["nested-loops"],
  ["control-flow"],
  ["exceptions", "functions", "locals", "stack-operations"],
);
assertCompilerFeatures(
  ["nested-exceptions"],
  ["control-flow", "exceptions"],
  ["functions", "locals", "stack-operations"],
);
assertCompilerFeatures(
  ["nonterminal-exceptions"],
  ["control-flow", "exceptions"],
  ["functions", "locals", "stack-operations"],
);
assertCompilerFeatures(
  ["structured-statements"],
  ["control-flow", "exceptions"],
  ["functions", "locals", "stack-operations"],
);
assertCompilerFeatures(
  ["expression-statements"],
  ["stack-operations"],
  ["exceptions", "functions", "locals", "objects"],
);
assertCompilerFeatures(
  ["implicit-completions"],
  [],
  ["exceptions", "functions", "locals", "stack-operations"],
);
assertCompilerFeatures(
  ["array-indexing"],
  ["arrays"],
  ["atoms", "locals", "objects", "strings"],
);
assertCompilerFeatures(
  ["array-assignment-expressions"],
  ["array-assignment-expressions", "arrays", "locals"],
  ["atoms", "environments", "objects", "stack-operations", "strings"],
);
assertCompilerFeatures(
  ["local-assignment-expressions"],
  ["locals", "stack-operations"],
  ["environments", "functions", "property-assignment"],
);
assertCompilerFeatures(
  ["captured-assignment-expressions"],
  ["captured-assignment-expressions", "environments", "functions", "locals"],
  ["property-assignment", "stack-operations"],
);
assertCompilerFeatures(
  ["property-assignment-expressions"],
  ["atoms", "locals", "objects", "property-assignment-expressions", "strings"],
  ["environments", "functions", "property-assignment", "stack-operations"],
);
assertCompilerFeatures(
  ["functions"],
  ["functions", "locals"],
  [
    "async",
    "async-functions",
    "environments",
    "function-arguments",
    "receivers",
    "recursive-async-functions",
    "recursive-functions",
  ],
);
assertCompilerFeatures(
  ["function-arguments"],
  ["function-arguments", "functions", "locals"],
  ["async", "environments", "receivers", "recursive-functions"],
);
assertCompilerFeatures(
  ["environments"],
  ["environments", "functions", "locals"],
  [
    "async",
    "function-arguments",
    "recursive-async-functions",
    "recursive-functions",
  ],
);
assertCompilerFeatures(
  ["recursive-functions"],
  [
    "environments",
    "functions",
    "locals",
    "recursive-functions",
  ],
  ["async", "async-functions", "function-arguments", "recursive-async-functions"],
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
    "environments",
    "exceptions",
    "functions",
    "function-arguments",
    "integer-operations",
    "integer-negation",
    "logical-operations",
    "locals",
    "numbers",
    "number-operations",
    "number-negation",
    "objects",
    "receivers",
    "recursive-functions",
    "recursive-async-functions",
    "strings",
    "string-operations",
  ],
);
assertCompilerFeatures(
  ["async-functions"],
  ["async", "async-functions", "functions", "locals"],
  [
    "arrays",
    "control-flow",
    "environments",
    "equality",
    "function-arguments",
    "numbers",
    "objects",
    "recursive-async-functions",
  ],
);
assertCompilerFeatures(
  ["recursive-async-functions"],
  [
    "async",
    "async-functions",
    "environments",
    "functions",
    "locals",
    "recursive-async-functions",
  ],
  ["function-arguments", "recursive-functions"],
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
  ["equality", "integer-negation", "logical-operations", "number-negation"],
);
assertCompilerFeatures(
  ["number-division"],
  ["numbers", "number-division"],
  ["integer-operations", "number-operations"],
);
assertCompilerFeatures(
  ["number-remainder"],
  ["numbers", "number-remainder"],
  ["integer-operations", "number-division", "number-operations"],
);
assertCompilerFeatures(
  ["integer-negation"],
  ["integer-negation"],
  ["integer-operations", "numbers", "number-negation", "number-operations"],
);
assertCompilerFeatures(
  ["number-negation"],
  ["integer-negation", "number-negation"],
  ["integer-operations", "number-operations"],
);
assertCompilerFeatures(
  ["number-coercion"],
  ["number-coercion"],
  ["integer-negation", "integer-operations", "numbers", "number-negation", "number-operations"],
);
assertCompilerFeatures(
  ["string-number-coercion"],
  ["number-coercion", "strings"],
  ["integer-negation", "integer-operations", "numbers", "number-negation", "number-operations", "string-operations"],
);
assertCompilerFeatures(
  ["typeof"],
  ["strings", "typeof"],
  ["numbers", "objects", "string-operations"],
);
assertCompilerFeatures(
  ["instanceof"],
  ["instanceof"],
  ["functions", "integer-operations", "objects", "typeof"],
);
assertCompilerFeatures(
  ["constructors"],
  ["constructors", "functions", "locals"],
  ["instanceof", "objects", "typeof"],
);
assertCompilerFeatures(
  ["construction"],
  ["construction", "constructors", "function-arguments", "functions", "locals", "receivers"],
  ["instanceof", "objects", "typeof"],
);
assertCompilerFeatures(
  ["property-assignment"],
  ["atoms", "locals", "objects", "property-assignment", "strings"],
  ["functions", "receivers", "string-operations"],
);
assertCompilerFeatures(
  ["recursive-constructors"],
  [
    "constructors",
    "environments",
    "functions",
    "locals",
    "recursive-constructors",
    "recursive-functions",
  ],
  ["construction", "instanceof", "receivers", "typeof"],
);
assertCompilerFeatures(
  ["strings"],
  ["strings"],
  ["arrays", "atoms", "numbers", "objects", "string-operations"],
);
assertCompilerFeatures(
  ["string-operations"],
  ["strings", "string-operations"],
  ["arrays", "atoms", "numbers", "number-operations", "objects"],
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
    environments,
    errors,
    equality,
    integerOperations,
    logicalOperations,
    parameters,
    promiseResolution,
    promiseResolvers,
    recursiveAsyncFunctions,
    recursiveFunctions,
    receivers,
    suspension,
    typeOf,
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
    "microesnext-objects",
    "microesnext-strings",
  ],
);
assertPresence(
  ["number-operations"],
  [integerOperations, "microesnext-numbers"],
  ["microesnext-strings"],
);
assertPresence(
  ["number-division"],
  ["microesnext-numbers"],
  [integerOperations, "microesnext-strings"],
);
assertPresence(
  ["number-remainder"],
  ["microesnext-numbers"],
  [integerOperations, "microesnext-strings"],
);
assertPresence(
  ["integer-negation"],
  [integerOperations],
  ["microesnext-numbers"],
);
assertPresence(
  ["number-negation"],
  [integerOperations, "microesnext-numbers"],
  ["microesnext-strings"],
);
assertPresence(
  ["number-coercion"],
  ["microesnext-numbers"],
  [integerOperations, "microesnext-strings"],
);
assertPresence(
  ["string-number-coercion"],
  ["microesnext-numbers", "microesnext-strings"],
  [integerOperations],
);
assertPresence(
  ["typeof"],
  [typeOf, "microesnext-strings"],
  [integerOperations, "microesnext-numbers", "microesnext-objects"],
);
assertPresence(
  ["prototype-chain"],
  ["microesnext-objects", "microesnext-strings"],
  [typeOf, "microesnext-numbers"],
);
assertPresence(
  ["callable-objects"],
  [
    "microesnext-objects",
    "microesnext-strings",
  ],
  [typeOf, "microesnext-numbers"],
);
assertPresence(
  ["constructors"],
  [
    "microesnext-objects",
    "microesnext-strings",
  ],
  [typeOf],
);
assertPresence(
  ["construction"],
  [
    receivers,
    "microesnext-objects",
  ],
  [typeOf],
);
assertPresence(
  ["property-assignment"],
  ["microesnext-objects", "microesnext-strings"],
  [receivers],
);
assertPresence(
  ["recursive-constructors"],
  [
    bindings,
    bindings,
  ],
  [receivers, typeOf],
);
assertPresence(
  ["instanceof"],
  [
    "microesnext-objects",
  ],
  [typeOf, "microesnext-numbers"],
);
assertPresence(
  ["minimal-program"],
  [integerOperations, bindings, semantics],
  [
    asyncFunctions,
    environments,
    "microesnext-numbers",
    "microesnext-strings",
  ],
);
assertPresence(
  ["logical-operations"],
  [semantics],
  ["microesnext-numbers", "microesnext-strings"],
);
assertPresence(
  ["logical-operations", "numbers"],
  [semantics, "microesnext-numbers"],
  ["microesnext-strings"],
);
assertPresence(
  ["functions"],
  [],
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
  [bindings],
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
  ["local-assignment-expressions"],
  [bindings],
  [environments, "microesnext-objects"],
);
assertPresence(
  ["expression-statements"],
  [],
  ["microesnext-exceptions", "microesnext-objects"],
);
assertPresence(
  ["array-assignment-expressions"],
  ["microesnext-arrays"],
  [environments, bindings, "microesnext-objects"],
);
assertPresence(
  ["captured-assignment-expressions"],
  [environments],
  [bindings, "microesnext-objects"],
);
assertPresence(
  ["property-assignment-expressions"],
  ["microesnext-objects"],
  [environments],
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
  [bindings, parameters, receivers],
  [asyncFunctions, environments, errors, promiseResolution, suspension],
);
assertPresence(
  ["async"],
  [scheduler, suspension],
  [
    environments,
    errors,
    parameters,
    promiseResolution,
  ],
);
assertPresence(
  ["errors"],
  [errors],
  [asyncFunctions, environments, promiseResolution, suspension],
);
assertPresence(
  ["promises"],
  [promises],
  [errors],
);
assertPresence(
  ["promise-resolution"],
  [errors, promises],
  [
    asyncFunctions,
    environments,
    parameters,
    recursiveAsyncFunctions,
    suspension,
    thenables,
  ],
);
assertPresence(
  ["promise-resolvers"],
  [
    errors,
    bindings,
    promises,
    parameters,
  ],
  [asyncFunctions, environments, receivers, suspension, thenables],
);
assertPresence(
  ["thenables"],
  [
    errors,
    "microesnext-objects",
    promises,
    promiseResolution,
    promiseResolvers,
    receivers,
    thenables,
  ],
  [
    asyncFunctions,
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
    "microesnext-promises",
    promiseResolution,
    scheduler,
    suspension,
  ],
  [
    environments,
    parameters,
    recursiveFunctions,
  ],
);
assertPresence(
  ["async-thenables"],
  [
    asyncFunctions,
    asyncThenables,
    "microesnext-objects",
    "microesnext-promises",
    promiseResolution,
    promiseResolvers,
    receivers,
    suspension,
    thenables,
  ],
  [environments, recursiveFunctions],
);
assertPresence(
  ["recursive-async-functions"],
  [
    asyncFunctions,
    environments,
    errors,
    "microesnext-promises",
    promiseResolution,
    recursiveAsyncFunctions,
    scheduler,
    suspension,
  ],
  [parameters, recursiveFunctions],
);
assertPresence(
  ["recursive-functions"],
  [environments, recursiveFunctions],
  [errors, parameters, promiseResolution, recursiveAsyncFunctions, suspension],
);
assertPresence(
  ["environments", "functions", "locals"],
  [environments, bindings],
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

assertBindingFeatures([], [], ["environments", "locals", "parameters", "receivers", "recursive-functions"]);
assertBindingFeatures(["locals"], ["locals"], ["environments", "parameters", "receivers", "recursive-functions"]);
assertBindingFeatures(["function-arguments"], ["locals", "parameters"], ["environments", "receivers", "recursive-functions"]);
assertBindingFeatures(["environments"], ["environments"], ["locals", "parameters", "receivers", "recursive-functions"]);
assertBindingFeatures(["receivers"], ["locals", "parameters", "receivers"], ["environments", "recursive-functions"]);
assertBindingFeatures(["recursive-functions"], ["environments", "recursive-functions"], ["parameters", "receivers"]);
assertSemanticFeatures([], [], ["equality", "integer-operations", "logical-operations", "truthiness", "typeof"]);
assertSemanticFeatures(["integer-operations"], ["integer-operations"], ["equality", "logical-operations", "truthiness", "typeof"]);
assertSemanticFeatures(["equality"], ["equality"], ["integer-operations", "logical-operations", "truthiness", "typeof"]);
assertSemanticFeatures(["logical-operations"], ["logical-operations", "truthiness"], ["equality", "integer-operations", "typeof"]);
assertSemanticFeatures(["typeof"], ["typeof"], ["equality", "integer-operations", "logical-operations", "truthiness"]);

console.log("feature dependency isolation verified");
