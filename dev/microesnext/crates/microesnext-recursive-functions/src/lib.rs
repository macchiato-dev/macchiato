#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Creates a closure whose first capture is a cell containing the closure.
///
/// Existing captures occupy the top of the guest stack in source order. The
/// cell is inserted before them, so ordinary capture lookup remains direct.
pub fn capture_recursive_stack(
    arena: &mut Arena<'_>,
    entry: u32,
    capture_count: usize,
) -> Result<Value, Error> {
    if capture_count > arena.stack_len() {
        return Err(Error::StackUnderflow);
    }
    let cell = microesnext_environments::new(arena, Value::UNDEFINED)?;
    let insertion = arena.stack_len() - capture_count;
    arena.insert_stack_value_from_bottom(insertion, cell)?;
    let closure = microesnext_arena::closures::capture_stack(arena, entry, capture_count + 1)?;
    let moved_cell = microesnext_arena::closures::capture(arena, closure, 0)?;
    microesnext_environments::set(arena, moved_cell, closure)?;
    Ok(closure)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn self_cell_precedes_ordinary_captures_and_survives_compaction() {
        let mut memory = [0; 40];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::from_i30(42).unwrap()).unwrap();
        let closure = capture_recursive_stack(&mut arena, 17, 1).unwrap();
        arena.push(closure).unwrap();
        arena.compact(&mut []).unwrap();
        let moved = arena.stack_value(0).unwrap();
        let cell = microesnext_arena::closures::capture(&arena, moved, 0).unwrap();
        assert_eq!(microesnext_environments::get(&arena, cell), Ok(moved));
        assert_eq!(
            microesnext_arena::closures::capture(&arena, moved, 1)
                .unwrap()
                .as_i30(),
            Some(42)
        );
    }
}
