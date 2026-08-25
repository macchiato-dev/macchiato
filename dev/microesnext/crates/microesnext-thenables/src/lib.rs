#![no_std]

use microesnext_objects::{get, is_object};
use microesnext_promises::{JobQueue, Settlement, is_promise, settle};
use microesnext_types::{Error, RootId, Value};
use microesnext_vm::{Machine, Outcome};

pub enum Prepared {
    Settled,
    Job(Job),
}

/// A rooted PromiseResolveThenableJob. Keeping it separate lets a controller
/// enqueue the job instead of invoking arbitrary guest `then` code inline.
pub struct Job {
    then: RootId,
    receiver: RootId,
    resolve: RootId,
    reject: RootId,
}

/// Applies the synchronous part of Promise resolution and returns a rooted job
/// when an ordinary object has a callable `then` property.
pub fn prepare(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    destination: Value,
    resolution: Value,
    then_key: Value,
) -> Result<Prepared, Error> {
    if destination == resolution || is_promise(machine.arena(), resolution) {
        microesnext_promise_resolution::resolve_native(
            machine.arena_mut(),
            queue,
            destination,
            resolution,
        )?;
        return Ok(Prepared::Settled);
    }
    if !is_object(machine.arena(), resolution) {
        settle(
            machine.arena_mut(),
            queue,
            destination,
            Settlement::Fulfilled,
            resolution,
        )?;
        return Ok(Prepared::Settled);
    }

    let then = get(machine.arena(), resolution, then_key)?;
    if !microesnext_functions::is_function(machine.arena(), then) {
        settle(
            machine.arena_mut(),
            queue,
            destination,
            Settlement::Fulfilled,
            resolution,
        )?;
        return Ok(Prepared::Settled);
    }

    let then = machine.retain(then)?;
    let receiver = match machine.retain(resolution) {
        Ok(root) => root,
        Err(error) => {
            machine.release(then)?;
            return Err(error);
        }
    };
    let pair = match microesnext_promise_resolvers::new(machine.arena_mut(), destination) {
        Ok(pair) => pair,
        Err(error) => {
            machine.release(receiver)?;
            machine.release(then)?;
            return Err(error);
        }
    };
    let resolve = match machine.retain(pair.resolve) {
        Ok(root) => root,
        Err(error) => {
            machine.release(receiver)?;
            machine.release(then)?;
            return Err(error);
        }
    };
    let reject = match machine.retain(pair.reject) {
        Ok(root) => root,
        Err(error) => {
            machine.release(resolve)?;
            machine.release(receiver)?;
            machine.release(then)?;
            return Err(error);
        }
    };
    Ok(Prepared::Job(Job {
        then,
        receiver,
        resolve,
        reject,
    }))
}

/// Executes one previously prepared thenable job without native recursion.
pub fn run(machine: &mut Machine<'_, '_>, queue: &mut JobQueue<'_>, job: Job) -> Result<(), Error> {
    let result = run_inner(machine, queue, &job);
    let cleanup = release(machine, job);
    match (result, cleanup) {
        (Err(error), _) | (Ok(()), Err(error)) => Err(error),
        (Ok(()), Ok(())) => Ok(()),
    }
}

fn run_inner(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    job: &Job,
) -> Result<(), Error> {
    let then = machine.root(job.then)?;
    let receiver = machine.root(job.receiver)?;
    let resolve = machine.root(job.resolve)?;
    let reject = machine.root(job.reject)?;
    let mut outcome = machine.call_closure_with_receiver(then, receiver, &[resolve, reject])?;
    loop {
        outcome = match outcome {
            Outcome::PromiseResolverCall => {
                let call = machine.take_resolver_call()?;
                microesnext_promise_resolvers::settle_call(machine.arena_mut(), queue, call)?;
                machine.resume_resolver_call()?
            }
            Outcome::Complete(_) => return Ok(()),
            Outcome::Throw(reason) => {
                let reject = machine.root(job.reject)?;
                if let Some(call) = microesnext_promise_resolvers::reject_if_open(
                    machine.arena_mut(),
                    reject,
                    reason,
                )? {
                    microesnext_promise_resolvers::settle_call(machine.arena_mut(), queue, call)?;
                }
                return Ok(());
            }
            Outcome::Await { .. } | Outcome::AsyncCall { .. } => return Err(Error::Type),
        };
    }
}

fn release(machine: &mut Machine<'_, '_>, job: Job) -> Result<(), Error> {
    machine.release(job.reject)?;
    machine.release(job.resolve)?;
    machine.release(job.receiver)?;
    machine.release(job.then)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use microesnext_bytecode::Opcode;
    use microesnext_compiler::Builder;
    use microesnext_promises::{JobSlot, pending, settled_result};

    use super::*;

    #[test]
    fn callable_then_is_deferred_and_resolves_with_its_receiver() {
        let code = Builder::new()
            .init_receiver_frame(2, 2)
            .load_local(0)
            .op(Opcode::LoadThis)
            .call_value_arguments(1)
            .op(Opcode::ReturnReceiverLocals)
            .finish();
        let mut memory = [0; 192];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 10);
        let then = microesnext_functions::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let key = Value::TRUE;
        let object = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let object = microesnext_objects::set(machine.arena_mut(), object, key, then).unwrap();
        let destination = pending(machine.arena_mut()).unwrap();
        let object_root = machine.retain(object).unwrap();
        let destination_root = machine.retain(destination).unwrap();
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);

        let destination = machine.root(destination_root).unwrap();
        let object = machine.root(object_root).unwrap();
        let Prepared::Job(job) =
            prepare(&mut machine, &mut queue, destination, object, key).unwrap()
        else {
            panic!("expected a deferred thenable job")
        };
        assert_eq!(
            settled_result(machine.arena(), machine.root(destination_root).unwrap()),
            Ok(None)
        );
        run(&mut machine, &mut queue, job).unwrap();
        assert_eq!(
            settled_result(machine.arena(), machine.root(destination_root).unwrap()),
            Ok(Some((
                Settlement::Fulfilled,
                machine.root(object_root).unwrap()
            )))
        );
        machine.release(destination_root).unwrap();
        machine.release(object_root).unwrap();
    }

    #[test]
    fn non_callable_then_fulfills_with_the_object_immediately() {
        let mut memory = [0; 96];
        let mut machine = Machine::with_root_capacity(&[], &mut memory, 4);
        let key = Value::TRUE;
        let object = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let object = microesnext_objects::set(
            machine.arena_mut(),
            object,
            key,
            Value::from_i30(7).unwrap(),
        )
        .unwrap();
        let destination = pending(machine.arena_mut()).unwrap();
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);

        assert!(matches!(
            prepare(&mut machine, &mut queue, destination, object, key),
            Ok(Prepared::Settled)
        ));
        assert_eq!(
            settled_result(machine.arena(), destination),
            Ok(Some((Settlement::Fulfilled, object)))
        );
    }

    #[test]
    fn throw_before_resolution_rejects_the_destination() {
        let code = Builder::new().const_i30(7).op(Opcode::Throw).finish();
        let mut memory = [0; 160];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 8);
        let then = microesnext_functions::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let key = Value::TRUE;
        let object = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let object = microesnext_objects::set(machine.arena_mut(), object, key, then).unwrap();
        let destination = pending(machine.arena_mut()).unwrap();
        let destination_root = machine.retain(destination).unwrap();
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);
        let Prepared::Job(job) =
            prepare(&mut machine, &mut queue, destination, object, key).unwrap()
        else {
            panic!("expected a deferred thenable job")
        };

        run(&mut machine, &mut queue, job).unwrap();
        assert_eq!(
            settled_result(machine.arena(), machine.root(destination_root).unwrap()),
            Ok(Some((Settlement::Rejected, Value::from_i30(7).unwrap())))
        );
        machine.release(destination_root).unwrap();
    }

    #[test]
    fn throw_after_resolution_does_not_replace_the_first_result() {
        let code = Builder::new()
            .init_receiver_frame(2, 2)
            .load_local(0)
            .const_i30(42)
            .call_value_arguments(1)
            .const_i30(7)
            .op(Opcode::Throw)
            .finish();
        let mut memory = [0; 192];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 8);
        let then = microesnext_functions::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let key = Value::TRUE;
        let object = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let object = microesnext_objects::set(machine.arena_mut(), object, key, then).unwrap();
        let destination = pending(machine.arena_mut()).unwrap();
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);
        let Prepared::Job(job) =
            prepare(&mut machine, &mut queue, destination, object, key).unwrap()
        else {
            panic!("expected a deferred thenable job")
        };

        run(&mut machine, &mut queue, job).unwrap();
        assert_eq!(
            settled_result(machine.arena(), destination),
            Ok(Some((Settlement::Fulfilled, Value::from_i30(42).unwrap())))
        );
    }
}
