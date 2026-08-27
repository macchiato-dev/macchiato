use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

#[inline(always)]
pub fn take_callable(arena: &mut Arena<'_>, argument_count: usize) -> Result<Value, Error> {
    let index = arena
        .stack_len()
        .checked_sub(argument_count + 1)
        .ok_or(Error::StackUnderflow)?;
    arena.remove_stack_value_from_bottom(index)
}

#[inline(always)]
pub fn init_frame(
    arena: &mut Arena<'_>,
    base: usize,
    count: usize,
    parameter_count: usize,
) -> Result<(), Error> {
    if parameter_count > count || arena.stack_len() < base {
        return Err(Error::BadBytecode);
    }
    let argument_count = arena.stack_len() - base;
    for _ in parameter_count..argument_count {
        arena.pop()?;
    }
    for _ in argument_count..parameter_count {
        arena.push(Value::UNDEFINED)?;
    }
    arena.insert_stack_value_from_bottom(
        base,
        Value::from_i30(count as i32).ok_or(Error::BadBytecode)?,
    )?;
    for _ in parameter_count..count {
        arena.push(Value::UNDEFINED)?;
    }
    Ok(())
}
