use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

#[cfg(feature = "assignment-expressions")]
pub mod assignment_expressions {
    use super::*;

    /// Stores through a cell while retaining the assigned value.
    #[inline(always)]
    pub fn store_result(arena: &mut Arena<'_>) -> Result<(), Error> {
        let value = arena.pop()?;
        let cell = arena.pop()?;
        super::set(arena, cell, value)?;
        arena.push(value)
    }
}

/// Allocates one traced, relocatable cell shared by frames and closures.
pub fn new(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    let cell = arena.allocate_values(BlockKind::EnvironmentCell, &mut [value], &mut [])?;
    Ok(Value::from_ref(cell))
}

pub fn get(arena: &Arena<'_>, cell: Value) -> Result<Value, Error> {
    let cell = checked_cell(arena, cell)?;
    arena
        .values(cell)?
        .first()
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::DanglingReference)
}

pub fn set(arena: &mut Arena<'_>, cell: Value, value: Value) -> Result<(), Error> {
    let cell = checked_cell(arena, cell)?;
    arena.set_value(cell, 0, value)
}

fn checked_cell(arena: &Arena<'_>, cell: Value) -> Result<microesnext_types::HeapRef, Error> {
    let cell = cell.as_ref().ok_or(Error::Type)?;
    if arena.kind(cell)? != BlockKind::EnvironmentCell {
        return Err(Error::Type);
    }
    Ok(cell)
}
