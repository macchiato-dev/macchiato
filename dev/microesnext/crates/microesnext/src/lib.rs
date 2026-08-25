#![no_std]

pub use microesnext_bytecode as bytecode;
pub use microesnext_types::{Error, HeapRef, Value};
pub use microesnext_vm::{Machine, Outcome};
pub use microesnext_vm_core::{Core, CoreOutcome};

#[cfg(feature = "locals")]
pub use microesnext_locals as locals;

#[cfg(feature = "integer-operations")]
pub use microesnext_integer_operations as integer_operations;

#[cfg(feature = "logical-operations")]
pub use microesnext_logical_operations as logical_operations;

#[cfg(feature = "arrays")]
pub use microesnext_arrays as arrays;

#[cfg(feature = "array-iterators")]
pub use microesnext_array_iterators as array_iterators;

#[cfg(any(feature = "atoms", feature = "iterator-results"))]
pub use microesnext_atoms as atoms;

#[cfg(feature = "async")]
pub use microesnext_async as r#async;

#[cfg(feature = "async-functions")]
pub use microesnext_async_functions as async_functions;

#[cfg(feature = "async-thenables")]
pub use microesnext_async_thenables as async_thenables;

#[cfg(feature = "collections")]
pub use microesnext_collections as collections;

#[cfg(feature = "collection-iterators")]
pub use microesnext_collection_iterators as collection_iterators;

#[cfg(feature = "collection-entry-iterators")]
pub use microesnext_collection_entry_iterators as collection_entry_iterators;

#[cfg(feature = "iterators")]
pub use microesnext_iterators as iterators;

#[cfg(feature = "iterator-results")]
pub use microesnext_iterator_results as iterator_results;

#[cfg(feature = "iterable-protocol")]
pub use microesnext_iterable_protocol as iterable_protocol;

#[cfg(feature = "functions")]
pub use microesnext_functions as functions;
#[cfg(feature = "number-operations")]
pub use microesnext_number_operations as number_operations;
#[cfg(feature = "numbers")]
pub use microesnext_numbers as numbers;
#[cfg(feature = "function-arguments")]
pub use microesnext_parameters as parameters;

#[cfg(feature = "exceptions")]
pub use microesnext_exceptions as exceptions;

#[cfg(feature = "errors")]
pub use microesnext_errors as errors;

#[cfg(feature = "equality")]
pub use microesnext_equality as equality;

#[cfg(feature = "environments")]
pub use microesnext_environments as environments;

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

#[cfg(feature = "string-operations")]
pub use microesnext_string_operations as string_operations;

#[cfg(feature = "symbols")]
pub use microesnext_symbols as symbols;

#[cfg(feature = "well-known-symbols")]
pub use microesnext_well_known_symbols as well_known_symbols;

#[cfg(feature = "weak-collections")]
pub use microesnext_weak_collections as weak_collections;

#[cfg(feature = "promises")]
pub use microesnext_promises as promises;

#[cfg(feature = "promise-resolution")]
pub use microesnext_promise_resolution as promise_resolution;

#[cfg(feature = "promise-resolvers")]
pub use microesnext_promise_resolvers as promise_resolvers;

#[cfg(feature = "thenables")]
pub use microesnext_thenables as thenables;
