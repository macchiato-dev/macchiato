#![no_std]

use microesnext_arena::Arena;
use microesnext_bytecode::{Opcode, read_i30, read_opcode};
use microesnext_types::{Error, HeapRef, Value};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Outcome {
    Complete(Value),
    Await { value: Value, continuation: HeapRef },
}

pub struct Machine<'code> {
    arena: Arena,
    code: &'code [u8],
    pc: usize,
}

impl<'code> Machine<'code> {
    pub fn new(code: &'code [u8], memory_words: usize) -> Self {
        Self {
            arena: Arena::new(memory_words),
            code,
            pc: 0,
        }
    }

    #[inline(always)]
    pub fn arena(&self) -> &Arena {
        &self.arena
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
                    let mut roots = [self.arena.pop()?];
                    let continuation = self.arena.suspend_stack(self.pc as u32, &mut roots)?;
                    let value = roots[0];
                    return Ok(Outcome::Await {
                        value,
                        continuation,
                    });
                }
                Opcode::Return => return Ok(Outcome::Complete(self.arena.pop()?)),
            }
        }
    }

    pub fn resume(&mut self, continuation: HeapRef, value: Value) -> Result<Outcome, Error> {
        self.pc = self.arena.resume_stack(continuation)? as usize;
        self.arena.push(value)?;
        self.run()
    }
}

#[cfg(test)]
mod tests {
    extern crate alloc;

    use alloc::vec::Vec;
    use microesnext_bytecode::Builder;

    use super::*;

    fn awaiting_program() -> Vec<u8> {
        Builder::new()
            .const_i30(40)
            .const_i30(2)
            .op(Opcode::Await)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish()
    }

    #[test]
    fn suspends_and_resumes_without_a_native_frame() {
        let code = awaiting_program();
        let mut machine = Machine::new(&code, 64);
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
}
