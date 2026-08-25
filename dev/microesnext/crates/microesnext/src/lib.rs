#![no_std]

pub use microesnext_bytecode as bytecode;
pub use microesnext_types::{Error, HeapRef, Value};
pub use microesnext_vm::{Machine, Outcome};
pub use microesnext_vm_core::{Core, CoreOutcome};

#[cfg(feature = "locals")]
pub use microesnext_locals as locals;

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
#[cfg(feature = "numbers")]
pub use microesnext_numbers as numbers;
#[cfg(feature = "function-arguments")]
pub use microesnext_parameters as parameters;

#[cfg(feature = "exceptions")]
pub use microesnext_exceptions as exceptions;

#[cfg(feature = "environments")]
pub use microesnext_environments as environments;

#[cfg(feature = "recursive-functions")]
pub use microesnext_recursive_functions as recursive_functions;

#[cfg(feature = "recursive-async-functions")]
pub use microesnext_recursive_async_functions as recursive_async_functions;

#[cfg(any(
    feature = "objects",
    feature = "iterator-results",
    feature = "iterable-protocol"
))]
pub use microesnext_objects as objects;

#[cfg(feature = "strings")]
pub use microesnext_strings as strings;

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
