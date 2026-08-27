import { execFileSync } from "node:child_process";

const cargo = process.env.CARGO ?? "cargo";

function packages(features) {
  const args = [
    "tree",
    "--package=microesnext",
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--edges=normal,build",
    "--prefix=none",
    "--format={p}",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  const tree = execFileSync(cargo, args, { encoding: "utf8" });
  return new Set(
    tree.trim().split("\n").map((line) => line.split(" ", 1)[0]),
  );
}

function packageDependencies(name, features) {
  const args = [
    "tree",
    `--package=${name}`,
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--edges=normal,build",
    "--prefix=none",
    "--format={p}",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  const tree = execFileSync(cargo, args, { encoding: "utf8" });
  return new Set(
    tree.trim().split("\n").map((line) => line.split(" ", 1)[0]),
  );
}

function assertPackageDependencies(name, features, present, absent) {
  const graph = packageDependencies(name, features);
  for (const dependency of present) {
    if (!graph.has(dependency)) {
      throw new Error(`${name}/${features || "minimal"}: expected ${dependency}`);
    }
  }
  for (const dependency of absent) {
    if (graph.has(dependency)) {
      throw new Error(`${name}/${features || "minimal"}: unexpectedly contains ${dependency}`);
    }
  }
}

function assertPresence(features, present, absent) {
  const graph = packages(features);
  for (const name of present) {
    if (name === bindings || name === execution || name === objects || name === semantics || name === values) continue;
    if (!graph.has(name)) {
      throw new Error(`${features || "minimal"}: expected ${name}`);
    }
  }
  for (const name of absent) {
    if (name === bindings || name === execution || name === objects || name === semantics || name === values) continue;
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

function assertValueFeatures(features, present, absent) {
  if (!packages(features).has(values)) {
    if (present.length > 0) {
      throw new Error(`${features || "minimal"}: expected values`);
    }
    return;
  }
  const args = [
    "tree",
    "--package=microesnext",
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--edges=features",
    "--invert=microesnext-values",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  const tree = execFileSync(cargo, args, { encoding: "utf8" });
  for (const feature of present) {
    if (!tree.includes(`microesnext-values feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: expected values/${feature}`);
    }
  }
  for (const feature of absent) {
    if (tree.includes(`microesnext-values feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: unexpectedly contains values/${feature}`);
    }
  }
}

function assertObjectFeatures(features, present, absent) {
  if (!packages(features).has(objects)) {
    if (present.length > 0) {
      throw new Error(`${features || "minimal"}: expected objects`);
    }
    return;
  }
  const args = [
    "tree",
    "--package=microesnext",
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--edges=features",
    "--invert=microesnext-objects",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  const tree = execFileSync(cargo, args, { encoding: "utf8" });
  for (const feature of present) {
    if (!tree.includes(`microesnext-objects feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: expected objects/${feature}`);
    }
  }
  for (const feature of absent) {
    if (tree.includes(`microesnext-objects feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: unexpectedly contains objects/${feature}`);
    }
  }
}

function assertExecutionFeatures(features, present, absent) {
  if (!packages(features).has(execution)) {
    if (present.length > 0) {
      throw new Error(`${features || "minimal"}: expected execution`);
    }
    return;
  }
  const args = [
    "tree",
    "--package=microesnext",
    "--no-default-features",
    "--target=wasm32-unknown-unknown",
    "--edges=features",
    "--invert=microesnext-execution",
  ];
  if (features.length > 0) args.push("--features", features.join(","));
  const tree = execFileSync(cargo, args, { encoding: "utf8" });
  for (const feature of ["core", ...present]) {
    if (!tree.includes(`microesnext-execution feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: expected execution/${feature}`);
    }
  }
  for (const feature of absent) {
    if (tree.includes(`microesnext-execution feature "${feature}"`)) {
      throw new Error(`${features || "minimal"}: unexpectedly contains execution/${feature}`);
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
const promises = execution;
const promiseResolution = promises;
const promiseResolvers = promises;
const values = "microesnext-values";
const objects = "microesnext-objects";
const errors = values;
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
    values,
    values,
  ],
);
assertPresence(
  ["equality", "numbers"],
  [equality, values],
  [
    objects,
    values,
  ],
);
assertPresence(
  ["number-operations"],
  [integerOperations, values],
  [values],
);
assertPresence(
  ["number-division"],
  [values],
  [integerOperations, values],
);
assertPresence(
  ["number-remainder"],
  [values],
  [integerOperations, values],
);
assertPresence(
  ["integer-negation"],
  [integerOperations],
  [values],
);
assertPresence(
  ["number-negation"],
  [integerOperations, values],
  [values],
);
assertPresence(
  ["number-coercion"],
  [values],
  [integerOperations, values],
);
assertPresence(
  ["string-number-coercion"],
  [values, values],
  [integerOperations],
);
assertPresence(
  ["typeof"],
  [typeOf, values],
  [integerOperations, values, objects],
);
assertPresence(
  ["prototype-chain"],
  [objects, values],
  [typeOf, values],
);
assertPresence(
  ["callable-objects"],
  [
    objects,
    values,
  ],
  [typeOf, values],
);
assertPresence(
  ["constructors"],
  [
    objects,
    values,
  ],
  [typeOf],
);
assertPresence(
  ["construction"],
  [
    receivers,
    objects,
  ],
  [typeOf],
);
assertPresence(
  ["property-assignment"],
  [objects, values],
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
    objects,
  ],
  [typeOf, values],
);
assertPresence(
  ["minimal-program"],
  [integerOperations, bindings, semantics],
  [
    asyncFunctions,
    environments,
    values,
    values,
  ],
);
assertPresence(
  ["logical-operations"],
  [semantics],
  [values, values],
);
assertPresence(
  ["logical-operations", "numbers"],
  [semantics, values],
  [values],
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
  [environments, objects],
);
assertPresence(
  ["expression-statements"],
  [],
  [execution, objects],
);
assertPresence(
  ["array-assignment-expressions"],
  [objects],
  [environments, bindings, objects],
);
assertPresence(
  ["captured-assignment-expressions"],
  [environments],
  [bindings, objects],
);
assertPresence(
  ["property-assignment-expressions"],
  [objects],
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
    objects,
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
    execution,
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
    objects,
    execution,
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
    execution,
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
assertValueFeatures([], [], ["decimal-to-f64", "errors", "numbers", "string-coercion", "strings", "symbols"]);
assertValueFeatures(["errors"], ["errors"], ["decimal-to-f64", "numbers", "string-coercion", "strings", "symbols"]);
assertValueFeatures(["numbers"], ["numbers"], ["errors", "string-coercion", "strings", "symbols"]);
assertValueFeatures(["strings"], ["strings"], ["decimal-to-f64", "errors", "numbers", "string-coercion", "symbols"]);
assertValueFeatures(["symbols"], ["symbols"], ["decimal-to-f64", "errors", "numbers", "string-coercion", "strings"]);
assertValueFeatures(["string-number-coercion"], ["decimal-to-f64", "numbers", "string-coercion", "strings"], ["errors", "symbols"]);
assertObjectFeatures(["arrays"], ["arrays"], ["array-assignment-expressions", "array-iterators", "collections", "iterators"]);
assertObjectFeatures(["array-assignment-expressions"], ["arrays", "array-assignment-expressions"], ["array-iterators", "collections", "iterators"]);
assertObjectFeatures(["iterators"], ["iterators"], ["arrays", "collections", "iterator-protocol", "iterator-results"]);
assertObjectFeatures(["array-iterators"], ["arrays", "array-iterators", "iterators"], ["collections"]);
assertObjectFeatures(["collections"], ["collections"], ["arrays", "collection-iterators", "iterators", "weak-collections"]);
assertObjectFeatures(["collection-entry-iterators"], ["arrays", "collection-entry-iterators", "collection-iterators", "collections", "iterators"], ["weak-collections"]);
assertObjectFeatures(["weak-collections"], ["collections", "weak-collections"], ["arrays", "iterators"]);
assertExecutionFeatures([], [], ["async-functions", "exceptions", "promise-resolution", "promise-resolvers", "promises", "recursive-async-functions", "suspension"]);
assertExecutionFeatures(["exceptions"], ["exceptions"], ["async-functions", "promise-resolution", "promise-resolvers", "promises", "suspension"]);
assertExecutionFeatures(["promises"], ["promises"], ["async-functions", "exceptions", "promise-resolution", "promise-resolvers", "suspension"]);
assertExecutionFeatures(["promise-resolution"], ["promise-resolution", "promises"], ["async-functions", "exceptions", "promise-resolvers", "suspension"]);
assertExecutionFeatures(["promise-resolvers"], ["promise-resolution", "promise-resolvers", "promises"], ["async-functions", "exceptions", "suspension"]);
assertExecutionFeatures(["thenables"], ["promise-resolution", "promise-resolvers", "promises"], ["async-functions", "exceptions", "suspension"]);
assertExecutionFeatures(["async-functions"], ["async-functions", "promise-resolution", "promises", "suspension"], ["exceptions", "promise-resolvers", "recursive-async-functions"]);
assertExecutionFeatures(["async-thenables"], ["async-functions", "promise-resolution", "promise-resolvers", "promises", "suspension"], ["exceptions", "recursive-async-functions"]);
assertExecutionFeatures(["recursive-async-functions"], ["async-functions", "promise-resolution", "promises", "recursive-async-functions", "suspension"], ["exceptions", "promise-resolvers"]);
assertPackageDependencies("microesnext-execution", ["promises"], [], ["microesnext-bytecode", "microesnext-values"]);
assertPackageDependencies("microesnext-execution", ["promise-resolution"], ["microesnext-values"], ["microesnext-bytecode"]);
assertPackageDependencies("microesnext-execution", ["core"], ["microesnext-bytecode"], ["microesnext-values"]);

console.log("feature dependency isolation verified");
