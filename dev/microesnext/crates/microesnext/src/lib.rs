#![no_std]

pub use microesnext_bytecode as bytecode;
pub use microesnext_types::{Error, HeapRef, Value};
pub use microesnext_vm::{Machine, Outcome};
pub use microesnext_vm_core::{Core, CoreOutcome};

#[cfg(feature = "arrays")]
pub use microesnext_arrays as arrays;

#[cfg(feature = "array-iterators")]
pub use microesnext_array_iterators as array_iterators;

#[cfg(any(feature = "atoms", feature = "iterator-results"))]
pub use microesnext_atoms as atoms;

#[cfg(feature = "async")]
pub use microesnext_async as r#async;

#[cfg(feature = "collections")]
pub use microesnext_collections as collections;

#[cfg(feature = "collection-iterators")]
pub use microesnext_collection_iterators as collection_iterators;

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

#[cfg(feature = "exceptions")]
pub use microesnext_exceptions as exceptions;

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
