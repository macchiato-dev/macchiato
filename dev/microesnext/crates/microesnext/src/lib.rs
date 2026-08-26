#![no_std]

pub use microesnext_bytecode as bytecode;
pub use microesnext_types::{Error, HeapRef, Value};
pub use microesnext_vm::{Machine, Outcome};
pub use microesnext_vm_core::{Core, CoreOutcome};

#[cfg(feature = "locals")]
pub use microesnext_locals as locals;

#[cfg(feature = "integer-operations")]
pub use microesnext_integer_operations as integer_operations;

#[cfg(feature = "integer-negation")]
pub use microesnext_integer_negation as integer_negation;

#[cfg(feature = "instanceof")]
pub use microesnext_objects::instanceof;

#[cfg(feature = "logical-operations")]
pub use microesnext_logical_operations as logical_operations;

#[cfg(feature = "method-calls")]
pub use microesnext_objects::method_calls;

#[cfg(feature = "arrays")]
pub use microesnext_arrays as arrays;

#[cfg(feature = "array-assignment-expressions")]
pub use microesnext_arrays::assignment_expressions as array_assignment_expressions;

#[cfg(feature = "array-iterators")]
pub use microesnext_arrays::iterators as array_iterators;

#[cfg(any(feature = "atoms", feature = "iterator-results"))]
pub use microesnext_strings::atoms;

#[cfg(feature = "async")]
pub use microesnext_async as r#async;

#[cfg(feature = "async-functions")]
pub use microesnext_async_functions as async_functions;

#[cfg(feature = "async-thenables")]
pub use microesnext_async_thenables as async_thenables;

#[cfg(feature = "collections")]
pub use microesnext_collections as collections;

#[cfg(feature = "callable-objects")]
pub use microesnext_objects::callable as callable_objects;

#[cfg(feature = "class-constructors")]
pub use microesnext_objects::class_constructor as class_constructors;

#[cfg(feature = "collection-iterators")]
pub use microesnext_collections::iterators as collection_iterators;

#[cfg(feature = "collection-entry-iterators")]
pub use microesnext_collections::entry_iterators as collection_entry_iterators;

#[cfg(feature = "iterators")]
pub use microesnext_iterators as iterators;

#[cfg(feature = "iterator-results")]
pub use microesnext_iterator_results as iterator_results;

#[cfg(feature = "iterable-protocol")]
pub use microesnext_iterable_protocol as iterable_protocol;

#[cfg(feature = "functions")]
pub use microesnext_arena::closures as functions;
#[cfg(feature = "numbers")]
pub use microesnext_numbers as numbers;
#[cfg(feature = "number-coercion")]
pub use microesnext_numbers::coercion as number_coercion;
#[cfg(feature = "number-division")]
pub use microesnext_numbers::division as number_division;
#[cfg(feature = "number-negation")]
pub use microesnext_numbers::negation as number_negation;
#[cfg(feature = "number-operations")]
pub use microesnext_numbers::operations as number_operations;
#[cfg(feature = "number-remainder")]
pub use microesnext_numbers::remainder as number_remainder;
#[cfg(feature = "string-number-coercion")]
pub use microesnext_numbers::string_coercion as string_number_coercion;
#[cfg(feature = "function-arguments")]
pub use microesnext_parameters as parameters;
#[cfg(feature = "typeof")]
pub use microesnext_typeof as r#typeof;

#[cfg(feature = "exceptions")]
pub use microesnext_exceptions as exceptions;

#[cfg(feature = "errors")]
pub use microesnext_errors as errors;

#[cfg(feature = "equality")]
pub use microesnext_equality as equality;

#[cfg(feature = "environments")]
pub use microesnext_environments as environments;

#[cfg(feature = "captured-assignment-expressions")]
pub use microesnext_environments::assignment_expressions as captured_assignment_expressions;

#[cfg(feature = "property-assignment-expressions")]
pub use microesnext_objects::assignment_expressions as property_assignment_expressions;

#[cfg(feature = "recursive-functions")]
pub use microesnext_recursive_functions as recursive_functions;

#[cfg(feature = "recursive-async-functions")]
pub use microesnext_recursive_async_functions as recursive_async_functions;

#[cfg(feature = "receivers")]
pub use microesnext_receivers as receivers;

#[cfg(any(
    feature = "objects",
    feature = "iterator-results",
    feature = "iterable-protocol"
))]
pub use microesnext_objects as objects;

#[cfg(feature = "strings")]
pub use microesnext_strings as strings;

#[cfg(feature = "stack-operations")]
pub use microesnext_arena::stack_operations;

#[cfg(feature = "string-operations")]
pub use microesnext_strings::operations as string_operations;

#[cfg(feature = "symbols")]
pub use microesnext_symbols as symbols;

#[cfg(feature = "well-known-symbols")]
pub use microesnext_symbols::well_known as well_known_symbols;

#[cfg(feature = "weak-collections")]
pub use microesnext_collections::weak as weak_collections;

#[cfg(feature = "promises")]
pub use microesnext_promises as promises;

#[cfg(feature = "promise-resolution")]
pub use microesnext_promise_resolution as promise_resolution;

#[cfg(feature = "prototype-chain")]
pub use microesnext_objects::prototype_chain;

#[cfg(feature = "promise-resolvers")]
pub use microesnext_promise_resolvers as promise_resolvers;

#[cfg(feature = "thenables")]
pub use microesnext_thenables as thenables;
