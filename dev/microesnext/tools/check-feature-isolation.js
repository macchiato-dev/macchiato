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
const integerNegation = "microesnext-integer-negation";
const equality = "microesnext-equality";
const logicalOperations = "microesnext-logical-operations";
const numberOperations = "microesnext-number-operations";
const numberNegation = "microesnext-number-negation";
const numberCoercion = "microesnext-number-coercion";
const numberDivision = "microesnext-number-division";
const numberRemainder = "microesnext-number-remainder";
const stringNumberCoercion = "microesnext-string-number-coercion";
const typeOf = "microesnext-typeof";
const prototypeChain = "microesnext-prototype-chain";
const callableObjects = "microesnext-callable-objects";
const construction = "microesnext-construction";
const recursiveConstructors = "microesnext-recursive-constructors";
const instanceOf = "microesnext-instanceof";
const stackOperations = "microesnext-stack-operations";
const capturedAssignmentExpressions =
  "microesnext-captured-assignment-expressions";
const propertyAssignmentExpressions =
  "microesnext-property-assignment-expressions";

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
    asyncThenables,
    environments,
    errors,
    equality,
    integerOperations,
    integerNegation,
    logicalOperations,
    numberOperations,
    numberNegation,
    numberCoercion,
    numberDivision,
    numberRemainder,
    stringNumberCoercion,
    parameters,
    promiseResolution,
    promiseResolvers,
    recursiveAsyncFunctions,
    recursiveFunctions,
    receivers,
    suspension,
    thenables,
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
    "microesnext-atoms",
    numberOperations,
    "microesnext-objects",
    "microesnext-strings",
  ],
);
assertPresence(
  ["number-operations"],
  [integerOperations, numberOperations, "microesnext-numbers"],
  [integerNegation, numberDivision, numberNegation, numberRemainder, "microesnext-strings"],
);
assertPresence(
  ["number-division"],
  [numberDivision, "microesnext-numbers"],
  [integerOperations, numberOperations, numberRemainder, "microesnext-strings"],
);
assertPresence(
  ["number-remainder"],
  [numberRemainder, "microesnext-numbers"],
  [integerOperations, numberDivision, numberOperations, "microesnext-strings"],
);
assertPresence(
  ["integer-negation"],
  [integerNegation],
  [integerOperations, numberNegation, numberOperations, "microesnext-numbers"],
);
assertPresence(
  ["number-negation"],
  [integerNegation, numberCoercion, numberNegation, "microesnext-numbers"],
  [integerOperations, numberOperations, "microesnext-strings"],
);
assertPresence(
  ["number-coercion"],
  [numberCoercion, "microesnext-numbers"],
  [integerNegation, integerOperations, numberNegation, numberOperations, stringNumberCoercion, "microesnext-strings"],
);
assertPresence(
  ["string-number-coercion"],
  [numberCoercion, stringNumberCoercion, "microesnext-numbers", "microesnext-strings"],
  [integerNegation, integerOperations, numberNegation, numberOperations],
);
assertPresence(
  ["typeof"],
  [typeOf, "microesnext-strings"],
  [integerOperations, numberOperations, "microesnext-numbers", "microesnext-objects"],
);
assertPresence(
  ["prototype-chain"],
  [prototypeChain, "microesnext-objects", "microesnext-atoms", "microesnext-strings"],
  [typeOf, "microesnext-numbers"],
);
assertPresence(
  ["callable-objects"],
  [
    callableObjects,
    "microesnext-functions",
    "microesnext-objects",
    "microesnext-atoms",
    "microesnext-strings",
  ],
  [prototypeChain, typeOf, "microesnext-numbers"],
);
assertPresence(
  ["constructors"],
  [
    callableObjects,
    "microesnext-functions",
    "microesnext-objects",
    "microesnext-atoms",
    "microesnext-strings",
  ],
  [instanceOf, prototypeChain, typeOf],
);
assertPresence(
  ["construction"],
  [
    construction,
    receivers,
    callableObjects,
    "microesnext-functions",
    "microesnext-objects",
  ],
  [instanceOf, prototypeChain, typeOf],
);
assertPresence(
  ["property-assignment"],
  ["microesnext-objects", "microesnext-atoms", "microesnext-strings"],
  [construction, receivers, "microesnext-functions"],
);
assertPresence(
  ["recursive-constructors"],
  [
    recursiveConstructors,
    callableObjects,
    "microesnext-recursive-functions",
    "microesnext-environments",
  ],
  [construction, instanceOf, receivers, typeOf],
);
assertPresence(
  ["instanceof"],
  [
    instanceOf,
    prototypeChain,
    callableObjects,
    "microesnext-functions",
    "microesnext-objects",
  ],
  [typeOf, "microesnext-numbers"],
);
assertPresence(
  ["minimal-program"],
  [integerOperations, "microesnext-locals", "microesnext-truthiness"],
  [
    asyncFunctions,
    environments,
    integerNegation,
    numberNegation,
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
  ["local-assignment-expressions"],
  ["microesnext-locals", stackOperations],
  [environments, "microesnext-objects"],
);
assertPresence(
  ["captured-assignment-expressions"],
  [capturedAssignmentExpressions, environments],
  ["microesnext-functions", "microesnext-locals", "microesnext-objects", stackOperations],
);
assertPresence(
  ["property-assignment-expressions"],
  ["microesnext-objects", propertyAssignmentExpressions],
  [capturedAssignmentExpressions, environments, "microesnext-functions", stackOperations],
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
