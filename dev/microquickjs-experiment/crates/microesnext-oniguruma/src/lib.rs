#![no_std]

//! Optional, libc-free Oniguruma support for MicroESNext.
//!
//! The implementation is introduced from the C boundary upward: first the
//! audited ponyfills, then the UTF-8 Oniguruma build, and finally this narrow
//! Rust interface. Keeping the interface here prevents raw Oniguruma state
//! from spreading into the JavaScript runtime.

/// A byte range captured by a regular-expression match.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Capture {
    pub start: usize,
    pub end: usize,
}

/// Errors deliberately avoid exposing Oniguruma's C structures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Error {
    InvalidPattern,
    OutOfMemory,
    Unsupported,
}

