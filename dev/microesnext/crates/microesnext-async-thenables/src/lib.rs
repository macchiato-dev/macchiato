#![no_std]

use microesnext_async::Resolver as AsyncResolver;
use microesnext_promises::JobQueue;
use microesnext_thenables::{Jobs, Prepared};
use microesnext_types::{Error, RootId, Value};
use microesnext_vm::Machine;

/// Statically composes async completion with object thenable assimilation.
/// The ordinary async driver remains monomorphized with its smaller native
/// resolver when this crate is omitted.
pub struct Resolver<'queue, 'slots> {
    then_key: RootId,
    jobs: &'queue mut Jobs<'slots>,
}

impl<'queue, 'slots> Resolver<'queue, 'slots> {
    pub fn new(
        machine: &mut Machine<'_, '_>,
        jobs: &'queue mut Jobs<'slots>,
        then_key: Value,
    ) -> Result<Self, Error> {
        Ok(Self {
            then_key: machine.retain(then_key)?,
            jobs,
        })
    }

    pub fn release(self, machine: &mut Machine<'_, '_>) -> Result<Value, Error> {
        machine.release(self.then_key)
    }
}

impl AsyncResolver for Resolver<'_, '_> {
    fn resolve(
        &mut self,
        machine: &mut Machine<'_, '_>,
        queue: &mut JobQueue<'_>,
        promise: Value,
        value: Value,
    ) -> Result<(), Error> {
        let then_key = machine.root(self.then_key)?;
        if let Prepared::Job(job) =
            microesnext_thenables::prepare(machine, queue, promise, value, then_key)?
        {
            self.jobs.push(machine, job)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use microesnext_async::Progress;
    use microesnext_async_functions::{FrameSlot, Frames};
    use microesnext_bytecode::Opcode;
    use microesnext_promises::{JobSlot, Settlement, settled_result};
    use microesnext_thenables::JobSlot as ThenableJobSlot;

    use super::*;

    #[test]
    fn async_return_defers_and_assimilates_an_object_thenable() {
        const BODY: u32 = 9;
        const THEN: u32 = 13;
        let code = [
            Opcode::AsyncClosure as u8,
            BODY as u8,
            0,
            0,
            0,
            1,
            0,
            Opcode::CallValue as u8,
            Opcode::Return as u8,
            Opcode::LoadCapture as u8,
            0,
            0,
            Opcode::Return as u8,
            Opcode::InitReceiverFrame as u8,
            2,
            0,
            2,
            0,
            Opcode::LoadLocal as u8,
            0,
            0,
            Opcode::ConstI30 as u8,
            42,
            0,
            0,
            0,
            Opcode::CallValueArguments as u8,
            1,
            0,
            Opcode::ReturnReceiverLocals as u8,
        ];
        let mut memory = [0; 320];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 20);
        let then = microesnext_functions::capture_stack(machine.arena_mut(), THEN, 0).unwrap();
        let then_key = Value::TRUE;
        let object = microesnext_objects::new_object(machine.arena_mut(), Value::NULL).unwrap();
        let object = microesnext_objects::set(machine.arena_mut(), object, then_key, then).unwrap();
        machine.arena_mut().push(object).unwrap();
        let mut promise_slots: [Option<JobSlot>; 2] = [None; 2];
        let mut promise_jobs = JobQueue::new(&mut promise_slots);
        let mut frame_slots: [Option<FrameSlot>; 1] = [None; 1];
        let mut frames = Frames::new(&mut frame_slots);
        let mut thenable_slots: [Option<ThenableJobSlot>; 2] = [const { None }; 2];
        let mut thenable_jobs = Jobs::new(&mut thenable_slots);
        let mut resolver = Resolver::new(&mut machine, &mut thenable_jobs, then_key).unwrap();

        let Progress::Complete(promise) = microesnext_async::run_functions_with(
            &mut machine,
            &mut promise_jobs,
            &mut frames,
            &mut resolver,
        )
        .unwrap() else {
            panic!("expected the outer caller to complete")
        };
        let promise = machine.retain(promise).unwrap();
        resolver.release(&mut machine).unwrap();
        assert_eq!(
            settled_result(machine.arena(), machine.root(promise).unwrap()),
            Ok(None)
        );
        assert_eq!(
            thenable_jobs.run_one(&mut machine, &mut promise_jobs),
            Ok(true)
        );
        assert_eq!(
            settled_result(machine.arena(), machine.root(promise).unwrap()),
            Ok(Some((Settlement::Fulfilled, Value::from_i30(42).unwrap())))
        );
        machine.release(promise).unwrap();
    }
}
