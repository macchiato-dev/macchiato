#![no_std]

use microesnext_arena::Arena;
#[cfg(feature = "arrays")]
use microesnext_arrays::{get as array_get, new as new_array, set as array_set};
#[cfg(feature = "atoms")]
use microesnext_atoms::Atoms;
use microesnext_bytecode::Opcode;
#[cfg(feature = "exceptions")]
use microesnext_exceptions::Handlers;
#[cfg(feature = "functions")]
use microesnext_functions::{capture, capture_stack, entry};
#[cfg(feature = "objects")]
use microesnext_objects::{get, new_object, set};
#[cfg(feature = "async")]
use microesnext_suspension::{restore, restore_value, resume, resume_value, suspend};
use microesnext_types::{Error, RootId, Value};
use microesnext_vm_core::{Core, CoreOutcome};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Outcome {
    Complete(Value),
    Throw(Value),
    Await { value: Value, continuation: RootId },
}

pub struct Machine<'code, 'memory> {
    core: Core<'code, 'memory>,
    #[cfg(feature = "exceptions")]
    handlers: Handlers,
    #[cfg(feature = "atoms")]
    atoms: Option<Atoms>,
}

impl<'code, 'memory> Machine<'code, 'memory> {
    pub fn new(code: &'code [u8], memory: &'memory mut [u32]) -> Self {
        Self::with_root_capacity(code, memory, 0)
    }

    pub fn with_root_capacity(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Self {
        Self {
            core: Core::new(code, memory, root_capacity),
            #[cfg(feature = "exceptions")]
            handlers: Handlers::new(),
            #[cfg(feature = "atoms")]
            atoms: None,
        }
    }

    #[cfg(feature = "strings")]
    pub fn with_strings(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Result<Self, Error> {
        Ok(Self::with_root_capacity(code, memory, root_capacity))
    }

    #[cfg(feature = "atoms")]
    pub fn with_atoms(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Result<Self, Error> {
        let mut arena = Arena::with_root_capacity(memory, root_capacity);
        let atoms = Atoms::new(&mut arena)?;
        Ok(Self {
            core: Core::from_parts(arena, code, 0, None),
            #[cfg(feature = "exceptions")]
            handlers: Handlers::new(),
            atoms: Some(atoms),
        })
    }

    #[cfg(feature = "objects")]
    pub fn with_objects(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Result<Self, Error> {
        Self::with_atoms(code, memory, root_capacity)
    }

    #[inline(always)]
    pub fn arena(&self) -> &Arena<'_> {
        self.core.arena()
    }

    #[inline(always)]
    pub fn arena_mut(&mut self) -> &mut Arena<'memory> {
        self.core.arena_mut()
    }

    pub fn retain(&mut self, value: Value) -> Result<RootId, Error> {
        self.core.arena_mut().retain(value)
    }

    pub fn root(&self, root: RootId) -> Result<Value, Error> {
        self.core.arena().root(root)
    }

    pub fn release(&mut self, root: RootId) -> Result<Value, Error> {
        self.core.arena_mut().release(root)
    }

    pub fn grow_into<'next>(
        self,
        memory: &'next mut [u32],
    ) -> Result<Machine<'code, 'next>, Error> {
        Ok(Machine {
            core: self.core.grow_into(memory)?,
            #[cfg(feature = "exceptions")]
            handlers: self.handlers,
            #[cfg(feature = "atoms")]
            atoms: self.atoms,
        })
    }

    pub fn run(&mut self) -> Result<Outcome, Error> {
        loop {
            match self.core.run()? {
                CoreOutcome::Complete(value) => return Ok(Outcome::Complete(value)),
                CoreOutcome::Throw(value) => {
                    if let Some(outcome) = self.handle_throw(value)? {
                        return Ok(outcome);
                    }
                }
                CoreOutcome::Extension(opcode) => {
                    let opcode = Opcode::try_from(opcode)?;
                    if let Some(outcome) = self.run_extension(opcode)? {
                        return Ok(outcome);
                    }
                }
            }
        }
    }

    #[cold]
    #[inline(never)]
    #[cfg(any(
        feature = "async",
        feature = "arrays",
        feature = "atoms",
        feature = "control-flow",
        feature = "strings",
        feature = "objects",
        feature = "functions",
        feature = "locals",
        feature = "numbers",
        feature = "exceptions"
    ))]
    fn run_extension(&mut self, opcode: Opcode) -> Result<Option<Outcome>, Error> {
        match opcode {
            #[cfg(feature = "async")]
            Opcode::Await => {
                let handler_depth = self.current_handler_depth();
                let (value, continuation) = suspend(&mut self.core, handler_depth)?;
                Ok(Some(Outcome::Await {
                    value,
                    continuation,
                }))
            }
            #[cfg(feature = "strings")]
            Opcode::ConstString => {
                let bytes = self.core.next_bytes()?;
                let value = microesnext_strings::new(self.core.arena_mut(), bytes)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "atoms")]
            Opcode::ConstAtom => {
                let bytes = self.core.next_bytes()?;
                let atoms = self.atoms.as_mut().ok_or(Error::Type)?;
                let value = atoms.intern(self.core.arena_mut(), bytes)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "objects")]
            Opcode::NewObject => {
                let object = new_object(self.core.arena_mut(), Value::NULL)?;
                self.core.arena_mut().push(object)?;
                Ok(None)
            }
            #[cfg(feature = "objects")]
            Opcode::GetProperty => {
                let key = self.core.arena_mut().pop()?;
                let object = self.core.arena_mut().pop()?;
                let value = get(self.core.arena(), object, key)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "objects")]
            Opcode::SetProperty => {
                let value = self.core.arena_mut().pop()?;
                let key = self.core.arena_mut().pop()?;
                let object = self.core.arena_mut().pop()?;
                let object = set(self.core.arena_mut(), object, key, value)?;
                self.core.arena_mut().push(object)?;
                Ok(None)
            }
            #[cfg(feature = "functions")]
            Opcode::Closure => {
                let target = self.core.next_u32()?;
                let capture_count = self.core.next_u16()? as usize;
                if target as usize >= self.core.code().len() {
                    return Err(Error::BadBytecode);
                }
                let closure = capture_stack(self.core.arena_mut(), target, capture_count)?;
                self.core.arena_mut().push(closure)?;
                Ok(None)
            }
            #[cfg(feature = "functions")]
            Opcode::CallValue => {
                let function = self.core.arena_mut().pop()?;
                let target = entry(self.core.arena(), function)?;
                self.core.enter_call(function, target)?;
                Ok(None)
            }
            #[cfg(feature = "functions")]
            Opcode::LoadCapture => {
                let index = self.core.next_u16()? as usize;
                let frame_depth = self.core.frame_depth().ok_or(Error::BadBytecode)?;
                let function_index = self.core.arena().stack_len() - frame_depth;
                let function = self.core.arena().stack_value(function_index)?;
                let value = capture(self.core.arena(), function, index)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "numbers")]
            Opcode::ConstF64 => {
                let low = self.core.next_u32()? as u64;
                let high = self.core.next_u32()? as u64;
                let value = microesnext_numbers::new(
                    self.core.arena_mut(),
                    f64::from_bits(low | high << 32),
                )?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "numbers")]
            Opcode::AddNumber => {
                let right = self.core.arena_mut().pop()?;
                let left = self.core.arena_mut().pop()?;
                let value = microesnext_numbers::add(self.core.arena_mut(), left, right)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "locals")]
            Opcode::InitLocals => {
                let count = self.core.next_u16()? as usize;
                let base = self.core.frame_base();
                microesnext_locals::init(self.core.arena_mut(), base, count)?;
                Ok(None)
            }
            #[cfg(feature = "locals")]
            Opcode::LoadLocal => {
                let slot = self.core.next_u16()? as usize;
                let value =
                    microesnext_locals::load(self.core.arena(), self.core.frame_base(), slot)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "locals")]
            Opcode::StoreLocal => {
                let slot = self.core.next_u16()? as usize;
                let base = self.core.frame_base();
                microesnext_locals::store(self.core.arena_mut(), base, slot)?;
                Ok(None)
            }
            #[cfg(feature = "locals")]
            Opcode::ReturnLocals => {
                let result = self.core.arena_mut().pop()?;
                let base = self.core.frame_base();
                microesnext_locals::leave(self.core.arena_mut(), base)?;
                match self.core.return_value(result)? {
                    Some(CoreOutcome::Complete(value)) => Ok(Some(Outcome::Complete(value))),
                    Some(_) => Err(Error::BadBytecode),
                    None => Ok(None),
                }
            }
            #[cfg(feature = "control-flow")]
            Opcode::Jump => {
                let target = self.core.next_u32()? as usize;
                self.core.jump(target)?;
                Ok(None)
            }
            #[cfg(feature = "control-flow")]
            Opcode::JumpIfFalseBoolean => {
                let target = self.core.next_u32()? as usize;
                let condition = self.core.arena_mut().pop()?;
                if condition == Value::FALSE {
                    self.core.jump(target)?;
                } else if condition != Value::TRUE {
                    return Err(Error::Type);
                }
                Ok(None)
            }
            #[cfg(feature = "control-flow")]
            Opcode::ToBoolean => {
                let value = self.core.arena_mut().pop()?;
                let value = if microesnext_truthiness::to_boolean(self.core.arena(), value)? {
                    Value::TRUE
                } else {
                    Value::FALSE
                };
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "arrays")]
            Opcode::NewArray => {
                let array = new_array(self.core.arena_mut())?;
                self.core.arena_mut().push(array)?;
                Ok(None)
            }
            #[cfg(feature = "arrays")]
            Opcode::GetIndex => {
                let index = self
                    .core
                    .arena_mut()
                    .pop()?
                    .as_i30()
                    .and_then(|index| usize::try_from(index).ok())
                    .ok_or(Error::Type)?;
                let array = self.core.arena_mut().pop()?;
                let value = array_get(self.core.arena(), array, index)?;
                self.core.arena_mut().push(value)?;
                Ok(None)
            }
            #[cfg(feature = "arrays")]
            Opcode::SetIndex => {
                let value = self.core.arena_mut().pop()?;
                let index = self
                    .core
                    .arena_mut()
                    .pop()?
                    .as_i30()
                    .and_then(|index| usize::try_from(index).ok())
                    .ok_or(Error::Type)?;
                let array = self.core.arena_mut().pop()?;
                let array = array_set(self.core.arena_mut(), array, index, value)?;
                self.core.arena_mut().push(array)?;
                Ok(None)
            }
            #[cfg(feature = "exceptions")]
            Opcode::Try => {
                let catch_pc = self.core.next_u32()? as usize;
                self.handlers.install(&mut self.core, catch_pc)?;
                Ok(None)
            }
            #[cfg(feature = "exceptions")]
            Opcode::EndTry => {
                self.handlers.leave(&mut self.core)?;
                Ok(None)
            }
            #[cfg(feature = "exceptions")]
            Opcode::Drop => {
                self.core.arena_mut().pop()?;
                Ok(None)
            }
            _ => Err(Error::BadBytecode),
        }
    }

    #[inline(always)]
    #[cfg(not(any(
        feature = "async",
        feature = "arrays",
        feature = "atoms",
        feature = "control-flow",
        feature = "strings",
        feature = "objects",
        feature = "functions",
        feature = "locals",
        feature = "numbers",
        feature = "exceptions"
    )))]
    fn run_extension(&mut self, _opcode: Opcode) -> Result<Option<Outcome>, Error> {
        Err(Error::BadBytecode)
    }

    /// Enter a guest closure from a scheduler job without using a native call
    /// frame. The argument begins as the closure's sole operand.
    #[cfg(feature = "functions")]
    pub fn call_closure(&mut self, function: Value, argument: Value) -> Result<Outcome, Error> {
        let target = entry(self.core.arena(), function)?;
        self.core.enter_external_call(function, target, argument)?;
        self.run()
    }

    #[cfg(feature = "async")]
    pub fn resume(&mut self, continuation: RootId, value: Value) -> Result<Outcome, Error> {
        let handler_depth = resume(&mut self.core, continuation, value)?;
        self.set_handler_depth(handler_depth);
        self.run()
    }

    #[cfg(feature = "async")]
    pub fn resume_value(&mut self, continuation: Value, value: Value) -> Result<Outcome, Error> {
        let handler_depth = resume_value(&mut self.core, continuation, value)?;
        self.set_handler_depth(handler_depth);
        self.run()
    }

    /// Resume an `await` with an abrupt completion. Exception handlers will
    /// consume this path once try/catch bytecode is added; until then it is an
    /// observable uncaught throw rather than a Rust error.
    #[cfg(feature = "async")]
    pub fn resume_rejected(
        &mut self,
        continuation: RootId,
        reason: Value,
    ) -> Result<Outcome, Error> {
        let handler_depth = restore(&mut self.core, continuation)?;
        self.set_handler_depth(handler_depth);
        match self.handle_throw(reason)? {
            Some(outcome) => Ok(outcome),
            None => self.run(),
        }
    }

    #[cfg(feature = "async")]
    pub fn resume_value_rejected(
        &mut self,
        continuation: Value,
        reason: Value,
    ) -> Result<Outcome, Error> {
        let handler_depth = restore_value(&mut self.core, continuation)?;
        self.set_handler_depth(handler_depth);
        match self.handle_throw(reason)? {
            Some(outcome) => Ok(outcome),
            None => self.run(),
        }
    }

    #[inline(always)]
    #[cfg(feature = "async")]
    fn current_handler_depth(&self) -> Option<usize> {
        #[cfg(feature = "exceptions")]
        return self.handlers.depth();
        #[cfg(not(feature = "exceptions"))]
        None
    }

    #[inline(always)]
    #[cfg(feature = "async")]
    fn set_handler_depth(&mut self, handler_depth: Option<usize>) {
        #[cfg(feature = "exceptions")]
        {
            self.handlers.restore(handler_depth);
        }
        #[cfg(not(feature = "exceptions"))]
        let _ = handler_depth;
    }

    fn handle_throw(&mut self, reason: Value) -> Result<Option<Outcome>, Error> {
        #[cfg(feature = "exceptions")]
        if self.handlers.unwind(&mut self.core, reason)? {
            return Ok(None);
        }
        self.core.abandon();
        Ok(Some(Outcome::Throw(reason)))
    }
}

#[cfg(test)]
mod tests {
    extern crate alloc;

    #[cfg(feature = "async")]
    use alloc::vec::Vec;
    use microesnext_compiler::Builder;

    use super::*;

    #[cfg(feature = "async")]
    fn awaiting_program() -> Vec<u8> {
        Builder::new()
            .const_i30(40)
            .const_i30(2)
            .op(Opcode::Await)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish()
    }

    #[cfg(feature = "async")]
    #[test]
    fn suspends_and_resumes_without_a_native_frame() {
        let code = awaiting_program();
        let mut memory = [0; 64];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
        let Outcome::Await {
            value,
            continuation,
        } = machine.run().unwrap()
        else {
            panic!("expected suspension")
        };
        assert_eq!(value.as_i30(), Some(2));
        let Outcome::Complete(value) = machine
            .resume(continuation, Value::from_i30(2).unwrap())
            .unwrap()
        else {
            panic!("expected completion")
        };
        assert_eq!(value.as_i30(), Some(42));
    }

    #[cfg(feature = "async")]
    #[test]
    fn suspension_preserves_an_active_guest_call_frame() {
        let code = Builder::new()
            .call(6)
            .op(Opcode::Return)
            .const_i30(40)
            .const_i30(2)
            .op(Opcode::Await)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
        let Outcome::Await { continuation, .. } = machine.run().unwrap() else {
            panic!("expected suspension")
        };
        assert_eq!(
            machine
                .resume(continuation, Value::from_i30(2).unwrap())
                .unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "async")]
    #[test]
    fn rejected_await_is_an_abrupt_guest_completion() {
        let code = awaiting_program();
        let mut memory = [0; 64];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
        let Outcome::Await { continuation, .. } = machine.run().unwrap() else {
            panic!("expected suspension")
        };
        let reason = Value::from_i30(17).unwrap();
        assert_eq!(
            machine.resume_rejected(continuation, reason).unwrap(),
            Outcome::Throw(reason)
        );
    }

    #[cfg(all(feature = "async", feature = "exceptions"))]
    #[test]
    fn rejected_await_resumes_at_its_preserved_guest_handler() {
        let code = Builder::new()
            .try_at(12)
            .const_i30(2)
            .op(Opcode::Await)
            .op(Opcode::EndTry)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
        let Outcome::Await { continuation, .. } = machine.run().unwrap() else {
            panic!("expected suspension")
        };
        let reason = Value::from_i30(17).unwrap();
        assert_eq!(
            machine.resume_rejected(continuation, reason).unwrap(),
            Outcome::Complete(reason)
        );
    }

    #[cfg(feature = "exceptions")]
    #[test]
    fn catches_a_throw_across_a_guest_call_frame() {
        let code = Builder::new()
            .try_at(12)
            .call(13)
            .op(Opcode::EndTry)
            .op(Opcode::Return)
            .op(Opcode::Return)
            .const_i30(17)
            .op(Opcode::Throw)
            .finish();
        let mut memory = [0; 48];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(17).unwrap())
        );
    }

    #[cfg(feature = "exceptions")]
    #[test]
    fn normal_completion_removes_its_handler_and_preserves_its_value() {
        let code = Builder::new()
            .try_at(11)
            .const_i30(42)
            .op(Opcode::EndTry)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 32];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "exceptions")]
    #[test]
    fn rethrow_reaches_the_next_outer_handler() {
        let code = Builder::new()
            .try_at(20)
            .try_at(19)
            .const_i30(17)
            .op(Opcode::Throw)
            .op(Opcode::EndTry)
            .op(Opcode::EndTry)
            .op(Opcode::Return)
            .op(Opcode::Throw)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 40];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(17).unwrap())
        );
    }

    #[test]
    fn guest_calls_use_vm_frames_instead_of_native_recursion() {
        let code = Builder::new()
            .call(6)
            .op(Opcode::Return)
            .const_i30(20)
            .const_i30(22)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "objects")]
    #[test]
    fn executes_interned_property_bytecode() {
        let code = Builder::new()
            .object()
            .atom(b"answer")
            .const_i30(42)
            .op(Opcode::SetProperty)
            .atom(b"answer")
            .op(Opcode::GetProperty)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 128];
        let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "strings")]
    #[test]
    fn executes_a_string_constant_without_objects() {
        let code = Builder::new().string(b"hello").op(Opcode::Return).finish();
        let mut memory = [0; 48];
        let mut machine = Machine::with_strings(&code, &mut memory, 1).unwrap();
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected string completion")
        };
        assert!(
            machine
                .arena()
                .bytes_equal(value.as_ref().unwrap(), b"hello")
                .unwrap()
        );
    }

    #[cfg(feature = "numbers")]
    #[test]
    fn promotes_optional_fractional_arithmetic_without_changing_i30_addition() {
        let code = Builder::new()
            .const_f64(1.25)
            .const_i30(2)
            .op(Opcode::AddNumber)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 48];
        let mut machine = Machine::new(&code, &mut memory);
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected number completion")
        };
        assert_eq!(microesnext_numbers::get(machine.arena(), value), Ok(3.25));
    }

    #[cfg(feature = "functions")]
    #[test]
    fn closure_captures_cross_an_explicit_call_frame() {
        let code = Builder::new()
            .const_i30(40)
            .closure(14, 1)
            .op(Opcode::CallValue)
            .op(Opcode::Return)
            .load_capture(0)
            .const_i30(2)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 96];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run().unwrap(),
            Outcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[cfg(feature = "functions")]
    #[test]
    fn scheduler_can_invoke_a_closure_with_an_argument() {
        let code = Builder::new().op(Opcode::Return).finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        let function = microesnext_functions::capture_stack(machine.arena_mut(), 0, 0).unwrap();
        let argument = Value::from_i30(42).unwrap();
        assert_eq!(
            machine.call_closure(function, argument).unwrap(),
            Outcome::Complete(argument)
        );
    }

    #[cfg(feature = "locals")]
    #[test]
    fn executes_optional_local_frames() {
        let code = Builder::new()
            .init_locals(2)
            .const_i30(40)
            .store_local(0)
            .const_i30(2)
            .store_local(1)
            .load_local(0)
            .load_local(1)
            .op(Opcode::AddI30)
            .op(Opcode::ReturnLocals)
            .finish();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
        );

        let malformed = Builder::new()
            .init_locals(1)
            .load_local(1)
            .op(Opcode::ReturnLocals)
            .finish();
        let mut machine = Machine::new(&malformed, &mut memory);
        assert_eq!(machine.run(), Err(Error::BadBytecode));
    }

    #[cfg(feature = "control-flow")]
    #[test]
    fn branches_only_on_explicit_booleans() {
        let code = Builder::new()
            .const_i30(0)
            .to_boolean()
            .jump_if_false_boolean(17)
            .const_i30(1)
            .op(Opcode::Return)
            .const_i30(42)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 32];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
        );

        let malformed = Builder::new()
            .const_i30(0)
            .jump_if_false_boolean(10)
            .const_i30(1)
            .op(Opcode::Return)
            .finish();
        let mut machine = Machine::new(&malformed, &mut memory);
        assert_eq!(machine.run(), Err(Error::Type));
    }

    #[cfg(all(feature = "control-flow", feature = "numbers"))]
    #[test]
    fn coerces_optional_boxed_values_before_branching() {
        let number = Builder::new()
            .const_f64(f64::NAN)
            .to_boolean()
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 48];
        let mut machine = Machine::new(&number, &mut memory);
        assert_eq!(machine.run(), Ok(Outcome::Complete(Value::FALSE)));

        #[cfg(feature = "strings")]
        {
            let string = Builder::new()
                .string(b"")
                .to_boolean()
                .op(Opcode::Return)
                .finish();
            let mut machine = Machine::new(&string, &mut memory);
            assert_eq!(machine.run(), Ok(Outcome::Complete(Value::FALSE)));
        }
    }
}
