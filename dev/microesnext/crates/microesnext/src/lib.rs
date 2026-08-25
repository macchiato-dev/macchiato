#![no_std]

pub use microesnext_bytecode as bytecode;
pub use microesnext_types::{Error, HeapRef, Value};
pub use microesnext_vm::{Machine, Outcome};
pub use microesnext_vm_core::{Core, CoreOutcome};

#[cfg(feature = "arrays")]
pub use microesnext_arrays as arrays;

#[cfg(feature = "async")]
pub use microesnext_async as r#async;

#[cfg(feature = "collections")]
pub use microesnext_collections as collections;

#[cfg(feature = "functions")]
pub use microesnext_functions as functions;

#[cfg(feature = "exceptions")]
pub use microesnext_exceptions as exceptions;

#[cfg(feature = "objects")]
pub use microesnext_objects as objects;

#[cfg(feature = "strings")]
pub use microesnext_strings as strings;

#[cfg(feature = "weak-collections")]
pub use microesnext_weak_collections as weak_collections;

#[cfg(feature = "promises")]
pub use microesnext_promises as promises;
