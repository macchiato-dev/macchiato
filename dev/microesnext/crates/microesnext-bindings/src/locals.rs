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
    if arena.stack_len() < base + 1 + count {
        return Err(Error::BadBytecode);
    }
    // Returning discards any expression temporaries still owned by the
    // frame. The return value has already been removed by the interpreter.
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
