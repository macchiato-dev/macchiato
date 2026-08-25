#![no_std]

use microesnext_arena::Arena;
#[cfg(feature = "objects")]
use microesnext_bytecode::read_bytes;
#[cfg(feature = "functions")]
use microesnext_bytecode::read_u16;
use microesnext_bytecode::{Opcode, read_i30, read_opcode, read_u32};
#[cfg(feature = "functions")]
use microesnext_functions::{capture, capture_stack, entry};
#[cfg(feature = "objects")]
use microesnext_objects::{Atoms, get, new_object, set};
use microesnext_types::{Error, RootId, Value};

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
    arena: Arena<'memory>,
    code: &'code [u8],
    pc: usize,
    frame_depth: Option<usize>,
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
            arena: Arena::with_root_capacity(memory, root_capacity),
            code,
            pc: 0,
            frame_depth: None,
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
            arena,
            code,
            pc: 0,
            frame_depth: None,
            atoms: Some(atoms),
        })
    }

    #[inline(always)]
    pub fn arena(&self) -> &Arena<'_> {
        &self.arena
    }

    #[inline(always)]
    pub fn arena_mut(&mut self) -> &mut Arena<'memory> {
        &mut self.arena
    }

    pub fn retain(&mut self, value: Value) -> Result<RootId, Error> {
        self.arena.retain(value)
    }

    pub fn root(&self, root: RootId) -> Result<Value, Error> {
        self.arena.root(root)
    }

    pub fn release(&mut self, root: RootId) -> Result<Value, Error> {
        self.arena.release(root)
    }

    pub fn grow_into<'next>(
        self,
        memory: &'next mut [u32],
    ) -> Result<Machine<'code, 'next>, Error> {
        Ok(Machine {
            arena: self.arena.grow_into(memory)?,
            code: self.code,
            pc: self.pc,
            frame_depth: self.frame_depth,
            #[cfg(feature = "objects")]
            atoms: self.atoms,
        })
    }

    pub fn run(&mut self) -> Result<Outcome, Error> {
        loop {
            match read_opcode(self.code, &mut self.pc)? {
                Opcode::ConstI30 => {
                    let value = Value::from_i30(read_i30(self.code, &mut self.pc)?)
                        .ok_or(Error::BadBytecode)?;
                    self.arena.push(value)?;
                }
                Opcode::AddI30 => {
                    let right = self.arena.pop()?.as_i30().ok_or(Error::Type)?;
                    let left = self.arena.pop()?.as_i30().ok_or(Error::Type)?;
                    let value = Value::from_i30(left.checked_add(right).ok_or(Error::Type)?)
                        .ok_or(Error::Type)?;
                    self.arena.push(value)?;
                }
                Opcode::Await => {
                    #[cfg(not(feature = "async"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "async")]
                    {
                        let mut roots = [self.arena.pop()?];
                        let continuation = self.arena.suspend_stack(
                            self.pc as u32,
                            self.frame_depth,
                            &mut roots,
                        )?;
                        let continuation = self.arena.retain(Value::from_ref(continuation))?;
                        return Ok(Outcome::Await {
                            value: roots[0],
                            continuation,
                        });
                    }
                }
                Opcode::Return => {
                    let result = self.arena.pop()?;
                    let Some(frame_depth) = self.frame_depth else {
                        return Ok(Outcome::Complete(result));
                    };
                    if self.arena.stack_len() != frame_depth {
                        return Err(Error::BadBytecode);
                    }
                    let _function = self.arena.pop()?;
                    let previous_frame = self.arena.pop()?.as_i30().ok_or(Error::BadBytecode)?;
                    let return_pc = self.arena.pop()?.as_i30().ok_or(Error::BadBytecode)?;
                    if return_pc < 0 {
                        self.frame_depth = None;
                        return Ok(Outcome::Complete(result));
                    }
                    self.frame_depth = (previous_frame >= 0).then_some(previous_frame as usize);
                    self.pc = return_pc as usize;
                    self.arena.push(result)?;
                }
                Opcode::Call => {
                    let target = read_u32(self.code, &mut self.pc)? as usize;
                    if target >= self.code.len() {
                        return Err(Error::BadBytecode);
                    }
                    let previous_frame = self.frame_depth.map_or(-1, |depth| depth as i32);
                    self.arena
                        .push(Value::from_i30(self.pc as i32).ok_or(Error::BadBytecode)?)?;
                    self.arena
                        .push(Value::from_i30(previous_frame).ok_or(Error::BadBytecode)?)?;
                    self.arena.push(Value::UNDEFINED)?;
                    self.frame_depth = Some(self.arena.stack_len());
                    self.pc = target;
                }
                Opcode::ConstString => {
                    #[cfg(not(feature = "objects"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "objects")]
                    {
                        let bytes = read_bytes(self.code, &mut self.pc)?;
                        let atoms = self.atoms.as_mut().ok_or(Error::Type)?;
                        let value = atoms.intern(&mut self.arena, bytes)?;
                        self.arena.push(value)?;
                    }
                }
                Opcode::NewObject => {
                    #[cfg(not(feature = "objects"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "objects")]
                    {
                        let object = new_object(&mut self.arena, Value::NULL)?;
                        self.arena.push(object)?;
                    }
                }
                Opcode::GetProperty => {
                    #[cfg(not(feature = "objects"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "objects")]
                    {
                        let key = self.arena.pop()?;
                        let object = self.arena.pop()?;
                        self.arena.push(get(&self.arena, object, key)?)?;
                    }
                }
                Opcode::SetProperty => {
                    #[cfg(not(feature = "objects"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "objects")]
                    {
                        let value = self.arena.pop()?;
                        let key = self.arena.pop()?;
                        let object = self.arena.pop()?;
                        let object = set(&mut self.arena, object, key, value)?;
                        self.arena.push(object)?;
                    }
                }
                Opcode::Closure => {
                    #[cfg(not(feature = "functions"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "functions")]
                    {
                        let target = read_u32(self.code, &mut self.pc)?;
                        let capture_count = read_u16(self.code, &mut self.pc)? as usize;
                        if target as usize >= self.code.len() {
                            return Err(Error::BadBytecode);
                        }
                        let closure = capture_stack(&mut self.arena, target, capture_count)?;
                        self.arena.push(closure)?;
                    }
                }
                Opcode::CallValue => {
                    #[cfg(not(feature = "functions"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "functions")]
                    {
                        let function = self.arena.pop()?;
                        let target = entry(&self.arena, function)?;
                        let previous_frame = self.frame_depth.map_or(-1, |depth| depth as i32);
                        self.arena
                            .push(Value::from_i30(self.pc as i32).ok_or(Error::BadBytecode)?)?;
                        self.arena
                            .push(Value::from_i30(previous_frame).ok_or(Error::BadBytecode)?)?;
                        self.arena.push(function)?;
                        self.frame_depth = Some(self.arena.stack_len());
                        self.pc = target;
                    }
                }
                Opcode::LoadCapture => {
                    #[cfg(not(feature = "functions"))]
                    return Err(Error::BadBytecode);
                    #[cfg(feature = "functions")]
                    {
                        let index = read_u16(self.code, &mut self.pc)? as usize;
                        let frame_depth = self.frame_depth.ok_or(Error::BadBytecode)?;
                        let function_index = self.arena.stack_len() - frame_depth;
                        let function = self.arena.stack_value(function_index)?;
                        self.arena.push(capture(&self.arena, function, index)?)?;
                    }
                }
                Opcode::Throw => {
                    let reason = self.arena.pop()?;
                    return Ok(self.finish_throw(reason));
                }
            }
        }
    }

    /// Enter a guest closure from a scheduler job without using a native call
    /// frame. The argument begins as the closure's sole operand.
    #[cfg(feature = "functions")]
    pub fn call_closure(&mut self, function: Value, argument: Value) -> Result<Outcome, Error> {
        if self.frame_depth.is_some() || self.arena.stack_len() != 0 {
            return Err(Error::Type);
        }
        let target = entry(&self.arena, function)?;
        self.arena
            .push(Value::from_i30(-1).ok_or(Error::BadBytecode)?)?;
        self.arena
            .push(Value::from_i30(-1).ok_or(Error::BadBytecode)?)?;
        self.arena.push(function)?;
        self.frame_depth = Some(self.arena.stack_len());
        self.arena.push(argument)?;
        self.pc = target;
        self.run()
    }

    pub fn resume(&mut self, continuation: RootId, value: Value) -> Result<Outcome, Error> {
        self.restore(continuation)?;
        self.arena.push(value)?;
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
        self.restore(continuation)?;
        Ok(self.finish_throw(reason))
    }

    fn finish_throw(&mut self, reason: Value) -> Outcome {
        self.arena.clear_stack();
        self.frame_depth = None;
        Outcome::Throw(reason)
    }

    fn restore(&mut self, continuation: RootId) -> Result<(), Error> {
        let continuation = self.arena.release(continuation)?;
        let continuation = continuation.as_ref().ok_or(Error::Type)?;
        let (pc, frame_depth) = self.arena.resume_stack(continuation)?;
        self.pc = pc as usize;
        self.frame_depth = frame_depth;
        Ok(())
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
