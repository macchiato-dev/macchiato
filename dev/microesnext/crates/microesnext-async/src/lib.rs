#![no_std]

#[cfg(feature = "promises")]
use microesnext_promises::{JobQueue, Settlement, settle};
use microesnext_types::{Error, RootId, Value};
use microesnext_vm::{Machine, Outcome};

/// A scheduler-owned suspension. It contains handles, never Rust references
/// into the compacting guest arena.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Suspended {
    pub awaited: Value,
    pub continuation: RootId,
}

pub enum Progress {
    Complete(Value),
    Rejected(Value),
    Suspended(Suspended),
}

impl From<Outcome> for Progress {
    fn from(outcome: Outcome) -> Self {
        match outcome {
            Outcome::Complete(value) => Self::Complete(value),
            Outcome::Throw(value) => Self::Rejected(value),
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

pub fn reject(
    machine: &mut Machine<'_, '_>,
    suspended: Suspended,
    reason: Value,
) -> Result<Progress, Error> {
    machine
        .resume_rejected(suspended.continuation, reason)
        .map(Into::into)
}

/// Result of running one Promise reaction. A suspended reaction retains both
/// its VM continuation and the destination Promise across host turns.
#[cfg(feature = "promises")]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ReactionProgress {
    Complete,
    Suspended {
        continuation: RootId,
        destination: RootId,
    },
}

#[cfg(feature = "promises")]
pub fn run_one_reaction(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
) -> Result<Option<ReactionProgress>, Error> {
    let Some(job) = queue.pop(machine.arena_mut())? else {
        return Ok(None);
    };

    if job.callback == Value::UNDEFINED {
        settle(
            machine.arena_mut(),
            queue,
            job.destination,
            job.settlement,
            job.argument,
        )?;
        return Ok(Some(ReactionProgress::Complete));
    }

    let destination = machine.retain(job.destination)?;
    let outcome = match machine.call_closure(job.callback, job.argument) {
        Ok(outcome) => outcome,
        Err(error) => {
            machine.release(destination)?;
            return Err(error);
        }
    };
    finish_reaction(machine, queue, destination, outcome).map(Some)
}

#[cfg(feature = "promises")]
pub fn resume_reaction(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    suspended: ReactionProgress,
    settlement: Settlement,
    value: Value,
) -> Result<ReactionProgress, Error> {
    let ReactionProgress::Suspended {
        continuation,
        destination,
    } = suspended
    else {
        return Err(Error::Type);
    };
    let outcome = if settlement == Settlement::Fulfilled {
        machine.resume(continuation, value)?
    } else {
        machine.resume_rejected(continuation, value)?
    };
    finish_reaction(machine, queue, destination, outcome)
}

#[cfg(feature = "promises")]
fn finish_reaction(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    destination: RootId,
    outcome: Outcome,
) -> Result<ReactionProgress, Error> {
    match outcome {
        Outcome::Complete(value) => {
            let destination = machine.release(destination)?;
            settle(
                machine.arena_mut(),
                queue,
                destination,
                Settlement::Fulfilled,
                value,
            )?;
            Ok(ReactionProgress::Complete)
        }
        Outcome::Throw(reason) => {
            let destination = machine.release(destination)?;
            settle(
                machine.arena_mut(),
                queue,
                destination,
                Settlement::Rejected,
                reason,
            )?;
            Ok(ReactionProgress::Complete)
        }
        Outcome::Await { continuation, .. } => Ok(ReactionProgress::Suspended {
            continuation,
            destination,
        }),
    }
}

#[cfg(all(test, feature = "promises"))]
mod tests {
    use microesnext_bytecode::Opcode;
    use microesnext_functions::capture_stack;
    use microesnext_promises::{JobSlot, pending, settled_result, then};

    use super::*;

    #[test]
    fn callback_result_fulfills_its_destination() {
        let code = [Opcode::Return as u8];
        let mut memory = [0; 160];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 16);
        let callback = capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let source = pending(machine.arena_mut()).unwrap();
        let destination = pending(machine.arena_mut()).unwrap();
        let mut slots: [Option<JobSlot>; 4] = [None; 4];
        let mut queue = JobQueue::new(&mut slots);
        then(
            machine.arena_mut(),
            &mut queue,
            source,
            callback,
            Value::UNDEFINED,
            destination,
        )
        .unwrap();
        let answer = Value::from_i30(42).unwrap();
        settle(
            machine.arena_mut(),
            &mut queue,
            source,
            Settlement::Fulfilled,
            answer,
        )
        .unwrap();

        assert_eq!(
            run_one_reaction(&mut machine, &mut queue).unwrap(),
            Some(ReactionProgress::Complete)
        );
        assert_eq!(
            settled_result(machine.arena(), destination).unwrap(),
            Some((Settlement::Fulfilled, answer))
        );
    }

    #[test]
    fn suspended_callback_keeps_destination_until_resume() {
        let code = [Opcode::Await as u8, Opcode::Return as u8];
        let mut memory = [0; 192];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 16);
        let callback = capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let source = pending(machine.arena_mut()).unwrap();
        let destination = pending(machine.arena_mut()).unwrap();
        let mut slots: [Option<JobSlot>; 4] = [None; 4];
        let mut queue = JobQueue::new(&mut slots);
        then(
            machine.arena_mut(),
            &mut queue,
            source,
            callback,
            Value::UNDEFINED,
            destination,
        )
        .unwrap();
        let first = Value::from_i30(1).unwrap();
        settle(
            machine.arena_mut(),
            &mut queue,
            source,
            Settlement::Fulfilled,
            first,
        )
        .unwrap();
        let suspended = run_one_reaction(&mut machine, &mut queue)
            .unwrap()
            .expect("one reaction");
        assert!(matches!(suspended, ReactionProgress::Suspended { .. }));

        let answer = Value::from_i30(42).unwrap();
        assert_eq!(
            resume_reaction(
                &mut machine,
                &mut queue,
                suspended,
                Settlement::Fulfilled,
                answer,
            )
            .unwrap(),
            ReactionProgress::Complete
        );
        assert_eq!(
            settled_result(machine.arena(), destination).unwrap(),
            Some((Settlement::Fulfilled, answer))
        );
    }
}

pub fn resume(
    machine: &mut Machine<'_, '_>,
    suspended: Suspended,
    fulfilled: Value,
) -> Result<Progress, Error> {
    machine
        .resume(suspended.continuation, fulfilled)
        .map(Into::into)
}
