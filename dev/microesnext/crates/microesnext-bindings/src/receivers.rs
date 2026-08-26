use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

#[inline(always)]
pub fn append(arena: &mut Arena<'_>, argument_count: usize, receiver: Value) -> Result<(), Error> {
    if argument_count > arena.stack_len() {
        return Err(Error::StackUnderflow);
    }
    arena.push(receiver)
}

#[inline(always)]
pub fn init_frame(
    arena: &mut Arena<'_>,
    base: usize,
    count: usize,
    parameter_count: usize,
) -> Result<(), Error> {
    if arena.stack_len() <= base {
        return Err(Error::BadBytecode);
    }
    let receiver = arena.pop()?;
    crate::parameters::init_frame(arena, base, count, parameter_count)?;
    arena.push(receiver)
}

#[inline(always)]
pub fn load(arena: &Arena<'_>, base: usize) -> Result<Value, Error> {
    let count = local_count(arena, base)?;
    arena.stack_value_from_bottom(base + 1 + count)
}

#[inline(always)]
pub fn leave(arena: &mut Arena<'_>, base: usize) -> Result<(), Error> {
    let count = local_count(arena, base)?;
    if arena.stack_len() != base + 2 + count {
        return Err(Error::BadBytecode);
    }
    arena.pop()?;
    crate::locals::leave(arena, base)
}

#[inline(always)]
fn local_count(arena: &Arena<'_>, base: usize) -> Result<usize, Error> {
    arena
        .stack_value_from_bottom(base)?
        .as_i30()
        .and_then(|count| usize::try_from(count).ok())
        .ok_or(Error::BadBytecode)
}
