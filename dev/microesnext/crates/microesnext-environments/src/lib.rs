#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_value_survives_mutation_and_relocation() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        let cell = new(&mut arena, Value::from_i30(40).unwrap()).unwrap();
        arena.push(cell).unwrap();
        set(&mut arena, cell, Value::from_i30(42).unwrap()).unwrap();
        arena.compact(&mut []).unwrap();
        let moved = arena.stack_value(0).unwrap();
        assert_eq!(get(&arena, moved).unwrap().as_i30(), Some(42));
    }
}
