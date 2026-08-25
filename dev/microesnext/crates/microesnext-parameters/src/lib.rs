#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Removes the callable below its already-evaluated arguments.
#[inline(always)]
pub fn take_callable(arena: &mut Arena<'_>, argument_count: usize) -> Result<Value, Error> {
    let index = arena
        .stack_len()
        .checked_sub(argument_count + 1)
        .ok_or(Error::StackUnderflow)?;
    arena.remove_stack_value_from_bottom(index)
}

/// Turns arguments already on the stack into the first local slots.
#[inline(always)]
pub fn init_frame(
    arena: &mut Arena<'_>,
    base: usize,
    count: usize,
    parameter_count: usize,
) -> Result<(), Error> {
    if parameter_count > count || arena.stack_len() != base + parameter_count {
        return Err(Error::BadBytecode);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn callable_and_arguments_become_a_parameter_frame() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::TRUE).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();
        assert_eq!(take_callable(&mut arena, 1), Ok(Value::TRUE));
        init_frame(&mut arena, 0, 2, 1).unwrap();
        assert_eq!(arena.stack_value_from_bottom(1).unwrap().as_i30(), Some(42));
        assert_eq!(arena.stack_value_from_bottom(2), Ok(Value::UNDEFINED));
    }
}
