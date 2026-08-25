#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};
use microesnext_vm_core::Core;

/// Captures values from the guest stack into an async closure.
pub fn capture_stack(
    arena: &mut Arena<'_>,
    entry: u32,
    capture_count: usize,
) -> Result<Value, Error> {
    let entry = Value::from_i30(entry as i32).ok_or(Error::BadBytecode)?;
    let closure = arena.allocate_from_stack(
        BlockKind::AsyncClosure,
        &mut [entry],
        capture_count,
        &mut [],
    )?;
    Ok(Value::from_ref(closure))
}

pub fn is_async(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::AsyncClosure)
}

pub fn entry(arena: &Arena<'_>, closure: Value) -> Result<usize, Error> {
    let closure = checked(arena, closure, BlockKind::AsyncClosure)?;
    arena
        .values(closure)?
        .first()
        .copied()
        .map(Value::from_raw)
        .and_then(Value::as_i30)
        .map(|entry| entry as usize)
        .ok_or(Error::DanglingReference)
}

pub fn capture(arena: &Arena<'_>, closure: Value, index: usize) -> Result<Value, Error> {
    let closure = checked(arena, closure, BlockKind::AsyncClosure)?;
    arena
        .values(closure)?
        .get(index + 1)
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::BadBytecode)
}

/// Removes evaluated arguments from the stack and retains them with a callee.
pub fn take_invocation(
    arena: &mut Arena<'_>,
    function: Value,
    argument_count: usize,
) -> Result<Value, Error> {
    let invocation = arena.allocate_from_stack(
        BlockKind::AsyncInvocation,
        &mut [function],
        argument_count,
        &mut [],
    )?;
    Ok(Value::from_ref(invocation))
}

/// Starts a packaged invocation in an otherwise empty machine context.
pub fn start_invocation(core: &mut Core<'_, '_>, invocation: Value) -> Result<(), Error> {
    if core.arena().stack_len() != 0 || core.frame_depth().is_some() {
        return Err(Error::Type);
    }
    let invocation = checked(core.arena(), invocation, BlockKind::AsyncInvocation)?;
    let length = core.arena().values(invocation)?.len();
    if length == 0 {
        return Err(Error::DanglingReference);
    }
    let function = Value::from_raw(core.arena().values(invocation)?[0]);
    let target = entry(core.arena(), function)?;
    let argument_count = length - 1;
    for index in 0..argument_count {
        let argument = Value::from_raw(core.arena().values(invocation)?[index + 1]);
        core.arena_mut().push(argument)?;
    }
    core.enter_external_call_with_arguments(function, target, argument_count)
}

fn checked(
    arena: &Arena<'_>,
    value: Value,
    expected: BlockKind,
) -> Result<microesnext_types::HeapRef, Error> {
    let reference = value.as_ref().ok_or(Error::Type)?;
    if arena.kind(reference)? != expected {
        return Err(Error::Type);
    }
    Ok(reference)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packages_arguments_and_enters_an_independent_context() {
        let code = [4];
        let mut memory = [0; 64];
        let mut core = Core::new(&code, &mut memory, 0);
        let function = capture_stack(core.arena_mut(), 0, 0).unwrap();
        core.arena_mut().push(Value::from_i30(40).unwrap()).unwrap();
        core.arena_mut().push(Value::from_i30(2).unwrap()).unwrap();
        let invocation = take_invocation(core.arena_mut(), function, 2).unwrap();
        start_invocation(&mut core, invocation).unwrap();
        assert_eq!(core.frame_depth(), Some(3));
        assert_eq!(core.arena().stack_len(), 5);
        assert_eq!(
            core.arena().stack_value_from_bottom(3).unwrap().as_i30(),
            Some(40)
        );
        assert_eq!(
            core.arena().stack_value_from_bottom(4).unwrap().as_i30(),
            Some(2)
        );
    }
}
