# MicroQuickJS source outline

This is a qualitative map of the MicroQuickJS snapshot currently kept in
`dev/microquickjs-experiment/src`. The ranges are one-based and inclusive. At
each level they proceed from top to bottom without gaps, so every source line
has a place in the outline. Filenames are intentionally repeated to make
sections convenient to copy, paste, and rearrange.

The outline covers implementation files, headers, templates, the build file,
examples, and executable tests. It leaves out `LICENSE`, `Changelog`, and
`README.md`, which are legal or prose documents rather than program source.

- `cutils.h[1:355]` - Portable low-level utilities shared by the runtime and its build tools.
  - `cutils.h[1:62]` - Establishes compiler attributes, endianness, common macros, booleans, and small integer helpers without depending heavily on a platform runtime.
  - `cutils.h[63:132]` - Defines unaligned reads and writes, byte swapping, and host-endian conversion for serialized numeric values.
  - `cutils.h[133:267]` - Supplies bit counting, rotation, sign extension, and fixed-width load/store helpers used by compact values and bytecode.
  - `cutils.h[268:319]` - Declares the deliberately small UTF-8 encoder, decoder, scanner, and hexadecimal-character support.
  - `cutils.h[320:355]` - Provides representation-preserving conversions between floating-point values and their integer bit patterns.

- `cutils.c[1:178]` - Implements the utility operations that are too substantial for the header.
  - `cutils.c[1:48]` - Licensing, includes, and compilation setup.
  - `cutils.c[49:87]` - Bounded string copying, concatenation, prefix checking, and suffix checking.
  - `cutils.c[88:178]` - Unicode code-point encoding and defensive UTF-8 decoding, including malformed and truncated sequences.

- `list.h[1:99]` - A small Linux-style intrusive circular-list implementation.
  - `list.h[1:46]` - Declares the link node, containing-record conversion, and empty-list initialization.
  - `list.h[47:78]` - Implements insertion at either end, deletion, and the empty test with no allocation or ownership policy.
  - `list.h[79:99]` - Adds forward and safe iteration macros, including iteration that permits removal of the current entry.

- `dtoa.h[1:83]` - The public contract for converting between JavaScript numbers and text.
  - `dtoa.h[1:47]` - Defines output modes: shortest round-trippable text, fixed significant digits, fixed fractional digits, and exponential selection.
  - `dtoa.h[48:64]` - Defines accepted input syntax, including radix prefixes, legacy octal, and numeric separators.
  - `dtoa.h[65:83]` - Declares sizing, formatting, parsing, and optional diagnostic entry points.

- `dtoa.c[1:1618]` - Implements correctly rounded number formatting and parsing without a large general-purpose bignum library.
  - `dtoa.c[1:309]` - Builds a compact multi-precision limb toolkit for addition, multiplication, division, shifts, normalization, and powers.
  - `dtoa.c[310:719]` - Adds rounding, comparison, radix-logarithm estimates, and fast paths for formatting ordinary integers.
  - `dtoa.c[720:1028]` - Defines exponent bounds and cached powers, then scales binary significands into a chosen output radix.
  - `dtoa.c[1029:1329]` - Chooses notation and emits the shortest or requested decimal representation while preserving round-trip behavior.
  - `dtoa.c[1330:1618]` - Accumulates input digits, applies radix and exponent scaling, rounds to binary64, and handles overflow and underflow.

- `libm.h[1:46]` - Declares the compact mathematical surface used by the JavaScript standard library.
  - `libm.h[1:40]` - Exposes rounding, scaling, trigonometric, exponential, logarithmic, and power operations under runtime-specific names.
  - `libm.h[41:46]` - Exposes a small number of internal kernels for focused tests.

- `libm.c[1:2260]` - Provides a self-contained mathematical implementation that can use either native floating point or soft float.
  - `libm.c[1:349]` - Adapts soft-float arithmetic and comparisons when requested, then implements JavaScript rounding semantics and basic bit-level helpers.
  - `libm.c[350:647]` - Establishes scaling, square root, and polynomial evaluation primitives used throughout the transcendental functions.
  - `libm.c[648:1057]` - Implements sine and cosine kernels plus careful reduction of large arguments by multiples of π/2.
  - `libm.c[1058:1362]` - Builds public sine, cosine, and tangent on those kernels, including reciprocal handling near tangent poles.
  - `libm.c[1363:1762]` - Implements asin, acos, atan, and atan2 with range-specific approximations and quadrant reconstruction.
  - `libm.c[1763:2260]` - Implements exponential, logarithmic, and power functions by reducing inputs, evaluating kernels, and reconstructing scale.

- `softfp_template.h[1:970]` - A macro-parameterized IEEE-754 implementation instantiated at several floating-point widths.
  - `softfp_template.h[1:115]` - Selects word sizes and names, defines the unpacked representation, and handles NaNs, infinities, and flags.
  - `softfp_template.h[116:222]` - Normalizes subnormals and centralizes shifted rounding so later operations share the same exception behavior.
  - `softfp_template.h[223:625]` - Implements addition, multiplication, division, and square root using integer mantissas and explicit rounding.
  - `softfp_template.h[626:721]` - Implements ordered and unordered comparisons, including signaling-NaN behavior.
  - `softfp_template.h[722:878]` - Converts between supported floating-point widths while preserving exceptional values and rounding rules.
  - `softfp_template.h[879:970]` - Adds exact remainder and removes the temporary macro vocabulary used by an instantiation.

- `softfp_template_icvt.h[1:172]` - Parameterizes conversion between floating-point values and signed or unsigned integers.
  - `softfp_template_icvt.h[1:36]` - Selects integer width, signedness, and generated symbol names.
  - `softfp_template_icvt.h[37:125]` - Converts floating point to integers with explicit rounding, saturation boundaries, and invalid-operation flags.
  - `softfp_template_icvt.h[126:172]` - Converts integers back to floating point through the shared normalization and rounding machinery.

- `mquickjs_opcode.h[1:265]` - Defines both JavaScript bytecode and regular-expression bytecode as reusable macro tables.
  - `mquickjs_opcode.h[1:50]` - Describes operand encodings so the compiler, interpreter, dumper, and serializer agree on instruction sizes.
  - `mquickjs_opcode.h[51:59]` - Sets up the table-expansion convention used to generate enums and metadata from one list.
  - `mquickjs_opcode.h[60:135]` - Defines stack manipulation, local/global access, calls, branches, property access, closures, exceptions, and iteration.
  - `mquickjs_opcode.h[136:169]` - Defines arithmetic, comparison, bitwise, and unary operations.
  - `mquickjs_opcode.h[170:222]` - Marks the stable opcode boundary, then defines compact and temporary forms used during compilation or execution.
  - `mquickjs_opcode.h[223:265]` - Reuses the same pattern for the smaller RegExp virtual machine.

- `mquickjs.h[1:466]` - The embedding API and the public representation of MicroQuickJS values.
  - `mquickjs.h[1:133]` - Defines 32/64-bit value encoding, tags, predefined constants, classes, property flags, and opaque public types.
  - `mquickjs.h[134:227]` - Exposes explicit GC roots, constructors, type predicates, strings, objects, arrays, and opaque host data.
  - `mquickjs.h[228:289]` - Adds the experiment's native collection, promise, iterator, and object-operation surface.
  - `mquickjs.h[290:398]` - Defines finalizers, context lifecycle, host hooks, property operations, native functions, evaluation, argument pushing, and calls.
  - `mquickjs.h[399:449]` - Exposes async resumption and the host-side compile, compact, relocate, and load pipeline for bytecode images.
  - `mquickjs.h[450:466]` - Provides logging and deliberately low-level value and heap diagnostics.

- `mquickjs_priv.h[1:268]` - Internal structures and cross-module declarations intentionally hidden from embedders.
  - `mquickjs_priv.h[1:58]` - Controls diagnostic builds and defines memory-block tags, alignment, and the tagged block header.
  - `mquickjs_priv.h[59:180]` - Declares runtime helpers for errors, constructors, arrays, strings, numbers, globals, classes, and typed arrays.
  - `mquickjs_priv.h[181:268]` - Declares the fork's native iterators, collections, weak collections, promises, async handlers, and additional built-ins.

- `mquickjs.c[1:19439]` - The compact JavaScript engine: representation, compiler, interpreter, heap, built-ins, and RegExp implementation.
  - `mquickjs.c[1:469]` - Establishes the machine's physical model.
    - `mquickjs.c[1:146]` - Defines limits, frame flags, stack records, and the compact layouts used for strings, arrays, properties, and bytecode.
    - `mquickjs.c[147:280]` - Adds collection, promise, iterator, class, and context structures while preserving the shared tagged-memory scheme.
    - `mquickjs.c[281:469]` - Declares cross-cutting helpers and creates the root-stack operations used to survive allocation and compaction.
  - `mquickjs.c[470:983]` - Implements allocation, exceptions, and diagnostics close to the raw heap.
    - `mquickjs.c[470:651]` - Maintains removable GC roots, checks collision between heap and stack, allocates upward, and shrinks or frees only where the compact heap permits.
    - `mquickjs.c[652:983]` - Represents thrown values and implements a tiny formatter able to print tagged JavaScript values without relying on the JS standard library.
  - `mquickjs.c[984:2245]` - Implements primitive numbers and the engine's WTF-8 string model.
    - `mquickjs.c[984:1262]` - Chooses immediate versus allocated numeric forms, classifies values, and exposes object/class/opaque queries.
    - `mquickjs.c[1263:1634]` - Allocates strings, validates UTF-8/WTF-8, and maintains a cache translating UTF-16 positions to byte positions.
    - `mquickjs.c[1635:2031]` - Builds, concatenates, compares, indexes, and slices strings while reconciling JavaScript UTF-16 semantics with UTF-8 storage.
    - `mquickjs.c[2032:2245]` - Interns strings, converts values to booleans and C strings, tracks exceptions, and recognizes numeric property keys.
  - `mquickjs.c[2246:3849]` - Implements compound heap values and JavaScript's property model.
    - `mquickjs.c[2246:2434]` - Allocates and resizes tagged value arrays and byte arrays, then lays the common foundation for object allocation.
    - `mquickjs.c[2435:2776]` - Implements strong/weak collection tables, collection iterators, promise job queues, and promise storage.
    - `mquickjs.c[2777:3224]` - Constructs objects and arrays, hashes properties, handles special properties, and grows or compacts property tables.
    - `mquickjs.c[3225:3471]` - Defines, replaces, deletes, and looks up ordinary, accessor, array, string, and typed-array properties.
    - `mquickjs.c[3472:3849]` - Resolves lexical/global variables and assembles class descriptors and standard-library objects.
  - `mquickjs.c[3850:5588]` - Creates contexts and prepares values and frames for execution.
    - `mquickjs.c[3850:4144]` - Materializes the ROM standard library, partitions the supplied memory into heap and stack, and initializes or tears down a context.
    - `mquickjs.c[4145:4452]` - Relocates closure references and decodes compressed source-position tables for stack traces and errors.
    - `mquickjs.c[4453:4830]` - Implements ToPrimitive, string/number/property-key conversion, decimal formatting, and integer coercion.
    - `mquickjs.c[4831:5291]` - Implements slow paths for arithmetic, equality, relational tests, `in`, `instanceof`, and `typeof`.
    - `mquickjs.c[5292:5588]` - Creates closures and iterators, checks interruptions and stack capacity, and saves async frames before suspension.
  - `mquickjs.c[5589:7280]` - Runs JavaScript bytecode in one large, stack-oriented dispatch loop.
    - `mquickjs.c[5589:6188]` - Enters functions and constructors; handles constants, stack permutations, calls, returns, throws, catch targets, and `await` suspension.
    - `mquickjs.c[6189:6667]` - Resumes control flow and implements local/global access, conditional branches, and property reads.
    - `mquickjs.c[6668:7193]` - Implements property writes, definitions, prototype changes, arithmetic, comparisons, and bitwise operations.
    - `mquickjs.c[7194:7280]` - Completes membership, deletion, and iterator opcodes, then leaves the dispatch loop with identifier helpers.
  - `mquickjs.c[7281:9832]` - Provides diagnostics and the front half of the compiler.
    - `mquickjs.c[7281:7782]` - Dumps values, objects, bytecode, and heap state, with alternate stub behavior when diagnostics are disabled.
    - `mquickjs.c[7783:8227]` - Defines parser state, token values, bytecode-function state, and optional bytecode dumping.
    - `mquickjs.c[8228:9066]` - Tracks source locations and lexes identifiers, strings, templates, numbers, comments, and RegExp literals.
    - `mquickjs.c[9067:9832]` - Emits instructions and source maps, manages labels and constant pools, and resolves locals, arguments, and captured variables.
  - `mquickjs.c[9833:12787]` - Compiles JavaScript with an explicitly resumable, recursion-free parser.
    - `mquickjs.c[9833:11230]` - Stores parser continuations as compact frames and compiles expressions, calls, literals, assignments, operators, and destructuring.
    - `mquickjs.c[11231:12179]` - Compiles statements, loops, switches, exceptions, declarations, functions, and classes while preserving completion values.
    - `mquickjs.c[12180:12509]` - Resolves closure variables, analyzes generated code, patches labels, and finalizes function bytecode.
    - `mquickjs.c[12510:12787]` - Parses JSON and exposes source compilation/evaluation entry points over zero-terminated input.
  - `mquickjs.c[12788:14084]` - Collects and serializes the compact heap.
    - `mquickjs.c[12788:13137]` - Computes object sizes, marks roots and reachable blocks, and performs ephemeron-style propagation for weak collection values.
    - `mquickjs.c[13138:13546]` - Sweeps unreachable blocks, updates pointers, and compacts live blocks in place with Jonkers' algorithm.
    - `mquickjs.c[13547:13852]` - Saves bytecode, converts pointer widths, and adjusts serialized offsets while preserving overlapping moves.
    - `mquickjs.c[13853:14084]` - Expands optional short floats, relocates a loaded image, and validates or installs precompiled bytecode.
  - `mquickjs.c[14085:16783]` - Implements the JavaScript standard runtime in native C.
    - `mquickjs.c[14085:14680]` - Implements Object operations, descriptors, prototypes, constructors, calls, and primitive wrappers.
    - `mquickjs.c[14681:15389]` - Implements String construction, indexing, searching, slicing, case conversion, and iterator behavior.
    - `mquickjs.c[15390:16175]` - Implements Array construction and methods, sorting, Number and Math behavior, and numeric helpers.
    - `mquickjs.c[16176:16490]` - Implements ArrayBuffer and typed-array construction, indexed access, bounds, and storage conversion.
    - `mquickjs.c[16491:16549]` - Supplies the deliberately small Date surface.
    - `mquickjs.c[16550:16783]` - Implements global numeric functions and recursive JSON parsing/stringification support.
  - `mquickjs.c[16784:19439]` - Contains an independent RegExp compiler and virtual machine plus its JavaScript-facing wrapper.
    - `mquickjs.c[16784:17403]` - Defines RegExp parser state, emits compact instructions, decodes escapes, and builds Unicode and character classes.
    - `mquickjs.c[17404:18006]` - Combines class ranges, parses groups and quantifiers, computes register and stack needs, and produces RegExp bytecode.
    - `mquickjs.c[18007:18629]` - Interprets RegExp bytecode with explicit backtracking, captures, assertions, case folding, and UTF-8 traversal.
    - `mquickjs.c[18630:19439]` - Implements RegExp construction, execution, replacement, matching, searching, splitting, and string integration.

- `mquickjs_build.h[1:97]` - Declarative input types for constructing the ROM standard library.
  - `mquickjs_build.h[1:44]` - Defines property entries and macros for constants, functions, accessors, classes, and sentinels.
  - `mquickjs_build.h[45:80]` - Defines class records, inheritance, finalizers, and native C function signatures.
  - `mquickjs_build.h[81:97]` - Defines the complete standard-library descriptor consumed by the builder and runtime.

- `mquickjs_build.c[1:936]` - A host utility that turns declarative built-ins into compact C/ROM tables.
  - `mquickjs_build.c[1:166]` - Defines builder-side atoms, C functions, class records, build state, and the fixed atom vocabulary shared with the parser.
  - `mquickjs_build.c[167:286]` - Interns atoms and native functions and emits stable predefined-atom constants.
  - `mquickjs_build.c[287:419]` - Serializes atom strings, sorted lookup tables, native-function tables, and finalizer tables with runtime-compatible alignment.
  - `mquickjs_build.c[420:602]` - Converts declarative properties into hashed ROM property arrays and encodes immediate, string, accessor, class, and function values.
  - `mquickjs_build.c[603:775]` - Resolves class inheritance, emits class/prototype objects, and recursively converts individual declarative values.
  - `mquickjs_build.c[776:823]` - Walks the library definitions once to discover every atom needed by the eventual image.
  - `mquickjs_build.c[824:936]` - Parses builder options and emits either atom definitions or the complete aligned standard-library C source.

- `mqjs_stdlib.c[1:505]` - Declares which native objects and functions make up the default MicroQuickJS environment.
  - `mqjs_stdlib.c[1:113]` - Defines global constants and functions plus Object and Function classes and prototypes.
  - `mqjs_stdlib.c[114:243]` - Defines Array, String, Boolean, Number, Error families, Math, JSON, Date, and their properties.
  - `mqjs_stdlib.c[244:289]` - Generates the ArrayBuffer and typed-array families from a shared description.
  - `mqjs_stdlib.c[290:303]` - Defines RegExp construction and prototype behavior.
  - `mqjs_stdlib.c[304:480]` - Adds iterators, collections, promises, optional example classes, and assembles the final class/global table.
  - `mqjs_stdlib.c[481:505]` - In builder mode, emits the generated standard-library source from that declarative table.

- `mqjs.c[1:799]` - The native command-line shell and REPL around the engine.
  - `mqjs.c[1:141]` - Provides logging, explicit GC, clocks, and a host `load()` operation.
  - `mqjs.c[142:258]` - Implements timeout registration and cancellation with a small sorted timer queue and event-loop polling.
  - `mqjs.c[259:453]` - Loads source or bytecode, evaluates it, reports exceptions, initializes host functions, and runs pending timers and jobs.
  - `mqjs.c[454:591]` - Adds REPL completion and syntax coloring by consulting the engine's keyword and identifier rules.
  - `mqjs.c[592:799]` - Parses command-line modes, configures memory and compilation, and coordinates scripts, interactive input, and bytecode output.

- `readline.h[1:98]` - The interface and state object for the dependency-free line editor.
  - `readline.h[1:88]` - Defines editable buffers, cursor/display state, history, completion, prompts, and callbacks.
  - `readline.h[89:98]` - Declares byte handling and the terminal operations the platform backend must provide.

- `readline.c[1:742]` - Terminal-independent interactive line editing.
  - `readline.c[1:230]` - Measures characters and redraws only the changed display while accounting for prompts, wrapping, colors, and cursor position.
  - `readline.c[231:386]` - Implements insertion, deletion, movement, word movement, kill/yank operations, and beginning/end navigation over UTF-8 input.
  - `readline.c[387:475]` - Navigates and stores history without losing the user's partially entered current line.
  - `readline.c[476:562]` - Collects completions, finds their common prefix, inserts it, or prints choices before restoring the prompt.
  - `readline.c[563:710]` - Maps control and escape sequences to editing actions and recognizes a completed or cancelled line.
  - `readline.c[711:742]` - Decodes incoming UTF-8 bytes and initializes a fresh editing session.

- `readline_tty.h[1:29]` - The operating-system terminal adapter contract.
  - `readline_tty.h[1:29]` - Declares terminal initialization and asynchronous interruption reporting.

- `readline_tty.c[1:246]` - Windows and POSIX implementations of raw interactive terminal input.
  - `readline_tty.c[1:109]` - Uses Windows console modes, VT processing, and control handlers to obtain byte-oriented input.
  - `readline_tty.c[110:169]` - Uses termios and signal handlers to enter raw mode on POSIX and restore the terminal on exit.
  - `readline_tty.c[170:246]` - Shares formatted output, flushing, byte reading, and interruption state across both backends.

- `example_stdlib.c[1:36]` - A compact declarative standard library used by the embedding example.
  - `example_stdlib.c[1:28]` - Describes a native Rectangle constructor, accessors, methods, and class identity.
  - `example_stdlib.c[29:36]` - Derives FilledRectangle from Rectangle and combines both with the normal standard library.

- `example.c[1:308]` - Demonstrates embedding MicroQuickJS into a native program.
  - `example.c[1:76]` - Defines the native Rectangle data model and method declarations.
  - `example.c[77:170]` - Implements Rectangle and FilledRectangle finalization, construction, accessors, area computation, and a captured-value closure.
  - `example.c[171:244]` - Adds printing and clock functions that make the embedded environment useful to ordinary scripts.
  - `example.c[245:272]` - Implements logging and file loading for source or bytecode input.
  - `example.c[273:308]` - Allocates a fixed machine buffer, creates a context, runs a program, reports errors, and frees the host allocation.

- `microesnext.c[1:973]` - Experimental native collection and promise behavior added during the Rust-engine investigation.
  - `microesnext.c[1:315]` - Implements Map, Set, WeakMap, and WeakSet operations over the compact collection primitives, including iteration and receiver checks.
  - `microesnext.c[316:440]` - Defines array helpers, promise state access, resolver closures, reaction jobs, and raw settlement.
  - `microesnext.c[441:644]` - Implements promise resolution, including self-resolution, promise adoption, thenable assimilation, and chained reactions.
  - `microesnext.c[645:789]` - Connects promise settlement to suspended async frames and exposes constructor, `then`, `catch`, `resolve`, and `reject` behavior.
  - `microesnext.c[790:933]` - Implements `all`, `race`, and `finally`, using arrays as compact reaction records and counters.
  - `microesnext.c[934:973]` - Drains queued promise reactions and propagates fulfillment, rejection, or handler exceptions into the next promise.

- `Makefile[1:152]` - Builds the native shell, examples, generated standard library, tests, and installable artifacts.
  - `Makefile[1:56]` - Selects compiler and platform flags, feature switches, generated files, and object sets.
  - `Makefile[57:116]` - Defines compilation and generation dependencies, including rebuilding the ROM library before linking consumers.
  - `Makefile[117:140]` - Runs language tests, examples, benchmarks, and bytecode round trips.
  - `Makefile[141:152]` - Installs binaries, headers, and libraries or removes all generated output.

- `tests/mandelbrot.js[1:39]` - A small deterministic numerical and string-building workload.
  - `tests/mandelbrot.js[1:26]` - Iterates the Mandelbrot recurrence across a character grid and returns its text rendering.
  - `tests/mandelbrot.js[27:39]` - Times several runs and prints both the image and elapsed duration.

- `tests/microbench.js[1:1137]` - A broad performance probe for operations important to a compact interpreter.
  - `tests/microbench.js[1:157]` - Formats benchmark output, calibrates loop counts, subtracts empty-loop cost, and reports normalized timings.
  - `tests/microbench.js[158:251]` - Measures clocks and ordinary object-property reads, writes, updates, creation, and deletion.
  - `tests/microbench.js[252:405]` - Measures dense arrays, holes, length changes, push, and pop.
  - `tests/microbench.js[406:554]` - Measures typed arrays, closure/global access, calls, and captured variables.
  - `tests/microbench.js[555:648]` - Measures integer, float, optional big-number arithmetic, and collection insertion.
  - `tests/microbench.js[649:815]` - Measures iteration forms, Math calls, RegExp operations, and several string-building strategies.
  - `tests/microbench.js[816:952]` - Measures sorting with a deterministic pseudo-random data generator and reference checksum.
  - `tests/microbench.js[953:1023]` - Measures number/string conversion and reads or writes benchmark result files.
  - `tests/microbench.js[1024:1137]` - Selects benchmark groups, scales workloads, compares saved baselines, and drives command-line execution.

- `tests/test_builtin.js[1:875]` - Conformance tests for built-in objects and native standard-library behavior.
  - `tests/test_builtin.js[1:107]` - Defines assertions and verifies Function construction, calls, binding, metadata, and prototypes.
  - `tests/test_builtin.js[108:182]` - Exercises Object properties, descriptors, inheritance, keys, and enumeration.
  - `tests/test_builtin.js[183:334]` - Exercises arrays, sparse behavior, methods, sorting, iteration, and extension rules.
  - `tests/test_builtin.js[335:490]` - Exercises string, Math, Number, parsing, formatting, and conversion behavior.
  - `tests/test_builtin.js[491:637]` - Exercises global eval, typed arrays, UTF-16 position accounting, and structured error checks.
  - `tests/test_builtin.js[638:776]` - Exercises JSON syntax and depth, large recursion-free parsing, and RegExp matching and replacement.
  - `tests/test_builtin.js[777:875]` - Verifies line and column reporting through nested eval and syntax/runtime errors.

- `tests/test_closure.js[1:106]` - Focused tests for lexical environments and captured variables.
  - `tests/test_closure.js[1:38]` - Defines assertions and a nested closure with several parameters and local bindings.
  - `tests/test_closure.js[39:76]` - Verifies returned closures and independent captured state across factory calls.
  - `tests/test_closure.js[77:106]` - Verifies mutation and lookup across deeper nested closure chains.

- `tests/test_language.js[1:355]` - Core JavaScript expression and semantic tests.
  - `tests/test_language.js[1:64]` - Defines equality and exception assertions used by the suite.
  - `tests/test_language.js[65:154]` - Exercises unary, arithmetic, bitwise, logical, comparison, membership, deletion, and conditional operators.
  - `tests/test_language.js[155:235]` - Exercises coercion, equality families, and prefix/postfix updates across value categories.
  - `tests/test_language.js[236:291]` - Exercises binary operators, assignments, short-circuiting, and object/function cases.
  - `tests/test_language.js[292:355]` - Exercises prototypes, `arguments`, primitive conversion hooks, and labeled control flow.

- `tests/test_loop.js[1:395]` - Control-flow tests for loops, switches, and exception regions.
  - `tests/test_loop.js[1:73]` - Exercises while, do/while, for, break, and continue behavior.
  - `tests/test_loop.js[74:195]` - Exercises for/in enumeration over arrays, objects, prototypes, mutation, and proxies.
  - `tests/test_loop.js[196:256]` - Exercises nested breaks and switch selection and fallthrough.
  - `tests/test_loop.js[257:358]` - Exercises return, throw, catch, and finally interactions in nested control flow.
  - `tests/test_loop.js[359:395]` - Finishes exception edge cases and invokes the complete control-flow suite.

- `tests/test_rect.js[1:68]` - End-to-end use of the native Rectangle example classes.
  - `tests/test_rect.js[1:41]` - Checks construction, accessors, methods, inheritance, class identity, and invalid calls.
  - `tests/test_rect.js[42:68]` - Checks the native captured-value callback and runs the example test.
