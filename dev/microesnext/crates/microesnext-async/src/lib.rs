#![no_std]

#[cfg(feature = "promises")]
use microesnext_arena::BlockKind;
#[cfg(feature = "promises")]
use microesnext_promises::{Job, JobQueue, Settlement, is_promise, settle, then};
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
    AsyncCall {
        function: Value,
        argument_count: usize,
    },
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
            Outcome::AsyncCall {
                function,
                argument_count,
            } => Self::AsyncCall {
                function,
                argument_count,
            },
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

#[cfg(feature = "promises")]
pub fn run_one_reaction(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
) -> Result<bool, Error> {
    let Some(job) = queue.pop(machine.arena_mut())? else {
        return Ok(false);
    };

    if job.callback == Value::UNDEFINED {
        settle(
            machine.arena_mut(),
            queue,
            job.destination,
            job.settlement,
            job.argument,
        )?;
        return Ok(true);
    }

    let destination = machine.retain(job.destination)?;
    let continuation = job
        .callback
        .as_ref()
        .and_then(|reference| machine.arena().kind(reference).ok())
        == Some(BlockKind::Continuation);
    let outcome = match if continuation {
        if job.settlement == Settlement::Fulfilled {
            machine.resume_value(job.callback, job.argument)
        } else {
            machine.resume_value_rejected(job.callback, job.argument)
        }
    } else {
        machine.call_closure(job.callback, job.argument)
    } {
        Ok(outcome) => outcome,
        Err(error) => {
            machine.release(destination)?;
            return Err(error);
        }
    };
    finish_reaction(machine, queue, destination, outcome)?;
    Ok(true)
}

#[cfg(feature = "promises")]
fn finish_reaction(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    destination: RootId,
    outcome: Outcome,
) -> Result<(), Error> {
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
            Ok(())
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
            Ok(())
        }
        Outcome::Await {
            value,
            continuation,
        } => {
            park_reaction(machine, queue, destination, value, continuation)?;
            Ok(())
        }
        Outcome::AsyncCall { .. } => Err(Error::Type),
    }
}

#[cfg(feature = "promises")]
fn park_reaction(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    destination: RootId,
    awaited: Value,
    continuation: RootId,
) -> Result<(), Error> {
    let continuation = machine.release(continuation)?;
    let destination = machine.release(destination)?;
    if is_promise(machine.arena(), awaited) {
        then(
            machine.arena_mut(),
            queue,
            awaited,
            continuation,
            continuation,
            destination,
        )?;
    } else {
        queue.push(
            machine.arena_mut(),
            Job {
                callback: continuation,
                argument: awaited,
                destination,
                settlement: Settlement::Fulfilled,
            },
        )?;
    }
    Ok(())
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

        assert!(run_one_reaction(&mut machine, &mut queue).unwrap());
        assert_eq!(
            settled_result(machine.arena(), destination).unwrap(),
            Some((Settlement::Fulfilled, answer))
        );
    }

    #[test]
    fn suspended_callback_resumes_through_the_same_job_queue() {
        let code = [Opcode::Await as u8, Opcode::Return as u8];
        let mut memory = [0; 192];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 16);
        let callback = capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let source = pending(machine.arena_mut()).unwrap();
        let awaited = pending(machine.arena_mut()).unwrap();
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
        settle(
            machine.arena_mut(),
            &mut queue,
            source,
            Settlement::Fulfilled,
            awaited,
        )
        .unwrap();
        assert!(run_one_reaction(&mut machine, &mut queue).unwrap());
        assert_eq!(settled_result(machine.arena(), destination).unwrap(), None);

        let answer = Value::from_i30(42).unwrap();
        settle(
            machine.arena_mut(),
            &mut queue,
            awaited,
            Settlement::Fulfilled,
            answer,
        )
        .unwrap();
        assert!(run_one_reaction(&mut machine, &mut queue).unwrap());
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
