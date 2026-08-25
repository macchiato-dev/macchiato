#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Appends a hidden receiver after evaluated arguments before a call frame is
/// entered. The invariant VM can therefore treat it as one extra argument.
#[inline(always)]
pub fn append(arena: &mut Arena<'_>, argument_count: usize, receiver: Value) -> Result<(), Error> {
    if argument_count > arena.stack_len() {
        return Err(Error::StackUnderflow);
    }
    arena.push(receiver)
}

/// Initializes ordinary parameter/local slots, keeping the hidden receiver
/// immediately after them. Existing local access consequently stays unchanged.
#[inline(always)]
pub fn init_frame(
    arena: &mut Arena<'_>,
    base: usize,
    count: usize,
    parameter_count: usize,
) -> Result<(), Error> {
    if arena.stack_len() != base + parameter_count + 1 {
        return Err(Error::BadBytecode);
    }
    let receiver = arena.pop()?;
    microesnext_parameters::init_frame(arena, base, count, parameter_count)?;
    arena.push(receiver)
}

/// Reads `this` without moving it or changing the ordinary local-slot layout.
#[inline(always)]
pub fn load(arena: &Arena<'_>, base: usize) -> Result<Value, Error> {
    let count = local_count(arena, base)?;
    arena.stack_value_from_bottom(base + 1 + count)
}

/// Removes the receiver and then leaves the otherwise ordinary local frame.
#[inline(always)]
pub fn leave(arena: &mut Arena<'_>, base: usize) -> Result<(), Error> {
    let count = local_count(arena, base)?;
    if arena.stack_len() != base + 2 + count {
        return Err(Error::BadBytecode);
    }
    arena.pop()?;
    microesnext_locals::leave(arena, base)
}

#[inline(always)]
fn local_count(arena: &Arena<'_>, base: usize) -> Result<usize, Error> {
    arena
        .stack_value_from_bottom(base)?
        .as_i30()
        .and_then(|count| usize::try_from(count).ok())
        .ok_or(Error::BadBytecode)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn receiver_lives_after_ordinary_local_slots() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        let argument = Value::from_i30(42).unwrap();
        arena.push(argument).unwrap();
        append(&mut arena, 1, Value::TRUE).unwrap();
        init_frame(&mut arena, 0, 2, 1).unwrap();

        assert_eq!(microesnext_locals::load(&arena, 0, 0), Ok(argument));
        assert_eq!(microesnext_locals::load(&arena, 0, 1), Ok(Value::UNDEFINED));
        assert_eq!(load(&arena, 0), Ok(Value::TRUE));
        leave(&mut arena, 0).unwrap();
        assert_eq!(arena.stack_len(), 0);
    }

    #[test]
    fn temporary_operands_do_not_change_receiver_location() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        append(&mut arena, 0, Value::TRUE).unwrap();
        init_frame(&mut arena, 0, 0, 0).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();

        assert_eq!(load(&arena, 0), Ok(Value::TRUE));
        assert_eq!(arena.pop().unwrap().as_i30(), Some(42));
        leave(&mut arena, 0).unwrap();
    }
}
