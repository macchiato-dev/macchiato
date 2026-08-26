use crate::core::Core;
use microesnext_types::{Error, Value};

/// The active guest handler chain. Records themselves live on the guest stack;
/// this state only points to the nearest record by logical stack depth.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct Handlers {
    depth: Option<usize>,
}

impl Handlers {
    pub const fn new() -> Self {
        Self { depth: None }
    }

    #[inline(always)]
    pub const fn depth(self) -> Option<usize> {
        self.depth
    }

    #[inline(always)]
    pub fn restore(&mut self, depth: Option<usize>) {
        self.depth = depth;
    }

    pub fn install(&mut self, core: &mut Core<'_, '_>, catch_pc: usize) -> Result<(), Error> {
        if catch_pc >= core.code().len() {
            return Err(Error::BadBytecode);
        }
        let previous = self.depth.map_or(-1, |depth| depth as i32);
        let frame = core.frame_depth().map_or(-1, |depth| depth as i32);
        core.arena_mut()
            .push(Value::from_i30(previous).ok_or(Error::BadBytecode)?)?;
        core.arena_mut()
            .push(Value::from_i30(frame).ok_or(Error::BadBytecode)?)?;
        core.arena_mut()
            .push(Value::from_i30(catch_pc as i32).ok_or(Error::BadBytecode)?)?;
        self.depth = Some(core.arena().stack_len());
        Ok(())
    }

    pub fn leave(&mut self, core: &mut Core<'_, '_>) -> Result<(), Error> {
        let depth = self.depth.ok_or(Error::BadBytecode)?;
        if core.arena().stack_len() != depth + 1 {
            return Err(Error::BadBytecode);
        }
        let result = core.arena_mut().pop()?;
        let _catch_pc = core.arena_mut().pop()?;
        let _frame = core.arena_mut().pop()?;
        let previous = core.arena_mut().pop()?.as_i30().ok_or(Error::BadBytecode)?;
        self.depth = (previous >= 0).then_some(previous as usize);
        core.arena_mut().push(result)?;
        Ok(())
    }

    /// Restore the nearest handler and leave the thrown value as its operand.
    /// Returns false when the exception is uncaught by this machine.
    pub fn unwind(&mut self, core: &mut Core<'_, '_>, reason: Value) -> Result<bool, Error> {
        let Some(depth) = self.depth else {
            return Ok(false);
        };
        core.arena_mut().truncate_stack(depth)?;
        let catch_pc = pop_i30(core)?;
        let frame = pop_i30(core)?;
        let previous = pop_i30(core)?;
        core.set_pc(usize::try_from(catch_pc).map_err(|_| Error::BadBytecode)?)?;
        core.set_frame_depth((frame >= 0).then_some(frame as usize));
        self.depth = (previous >= 0).then_some(previous as usize);
        core.arena_mut().push(reason)?;
        Ok(true)
    }
}

fn pop_i30(core: &mut Core<'_, '_>) -> Result<i32, Error> {
    core.arena_mut().pop()?.as_i30().ok_or(Error::BadBytecode)
}

#[cfg(test)]
mod tests {
    use crate::core::{Core, CoreOutcome};
    use microesnext_bytecode::Opcode;
    use microesnext_types::Value;

    use super::Handlers;

    #[test]
    fn normal_completion_removes_the_record_and_preserves_the_result() {
        let code = [Opcode::Return as u8];
        let mut memory = [0; 24];
        let mut core = Core::new(&code, &mut memory, 0);
        let mut handlers = Handlers::new();
        handlers.install(&mut core, 0).unwrap();
        core.arena_mut().push(Value::from_i30(42).unwrap()).unwrap();
        handlers.leave(&mut core).unwrap();
        assert_eq!(handlers, Handlers::new());
        assert_eq!(
            core.run().unwrap(),
            CoreOutcome::Complete(Value::from_i30(42).unwrap())
        );
    }

    #[test]
    fn unwinding_restores_the_enclosing_frame_and_catch_target() {
        let code = [Opcode::Return as u8];
        let mut memory = [0; 32];
        let mut core = Core::new(&code, &mut memory, 0);
        let mut handlers = Handlers::new();
        handlers.install(&mut core, 0).unwrap();
        core.enter_call(Value::UNDEFINED, 0).unwrap();
        let reason = Value::from_i30(17).unwrap();
        assert!(handlers.unwind(&mut core, reason).unwrap());
        assert_eq!(handlers, Handlers::new());
        assert_eq!(core.run().unwrap(), CoreOutcome::Complete(reason));
    }
}
