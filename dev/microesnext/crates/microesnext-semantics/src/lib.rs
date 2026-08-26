#![no_std]

#[cfg(feature = "integer-operations")]
pub mod integer_operations;

#[cfg(feature = "equality")]
pub mod equality;
#[cfg(feature = "logical-operations")]
pub mod logical_operations;
#[cfg(feature = "truthiness")]
pub mod truthiness;
#[cfg(feature = "typeof")]
pub mod r#typeof;
