#![no_std]

use microesnext_types::{Error, HeapRef, Value};
use microesnext_vm::{Machine, Outcome};

/// A scheduler-owned suspension. It contains handles, never Rust references
/// into the compacting guest arena.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Suspended {
    pub awaited: Value,
    pub continuation: HeapRef,
}

pub enum Progress {
    Complete(Value),
    Suspended(Suspended),
}

impl From<Outcome> for Progress {
    fn from(outcome: Outcome) -> Self {
        match outcome {
            Outcome::Complete(value) => Self::Complete(value),
            Outcome::Await {
                value,
                continuation,
            } => Self::Suspended(Suspended {
                awaited: value,
                continuation,
            }),
        }
    }
}

pub fn resume(
    machine: &mut Machine<'_>,
    suspended: Suspended,
    fulfilled: Value,
) -> Result<Progress, Error> {
    machine
        .resume(suspended.continuation, fulfilled)
        .map(Into::into)
}
