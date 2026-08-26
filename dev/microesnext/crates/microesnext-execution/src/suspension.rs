use microesnext_types::{Error, RootId, Value};
use microesnext_vm_core::Core;

/// Snapshot a complete execution context without consuming an awaited value.
pub fn suspend_context(
    core: &mut Core<'_, '_>,
    handler_depth: Option<usize>,
) -> Result<RootId, Error> {
    let pc = core.pc() as u32;
    let frame_depth = core.frame_depth();
    let continuation = core
        .arena_mut()
        .suspend_stack(pc, frame_depth, handler_depth, &mut [])?;
    let continuation = core.arena_mut().retain(Value::from_ref(continuation))?;
    // A complete context switch leaves no active native-side frame metadata.
    // The continuation owns it until `resume_context` restores the caller.
    core.abandon();
    Ok(continuation)
}

/// Restore a complete execution context without adding an operand.
pub fn resume_context(
    core: &mut Core<'_, '_>,
    continuation: RootId,
) -> Result<Option<usize>, Error> {
    let continuation = core.arena_mut().release(continuation)?;
    restore_value(core, continuation)
}

/// Remove an awaited operand and snapshot the remaining guest stack. The
/// returned root keeps the relocatable continuation alive outside the VM.
pub fn suspend(
    core: &mut Core<'_, '_>,
    handler_depth: Option<usize>,
) -> Result<(Value, RootId), Error> {
    let pc = core.pc() as u32;
    let frame_depth = core.frame_depth();
    let mut roots = [core.arena_mut().pop()?];
    let continuation =
        core.arena_mut()
            .suspend_stack(pc, frame_depth, handler_depth, &mut roots)?;
    let continuation = core.arena_mut().retain(Value::from_ref(continuation))?;
    Ok((roots[0], continuation))
}

/// Consume a rooted continuation, restore it, and supply the fulfilled value.
pub fn resume(
    core: &mut Core<'_, '_>,
    continuation: RootId,
    value: Value,
) -> Result<Option<usize>, Error> {
    let continuation = core.arena_mut().release(continuation)?;
    resume_value(core, continuation, value)
}

/// Restore a continuation already represented as a guest value.
pub fn resume_value(
    core: &mut Core<'_, '_>,
    continuation: Value,
    value: Value,
) -> Result<Option<usize>, Error> {
    let handler_depth = restore_value(core, continuation)?;
    core.arena_mut().push(value)?;
    Ok(handler_depth)
}

/// Consume a rooted continuation and restore its execution state without
/// supplying a value. Rejected await uses this before throwing its reason.
pub fn restore(core: &mut Core<'_, '_>, continuation: RootId) -> Result<Option<usize>, Error> {
    let continuation = core.arena_mut().release(continuation)?;
    restore_value(core, continuation)
}

/// Restore execution state from a guest continuation value.
pub fn restore_value(core: &mut Core<'_, '_>, continuation: Value) -> Result<Option<usize>, Error> {
    let continuation = continuation.as_ref().ok_or(Error::Type)?;
    let (pc, frame_depth, handler_depth) = core.arena_mut().resume_stack(continuation)?;
    core.set_pc(pc as usize)?;
    core.set_frame_depth(frame_depth);
    Ok(handler_depth)
}

#[cfg(test)]
mod tests {
    use microesnext_types::Value;
    use microesnext_vm_core::Core;

    use super::{resume, resume_context, suspend, suspend_context};

    #[test]
    fn complete_context_switch_deactivates_and_restores_frame_metadata() {
        let code = [4];
        let mut memory = [0; 32];
        let mut core = Core::new(&code, &mut memory, 1);
        core.enter_external_call(Value::TRUE, 0, Value::UNDEFINED)
            .unwrap();

        let continuation = suspend_context(&mut core, None).unwrap();
        assert_eq!(core.frame_depth(), None);
        assert_eq!(core.arena().stack_len(), 0);

        assert_eq!(resume_context(&mut core, continuation), Ok(None));
        assert_eq!(core.frame_depth(), Some(3));
    }

    #[test]
    fn round_trips_stack_and_awaited_operand() {
        let code = [1, 0, 0, 0, 0];
        let mut memory = [0; 32];
        let mut core = Core::new(&code, &mut memory, 1);
        core.arena_mut().push(Value::from_i30(40).unwrap()).unwrap();
        core.arena_mut().push(Value::from_i30(2).unwrap()).unwrap();
        let (awaited, continuation) = suspend(&mut core, None).unwrap();
        assert_eq!(awaited.as_i30(), Some(2));
        assert_eq!(core.arena().stack_len(), 0);
        assert_eq!(
            resume(&mut core, continuation, Value::from_i30(2).unwrap()).unwrap(),
            None
        );
        assert_eq!(core.arena().stack_len(), 2);
    }

    #[test]
    fn round_trips_a_whole_caller_context_without_an_extra_operand() {
        let code = [1, 0, 0, 0, 0];
        let mut memory = [0; 32];
        let mut core = Core::new(&code, &mut memory, 1);
        core.arena_mut().push(Value::from_i30(42).unwrap()).unwrap();
        let continuation = suspend_context(&mut core, None).unwrap();
        assert_eq!(core.arena().stack_len(), 0);
        assert_eq!(resume_context(&mut core, continuation).unwrap(), None);
        assert_eq!(core.arena().stack_value(0).unwrap().as_i30(), Some(42));
    }
}
