#![no_std]

use microesnext_arena::Arena;
use microesnext_bytecode::{Opcode, read_bytes, read_i30, read_opcode, read_u16, read_u32};
use microesnext_types::{Error, RootId, Value};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CoreOutcome {
    Complete(Value),
    Throw(Value),
    Extension(Opcode),
}

/// State used by the invariant interpreter loop. Optional capabilities live
/// outside this type, so enabling them cannot change its field layout.
pub struct Core<'code, 'memory> {
    arena: Arena<'memory>,
    code: &'code [u8],
    pc: usize,
    frame_depth: Option<usize>,
}

impl<'code, 'memory> Core<'code, 'memory> {
    pub fn new(code: &'code [u8], memory: &'memory mut [u32], root_capacity: usize) -> Self {
        Self {
            arena: Arena::with_root_capacity(memory, root_capacity),
            code,
            pc: 0,
            frame_depth: None,
        }
    }

    pub fn from_parts(
        arena: Arena<'memory>,
        code: &'code [u8],
        pc: usize,
        frame_depth: Option<usize>,
    ) -> Self {
        Self {
            arena,
            code,
            pc,
            frame_depth,
        }
    }

    pub fn into_parts(self) -> (Arena<'memory>, usize, Option<usize>) {
        (self.arena, self.pc, self.frame_depth)
    }

    pub fn grow_into<'next>(self, memory: &'next mut [u32]) -> Result<Core<'code, 'next>, Error> {
        Ok(Core {
            arena: self.arena.grow_into(memory)?,
            code: self.code,
            pc: self.pc,
            frame_depth: self.frame_depth,
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

    pub fn code(&self) -> &'code [u8] {
        self.code
    }

    pub fn pc(&self) -> usize {
        self.pc
    }

    pub fn set_pc(&mut self, pc: usize) -> Result<(), Error> {
        if pc >= self.code.len() {
            return Err(Error::BadBytecode);
        }
        self.pc = pc;
        Ok(())
    }

    pub fn frame_depth(&self) -> Option<usize> {
        self.frame_depth
    }

    pub fn set_frame_depth(&mut self, frame_depth: Option<usize>) {
        self.frame_depth = frame_depth;
    }

    pub fn next_u32(&mut self) -> Result<u32, Error> {
        read_u32(self.code, &mut self.pc)
    }

    pub fn next_u16(&mut self) -> Result<u16, Error> {
        read_u16(self.code, &mut self.pc)
    }

    pub fn next_bytes(&mut self) -> Result<&'code [u8], Error> {
        read_bytes(self.code, &mut self.pc)
    }

    /// Run only invariant opcodes. Capability opcodes return to the wrapper
    /// after their byte has been consumed, then execution can re-enter here.
    #[inline(never)]
    pub fn run(&mut self) -> Result<CoreOutcome, Error> {
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
                Opcode::Return => {
                    let result = self.arena.pop()?;
                    let Some(frame_depth) = self.frame_depth else {
                        return Ok(CoreOutcome::Complete(result));
                    };
                    if self.arena.stack_len() != frame_depth {
                        return Err(Error::BadBytecode);
                    }
                    let _function = self.arena.pop()?;
                    let previous_frame = self.arena.pop()?.as_i30().ok_or(Error::BadBytecode)?;
                    let return_pc = self.arena.pop()?.as_i30().ok_or(Error::BadBytecode)?;
                    if return_pc < 0 {
                        self.frame_depth = None;
                        return Ok(CoreOutcome::Complete(result));
                    }
                    self.frame_depth = (previous_frame >= 0).then_some(previous_frame as usize);
                    self.pc = return_pc as usize;
                    self.arena.push(result)?;
                }
                Opcode::Call => {
                    let target = read_u32(self.code, &mut self.pc)? as usize;
                    self.enter_call(Value::UNDEFINED, target)?;
                }
                Opcode::Throw => {
                    let reason = self.arena.pop()?;
                    return Ok(CoreOutcome::Throw(reason));
                }
                opcode => return Ok(CoreOutcome::Extension(opcode)),
            }
        }
    }

    pub fn enter_call(&mut self, function: Value, target: usize) -> Result<(), Error> {
        if target >= self.code.len() {
            return Err(Error::BadBytecode);
        }
        let previous_frame = self.frame_depth.map_or(-1, |depth| depth as i32);
        self.arena
            .push(Value::from_i30(self.pc as i32).ok_or(Error::BadBytecode)?)?;
        self.arena
            .push(Value::from_i30(previous_frame).ok_or(Error::BadBytecode)?)?;
        self.arena.push(function)?;
        self.frame_depth = Some(self.arena.stack_len());
        self.pc = target;
        Ok(())
    }

    pub fn enter_external_call(
        &mut self,
        function: Value,
        target: usize,
        argument: Value,
    ) -> Result<(), Error> {
        if self.frame_depth.is_some() || self.arena.stack_len() != 0 || target >= self.code.len() {
            return Err(Error::Type);
        }
        self.arena
            .push(Value::from_i30(-1).ok_or(Error::BadBytecode)?)?;
        self.arena
            .push(Value::from_i30(-1).ok_or(Error::BadBytecode)?)?;
        self.arena.push(function)?;
        self.frame_depth = Some(self.arena.stack_len());
        self.arena.push(argument)?;
        self.pc = target;
        Ok(())
    }

    pub fn suspend(&mut self) -> Result<(Value, RootId), Error> {
        self.suspend_with_handler(None)
    }

    pub fn suspend_with_handler(
        &mut self,
        handler_depth: Option<usize>,
    ) -> Result<(Value, RootId), Error> {
        let mut roots = [self.arena.pop()?];
        let continuation = self.arena.suspend_stack(
            self.pc as u32,
            self.frame_depth,
            handler_depth,
            &mut roots,
        )?;
        let continuation = self.arena.retain(Value::from_ref(continuation))?;
        Ok((roots[0], continuation))
    }

    pub fn resume(&mut self, continuation: RootId, value: Value) -> Result<(), Error> {
        self.resume_with_handler(continuation, value).map(|_| ())
    }

    pub fn resume_with_handler(
        &mut self,
        continuation: RootId,
        value: Value,
    ) -> Result<Option<usize>, Error> {
        let continuation = self.arena.release(continuation)?;
        self.resume_value_with_handler(continuation, value)
    }

    pub fn resume_value(&mut self, continuation: Value, value: Value) -> Result<(), Error> {
        self.resume_value_with_handler(continuation, value)
            .map(|_| ())
    }

    pub fn resume_value_with_handler(
        &mut self,
        continuation: Value,
        value: Value,
    ) -> Result<Option<usize>, Error> {
        let handler_depth = self.restore_value(continuation)?;
        self.arena.push(value)?;
        Ok(handler_depth)
    }

    pub fn restore(&mut self, continuation: RootId) -> Result<Option<usize>, Error> {
        let continuation = self.arena.release(continuation)?;
        self.restore_value(continuation)
    }

    pub fn restore_value(&mut self, continuation: Value) -> Result<Option<usize>, Error> {
        let continuation = continuation.as_ref().ok_or(Error::Type)?;
        let (pc, frame_depth, handler_depth) = self.arena.resume_stack(continuation)?;
        self.pc = pc as usize;
        self.frame_depth = frame_depth;
        Ok(handler_depth)
    }

    pub fn abandon(&mut self) {
        self.arena.clear_stack();
        self.frame_depth = None;
    }
}

#[cfg(test)]
mod tests {
    use microesnext_compiler::Builder;

    use super::*;

    #[test]
    fn executes_base_bytecode_without_capability_state() {
        let code = Builder::new()
            .const_i30(20)
            .const_i30(22)
            .op(Opcode::AddI30)
            .op(Opcode::Return)
            .finish();
        let mut memory = [0; 32];
        let mut core = Core::new(&code, &mut memory, 0);
        assert_eq!(
            core.run().unwrap(),
            CoreOutcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[test]
    fn returns_extension_opcodes_to_the_capability_wrapper() {
        let code = [Opcode::Await as u8];
        let mut memory = [0; 8];
        let mut core = Core::new(&code, &mut memory, 0);
        assert_eq!(core.run().unwrap(), CoreOutcome::Extension(Opcode::Await));
        assert_eq!(core.pc(), 1);
    }
}
