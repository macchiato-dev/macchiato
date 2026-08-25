#![no_std]

pub use microesnext_bytecode as bytecode;
pub use microesnext_types::{Error, HeapRef, Value};
pub use microesnext_vm::{Machine, Outcome};

#[cfg(feature = "async")]
pub use microesnext_async as r#async;

#[cfg(feature = "collections")]
pub use microesnext_collections as collections;

#[cfg(feature = "weak-collections")]
pub use microesnext_weak_collections as weak_collections;
