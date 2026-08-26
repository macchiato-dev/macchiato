use microesnext_execution::promises::{JobQueue, Settlement, is_promise, settle};
use microesnext_objects::{get, is_object};
use microesnext_types::{Error, RootId, Value};
use microesnext_vm::{Machine, Outcome};

pub enum Prepared {
    Settled,
    Job(Job),
}

pub enum Finished {
    Complete,
    Job(Job),
}

/// A rooted PromiseResolveThenableJob. Keeping it separate lets a controller
/// enqueue the job instead of invoking arbitrary guest `then` code inline.
pub struct Job {
    then: RootId,
    receiver: RootId,
    resolve: RootId,
    reject: RootId,
    then_key: RootId,
}

pub struct JobSlot(Job);

/// Caller-owned FIFO storage for rooted thenable jobs. The queue itself never
/// allocates and moving a slot cannot stale its generation-checked roots.
pub struct Jobs<'slots> {
    slots: &'slots mut [Option<JobSlot>],
    head: usize,
    len: usize,
}

impl<'slots> Jobs<'slots> {
    pub fn new(slots: &'slots mut [Option<JobSlot>]) -> Self {
        for slot in slots.iter_mut() {
            *slot = None;
        }
        Self {
            slots,
            head: 0,
            len: 0,
        }
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub fn push(&mut self, machine: &mut Machine<'_, '_>, job: Job) -> Result<(), Error> {
        if self.len == self.slots.len() {
            release(machine, job)?;
            return Err(Error::OutOfMemory);
        }
        let index = (self.head + self.len) % self.slots.len();
        self.slots[index] = Some(JobSlot(job));
        self.len += 1;
        Ok(())
    }

    pub fn pop(&mut self) -> Result<Option<Job>, Error> {
        if self.len == 0 {
            return Ok(None);
        }
        let job = self.slots[self.head]
            .take()
            .map(|slot| slot.0)
            .ok_or(Error::DanglingReference)?;
        self.head = (self.head + 1) % self.slots.len();
        self.len -= 1;
        Ok(Some(job))
    }

    pub fn run_one(
        &mut self,
        machine: &mut Machine<'_, '_>,
        queue: &mut JobQueue<'_>,
    ) -> Result<bool, Error> {
        let Some(job) = self.pop()? else {
            return Ok(false);
        };
        if let Finished::Job(job) = run(machine, queue, job)? {
            self.push(machine, job)?;
        }
        Ok(true)
    }

    pub fn discard_all(&mut self, machine: &mut Machine<'_, '_>) -> Result<(), Error> {
        while let Some(job) = self.pop()? {
            release(machine, job)?;
        }
        Ok(())
    }
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
        microesnext_execution::promises::resolution::resolve_native(
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
    if !microesnext_arena::closures::is_function(machine.arena(), then) {
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
    let pair =
        match microesnext_execution::promises::resolvers::new(machine.arena_mut(), destination) {
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
    let then_key = match machine.retain(then_key) {
        Ok(root) => root,
        Err(error) => {
            machine.release(reject)?;
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
        then_key,
    }))
}

/// Executes one previously prepared thenable job without native recursion.
pub fn run(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    job: Job,
) -> Result<Finished, Error> {
    let result = run_inner(machine, queue, &job);
    let cleanup = release(machine, job);
    match (result, cleanup) {
        (Err(error), _) | (Ok(_), Err(error)) => Err(error),
        (Ok(finished), Ok(())) => Ok(finished),
    }
}

fn run_inner(
    machine: &mut Machine<'_, '_>,
    queue: &mut JobQueue<'_>,
    job: &Job,
) -> Result<Finished, Error> {
    let then = machine.root(job.then)?;
    let receiver = machine.root(job.receiver)?;
    let resolve = machine.root(job.resolve)?;
    let reject = machine.root(job.reject)?;
    let mut chained = None;
    let mut outcome = machine.call_closure_with_receiver(then, receiver, &[resolve, reject])?;
    loop {
        outcome = match outcome {
            Outcome::PromiseResolverCall => {
                let call = machine.take_resolver_call()?;
                match call.settlement {
                    Settlement::Fulfilled => {
                        let then_key = machine.root(job.then_key)?;
                        if let Prepared::Job(job) =
                            prepare(machine, queue, call.destination, call.argument, then_key)?
                        {
                            chained = Some(job);
                        }
                    }
                    Settlement::Rejected => {
                        microesnext_execution::promises::resolvers::settle_call(
                            machine.arena_mut(),
                            queue,
                            call,
                        )?;
                    }
                }
                machine.resume_resolver_call()?
            }
            Outcome::Complete(_) => return Ok(finished(chained)),
            Outcome::Throw(reason) => {
                let reject = machine.root(job.reject)?;
                if let Some(call) = microesnext_execution::promises::resolvers::reject_if_open(
                    machine.arena_mut(),
                    reject,
                    reason,
                )? {
                    microesnext_execution::promises::resolvers::settle_call(
                        machine.arena_mut(),
                        queue,
                        call,
                    )?;
                }
                return Ok(finished(chained));
            }
            Outcome::Await { .. } | Outcome::AsyncCall { .. } => return Err(Error::Type),
            #[cfg(feature = "host-bindings")]
            Outcome::HostCall { .. } | Outcome::HostConstruct { .. } => return Err(Error::Type),
            #[cfg(feature = "host-bindings")]
            Outcome::HostGet { .. } | Outcome::HostSet { .. } => return Err(Error::Type),
        };
    }
}

fn release(machine: &mut Machine<'_, '_>, job: Job) -> Result<(), Error> {
    machine.release(job.then_key)?;
    machine.release(job.reject)?;
    machine.release(job.resolve)?;
    machine.release(job.receiver)?;
    machine.release(job.then)?;
    Ok(())
}

fn finished(job: Option<Job>) -> Finished {
    match job {
        Some(job) => Finished::Job(job),
        None => Finished::Complete,
    }
}

#[cfg(test)]
mod tests {
    use microesnext_bytecode::{Immediate, Opcode};
    use microesnext_compiler::Builder;
    use microesnext_execution::promises::{JobSlot, pending, settled_result};

    use super::*;

    #[test]
    fn callable_then_is_deferred_and_resolves_with_its_receiver() {
        let code = Builder::new()
            .init_receiver_frame(2, 2)
            .load_local(0)
            .op(Opcode::LoadThis)
            .immediate(Immediate::False)
            .op(Opcode::GetProperty)
            .call_value_arguments(1)
            .op(Opcode::ReturnReceiverLocals)
            .finish();
        let mut memory = [0; 192];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 10);
        let then = microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let key = Value::TRUE;
        let object = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let object = microesnext_objects::set(
            machine.arena_mut(),
            object,
            Value::FALSE,
            Value::from_i30(42).unwrap(),
        )
        .unwrap();
        let object = microesnext_objects::set(machine.arena_mut(), object, key, then).unwrap();
        let destination = pending(machine.arena_mut()).unwrap();
        let destination_root = machine.retain(destination).unwrap();
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);

        let destination = machine.root(destination_root).unwrap();
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
            Ok(Some((Settlement::Fulfilled, Value::from_i30(42).unwrap())))
        );
        machine.release(destination_root).unwrap();
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
        let then = microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 0).unwrap();
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
    fn a_resolved_thenable_becomes_a_separate_followup_job() {
        let code = Builder::new()
            .init_receiver_frame(2, 2)
            .load_local(0)
            .load_capture(0)
            .call_value_arguments(1)
            .op(Opcode::ReturnReceiverLocals)
            .finish();
        let mut memory = [0; 256];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 12);
        machine
            .arena_mut()
            .push(Value::from_i30(42).unwrap())
            .unwrap();
        let inner_then =
            microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 1).unwrap();
        let key = Value::TRUE;
        let inner = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let inner = microesnext_objects::set(machine.arena_mut(), inner, key, inner_then).unwrap();
        machine.arena_mut().push(inner).unwrap();
        let outer_then =
            microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 1).unwrap();
        let outer = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let outer = microesnext_objects::set(machine.arena_mut(), outer, key, outer_then).unwrap();
        let destination = pending(machine.arena_mut()).unwrap();
        let destination_root = machine.retain(destination).unwrap();
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);
        let Prepared::Job(outer_job) =
            prepare(&mut machine, &mut queue, destination, outer, key).unwrap()
        else {
            panic!("expected the outer job")
        };

        let mut thenable_slots = [const { None }; 2];
        let mut jobs = Jobs::new(&mut thenable_slots);
        jobs.push(&mut machine, outer_job).unwrap();
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs.run_one(&mut machine, &mut queue), Ok(true));
        assert_eq!(jobs.len(), 1);
        assert_eq!(
            settled_result(machine.arena(), machine.root(destination_root).unwrap()),
            Ok(None)
        );
        assert_eq!(jobs.run_one(&mut machine, &mut queue), Ok(true));
        assert!(jobs.is_empty());
        assert_eq!(
            settled_result(machine.arena(), machine.root(destination_root).unwrap()),
            Ok(Some((Settlement::Fulfilled, Value::from_i30(42).unwrap())))
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
        let then = microesnext_arena::closures::capture_stack(machine.arena_mut(), 0, 0).unwrap();
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
