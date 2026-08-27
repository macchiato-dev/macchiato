#![no_std]

//! A single-crate, incremental reimplementation of MicroQuickJS.
//!
//! The crate is intentionally empty at its first checkpoint. The exact C
//! baseline lives in `c/`; subsequent changes will establish its build before
//! replacing bounded parts with Rust that shares the same live machine.

