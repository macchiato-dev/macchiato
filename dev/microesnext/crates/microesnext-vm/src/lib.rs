#![no_std]

use microesnext_arena::Arena;
use microesnext_bytecode::{Opcode, read_i30, read_opcode, read_u32};
use microesnext_types::{Error, RootId, Value};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Outcome {
    Complete(Value),
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
        }
    }

    #[inline(always)]
    pub fn arena(&self) -> &Arena<'_> {
        &self.arena
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
                    let previous_frame = self.arena.pop()?.as_i30().ok_or(Error::BadBytecode)?;
                    let return_pc = self.arena.pop()?.as_i30().ok_or(Error::BadBytecode)?;
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
                    self.frame_depth = Some(self.arena.stack_len());
                    self.pc = target;
                }
            }
        }
    }

    pub fn resume(&mut self, continuation: RootId, value: Value) -> Result<Outcome, Error> {
        let continuation = self.arena.release(continuation)?;
        let continuation = continuation.as_ref().ok_or(Error::Type)?;
        let (pc, frame_depth) = self.arena.resume_stack(continuation)?;
        self.pc = pc as usize;
        self.frame_depth = frame_depth;
        self.arena.push(value)?;
        self.run()
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
}
