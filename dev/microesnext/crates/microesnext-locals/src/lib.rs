#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

#[inline(always)]
pub fn init(arena: &mut Arena<'_>, base: usize, count: usize) -> Result<(), Error> {
    if arena.stack_len() != base {
        return Err(Error::BadBytecode);
    }
    arena.insert_stack_value_from_bottom(
        base,
        Value::from_i30(count as i32).ok_or(Error::BadBytecode)?,
    )?;
    for _ in 0..count {
        arena.push(Value::UNDEFINED)?;
    }
    Ok(())
}

#[inline(always)]
pub fn load(arena: &Arena<'_>, base: usize, slot: usize) -> Result<Value, Error> {
    validate(arena, base, slot)?;
    arena.stack_value_from_bottom(base + 1 + slot)
}

#[inline(always)]
pub fn store(arena: &mut Arena<'_>, base: usize, slot: usize) -> Result<(), Error> {
    validate(arena, base, slot)?;
    let value = arena.pop()?;
    arena.set_stack_value_from_bottom(base + 1 + slot, value)
}

#[inline(always)]
pub fn leave(arena: &mut Arena<'_>, base: usize) -> Result<(), Error> {
    let count = count(arena, base)?;
    if arena.stack_len() != base + 1 + count {
        return Err(Error::BadBytecode);
    }
    arena.truncate_stack(base)
}

#[inline(always)]
fn validate(arena: &Arena<'_>, base: usize, slot: usize) -> Result<(), Error> {
    if slot < count(arena, base)? {
        Ok(())
    } else {
        Err(Error::BadBytecode)
    }
}

#[inline(always)]
fn count(arena: &Arena<'_>, base: usize) -> Result<usize, Error> {
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
    fn local_slots_are_stable_below_temporary_operands() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        init(&mut arena, 0, 1).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();
        store(&mut arena, 0, 0).unwrap();
        arena.push(Value::TRUE).unwrap();
        assert_eq!(load(&arena, 0, 0).unwrap().as_i30(), Some(42));
        assert_eq!(arena.pop(), Ok(Value::TRUE));
        leave(&mut arena, 0).unwrap();
        assert_eq!(arena.stack_len(), 0);
    }
}
