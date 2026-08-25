#![no_std]

use microesnext_arena::Arena;
use microesnext_bytecode::Opcode;
#[cfg(feature = "functions")]
use microesnext_functions::{capture, capture_stack, entry};
#[cfg(feature = "objects")]
use microesnext_objects::{Atoms, get, new_object, set};
use microesnext_types::{Error, RootId, Value};
use microesnext_vm_core::{Core, CoreOutcome};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Outcome {
    Complete(Value),
    Throw(Value),
    #[cfg(feature = "async")]
    Await {
        value: Value,
        continuation: RootId,
    },
}

pub struct Machine<'code, 'memory> {
    core: Core<'code, 'memory>,
    #[cfg(feature = "objects")]
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
            #[cfg(feature = "objects")]
            atoms: None,
        }
    }

    #[cfg(feature = "objects")]
    pub fn with_objects(
        code: &'code [u8],
        memory: &'memory mut [u32],
        root_capacity: usize,
    ) -> Result<Self, Error> {
        let mut arena = Arena::with_root_capacity(memory, root_capacity);
        let atoms = Atoms::new(&mut arena)?;
        Ok(Self {
            core: Core::from_parts(arena, code, 0, None),
            atoms: Some(atoms),
        })
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
            #[cfg(feature = "objects")]
            atoms: self.atoms,
        })
    }

    pub fn run(&mut self) -> Result<Outcome, Error> {
        loop {
            match self.core.run()? {
                CoreOutcome::Complete(value) => return Ok(Outcome::Complete(value)),
                CoreOutcome::Throw(value) => return Ok(Outcome::Throw(value)),
                CoreOutcome::Extension(Opcode::Await) => {
                    #[cfg(not(feature = "async"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "async")]
                    {
                        let (value, continuation) = self.core.suspend()?;
                        return Ok(Outcome::Await {
                            value,
                            continuation,
                        });
                    }
                }
                CoreOutcome::Extension(Opcode::ConstString) => {
                    #[cfg(not(feature = "objects"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "objects")]
                    {
                        let bytes = self.core.next_bytes()?;
                        let atoms = self.atoms.as_mut().ok_or(Error::Type)?;
                        let value = atoms.intern(self.core.arena_mut(), bytes)?;
                        self.core.arena_mut().push(value)?;
                    }
                }
                CoreOutcome::Extension(Opcode::NewObject) => {
                    #[cfg(not(feature = "objects"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "objects")]
                    {
                        let object = new_object(self.core.arena_mut(), Value::NULL)?;
                        self.core.arena_mut().push(object)?;
                    }
                }
                CoreOutcome::Extension(Opcode::GetProperty) => {
                    #[cfg(not(feature = "objects"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "objects")]
                    {
                        let key = self.core.arena_mut().pop()?;
                        let object = self.core.arena_mut().pop()?;
                        let value = get(self.core.arena(), object, key)?;
                        self.core.arena_mut().push(value)?;
                    }
                }
                CoreOutcome::Extension(Opcode::SetProperty) => {
                    #[cfg(not(feature = "objects"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "objects")]
                    {
                        let value = self.core.arena_mut().pop()?;
                        let key = self.core.arena_mut().pop()?;
                        let object = self.core.arena_mut().pop()?;
                        let object = set(self.core.arena_mut(), object, key, value)?;
                        self.core.arena_mut().push(object)?;
                    }
                }
                CoreOutcome::Extension(Opcode::Closure) => {
                    #[cfg(not(feature = "functions"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "functions")]
                    {
                        let target = self.core.next_u32()?;
                        let capture_count = self.core.next_u16()? as usize;
                        if target as usize >= self.core.code().len() {
                            return Err(Error::BadBytecode);
                        }
                        let closure = capture_stack(self.core.arena_mut(), target, capture_count)?;
                        self.core.arena_mut().push(closure)?;
                    }
                }
                CoreOutcome::Extension(Opcode::CallValue) => {
                    #[cfg(not(feature = "functions"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "functions")]
                    {
                        let function = self.core.arena_mut().pop()?;
                        let target = entry(self.core.arena(), function)?;
                        self.core.enter_call(function, target)?;
                    }
                }
                CoreOutcome::Extension(Opcode::LoadCapture) => {
                    #[cfg(not(feature = "functions"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "functions")]
                    {
                        let index = self.core.next_u16()? as usize;
                        let frame_depth = self.core.frame_depth().ok_or(Error::BadBytecode)?;
                        let function_index = self.core.arena().stack_len() - frame_depth;
                        let function = self.core.arena().stack_value(function_index)?;
                        let value = capture(self.core.arena(), function, index)?;
                        self.core.arena_mut().push(value)?;
                    }
                }
                CoreOutcome::Extension(_) => return Err(Error::BadBytecode),
            }
        }
    }

    /// Enter a guest closure from a scheduler job without using a native call
    /// frame. The argument begins as the closure's sole operand.
    #[cfg(feature = "functions")]
    pub fn call_closure(&mut self, function: Value, argument: Value) -> Result<Outcome, Error> {
        let target = entry(self.core.arena(), function)?;
        self.core.enter_external_call(function, target, argument)?;
        self.run()
    }

    pub fn resume(&mut self, continuation: RootId, value: Value) -> Result<Outcome, Error> {
        self.core.resume(continuation, value)?;
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
        match self.core.reject(continuation, reason)? {
            CoreOutcome::Throw(reason) => Ok(Outcome::Throw(reason)),
            _ => Err(Error::BadBytecode),
        }
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
            .string(b"answer")
            .const_i30(42)
            .op(Opcode::SetProperty)
            .string(b"answer")
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
}
