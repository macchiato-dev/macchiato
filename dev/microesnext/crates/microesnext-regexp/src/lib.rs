#![no_std]

//! A direct Rust translation of MicroQuickJS's regexp engine.
//!
//! Names and bytecode layout intentionally remain close to the C reference so
//! each translated region can be reviewed and differentially tested.

mod bytecode;
#[cfg(feature = "compile")]
mod compile;
#[cfg(feature = "execute")]
mod execute;

pub use bytecode::{
    Flags, OpCode, HEADER_CAPTURE_COUNT, HEADER_FLAGS, HEADER_LEN,
    HEADER_REGISTER_COUNT,
};
#[cfg(feature = "compile")]
pub use compile::compile;
#[cfg(feature = "execute")]
pub use execute::{execute, Limits};

/// A captured half-open range in the input's UTF-16 code units.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Capture {
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Error {
    InvalidBytecode,
    InvalidPattern,
    OutOfMemory,
    StackOverflow,
    Timeout,
}
