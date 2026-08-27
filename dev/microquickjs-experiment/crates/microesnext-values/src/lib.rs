#![no_std]

#[cfg(all(feature = "numbers", feature = "strings"))]
extern crate alloc;

#[cfg(feature = "decimal-to-f64")]
pub mod decimal_to_f64;
#[cfg(feature = "errors")]
pub mod errors;
#[cfg(feature = "numbers")]
pub mod numbers;
#[cfg(feature = "strings")]
pub mod strings;
#[cfg(feature = "symbols")]
pub mod symbols;
