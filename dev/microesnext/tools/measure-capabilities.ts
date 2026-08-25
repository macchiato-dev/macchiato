type Probe = readonly [name: string, expected: number | "nonzero"];

const core: Probe = ["core_probe", 42];
const configurations: readonly (readonly [string, string, readonly Probe[]])[] =
  [
    ["minimal", "", [core]],
    ["arrays", "arrays", [core, ["arrays_probe", 42]]],
    [
      "array iterators",
      "array-iterators",
      [core, ["arrays_probe", 42], ["iterators_probe", 11], [
        "array_iterators_probe",
        1,
      ]],
    ],
    [
      "atoms",
      "atoms",
      [core, ["atoms_probe", "nonzero"], ["strings_probe", "nonzero"]],
    ],
    ["async suspension", "async", [core, ["async_probe", 7]]],
    [
      "async functions",
      "async-functions",
      [core, ["async_probe", 7], ["async_functions_probe", 42]],
    ],
    ["collections", "collections", [core, ["collections_probe", 0]]],
    ["control flow", "control-flow", [core, ["control_flow_probe", 42]]],
    [
      "minimal programmable runtime",
      "minimal-program",
      [core, ["minimal_program_probe", 720]],
    ],
    [
      "control flow with scalar truthiness",
      "control-flow,numbers,strings",
      [
        core,
        ["control_flow_probe", 42],
        ["numbers_probe", 1.25],
        ["strings_probe", "nonzero"],
        ["scalar_truthiness_probe", 1],
      ],
    ],
    [
      "collection iterators",
      "collection-iterators",
      [core, ["collections_probe", 0], ["iterators_probe", 11], [
        "collection_iterators_probe",
        1,
      ]],
    ],
    [
      "collection entry iterators",
      "collection-entry-iterators",
      [
        core,
        ["arrays_probe", 42],
        ["collections_probe", 0],
        ["iterators_probe", 11],
        ["collection_entry_iterators_probe", 42],
      ],
    ],
    [
      "collection value equality",
      "collections,numbers,strings",
      [
        core,
        ["collections_probe", 0],
        ["numbers_probe", 1.25],
        ["strings_probe", "nonzero"],
        ["collection_equality_probe", 1],
      ],
    ],
    ["exceptions", "exceptions", [core, ["exceptions_probe", 42]]],
    ["environment cells", "environments", [core, ["environments_probe", 42]]],
    ["strict equality", "equality", [core, ["equality_probe", 1]]],
    [
      "strict equality with numbers only",
      "equality,numbers",
      [
        core,
        ["equality_probe", 1],
        ["number_equality_probe", 1],
        ["numbers_probe", 1.25],
      ],
    ],
    [
      "strict equality with scalar values",
      "equality,numbers,strings",
      [
        core,
        ["equality_probe", 1],
        ["numbers_probe", 1.25],
        ["strings_probe", "nonzero"],
        ["number_equality_probe", 1],
        ["string_equality_probe", 1],
      ],
    ],
    ["guest errors", "errors", [core, ["errors_probe", 42]]],
    [
      "closures with shared environments",
      "environments,functions,locals",
      [
        core,
        ["environments_probe", 42],
        ["functions_probe", "nonzero"],
        ["locals_probe", 42],
        ["closure_environments_probe", 42],
      ],
    ],
    ["functions", "functions", [core, ["functions_probe", "nonzero"]]],
    [
      "recursive functions",
      "recursive-functions",
      [core, ["functions_probe", "nonzero"], ["environments_probe", 42], [
        "recursive_functions_probe",
        42,
      ]],
    ],
    [
      "recursive async functions",
      "recursive-async-functions",
      [
        core,
        ["async_probe", 7],
        ["async_functions_probe", 42],
        ["environments_probe", 42],
        ["recursive_async_functions_probe", 42],
      ],
    ],
    [
      "functions with local parameters",
      "function-arguments",
      [core, ["functions_probe", "nonzero"], ["function_arguments_probe", 42]],
    ],
    [
      "receiver-aware calls",
      "receivers",
      [core, ["functions_probe", "nonzero"], ["function_arguments_probe", 42], [
        "receivers_probe",
        42,
      ]],
    ],
    ["iterators", "iterators", [core, ["iterators_probe", 11]]],
    ["locals", "locals", [core, ["locals_probe", 42]]],
    [
      "logical operations",
      "logical-operations",
      [core, ["logical_operations_probe", 1]],
    ],
    [
      "bounded numeric negation",
      "integer-negation",
      [core, ["integer_negation_probe", -42]],
    ],
    [
      "logical operations with numbers only",
      "logical-operations,numbers",
      [
        core,
        ["logical_operations_probe", 1],
        ["number_logical_operations_probe", 42],
        ["numbers_probe", 1.25],
      ],
    ],
    [
      "logical operations with strings only",
      "logical-operations,strings",
      [
        core,
        ["logical_operations_probe", 1],
        ["string_logical_operations_probe", 42],
        ["strings_probe", "nonzero"],
      ],
    ],
    [
      "iterator results",
      "iterator-results",
      [core, ["iterator_results_probe", 42]],
    ],
    [
      "iterable protocol",
      "iterable-protocol",
      [
        core,
        ["symbols_probe", 1],
        ["well_known_symbols_probe", "nonzero"],
        ["iterable_protocol_probe", 1],
      ],
    ],
    ["numbers", "numbers", [core, ["numbers_probe", 1.25]]],
    [
      "primitive Number coercion",
      "number-coercion",
      [core, ["numbers_probe", 1.25], ["number_coercion_probe", 1]],
    ],
    [
      "string Number coercion",
      "string-number-coercion",
      [core, ["number_coercion_probe", 1], ["string_number_coercion_probe", 42]],
    ],
    [
      "number operations",
      "number-operations",
      [core, ["numbers_probe", 1.25], ["number_operations_probe", 3.25]],
    ],
    [
      "number division",
      "number-division",
      [core, ["numbers_probe", 1.25], ["number_division_probe", 3.5]],
    ],
    [
      "number remainder",
      "number-remainder",
      [core, ["numbers_probe", 1.25], ["number_remainder_probe", 1]],
    ],
    [
      "JavaScript Number negation",
      "number-negation",
      [core, ["numbers_probe", 1.25], ["number_negation_probe", 1]],
    ],
    [
      "objects",
      "objects",
      [
        core,
        ["atoms_probe", "nonzero"],
        ["objects_probe", 42],
        ["strings_probe", "nonzero"],
      ],
    ],
    [
      "property assignment",
      "property-assignment",
      [core, ["atoms_probe", "nonzero"], ["property_assignment_probe", 1]],
    ],
    [
      "functions and objects",
      "functions,objects",
      [core, ["atoms_probe", "nonzero"], ["functions_probe", 42], ["objects_probe", 42]],
    ],
    [
      "callable objects",
      "callable-objects",
      [core, ["atoms_probe", "nonzero"], ["callable_objects_probe", 42]],
    ],
    [
      "constructors",
      "constructors",
      [core, ["atoms_probe", "nonzero"], ["constructors_probe", 1]],
    ],
    [
      "constructor receivers",
      "constructors,receivers",
      [
        core,
        ["atoms_probe", "nonzero"],
        ["constructors_probe", 1],
        ["receivers_probe", 42],
      ],
    ],
    [
      "construction",
      "construction",
      [core, ["atoms_probe", "nonzero"], ["construction_probe", 1]],
    ],
    [
      "classes",
      "classes",
      [core, ["atoms_probe", "nonzero"], ["classes_probe", 1]],
    ],
    [
      "class methods",
      "class-methods",
      [core, ["atoms_probe", "nonzero"], ["class_methods_probe", 1]],
    ],
    [
      "class expression runtime",
      "class-expressions",
      [core, ["atoms_probe", "nonzero"], ["class_methods_probe", 1], [
        "stack_operations_probe",
        1,
      ]],
    ],
    [
      "recursive constructors",
      "recursive-constructors",
      [core, ["atoms_probe", "nonzero"], ["recursive_constructors_probe", 1]],
    ],
    [
      "instanceof",
      "instanceof",
      [core, ["atoms_probe", "nonzero"], ["instanceof_probe", 1]],
    ],
    [
      "prototype chain",
      "prototype-chain",
      [core, ["atoms_probe", "nonzero"], ["prototype_chain_probe", 1]],
    ],
    ["strings", "strings", [core, ["strings_probe", "nonzero"]]],
    [
      "typeof",
      "typeof",
      [core, ["strings_probe", "nonzero"], ["typeof_probe", 1]],
    ],
    ["symbols", "symbols", [core, ["symbols_probe", 1]]],
    [
      "well-known symbols",
      "well-known-symbols",
      [core, ["symbols_probe", 1], ["well_known_symbols_probe", "nonzero"]],
    ],
    ["promises", "promises", [core, ["promises_probe", "nonzero"]]],
    [
      "native promise resolution",
      "promise-resolution",
      [core, ["promises_probe", "nonzero"], ["promise_resolution_probe", 42]],
    ],
    [
      "one-shot promise resolvers",
      "promise-resolvers",
      [core, ["promises_probe", "nonzero"], ["promise_resolution_probe", 42], [
        "promise_resolvers_probe",
        42,
      ]],
    ],
    [
      "object thenable assimilation",
      "thenables",
      [core, ["objects_probe", 42], ["promises_probe", "nonzero"], [
        "promise_resolvers_probe",
        42,
      ], ["receivers_probe", 42], ["thenables_probe", 42]],
    ],
    [
      "async return thenable assimilation",
      "async-thenables",
      [core, ["async_functions_probe", 42], ["thenables_probe", 42], [
        "async_thenables_probe",
        42,
      ]],
    ],
    [
      "weak collections",
      "weak-collections",
      [core, ["weak_collections_probe", "nonzero"]],
    ],
    [
      "all",
      "array-iterators,async-thenables,class-expressions,collection-entry-iterators,collection-iterators,construction,constructors,control-flow,environments,equality,exceptions,function-arguments,instanceof,iterable-protocol,iterator-results,logical-operations,number-division,number-negation,number-operations,number-remainder,objects,property-assignment,receivers,recursive-async-functions,recursive-constructors,recursive-functions,string-number-coercion,string-operations,typeof,well-known-symbols,weak-collections",
      [
        core,
        ["arrays_probe", 42],
        ["array_iterators_probe", 1],
        ["atoms_probe", "nonzero"],
        ["async_probe", 7],
        ["async_functions_probe", 42],
        ["async_thenables_probe", 42],
        ["collections_probe", 0],
        ["collection_iterators_probe", 1],
        ["collection_entry_iterators_probe", 42],
        ["collection_equality_probe", 1],
        ["control_flow_probe", 42],
        ["constructors_probe", 1],
        ["construction_probe", 1],
        ["classes_probe", 1],
        ["class_methods_probe", 1],
        ["stack_operations_probe", 1],
        ["scalar_truthiness_probe", 1],
        ["exceptions_probe", 42],
        ["errors_probe", 42],
        ["environments_probe", 42],
        ["equality_probe", 1],
        ["number_equality_probe", 1],
        ["string_equality_probe", 1],
        ["closure_environments_probe", 42],
        ["functions_probe", "nonzero"],
        ["recursive_functions_probe", 42],
        ["recursive_constructors_probe", 1],
        ["recursive_async_functions_probe", 42],
        ["function_arguments_probe", 42],
        ["iterators_probe", 11],
        ["locals_probe", 42],
        ["logical_operations_probe", 1],
        ["number_logical_operations_probe", 42],
        ["string_logical_operations_probe", 42],
        ["iterator_results_probe", 42],
        ["iterable_protocol_probe", 1],
        ["numbers_probe", 1.25],
        ["number_coercion_probe", 1],
        ["string_number_coercion_probe", 42],
        ["number_operations_probe", 3.25],
        ["number_division_probe", 3.5],
        ["number_remainder_probe", 1],
        ["number_negation_probe", 1],
        ["objects_probe", 42],
        ["property_assignment_probe", 1],
        ["strings_probe", "nonzero"],
        ["typeof_probe", 1],
        ["instanceof_probe", 1],
        ["symbols_probe", 1],
        ["well_known_symbols_probe", "nonzero"],
        ["promises_probe", "nonzero"],
        ["promise_resolution_probe", 42],
        ["promise_resolvers_probe", 42],
        ["receivers_probe", 42],
        ["thenables_probe", 42],
        ["weak_collections_probe", "nonzero"],
      ],
    ],
  ];

const artifact =
  "target/wasm32-unknown-unknown/release/microesnext-capability-size.wasm";

console.log("| Build | Wasm bytes | Gzip bytes |");
console.log("| --- | ---: | ---: |");
const selected = Deno.args.length === 0
  ? configurations
  : configurations.filter(([name]) => Deno.args.includes(name));
if (selected.length !== (Deno.args.length || configurations.length)) {
  throw new Error("unknown or duplicate capability build name");
}
for (const [name, features, probes] of selected) {
  const args = [
    "build",
    "--quiet",
    "--release",
    "--target",
    "wasm32-unknown-unknown",
    "-p",
    "microesnext-capability-size",
    "--no-default-features",
  ];
  if (features) args.push("--features", features);
  const command = new Deno.Command("cargo", {
    args,
    stdout: "null",
    stderr: "inherit",
  });
  const result = await command.output();
  if (!result.success) Deno.exit(result.code);
  const bytes = await Deno.readFile(artifact);
  const { instance } = await WebAssembly.instantiate(bytes);
  for (const [probe, expected] of probes) {
    const run = instance.exports[probe];
    if (typeof run !== "function") throw new Error(`${name}: missing ${probe}`);
    const actual = run();
    if (
      typeof actual !== "number" ||
      (expected === "nonzero" ? actual === 0 : actual !== expected)
    ) {
      throw new Error(
        `${name}: ${probe} returned ${actual}, expected ${expected}`,
      );
    }
  }
  const compressed = new Uint8Array(
    await new Response(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
  );
  console.log(`| ${name} | ${bytes.length} | ${compressed.length} |`);
}
