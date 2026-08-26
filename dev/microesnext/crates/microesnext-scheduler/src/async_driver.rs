#[cfg(feature = "promises")]
use microesnext_arena::BlockKind;
#[cfg(feature = "resolution")]
use microesnext_execution::promises::resolution::resolve_native;
#[cfg(feature = "promises")]
use microesnext_execution::promises::{Job, JobQueue, Settlement, is_promise, settle, then};
#[cfg(feature = "functions")]
use microesnext_execution::promises::{pending, settle_unobserved};
#[cfg(feature = "host-bindings")]
use microesnext_types::HostRef;
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
    PromiseResolverCall,
    #[cfg(feature = "host-bindings")]
    HostCall {
        function: HostRef,
        receiver: Option<Value>,
        argument_count: usize,
    },
    #[cfg(feature = "host-bindings")]
    HostConstruct {
        constructor: HostRef,
        argument_count: usize,
    },
    #[cfg(feature = "host-bindings")]
    HostGet {
        object: HostRef,
        key: Value,
        method: bool,
    },
    #[cfg(feature = "host-bindings")]
    HostSet {
        object: HostRef,
        key: Value,
        value: Value,
    },
}

/// Statically selected Promise resolution policy. Drivers are generic over
/// this trait, so a smaller build pays neither a trait object nor a runtime
/// branch for policies it does not include.
#[cfg(feature = "promises")]
pub trait Resolver {
    fn resolve(
        &mut self,
        machine: &mut Machine<'_, '_>,
        queue: &mut JobQueue<'_>,
        promise: Value,
        value: Value,
    ) -> Result<(), Error>;

    fn park(
        &mut self,
        machine: &mut Machine<'_, '_>,
        queue: &mut JobQueue<'_>,
        destination: RootId,
        awaited: Value,
        continuation: RootId,
    ) -> Result<(), Error>;
}

#[cfg(feature = "promises")]
pub struct NativeResolver;

#[cfg(feature = "promises")]
impl Resolver for NativeResolver {
    #[inline]
    fn resolve(
        &mut self,
        machine: &mut Machine<'_, '_>,
        queue: &mut JobQueue<'_>,
        promise: Value,
        value: Value,
    ) -> Result<(), Error> {
        #[cfg(feature = "resolution")]
        resolve_native(machine.arena_mut(), queue, promise, value)?;
        #[cfg(not(feature = "resolution"))]
        settle(
            machine.arena_mut(),
            queue,
            promise,
            Settlement::Fulfilled,
            value,
        )?;
        Ok(())
    }

    #[inline]
    fn park(
        &mut self,
        machine: &mut Machine<'_, '_>,
        queue: &mut JobQueue<'_>,
        destination: RootId,
        awaited: Value,
        continuation: RootId,
    ) -> Result<(), Error> {
        park_continuation(machine, queue, destination, awaited, continuation)
    }
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
            Outcome::PromiseResolverCall => Self::PromiseResolverCall,
            #[cfg(feature = "host-bindings")]
            Outcome::HostCall {
                function,
                receiver,
                argument_count,
            } => Self::HostCall {
                function,
                receiver,
                argument_count,
            },
            #[cfg(feature = "host-bindings")]
            Outcome::HostConstruct { constructor, argument_count } => {
                Self::HostConstruct { constructor, argument_count }
            }
            #[cfg(feature = "host-bindings")]
            Outcome::HostGet {
                object,
                key,
                method,
            } => Self::HostGet {
                object,
                key,
                method,
            },
            #[cfg(feature = "host-bindings")]
            Outcome::HostSet { object, key, value } => Self::HostSet { object, key, value },
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

/// Drive ordinary and async guest calls until the current caller completes or
/// reaches a top-level await. Nested async bodies use caller-supplied frame
/// storage and return their outer promise without suspending the caller.
#[cfg(feature = "functions")]
pub fn run_functions(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    frames: &mut microesnext_execution::async_functions::Frames<'_>,
) -> Result<Progress, Error> {
    run_functions_with(machine, queue, frames, &mut NativeResolver)
}

#[cfg(feature = "functions")]
pub fn run_functions_with<R: Resolver>(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    frames: &mut microesnext_execution::async_functions::Frames<'_>,
    resolver: &mut R,
) -> Result<Progress, Error> {
    let outcome = machine.run()?;
    drive_functions(machine, queue, frames, resolver, outcome)
}

#[cfg(feature = "functions")]
fn drive_functions<R: Resolver>(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    frames: &mut microesnext_execution::async_functions::Frames<'_>,
    resolver: &mut R,
    mut outcome: Outcome,
) -> Result<Progress, Error> {
    loop {
        outcome = match outcome {
            Outcome::AsyncCall {
                function,
                argument_count,
            } => {
                // Creating the outer promise may compact the arena. Keep the
                // callee relocatable until both allocations are complete.
                let function = machine.retain(function)?;
                let promise = match pending(machine.arena_mut()) {
                    Ok(promise) => promise,
                    Err(error) => {
                        machine.release(function)?;
                        return Err(error);
                    }
                };
                let promise = machine.retain(promise)?;
                let function = machine.release(function)?;
                let caller = match machine.switch_to_async_call(function, argument_count, promise) {
                    Ok(caller) => caller,
                    Err(error) => {
                        machine.release(promise)?;
                        return Err(error);
                    }
                };
                if let Err(error) =
                    frames.push(microesnext_execution::async_functions::Frame { caller, promise })
                {
                    machine.restore_caller(caller)?;
                    machine.release(promise)?;
                    return Err(error);
                }
                machine.run()?
            }
            Outcome::Complete(value) => {
                let Some(frame) = frames.pop()? else {
                    return Ok(Progress::Complete(value));
                };
                let promise = machine.root(frame.promise)?;
                resolver.resolve(machine, queue, promise, value)?;
                machine.restore_caller(frame.caller)?;
                machine.release(frame.promise)?;
                machine.run()?
            }
            Outcome::Throw(reason) => {
                let Some(frame) = frames.pop()? else {
                    return Ok(Progress::Rejected(reason));
                };
                let promise = machine.root(frame.promise)?;
                settle_unobserved(machine.arena_mut(), promise, Settlement::Rejected, reason)?;
                machine.restore_caller(frame.caller)?;
                machine.release(frame.promise)?;
                machine.run()?
            }
            Outcome::Await {
                value,
                continuation,
            } => {
                let Some(frame) = frames.pop()? else {
                    return Ok(Progress::Suspended(Suspended {
                        awaited: value,
                        continuation,
                    }));
                };
                resolver.park(machine, queue, frame.promise, value, continuation)?;
                machine.restore_caller(frame.caller)?;
                machine.run()?
            }
            Outcome::PromiseResolverCall => return Ok(Progress::PromiseResolverCall),
            #[cfg(feature = "host-bindings")]
            Outcome::HostCall {
                function,
                receiver,
                argument_count,
            } => {
                return Ok(Progress::HostCall {
                    function,
                    receiver,
                    argument_count,
                });
            }
            #[cfg(feature = "host-bindings")]
            Outcome::HostConstruct { constructor, argument_count } => {
                return Ok(Progress::HostConstruct { constructor, argument_count });
            }
            #[cfg(feature = "host-bindings")]
            Outcome::HostGet {
                object,
                key,
                method,
            } => {
                return Ok(Progress::HostGet {
                    object,
                    key,
                    method,
                });
            }
            #[cfg(feature = "host-bindings")]
            Outcome::HostSet { object, key, value } => {
                return Ok(Progress::HostSet { object, key, value });
            }
        };
    }
}

/// Run one queued reaction while allowing the resumed body or callback to
/// enter nested async functions. Frame storage remains bounded and belongs to
/// the scheduler.
#[cfg(all(feature = "promises", feature = "functions"))]
pub fn run_one_function_reaction(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    frames: &mut microesnext_execution::async_functions::Frames<'_>,
) -> Result<bool, Error> {
    run_one_function_reaction_with(machine, queue, frames, &mut NativeResolver)
}

#[cfg(all(feature = "promises", feature = "functions"))]
pub fn run_one_function_reaction_with<R: Resolver>(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    frames: &mut microesnext_execution::async_functions::Frames<'_>,
    resolver: &mut R,
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
    let outcome = match start_reaction(machine, job) {
        Ok(outcome) => outcome,
        Err(error) => {
            machine.release(destination)?;
            return Err(error);
        }
    };
    let progress = match drive_functions(machine, queue, frames, resolver, outcome) {
        Ok(progress) => progress,
        Err(error) => {
            machine.release(destination)?;
            return Err(error);
        }
    };
    finish_progress(machine, queue, destination, resolver, progress)?;
    Ok(true)
}

#[cfg(feature = "promises")]
pub fn run_one_reaction(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
) -> Result<bool, Error> {
    run_one_reaction_with(machine, queue, &mut NativeResolver)
}

#[cfg(feature = "promises")]
pub fn run_one_reaction_with<R: Resolver>(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    resolver: &mut R,
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
    let outcome = match start_reaction(machine, job) {
        Ok(outcome) => outcome,
        Err(error) => {
            machine.release(destination)?;
            return Err(error);
        }
    };
    finish_reaction(machine, queue, destination, resolver, outcome)?;
    Ok(true)
}

#[cfg(feature = "promises")]
fn start_reaction(machine: &mut Machine<'_, '_>, job: Job) -> Result<Outcome, Error> {
    let continuation = job
        .callback
        .as_ref()
        .and_then(|reference| machine.arena().kind(reference).ok())
        == Some(BlockKind::Continuation);
    if continuation {
        if job.settlement == Settlement::Fulfilled {
            machine.resume_value(job.callback, job.argument)
        } else {
            machine.resume_value_rejected(job.callback, job.argument)
        }
    } else {
        machine.call_closure(job.callback, job.argument)
    }
}

#[cfg(all(feature = "promises", feature = "functions"))]
fn finish_progress<R: Resolver>(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    destination: RootId,
    resolver: &mut R,
    progress: Progress,
) -> Result<(), Error> {
    match progress {
        Progress::Complete(value) => {
            fulfill_destination(machine, queue, destination, resolver, value)?;
            Ok(())
        }
        Progress::Rejected(reason) => {
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
        Progress::Suspended(suspended) => {
            resolver.park(
                machine,
                queue,
                destination,
                suspended.awaited,
                suspended.continuation,
            )?;
            Ok(())
        }
        Progress::AsyncCall { .. } => Err(Error::Type),
        Progress::PromiseResolverCall => Err(Error::Type),
        #[cfg(feature = "host-bindings")]
        Progress::HostCall { .. } | Progress::HostConstruct { .. } => Err(Error::Type),
        #[cfg(feature = "host-bindings")]
        Progress::HostGet { .. } | Progress::HostSet { .. } => Err(Error::Type),
    }
}

#[cfg(feature = "promises")]
fn finish_reaction<R: Resolver>(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    destination: RootId,
    resolver: &mut R,
    outcome: Outcome,
) -> Result<(), Error> {
    match outcome {
        Outcome::Complete(value) => {
            fulfill_destination(machine, queue, destination, resolver, value)?;
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
            resolver.park(machine, queue, destination, value, continuation)?;
            Ok(())
        }
        Outcome::AsyncCall { .. } => Err(Error::Type),
        Outcome::PromiseResolverCall => Err(Error::Type),
        #[cfg(feature = "host-bindings")]
        Outcome::HostCall { .. } | Outcome::HostConstruct { .. } => Err(Error::Type),
        #[cfg(feature = "host-bindings")]
        Outcome::HostGet { .. } | Outcome::HostSet { .. } => Err(Error::Type),
    }
}

#[cfg(feature = "promises")]
fn fulfill_destination(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    destination: RootId,
    resolver: &mut impl Resolver,
    value: Value,
) -> Result<(), Error> {
    let destination = machine.release(destination)?;
    resolver.resolve(machine, queue, destination, value)
}

#[cfg(feature = "promises")]
pub fn park_continuation(
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
    use microesnext_arena::closures::capture_stack;
    use microesnext_bytecode::Opcode;
    use microesnext_execution::promises::{JobSlot, pending, settled_result, then};

    use super::*;

    #[cfg(feature = "functions")]
    #[test]
    fn async_call_returns_a_fulfilled_outer_promise_to_its_caller() {
        const BODY: u32 = 9;
        let code = [
            Opcode::AsyncClosure as u8,
            BODY as u8,
            0,
            0,
            0,
            0,
            0,
            Opcode::CallValue as u8,
            Opcode::Return as u8,
            Opcode::ConstI30 as u8,
            42,
            0,
            0,
            0,
            Opcode::Return as u8,
        ];
        let mut memory = [0; 192];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 16);
        let mut jobs = [None; 2];
        let mut queue = JobQueue::new(&mut jobs);
        let mut frame_slots = [None; 1];
        let mut frames = microesnext_execution::async_functions::Frames::new(&mut frame_slots);
        let Progress::Complete(promise) =
            run_functions(&mut machine, &mut queue, &mut frames).unwrap()
        else {
            panic!("expected the caller to complete")
        };
        assert_eq!(
            settled_result(machine.arena(), promise),
            Ok(Some((Settlement::Fulfilled, Value::from_i30(42).unwrap())))
        );
    }

    #[cfg(feature = "functions")]
    #[test]
    fn first_await_restores_the_caller_and_parks_the_async_body() {
        const BODY: u32 = 9;
        let code = [
            Opcode::AsyncClosure as u8,
            BODY as u8,
            0,
            0,
            0,
            0,
            0,
            Opcode::CallValue as u8,
            Opcode::Return as u8,
            Opcode::ConstI30 as u8,
            42,
            0,
            0,
            0,
            Opcode::Await as u8,
            Opcode::Return as u8,
        ];
        let mut memory = [0; 224];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 16);
        let mut jobs = [None; 2];
        let mut queue = JobQueue::new(&mut jobs);
        let mut frame_slots = [None; 1];
        let mut frames = microesnext_execution::async_functions::Frames::new(&mut frame_slots);
        let Progress::Complete(promise) =
            run_functions(&mut machine, &mut queue, &mut frames).unwrap()
        else {
            panic!("expected the restored caller to complete")
        };
        assert_eq!(settled_result(machine.arena(), promise), Ok(None));
        assert!(run_one_reaction(&mut machine, &mut queue).unwrap());
        assert_eq!(
            settled_result(machine.arena(), promise),
            Ok(Some((Settlement::Fulfilled, Value::from_i30(42).unwrap())))
        );
    }

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

    #[cfg(feature = "resolution")]
    #[test]
    fn callback_promise_result_is_adopted_by_its_destination() {
        let code = [Opcode::Return as u8];
        let mut memory = [0; 256];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 24);
        let returned = pending(machine.arena_mut()).unwrap();
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
        settle(
            machine.arena_mut(),
            &mut queue,
            source,
            Settlement::Fulfilled,
            returned,
        )
        .unwrap();

        assert!(run_one_reaction(&mut machine, &mut queue).unwrap());
        assert_eq!(settled_result(machine.arena(), destination), Ok(None));
        let answer = Value::from_i30(42).unwrap();
        settle(
            machine.arena_mut(),
            &mut queue,
            returned,
            Settlement::Fulfilled,
            answer,
        )
        .unwrap();
        assert!(run_one_reaction(&mut machine, &mut queue).unwrap());
        assert_eq!(
            settled_result(machine.arena(), destination),
            Ok(Some((Settlement::Fulfilled, answer)))
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
