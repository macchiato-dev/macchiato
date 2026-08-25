#![no_std]

use microesnext_arena::Arena;
#[cfg(feature = "arrays")]
use microesnext_arrays::{get as array_get, new as new_array, set as array_set};
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
    Await { value: Value, continuation: RootId },
}

pub struct Machine<'code, 'memory> {
    core: Core<'code, 'memory>,
    #[cfg(feature = "exceptions")]
    handler_depth: Option<usize>,
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
            #[cfg(feature = "exceptions")]
            handler_depth: None,
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
            #[cfg(feature = "exceptions")]
            handler_depth: None,
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
            #[cfg(feature = "exceptions")]
            handler_depth: self.handler_depth,
            #[cfg(feature = "objects")]
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
        feature = "objects",
        feature = "functions",
        feature = "exceptions"
    ))]
    fn run_extension(&mut self, opcode: Opcode) -> Result<Option<Outcome>, Error> {
        match opcode {
            Opcode::Await => {
                #[cfg(not(feature = "async"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "async")]
                {
                    let (value, continuation) = self
                        .core
                        .suspend_with_handler(self.current_handler_depth())?;
                    Ok(Some(Outcome::Await {
                        value,
                        continuation,
                    }))
                }
            }
            Opcode::ConstString => {
                #[cfg(not(feature = "objects"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "objects")]
                {
                    let bytes = self.core.next_bytes()?;
                    let atoms = self.atoms.as_mut().ok_or(Error::Type)?;
                    let value = atoms.intern(self.core.arena_mut(), bytes)?;
                    self.core.arena_mut().push(value)?;
                    Ok(None)
                }
            }
            Opcode::NewObject => {
                #[cfg(not(feature = "objects"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "objects")]
                {
                    let object = new_object(self.core.arena_mut(), Value::NULL)?;
                    self.core.arena_mut().push(object)?;
                    Ok(None)
                }
            }
            Opcode::GetProperty => {
                #[cfg(not(feature = "objects"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "objects")]
                {
                    let key = self.core.arena_mut().pop()?;
                    let object = self.core.arena_mut().pop()?;
                    let value = get(self.core.arena(), object, key)?;
                    self.core.arena_mut().push(value)?;
                    Ok(None)
                }
            }
            Opcode::SetProperty => {
                #[cfg(not(feature = "objects"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "objects")]
                {
                    let value = self.core.arena_mut().pop()?;
                    let key = self.core.arena_mut().pop()?;
                    let object = self.core.arena_mut().pop()?;
                    let object = set(self.core.arena_mut(), object, key, value)?;
                    self.core.arena_mut().push(object)?;
                    Ok(None)
                }
            }
            Opcode::Closure => {
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
                    Ok(None)
                }
            }
            Opcode::CallValue => {
                #[cfg(not(feature = "functions"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "functions")]
                {
                    let function = self.core.arena_mut().pop()?;
                    let target = entry(self.core.arena(), function)?;
                    self.core.enter_call(function, target)?;
                    Ok(None)
                }
            }
            Opcode::LoadCapture => {
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
                    Ok(None)
                }
            }
            Opcode::NewArray => {
                #[cfg(not(feature = "arrays"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "arrays")]
                {
                    let array = new_array(self.core.arena_mut())?;
                    self.core.arena_mut().push(array)?;
                    Ok(None)
                }
            }
            Opcode::GetIndex => {
                #[cfg(not(feature = "arrays"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "arrays")]
                {
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
            }
            Opcode::SetIndex => {
                #[cfg(not(feature = "arrays"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "arrays")]
                {
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
            }
            Opcode::Try => {
                #[cfg(not(feature = "exceptions"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "exceptions")]
                {
                    let catch_pc = self.core.next_u32()? as usize;
                    self.push_handler(catch_pc)?;
                    Ok(None)
                }
            }
            Opcode::EndTry => {
                #[cfg(not(feature = "exceptions"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "exceptions")]
                {
                    self.pop_handler()?;
                    Ok(None)
                }
            }
            Opcode::Drop => {
                #[cfg(not(feature = "exceptions"))]
                return Err(Error::BadBytecode);
                #[cfg(feature = "exceptions")]
                {
                    self.core.arena_mut().pop()?;
                    Ok(None)
                }
            }
            _ => Err(Error::BadBytecode),
        }
    }

    #[inline(always)]
    #[cfg(not(any(
        feature = "async",
        feature = "arrays",
        feature = "objects",
        feature = "functions",
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

    pub fn resume(&mut self, continuation: RootId, value: Value) -> Result<Outcome, Error> {
        let handler_depth = self.core.resume_with_handler(continuation, value)?;
        self.set_handler_depth(handler_depth);
        self.run()
    }

    pub fn resume_value(&mut self, continuation: Value, value: Value) -> Result<Outcome, Error> {
        let handler_depth = self.core.resume_value_with_handler(continuation, value)?;
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
        let handler_depth = self.core.restore(continuation)?;
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
        let handler_depth = self.core.restore_value(continuation)?;
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
        return self.handler_depth;
        #[cfg(not(feature = "exceptions"))]
        None
    }

    #[inline(always)]
    fn set_handler_depth(&mut self, handler_depth: Option<usize>) {
        #[cfg(feature = "exceptions")]
        {
            self.handler_depth = handler_depth;
        }
        #[cfg(not(feature = "exceptions"))]
        let _ = handler_depth;
    }

    fn handle_throw(&mut self, reason: Value) -> Result<Option<Outcome>, Error> {
        #[cfg(feature = "exceptions")]
        if self.unwind(reason)? {
            return Ok(None);
        }
        self.core.abandon();
        Ok(Some(Outcome::Throw(reason)))
    }

    #[cfg(feature = "exceptions")]
    fn push_handler(&mut self, catch_pc: usize) -> Result<(), Error> {
        if catch_pc >= self.core.code().len() {
            return Err(Error::BadBytecode);
        }
        let previous = self.handler_depth.map_or(-1, |depth| depth as i32);
        let frame = self.core.frame_depth().map_or(-1, |depth| depth as i32);
        self.core
            .arena_mut()
            .push(Value::from_i30(previous).ok_or(Error::BadBytecode)?)?;
        self.core
            .arena_mut()
            .push(Value::from_i30(frame).ok_or(Error::BadBytecode)?)?;
        self.core
            .arena_mut()
            .push(Value::from_i30(catch_pc as i32).ok_or(Error::BadBytecode)?)?;
        self.handler_depth = Some(self.core.arena().stack_len());
        Ok(())
    }

    #[cfg(feature = "exceptions")]
    fn pop_handler(&mut self) -> Result<(), Error> {
        let depth = self.handler_depth.ok_or(Error::BadBytecode)?;
        if self.core.arena().stack_len() != depth + 1 {
            return Err(Error::BadBytecode);
        }
        let result = self.core.arena_mut().pop()?;
        let _catch_pc = self.core.arena_mut().pop()?;
        let _frame = self.core.arena_mut().pop()?;
        let previous = self
            .core
            .arena_mut()
            .pop()?
            .as_i30()
            .ok_or(Error::BadBytecode)?;
        self.handler_depth = (previous >= 0).then_some(previous as usize);
        self.core.arena_mut().push(result)?;
        Ok(())
    }

    #[cfg(feature = "exceptions")]
    fn unwind(&mut self, reason: Value) -> Result<bool, Error> {
        let Some(depth) = self.handler_depth else {
            return Ok(false);
        };
        self.core.arena_mut().truncate_stack(depth)?;
        let catch_pc = self
            .core
            .arena_mut()
            .pop()?
            .as_i30()
            .ok_or(Error::BadBytecode)?;
        let frame = self
            .core
            .arena_mut()
            .pop()?
            .as_i30()
            .ok_or(Error::BadBytecode)?;
        let previous = self
            .core
            .arena_mut()
            .pop()?
            .as_i30()
            .ok_or(Error::BadBytecode)?;
        self.core
            .set_pc(usize::try_from(catch_pc).map_err(|_| Error::BadBytecode)?)?;
        self.core
            .set_frame_depth((frame >= 0).then_some(frame as usize));
        self.handler_depth = (previous >= 0).then_some(previous as usize);
        self.core.arena_mut().push(reason)?;
        Ok(true)
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
